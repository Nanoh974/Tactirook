// SPDX-License-Identifier: MPL-2.0
const { afterEach, describe, expect, it } = require('@jest/globals')
const configureApp = require('./app.config')

describe('Expo base URL configuration', () => {
  const originalBaseUrl = process.env.TACTIROOK_WEB_BASE_URL

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.TACTIROOK_WEB_BASE_URL
    } else {
      process.env.TACTIROOK_WEB_BASE_URL = originalBaseUrl
    }
  })

  it('defaults to an empty base URL for native builds', () => {
    delete process.env.TACTIROOK_WEB_BASE_URL
    expect(configureApp({ config: { experiments: { typedRoutes: true } } }).experiments)
      .toEqual({ typedRoutes: true, baseUrl: '' })
  })

  it('uses the configured base URL for the hosted web export', () => {
    process.env.TACTIROOK_WEB_BASE_URL = '/Tactirook'
    expect(configureApp({ config: {} }).experiments.baseUrl).toBe('/Tactirook')
  })
})
