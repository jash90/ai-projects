#!/bin/bash
set -e

# ============================================
# Database Restore Script
# ============================================
#
# This script restores a PostgreSQL database from a backup file.
#
# Usage:
#   ./restore-database.sh <backup-file.sql.gz>
#
# Examples:
#   ./restore-database.sh /backups/postgres/claude_projects_20240114_020000.sql.gz
#   ./restore-database.sh latest  # Restores most recent backup
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection string (required)
#   BACKUP_DIR   - Backup directory (default: /backups/postgres)
#
# ============================================

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Check if backup file is specified
if [ -z "$1" ]; then
    error "Usage: $0 <backup-file.sql.gz> or $0 latest"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/claude_projects_*.sql.gz 2>/dev/null | tail -10 || echo "No backups found"
    exit 1
fi

# Resolve backup file
if [ "$1" = "latest" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/claude_projects_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        error "No backups found in $BACKUP_DIR"
        exit 1
    fi
    echo "Using latest backup: $BACKUP_FILE"
else
    BACKUP_FILE="$1"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Verify backup integrity
echo "Verifying backup integrity..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    success "Backup integrity verified"
else
    error "Backup file is corrupted!"
    exit 1
fi

# Get backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "========================================="
echo "Backup Information"
echo "========================================="
echo "File: $BACKUP_FILE"
echo "Size: $BACKUP_SIZE"
echo "Database: $DATABASE_URL"
echo "========================================="
echo ""

# Confirmation prompt
warning "⚠️  WARNING: This will OVERWRITE the current database!"
warning "⚠️  All existing data will be LOST!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Final confirmation required..."
read -p "Type the database name to confirm: " DB_NAME_CONFIRM

# Extract database name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ "$DB_NAME_CONFIRM" != "$DB_NAME" ]; then
    error "Database name mismatch. Restore cancelled."
    exit 1
fi

# Create backup of current database before restore
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo ""
echo "Creating safety backup of current database..."
if pg_dump "$DATABASE_URL" 2>/dev/null | gzip > "$SAFETY_BACKUP"; then
    success "Safety backup created: $SAFETY_BACKUP"
else
    warning "Could not create safety backup (continuing anyway)"
fi

# Perform restore
echo ""
echo "Restoring database from $BACKUP_FILE..."
echo "This may take several minutes..."

if gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" 2>/dev/null; then
    success "Database restored successfully!"
else
    error "Database restore failed!"
    if [ -f "$SAFETY_BACKUP" ]; then
        warning "You can restore the previous state using: $SAFETY_BACKUP"
    fi
    exit 1
fi

# Verify restore
echo ""
echo "Verifying restore..."
if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" 2>/dev/null >/dev/null; then
    success "Database is accessible and healthy"
else
    error "Database verification failed!"
    exit 1
fi

# Summary
echo ""
success "========================================="
success "Restore Complete"
success "========================================="
echo "Restored from: $BACKUP_FILE"
echo "Backup size: $BACKUP_SIZE"
if [ -f "$SAFETY_BACKUP" ]; then
    echo "Safety backup: $SAFETY_BACKUP"
fi
success "========================================="
echo ""

exit 0
