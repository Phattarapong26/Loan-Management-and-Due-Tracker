#!/bin/bash

# Script to update imports across the codebase after restructuring

cd /Users/medlab/Desktop/SMEBank2026/backend/src

echo "Updating imports in core/config files..."

# Fix line-credentials.config.ts
sed -i '' "s|from './env'|from './env.config'|g" core/config/line-credentials.config.ts
sed -i '' "s|from '../utils/logger.util'|from '@utils/common/logger.util'|g" core/config/line-credentials.config.ts

# Fix redis.config.ts
sed -i '' "s|from './env'|from './env.config'|g" core/config/redis.config.ts
sed -i '' "s|from '../utils/logger.util'|from '@utils/common/logger.util'|g" core/config/redis.config.ts

echo "Updating imports in core/middleware files..."

# branch.middleware.ts
sed -i '' "s|from '@utils/response.util'|from '@utils/formatting/response.util'|g" core/middleware/common/branch.middleware.ts

# timezone.middleware.ts
sed -i '' "s|from '@utils/timezone.util'|from '@utils/formatting/timezone.util'|g" core/middleware/common/timezone.middleware.ts
sed -i '' "s|from '@utils/logger.util'|from '@utils/common/logger.util'|g" core/middleware/common/timezone.middleware.ts

# audit.middleware.ts
sed -i '' "s|from '@config/database'|from '@config/database.config'|g" core/middleware/logging/audit.middleware.ts

echo "Updating imports in all TypeScript files..."

# Update common import patterns across all .ts files
find . -name "*.ts" -type f | while read file; do
    # Config imports
    sed -i '' "s|from '@config/env'|from '@config/env.config'|g" "$file"
    sed -i '' "s|from '@config/database'|from '@config/database.config'|g" "$file"
    sed -i '' "s|from '@config/redis'|from '@config/redis.config'|g" "$file"
    sed -i '' "s|from '@config/line-credentials-validator'|from '@config/line-credentials.config'|g" "$file"
    
    # Utils imports
    sed -i '' "s|from '@utils/logger.util'|from '@utils/common/logger.util'|g" "$file"
    sed -i '' "s|from '@utils/queue.util'|from '@utils/common/queue.util'|g" "$file"
    sed -i '' "s|from '@utils/rate-limiter.util'|from '@utils/common/rate-limiter.util'|g" "$file"
    sed -i '' "s|from '@utils/response.util'|from '@utils/formatting/response.util'|g" "$file"
    sed -i '' "s|from '@utils/timezone.util'|from '@utils/formatting/timezone.util'|g" "$file"
    sed -i '' "s|from '@utils/validation.util'|from '@utils/formatting/validation.util'|g" "$file"
    sed -i '' "s|from '@utils/calculation.util'|from '@utils/calculation/calculation.util'|g" "$file"
    sed -i '' "s|from '@utils/reference-generator.util'|from '@utils/calculation/reference-generator.util'|g" "$file"
    sed -i '' "s|from '@utils/encryption.util'|from '@utils/security/encryption.util'|g" "$file"
    sed -i '' "s|from '@utils/jwt.util'|from '@utils/security/jwt.util'|g" "$file"
    sed -i '' "s|from '@utils/sql-security.util'|from '@utils/security/sql-security.util'|g" "$file"
    sed -i '' "s|from '@utils/security.util'|from '@utils/security/security.util'|g" "$file"
    
    # Middleware imports
    sed -i '' "s|from '@middlewares/auth.middleware'|from '@middlewares/security/auth.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/permission.middleware'|from '@middlewares/security/permission.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/sanitize.middleware'|from '@middlewares/security/sanitize.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/validate.middleware'|from '@middlewares/validation/validate.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/audit.middleware'|from '@middlewares/logging/audit.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/error.middleware'|from '@middlewares/logging/error.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/branch.middleware'|from '@middlewares/common/branch.middleware'|g" "$file"
    sed -i '' "s|from '@middlewares/timezone.middleware'|from '@middlewares/common/timezone.middleware'|g" "$file"
    
    # Fix relative imports issues in tests
    sed -i '' "s|from '../../../services/|from '@modules/|g" "$file"
    sed -i '' "s|from '../../../repositories/|from '@modules/|g" "$file"
    sed -i '' "s|from '../../../utils/|from '@core/utils/|g" "$file"
    sed -i '' "s|from '../../../config/|from '@core/config/|g" "$file"
    
    # Specific test file fixes
    sed -i '' "s|from '@modules/auth.service'|from '@auth/services/auth.service'|g" "$file"
    sed -i '' "s|from '@modules/user.repository'|from '@users/repositories/user.repository'|g" "$file"
    sed -i '' "s|from '@modules/session.repository'|from '@line/repositories/session.repository'|g" "$file"
    sed -i '' "s|from '@core/utils/encryption.util'|from '@utils/security/encryption.util'|g" "$file"
    sed -i '' "s|from '@core/utils/jwt.util'|from '@utils/security/jwt.util'|g" "$file"
    sed -i '' "s|from '@modules/principal-calculator.service'|from '@loans/calculators/principal-calculator.service'|g" "$file"
    sed -i '' "s|from '@modules/next-payment-invoice.service'|from '@invoices/services/next-payment-invoice.service'|g" "$file"
    sed -i '' "s|from '@modules/tiered-interest-calculator.service'|from '@loans/calculators/tiered-interest-calculator.service'|g" "$file"
    sed -i '' "s|from '@modules/payment-receipt.service'|from '@invoices/services/payment-receipt.service'|g" "$file"
    sed -i '' "s|from '@modules/reference-number.service'|from '@invoices/services/reference-number.service'|g" "$file"
    sed -i '' "s|from '@core/config/database'|from '@config/database.config'|g" "$file"
    
    # Fix job imports
    sed -i '' "s|from '../utils/logger.util'|from '@utils/common/logger.util'|g" "$file"
    sed -i '' "s|from '../services/payment-timeline.service'|from '@payments/services/payment-timeline.service'|g" "$file"
done

echo "Done updating imports!"
