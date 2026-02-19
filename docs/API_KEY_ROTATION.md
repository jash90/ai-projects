# API Key Rotation Procedures

## Overview

Secure procedures for rotating API keys and secrets without downtime.

**Supported Providers:**
- OpenAI
- Anthropic
- OpenRouter
- Sentry
- PostHog
- JWT Secret

**Rotation Frequency:**
- **Critical (JWT, Database):** Every 90 days
- **API Keys:** Every 6 months or on compromise
- **Monitoring Keys:** Every 12 months

---

## 1. Docker Compose Rotation

### JWT Secret Rotation

**Step 1: Generate new secret**
```bash
# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)
echo "New JWT Secret: $NEW_JWT_SECRET"
```

**Step 2: Update environment**
```bash
# Update backend/.env
# Old: JWT_SECRET=old-secret
# New: JWT_SECRET=new-secret

# Or export temporarily
export JWT_SECRET="$NEW_JWT_SECRET"
```

**Step 3: Restart backend**
```bash
docker-compose restart backend

# Verify
curl http://localhost:3001/api/health
```

**Step 4: Invalidate old tokens**
```bash
# Users will need to log in again
# Old tokens will fail validation automatically
```

### API Key Rotation (OpenAI, Anthropic, OpenRouter)

**Step 1: Create new API key**
1. Log into provider dashboard (OpenAI, Anthropic, or OpenRouter)
2. Create new API key
3. Copy the key

**Step 2: Update environment**
```bash
# Update backend/.env
OPENAI_API_KEY=sk-new-key-here
# or
ANTHROPIC_API_KEY=sk-ant-new-key-here
# or
OPENROUTER_API_KEY=sk-or-new-key-here
```

**Step 3: Restart backend**
```bash
docker-compose restart backend
```

**Step 4: Verify functionality**
```bash
# Test AI chat in application
# Should work with new key
```

**Step 5: Revoke old key**
1. Wait 24 hours (ensure no issues)
2. Go to provider dashboard
3. Revoke/delete old API key

### Database Credentials Rotation

**Step 1: Create new user in PostgreSQL**
```bash
docker exec -it claude-projects-postgres-1 psql -U postgres

# In psql:
CREATE USER claude_app_v2 WITH PASSWORD 'new-secure-password';
GRANT ALL PRIVILEGES ON DATABASE claude_projects TO claude_app_v2;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO claude_app_v2;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO claude_app_v2;
\q
```

**Step 2: Update DATABASE_URL**
```bash
# Update backend/.env
DATABASE_URL=postgresql://claude_app_v2:new-secure-password@postgres:5432/claude_projects
```

**Step 3: Restart backend**
```bash
docker-compose restart backend
```

**Step 4: Verify and cleanup**
```bash
# Test application
# After 24 hours:
docker exec -it claude-projects-postgres-1 psql -U postgres

# Revoke old user
DROP USER claude_app;
```

---

## 2. Kubernetes Secret Rotation

### Zero-Downtime Secret Rotation Strategy

**Approach 1: Rolling Update with New Secret**

**Step 1: Create new secret version**
```bash
# Generate new value
NEW_VALUE=$(openssl rand -base64 32)

# Create new secret with different name
kubectl create secret generic jwt-secret-v2 \
  --from-literal=secret="$NEW_VALUE" \
  -n claude-projects
```

**Step 2: Update deployment to use new secret**
```yaml
# Edit k8s/backend-deployment.yaml
env:
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: jwt-secret-v2  # Changed from jwt-secret
      key: secret
```

**Step 3: Apply changes (rolling update)**
```bash
kubectl apply -f k8s/backend-deployment.yaml

# Watch rollout
kubectl rollout status deployment/backend -n claude-projects
```

**Step 4: Verify and cleanup**
```bash
# Test application
# After 24 hours:
kubectl delete secret jwt-secret -n claude-projects
```

**Approach 2: In-Place Secret Update (Requires Pod Restart)**

**Step 1: Update existing secret**
```bash
# Generate new value
NEW_VALUE=$(openssl rand -base64 32 | base64)

# Patch secret
kubectl patch secret jwt-secret -n claude-projects \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/secret", "value":"'$NEW_VALUE'"}]'
```

**Step 2: Restart pods to pick up new secret**
```bash
# Rolling restart
kubectl rollout restart deployment/backend -n claude-projects

# Watch rollout
kubectl rollout status deployment/backend -n claude-projects
```

### Automated Rotation with External Secrets Operator

**Install External Secrets Operator:**
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

**Configure with AWS Secrets Manager:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: claude-projects
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: jwt-secret
  namespace: claude-projects
spec:
  refreshInterval: 1h  # Auto-refresh every hour
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: jwt-secret
    creationPolicy: Owner
  data:
  - secretKey: secret
    remoteRef:
      key: claude-projects/jwt-secret
```

**Rotate in AWS Secrets Manager:**
1. Update secret in AWS console
2. Wait for refresh interval (1 hour)
3. Pods automatically get new value

---

## 3. HashiCorp Vault Rotation

### Dynamic Secrets with Vault

**Enable database secret engine:**
```bash
vault secrets enable database

vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="backend" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/claude_projects" \
  username="vault" \
  password="vault-password"

vault write database/roles/backend \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT ALL PRIVILEGES ON DATABASE claude_projects TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

**Backend gets dynamic credentials:**
- Vault generates temporary database credentials
- Auto-rotates every hour
- Automatically revoked after TTL expires

### API Key Rotation with Vault

**Store API keys in Vault:**
```bash
# Store OpenAI key
vault kv put secret/claude-projects/api-keys \
  openai="sk-..." \
  anthropic="sk-ant-..." \
  openrouter="sk-or-..."

# Enable versioning (keeps old versions)
vault kv metadata put -max-versions=5 secret/claude-projects/api-keys

# Rotate by creating new version
vault kv put secret/claude-projects/api-keys \
  openai="sk-new-key" \
  anthropic="sk-ant-new-key" \
  openrouter="sk-or-new-key"
```

**Pods automatically get new keys:**
- Vault Agent Injector updates secrets
- Pods restart with new values
- Old keys can be retrieved if needed

---

## 4. Rotation Schedule

### Recommended Rotation Frequencies

| Secret Type | Frequency | Risk Level | Automation |
|-------------|-----------|------------|------------|
| JWT Secret | 90 days | High | Manual |
| Database Password | 90 days | Critical | Manual |
| OpenAI API Key | 6 months | Medium | Manual |
| Anthropic API Key | 6 months | Medium | Manual |
| OpenRouter API Key | 6 months | Medium | Manual |
| Sentry DSN | 12 months | Low | Manual |
| PostHog Key | 12 months | Low | Manual |
| TLS Certificates | Auto (Let's Encrypt) | High | Automated ✅ |

### Automated Rotation with Vault

| Secret Type | TTL | Auto-Rotate |
|-------------|-----|-------------|
| Database credentials | 1 hour | ✅ Yes |
| JWT tokens | 15 minutes | ✅ Yes |
| Service-to-service | 1 hour | ✅ Yes |

---

## 5. Rotation Testing

### Test Rotation Without Downtime

**Test 1: Create test secret**
```bash
kubectl create secret generic test-secret \
  --from-literal=value="old-value" \
  -n claude-projects
```

**Test 2: Deploy test pod**
```bash
kubectl run test-pod \
  --image=busybox \
  --restart=Never \
  -n claude-projects \
  --command -- sh -c "while true; do echo SECRET: \$TEST_VALUE; sleep 5; done" \
  --env="TEST_VALUE=$(kubectl get secret test-secret -n claude-projects -o jsonpath='{.data.value}' | base64 -d)"
```

**Test 3: Rotate secret**
```bash
kubectl patch secret test-secret -n claude-projects \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/value", "value":"'$(echo -n "new-value" | base64)'"}]'
```

**Test 4: Restart pod**
```bash
kubectl delete pod test-pod -n claude-projects
# Recreate with same command
# Verify new value is used
```

**Test 5: Cleanup**
```bash
kubectl delete secret test-secret -n claude-projects
```

---

## 6. Emergency Rotation (Compromised Key)

### Immediate Response

**Step 1: Revoke compromised key immediately**
```bash
# In provider dashboard (OpenAI, Anthropic, etc.)
# Delete/revoke the compromised key NOW
```

**Step 2: Create new key**
```bash
# Generate new key in provider dashboard
# Copy new key
```

**Step 3: Update Kubernetes secret**
```bash
# Base64 encode new key
NEW_KEY_B64=$(echo -n "sk-new-key" | base64)

# Update secret immediately
kubectl patch secret api-keys -n claude-projects \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/openai-api-key", "value":"'$NEW_KEY_B64'"}]'
```

**Step 4: Rolling restart (fast)**
```bash
# Restart all backend pods quickly
kubectl rollout restart deployment/backend -n claude-projects

# Don't wait - this is emergency!
```

**Step 5: Monitor for unauthorized usage**
```bash
# Check logs for failed API calls
kubectl logs -f deployment/backend -n claude-projects | grep -i "error\|unauthorized"

# Check PostHog for error events
# Check Sentry for API errors
```

**Step 6: Post-incident review**
```bash
# Review audit logs
kubectl logs deployment/backend -n claude-projects --since=24h | grep AUDIT

# Identify how key was compromised
# Update security procedures to prevent recurrence
```

---

## 7. Rotation Checklist

### Pre-Rotation
- [ ] Identify secret to rotate
- [ ] Check dependencies (which services use it)
- [ ] Prepare new secret value
- [ ] Schedule rotation during low-traffic period
- [ ] Notify team (if applicable)
- [ ] Backup current configuration

### During Rotation
- [ ] Create new secret/key
- [ ] Update Kubernetes secret or environment variable
- [ ] Rolling restart pods
- [ ] Monitor logs for errors
- [ ] Verify application functionality
- [ ] Check error rates in monitoring

### Post-Rotation
- [ ] Wait 24 hours for stability
- [ ] Revoke/delete old secret
- [ ] Update documentation
- [ ] Log rotation in audit trail
- [ ] Schedule next rotation

---

## 8. Rotation Automation

### Automatic Secret Rotation Script

**File:** `scripts/rotate-secrets.sh`

```bash
#!/bin/bash
set -e

SECRET_NAME=$1
SECRET_KEY=$2
NAMESPACE="claude-projects"

if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_KEY" ]; then
  echo "Usage: $0 <secret-name> <secret-key>"
  echo "Example: $0 jwt-secret secret"
  exit 1
fi

# Generate new value
NEW_VALUE=$(openssl rand -base64 32)
NEW_VALUE_B64=$(echo -n "$NEW_VALUE" | base64)

echo "Rotating $SECRET_NAME/$SECRET_KEY..."

# Update secret
kubectl patch secret $SECRET_NAME -n $NAMESPACE \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/'$SECRET_KEY'", "value":"'$NEW_VALUE_B64'"}]'

echo "Secret updated. Rolling restart deployment..."

# Restart all deployments that use this secret
kubectl rollout restart deployment/backend -n $NAMESPACE

echo "Waiting for rollout to complete..."
kubectl rollout status deployment/backend -n $NAMESPACE

echo "Rotation complete!"
echo "Old value has been replaced. Revoke in provider dashboard if applicable."
```

---

## 9. Compliance Requirements

### SOC 2 Requirements
- ✅ Audit logging for all secret access
- ✅ Regular rotation schedule (90-180 days)
- ✅ Encryption at rest
- ✅ Access control (RBAC)
- ⏳ Annual security review

### GDPR/Privacy
- ✅ Encryption in transit (TLS)
- ✅ Encryption at rest (secrets)
- ✅ Access logging
- ✅ Data retention policies

### PCI DSS (if handling payments)
- ✅ Key rotation every 90 days
- ✅ Strong encryption (AES-256)
- ✅ Access control and logging
- ⏳ Regular security assessments

---

## 10. Monitoring Secret Health

### Track Rotation Status

**Create dashboard in Grafana:**
```promql
# Days since last rotation
(time() - kube_secret_info{namespace="claude-projects"}) / 86400

# Alert if > 90 days
(time() - kube_secret_info{namespace="claude-projects"}) / 86400 > 90
```

### Audit Log Queries

**Check who accessed secrets:**
```bash
# In backend logs
kubectl logs deployment/backend -n claude-projects | grep "AUDIT.*api_keys"

# In Kubernetes audit logs (if enabled)
kubectl logs -n kube-system deployment/kube-apiserver | grep "secrets"
```

---

## 11. Troubleshooting

### Issue: Application fails after rotation

**Diagnosis:**
```bash
# Check secret value
kubectl get secret jwt-secret -n claude-projects -o jsonpath='{.data.secret}' | base64 -d

# Check pod environment
kubectl exec -it <backend-pod> -n claude-projects -- env | grep JWT_SECRET

# Check logs
kubectl logs <backend-pod> -n claude-projects
```

**Solution:**
```bash
# Rollback to old secret value
kubectl patch secret jwt-secret -n claude-projects \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/secret", "value":"'$OLD_VALUE_B64'"}]'

# Restart pods
kubectl rollout restart deployment/backend -n claude-projects
```

### Issue: Old tokens still work after JWT rotation

**Cause:** Token expiry not enforced

**Solution:**
1. Implement token blacklist in Redis
2. Force logout all users
3. Clear Redis cache: `redis-cli FLUSHALL`

---

## 12. Best Practices

### Security
1. **Never log secret values** - Only log rotation events
2. **Use strong random generation** - `openssl rand -base64 32`
3. **Rotate on schedule** - Don't wait for compromise
4. **Test in staging first** - Verify rotation procedure
5. **Monitor after rotation** - Watch for errors

### Operational
1. **Document rotation** - Keep rotation log
2. **Notify team** - Communication before rotation
3. **Low-traffic window** - Rotate during off-peak hours
4. **Verify before revoking** - Wait 24 hours minimum
5. **Backup old secrets** - Keep for 7 days for rollback

### Automation
1. **Use secret managers** - Vault, AWS Secrets Manager, etc.
2. **Implement auto-rotation** - Dynamic secrets with short TTL
3. **Monitor expiry** - Alert 30 days before rotation due
4. **Test regularly** - Practice rotation quarterly

---

## 13. Rotation Log Template

```markdown
## Secret Rotation Log

**Date:** 2024-01-14
**Rotated By:** admin@example.com
**Secret:** JWT_SECRET
**Reason:** Scheduled 90-day rotation
**Method:** Kubernetes secret patch + rolling restart

**Timeline:**
- 10:00 AM - Generated new secret
- 10:05 AM - Updated Kubernetes secret
- 10:06 AM - Started rolling restart
- 10:10 AM - All pods restarted successfully
- 10:15 AM - Verified application functionality
- 10:20 AM - Monitored for 5 minutes - no errors

**Verification:**
- ✅ All backend pods healthy
- ✅ Users can log in
- ✅ No increase in error rate
- ✅ Audit logs show rotation event

**Next Rotation Due:** 2024-04-14
```

---

## Summary

**Key Principles:**
- Rotate secrets regularly (90-180 days)
- Zero-downtime rotation via rolling updates
- Test in staging first
- Monitor after rotation
- Log all rotation events for compliance

**Tools:**
- Kubernetes secrets (basic)
- External Secrets Operator (automated)
- HashiCorp Vault (dynamic secrets)
- AWS/GCP/Azure secret managers (cloud-native)

**Compliance:**
- Meets SOC 2 requirements
- GDPR compliant
- Supports PCI DSS

For more details, see Phase 5 security hardening documentation.
