/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const zh = require('../../../data/sideload/zh.json')

const source = fs.readFileSync(path.join(__dirname, '../../components/setup.vue'), 'utf8')
const script = compiler.parseComponent(source).script.content
const code = babel.transformSync(script, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => {
  if (name === 'epic-spinners') return { BreedingRhombusSpinner: {} }
  if (name === 'canvas-confetti') return () => {}
  if (name === '../../data/sideload/en.json') return require('../../../data/sideload/en.json')
  return require(name)
}
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = componentModule.exports.default

describe('setup validation', () => {
  it.each([
    [{ adminEmail: '', adminPassword: 'password', adminPasswordConfirm: 'password', siteUrl: 'https://example.com' }, 'setup:emailRequired'],
    [{ adminEmail: 'invalid', adminPassword: 'password', adminPasswordConfirm: 'password', siteUrl: 'https://example.com' }, 'setup:emailInvalid'],
    [{ adminEmail: 'user@example.com', adminPassword: 'password', adminPasswordConfirm: 'password', siteUrl: 'https://example.com/' }, 'setup:siteUrlTrailingSlash'],
    [{ adminEmail: 'user@example.com', adminPassword: 'password', adminPasswordConfirm: 'different', siteUrl: 'https://example.com' }, 'setup:passwordMismatch']
  ])('shows translated validation text', async (conf, key) => {
    const ctx = { conf, $t: translationKey => zh[translationKey], $forceUpdate: jest.fn() }
    await component.methods.install.call(ctx)
    expect(ctx.errorMessage).toBe(zh[key])
    expect(ctx.error).toBe(true)
  })

  it('translates known setup errors while preserving unknown details', () => {
    const ctx = { $t: key => zh[key] }
    expect(component.methods.localizeError.call(ctx, 'Failed to fetch')).toBe(zh['setup:error.network'])
    expect(component.methods.localizeError.call(ctx, 'Database error: custom detail')).toBe('Database error: custom detail')
  })
})
