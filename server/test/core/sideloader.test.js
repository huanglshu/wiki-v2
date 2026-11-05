const path = require('path')

describe('core/sideloader', () => {
  const root = path.resolve(__dirname, '../../..')
  const configuredPath = path.join(root, 'data', 'sideload')
  const bundledPath = path.join(root, 'server', 'sideload')
  let sideloader
  let insert

  beforeEach(() => {
    jest.resetModules()
    const helper = require('../../helpers/bundled-locales')
    jest.spyOn(helper, 'getBundledLocaleDirectory').mockReturnValue(bundledPath)
    sideloader = require('../../core/sideloader')
    insert = jest.fn().mockResolvedValue()
    global.WIKI = {
      ROOTPATH: root,
      config: { offline: true, dataPath: 'data' },
      logger: { info: jest.fn(), warn: jest.fn() },
      models: {
        locales: {
          query: () => ({
            select: () => ({ where: () => ({ first: jest.fn().mockResolvedValue(null) }) }),
            insert
          })
        }
      }
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete global.WIKI
  })

  it.each([
    ['bundled locales when the data directory has no locale index', false, bundledPath],
    ['configured locales when a locale index is present', true, configuredPath]
  ])('imports %s', async (description, configuredExists, expectedPath) => {
    const currentFs = require('fs-extra')
    jest.spyOn(currentFs, 'pathExists').mockImplementation(async file => {
      if (file === path.join(configuredPath, 'locales.json')) return configuredExists
      return true
    })
    const readJson = jest.spyOn(currentFs, 'readJson').mockImplementation(async file => {
      if (file === path.join(expectedPath, 'locales.json')) {
        return { data: { localization: { locales: [{ code: 'zh', name: 'Chinese' }] } } }
      }
      if (file === path.join(expectedPath, 'zh.json')) return { 'common:hello': 'Hello' }
      throw new Error(`Unexpected path: ${file}`)
    })

    await sideloader.init()

    expect(readJson).toHaveBeenCalledWith(path.join(expectedPath, 'zh.json'))
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      code: 'zh',
      strings: { common: { hello: 'Hello' } }
    }))
    expect(global.WIKI.logger.warn).not.toHaveBeenCalled()
  })

  it('does not load locales in online mode', async () => {
    global.WIKI.config.offline = false
    const pathExists = jest.spyOn(require('fs-extra'), 'pathExists')

    await sideloader.init()

    expect(pathExists).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })
})
