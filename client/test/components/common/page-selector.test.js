/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const source = fs.readFileSync(path.join(__dirname, '../../../components/common/page-selector.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const translate = jest.fn(key => key === 'common:sidebar.root' ? '根目录' : key)
const localRequire = name => {
  if (name === 'gql/common/common-pages-query-tree.gql') {
    return { __esModule: true, default: {} }
  }
  return require(name)
}
runInThisContext(`(function (require, module, exports, siteLangs, siteConfig) {\n${code}\n})`)(
  localRequire,
  componentModule,
  componentModule.exports,
  [],
  { lang: 'zh' }
)

describe('page selector root label', () => {
  it('uses the localized sidebar root label and keeps it after changing locale', () => {
    const component = componentModule.exports.default
    const vm = component.data.call({ $t: translate })
    vm.$t = translate
    vm.$nextTick = callback => callback()

    component.watch.currentLocale.call(vm, 'en')

    expect(translate).toHaveBeenCalledWith('common:sidebar.root', { defaultValue: 'root' })
    expect(vm.tree[0].title).toBe('根目录')
  })
})
