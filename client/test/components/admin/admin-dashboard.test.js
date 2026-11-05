/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-dashboard.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'animated-number-vue') return {}
  if (name === 'vuex-pathify') return { get: () => () => {} }
  if (name === 'graphql-tag') return () => ({})
  if (name === '../../helpers/version') return require('../../../helpers/version')
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = componentModule.exports.default

describe('admin dashboard version card', () => {
  it('does not render the system settings wrench shortcut', () => {
    expect(source).toContain("{{$t('admin:dashboard.versionLatest')}}")
    expect(source).not.toContain('btn-animate-wrench')
    expect(source).not.toContain("to='system'")
  })

  it('compiles the template and renders an unknown version state', () => {
    const compiled = compiler.compile(pug.render(sfc.template.content))
    expect(compiled.errors).toEqual([])
    expect(sfc.template.content).toContain("$t('admin:dashboard.versionUnknown')")
    expect(require('../../../../data/sideload/en.json')['admin:dashboard.versionUnknown']).toEqual(expect.any(String))
    expect(require('../../../../data/sideload/zh.json')['admin:dashboard.versionUnknown']).toEqual(expect.any(String))
  })

  it.each([
    ['2.5.317.1', '2.5.317.1', true],
    ['2.5.317.1', '2.5.318', false],
    ['2.5.317.1', 'n/a', null]
  ])('handles current version %s and latest version %s', (currentVersion, latestVersion, expected) => {
    expect(component.computed.isLatestVersion.call({ info: { currentVersion, latestVersion } })).toBe(expected)
  })
})
