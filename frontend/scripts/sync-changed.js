#!/usr/bin/env node

/**
 * Sync Changed Translations Script
 *
 * Detects changed English translation keys via git diff and translates them
 * to all other languages using OpenAI API.
 *
 * Usage:
 *   node scripts/sync-changed.js --key YOUR_OPENAI_KEY
 *   node scripts/sync-changed.js --key YOUR_OPENAI_KEY --dry-run
 *   node scripts/sync-changed.js --key YOUR_OPENAI_KEY --verbose
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported European languages (same as translate.js)
const EUROPEAN_LANGUAGES = {
  en: 'English',
  pl: 'Polish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  sv: 'Swedish',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  uk: 'Ukrainian',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  sk: 'Slovak',
  bg: 'Bulgarian',
  hr: 'Croatian',
  el: 'Greek'
};

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const SOURCE_LANG = 'en';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    key: null,
    dryRun: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--key' || arg === '-k') {
      options.key = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Sync Changed Translations - Translate git-changed EN keys to all languages

Usage:
  node scripts/sync-changed.js [options]

Options:
  --key, -k <key>    OpenAI API key (required)
  --dry-run          Preview changes without writing files
  --verbose, -v      Show detailed output
  --help, -h         Show this help message

Examples:
  # Translate changed EN keys to all languages
  node scripts/sync-changed.js --key sk-xxx

  # Preview what would be translated
  node scripts/sync-changed.js --key sk-xxx --dry-run
`);
}

// Flatten nested object to dot-notation keys
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// Unflatten dot-notation keys to nested object
function unflattenObject(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

// Read translation file
function readTranslations(lang, namespace) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
    return null;
  }
}

// Write translation file
function writeTranslations(lang, namespace, translations) {
  const langDir = path.join(LOCALES_DIR, lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  const filePath = path.join(langDir, `${namespace}.json`);
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ Written: ${filePath}`);
}

// Get list of changed EN translation files from git
function getChangedEnFiles() {
  try {
    const output = execSync('git diff --name-only HEAD -- frontend/public/locales/en/', {
      cwd: path.join(__dirname, '../..'), // Go to git root
      encoding: 'utf-8'
    }).trim();

    if (!output) {
      return [];
    }

    return output.split('\n')
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'));
  } catch (error) {
    console.error('Error getting git diff:', error.message);
    return [];
  }
}

// Get the previous version of a file from git
function getGitVersion(namespace) {
  try {
    // Path relative to git root (includes frontend/)
    const relativePath = `frontend/public/locales/en/${namespace}.json`;
    const output = execSync(`git show HEAD:${relativePath}`, {
      cwd: path.join(__dirname, '../..'), // Go to git root
      encoding: 'utf-8'
    });
    return JSON.parse(output);
  } catch (error) {
    // File might be new, return empty object
    return {};
  }
}

// Find changed/added keys by comparing old and new versions
function findChangedKeys(oldObj, newObj) {
  const flatOld = flattenObject(oldObj);
  const flatNew = flattenObject(newObj);
  const changed = {};

  for (const [key, value] of Object.entries(flatNew)) {
    // Key is new or value changed
    if (!(key in flatOld) || flatOld[key] !== value) {
      changed[key] = value;
    }
  }

  return changed;
}

// Call OpenAI API for translation
async function translateWithOpenAI(apiKey, texts, targetLang, targetLangName) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in software localization. Translate the following JSON object values from English to ${targetLangName} (${targetLang}).

Rules:
1. Only translate the VALUES, keep the keys unchanged
2. Preserve any placeholders like {{variable}}, {{count}}, {count}, etc.
3. Keep technical terms, brand names, and abbreviations unchanged
4. Use natural, idiomatic language appropriate for software UI
5. Maintain the same JSON structure
6. Return ONLY valid JSON, no markdown or explanations`
        },
        {
          role: 'user',
          content: JSON.stringify(texts, null, 2)
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the response, handling potential markdown wrapping
  let jsonStr = content;
  if (content.includes('```')) {
    jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  return JSON.parse(jsonStr);
}

// Translate changed keys for a specific namespace and language
async function translateChangedForLanguage(apiKey, namespace, changedKeys, targetLang, dryRun, verbose) {
  const targetLangName = EUROPEAN_LANGUAGES[targetLang];

  if (verbose) {
    console.log(`    → ${targetLang} (${targetLangName})`);
  }

  if (dryRun) {
    return Object.keys(changedKeys).length;
  }

  try {
    // Translate in batches
    const entries = Object.entries(changedKeys);
    const batchSize = 50;
    let translated = {};

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = Object.fromEntries(entries.slice(i, i + batchSize));
      const batchTranslated = await translateWithOpenAI(apiKey, batch, targetLang, targetLangName);
      translated = { ...translated, ...batchTranslated };

      if (entries.length > batchSize && verbose) {
        console.log(`      Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)} complete`);
      }
    }

    // Merge with existing translations
    const existing = readTranslations(targetLang, namespace) || {};
    const flatExisting = flattenObject(existing);
    const merged = unflattenObject({ ...flatExisting, ...translated });

    writeTranslations(targetLang, namespace, merged);
    return Object.keys(changedKeys).length;

  } catch (error) {
    console.error(`    ✗ Error translating to ${targetLang}: ${error.message}`);
    return 0;
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (!options.key) {
    console.error('Error: OpenAI API key is required. Use --key or -k option.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  console.log('🔄 Sync Changed Translations');
  console.log('============================');

  // Get changed EN files from git
  const changedFiles = getChangedEnFiles();

  if (changedFiles.length === 0) {
    console.log('\n✓ No changed EN translation files detected in git.');
    console.log('  (Make sure you have uncommitted changes in public/locales/en/)');
    process.exit(0);
  }

  console.log(`\n📁 Changed EN files: ${changedFiles.join(', ')}`);

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  }

  const targetLangs = Object.keys(EUROPEAN_LANGUAGES).filter(l => l !== SOURCE_LANG);
  let totalChanged = 0;
  let totalTranslated = 0;

  // Process each changed file
  for (const namespace of changedFiles) {
    console.log(`\n📝 Processing ${namespace}.json...`);

    // Get old and new versions
    const oldVersion = getGitVersion(namespace);
    const newVersion = readTranslations(SOURCE_LANG, namespace);

    if (!newVersion) {
      console.log(`  ⚠ Could not read current ${namespace}.json`);
      continue;
    }

    // Find changed keys
    const changedKeys = findChangedKeys(oldVersion, newVersion);
    const changedCount = Object.keys(changedKeys).length;

    if (changedCount === 0) {
      console.log(`  ○ No changed keys detected`);
      continue;
    }

    console.log(`  → ${changedCount} changed/added keys:`);

    if (options.verbose) {
      const keysList = Object.keys(changedKeys).slice(0, 10);
      keysList.forEach(k => console.log(`    • ${k}`));
      if (Object.keys(changedKeys).length > 10) {
        console.log(`    ... and ${Object.keys(changedKeys).length - 10} more`);
      }
    }

    totalChanged += changedCount;

    // Translate to all languages
    console.log(`  🌍 Translating to ${targetLangs.length} languages...`);

    for (const targetLang of targetLangs) {
      const translated = await translateChangedForLanguage(
        options.key,
        namespace,
        changedKeys,
        targetLang,
        options.dryRun,
        options.verbose
      );
      totalTranslated += translated;
    }
  }

  // Summary
  console.log('\n============================');
  console.log('📊 Summary:');
  console.log(`   Changed EN files: ${changedFiles.length}`);
  console.log(`   Changed keys: ${totalChanged}`);
  console.log(`   Languages updated: ${targetLangs.length}`);
  if (!options.dryRun) {
    console.log(`   Total translations: ${totalTranslated}`);
  }
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
