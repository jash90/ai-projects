# Kubernetes Deployment Manifests

This directory contains Kubernetes manifests for deploying Claude Projects to a Kubernetes cluster.

## Quick Start

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create secrets (IMPORTANT: Edit secrets.yaml first!)
cp secrets-template.yaml secrets.yaml
# Edit secrets.yaml with actual base64-encoded values
kubectl apply -f secrets.yaml

# 3. Create ConfigMaps
kubectl apply -f configmaps.yaml

# 4. Deploy database and cache
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n claude-projects --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n claude-projects --timeout=300s

# 5. Deploy application
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# 6. Set up ingress (requires ingress controller)
kubectl apply -f cert-manager-issuer.yaml  # If using cert-manager
kubectl apply -f ingress.yaml

# 7. Verify deployment
kubectl get pods -n claude-projects
kubectl get services -n claude-projects
kubectl get ingress -n claude-projects
```

## Prerequisites

### Required
- Kubernetes cluster (v1.24+)
- kubectl configured
- Storage class available (for PVCs)

### Recommended
- **Ingress Controller:**
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
  ```

- **Cert-Manager** (for TLS):
  ```bash
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
  ```

- **Metrics Server** (for HPA):
  ```bash
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
  ```

## File Overview

| File | Purpose | Required |
|------|---------|----------|
| `namespace.yaml` | Creates claude-projects namespace | ✅ Yes |
| `secrets-template.yaml` | Template for secrets (copy to secrets.yaml) | ✅ Yes |
| `configmaps.yaml` | Application configuration | ✅ Yes |
| `backend-deployment.yaml` | Backend deployment + service + HPA | ✅ Yes |
| `frontend-deployment.yaml` | Frontend deployment + service + HPA | ✅ Yes |
| `postgres-statefulset.yaml` | PostgreSQL + backup CronJob | ✅ Yes |
| `redis-deployment.yaml` | Redis deployment + service | ✅ Yes |
| `ingress.yaml` | External traffic routing | ⏳ Optional |
| `cert-manager-issuer.yaml` | TLS certificate issuer | ⏳ Optional |

## Configuration

### 1. Update Image References

Edit deployments to use your images:
```yaml
# In backend-deployment.yaml and frontend-deployment.yaml
image: ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
```

Replace `YOUR_ORG/YOUR_REPO` with your GitHub organization and repository.

### 2. Configure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Encode for Kubernetes
echo -n "your-secret-value" | base64

# Edit secrets.yaml with base64-encoded values
```

### 3. Update Domain

Edit `ingress.yaml` and `configmaps.yaml`:
- Replace `your-domain.com` with your actual domain
- Update CORS_ORIGIN in configmaps.yaml

### 4. Configure Storage

Default storage class: `standard`

Check available storage classes:
```bash
kubectl get storageclass
```

Update in manifests if needed:
```yaml
storageClassName: gp2  # AWS EBS
storageClassName: pd-ssd  # GCP
storageClassName: managed-premium  # Azure
```

## Deployment Strategies

### Rolling Update (Default)
- Zero downtime deployments
- Gradual pod replacement
- Automatic rollback on failure

### Blue-Green Deployment
1. Deploy new version with different label
2. Test new version
3. Switch service selector
4. Remove old version

### Canary Deployment
1. Deploy small percentage with new version
2. Monitor metrics
3. Gradually increase traffic
4. Full rollout or rollback

## Scaling

### Manual Scaling
```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n claude-projects

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n claude-projects
```

### Auto-Scaling (HPA)
Configured in deployment files:
- Backend: 3-10 replicas (70% CPU, 80% memory)
- Frontend: 2-5 replicas (70% CPU, 80% memory)

Check HPA status:
```bash
kubectl get hpa -n claude-projects
kubectl describe hpa backend-hpa -n claude-projects
```

## Monitoring

### Pod Status
```bash
# All pods
kubectl get pods -n claude-projects

# Watch pods
kubectl get pods -n claude-projects -w

# Pod details
kubectl describe pod <pod-name> -n claude-projects
```

### Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n claude-projects

# Frontend logs
kubectl logs -f deployment/frontend -n claude-projects

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n claude-projects

# All containers in a pod
kubectl logs -f <pod-name> --all-containers -n claude-projects
```

### Resource Usage
```bash
# CPU and memory usage
kubectl top pods -n claude-projects
kubectl top nodes
```

### Events
```bash
# Recent events
kubectl get events -n claude-projects --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pods not starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n claude-projects

# Common issues:
# - ImagePullBackOff: Check image name and registry access
# - CrashLoopBackOff: Check logs for errors
# - Pending: Check resource availability and PVC binding
```

### Service not accessible
```bash
# Check service
kubectl get svc -n claude-projects

# Check endpoints
kubectl get endpoints -n claude-projects

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n claude-projects -- sh
# curl http://backend-service:3001/api/health
```

### Database connection issues
```bash
# Check PostgreSQL is running
kubectl get statefulset postgres -n claude-projects

# Check PostgreSQL logs
kubectl logs statefulset/postgres -n claude-projects

# Test connection
kubectl exec -it postgres-0 -n claude-projects -- psql -U postgres -c "SELECT 1;"
```

### Ingress not working
```bash
# Check ingress
kubectl get ingress -n claude-projects
kubectl describe ingress claude-projects-ingress -n claude-projects

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check certificate
kubectl get certificate -n claude-projects
kubectl describe certificate claude-projects-tls -n claude-projects
```

## Maintenance

### Updates
```bash
# Update backend
kubectl set image deployment/backend backend=ghcr.io/YOUR_ORG/YOUR_REPO/backend:v2.0.0 -n claude-projects

# Rollback if needed
kubectl rollout undo deployment/backend -n claude-projects

# Check rollout status
kubectl rollout status deployment/backend -n claude-projects
```

### Backups
Automated backups via CronJob (postgres-statefulset.yaml):
- Runs daily at 2 AM UTC
- Stores in PVC (100Gi)
- Retains 30 days

Manual backup:
```bash
# Create backup job
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%Y%m%d) -n claude-projects

# Check job status
kubectl get jobs -n claude-projects
```

### Database Migrations
```bash
# Run migrations as a Kubernetes Job
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
  backoffLimit: 3
EOF
```

## Security

### Network Policies
Consider adding network policies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: claude-projects
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards
Apply pod security policies or standards appropriate for your cluster.

## Resources

- Kubernetes docs: https://kubernetes.io/docs/
- Ingress nginx: https://kubernetes.github.io/ingress-nginx/
- Cert-manager: https://cert-manager.io/docs/
- HPA: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
