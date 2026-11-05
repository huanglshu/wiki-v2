/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-system.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'epic-spinners') return { SelfBuildingSquareSpinner: {} }
  if (name.startsWith('gql/')) return {}
  if (name === '../../helpers/version') return require('../../../helpers/version')
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = componentModule.exports.default

describe('admin system version status', () => {
  it('compiles and only offers an upgrade for a known newer version', () => {
    expect(compiler.compile(pug.render(sfc.template.content)).errors).toEqual([])
    expect(sfc.template.content).toContain('info.upgradeCapable && isLatestVersion === false')
  })

  it.each([
    ['2.5.317.1', '2.5.317', true],
    ['2.5.317.1', '2.5.318', false],
    ['2.5.317.1', 'n/a', null]
  ])('handles current version %s and latest version %s', (currentVersion, latestVersion, expected) => {
    expect(component.computed.isLatestVersion.call({ info: { currentVersion, latestVersion } })).toBe(expected)
  })
})
