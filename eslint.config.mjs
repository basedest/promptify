import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    eslintConfigPrettier,
    {
        plugins: {
            prettier,
        },
        rules: {
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
            ],
            'react/display-name': 'off',
        },
    },
    // FSD layer boundaries: shared cannot import from higher layers
    {
        files: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['~/entities/*', '~/features/*', '~/widgets/*', '~/views/*'],
                            message: 'shared cannot import from entities, features, widgets, or views',
                        },
                    ],
                },
            ],
        },
    },
    // entities cannot import from features, widgets, pages
    {
        files: ['src/entities/**/*.ts', 'src/entities/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['~/features/*', '~/widgets/*', '~/views/*'],
                            message: 'entities cannot import from features, widgets, or views',
                        },
                    ],
                },
            ],
        },
    },
    // features cannot import from widgets, pages
    {
        files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['~/widgets/*', '~/views/*'],
                            message: 'features cannot import from widgets or views',
                        },
                    ],
                },
            ],
        },
    },
    // widgets cannot import from pages
    {
        files: ['src/widgets/**/*.ts', 'src/widgets/**/*.tsx'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [{ group: ['~/views/*'], message: 'widgets cannot import from views' }],
                },
            ],
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        // Generated Prisma client (do not edit)
        'src/generated/**',
    ]),
]);

export default eslintConfig;
