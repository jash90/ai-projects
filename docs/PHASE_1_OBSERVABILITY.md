# Phase 1: Observability Enhancements - Implementation Guide

## Overview

Phase 1 adds critical production monitoring features:
- ✅ **Web Vitals Tracking** - Real user performance metrics
- ✅ **Database Query Logging** - Slow query detection
- ✅ **Feature Flags** - Gradual rollout capability

**Status:** ✅ Implemented and type-checked

---

## 1. Web Vitals Tracking

### What Was Added

**File:** `frontend/src/utils/webVitals.ts`

Tracks Core Web Vitals metrics and sends them to PostHog:
- **CLS** (Cumulative Layout Shift) - Visual stability
- **INP** (Interaction to Next Paint) - Interactivity (replaces deprecated FID)
- **LCP** (Largest Contentful Paint) - Loading performance
- **FCP** (First Contentful Paint) - Initial render
- **TTFB** (Time to First Byte) - Server response

**Integration:** `frontend/src/main.tsx` - Initialized after app render

### How to Use

Web Vitals tracking is automatic - no code changes needed. Metrics are sent to PostHog as events:
- `web_vital_cls`
- `web_vital_inp`
- `web_vital_lcp`
- `web_vital_fcp`
- `web_vital_ttfb`

### Viewing Metrics

**In PostHog:**
1. Navigate to Events
2. Filter for `web_vital_*` events
3. Create insights/dashboards with performance trends

**In Browser Console:**
- Poor metrics logged as warnings: `[Web Vitals] Poor LCP detected: 4200`

### Performance Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4s | ≥ 4s |
| INP | < 200ms | 200ms - 500ms | ≥ 500ms |
| CLS | < 0.1 | 0.1 - 0.25 | ≥ 0.25 |
| FCP | < 1.8s | 1.8s - 3s | ≥ 3s |
| TTFB | < 800ms | 800ms - 1800ms | ≥ 1800ms |

### Troubleshooting

**Problem:** No Web Vitals events in PostHog
- **Check:** PostHog is initialized (`VITE_POSTHOG_KEY` in `.env`)
- **Check:** PostHog enabled (`VITE_POSTHOG_ENABLED=true`)
- **Check:** Browser console for Web Vitals logs

**Problem:** Poor LCP scores
- **Solution:** Optimize images, lazy load, reduce bundle size
- **Check:** Lighthouse report for specific recommendations

**Problem:** Poor INP scores
- **Solution:** Reduce JavaScript execution, debounce handlers
- **Check:** Chrome DevTools Performance tab

---

## 2. Database Query Logging

### What Was Added

**File:** `backend/src/database/connection.ts`

Query logging with slow query detection:
- Logs all queries with execution time
- Warns on slow queries (>1000ms threshold)
- Sends slow query events to PostHog
- Captures query text, duration, and row count

### How to Use

Query logging is automatic. No code changes needed.

### Viewing Logs

**In Application Logs:**
```bash
# View logs in development
pnpm dev

# Logs show:
[DEBUG] Query executed { query: "SELECT * FROM...", duration: "45ms", rows: 10 }
[WARN] Slow query detected { query: "SELECT ...", duration: "1250ms", rowCount: 5000 }
```

**In PostHog:**
- Event: `slow_query`
- Properties: `query`, `duration`, `threshold`, `rowCount`

### Query Performance Optimization

**When you see slow queries:**

1. **Analyze the query:** Check for missing indexes
2. **Use EXPLAIN:** `EXPLAIN ANALYZE SELECT ...` to understand execution plan
3. **Add indexes:** Create indexes on commonly queried columns
4. **Optimize joins:** Reduce join complexity or add covering indexes

**Example - Adding an index:**
```sql
CREATE INDEX idx_projects_user_id ON projects(user_id);
```

### Configuration

**Slow Query Threshold:**
- Default: 1000ms
- Change in `backend/src/database/connection.ts:57`

**Log Level:**
- Query execution: `debug` level
- Slow queries: `warn` level

### Troubleshooting

**Problem:** Too many slow query warnings
- **Check:** Database connection pool saturation
- **Check:** Database server resources (CPU, memory)
- **Solution:** Add indexes, optimize queries, scale database

**Problem:** Query logging impacting performance
- **Solution:** Increase log threshold to 2000ms
- **Solution:** Disable debug logging in production (set `LOG_LEVEL=info`)

---

## 3. Feature Flags

### What Was Added

**File:** `frontend/src/utils/featureFlags.ts`

Feature flag utilities using PostHog:
- `checkFeatureFlag(key)` - Boolean check
- `getFeatureVariant(key)` - Get variant value
- `useFeatureFlag(key)` - React hook with auto-updates
- `useFeatureVariant(key)` - React hook for variants
- `reloadFeatureFlags()` - Force reload

### How to Use

#### 1. Create Feature Flag in PostHog

1. Log into PostHog dashboard
2. Navigate to **Feature Flags**
3. Click **New Feature Flag**
4. Configure:
   - **Key:** `new-ui-enabled` (use kebab-case)
   - **Rollout:** 0% to 100% or target specific users
   - **Variant (optional):** For A/B testing

#### 2. Use in React Components

**Simple Boolean Flag:**
```tsx
import { useFeatureFlag } from '@/utils/featureFlags';

function MyComponent() {
  const isNewUIEnabled = useFeatureFlag('new-ui-enabled');

  return (
    <div>
      {isNewUIEnabled ? <NewUI /> : <OldUI />}
    </div>
  );
}
```

**Variant Flag (A/B Testing):**
```tsx
import { useFeatureVariant } from '@/utils/featureFlags';

function ButtonComponent() {
  const buttonColor = useFeatureVariant('button-color');

  return (
    <button
      className={
        buttonColor === 'blue' ? 'bg-blue-500' :
        buttonColor === 'green' ? 'bg-green-500' :
        'bg-gray-500'
      }
    >
      Click me
    </button>
  );
}
```

**Manual Check (Outside Components):**
```tsx
import { checkFeatureFlag, getFeatureVariant } from '@/utils/featureFlags';

// Boolean check
if (checkFeatureFlag('new-api-enabled')) {
  // Use new API
}

// Get variant
const variant = getFeatureVariant('experiment-123');
```

#### 3. Reload Flags After Login

```tsx
import { reloadFeatureFlags } from '@/utils/featureFlags';

async function handleLogin() {
  // ... login logic ...

  // Reload flags after login to get user-specific flags
  await reloadFeatureFlags();
}
```

### Best Practices

1. **Naming Convention:** Use kebab-case (e.g., `new-feature-enabled`)
2. **Gradual Rollout:** Start with 0-10%, monitor metrics, increase to 100%
3. **User Targeting:** Target specific users/groups for beta testing
4. **Cleanup:** Remove flags after full rollout (add to backlog)
5. **Default Values:** Always handle undefined/false gracefully

### Example Feature Flag Rollout

**Scenario:** Rolling out a new dashboard UI

**Steps:**
1. **Create Flag:** `new-dashboard-enabled` in PostHog (0% rollout)
2. **Implement:** Use `useFeatureFlag('new-dashboard-enabled')` in Dashboard component
3. **Internal Testing:** Set flag to 100% for your user ID
4. **Beta Testing:** Set flag to 10% of users
5. **Monitor:** Check Web Vitals, error rates, user feedback
6. **Gradual Rollout:** 25% → 50% → 75% → 100%
7. **Cleanup:** Remove flag, make new UI default

### Troubleshooting

**Problem:** Flag not updating in real-time
- **Solution:** Call `reloadFeatureFlags()` to force update
- **Check:** PostHog initialization (`VITE_POSTHOG_KEY` set)

**Problem:** Flag always returns false
- **Check:** Flag created in PostHog dashboard
- **Check:** Flag key matches exactly (case-sensitive)
- **Check:** User identified via `identifyUser()` in auth flow

**Problem:** Flag not working for specific users
- **Check:** User targeting rules in PostHog
- **Solution:** Add user to flag's target group

---

## Testing Phase 1 Features

### 1. Test Web Vitals

```bash
# Start dev server
pnpm dev

# Open browser to http://localhost:3000
# Open DevTools Console
# Look for: "[Web Vitals] Initialized - tracking CLS, INP, LCP, FCP, TTFB"

# Navigate around the app
# Check PostHog Events for web_vital_* events
```

### 2. Test Query Logging

```bash
# Start backend
cd backend && pnpm dev

# Look for log output:
# "[INFO] Database query logging initialized"
# "[DEBUG] Query executed { query: '...', duration: '...', rows: ... }"

# Trigger slow query (optional):
# Run a complex query that takes >1000ms
# Check for: "[WARN] Slow query detected"
# Check PostHog for "slow_query" event
```

### 3. Test Feature Flags

```bash
# 1. Create test flag in PostHog
# Key: "test-flag"
# Rollout: 100%

# 2. Add test component:
```

```tsx
// In any component
import { useFeatureFlag } from '@/utils/featureFlags';

function TestFeatureFlag() {
  const isEnabled = useFeatureFlag('test-flag');

  return (
    <div>
      <h3>Feature Flag Test</h3>
      <p>Flag Status: {isEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
    </div>
  );
}
```

```bash
# 3. Check browser console for:
# "[Feature Flags] test-flag: true"

# 4. Toggle flag in PostHog to 0%
# 5. Reload page
# 6. Verify flag changes to false
```

---

## Environment Variables

No new environment variables required! All features use existing:
- `VITE_POSTHOG_KEY` - PostHog API key (frontend)
- `VITE_POSTHOG_ENABLED` - Enable/disable PostHog (frontend)
- `POSTHOG_API_KEY` - PostHog API key (backend)
- `LOG_LEVEL` - Logging level (backend, optional)

---

## Verification Checklist

- ✅ `pnpm type-check` passes
- ✅ Web Vitals tracked in PostHog
- ✅ Slow queries logged to console
- ✅ Slow queries tracked in PostHog
- ✅ Feature flags working in React components
- ✅ No breaking changes to existing functionality

---

## Next Steps

After verifying Phase 1 works correctly:

**Phase 2:** CI/CD Pipeline
- GitHub Actions for automated testing
- Security scanning (Snyk, Trivy)
- Bundle size monitoring

**Phase 3:** Monitoring Stack
- Prometheus + Grafana dashboards
- Database backup automation

See `/Users/bartlomiejzimny/.claude/plans/peaceful-frolicking-thacker.md` for full plan.

---

## Rollback

If issues occur:

1. **Web Vitals:** Remove `initWebVitals()` call from `main.tsx`
2. **Query Logging:** Comment out query logging code in `connection.ts`
3. **Feature Flags:** Remove `useFeatureFlag()` usage from components

All features are additive and can be safely removed without breaking existing functionality.
