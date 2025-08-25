
module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
    },
    globals: {
        firebase: 'readonly',
    },
    rules: {
        'no-unused-vars': 'warn',
        'semi': ['error', 'never'],
        'quotes': ['error', 'single'],
    },
};
