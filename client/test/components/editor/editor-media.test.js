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
const zhTranslations = require('../../../../data/sideload/zh.json')
const enTranslations = require('../../../../data/sideload/en.json')

describe('editor media panel', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/editor/editor-modal-media.vue'), 'utf8')

  function loadComponent() {
    const sfc = compiler.parseComponent(source)
    const code = babel.transformSync(sfc.script.content, {
      configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const componentModule = { exports: {} }
    const localRequire = name => {
      if (name === '../../../data/sideload/zh.json') return zhTranslations
      if (name === '../../../data/sideload/en.json') return enTranslations
      if (name === 'vue-filepond') return () => ({ render: h => h('div') })
      if (name === 'vuex-pathify') return { get: () => () => {}, sync: () => ({ get: () => null, set: () => {} }) }
      if (name.endsWith('.css') || name.startsWith('gql/')) return {}
      return require(name)
    }
    runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(
      localRequire,
      componentModule,
      componentModule.exports
    )
    return Object.assign(componentModule.exports.default, compiler.compileToFunctions(pug.render(sfc.template.content)))
  }

  it('formats asset creation times as numeric dates', () => {
    expect(source).toContain("value.locale('en').format('YYYY-MM-DD HH:mm:ss')")
    expect(source).toContain('formatAssetDate(props.item.createdAt)')
  })

  it('uses translation keys for asset panel labels', () => {
    expect(source).not.toContain('Max 10 files, 5 MB each')
    expect(source).not.toContain("{ text: 'Centered', value: 'center' }")
    expect(source).toContain("$t('editor:assets.imageAlignOption.center')")
  })

  it('replaces stale image alignment resources and renders both languages', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['editor'],
      defaultNS: 'editor',
      resources: {
        zh: { editor: { assets: { imageAlign: { none: 'old value' }, title: 'Existing title' } } },
        en: { editor: { assets: { imageAlign: { none: 'old value' } } } }
      },
      initImmediate: false
    })
    const component = loadComponent()
    const context = { $i18n: { i18next: locale }, $t: locale.t.bind(locale) }

    component.created.call(context)

    expect(locale.t('editor:assets.imageAlign')).toBe('图像对齐')
    expect(locale.t('editor:assets.title')).toBe('Existing title')
    expect(component.computed.imageAlignments.call(context)).toEqual([
      { text: '无', value: '' },
      { text: '左对齐', value: 'left' },
      { text: '居中', value: 'center' },
      { text: '右对齐', value: 'right' },
      { text: '绝对定位到右上角', value: 'abstopright' }
    ])

    await locale.changeLanguage('en')
    expect(locale.t('editor:assets.imageAlign')).toBe('Image Alignment')
    expect(component.computed.imageAlignments.call(context)).toEqual([
      { text: 'None', value: '' },
      { text: 'Left', value: 'left' },
      { text: 'Centered', value: 'center' },
      { text: 'Right', value: 'right' },
      { text: 'Absolute Top Right', value: 'abstopright' }
    ])
  })

  it('shows the alignment heading and options in the rendered panel', async () => {
    Vue.use(Vuetify)
    Vue.use(VueI18Next)
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['editor', 'common'],
      resources: {
        zh: { editor: { assets: { imageAlign: { none: 'old value' } } }, common: {} },
        en: { editor: {}, common: {} }
      },
      initImmediate: false
    })
    const component = loadComponent()
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        folderTree: () => [],
        currentFolderId: () => 0,
        currentFileId: () => null
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent)
    }).$mount()
    root.appendChild(app.$el)

    try {
      await Vue.nextTick()
      expect(app.$el.textContent).toContain('图像对齐')
      expect(app.$el.textContent).not.toContain('returned an object instead of string')
      expect(app.$children[0].imageAlignments.map(option => option.text)).toEqual([
        '无', '左对齐', '居中', '右对齐', '绝对定位到右上角'
      ])
      const descendants = vm => [vm, ...vm.$children.flatMap(descendants)]
      const select = descendants(app).find(vm => vm.$options.name === 'v-select')
      select.activateMenu()
      await Vue.nextTick()
      expect(document.body.textContent).toContain('绝对定位到右上角')
      expect(document.body.textContent).not.toContain('assets.imageAlignOption')

      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(app.$el.textContent).toContain('Image Alignment')
      expect(app.$children[0].imageAlignments.map(option => option.text)).toEqual([
        'None', 'Left', 'Centered', 'Right', 'Absolute Top Right'
      ])
    } finally {
      app.$destroy()
      root.remove()
    }
  })

  it('closes on the background without closing for card clicks or open dialogs', async () => {
    Vue.use(Vuetify)
    Vue.use(VueI18Next)
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['editor', 'common'],
      resources: { zh: { editor: {}, common: {} }, en: { editor: {}, common: {} } },
      initImmediate: false
    })
    const component = loadComponent()
    const setActiveModal = jest.fn()
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => 'editorModalMedia', set: setActiveModal },
        folderTree: () => [],
        currentFolderId: () => 0,
        currentFileId: () => null
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent)
    }).$mount()
    root.appendChild(app.$el)

    try {
      await Vue.nextTick()
      const panel = app.$children[0]
      const click = element => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      click(app.$el.querySelector('.v-card .v-card__text'))
      expect(setActiveModal).not.toHaveBeenCalled()

      panel.deleteDialog = true
      click(app.$el.querySelector('.container'))
      expect(setActiveModal).not.toHaveBeenCalled()

      panel.deleteDialog = false
      click(app.$el.querySelector('.container'))
      expect(setActiveModal).toHaveBeenCalledWith('')
    } finally {
      app.$destroy()
      root.remove()
    }
  })
})
