#!/bin/bash
# CRPF System - Emergency Rollback Script
# Use this if deployment fails

echo "🚨 EMERGENCY ROLLBACK 🚨"
echo "========================"
echo ""
echo "This will restore your working code before deployment."
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
    echo "Rolling back..."
    git checkout deployment-backup
    git tag v1.0-rollback-$(date +%Y%m%d-%H%M%S)
    echo "✅ Rolled back to working state"
    echo "✅ Current state tagged for reference"
else
    echo "Rollback cancelled"
fi
