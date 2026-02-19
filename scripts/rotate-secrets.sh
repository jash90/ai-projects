#!/bin/bash
set -e

# ============================================
# Kubernetes Secret Rotation Script
# ============================================
#
# Rotates secrets in Kubernetes with zero downtime
#
# Usage:
#   ./rotate-secrets.sh <secret-name> <secret-key> [namespace]
#
# Examples:
#   ./rotate-secrets.sh jwt-secret secret
#   ./rotate-secrets.sh api-keys openai-api-key
#   ./rotate-secrets.sh database-secret url claude-projects
#
# ============================================

SECRET_NAME=$1
SECRET_KEY=$2
NAMESPACE="${3:-claude-projects}"

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

# Validate arguments
if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_KEY" ]; then
    error "Usage: $0 <secret-name> <secret-key> [namespace]"
    echo ""
    echo "Examples:"
    echo "  $0 jwt-secret secret"
    echo "  $0 api-keys openai-api-key"
    echo "  $0 database-secret url claude-projects"
    exit 1
fi

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl."
    exit 1
fi

# Check secret exists
if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &> /dev/null; then
    error "Secret '$SECRET_NAME' not found in namespace '$NAMESPACE'"
    exit 1
fi

# Display current info
echo ""
log "========================================="
log "Secret Rotation"
log "========================================="
log "Secret Name: $SECRET_NAME"
log "Secret Key: $SECRET_KEY"
log "Namespace: $NAMESPACE"
log "========================================="
echo ""

# Get current value (for backup)
CURRENT_VALUE=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath="{.data.$SECRET_KEY}" 2>/dev/null || echo "")

if [ -z "$CURRENT_VALUE" ]; then
    error "Key '$SECRET_KEY' not found in secret '$SECRET_NAME'"
    exit 1
fi

# Backup current value
BACKUP_FILE="/tmp/${SECRET_NAME}_${SECRET_KEY}_backup_$(date +%Y%m%d_%H%M%S).txt"
echo "$CURRENT_VALUE" > "$BACKUP_FILE"
success "Current value backed up to: $BACKUP_FILE"

# Generate new value based on secret type
log "Generating new secret value..."

if [[ "$SECRET_KEY" == *"password"* ]] || [[ "$SECRET_KEY" == "secret"* ]]; then
    # Generate strong random password/secret
    NEW_VALUE=$(openssl rand -base64 32)
    success "Generated new random value"
elif [[ "$SECRET_KEY" == *"api-key"* ]]; then
    warning "API keys must be generated in provider dashboard"
    echo "Please:"
    echo "1. Log into provider dashboard (OpenAI, Anthropic, etc.)"
    echo "2. Create new API key"
    echo "3. Enter the new key below"
    echo ""
    read -p "Enter new API key: " NEW_VALUE
else
    warning "Unknown secret type. Please provide new value."
    read -p "Enter new value for $SECRET_KEY: " NEW_VALUE
fi

# Confirm rotation
echo ""
warning "⚠️  This will rotate the secret and restart affected pods"
warning "⚠️  Current value is backed up to: $BACKUP_FILE"
echo ""
read -p "Continue with rotation? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rotation cancelled."
    exit 0
fi

# Encode new value
NEW_VALUE_B64=$(echo -n "$NEW_VALUE" | base64)

# Update secret
log "Updating secret..."
kubectl patch secret "$SECRET_NAME" -n "$NAMESPACE" \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/'$SECRET_KEY'", "value":"'$NEW_VALUE_B64'"}]'

success "Secret updated successfully"

# Restart affected deployments
log "Restarting deployments to pick up new secret..."

# Determine which deployments to restart based on secret name
DEPLOYMENTS=""
case "$SECRET_NAME" in
    jwt-secret|database-secret|redis-secret|api-keys)
        DEPLOYMENTS="backend"
        ;;
    *)
        log "Checking all deployments for secret usage..."
        DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" -o json | \
            jq -r '.items[] | select(.spec.template.spec.containers[].env[]?.valueFrom.secretKeyRef.name == "'$SECRET_NAME'") | .metadata.name')
        ;;
esac

if [ -z "$DEPLOYMENTS" ]; then
    warning "No deployments found using secret '$SECRET_NAME'"
    warning "You may need to manually restart affected services"
else
    for DEPLOYMENT in $DEPLOYMENTS; do
        log "Restarting deployment: $DEPLOYMENT"
        kubectl rollout restart deployment/"$DEPLOYMENT" -n "$NAMESPACE"

        # Wait for rollout to complete
        log "Waiting for $DEPLOYMENT rollout to complete..."
        kubectl rollout status deployment/"$DEPLOYMENT" -n "$NAMESPACE" --timeout=5m

        success "$DEPLOYMENT restarted successfully"
    done
fi

# Verify health
echo ""
log "Verifying application health..."
sleep 10  # Wait for health checks

HEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=backend --field-selector=status.phase=Running -o json | jq '.items | length')
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o json | jq '.items | length')

if [ "$HEALTHY_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    success "All backend pods healthy ($HEALTHY_PODS/$TOTAL_PODS)"
else
    warning "Some pods may not be healthy ($HEALTHY_PODS/$TOTAL_PODS)"
    warning "Check pod status: kubectl get pods -n $NAMESPACE"
fi

# Summary
echo ""
success "========================================="
success "Rotation Complete!"
success "========================================="
log "Secret: $SECRET_NAME/$SECRET_KEY"
log "Namespace: $NAMESPACE"
log "Backup: $BACKUP_FILE"
log "Deployments restarted: $DEPLOYMENTS"
success "========================================="
echo ""
warning "NEXT STEPS:"
echo "1. Monitor application for 24 hours"
echo "2. Verify functionality in production"
echo "3. Revoke old key in provider dashboard (if applicable)"
echo "4. Delete backup file after 7 days: rm $BACKUP_FILE"
echo "5. Schedule next rotation in 90 days"
echo ""

exit 0
