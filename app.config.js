// SPDX-License-Identifier: MPL-2.0
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.TACTIROOK_WEB_BASE_URL ?? '',
  },
})
