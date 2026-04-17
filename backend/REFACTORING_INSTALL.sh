#!/bin/bash

# Pragmatic Refactoring Installation Script
# Run this to complete the refactoring setup

echo "🔧 Installing Prometheus Client..."
npm install prom-client

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Register metrics route in src/routes/index.ts"
echo "2. Add this line: await app.register(metricsRoutes);"
echo "3. Import: import { metricsRoutes } from './metrics.routes';"
echo "4. Run: npm run build"
echo "5. Test: curl http://localhost:3000/metrics"
echo ""
echo "📚 See docs/PRAGMATIC_REFACTORING_COMPLETE.md for full details"
