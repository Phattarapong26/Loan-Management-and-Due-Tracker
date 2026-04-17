#!/bin/bash

# Test Railway Setup Script
# Verifies that all files are in place and scripts are executable

echo "🧪 Testing Railway Setup"
echo "========================"
echo ""

ERRORS=0

# Check configuration files
echo "📋 Checking configuration files..."
FILES=(
    "railway.toml"
    "nixpacks.toml"
    "Procfile"
    ".railwayignore"
    ".env.railway.example"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check scripts
echo "🛠️  Checking scripts..."
SCRIPTS=(
    "railway-deploy.sh"
    "railway-setup-db.sh"
    "railway-db-push.sh"
    "railway-migrate.sh"
    "railway-seed.sh"
    "railway-env-setup.sh"
    "railway-update-urls.sh"
    "railway-health-check.sh"
    "generate-secrets.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "  ✅ $script (executable)"
        else
            echo "  ⚠️  $script (not executable)"
            chmod +x "$script"
            echo "     → Fixed: made executable"
        fi
    else
        echo "  ❌ $script (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check documentation
echo "📚 Checking documentation..."
DOCS=(
    "START_HERE.md"
    "QUICK_START.md"
    "RAILWAY_DEPLOYMENT.md"
    "DEPLOYMENT_CHECKLIST.md"
    "GENERATE_SECRETS.md"
    "RAILWAY_SCRIPTS.md"
    "README_RAILWAY.md"
    "RAILWAY_SUMMARY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✅ $doc"
    else
        echo "  ❌ $doc (missing)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check backend files
echo "🔧 Checking backend configuration..."
if [ -f "backend/package.json" ]; then
    if grep -q "postinstall" "backend/package.json"; then
        echo "  ✅ package.json has postinstall script"
    else
        echo "  ⚠️  package.json missing postinstall script"
    fi
    
    if grep -q "prisma generate" "backend/package.json"; then
        echo "  ✅ package.json has prisma generate in build"
    else
        echo "  ⚠️  package.json missing prisma generate in build"
    fi
else
    echo "  ❌ backend/package.json (missing)"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Summary
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "🚀 Ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "  1. Read START_HERE.md"
    echo "  2. Follow QUICK_START.md"
    echo "  3. Deploy to Railway"
    exit 0
else
    echo "❌ Found $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
