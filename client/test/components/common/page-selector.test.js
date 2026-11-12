/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')

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

describe('page selector actions', () => {
  it('keeps the two actions grouped and preserves their handlers', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const footer = root.querySelector('v-card-chin.page-selector-footer')
    const buttons = footer.querySelectorAll('v-btn.page-selector-action')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].getAttribute('@click')).toBe('close')
    expect(buttons[0].hasAttribute('outlined')).toBe(true)
    expect(buttons[0].classList.contains('page-selector-action--cancel')).toBe(true)
    expect(buttons[1].getAttribute('@click')).toBe('open')
    expect(buttons[1].getAttribute(':disabled')).toBe('!isValidPath')
    expect([...buttons].map(button => button.querySelector('v-icon').getAttribute('size'))).toEqual(['18', '18'])

    const css = sass.renderSync({ data: sfc.styles[0].content }).css.toString()
    expect(css).toMatch(/\.page-selector-footer \.v-card__actions\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(css).toMatch(/\.page-selector-footer \.v-card__actions\s*\{[^}]*gap:\s*8px/)
    expect(css).toMatch(/\.page-selector-action \.v-btn__content\s*\{[^}]*gap:\s*6px/)
    expect(css).toMatch(/\.page-selector-action--cancel \.v-btn__content > span\s*\{[^}]*transform:\s*translateY\(1px\)/)
  })
})

describe('new page default path', () => {
  const component = componentModule.exports.default
  let vm

  beforeEach(() => {
    jest.useFakeTimers()
    vm = {
      mode: 'create',
      path: '',
      initialFolder: '文档/指南',
      currentLocale: 'zh',
      locale: 'zh',
      currentPath: '',
      currentNode: [0],
      folderSelectionRequest: 0,
      isShown: true,
      $t: key => key === 'common:pageSelector.newPagePath' ? '新页面' : key,
      $i18n: { i18next: { getResource: () => '新页面' } },
      $refs: { pathIpt: { focus: jest.fn() } },
      $nextTick: jest.fn().mockResolvedValue(),
      selectInitialFolder: jest.fn().mockResolvedValue()
    }
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('starts in the current folder and recalculates it on reopening', async () => {
    await component.watch.isShown.call(vm, true, false)
    expect(vm.currentPath).toBe('文档/指南/新页面')
    expect(vm.selectInitialFolder).toHaveBeenCalledWith('文档/指南', '文档/指南/新页面', 1)
    vm.initialFolder = '其他目录'
    await component.watch.isShown.call(vm, true, false)
    expect(vm.currentPath).toBe('其他目录/新页面')
  })

  it('keeps the root default without adding a slash', async () => {
    vm.initialFolder = ''
    await component.watch.isShown.call(vm, true, false)
    expect(vm.currentPath).toBe('新页面')
  })

  it('does not change explicit paths used by other selector actions', async () => {
    vm.path = 'docs/copied-page'
    await component.watch.isShown.call(vm, true, false)
    expect(vm.currentPath).toBe('docs/copied-page')
  })

  it('sets the default after the locale reset has completed', async () => {
    vm.locale = 'en'
    vm.$nextTick.mockImplementation(async () => { vm.currentPath = 'reset' })
    await component.watch.isShown.call(vm, true, false)
    expect(vm.currentLocale).toBe('en')
    expect(vm.currentPath).toBe('文档/指南/新页面')
  })
})

describe('initial folder selection', () => {
  const component = componentModule.exports.default
  let vm

  beforeEach(() => {
    vm = {
      currentLocale: 'zh',
      currentPath: '文档/指南/新页面',
      isShown: true,
      folderSelectionRequest: 1,
      currentNode: [0],
      openNodes: [0],
      tree: [{ id: 0, children: [] }],
      fetchFolders: jest.fn(async item => {
        if (item.id === 0) {
          item.children = [{ id: 10, path: '文档', children: [] }]
        } else if (item.id === 10) {
          item.children = [{ id: 11, path: '文档/指南', children: [] }]
        } else {
          item.children = undefined
        }
      })
    }
  })

  it('opens the ancestor folders and selects the current folder', async () => {
    await component.methods.selectInitialFolder.call(vm, '文档/指南', vm.currentPath, 1)
    expect(vm.fetchFolders).toHaveBeenCalledTimes(3)
    expect(vm.openNodes).toEqual([0, 10, 11])
    expect(vm.currentNode).toEqual([11])
  })

  it('does not override a path edited while folders are loading', async () => {
    vm.fetchFolders.mockImplementation(async item => {
      item.children = [{ id: 10, path: '文档', children: [] }]
      vm.currentPath = '用户输入的路径'
    })
    await component.methods.selectInitialFolder.call(vm, '文档/指南', '文档/指南/新页面', 1)
    expect(vm.currentNode).toEqual([0])
    expect(vm.currentPath).toBe('用户输入的路径')
  })

  it('does not select a folder after the dialog is closed or reopened', async () => {
    vm.fetchFolders.mockImplementation(async item => {
      item.children = [{ id: 10, path: '文档', children: [] }]
      vm.folderSelectionRequest = 2
    })
    await component.methods.selectInitialFolder.call(vm, '文档/指南', vm.currentPath, 1)
    expect(vm.currentNode).toEqual([0])
  })

  it('does not apply folder results after the initial selection becomes stale', async () => {
    const root = { id: 0, children: [] }
    const context = {
      currentLocale: 'zh',
      searchLoading: false,
      pages: [],
      all: [],
      $apollo: { query: jest.fn().mockResolvedValue({
        data: { pages: { tree: [{ id: 10, path: '文档', isFolder: true }] } }
      }) }
    }
    await component.methods.fetchFolders.call(context, root, () => false)
    expect(root.children).toEqual([])
    expect(context.all).toEqual([])
    expect(context.searchLoading).toBe(false)
  })

  it('clears the loading state if the folder request fails', async () => {
    const context = {
      currentLocale: 'zh',
      searchLoading: false,
      $apollo: { query: jest.fn().mockRejectedValue(new Error('Request failed')) }
    }
    await expect(component.methods.fetchFolders.call(context, { id: 0 })).rejects.toThrow('Request failed')
    expect(context.searchLoading).toBe(false)
  })
})
