/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Vue = require('vue')
const Vuetify = require('vuetify')
const VueI18Next = require('@panter/vue-i18next')
const i18next = require('i18next')
const _ = require('lodash')

Vue.use(Vuetify)
Vue.use(VueI18Next)

const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-locale.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const localRequire = name => name.startsWith('gql/') ? {} : require(name)
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(localRequire, componentModule, componentModule.exports)
const component = Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
const resources = {}
for (const language of ['zh', 'en']) {
  const strings = require(`../../../../data/sideload/${language}.json`)
  resources[language] = { admin: {}, common: {} }
  Object.entries(strings).forEach(([key, value]) => {
    const [namespace, name] = key.split(':')
    if ((namespace === 'admin' && (name.startsWith('locale.') || name === 'ui.groupRules.comingSoon')) ||
        namespace === 'common') {
      _.set(resources[language][namespace], name, value)
    }
  })
}

describe('locale package sideload indicator', () => {
  it('follows the active system language', async () => {
    const locale = i18next.createInstance()
    await locale.init({ lng: 'zh', fallbackLng: 'en', ns: ['admin', 'common'], resources, initImmediate: false })
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(component)
    }).$mount()

    try {
      await Vue.nextTick()
      expect(app.$el.querySelector('.v-chip').textContent.trim()).toBe('即将推出...')
      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(app.$el.querySelector('.v-chip').textContent.trim()).toBe('Coming Soon')
    } finally {
      app.$destroy()
    }
  })
})
