module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    // Allow any type in specific cases where it's necessary
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Allow unused variables with underscore prefix
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    
    // Allow control characters in regex (for sanitization)
    'no-control-regex': 'off',
    
    // Allow misleading character class (for emoji patterns)
    'no-misleading-character-class': 'off',
    
    // Allow useless escape (for regex patterns)
    'no-useless-escape': 'off',
    
    // Allow lexical declarations in case blocks
    'no-case-declarations': 'off',
    
    // Prefer const over let when possible
    'prefer-const': 'error',
  },
  env: {
    node: true,
    es2020: true,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.cjs',
    'prisma/generated/',
  ],
};