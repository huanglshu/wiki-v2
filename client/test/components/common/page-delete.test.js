/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

const source = fs.readFileSync(path.join(__dirname, '../../../components/common/page-delete.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
const location = { assign: jest.fn() }
const document = { body: { classList: { add: jest.fn(), remove: jest.fn() } } }
const localRequire = name => {
  if (name.startsWith('gql/')) return {}
  return require(name)
}
runInThisContext(`(function (require, module, exports, window, document) {\n${code}\n})`)(
  localRequire, componentModule, componentModule.exports, { location }, document
)
const component = componentModule.exports.default

describe('page deletion navigation', () => {
  let vm

  beforeEach(() => {
    jest.useFakeTimers()
    location.assign.mockClear()
    document.body.classList.add.mockClear()
    document.body.classList.remove.mockClear()
    vm = {
      pagePath: 'directory/current',
      pageLocale: 'zh',
      pageId: 12,
      isShown: true,
      $t: key => key,
      $root: { $emit: jest.fn() },
      $store: { commit: jest.fn() },
      $apollo: {
        query: jest.fn(),
        mutate: jest.fn().mockResolvedValue({ data: { pages: { delete: { responseResult: { succeeded: true } } } } })
      },
      $nextTick: callback => callback()
    }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  async function deletePage (items) {
    vm.$apollo.query.mockResolvedValue({ data: { pages: { tree: items } } })
    await component.methods.deletePage.call(vm)
    await Promise.resolve()
    await Promise.resolve()
    jest.runAllTimers()
  }

  it('opens the first other page in the same directory', async () => {
    await deletePage([
      { path: 'directory/folder', isFolder: true, pageId: null },
      { path: 'directory/current', isFolder: false, pageId: 12 },
      { path: 'directory/first', isFolder: false, pageId: 13 },
      { path: 'directory/second', isFolder: false, pageId: 14 }
    ])

    expect(vm.$apollo.query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { path: 'directory/current', locale: 'zh' },
      fetchPolicy: 'network-only'
    }))
    expect(vm.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 12 } }))
    expect(location.assign).toHaveBeenCalledWith('/zh/directory/first')
  })

  it('uses in-page navigation when the current view handles deletion', async () => {
    vm.$root.$emit.mockImplementation((event, navigation) => { navigation.handled = true })

    await deletePage([
      { path: 'directory/current', isFolder: false, pageId: 12 },
      { path: 'directory/first', isFolder: false, pageId: 13 }
    ])

    expect(vm.$root.$emit).toHaveBeenCalledWith('page-deleted', {
      destination: '/zh/directory/first',
      pageId: 12,
      handled: true
    })
    expect(document.body.classList.remove).toHaveBeenCalledWith('page-deleted-pending', 'page-deleted')
    expect(document.body.classList.add).not.toHaveBeenCalledWith('page-deleted')
    expect(location.assign).not.toHaveBeenCalled()
  })

  it('keeps the original page identity if navigation happens during directory lookup', async () => {
    let resolveTree
    let pending
    vm.$nextTick = callback => { pending = callback() }
    vm.$apollo.query.mockReturnValue(new Promise(resolve => { resolveTree = resolve }))
    await component.methods.deletePage.call(vm)
    vm.pageId = 99
    vm.pageLocale = 'en'
    resolveTree({ data: { pages: { tree: [
      { path: 'directory/current', isFolder: false, pageId: 12 },
      { path: 'directory/first', isFolder: false, pageId: 13 }
    ] } } })
    await pending
    jest.runAllTimers()

    expect(vm.$apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 12 } }))
    expect(vm.$root.$emit).toHaveBeenCalledWith('page-deleted', expect.objectContaining({
      destination: '/zh/directory/first',
      pageId: 12
    }))
  })

  it('returns home when there are no other pages in the directory', async () => {
    await deletePage([
      { path: 'directory/folder', isFolder: true, pageId: 15 },
      { path: 'directory/current', isFolder: false, pageId: 12 }
    ])

    expect(location.assign).toHaveBeenCalledWith('/')
  })

  it('does not delete or navigate when the directory lookup fails', async () => {
    const error = new Error('Directory lookup failed')
    vm.$apollo.query.mockRejectedValue(error)

    await component.methods.deletePage.call(vm)
    await Promise.resolve()
    jest.runAllTimers()

    expect(vm.$apollo.mutate).not.toHaveBeenCalled()
    expect(location.assign).not.toHaveBeenCalled()
    expect(vm.$store.commit).toHaveBeenCalledWith('pushGraphError', error)
  })

  it('does not navigate when deletion fails', async () => {
    vm.$apollo.mutate.mockResolvedValue({
      data: { pages: { delete: { responseResult: { succeeded: false, message: 'Deletion failed' } } } }
    })
    await deletePage([{ path: 'directory/first', isFolder: false, pageId: 13 }])

    expect(location.assign).not.toHaveBeenCalled()
    expect(vm.$store.commit).toHaveBeenCalledWith('pushGraphError', expect.objectContaining({ message: 'Deletion failed' }))
  })
})
