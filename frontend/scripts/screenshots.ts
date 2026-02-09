import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const EMAIL = process.env.SCREENSHOT_EMAIL || 'admin@example.com';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || '';

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
} as const;

const THEMES = ['light', 'dark'] as const;

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'screenshots');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(): Promise<{
  user: Record<string, unknown>;
  tokens: { access_token: string; refresh_token: string };
}> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.data;
}

async function fetchFirstProjectId(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const projects = json.data ?? json;
    if (Array.isArray(projects) && projects.length > 0) {
      return projects[0].id;
    }
  } catch {
    // ignore
  }
  return null;
}

function makeAuthStorage(user: Record<string, unknown>, tokens: Record<string, unknown>) {
  return JSON.stringify({
    state: { user, tokens, isAuthenticated: true },
    version: 0,
  });
}

function makeUiStorage(theme: string) {
  return JSON.stringify({
    state: { theme, sidebarCollapsed: false, rightPanelCollapsed: false },
    version: 0,
  });
}

async function injectLocalStorage(
  page: Page,
  theme: string,
  auth: { user: Record<string, unknown>; tokens: Record<string, unknown> } | null,
) {
  // Navigate to a blank page first to have access to localStorage for the origin
  await page.goto(BASE_URL, { waitUntil: 'commit' });
  await page.evaluate(
    ({ authJson, uiJson }) => {
      if (authJson) localStorage.setItem('auth-storage', authJson);
      localStorage.setItem('ui-storage', uiJson);
    },
    {
      authJson: auth ? makeAuthStorage(auth.user, auth.tokens) : null,
      uiJson: makeUiStorage(theme),
    },
  );
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page
    .waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0, {
      timeout: 10_000,
    })
    .catch(() => {});
  await page.waitForTimeout(500);
}

async function clickTab(page: Page, tabLabel: string) {
  // Tabs are <button> elements containing a <span> with the label text
  const tab = page.locator('button', { has: page.locator(`span:text-is("${tabLabel}")`) }).first();
  await tab.click();
  await waitForPageReady(page);
}

// ---------------------------------------------------------------------------
// Page definitions
// ---------------------------------------------------------------------------

interface PageDef {
  name: string;
  path: string;
  auth: boolean;
  fullPage?: boolean;
  setup?: (page: Page) => Promise<void>;
}

function buildPageDefs(projectId: string | null): PageDef[] {
  const pages: PageDef[] = [
    { name: 'landing', path: '/', auth: false, fullPage: true },
    { name: 'login', path: '/login', auth: false },
    { name: 'register', path: '/register', auth: false },

    { name: 'dashboard', path: '/dashboard', auth: true },

    ...(projectId
      ? [{ name: 'project', path: `/projects/${projectId}`, auth: true } as PageDef]
      : []),

    { name: 'settings-profile', path: '/settings', auth: true },
    {
      name: 'settings-security',
      path: '/settings',
      auth: true,
      setup: (p) => clickTab(p, 'Security'),
    },
    {
      name: 'settings-preferences',
      path: '/settings',
      auth: true,
      setup: (p) => clickTab(p, 'Preferences'),
    },
    {
      name: 'settings-usage',
      path: '/settings',
      auth: true,
      setup: (p) => clickTab(p, 'Usage'),
    },

    { name: 'usage', path: '/usage', auth: true },

    { name: 'admin-dashboard', path: '/admin', auth: true },
    {
      name: 'admin-users',
      path: '/admin',
      auth: true,
      setup: (p) => clickTab(p, 'User Management'),
    },
    {
      name: 'admin-token-limits',
      path: '/admin',
      auth: true,
      setup: (p) => clickTab(p, 'Token Limits'),
    },
    {
      name: 'admin-agents',
      path: '/admin',
      auth: true,
      setup: (p) => clickTab(p, 'Agents'),
    },
  ];

  return pages;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!PASSWORD) {
    console.error('SCREENSHOT_PASSWORD is required. Set it via environment variable.');
    process.exit(1);
  }

  console.log(`Logging in as ${EMAIL}...`);
  const { user, tokens } = await login();
  console.log(`Logged in as ${(user as { username?: string }).username ?? EMAIL}`);

  const projectId = await fetchFirstProjectId(tokens.access_token);
  if (projectId) {
    console.log(`Using project: ${projectId}`);
  } else {
    console.log('No projects found — skipping project page.');
  }

  const pageDefs = buildPageDefs(projectId);
  const browser: Browser = await chromium.launch();
  let total = 0;

  for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      const dirName = `${vpName}-${theme}`;
      const outPath = path.join(OUT_DIR, dirName);
      fs.mkdirSync(outPath, { recursive: true });

      console.log(`\n--- ${dirName} (${vpSize.width}x${vpSize.height}) ---`);

      const context: BrowserContext = await browser.newContext({
        viewport: vpSize,
        deviceScaleFactor: 2,
      });

      const page: Page = await context.newPage();

      for (const def of pageDefs) {
        // Inject auth + theme into localStorage
        await injectLocalStorage(
          page,
          theme,
          def.auth ? { user, tokens } : null,
        );

        // Navigate to the target page
        const url = `${BASE_URL}${def.path}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForPageReady(page);

        // Run tab-click or other setup
        if (def.setup) {
          await def.setup(page);
        }

        const filePath = path.join(outPath, `${def.name}.png`);
        await page.screenshot({ path: filePath, fullPage: def.fullPage ?? false });
        total++;
        console.log(`  ✓ ${def.name}.png`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(`\nDone! ${total} screenshots saved to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
