const { buildSchema, graphql } = require('graphql')

describe('core/localization', () => {
  let localization
  let findOne

  beforeEach(() => {
    jest.resetModules()
    const locales = {
      zh: { strings: { common: { greeting: 'Chinese' }, auth: { login: 'Login' }, admin: { title: 'Admin' } } },
      en: { strings: { common: { greeting: 'English' }, auth: { login: 'Login' }, admin: { title: 'Admin' } } },
      fr: { strings: { common: { greeting: 'French' } } }
    }
    findOne = jest.fn(async (field, code) => locales[code])
    global.WIKI = {
      data: { localeNamespaces: ['common', 'auth', 'admin'] },
      config: { lang: { code: 'zh', namespacing: false, namespaces: [] } },
      models: { locales: { query: () => ({ findOne }) } },
      IS_DEBUG: false
    }
    localization = require('../../core/localization')
  })

  afterEach(() => {
    delete global.WIKI
  })

  it('loads the current language and English fallback before initialization completes', async () => {
    await localization.init()

    for (const namespace of ['common', 'auth', 'admin']) {
      await expect(localization.getByNamespace('zh', namespace)).resolves.not.toHaveLength(0)
      await expect(localization.getByNamespace('en', namespace)).resolves.not.toHaveLength(0)
    }
    await expect(localization.getByNamespace('invalid', 'common')).rejects.toThrow('Invalid locale or namespace')
  })

  it('waits for fallback resources to load', async () => {
    let resolveEnglish
    findOne.mockImplementation((field, code) => {
      if (code === 'en') {
        return new Promise(resolve => { resolveEnglish = resolve })
      }
      return Promise.resolve({ strings: { common: { greeting: 'Chinese' } } })
    })

    let initialized = false
    const initialization = localization.init().then(() => { initialized = true })
    await new Promise(resolve => setImmediate(resolve))
    expect(initialized).toBe(false)
    resolveEnglish({ strings: { common: { greeting: 'English' } } })
    await initialization
    await expect(localization.getByNamespace('en', 'common')).resolves.toEqual([{ key: 'greeting', value: 'English' }])
  })

  it('loads each enabled locale once', async () => {
    global.WIKI.config.lang.namespacing = true
    global.WIKI.config.lang.namespaces = ['zh', 'en', 'fr']
    await localization.init()
    expect(findOne.mock.calls.map(call => call[1])).toEqual(['zh', 'en', 'fr'])
  })

  it('does not load English twice when it is the current language', async () => {
    global.WIKI.config.lang.code = 'en'
    await localization.init()
    expect(findOne.mock.calls.map(call => call[1])).toEqual(['en'])
  })

  it('omits null array entries while preserving valid translations', async () => {
    findOne.mockImplementation(async (field, code) => {
      if (code === 'zh') {
        return {
          strings: {
            admin: {
              versions: [null, null, null, null, null, null, null, { x: '7.x' }, { x: '8.x' }],
              empty: '',
              number: 0,
              enabled: false,
              missing: null,
              emptyObject: {},
              emptyArray: []
            }
          }
        }
      }
      return { strings: { admin: {} } }
    })
    await localization.init()

    const entries = await localization.getByNamespace('zh', 'admin')
    expect(entries).toEqual(expect.arrayContaining([
      { key: 'versions[7].x', value: '7.x' },
      { key: 'versions[8].x', value: '8.x' },
      { key: 'empty', value: '' },
      { key: 'number', value: 0 },
      { key: 'enabled', value: false }
    ]))
    expect(entries.every(entry => entry.value !== null && typeof entry.value !== 'object')).toBe(true)
  })

  it('returns valid non-null GraphQL translation values for sparse arrays', async () => {
    findOne.mockResolvedValue({
      strings: { admin: { versions: [null, null, null, null, null, null, null, { x: '7.x' }, { x: '8.x' }] } }
    })
    await localization.init()
    const schema = buildSchema('type Translation { key: String!, value: String! } type Query { translations: [Translation!]! }')

    const result = await graphql({
      schema,
      source: '{ translations { key value } }',
      rootValue: { translations: () => localization.getByNamespace('zh', 'admin') }
    })

    expect(result.errors).toBeUndefined()
    expect(result.data.translations).toEqual([
      { key: 'versions[7].x', value: '7.x' },
      { key: 'versions[8].x', value: '8.x' }
    ])
  })
})
