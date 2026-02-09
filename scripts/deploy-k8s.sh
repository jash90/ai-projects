#!/bin/bash
set -e

# ============================================
# Kubernetes Deployment Script
# ============================================
#
# Deploys Claude Projects to Kubernetes cluster
#
# Usage:
#   ./deploy-k8s.sh [environment]
#
# Arguments:
#   environment - Target environment (dev, staging, production)
#               Default: production
#
# Prerequisites:
#   - kubectl configured and connected to cluster
#   - secrets.yaml created from secrets-template.yaml
#   - Docker images built and pushed to registry
#
# ============================================

ENVIRONMENT="${1:-production}"
NAMESPACE="claude-projects"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl."
    exit 1
fi

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    error "Cannot connect to Kubernetes cluster. Please check kubectl configuration."
    exit 1
fi

log "Deploying to environment: $ENVIRONMENT"
log "Target namespace: $NAMESPACE"
echo ""

# Confirm deployment
read -p "Continue with deployment? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
log "Starting deployment..."

# Step 1: Create namespace
log "Creating namespace..."
kubectl apply -f k8s/namespace.yaml
success "Namespace created"

# Step 2: Apply ConfigMaps
log "Applying ConfigMaps..."
kubectl apply -f k8s/configmaps.yaml
success "ConfigMaps applied"

# Step 3: Apply Secrets
log "Applying secrets..."
if [ ! -f "k8s/secrets.yaml" ]; then
    error "secrets.yaml not found!"
    error "Please create it from secrets-template.yaml and fill in actual values."
    exit 1
fi
kubectl apply -f k8s/secrets.yaml
success "Secrets applied"

# Step 4: Deploy databases
log "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres-statefulset.yaml
log "Waiting for PostgreSQL to be ready (this may take a few minutes)..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s || {
    error "PostgreSQL failed to start within 5 minutes"
    kubectl logs statefulset/postgres -n $NAMESPACE --tail=50
    exit 1
}
success "PostgreSQL ready"

log "Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yaml
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=120s
success "Redis ready"

# Step 5: Run database migrations
log "Running database migrations..."
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-$(date +%Y%m%d-%H%M%S)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ghcr.io/YOUR_ORG/YOUR_REPO/backend:latest
        command: ["sh", "-c", "cd backend && pnpm db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: NODE_ENV
          value: "$ENVIRONMENT"
      restartPolicy: Never
  backoffLimit: 3
EOF

# Wait for migration job
sleep 5
MIGRATION_JOB=$(kubectl get jobs -n $NAMESPACE --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
log "Waiting for migrations to complete (job: $MIGRATION_JOB)..."
kubectl wait --for=condition=complete job/$MIGRATION_JOB -n $NAMESPACE --timeout=300s || {
    error "Database migrations failed"
    kubectl logs job/$MIGRATION_JOB -n $NAMESPACE
    exit 1
}
success "Database migrations completed"

# Step 6: Deploy application
log "Deploying backend..."
kubectl apply -f k8s/backend-deployment.yaml
kubectl wait --for=condition=available deployment/backend -n $NAMESPACE --timeout=300s
success "Backend deployed"

log "Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yaml
kubectl wait --for=condition=available deployment/frontend -n $NAMESPACE --timeout=180s
success "Frontend deployed"

# Step 7: Deploy ingress (if exists)
if [ -f "k8s/ingress.yaml" ]; then
    log "Deploying ingress..."

    # Deploy cert-manager issuer if exists
    if [ -f "k8s/cert-manager-issuer.yaml" ]; then
        kubectl apply -f k8s/cert-manager-issuer.yaml
        sleep 2
    fi

    kubectl apply -f k8s/ingress.yaml
    success "Ingress deployed"
fi

# Step 8: Display deployment info
echo ""
success "========================================="
success "Deployment Complete!"
success "========================================="
echo ""

log "Checking deployment status..."
kubectl get all -n $NAMESPACE

echo ""
log "Service endpoints:"
kubectl get svc -n $NAMESPACE

echo ""
log "Ingress configuration:"
kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress configured"

echo ""
log "Pod status:"
kubectl get pods -n $NAMESPACE

echo ""
success "========================================="
success "Next Steps:"
success "========================================="
echo "1. Check pod logs: kubectl logs -f deployment/backend -n $NAMESPACE"
echo "2. Access application via ingress domain (if configured)"
echo "3. Set up monitoring: kubectl port-forward -n $NAMESPACE svc/backend-service 3001:3001"
echo "4. Test health: curl http://localhost:3001/api/health"
echo ""

exit 0
