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
const VueClipboards = require('vue-clipboards').default
const i18next = require('i18next')
const zhTranslations = require('../../../../data/sideload/zh.json')
const enTranslations = require('../../../../data/sideload/en.json')

describe('editor media panel', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../../components/editor/editor-modal-media.vue'), 'utf8')

  function loadComponent(siteConfig = { host: 'https://wiki.example.com/base' }) {
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
    runInThisContext(`(function (require, module, exports, window, siteConfig) {\n${code}\n})`)(
      localRequire,
      componentModule,
      componentModule.exports,
      window,
      siteConfig
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
      expect(app.$el.querySelector('.editor-media-path')).not.toBeNull()
      expect(app.$el.querySelector('.editor-media-folder-tree')).toBeNull()
      app.$vuetify.breakpoint.smAndUp = true
      app.$children[0].assets = [{ id: 937, filename: 'example.png', ext: '.png', fileSize: 1, createdAt: null }]
      await Vue.nextTick()
      expect(app.$el.querySelector('.editor-media-files tbody tr td').textContent.trim()).toBe('937')
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

  it('renders the loading message in the active language', async () => {
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
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        folderTree: () => [],
        currentFolderId: () => 0,
        currentFileId: () => null
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent)
    }).$mount()

    try {
      app.$children[0].loading = true
      await Vue.nextTick()
      expect(app.$el.querySelector('.editor-media-files').textContent).toContain(zhTranslations['common:dataIterator.loadingText'])
      expect(app.$el.textContent).not.toContain('$vuetify.dataIterator.loadingText')

      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(app.$el.querySelector('.editor-media-files').textContent).toContain(enTranslations['common:dataIterator.loadingText'])
    } finally {
      app.$destroy()
    }
  })

  it('keeps an existing loading translation', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      ns: ['editor', 'common'],
      resources: { zh: { editor: {}, common: { dataIterator: { loadingText: 'custom loading' } } } },
      initImmediate: false
    })
    loadComponent().created.call({ $i18n: { i18next: locale } })
    expect(locale.t('common:dataIterator.loadingText')).toBe('custom loading')
  })

  it('localizes FilePond labels with the active system language', async () => {
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'zh',
      fallbackLng: 'en',
      ns: ['editor'],
      resources: { zh: { editor: {} }, en: { editor: {} } },
      initImmediate: false
    })
    const component = loadComponent()
    const context = { $i18n: { i18next: locale }, $t: locale.t.bind(locale) }
    component.created.call(context)

    expect(component.computed.filePondLabels.call(context)).toMatchObject({
      labelIdle: zhTranslations['editor:assets.uploadAssetsDropZone'],
      labelFileProcessing: zhTranslations['editor:assets.filepond.fileProcessing'],
      labelFileProcessingComplete: zhTranslations['editor:assets.filepond.fileProcessingComplete'],
      labelFileProcessingError: zhTranslations['editor:assets.filepond.fileProcessingError'],
      labelButtonAbortItemProcessing: zhTranslations['editor:assets.filepond.buttonAbortItemProcessing']
    })

    await locale.changeLanguage('en')
    expect(component.computed.filePondLabels.call(context)).toMatchObject({
      labelFileProcessing: enTranslations['editor:assets.filepond.fileProcessing'],
      labelFileProcessingComplete: enTranslations['editor:assets.filepond.fileProcessingComplete'],
      labelButtonAbortItemProcessing: enTranslations['editor:assets.filepond.buttonAbortItemProcessing']
    })
    expect(source.match(/v-bind='filePondLabels'/g)).toHaveLength(2)
  })

  it('keeps folder names and action cells in bounded columns', () => {
    const component = loadComponent()
    const headers = component.computed.headers.call({
      $vuetify: { breakpoint: { smAndUp: true, mdAndUp: true, lgAndUp: true } },
      $t: key => key
    })
    expect(headers[headers.length - 1]).toMatchObject({
      width: 80,
      align: 'center',
      class: 'editor-media-actions'
    })
    expect(source).toContain("template(v-slot:label='{ item }')")
    expect(source).toContain("span(:title='item.name')")
    expect(source).toContain('grid-template-columns: 240px minmax(0, 1fr)')
    expect(source).toContain('text-overflow: ellipsis')
    expect(source).toContain('position: sticky')
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

  it('provides a permission-aware management mode without editor insertion controls', async () => {
    Vue.use(Vuetify)
    Vue.use(VueI18Next)
    Vue.use(VueClipboards)
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'en',
      ns: ['editor', 'common'],
      resources: { en: { editor: { assets: { title: 'Assets', uploadAssets: 'Upload', imageAlign: 'Alignment' } }, common: { actions: { close: 'Close', insert: 'Insert' } } } },
      initImmediate: false
    })
    const component = loadComponent()
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    Vue.prototype.$store = { state: { user: { permissions: ['read:assets'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }) }
    const setActiveModal = jest.fn()
    const current = Vue.observable({ id: null })
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: setActiveModal },
        folderTree: () => [],
        currentFolderId: { get: () => 0, set: jest.fn() },
        currentFileId: { get: () => current.id, set: id => { current.id = id } }
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()
    root.appendChild(app.$el)

    try {
      await Vue.nextTick()
      const panel = app.$children[0]
      const close = jest.fn()
      panel.$on('close', close)
      expect(panel.canUploadAssets).toBe(false)
      expect(panel.canManageAssets).toBe(false)
      expect(app.$el.getAttribute('role')).toBe('dialog')
      expect(app.$el.textContent).toContain('Close')
      expect(app.$el.textContent).not.toContain('Insert')
      expect(app.$el.textContent).not.toContain('Upload')
      expect(app.$el.textContent).not.toContain('Image Alignment')
      const layout = app.$el.querySelector('.editor-media-layout')
      expect(layout.querySelector('.editor-media-folder-tree')).not.toBeNull()
      expect(layout.querySelector('.editor-media-files')).not.toBeNull()
      expect(layout.querySelector('.editor-media-path')).toBeNull()
      panel.assets = [{ id: 1, filename: 'example.png', ext: '.png', fileSize: 1, createdAt: null }]
      await Vue.nextTick()
      layout.querySelector('.editor-media-actions button').click()
      await Vue.nextTick()
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.assetActionsFileId).toBe(1)
      const menu = document.querySelector('.v-menu__content.menuable__content__active')
      expect(menu.textContent).toContain('Copy Link')
      expect(menu.querySelectorAll('.v-list-item')).toHaveLength(1)
      expect(menu.querySelector('.v-list-item').$clipboards.text()).toBe('https://wiki.example.com/base/example.png')
      panel.closeOnEscape()
      expect(close).not.toHaveBeenCalled()
      panel.assetActionsFileId = null
      await Vue.nextTick()
      panel.closeOnEscape()
      expect(setActiveModal).toHaveBeenCalledWith('')
      expect(close).toHaveBeenCalledTimes(1)
      Vue.prototype.$store.state.user.permissions = ['manage:system']
      expect(component.computed.canUploadAssets.call(panel)).toBe(true)
      expect(component.computed.canManageAssets.call(panel)).toBe(true)
    } finally {
      app.$destroy()
      root.remove()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it.each([false, true])('selects an asset from the management layout (editor insertion: %s)', async insertion => {
    Vue.use(Vuetify)
    Vue.use(VueI18Next)
    Vue.use(VueClipboards)
    const locale = i18next.createInstance()
    await locale.init({
      lng: 'en',
      ns: ['editor', 'common'],
      resources: { en: { editor: {}, common: { actions: { cancel: 'Cancel', select: 'Select', insert: 'Insert' } } } },
      initImmediate: false
    })
    const component = loadComponent()
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    Vue.prototype.$store = { state: { user: { permissions: ['read:assets'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }) }
    const selected = Vue.observable({ id: null, folderId: 0, path: [] })
    const setActiveModal = jest.fn()
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => 'editorModalMedia', set: setActiveModal },
        folderTree: () => selected.path,
        currentFolderId: { get: () => selected.folderId, set: id => { selected.folderId = id } },
        currentFileId: { get: () => selected.id, set: id => { selected.id = id } }
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true, selection: true, insertion } })
    }).$mount()

    try {
      const panel = app.$children[0]
      const insert = jest.fn()
      app.$on('editorInsert', insert)
      selected.folderId = 7
      selected.path = [{ id: 7, slug: 'backgrounds' }]
      panel.assets = [{ id: 11, filename: 'login.png', kind: 'IMAGE', ext: '.png', fileSize: 1, createdAt: null }]
      await Vue.nextTick()
      const buttons = app.$el.querySelectorAll('.editor-media-footer button')
      expect(app.$el.querySelector('.editor-media-folder-tree')).not.toBeNull()
      expect(buttons[1].textContent).toContain(insertion ? 'Insert' : 'Select')
      expect(buttons[1].disabled).toBe(true)
      expect(Boolean(app.$el.querySelector('.editor-media-alignment'))).toBe(insertion)
      app.$el.querySelector('.editor-media-files tbody tr').click()
      await Vue.nextTick()
      expect(buttons[1].disabled).toBe(false)
      if (insertion) {
        expect(app.$el.querySelector('.editor-media-alignment').classList.contains('v-input--is-disabled')).toBe(false)
        panel.imageAlignment = 'right'
      }
      buttons[1].click()
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ path: '/backgrounds/login.png', kind: 'IMAGE', align: insertion ? 'right' : '' }))
      expect(setActiveModal).toHaveBeenCalledWith('')
      panel.currentFileId = 999
      panel.insert()
      expect(insert).toHaveBeenCalledTimes(1)
      panel.cancel()
      expect(setActiveModal).toHaveBeenCalledWith('')
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('enables management selection only for the editor media modal', () => {
    const editorSource = fs.readFileSync(path.join(__dirname, '../../../components/editor.vue'), 'utf8')
    expect(editorSource).toContain('activeModal === `editorModalMedia` ? { management: true, selection: true, insertion: true } : {}')
  })

  it('keeps keyboard focus in the manager when navigating folders', () => {
    const component = loadComponent()
    const context = {
      management: true,
      folderTree: [],
      $store: { commit: jest.fn() },
      $el: { focus: jest.fn() },
      $nextTick: callback => callback()
    }
    component.methods.downFolder.call(context, { id: 12 })
    expect(context.currentFolderId).toBe(12)
    expect(context.$el.focus).toHaveBeenCalledTimes(1)
    component.methods.upFolder.call(context)
    expect(context.currentFolderId).toBe(0)
    expect(context.$el.focus).toHaveBeenCalledTimes(2)
  })

  it('opens the upload dialog in management mode and hides it without upload permission', async () => {
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
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    const permissions = Vue.observable({ value: ['manage:system'] })
    Vue.prototype.$store = { state: { user: { get permissions() { return permissions.value } } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }) }
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: jest.fn() },
        folderTree: () => [],
        currentFolderId: { get: () => 0, set: jest.fn() },
        currentFileId: { get: () => null, set: jest.fn() }
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()
    root.appendChild(app.$el)
    try {
      const panel = app.$children[0]
      expect(app.$el.querySelector('.editor-media-upload-button').getAttribute('aria-label')).toBe('上传文件')
      expect(app.$el.querySelector('.flex.lg3')).toBeNull()
      app.$el.querySelector('.editor-media-upload-button').click()
      await Vue.nextTick()
      expect(panel.uploadDialog).toBe(true)
      expect(document.querySelector('.editor-media-upload-dialog').textContent).toContain('上传文件')
      expect(document.querySelector('.editor-media-upload-dialog .dialog-header button .mdi-plus-box-multiple')).not.toBeNull()
      expect(document.querySelector('.editor-media-upload-dialog .dialog-header > .mdi-cloud-upload-outline')).toBeNull()
      expect(document.querySelectorAll('.editor-media-upload-dialog > .v-divider')).toHaveLength(2)
      panel.uploadDialog = false
      permissions.value = ['read:assets']
      await Vue.nextTick()
      expect(app.$el.querySelector('.editor-media-upload-button')).toBeNull()
    } finally {
      app.$destroy()
      root.remove()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('uploads selected files to the current folder and prevents duplicate submissions', async () => {
    const component = loadComponent()
    let finish
    const processing = new Promise(resolve => { finish = resolve })
    const file = { setMetadata: jest.fn() }
    const context = {
      currentFolderId: 42,
      uploadLoading: false,
      $refs: { pond: { getFiles: jest.fn().mockReturnValue([file]), processFiles: jest.fn().mockReturnValue(processing) } },
      $store: { commit: jest.fn() }
    }
    const upload = component.methods.upload.call(context)
    expect(context.uploadLoading).toBe(true)
    expect(file.setMetadata).toHaveBeenCalledWith({ folderId: 42 })
    await component.methods.upload.call(context)
    expect(context.$refs.pond.processFiles).toHaveBeenCalledTimes(1)
    finish()
    await upload
    expect(context.uploadLoading).toBe(false)
  })

  it('loads and displays the current upload size limit when opening the dialog', async () => {
    const component = loadComponent()
    const locale = i18next.createInstance()
    await locale.init({ lng: 'zh', ns: ['editor', 'common'], resources: { zh: { editor: {}, common: {} }, en: { editor: {}, common: {} } }, initImmediate: false })
    component.created.call({ $i18n: { i18next: locale } })
    const context = {
      uploadLimitRequest: 0,
      uploadMaxFileSize: null,
      $t: locale.t.bind(locale),
      $apollo: { query: jest.fn().mockResolvedValue({ data: { assets: { uploadMaxFileSize: 10485760 } } }) },
      $store: { commit: jest.fn() }
    }
    await component.methods.openUploadDialog.call(context)
    expect(context.uploadDialog).toBe(true)
    expect(context.$apollo.query).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: 'network-only' }))
    expect(component.computed.uploadLimitText.call(context)).toBe('最多 10 个文件，每个文件最大 10 MB')
    context.$apollo.query.mockResolvedValue({ data: { assets: { uploadMaxFileSize: 1500 } } })
    await component.methods.openUploadDialog.call(context)
    expect(component.computed.uploadLimitText.call(context)).toBe('最多 10 个文件，每个文件最大 1500 B')
    context.$apollo.query.mockRejectedValue(new Error('offline'))
    await component.methods.openUploadDialog.call(context)
    expect(component.computed.uploadLimitText.call(context)).toBe('最多 10 个文件')
    expect(context.$store.commit).toHaveBeenCalledWith('pushGraphError', expect.any(Error))
  })

  it('ignores stale upload limit responses', async () => {
    const component = loadComponent()
    let resolveFirst
    const context = {
      uploadLimitRequest: 0,
      $apollo: { query: jest.fn()
        .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
        .mockResolvedValueOnce({ data: { assets: { uploadMaxFileSize: 2048 } } }) },
      $store: { commit: jest.fn() }
    }
    const first = component.methods.openUploadDialog.call(context)
    await component.methods.openUploadDialog.call(context)
    resolveFirst({ data: { assets: { uploadMaxFileSize: 1024 } } })
    await first
    expect(context.uploadMaxFileSize).toBe(2048)
  })

  it('calculates pagination for each page size and preserves the editor default', () => {
    const component = loadComponent()
    expect(component.computed.pageTotal.call({ assets: Array(15) })).toBe(1)
    expect(component.computed.pageTotal.call({ assets: Array(16) })).toBe(2)
    expect(component.computed.pageTotal.call({ assets: Array(31) })).toBe(3)
    expect(component.computed.pageTotal.call({ management: true, itemsPerPage: 20, assets: Array(101) })).toBe(6)
    expect(component.computed.pageTotal.call({ management: true, itemsPerPage: 50, assets: Array(101) })).toBe(3)
    expect(component.computed.pageTotal.call({ management: true, itemsPerPage: 100, assets: Array(101) })).toBe(2)
  })

  it('changes the number of resource rows and resets the current page', async () => {
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
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    Vue.prototype.$store = { state: { user: { permissions: ['read:assets'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }) }
    const setCurrentFileId = jest.fn()
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: jest.fn() },
        folderTree: () => [],
        currentFolderId: { get: () => 0, set: jest.fn() },
        currentFileId: { get: () => null, set: setCurrentFileId }
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()

    try {
      const panel = app.$children[0]
      app.$vuetify.breakpoint.smAndUp = true
      panel.assets = Array.from({ length: 101 }, (_, id) => ({
        id: id + 1000, filename: `file-${id}.png`, ext: '.png', fileSize: 1, createdAt: null
      }))
      await Vue.nextTick()
      const rows = () => app.$el.querySelectorAll('.editor-media-files tbody tr').length
      const numbers = () => [...app.$el.querySelectorAll('.editor-media-files tbody tr td:first-child')].map(cell => cell.textContent.trim())
      const descendants = vm => [vm, ...vm.$children.flatMap(descendants)]
      const select = descendants(panel).find(vm => vm.$options.name === 'v-select')
      expect(select.items).toEqual([
        { text: '20条/页', value: 20 },
        { text: '50条/页', value: 50 },
        { text: '100条/页', value: 100 }
      ])
      const pagination = app.$el.querySelector('.editor-media-pagination')
      expect([...pagination.children].map(child => child.className)).toEqual([
        expect.stringContaining('editor-media-file-count'),
        expect.any(String),
        expect.stringContaining('editor-media-page-size')
      ])
      expect(pagination.children[1].tagName).toBe('NAV')
      expect(pagination.querySelector('.editor-media-file-count').textContent.trim()).toBe('共 101 个文件')
      expect(pagination.querySelector('.v-select__selection').textContent.trim()).toBe('20条/页')
      expect(app.$el.querySelector('.editor-media-footer').textContent).not.toContain('101')
      expect(app.$el.querySelector('.editor-media-files th').textContent.trim()).toBe(zhTranslations['editor:assets.headerNumber'])
      expect(app.$el.querySelector('.editor-media-files th').classList.contains('text-center')).toBe(true)
      expect(app.$el.querySelector('.editor-media-files tbody tr td').classList.contains('text-center')).toBe(true)
      expect(rows()).toBe(20)
      expect(numbers()).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)))
      app.$el.querySelector('.editor-media-files tbody tr').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(setCurrentFileId).toHaveBeenCalledWith(1000)
      app.$el.querySelectorAll('.editor-media-files th')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Vue.nextTick()
      await Vue.nextTick()
      expect(numbers()).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)))
      expect(panel.pageTotal).toBe(6)

      panel.pagination = 3
      await Vue.nextTick()
      await Vue.nextTick()
      expect(numbers()[0]).toBe('41')
      expect(numbers()[19]).toBe('60')
      select.$emit('input', 50)
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.pagination).toBe(1)
      expect(panel.pageTotal).toBe(3)
      expect(rows()).toBe(50)
      expect(numbers()[49]).toBe('50')
      expect(pagination.querySelector('.v-select__selection').textContent.trim()).toBe('50条/页')

      panel.pagination = 2
      await Vue.nextTick()
      await Vue.nextTick()
      expect(numbers()[0]).toBe('51')
      expect(numbers()[49]).toBe('100')
      select.$emit('input', 100)
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.pagination).toBe(1)
      expect(panel.pageTotal).toBe(2)
      expect(rows()).toBe(100)

      panel.assets = panel.assets.slice(0, 45)
      await Vue.nextTick()
      expect(panel.pageTotal).toBe(1)
      expect(app.$el.querySelector('.editor-media-pagination .v-pagination__item--active').textContent).toBe('1')
      expect(app.$el.querySelectorAll('.editor-media-pagination .v-pagination__navigation--disabled')).toHaveLength(2)

      panel.assets = []
      await Vue.nextTick()
      expect(app.$el.querySelector('.editor-media-page-size')).not.toBeNull()
      expect(app.$el.querySelector('.editor-media-pagination .v-pagination__item--active').textContent).toBe('1')
      expect(app.$el.querySelector('.editor-media-pagination .v-pagination--disabled')).not.toBeNull()
      await locale.changeLanguage('en')
      await Vue.nextTick()
      expect(pagination.querySelector('.editor-media-file-count').textContent.trim()).toBe('Total: 0 files')
      expect(select.items).toEqual([
        { text: '20 / page', value: 20 },
        { text: '50 / page', value: 50 },
        { text: '100 / page', value: 100 }
      ])
      expect(app.$el.querySelector('.editor-media-files th').textContent.trim()).toBe(enTranslations['editor:assets.headerNumber'])
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('loads tree folders and selects a nested folder for file operations', async () => {
    const component = loadComponent()
    const root = { id: 0, path: [], children: [] }
    const query = jest.fn()
      .mockResolvedValueOnce({ data: { assets: { folders: [{ id: 1, name: 'Parent', slug: 'parent' }] } } })
      .mockResolvedValueOnce({ data: { assets: { folders: [{ id: 2, name: 'Child', slug: 'child' }] } } })
    const context = {
      assetFolderTree: [root],
      openAssetFolders: [0],
      $apollo: { query },
      $store: { set: jest.fn(), commit: jest.fn() }
    }
    context.findTreeFolder = component.methods.findTreeFolder.bind(context)
    context.updateTreeOpen = component.methods.updateTreeOpen.bind(context)
    context.$nextTick = callback => callback()

    await component.methods.fetchTreeFolders.call(context, root)
    await component.methods.fetchTreeFolders.call(context, root.children[0])
    component.methods.selectTreeFolder.call(context, [2])

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ variables: { parentFolderId: 1 }, fetchPolicy: 'network-only' }))
    expect(context.$store.set).toHaveBeenCalledWith('editor/media@folderTree', [
      { id: 1, name: 'Parent', slug: 'parent' },
      { id: 2, name: 'Child', slug: 'child' }
    ])
    expect(context.currentFolderId).toBe(2)
    expect(context.currentFileId).toBeNull()
    expect(context.pagination).toBe(1)
    expect(context.openAssetFolders).toContain(2)
    context.updateTreeOpen([])
    expect(context.openAssetFolders).toEqual([0])

    query.mockResolvedValueOnce({ data: { assets: { folders: [{ id: 1, name: 'Parent', slug: 'parent' }] } } })
    await component.methods.fetchTreeFolders.call(context, root)
    expect(root.children[0].children[0].name).toBe('Child')
  })

  it('shows the selected directory path beside the folder name field', () => {
    const component = loadComponent()
    expect(component.computed.currentFolderPath.call({ folderTree: [] })).toBe('/')
    expect(component.computed.currentFolderPath.call({
      folderTree: [{ slug: 'parent' }, { slug: '子目录' }]
    })).toBe('/parent/子目录/')
    expect(source).toContain('.editor-media-folder-create-path(')
    expect(source).not.toContain("prepend-icon='mdi-folder-outline'")
    expect(zhTranslations['editor:assets.currentFolderPath']).toBe('当前目录路径')
    expect(enTranslations['editor:assets.currentFolderPath']).toBe('Current folder path')
  })

  it('updates the management heading when the selected folder changes', async () => {
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
    const folderState = Vue.observable({ path: [], id: 0 })
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    Vue.prototype.$store = { state: { user: { permissions: ['manage:system'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [], folderEmpty: true } } }) }
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: jest.fn() },
        folderTree: () => folderState.path,
        currentFolderId: { get: () => folderState.id, set: id => { folderState.id = id } },
        currentFileId: { get: () => null, set: jest.fn() }
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()

    try {
      const heading = app.$el.querySelector('.editor-media-heading')
      const path = heading.querySelector('.editor-media-heading-path')
      expect(heading.querySelector('.editor-media-heading-divider').textContent).toBe('|')
      expect(path.textContent.trim()).toBe('/')
      const deleteButton = app.$el.querySelector('.editor-media-delete-folder')
      expect(deleteButton.disabled).toBe(true)
      folderState.path = [{ slug: 'parent' }, { slug: 'child' }]
      folderState.id = 2
      await Vue.nextTick()
      await Promise.resolve()
      await Vue.nextTick()
      expect(path.textContent.trim()).toBe('/parent/child/')
      expect(path.getAttribute('title')).toBe('/parent/child/')
      expect(path.classList.contains('primary--text')).toBe(true)
      expect(deleteButton.disabled).toBe(false)
      deleteButton.click()
      expect(app.$children[0].deleteFolderDialog).toBe(true)
      expect(Vue.prototype.$apollo.mutate).toBeUndefined()
      app.$children[0].deleteFolderDialog = false
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('keeps folder deletion disabled until the current folder is confirmed empty', async () => {
    const component = loadComponent()
    let resolveFirst
    let resolveSecond
    const first = new Promise(resolve => { resolveFirst = resolve })
    const second = new Promise(resolve => { resolveSecond = resolve })
    const context = {
      management: true,
      canManageAssets: true,
      currentFolderId: 1,
      emptyFolderId: null,
      folderEmptyRequest: 0,
      $store: { commit: jest.fn() },
      $apollo: { query: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) }
    }
    const firstCheck = component.methods.checkFolderEmpty.call(context)
    context.currentFolderId = 2
    const secondCheck = component.methods.checkFolderEmpty.call(context)
    resolveFirst({ data: { assets: { folderEmpty: true } } })
    await firstCheck
    expect(context.emptyFolderId).toBeNull()
    resolveSecond({ data: { assets: { folderEmpty: false } } })
    await secondCheck
    expect(component.computed.canDeleteCurrentFolder.call(context)).toBe(false)

    context.$apollo.query.mockResolvedValueOnce({ data: { assets: { folderEmpty: true } } })
    await component.methods.checkFolderEmpty.call(context)
    expect(component.computed.canDeleteCurrentFolder.call(context)).toBe(true)
    context.$apollo.query.mockRejectedValueOnce(new Error('network error'))
    await component.methods.checkFolderEmpty.call(context)
    expect(component.computed.canDeleteCurrentFolder.call(context)).toBe(false)
    context.currentFolderId = 0
    await component.methods.checkFolderEmpty.call(context)
    expect(component.computed.canDeleteCurrentFolder.call(context)).toBe(false)
  })

  it('only deletes a confirmed folder and selects its parent', async () => {
    const component = loadComponent()
    const parent = { id: 1, children: [{ id: 2 }, { id: 3 }] }
    const context = {
      management: true,
      canManageAssets: true,
      currentFolderId: 2,
      folderTree: [{ id: 1 }, { id: 2 }],
      deleteFolderDialog: false,
      deleteFolderLoading: false,
      findTreeFolder: jest.fn().mockReturnValue(parent),
      selectTreeFolder: jest.fn(),
      fetchTreeFolders: jest.fn().mockResolvedValue(),
      $t: key => key,
      $store: { commit: jest.fn() },
      $apollo: { mutate: jest.fn().mockResolvedValue({ data: { assets: { deleteFolder: { responseResult: { succeeded: true } } } } }) }
    }
    await component.methods.deleteFolder.call(context)
    expect(context.$apollo.mutate).not.toHaveBeenCalled()
    context.deleteFolderDialog = true
    await component.methods.deleteFolder.call(context)
    expect(context.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 2 } }))
    expect(parent.children).toEqual([{ id: 3 }])
    expect(context.selectTreeFolder).toHaveBeenCalledWith([1])
    expect(context.fetchTreeFolders).toHaveBeenCalledWith(parent)
    expect(context.deleteFolderDialog).toBe(false)
    expect(context.deleteFolderLoading).toBe(false)
  })

  it('shows a localized warning and retains a nonempty folder', async () => {
    const component = loadComponent()
    const context = {
      management: true,
      canManageAssets: true,
      currentFolderId: 2,
      folderTree: [{ id: 2 }],
      deleteFolderDialog: true,
      deleteFolderLoading: false,
      findTreeFolder: jest.fn(),
      selectTreeFolder: jest.fn(),
      $t: key => key,
      $store: { commit: jest.fn() },
      $apollo: { mutate: jest.fn().mockResolvedValue({ data: { assets: { deleteFolder: { responseResult: { succeeded: false, slug: 'AssetFolderNotEmpty' } } } } }) }
    }
    await component.methods.deleteFolder.call(context)
    expect(context.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: 'editor:assets.deleteFolderNotEmpty',
      style: 'warning'
    }))
    expect(context.selectTreeFolder).not.toHaveBeenCalled()
    expect(context.deleteFolderDialog).toBe(false)
    expect(context.deleteFolderLoading).toBe(false)
  })

  it.each([
    [0, []],
    [7, [{ id: 7, slug: 'parent', name: 'parent' }]]
  ])('selects the newly created folder under directory %i', async (parentId, parentPath) => {
    const component = loadComponent()
    const folder = { id: 42, slug: 'new-folder', name: 'new-folder' }
    const parent = { id: parentId, path: parentPath, children: [] }
    const context = {
      management: true,
      currentFolderId: parentId,
      currentFileId: 99,
      pagination: 3,
      newFolderDialog: true,
      newFolderName: 'new-folder',
      newFolderLoading: false,
      isFolderNameValid: true,
      assetFolderTree: parentId === 0 ? [parent] : [{ id: 0, path: [], children: [parent] }],
      openAssetFolders: [0],
      $store: { set: jest.fn(), commit: jest.fn() },
      $t: key => key,
      $nextTick: callback => callback(),
      $apollo: {
        mutate: jest.fn().mockResolvedValue({ data: { assets: { createFolder: { responseResult: { succeeded: true } } } } }),
        queries: { folders: { refetch: jest.fn().mockResolvedValue({ data: { assets: { folders: [folder] } } }) } },
        query: jest.fn().mockResolvedValue({ data: { assets: { folders: [folder] } } })
      }
    }
    for (const method of ['findTreeFolder', 'fetchTreeFolders', 'refreshTreeFolder', 'updateTreeOpen', 'selectTreeFolder']) {
      context[method] = component.methods[method].bind(context)
    }

    await component.methods.createFolder.call(context)

    expect(context.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { parentFolderId: parentId, slug: 'new-folder' }
    }))
    expect(context.currentFolderId).toBe(42)
    expect(context.currentFileId).toBeNull()
    expect(context.pagination).toBe(1)
    expect(context.$store.set).toHaveBeenCalledWith('editor/media@folderTree', [...parentPath, folder])
    expect(context.openAssetFolders).toContain(42)
    expect(context.newFolderDialog).toBe(false)
    expect(context.newFolderName).toBe('')
    expect(context.newFolderLoading).toBe(false)
  })

  it('enters the created folder in the editor and leaves selection unchanged on failure', async () => {
    const component = loadComponent()
    const folder = { id: 42, slug: 'new-folder', name: 'new-folder' }
    const context = {
      management: false,
      currentFolderId: 7,
      newFolderName: 'new-folder',
      newFolderLoading: false,
      isFolderNameValid: true,
      $t: key => key,
      $store: { commit: jest.fn() },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({ data: { assets: { createFolder: { responseResult: { succeeded: true } } } } }),
        queries: { folders: { refetch: jest.fn().mockResolvedValue({ data: { assets: { folders: [folder] } } }) } }
      }
    }
    context.downFolder = component.methods.downFolder.bind(context)
    await component.methods.createFolder.call(context)
    expect(context.currentFolderId).toBe(42)
    expect(context.$store.commit).toHaveBeenCalledWith('editor/pushMediaFolderTree', folder)

    context.currentFolderId = 7
    context.newFolderName = 'new-folder'
    context.newFolderDialog = true
    context.$apollo.mutate.mockResolvedValueOnce({ data: { assets: { createFolder: { responseResult: { succeeded: false, message: 'exists' } } } } })
    await component.methods.createFolder.call(context)
    expect(context.currentFolderId).toBe(7)
    expect(context.newFolderDialog).toBe(true)
    expect(context.newFolderName).toBe('new-folder')
    expect(context.$apollo.queries.folders.refetch).toHaveBeenCalledTimes(1)
  })

  it('selects the current page and preserves selections across pages', async () => {
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
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    Vue.prototype.$store = { state: { user: { permissions: ['manage:system'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = { query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }) }
    const testComponent = {
      ...component,
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: jest.fn() },
        folderTree: () => [],
        currentFolderId: { get: () => 0, set: jest.fn() },
        currentFileId: { get: () => null, set: jest.fn() }
      }
    }
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()

    try {
      const panel = app.$children[0]
      app.$vuetify.breakpoint.smAndUp = true
      panel.assets = Array.from({ length: 25 }, (_, id) => ({
        id: id + 1, filename: `file-${id}.png`, ext: '.png', fileSize: 1, createdAt: null
      }))
      await Vue.nextTick()
      const header = () => app.$el.querySelector('.editor-media-files thead [role=checkbox]')
      const deleteButton = () => app.$el.querySelector('.editor-media-batch-delete')
      expect(header().parentElement.style.width).toBe('56px')
      expect(deleteButton().disabled).toBe(true)
      header().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.selectedAssets).toHaveLength(20)
      expect(header().getAttribute('aria-checked')).toBe('true')
      expect(deleteButton().disabled).toBe(false)

      panel.pagination = 2
      await Vue.nextTick()
      await Vue.nextTick()
      expect(header().getAttribute('aria-checked')).toBe('false')
      app.$el.querySelector('.editor-media-files tbody [role=checkbox]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Vue.nextTick()
      await Vue.nextTick()
      expect(panel.selectedAssets).toHaveLength(21)
      expect(header().getAttribute('aria-checked')).toBe('mixed')
      component.watch.currentFolderId.call(panel)
      await Vue.nextTick()
      expect(panel.selectedAssets).toHaveLength(0)
    } finally {
      app.$destroy()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('previews images and opens file actions for the selected asset', async () => {
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
    const previousStore = Vue.prototype.$store
    const previousApollo = Vue.prototype.$apollo
    const current = Vue.observable({ id: null })
    const mutate = jest.fn()
      .mockResolvedValueOnce({ data: { assets: { renameAsset: { responseResult: { succeeded: true } } } } })
      .mockResolvedValueOnce({ data: { assets: { deleteAsset: { responseResult: { succeeded: true } } } } })
    Vue.prototype.$store = { state: { user: { permissions: ['manage:system'] } }, set: jest.fn(), commit: jest.fn() }
    Vue.prototype.$apollo = {
      query: jest.fn().mockResolvedValue({ data: { assets: { folders: [] } } }),
      mutate,
      queries: { assets: { refetch: jest.fn().mockResolvedValue({}) } }
    }
    const testComponent = {
      ...component,
      components: {
        ...component.components,
        VCardChin: { render(h) { return h('div', this.$slots.default) } }
      },
      computed: {
        ...component.computed,
        activeModal: { get: () => '', set: jest.fn() },
        folderTree: () => [],
        currentFolderId: { get: () => 0, set: jest.fn() },
        currentFileId: { get: () => current.id, set: id => { current.id = id } }
      }
    }
    const root = document.createElement('div')
    root.setAttribute('data-app', 'true')
    document.body.appendChild(root)
    const app = new Vue({
      vuetify: new Vuetify(),
      i18n: new VueI18Next(locale),
      render: h => h(testComponent, { props: { management: true } })
    }).$mount()
    root.appendChild(app.$el)

    try {
      const panel = app.$children[0]
      app.$vuetify.breakpoint.smAndUp = true
      const files = [
        { id: 11, filename: 'first.png', kind: 'IMAGE', ext: '.png', fileSize: 1, createdAt: null },
        { id: 22, filename: 'second.png', kind: 'IMAGE', ext: '.png', fileSize: 1, createdAt: null },
        { id: 33, filename: 'file.txt', kind: 'BINARY', ext: '.txt', fileSize: 1, createdAt: null }
      ]
      panel.assets = files
      panel.selectedAssets = files
      await Vue.nextTick()
      const rows = () => app.$el.querySelectorAll('.editor-media-files tbody tr')
      expect(app.$el.querySelector('.editor-media-batch-delete').getAttribute('aria-label')).toBe('批量删除文件')
      rows()[1].querySelector('.editor-media-preview-button').click()
      expect(panel.previewDialog).toBe(true)
      expect(panel.currentFileId).toBe(22)
      await Vue.nextTick()
      await Vue.nextTick()
      await Vue.nextTick()
      expect(document.querySelector('.editor-media-preview-dialog img').getAttribute('src')).toBe(`${window.location.origin}/second.png`)
      expect(document.querySelector('.editor-media-preview-dialog .v-card__actions')).toBeNull()
      expect(rows()[2].querySelector('.editor-media-preview-button')).toBeNull()
      panel.previewDialog = false
      await Vue.nextTick()

      rows()[1].querySelector('.editor-media-actions button').click()
      expect(panel.currentFileId).toBe(22)
      await Vue.nextTick()
      const actionsMenu = document.querySelector('.v-menu__content.menuable__content__active')
      expect(actionsMenu.querySelectorAll('.v-list-item')).toHaveLength(2)
      expect(actionsMenu.textContent).toContain('复制链接')
      expect(actionsMenu.querySelectorAll('.v-list-item')[1].$clipboards.text()).toBe('https://wiki.example.com/base/second.png')
      actionsMenu.querySelector('.v-list-item').click()
      await Vue.nextTick()
      expect(panel.renameDialog).toBe(true)
      expect(panel.renameAssetName).toBe('second.png')
      panel.renameAssetName = 'renamed.png'
      await panel.renameAsset()
      expect(mutate.mock.calls[0][0].variables).toEqual({ id: 22, filename: 'renamed.png' })
      expect(panel.renameDialog).toBe(false)

      panel.openDeleteDialog(files[0])
      expect(panel.deleteDialog).toBe(true)
      expect(panel.currentAsset.filename).toBe('first.png')
      expect(panel.currentFileId).toBe(11)
      expect(mutate).toHaveBeenCalledTimes(1)
      panel.deleteDialog = false
      await Vue.nextTick()
      expect(mutate).toHaveBeenCalledTimes(1)
      panel.openDeleteDialog(files[0])
      await panel.deleteAsset()
      expect(mutate.mock.calls[1][0].variables).toEqual({ id: 11 })
      expect(panel.selectedAssets.map(asset => asset.id)).toEqual([22, 33])
      await Vue.nextTick()
      app.$el.querySelector('.editor-media-batch-delete').click()
      expect(panel.batchDeleteDialog).toBe(true)
      expect(mutate).toHaveBeenCalledTimes(2)
      panel.batchDeleteDialog = false
      await Vue.nextTick()
      expect(mutate).toHaveBeenCalledTimes(2)
    } finally {
      app.$destroy()
      root.remove()
      Vue.prototype.$store = previousStore
      Vue.prototype.$apollo = previousApollo
    }
  })

  it('encodes folder and file names in the asset download URL', () => {
    const component = loadComponent()
    const url = component.computed.currentAssetUrl.call({
      folderTree: [{ slug: '业务 中台' }, { slug: 'a&b' }],
      currentAsset: { filename: '图片 #1.png' }
    })
    expect(url).toBe(`${window.location.origin}/%E4%B8%9A%E5%8A%A1%20%E4%B8%AD%E5%8F%B0/a%26b/%E5%9B%BE%E7%89%87%20%231.png`)
    expect(component.methods.assetPublicUrl.call({
      folderTree: [{ slug: '业务 中台' }, { slug: 'a&b' }]
    }, { filename: '图片 #1.png' })).toBe('https://wiki.example.com/base/%E4%B8%9A%E5%8A%A1%20%E4%B8%AD%E5%8F%B0/a%26b/%E5%9B%BE%E7%89%87%20%231.png')
    expect(loadComponent({}).methods.assetPublicUrl.call({
      folderTree: []
    }, { filename: 'example.png' })).toBe(`${window.location.origin}/example.png`)
  })

  it('reports whether copying an asset link succeeded', () => {
    const component = loadComponent()
    const commit = jest.fn()
    const clearSelection = jest.fn()
    const context = { $store: { commit }, $t: key => key }
    component.methods.onAssetLinkCopied.call(context, { clearSelection })
    component.methods.onAssetLinkCopyError.call(context)
    expect(clearSelection).toHaveBeenCalled()
    expect(commit.mock.calls.map(call => call[1].message)).toEqual([
      'editor:assets.copyLinkSuccess',
      'editor:assets.copyLinkError'
    ])
  })

  it('reports partial batch deletion and retains files that still exist', async () => {
    const component = loadComponent()
    const files = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const context = {
      management: true,
      canManageAssets: true,
      selectedAssets: files,
      currentFileId: 1,
      batchDeleteLoading: false,
      batchDeleteDialog: true,
      $t: (key, values) => ({ key, values }),
      $store: { commit: jest.fn() },
      $apollo: {
        mutate: jest.fn()
          .mockResolvedValueOnce({ data: { assets: { deleteAsset: { responseResult: { succeeded: true } } } } })
          .mockResolvedValueOnce({ data: { assets: { deleteAsset: { responseResult: { succeeded: false } } } } })
          .mockRejectedValueOnce(new Error('network error')),
        queries: { assets: { refetch: jest.fn().mockResolvedValue({ data: { assets: { list: [files[1], files[2]] } } }) } }
      }
    }
    await component.methods.deleteSelectedAssets.call(context)
    expect(context.$apollo.mutate.mock.calls.map(([options]) => options.variables.id)).toEqual([1, 2, 3])
    expect(context.selectedAssets).toEqual([files[1], files[2]])
    expect(context.currentFileId).toBeNull()
    expect(context.$apollo.queries.assets.refetch).toHaveBeenCalledTimes(1)
    expect(context.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: { key: 'editor:assets.deleteSelectedPartial', values: { deleted: 1, failed: 2 } },
      style: 'warning'
    }))
    expect(context.batchDeleteDialog).toBe(false)
    expect(context.batchDeleteLoading).toBe(false)
  })

  it('only deletes a nonempty selection with management permission', async () => {
    const component = loadComponent()
    const context = {
      management: true,
      canManageAssets: false,
      selectedAssets: [{ id: 1 }],
      batchDeleteLoading: false,
      $apollo: { mutate: jest.fn() }
    }
    await component.methods.deleteSelectedAssets.call(context)
    context.canManageAssets = true
    context.selectedAssets = []
    await component.methods.deleteSelectedAssets.call(context)
    expect(context.$apollo.mutate).not.toHaveBeenCalled()
  })

  it('reports successful batch deletion and clears the selection', async () => {
    const component = loadComponent()
    const context = {
      management: true,
      canManageAssets: true,
      selectedAssets: [{ id: 1 }, { id: 2 }],
      batchDeleteLoading: false,
      batchDeleteDialog: true,
      $t: (key, values) => ({ key, values }),
      $store: { commit: jest.fn() },
      $apollo: {
        mutate: jest.fn().mockResolvedValue({ data: { assets: { deleteAsset: { responseResult: { succeeded: true } } } } }),
        queries: { assets: { refetch: jest.fn().mockResolvedValue({ data: { assets: { list: [] } } }) } }
      }
    }
    await component.methods.deleteSelectedAssets.call(context)
    expect(context.selectedAssets).toEqual([])
    expect(context.$store.commit).toHaveBeenCalledWith('showNotification', expect.objectContaining({
      message: { key: 'editor:assets.deleteSelectedSuccess', values: { count: 2 } },
      style: 'success'
    }))
    expect(context.batchDeleteDialog).toBe(false)
  })
})
