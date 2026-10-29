// SPDX-License-Identifier: MPL-2.0
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.assetExts.push('puzzles')
module.exports = config
