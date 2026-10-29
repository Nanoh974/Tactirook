// SPDX-License-Identifier: MPL-2.0
const { defineConfig, globalIgnores } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  globalIgnores(['dist/**', '.cache/**', 'src/pieceXml.ts', 'src/puzzleAssets.ts']),
  expoConfig,
  { files: ['scripts/*.cjs'], languageOptions: { globals: { __dirname: 'readonly' } } },
])
