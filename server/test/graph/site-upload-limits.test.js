/* eslint-env jest */

const site = require('../../graph/resolvers/site')

describe('site upload limit validation', () => {
  let config

  beforeEach(() => {
    config = {
      host: '',
      title: '',
      company: '',
      contentLicense: '',
      footerOverride: '',
      logoUrl: '',
      pageExtensions: [],
      seo: {
        description: '',
        robots: [],
        analyticsService: '',
        analyticsId: ''
      },
      auth: {
        autoLogin: false,
        enforce2FA: false,
        hideLocal: false,
        loginBgUrl: '',
        audience: '',
        tokenExpiration: '',
        tokenRenewal: ''
      },
      editShortcuts: {},
      features: {},
      security: {
        securityTrustProxy: false
      },
      uploads: {
        maxFileSize: 10485760,
        maxFiles: 10
      },
      configSvc: {
        saveToDb: jest.fn().mockResolvedValue()
      }
    }
    global.WIKI = {
      config,
      configSvc: config.configSvc,
      app: {
        enable: jest.fn(),
        disable: jest.fn()
      }
    }
  })

  afterEach(() => {
    delete global.WIKI
  })

  it.each([
    ['uploadMaxFileSize', 0],
    ['uploadMaxFileSize', -1],
    ['uploadMaxFiles', 0],
    ['uploadMaxFiles', -1],
    ['uploadMaxFiles', 1.5]
  ])('rejects invalid %s value %p without saving', async (field, value) => {
    const result = await site.SiteMutation.updateConfig(null, { [field]: value })

    expect(result.responseResult.succeeded).toBe(false)
    expect(config.configSvc.saveToDb).not.toHaveBeenCalled()
    expect(config.uploads).toEqual({
      maxFileSize: 10485760,
      maxFiles: 10
    })
  })

  it('accepts positive upload limits', async () => {
    const result = await site.SiteMutation.updateConfig(null, {
      uploadMaxFileSize: 20971520,
      uploadMaxFiles: 20
    })

    expect(result.responseResult.succeeded).toBe(true)
    expect(config.uploads).toMatchObject({
      maxFileSize: 20971520,
      maxFiles: 20
    })
    expect(config.configSvc.saveToDb).toHaveBeenCalledWith(expect.arrayContaining(['uploads']))
  })
})
