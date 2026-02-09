# Phase 2: CI/CD Pipeline - Implementation Guide

## Overview

Phase 2 adds automated testing, security scanning, and deployment pipelines:
- ✅ **GitHub Actions CI/CD** - Automated testing and builds
- ✅ **Security Scanning** - Trivy + Snyk vulnerability detection
- ✅ **Bundle Size Analysis** - Track frontend bundle size trends

**Status:** ✅ Implemented

---

## 1. CI/CD Workflow

### What Was Added

**File:** `.github/workflows/ci.yml`

Comprehensive CI/CD pipeline with 3 jobs:

#### Job 1: Test & Build
- Install dependencies with pnpm
- Run linting (graceful skip if no ESLint config)
- Run TypeScript type checking
- Run database migrations
- Run backend tests
- Build backend and frontend
- Upload build artifacts

**Services:**
- PostgreSQL 15 (test database)
- Redis 7 (caching)

#### Job 2: Security Scanning
- **Trivy:** Filesystem vulnerability scanner
- **Snyk:** Dependency vulnerability scanner
- Upload results to GitHub Security tab

#### Job 3: Build & Push Docker Images
- Only runs on `master`/`main` branch pushes
- Builds backend and frontend Docker images
- Pushes to GitHub Container Registry (GHCR)
- Uses Docker layer caching for faster builds
- Tags with branch name, commit SHA, and `latest`

### Workflow Triggers

**Runs on:**
- Push to `master`, `main`, or `develop` branches
- Pull requests to `master`, `main`, or `develop` branches

**Docker builds only on:**
- Push to `master` or `main` (not PRs)

### How to Use

**Automatic Execution:**
1. Push code to GitHub
2. GitHub Actions automatically runs the workflow
3. Check **Actions** tab for results
4. View logs for each job

**Pull Request Checks:**
- CI status shown on PR page
- Must pass before merge (if required checks enabled)

### Viewing Results

**GitHub Actions Tab:**
- Navigate to **Actions** tab in your repository
- Click on specific workflow run
- View logs for each job
- Download build artifacts

**GitHub Security Tab:**
- Navigate to **Security** → **Code scanning**
- View Trivy vulnerability findings
- Track security trends over time

**Docker Images:**
- Navigate to **Packages** in GitHub
- View published images: `backend:latest`, `frontend:latest`
- Pull with: `docker pull ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest`

### Configuration

**Required Secrets:**
None required for basic functionality!

**Optional Secrets:**
- `SNYK_TOKEN` - Enable Snyk security scanning
  - Get from https://snyk.io
  - Add to **Settings** → **Secrets** → **Actions**

**Environment Variables:**
All environment variables are set in the workflow or use defaults.

### Troubleshooting

**Problem:** Workflow fails on test job
- **Check:** Database migrations run successfully
- **Check:** Tests exist and are passing locally
- **Solution:** Run tests locally first: `pnpm test`

**Problem:** Docker build fails
- **Check:** Dockerfile exists in backend/frontend directories
- **Check:** Build works locally: `docker build -t test ./backend`
- **Solution:** Fix Docker configuration

**Problem:** Security scan finds vulnerabilities
- **Action:** Review findings in Security tab
- **Action:** Update vulnerable dependencies: `pnpm update`
- **Action:** Check for security advisories

**Problem:** Workflow doesn't trigger
- **Check:** Workflow file syntax is valid
- **Check:** Pushing to correct branch
- **Solution:** Manually trigger via Actions tab

---

## 2. Bundle Size Analysis

### What Was Added

**File:** `.github/workflows/bundle-analysis.yml`

Bundle size tracking for pull requests:
- Builds frontend with analysis
- Generates interactive bundle visualization
- Posts bundle size comment on PR
- Uploads stats.html artifact

**Triggers on:**
- Pull requests to `master`, `main`, or `develop`
- Only when frontend files or dependencies change

**Script Added:** `frontend/package.json`
```json
"build:analyze": "tsc && vite build && vite-bundle-visualizer --open=false --filename=dist/stats.html"
```

**Dependency Added:** `vite-bundle-visualizer@1.2.1`

### How to Use

**Automatic Execution:**
1. Create a pull request
2. Bundle analysis runs automatically
3. Check PR comments for bundle size summary
4. Download `bundle-stats` artifact for interactive visualization

**Manual Execution:**
```bash
cd frontend
pnpm run build:analyze

# Opens stats.html in dist/ directory
# Interactive treemap of bundle composition
```

### Viewing Bundle Analysis

**In Pull Requests:**
- Bundle size comment appears automatically
- Shows total size, JS/CSS file counts
- Links to downloadable artifact

**Download Artifact:**
1. Go to **Actions** tab
2. Click on bundle analysis workflow run
3. Download `bundle-stats-{sha}` artifact
4. Open `stats.html` in browser
5. Interactive treemap shows:
   - Bundle composition by chunk
   - File sizes and percentages
   - Dependency breakdown

### Bundle Optimization Tips

**If bundle is too large (>500KB initial):**

1. **Analyze the treemap** to find largest modules
2. **Lazy load routes:**
   ```tsx
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. **Dynamic imports for heavy libraries:**
   ```tsx
   const loadMermaid = () => import('mermaid');
   ```

4. **Tree-shake unused code:**
   - Check for unused dependencies
   - Enable tree-shaking in libraries

5. **Optimize images:**
   - Use WebP format
   - Implement lazy loading

**Current Bundle Strategy (from vite.config.ts):**
- `vendor`: react, react-dom
- `router`: react-router-dom
- `ui`: @headlessui/react, framer-motion
- `utils`: axios, zustand, @tanstack/react-query
- `analytics`: @sentry/react, posthog-js

### Performance Budget

**Target Sizes:**
- Initial bundle: <500KB
- Total bundle: <2MB
- Individual chunks: <200KB

**Monitor these metrics:**
- JavaScript total size
- CSS total size
- Number of chunks
- Largest chunk size

### Troubleshooting

**Problem:** Bundle analysis doesn't run
- **Check:** PR targets correct branch
- **Check:** Frontend files were modified
- **Solution:** Manually trigger workflow

**Problem:** Can't download stats.html
- **Check:** Workflow completed successfully
- **Check:** Artifact retention period (30 days)
- **Solution:** Run `pnpm run build:analyze` locally

**Problem:** Bundle size increasing
- **Action:** Review PR changes for new dependencies
- **Action:** Check stats.html treemap for largest modules
- **Solution:** Optimize or lazy load heavy dependencies

---

## 3. Docker Image Builds

### What Was Added

**Docker builds configured in CI/CD:**
- Automatic builds on `master`/`main` push
- Pushes to GitHub Container Registry (ghcr.io)
- Layer caching for faster builds
- Multi-platform support (linux/amd64)

### Image Tags

Each build creates multiple tags:
- `latest` - Latest version from default branch
- `{branch}` - Branch name (e.g., `master`, `develop`)
- `{branch}-{sha}` - Branch + commit SHA (e.g., `master-abc1234`)

### Pulling Images

```bash
# Pull latest images
docker pull ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
docker pull ghcr.io/YOUR_ORG/YOUR_REPO/frontend:latest

# Pull specific version
docker pull ghcr.io/YOUR_ORG/YOUR_REPO/backend:master-abc1234
```

### Using Images Locally

```bash
# Update docker-compose.yml to use GHCR images:
services:
  backend:
    image: ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
    # ... rest of config

  frontend:
    image: ghcr.io/YOUR_ORG/YOUR_REPO/frontend:latest
    # ... rest of config
```

### Registry Permissions

**Public Repository:**
- Images are public by default
- Anyone can pull

**Private Repository:**
- Requires authentication to pull
- Use personal access token:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Troubleshooting

**Problem:** Permission denied pushing to GHCR
- **Check:** Repository has package write permissions enabled
- **Check:** `GITHUB_TOKEN` has correct scopes
- **Solution:** Enable package permissions in repo settings

**Problem:** Build fails in CI but works locally
- **Check:** Environment variables are set
- **Check:** Dockerfile works with fresh clone
- **Solution:** Test with `docker build --no-cache`

---

## 4. Security Scanning

### Trivy Scanner

**What it scans:**
- Filesystem for vulnerabilities
- Dependencies in package.json, pnpm-lock.yaml
- Configuration files for misconfigurations

**Severity Levels:**
- CRITICAL - Immediate action required
- HIGH - Fix within 24 hours
- MEDIUM - Fix within 7 days
- LOW - Fix when convenient

**Results:**
- Uploaded to GitHub Security tab
- SARIF format for easy viewing

### Snyk Scanner

**What it scans:**
- npm/pnpm dependencies
- Known vulnerabilities in packages
- License compliance

**Configuration:**
- Requires `SNYK_TOKEN` secret
- Continues on error (won't block builds)
- Only scans HIGH severity by default

**Setup:**
1. Sign up at https://snyk.io
2. Get API token
3. Add to GitHub **Settings** → **Secrets** → **Actions**
4. Name: `SNYK_TOKEN`

### Viewing Security Results

**GitHub Security Tab:**
1. Navigate to **Security** → **Code scanning**
2. View Trivy findings
3. Click on alerts for details
4. Track remediation status

**Snyk Dashboard:**
1. Log into snyk.io
2. View your repositories
3. Get detailed vulnerability reports
4. Auto-create PRs for fixes

### Fixing Vulnerabilities

**Dependency Vulnerabilities:**
```bash
# Update vulnerable packages
pnpm update

# Or specific package
pnpm update package-name@latest

# Check for outdated packages
pnpm outdated
```

**Configuration Issues:**
- Review Trivy findings
- Update configurations as recommended
- Re-run scan to verify fixes

---

## Testing the CI/CD Pipeline

### 1. Test Basic Workflow

```bash
# Create a test branch
git checkout -b test-ci

# Make a small change
echo "# CI Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI pipeline validation"
git push origin test-ci

# Create PR on GitHub
# Watch Actions tab for workflow execution
```

### 2. Test Bundle Analysis

```bash
# On your PR, modify frontend code
cd frontend
# Make a change to any component
git add .
git commit -m "feat: test bundle analysis"
git push

# Check PR for bundle size comment
# Download bundle-stats artifact
```

### 3. Test Security Scanning

```bash
# Security scan runs on every push/PR
# Check Security tab for findings
# Review any vulnerabilities detected
```

### 4. Test Docker Builds

```bash
# Merge PR to main/master
# Watch Actions tab for docker build job
# Check Packages for published images

# Pull and test image
docker pull ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
docker run -p 3001:3001 ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
```

---

## Verification Checklist

- ✅ GitHub Actions workflow file created
- ✅ Bundle analysis workflow created
- ✅ Bundle analyzer script added to package.json
- ✅ vite-bundle-visualizer installed
- ✅ Workflow triggers configured correctly
- ✅ Docker build job configured for GHCR

**After First Run:**
- ⏳ All CI jobs pass (test, security-scan)
- ⏳ Build artifacts uploaded
- ⏳ Security findings (if any) appear in Security tab
- ⏳ Bundle analysis comment on PRs
- ⏳ Docker images published to GHCR (on main/master push)

---

## Configuration Files Summary

### Created Files
1. `.github/workflows/ci.yml` - Main CI/CD pipeline
2. `.github/workflows/bundle-analysis.yml` - Bundle size tracking

### Modified Files
1. `frontend/package.json` - Added `build:analyze` script
2. `frontend/package.json` - Added `vite-bundle-visualizer` dev dependency

### No Changes Needed
- `vite.config.ts` - Bundle analyzer runs post-build
- Docker files - Already configured correctly

---

## Next Steps

After validating Phase 2:

**Phase 3:** Monitoring Stack
- Prometheus + Grafana setup
- Database backup automation
- Real-time metrics dashboards

**GitHub Repository Setup:**
1. Enable branch protection rules on `master`/`main`
2. Require CI checks before merge
3. Enable Dependabot for security updates
4. Set up Snyk integration (optional)

---

## Performance Impact

**CI/CD Runtime:**
- Test job: ~5-8 minutes
- Security scan: ~2-3 minutes
- Docker build: ~3-5 minutes
- **Total:** ~10-16 minutes per workflow run

**Cost:**
- GitHub Actions: 2,000 minutes/month free (public repos unlimited)
- Storage: Build artifacts (7 days), bundle stats (30 days)

**Optimization:**
- pnpm caching reduces install time by 40-60%
- Docker layer caching reduces build time by 50-70%
- Nx caching for monorepo builds

---

## Rollback

If CI/CD causes issues:

1. **Disable workflows:**
   ```bash
   # Delete or rename workflow files
   mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled
   ```

2. **Continue manual deployments:**
   - Build locally: `pnpm build`
   - Push Docker images manually

3. **Re-enable when ready:**
   ```bash
   mv .github/workflows/ci.yml.disabled .github/workflows/ci.yml
   ```

---

## Success Metrics

After Phase 2 implementation:
- ✅ Automated testing on every push
- ✅ Type checking prevents type errors
- ✅ Security vulnerabilities detected before merge
- ✅ Bundle size tracked on PRs
- ✅ Docker images automatically built and published
- ✅ Build artifacts available for download

**Quality Gates:**
- All tests must pass
- Type checking must pass
- Critical/HIGH security issues reviewed
- Bundle size within budget

---

## Common Issues & Solutions

### Issue: "pnpm: command not found"
**Solution:** Workflow includes pnpm setup step - no action needed

### Issue: Database migrations fail in CI
**Solution:**
- Check migration scripts for syntax errors
- Verify DATABASE_URL is correct
- Ensure PostgreSQL service is healthy

### Issue: Build artifacts too large
**Solution:**
- Artifacts auto-delete after 7 days (test job)
- Bundle stats kept for 30 days (tracking)
- Adjust retention-days in workflow if needed

### Issue: Docker push fails with "denied"
**Solution:**
- Enable package write permissions: **Settings** → **Actions** → **General** → **Workflow permissions**
- Select "Read and write permissions"

### Issue: Snyk scan skipped
**Solution:**
- Add `SNYK_TOKEN` secret to repository
- Scan continues on error - won't block builds

---

## Advanced Configuration

### Custom Test Commands

Edit `.github/workflows/ci.yml`:

```yaml
- name: Run backend tests
  working-directory: ./backend
  run: pnpm test:ci  # Your custom test command
```

### Parallel Jobs

Jobs run in parallel by default:
- `test` and `security-scan` run simultaneously
- `build-docker` waits for both to complete

### Conditional Steps

```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: ./scripts/deploy-staging.sh
```

### Matrix Builds

Test multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

---

## Integration with Phase 1

Phase 2 validates Phase 1 features:
- ✅ Type checking validates Web Vitals integration
- ✅ Build process includes new utilities
- ✅ Security scan checks new dependencies

**All Phase 1 features tested in CI!**

---

## Monitoring CI/CD Health

**Track these metrics:**
- Build success rate
- Average build time
- Security findings per week
- Bundle size trends

**Set up GitHub notifications:**
1. **Settings** → **Notifications**
2. Enable "Actions" notifications
3. Get email on workflow failures

---

## Next Phase Preview

**Phase 3: Monitoring Stack**
- Prometheus metrics collection
- Grafana dashboards
- Database backup automation
- Real-time alerting

Ready to implement when you are!
