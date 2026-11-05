const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const zh = require('../../data/sideload/zh.json')
const en = require('../../data/sideload/en.json')

jest.mock('../core/system', () => ({}))

describe('initial setup language', () => {
  let server

  beforeEach(() => {
    server = { listen: jest.fn(), on: jest.fn(), close: jest.fn() }
    jest.spyOn(http, 'createServer').mockReturnValue(server)
    jest.spyOn(fs, 'ensureDir').mockResolvedValue()
    jest.spyOn(fs, 'emptyDir').mockResolvedValue()

    const localeQuery = {
      where: jest.fn().mockReturnValue({ del: jest.fn().mockResolvedValue() }),
      insert: jest.fn().mockResolvedValue()
    }
    const navigationQuery = {
      truncate: jest.fn().mockResolvedValue(),
      insert: jest.fn().mockResolvedValue()
    }
    const groupsQuery = {
      truncate: jest.fn().mockResolvedValue(),
      insert: jest.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
    }
    const makeUser = id => ({
      id,
      $relatedQuery: jest.fn().mockReturnValue({ relate: jest.fn().mockResolvedValue() })
    })
    const usersQuery = {
      truncate: jest.fn().mockResolvedValue(),
      insert: jest.fn()
        .mockResolvedValueOnce(makeUser(1))
        .mockResolvedValueOnce(makeUser(2))
    }
    const moduleModel = () => ({
      refreshEditorsFromDisk: jest.fn().mockResolvedValue(),
      refreshLoggersFromDisk: jest.fn().mockResolvedValue(),
      refreshRenderersFromDisk: jest.fn().mockResolvedValue(),
      refreshSearchEnginesFromDisk: jest.fn().mockResolvedValue(),
      refreshTargetsFromDisk: jest.fn().mockResolvedValue(),
      query: jest.fn().mockReturnValue({
        patch: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue() })
      })
    })
    global.WIKI = {
      ROOTPATH: path.resolve(__dirname, '../..'),
      SERVERPATH: path.resolve(__dirname, '..'),
      config: { db: { type: 'sqlite' }, dataPath: 'data', port: 3000, bindIP: '127.0.0.1' },
      data: {},
      logger: { info: jest.fn(), error: jest.fn() },
      configSvc: { saveToDb: jest.fn().mockResolvedValue(true) },
      kernel: { initTelemetry: jest.fn(), bootMaster: jest.fn() },
      telemetry: { sendError: jest.fn(), sendInstanceEvent: jest.fn() },
      models: {
        locales: { query: jest.fn().mockReturnValue(localeQuery) },
        navigation: { query: jest.fn().mockReturnValue(navigationQuery) },
        groups: { query: jest.fn().mockReturnValue(groupsQuery) },
        users: { query: jest.fn().mockReturnValue(usersQuery) },
        authentication: { query: jest.fn().mockReturnValue({ insert: jest.fn().mockResolvedValue() }) },
        editors: moduleModel(),
        loggers: moduleModel(),
        renderers: moduleModel(),
        searchEngines: moduleModel(),
        storage: moduleModel()
      }
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete global.WIKI
  })

  it('initializes Chinese defaults and an English fallback language pack', async () => {
    require('../setup')()
    const app = http.createServer.mock.calls[0][0]
    const finalize = app._router.stack.find(layer => layer.route && layer.route.path === '/finalize').route.stack[0].handle
    const res = { json: jest.fn().mockReturnValue({ end: jest.fn() }) }

    await finalize({
      body: { siteUrl: 'https://example.com', adminEmail: 'admin@example.com', adminPassword: 'password', telemetry: false }
    }, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
    expect(global.WIKI.config.lang.code).toBe('zh')
    const locales = global.WIKI.models.locales.query().insert.mock.calls.map(([locale]) => locale)
    expect(locales.map(locale => locale.code)).toEqual(['en', 'zh'])
    expect(locales[0].strings.auth.actions.login).toBe(en['auth:actions.login'])
    expect(locales[1].strings.auth.actions.login).toBe(zh['auth:actions.login'])
    expect(global.WIKI.models.users.query().insert.mock.calls.map(([user]) => user.locale)).toEqual(['zh', 'zh'])
    expect(global.WIKI.models.navigation.query().insert).toHaveBeenCalledWith(expect.objectContaining({
      config: [expect.objectContaining({ locale: 'zh', items: [expect.objectContaining({ label: zh['common:header.home'] })] })]
    }))
  })
})
