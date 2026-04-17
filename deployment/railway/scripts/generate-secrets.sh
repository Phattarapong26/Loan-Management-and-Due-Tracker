#!/bin/bash

# Generate Production Secrets Script
# Creates secure random secrets for Railway deployment

echo "🔐 Generating Production Secrets"
echo "================================="
echo ""
echo "⚠️  IMPORTANT: Save these values securely!"
echo "⚠️  Never commit these to Git!"
echo ""
echo "Copy these to Railway Dashboard > Backend Service > Variables:"
echo ""
echo "---"

echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""

echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""

echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""

echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo ""

echo "---"
echo ""
echo "✅ Secrets generated successfully!"
echo ""
echo "Next steps:"
echo "  1. Copy these values to Railway Dashboard"
echo "  2. Add other required variables (LINE_OA_ID, etc.)"
echo "  3. Deploy: ./railway-deploy.sh"
echo ""
echo "⚠️  Clear your terminal history after copying!"
