import type { TSESLint } from '@typescript-eslint/utils'
import { noFloatingOutcome } from './rules/no-floating-outcome'

const plugin = {
  meta: { name: 'eslint-plugin-rustify', version: '0.1.0-alpha.0' },
  rules: { 'no-floating-outcome': noFloatingOutcome },
  configs: {} as { recommended: TSESLint.FlatConfig.Config },
}

plugin.configs.recommended = {
  name: 'rustify/recommended',
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  plugins: { rustify: plugin },
  rules: { 'rustify/no-floating-outcome': 'error' },
}

export default plugin
