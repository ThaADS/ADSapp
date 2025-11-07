import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // 🔧 Relax rules for legacy code during migration
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      // Note: ban-types rule removed - not available in current @typescript-eslint version
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'prefer-const': 'warn',
      'react/jsx-no-undef': 'warn',
    },
  },
]

export default eslintConfig
