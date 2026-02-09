# 🚀 Claude Projects - Production Deployment Guide

## Quick Navigation

**Choose your deployment path:**
- 🏠 [Local Development](#local-development) - Start here
- 🐳 [Docker Compose](#docker-compose-staging) - Simple deployment
- ☸️ [Kubernetes](#kubernetes-production) - Enterprise scale

---

## Local Development

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your values

# 3. Start PostgreSQL and Redis
docker-compose up -d postgres redis

# 4. Run database migrations
pnpm db:migrate

# 5. Start development servers
pnpm dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### With Monitoring

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
open http://localhost:3002  # Grafana (admin/admin)
open http://localhost:9090  # Prometheus
```

---

## Docker Compose (Staging)

### Prerequisites

- Docker and Docker Compose installed
- GitHub account (for CI/CD)
- Domain name (optional)

### Deployment Steps

**1. Clone and configure:**
```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

# Configure environment
cp .env.example .env
# Edit .env with production values
```

**2. Build and start:**
```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

**3. Verify deployment:**
```bash
# Check health
curl http://localhost:3001/api/health

# View logs
docker-compose logs -f backend

# Access application
open http://localhost:3000
```

**4. Set up monitoring:**
```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Connect to application network
docker network connect monitoring_monitoring claude-projects-backend-1

# Access Grafana
open http://localhost:3002
```

**5. Configure backups:**
```bash
# Test backup
export DATABASE_URL="postgresql://postgres:password@localhost:5432/claude_projects"
./scripts/backup-database.sh

# Schedule automated backups
crontab -e
# Add: 0 2 * * * cd /path/to/project && ./scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

---

## Kubernetes (Production)

### Prerequisites

**Required:**
- Kubernetes cluster (v1.24+)
  - AWS EKS, GCP GKE, Azure AKS, or
  - DigitalOcean Kubernetes, or
  - Local: Minikube, kind, k3s
- kubectl configured
- Docker images built and pushed to registry

**Recommended:**
- Ingress controller (nginx)
- Cert-manager (for TLS)
- Metrics server (for autoscaling)
- Helm (for easier installs)

### Installation Steps

#### 1. Install Prerequisites

**Ingress Controller:**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

**Cert-Manager:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify
kubectl get pods -n cert-manager
```

**Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl top nodes
```

#### 2. Configure Secrets

**Create secrets.yaml:**
```bash
# Copy template
cp k8s/secrets-template.yaml k8s/secrets.yaml

# Generate base64 values
echo -n "your-value" | base64

# Edit secrets.yaml with actual values
# Database URL, API keys, JWT secret, etc.

# Add to .gitignore (already done ✅)
```

**Example secret values:**
```bash
# JWT Secret
openssl rand -base64 32 | base64

# PostgreSQL password
echo -n "strong-postgres-password" | base64

# Database URL
echo -n "postgresql://postgres:password@postgres-service:5432/claude_projects" | base64

# API keys
echo -n "sk-..." | base64  # Your actual keys
```

#### 3. Update Configuration

**Update domain in `k8s/ingress.yaml`:**
```yaml
spec:
  tls:
  - hosts:
    - your-domain.com  # CHANGE THIS
```

**Update email in `k8s/cert-manager-issuer.yaml`:**
```yaml
spec:
  acme:
    email: your-email@example.com  # CHANGE THIS
```

**Update CORS in `k8s/configmaps.yaml`:**
```yaml
data:
  CORS_ORIGIN: "https://your-domain.com"  # CHANGE THIS
```

**Update image references:**
```yaml
# In all deployment files
image: ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
```

#### 4. Deploy Application

**Automated (Recommended):**
```bash
./scripts/deploy-k8s.sh production

# Script handles:
# - Namespace creation
# - Secrets and ConfigMaps
# - Database deployment
# - Database migrations
# - Application deployment
# - Ingress setup
```

**Manual:**
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets and config
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml

# Deploy databases
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=postgres -n claude-projects --timeout=300s

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/cert-manager-issuer.yaml
kubectl apply -f k8s/ingress.yaml
```

#### 5. Apply Security Hardening

**Apply RBAC:**
```bash
kubectl apply -f k8s/rbac.yaml

# Update deployments to use service accounts
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

**Apply Pod Security:**
```bash
kubectl apply -f k8s/pod-security.yaml

# Verify quotas
kubectl describe resourcequota claude-projects-quota -n claude-projects
```

**Apply Network Policies:**
```bash
# ⚠️ Apply LAST - will restrict traffic
kubectl apply -f k8s/network-policies.yaml

# Test connectivity immediately
kubectl exec -it <backend-pod> -n claude-projects -- curl http://postgres-service:5432
```

#### 6. Verify Deployment

```bash
# Check all resources
kubectl get all -n claude-projects

# Check pods
kubectl get pods -n claude-projects

# Check HPA
kubectl get hpa -n claude-projects

# Check ingress
kubectl get ingress -n claude-projects

# Check certificate
kubectl get certificate -n claude-projects

# Test health
kubectl port-forward -n claude-projects svc/backend-service 3001:3001
curl http://localhost:3001/api/health
```

---

## Configuration Management

### Environment-Specific Configurations

**Development:**
```env
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

**Staging:**
```env
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

**Production:**
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_SWAGGER=false
```

### Multi-Environment Strategy

**Option 1: Separate namespaces**
```bash
# Create staging namespace
kubectl create namespace claude-projects-staging

# Deploy to staging
kubectl apply -f k8s/ -n claude-projects-staging

# Deploy to production
kubectl apply -f k8s/ -n claude-projects
```

**Option 2: Separate clusters**
```bash
# Switch context
kubectl config use-context staging-cluster
./scripts/deploy-k8s.sh staging

kubectl config use-context production-cluster
./scripts/deploy-k8s.sh production
```

---

## Monitoring & Observability

### Grafana Dashboards

**Access:** http://localhost:3002 (Docker) or https://grafana.your-domain.com (K8s)

**Default credentials:** admin/admin (change immediately!)

**Pre-configured dashboard:**
- HTTP request rate
- Response time (95th percentile)
- Error rate
- Active connections
- AI request rate

**Create custom dashboards for:**
- Business metrics (users, projects, messages)
- AI provider usage (tokens, costs)
- Database performance (query time, connection pool)
- System resources (CPU, memory, disk)

### Web Vitals

**Check PostHog for:**
- `web_vital_lcp` - Loading performance
- `web_vital_inp` - Interactivity
- `web_vital_cls` - Visual stability
- `web_vital_fcp` - First paint
- `web_vital_ttfb` - Server response

### Alerts (To Configure)

**Recommended alerts in Prometheus:**
```yaml
# High error rate
alert: HighErrorRate
expr: sum(rate(http_requests_total{status=~"5.."}[5m])) > 0.05
for: 5m

# High response time
alert: HighResponseTime
expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
for: 5m

# Pod crash looping
alert: PodCrashLooping
expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
for: 5m
```

---

## Database Management

### Backups

**Automated (Docker Compose):**
```bash
# Schedule via cron
crontab -e
0 2 * * * cd /path/to/project && ./scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

**Automated (Kubernetes):**
```bash
# CronJob already configured in postgres-statefulset.yaml
# Runs daily at 2 AM UTC

# Check backup jobs
kubectl get cronjobs -n claude-projects
kubectl get jobs -n claude-projects | grep postgres-backup

# Manual trigger
kubectl create job --from=cronjob/postgres-backup manual-backup -n claude-projects
```

### Migrations

**Docker Compose:**
```bash
pnpm db:migrate
```

**Kubernetes:**
```bash
# Via Job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-$(date +%Y%m%d-%H%M%S)
  namespace: claude-projects
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
        command: ["pnpm", "db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
      restartPolicy: Never
EOF

# Watch migration
kubectl logs -f job/db-migrate-... -n claude-projects
```

### Restore

**From backup:**
```bash
# Docker Compose
./scripts/restore-database.sh latest

# Kubernetes
kubectl cp backup.sql.gz claude-projects/postgres-0:/tmp/
kubectl exec -i postgres-0 -n claude-projects -- sh -c "gunzip -c /tmp/backup.sql.gz | psql -U postgres claude_projects"
```

---

## Security Hardening

### Apply Security Features

**1. RBAC:**
```bash
kubectl apply -f k8s/rbac.yaml

# Verify service accounts
kubectl get serviceaccounts -n claude-projects
```

**2. Network Policies:**
```bash
kubectl apply -f k8s/network-policies.yaml

# Test connectivity
kubectl exec -it <backend-pod> -n claude-projects -- curl http://backend-service:3001/api/health
```

**3. Pod Security:**
```bash
kubectl apply -f k8s/pod-security.yaml

# Check quotas
kubectl describe resourcequota -n claude-projects
```

**4. Audit Logging:**
```typescript
// Already included in backend/src/middleware/auditLogger.ts
// Integrate in backend/src/index.ts
```

**5. Secret Rotation:**
```bash
# Test rotation
./scripts/rotate-secrets.sh jwt-secret secret

# Schedule quarterly
# Add to calendar: Rotate JWT secret every 90 days
```

---

## Scaling

### Manual Scaling

```bash
# Docker Compose (vertical only)
# Edit docker-compose.yml resources

# Kubernetes (horizontal)
kubectl scale deployment backend --replicas=8 -n claude-projects
kubectl scale deployment frontend --replicas=4 -n claude-projects
```

### Auto-Scaling (Kubernetes)

**Already configured via HPA:**
- Backend: 3-10 replicas (70% CPU, 80% memory)
- Frontend: 2-5 replicas (70% CPU, 80% memory)

**Monitor scaling:**
```bash
kubectl get hpa -n claude-projects -w
```

**Load test:**
```bash
# Install hey
go install github.com/rakyll/hey@latest

# Generate load
hey -z 60s -c 50 -q 10 https://your-domain.com/api/health

# Watch pods scale
kubectl get pods -n claude-projects -w
```

---

## Updates & Rollbacks

### Docker Compose

**Update:**
```bash
# Pull latest changes
git pull origin main

# Rebuild
docker-compose build

# Restart
docker-compose up -d

# Verify
docker-compose ps
```

**Rollback:**
```bash
# Revert git changes
git revert HEAD

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Kubernetes

**Update:**
```bash
# Option 1: Update image tag
kubectl set image deployment/backend \
  backend=ghcr.io/YOUR_ORG/YOUR_REPO/backend:v2.0.0 \
  -n claude-projects

# Option 2: Apply updated manifest
kubectl apply -f k8s/backend-deployment.yaml

# Watch rollout
kubectl rollout status deployment/backend -n claude-projects
```

**Rollback:**
```bash
# Automatic rollback on health check failure
# Or manual rollback:
kubectl rollout undo deployment/backend -n claude-projects

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n claude-projects

# Check history
kubectl rollout history deployment/backend -n claude-projects
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
# Docker Compose
docker-compose logs backend

# Kubernetes
kubectl logs deployment/backend -n claude-projects
```

**Common issues:**
- Database connection failed: Check DATABASE_URL
- Redis connection failed: Check REDIS_URL
- Missing API keys: Check environment variables
- Port already in use: Kill process or change port

### Database Connection Issues

**Check connection:**
```bash
# Docker Compose
docker exec -it claude-projects-postgres-1 psql -U postgres -c "SELECT 1;"

# Kubernetes
kubectl exec -it postgres-0 -n claude-projects -- psql -U postgres -c "SELECT 1;"
```

**Check logs:**
```bash
# PostgreSQL logs
docker-compose logs postgres
# or
kubectl logs statefulset/postgres -n claude-projects
```

### Monitoring Not Working

**Prometheus can't scrape:**
```bash
# Check backend metrics endpoint
curl http://localhost:3001/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

**Grafana shows no data:**
```bash
# Test Prometheus connection
# Grafana → Settings → Data Sources → Prometheus → Test

# Check if data exists
curl 'http://localhost:9090/api/v1/query?query=up'
```

### Kubernetes Specific

**Pods not starting:**
```bash
# Check pod status
kubectl get pods -n claude-projects

# Describe pod
kubectl describe pod <pod-name> -n claude-projects

# Check events
kubectl get events -n claude-projects --sort-by='.lastTimestamp'
```

**Common K8s issues:**
- ImagePullBackOff: Wrong image name or registry auth
- CrashLoopBackOff: Check logs for application errors
- Pending: Insufficient resources or PVC not binding
- ErrImagePull: Image doesn't exist in registry

---

## Performance Optimization

### Frontend

**Bundle size:**
```bash
# Analyze bundle
cd frontend
pnpm run build:analyze

# Opens stats.html showing bundle composition
```

**Optimization tips:**
- Lazy load routes
- Code splitting for heavy components
- Optimize images (WebP, lazy loading)
- Tree-shake unused dependencies

### Backend

**Database queries:**
```bash
# Check slow queries in logs
docker-compose logs backend | grep "Slow query"

# or
kubectl logs deployment/backend -n claude-projects | grep "Slow query"

# Add indexes for slow queries
```

**Connection pooling:**
```typescript
// Already configured in backend/src/database/connection.ts
// Max 20 connections
// Adjust if needed based on load
```

---

## Security Checklist

### Before Going Live

**Application:**
- ✅ All secrets in environment variables (not hardcoded)
- ✅ TLS/HTTPS enabled
- ✅ Security headers configured (Helmet)
- ✅ CORS restricted to your domain
- ✅ Rate limiting enabled
- ✅ Input validation on all endpoints
- ⏳ Change default passwords (Grafana admin)

**Infrastructure:**
- ✅ Kubernetes RBAC applied
- ✅ Network policies active
- ✅ Pod security standards enforced
- ✅ Resource quotas set
- ⏳ Encryption at rest enabled (optional)
- ⏳ WAF configured (optional)

**Monitoring:**
- ✅ Error tracking enabled (Sentry)
- ✅ Metrics collection (Prometheus)
- ✅ Audit logging active
- ✅ Security events tracked
- ⏳ Alerts configured
- ⏳ On-call rotation set up

**Backups:**
- ✅ Automated backups scheduled
- ✅ Backup verification tested
- ✅ Restore procedure tested
- ✅ Off-site backup configured (S3)
- ⏳ Disaster recovery drill completed

---

## Cost Optimization

### Development
- Use local Docker Compose: **Free**
- Use Minikube for K8s: **Free**

### Staging
- Single VPS (DigitalOcean/Linode): **$20-50/month**
- Or managed Kubernetes: **$50-100/month**

### Production

**Small (< 1,000 users):**
- Managed platform (Render/Railway): **$50-100/month**
- Or 3-node K8s cluster: **$150-200/month**

**Medium (< 10,000 users):**
- 5-node K8s cluster: **$250-400/month**
- Load balancer: **$20/month**
- Storage: **$20-50/month**
- **Total:** **$290-470/month**

**Large (< 100,000 users):**
- 10-node K8s cluster: **$500-800/month**
- Auto-scaling enabled
- Multi-region (optional): **+50% cost**

**Cost reduction tips:**
- Use spot instances (60-90% savings)
- Right-size pods (check actual usage)
- Enable cluster autoscaler
- Use cheaper storage classes for non-critical data

---

## Maintenance

### Daily
- ✅ Monitor error rates (automatic via Sentry)
- ✅ Check health endpoints (automatic via K8s probes)

### Weekly
- Review Grafana dashboards
- Check security alerts
- Review audit logs
- Monitor costs

### Monthly
- Update dependencies: `pnpm update`
- Review backup logs
- Test restore procedure
- Security scan review

### Quarterly
- Rotate critical secrets: `./scripts/rotate-secrets.sh`
- Disaster recovery drill
- Review RBAC permissions
- Update security policies

### Annually
- Third-party security audit
- Penetration testing
- SOC 2 audit (if applicable)
- Infrastructure review

---

## Support

### Documentation
- `/docs/` - All implementation guides (8 files, 5,400+ lines)
- `/k8s/README.md` - Kubernetes quick reference
- Root `CLAUDE.md` - Project overview

### Monitoring
- Grafana: Dashboards and metrics
- Prometheus: Raw metrics and queries
- PostHog: Analytics and events
- Sentry: Error tracking

### Logs
```bash
# Docker Compose
docker-compose logs -f <service>

# Kubernetes
kubectl logs -f deployment/<name> -n claude-projects
```

---

## Quick Reference

### Useful Commands

```bash
# Docker Compose
docker-compose up -d                    # Start
docker-compose down                     # Stop
docker-compose logs -f backend          # Logs
docker-compose ps                       # Status
docker-compose restart backend          # Restart service

# Kubernetes
kubectl get all -n claude-projects      # Status
kubectl logs -f deployment/backend -n claude-projects  # Logs
kubectl describe pod <name> -n claude-projects        # Details
kubectl exec -it <pod> -n claude-projects -- sh       # Shell
kubectl rollout restart deployment/backend -n claude-projects  # Restart

# Monitoring
open http://localhost:3002              # Grafana
open http://localhost:9090              # Prometheus

# Backups
./scripts/backup-database.sh            # Backup
./scripts/restore-database.sh latest    # Restore

# Security
./scripts/rotate-secrets.sh jwt-secret secret  # Rotate secret
kubectl apply -f k8s/network-policies.yaml     # Apply network policies
```

---

## Success Criteria

### Application Running
- ✅ Frontend accessible
- ✅ Backend API responding
- ✅ Database connected
- ✅ Redis cache working
- ✅ WebSocket connections working

### Monitoring Active
- ✅ Metrics flowing to Prometheus
- ✅ Grafana showing data
- ✅ Web Vitals tracking
- ✅ Error tracking (Sentry)
- ✅ Audit logs recording

### Security Hardened
- ✅ HTTPS/TLS enabled
- ✅ Network policies active
- ✅ RBAC configured
- ✅ Secrets rotated
- ✅ Security scanning passing

### High Availability
- ✅ Multiple pods running (3+ backend, 2+ frontend)
- ✅ Auto-scaling operational
- ✅ Zero-downtime deployments
- ✅ Health checks passing

---

**You're ready for production! 🚀**

See full documentation in `/docs/` directory for detailed guides on each feature.
