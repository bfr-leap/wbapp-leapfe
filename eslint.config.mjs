import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
    rules: {
        // Start with warnings for existing code, upgrade to errors over time
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_' },
        ],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'vue/multi-word-component-names': 'off',
    },
});
