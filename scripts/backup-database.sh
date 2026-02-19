#!/bin/bash
set -e

# ============================================
# Database Backup Script
# ============================================
#
# This script creates compressed backups of the PostgreSQL database
# and optionally uploads them to AWS S3 for off-site storage.
#
# Usage:
#   ./backup-database.sh
#
# Environment Variables:
#   DATABASE_URL      - PostgreSQL connection string (required)
#   BACKUP_DIR        - Backup directory (default: /backups/postgres)
#   RETENTION_DAYS    - Number of days to keep backups (default: 30)
#   AWS_S3_BUCKET     - S3 bucket for remote backup (optional)
#   SLACK_WEBHOOK_URL - Slack webhook for notifications (optional)
#
# Cron Setup:
#   0 2 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1
#
# ============================================

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/claude_projects_$TIMESTAMP.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
log "Backup directory: $BACKUP_DIR"

# Start backup
log "Starting database backup..."
log "Target file: $BACKUP_FILE"

# Perform backup
if pg_dump "$DATABASE_URL" 2>/dev/null | gzip > "$BACKUP_FILE"; then
    success "Database backup created successfully"
else
    error "Database backup failed!"
    exit 1
fi

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Backup verified: $BACKUP_FILE"
    log "Backup size: $BACKUP_SIZE"
else
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Test backup integrity
log "Testing backup integrity..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    success "Backup integrity verified"
else
    error "Backup integrity check failed!"
    exit 1
fi

# Remove old backups
log "Removing backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "claude_projects_*.sql.gz" -mtime +$RETENTION_DAYS -type f -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log "Deleted $DELETED_COUNT old backup(s)"
else
    log "No old backups to delete"
fi

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    log "Uploading backup to S3..."
    if aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/postgres/" 2>/dev/null; then
        success "Backup uploaded to S3: s3://$AWS_S3_BUCKET/backups/postgres/"
    else
        warning "S3 upload failed (continuing anyway)"
    fi
fi

# Send Slack notification (optional)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    log "Sending Slack notification..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Database backup completed: $BACKUP_SIZE ($TIMESTAMP)\"}" \
        2>/dev/null || warning "Slack notification failed"
fi

# Summary
echo ""
success "========================================="
success "Backup Summary"
success "========================================="
log "File: $BACKUP_FILE"
log "Size: $BACKUP_SIZE"
log "Retention: $RETENTION_DAYS days"
if [ ! -z "$AWS_S3_BUCKET" ]; then
    log "S3 Bucket: $AWS_S3_BUCKET"
fi
success "========================================="
echo ""

exit 0
