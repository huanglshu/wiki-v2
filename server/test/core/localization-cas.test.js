/* eslint-env jest */

const i18next = require('i18next')
const localization = require('../../core/localization')

describe('CAS bundled localization', () => {
  afterEach(() => {
    delete global.WIKI
  })

  it('adds bundled Chinese CAS labels to an existing locale without replacing unrelated translations', async () => {
    const engine = i18next.createInstance()
    await engine.init({ lng: 'zh', ns: ['admin'], defaultNS: 'admin', initImmediate: false })
    localization.engine = engine
    localization.namespaces = []
    global.WIKI = {
      IS_DEBUG: false,
      models: {
        locales: {
          query: () => ({
            findOne: jest.fn().mockResolvedValue({ strings: { admin: { custom: 'Existing' } } })
          })
        }
      }
    }

    await localization.loadLocale('zh')
    expect(engine.t('modules.authentication.cas.props.casurl.title')).toBe('CAS 服务器地址')
    expect(engine.t('custom')).toBe('Existing')
    const entries = await localization.getByNamespace('zh', 'admin')
    expect(entries).toEqual(expect.arrayContaining([
      { key: 'modules.authentication.cas.props.casurl.title', value: 'CAS 服务器地址' }
    ]))
  })
})
