import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import customRules from './.eslint/index.js';

export default [
  {
    ignores: [
      // Ignore auto-generated Astro files
      'src/website/.astro/**/*',
      'src/website/src/env.d.ts',
      // Other typical ignores
      'node_modules/**',
      'dist/**',
      '.github/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        // node globals
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        // Bun globals
        Bun: 'readonly',
        // Web API globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        RequestInit: 'readonly',
        Headers: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        ReadableStream: 'readonly',
        BufferSource: 'readonly',
        Event: 'readonly',
        EventListenerOrEventListenerObject: 'readonly',
        global: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'import': importPlugin,
      'unused-imports': unusedImportsPlugin,
      'custom': customRules,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Replace TypeScript no-unused-vars with unused-imports version for better code cleanup
      '@typescript-eslint/no-unused-vars': 'off', // turned off in favor of unused-imports/no-unused-vars
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', { 
        'vars': 'all',
        'args': 'after-used',
        'argsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { 'prefer': 'type-imports' }],
      
      // Bug prevention
      'no-var': 'error',
      'prefer-const': 'error',
      // Import Rules - Start with just import ordering to fix first
      // Sort imports
      'sort-imports': ['error', {
        'ignoreCase': true,
        'ignoreDeclarationSort': true, // don't want to sort import lines, use eslint-plugin-import instead
        'ignoreMemberSort': false,
        'memberSyntaxSortOrder': ['none', 'all', 'multiple', 'single'],
        'allowSeparatedGroups': true
      }],
      
      // Import sorting
      'import/order': ['error', {
        'groups': [
          'builtin',    // Node.js built-in modules
          'external',   // npm packages
          'internal',   // Aliased paths (e.g. @/)
          'parent',     // Imports from parent directories
          'sibling',    // Imports from sibling files
          'index'       // imports from ./index files
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        },
        'pathGroups': [
          // Internal alias patterns
          {
            'pattern': '@/**',
            'group': 'internal'
          },
          {
            'pattern': '@test/**',
            'group': 'internal'
          },
          {
            'pattern': '@models/**',
            'group': 'internal'
          },
          {
            'pattern': '@utils/**',
            'group': 'internal'
          },
          {
            'pattern': '@commands/**',
            'group': 'internal'
          },
          {
            'pattern': '@mcp/**', 
            'group': 'internal'
          },
          {
            'pattern': '@interfaces/**',
            'group': 'internal'
          },
          {
            'pattern': '@db/**',
            'group': 'internal'
          },
          {
            'pattern': '@importers/**',
            'group': 'internal'
          }
        ]
      }],
      'import/no-unresolved': ['error', { ignore: ['^bun:', '^astro:'] }],
      'import/first': 'error',
      
      // Custom rules
      'custom/enforce-singleton-pattern': 'error',
    },
  },
];
