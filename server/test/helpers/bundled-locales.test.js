const fs = require('fs-extra')
const path = require('path')
const bundledLocales = require('../../helpers/bundled-locales')

describe('bundled locales', () => {
  const bundledPath = path.resolve(__dirname, '../../sideload')
  const developmentPath = path.resolve(__dirname, '../../../data/sideload')

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads the image copy when the bundled locale directory exists', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
    const readJson = jest.spyOn(fs, 'readJsonSync').mockReturnValue({ message: 'translated' })

    expect(bundledLocales.loadBundledLocale('zh.json')).toEqual({ message: 'translated' })
    expect(fs.existsSync).toHaveBeenCalledWith(path.join(bundledPath, 'locales.json'))
    expect(readJson).toHaveBeenCalledWith(path.join(bundledPath, 'zh.json'))
  })

  it('falls back to the development locale directory', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(bundledLocales.getBundledLocaleDirectory()).toBe(developmentPath)
  })
})
