/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')
const Vue = require('vue')

function loadSearchResultsComponent() {
  const source = fs.readFileSync(
    path.join(__dirname, '../../../components/common/search-results.vue'),
    'utf8'
  )
  const sfc = compiler.parseComponent(source)
  const code = babel.transformSync(sfc.script.content, {
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const componentModule = { exports: {} }
  const localRequire = name => {
    if (name === 'vuex-pathify') {
      return { get: () => () => '', sync: () => () => '' }
    }
    if (name === 'epic-spinners') {
      return { OrbitSpinner: {} }
    }
    if (name === 'gql/common/common-pages-query-search.gql') {
      return {}
    }
    if (name === '../../../data/sideload/zh.json' || name === '../../../data/sideload/en.json') {
      return require(`../../../../data/sideload/${name.endsWith('zh.json') ? 'zh' : 'en'}.json`)
    }
    return require(name)
  }
  runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(
    localRequire,
    componentModule,
    componentModule.exports
  )
  return {
    component: componentModule.exports.default,
    source,
    template: sfc.template.content
  }
}

describe('client/components/common/search-results.vue', () => {
  const { component, source, template } = loadSearchResultsComponent()

  it('shows a compact search hint only for queries shorter than two characters', async () => {
    const app = new Vue({
      ...compiler.compileToFunctions(pug.render(template)),
      components: {
        'v-icon': { render(h) { return h('i', this.$slots.default) } }
      },
      data: () => ({
        search: '',
        searchIsFocused: true,
        searchIsLoading: false,
        searchFailed: false,
        folderScopeUnavailable: false,
        results: [],
        suggestions: []
      }),
      methods: component.methods,
      beforeCreate() {
        this.$t = key => key
      }
    }).$mount()
    document.body.appendChild(app.$el)

    try {
      const hint = app.$el.querySelector('.search-results-help')
      expect(hint.textContent).toContain('common:header.searchHint')
      expect(hint.querySelector('i').textContent).toBe('mdi-magnify')
      expect(hint.querySelector('img')).toBeNull()
      app.search = 'a'
      await Vue.nextTick()
      expect(app.$el.querySelector('.search-results-help')).not.toBeNull()
      app.search = 'ab'
      await Vue.nextTick()
      expect(app.$el.querySelector('.search-results-help')).toBeNull()
      const empty = app.$el.querySelector('.search-results-none')
      expect(empty.getAttribute('role')).toBe('status')
      expect(empty.textContent).toContain('common:header.searchNoResult')
      expect(empty.querySelector('i').textContent).toBe('mdi-magnify')
      expect(empty.querySelector('img')).toBeNull()
    } finally {
      app.$destroy()
      app.$el.remove()
    }
  })

  it('closes on blank space without closing when a result is clicked', async () => {
    const goToPage = jest.fn()
    const app = new Vue({
      ...compiler.compileToFunctions(pug.render(template)),
      components: {
        'v-subheader': { render(h) { return h('div', this.$slots.default) } }
      },
      data: () => ({
        search: 'login',
        searchIsFocused: true,
        searchIsLoading: false,
        searchFailed: false,
        folderScopeUnavailable: false,
        results: [{ id: '1:2', title: 'Guide', description: 'login', path: 'guide' }],
        suggestions: [],
        response: { totalHits: 1 },
        paginationLength: 1,
        cursor: 0
      }),
      methods: {
        ...component.methods,
        goToPage
      },
      beforeCreate() {
        this.$t = key => key
      }
    }).$mount()
    document.body.appendChild(app.$el)

    try {
      expect(app.$el.querySelector('button')).toBeNull()
      app.$el.querySelector('.search-result-line__code').click()
      expect(goToPage).toHaveBeenCalledTimes(1)
      expect(app.search).toBe('login')
      expect(app.searchIsFocused).toBe(true)

      app.$el.querySelector('.search-results-container').click()
      expect(app.search).toBe('')
      expect(app.searchIsFocused).toBe(false)
      await Vue.nextTick()

      app.search = 'login'
      app.searchIsFocused = true
      await Vue.nextTick()
      app.$el.click()
      expect(app.search).toBe('')
      expect(app.searchIsFocused).toBe(false)
    } finally {
      app.$destroy()
      app.$el.remove()
    }
  })

  it('extracts line numbers from composite search result ids', () => {
    expect(component.methods.getLineNumber({ id: '21:51' })).toBe('51')
    expect(component.methods.getLineNumber({ id: 'abc-hash' })).toBe('')
  })

  it('paginates search results in groups of 50', () => {
    const items = Array.from({ length: 121 }, (_, index) => ({ id: String(index + 1) }))
    const ctx = {
      ...component.data(),
      response: { results: items, totalHits: items.length }
    }
    expect(ctx.perPage).toBe(50)
    expect(component.computed.paginationLength.call(ctx)).toBe(3)
    expect(component.computed.results.call(ctx)).toEqual(items.slice(0, 50))
    ctx.pagination = 2
    expect(component.computed.results.call(ctx)).toEqual(items.slice(50, 100))
    ctx.pagination = 3
    expect(component.computed.results.call(ctx)).toEqual(items.slice(100))
  })

  it('returns the result list to the top when the displayed results change', () => {
    const list = { scrollTop: 200 }
    const ctx = { cursor: 12, $refs: { resultsList: list }, $nextTick: callback => callback() }
    component.watch.results.call(ctx)
    expect(ctx.cursor).toBe(0)
    expect(list.scrollTop).toBe(0)
  })

  it('keeps the selected result visible during keyboard navigation', () => {
    const list = { scrollTop: 40, getBoundingClientRect: () => ({ top: 100, bottom: 400 }) }
    const below = { getBoundingClientRect: () => ({ top: 390, bottom: 420 }) }
    const above = { getBoundingClientRect: () => ({ top: 80, bottom: 110 }) }
    const ctx = { cursor: 0, $refs: { resultsList: list, resultRows: [below, above] } }
    component.methods.scrollResultIntoView.call(ctx)
    expect(list.scrollTop).toBe(60)
    ctx.cursor = 1
    component.methods.scrollResultIntoView.call(ctx)
    expect(list.scrollTop).toBe(40)
    ctx.cursor = 2
    expect(() => component.methods.scrollResultIntoView.call(ctx)).not.toThrow()
  })

  it('scrolls the selected result after handling keyboard navigation', () => {
    const handlers = {}
    const ctx = {
      cursor: 0,
      results: [{ id: '1' }, { id: '2' }],
      suggestions: [],
      $root: { $on: (event, handler) => { handlers[event] = handler } },
      $nextTick: callback => callback(),
      scrollResultIntoView: jest.fn()
    }
    component.mounted.call(ctx)
    handlers.searchMove('down')
    expect(ctx.cursor).toBe(1)
    expect(ctx.scrollResultIntoView).toHaveBeenCalledTimes(1)
  })

  it('keeps the result frame bounded and scrollable at desktop and mobile sizes', () => {
    const sfc = compiler.parseComponent(source)
    const scssPath = path.join(__dirname, '../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(css).toMatch(/\.search-results-items\s*\{[^}]*max-height:\s*570px;/)
    expect(css).toMatch(/\.search-results-items\s*\{[^}]*overflow-y:\s*auto;/)
    expect(css).toMatch(/\.search-results-items\s*\{[^}]*scrollbar-color:\s*rgba\(255, 255, 255, 0\.32\) transparent;/)
    expect(css).toMatch(/\.search-results-items::-webkit-scrollbar-track\s*\{\s*background:\s*transparent;/)
    expect(css).toMatch(/\.search-results-items::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.32\);/)
    expect(css).toMatch(/\.search-results-items::-webkit-scrollbar-button\s*\{\s*display:\s*none;/)
    expect(css).toContain('max-height: min(570px, calc(100vh - 208px));')
    expect(css).toContain('max-height: min(570px, calc(100vh - 256px));')
    expect(template).toContain("ref='resultsList'")
    expect(template).toContain("tabindex='0'")
  })

  it('clears old results and exposes a search failure', () => {
    const ctx = {
      response: { results: [{ id: '1:2' }], suggestions: ['old'], totalHits: 1 },
      searchIsLoading: true,
      searchFailed: false
    }
    component.apollo.response.error.call(ctx)
    expect(ctx.response).toEqual({ results: [], suggestions: [], totalHits: 0 })
    expect(ctx.searchFailed).toBe(true)
    expect(ctx.searchIsLoading).toBe(false)
    expect(template).toContain("role='alert'")
  })

  it('renders an error instead of stale search results', async () => {
    const app = new Vue({
      ...compiler.compileToFunctions(pug.render(template)),
      components: {
        'v-icon': { render(h) { return h('i', this.$slots.default) } },
        'v-subheader': { render(h) { return h('div', this.$slots.default) } }
      },
      data: () => ({
        search: 'login',
        searchIsFocused: true,
        searchIsLoading: false,
        searchFailed: false,
        folderScopeUnavailable: false,
        results: [],
        suggestions: [],
        response: { results: [{ id: '1:2' }], totalHits: 1 },
        paginationLength: 1,
        cursor: 0
      }),
      methods: component.methods,
      beforeCreate() {
        this.$t = key => key
      }
    }).$mount()

    try {
      component.apollo.response.error.call(app)
      await Vue.nextTick()
      expect(app.$el.querySelector('[role="alert"]').textContent).toContain('common:header.searchUnavailable')
      expect(app.$el.querySelector('.search-results-none').textContent).not.toContain('common:header.searchNoResult')
    } finally {
      app.$destroy()
    }
  })

  it('prompts for a sidebar directory and hides stale results when no folder is selected', () => {
    const app = new Vue({
      ...compiler.compileToFunctions(pug.render(template)),
      components: {
        'v-icon': { render(h) { return h('i', this.$slots.default) } }
      },
      data: () => ({
        search: 'CAS',
        searchIsFocused: true,
        searchIsLoading: false,
        searchFailed: false,
        folderScopeUnavailable: true,
        results: [{ id: 'old', title: 'Old result' }],
        suggestions: ['old'],
        response: { totalHits: 1 }
      }),
      methods: component.methods,
      beforeCreate() {
        this.$t = key => key
      }
    }).$mount()

    try {
      expect(app.$el.querySelector('[role="status"]').textContent).toContain('common:header.searchSelectFolder')
      expect(app.$el.querySelector('.search-results-items')).toBeNull()
      expect(app.$el.textContent).not.toContain('Old result')
    } finally {
      app.$destroy()
    }
  })

  it('includes the search terms for results with or without source line numbers', () => {
    const ctx = {
      search: 'login',
      response: { results: [] },
      getLineNumber: component.methods.getLineNumber
    }
    const lineUrl = component.methods.getResultUrl.call(ctx, {
      id: '21:51', locale: 'en', path: 'guide', description: 'login guide'
    })
    const noLineUrl = component.methods.getResultUrl.call(ctx, {
      id: 'abc-hash', locale: 'en', path: 'guide', description: 'login guide'
    })

    expect(lineUrl).toContain('#search-line=51&')
    expect(new URLSearchParams(noLineUrl.split('#search-')[1]).get('query')).toBe('login')
  })

  it('searches the selected sidebar folder instead of the current page parent', () => {
    const ctx = {
      search: 'CAS',
      searchScope: 'folder',
      searchFolderPath: 'selected/subfolder',
      folderScopeUnavailable: false,
      pagePath: 'another/folder/page',
      pageLocale: 'zh'
    }
    expect(component.apollo.response.variables.call(ctx)).toEqual({
      query: 'CAS',
      scope: 'folder',
      locale: 'zh',
      path: 'selected/subfolder'
    })
    expect(component.apollo.response.skip.call(ctx)).toBe(false)

    ctx.searchFolderPath = ''
    expect(component.apollo.response.variables.call(ctx).path).toBe('')
    expect(component.apollo.response.skip.call(ctx)).toBe(false)

    ctx.searchFolderPath = null
    ctx.folderScopeUnavailable = true
    expect(component.apollo.response.skip.call(ctx)).toBe(true)
  })

  it('keeps global searches independent of the selected folder', () => {
    const ctx = {
      search: 'CAS',
      searchScope: 'global',
      searchFolderPath: 'selected/folder',
      pagePath: 'another/page',
      pageLocale: 'zh'
    }
    expect(component.apollo.response.variables.call(ctx)).toEqual({
      query: 'CAS',
      scope: 'global',
      locale: null,
      path: null
    })
  })

  it('clears old results when the selected folder changes', () => {
    const ctx = {
      search: 'CAS',
      searchScope: 'folder',
      folderScopeUnavailable: false,
      response: { results: [{ id: 'old' }], suggestions: ['old'], totalHits: 1 },
      pagination: 2,
      cursor: 1,
      searchFailed: true
    }
    ctx.resetScopeResults = component.methods.resetScopeResults.bind(ctx)
    component.watch.searchFolderPath.call(ctx)
    expect(ctx.response).toEqual({ results: [], suggestions: [], totalHits: 0 })
    expect(ctx.pagination).toBe(1)
    expect(ctx.searchIsLoading).toBe(true)

    ctx.folderScopeUnavailable = true
    component.watch.searchFolderPath.call(ctx)
    expect(ctx.searchIsLoading).toBe(false)
  })

  it('splits matched line text into highlighted and plain segments without interpreting HTML', () => {
    const ctx = {
      getSearchTerms: component.methods.getSearchTerms,
      clipLineAroundMatch: component.methods.clipLineAroundMatch
    }
    const line = '| primaryField | 赋值：公司代码+合同编号的值；<br>资料唯一键 |'
    const segments = component.methods.getHighlightedSegments.call(ctx, line, '合同')

    expect(segments).toEqual([
      { text: '| primaryField | 赋值：公司代码+', match: false },
      { text: '合同', match: true },
      { text: '编号的值；<br>资料唯一键 |', match: false }
    ])
  })

  it('highlights English search terms regardless of case', () => {
    const ctx = {
      getSearchTerms: component.methods.getSearchTerms,
      clipLineAroundMatch: component.methods.clipLineAroundMatch
    }
    expect(component.methods.getHighlightedSegments.call(ctx, 'Login and LOGIN', 'login')).toEqual([
      { text: 'Login', match: true },
      { text: ' and ', match: false },
      { text: 'LOGIN', match: true }
    ])
  })

  it('renders highlighted matches and the full path on a separate line without a visible line number', () => {
    const result = {
      id: '9:140',
      title: '商品数据处理',
      description: 'CAS match',
      path: '业务中台（ACDP）/运维脚本/初始化-商品数据处理',
      locale: 'zh'
    }
    const app = new Vue({
      ...compiler.compileToFunctions(pug.render(template)),
      components: {
        'v-subheader': { render(h) { return h('div', this.$slots.default) } }
      },
      data: () => ({
        search: 'CAS',
        searchIsFocused: true,
        searchIsLoading: false,
        searchFailed: false,
        folderScopeUnavailable: false,
        results: [result],
        suggestions: [],
        response: { results: [result], totalHits: 1 },
        paginationLength: 1,
        cursor: 0
      }),
      methods: component.methods,
      beforeCreate() {
        this.$t = key => key
      }
    }).$mount()

    try {
      const row = app.$el.querySelector('.search-result-line')
      const code = row.querySelector('.search-result-line__code')
      const doc = row.querySelector('.search-result-line__doc')
      expect(code.textContent).toBe('CAS match')
      expect(doc.textContent).toBe('/业务中台（ACDP）/运维脚本/初始化-商品数据处理')
      expect(code.nextElementSibling).toBe(doc)
      expect(row.getAttribute('title')).toBe(doc.textContent)
      expect(row.querySelector('.search-result-line__lineno')).toBeNull()
      expect(component.methods.getLineNumber(result)).toBe('140')
    } finally {
      app.$destroy()
    }
  })

  it('retains a full readable document path without truncating long paths', () => {
    const sfc = compiler.parseComponent(source)
    const scssPath = path.join(__dirname, '../../../scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const css = sass.renderSync({
      data: `${globals}\n${sfc.styles[0].content}`,
      includePaths: [scssPath]
    }).css.toString()
    expect(source).toContain('.search-result-line(')
    expect(source).toContain('mark.search-highlight(')
    expect(source).toContain('span.search-result-line__doc(')
    expect(source).not.toContain('span.search-result-line__lineno(')
    expect(css).toMatch(/\.search-result-line__doc\s*\{[^}]*white-space:\s*normal;/)
    expect(css).toMatch(/\.search-result-line__doc\s*\{[^}]*overflow-wrap:\s*anywhere;/)
    expect(css).toMatch(/\.search-result-line__doc\s*\{[^}]*color:\s*#89929f;/)
    expect(css).toMatch(/\.search-result-line__doc\s*\{[^}]*font-size:\s*11\.5px;/)
    expect(css).toMatch(/\.search-result-line\.highlighted \.search-result-line__doc\s*\{\s*color:\s*#aeb8c9;/)
    expect(css).toMatch(/\.search-result-line:not\(:first-child\)\s*\{\s*border-top:\s*1px solid rgba\(255, 255, 255, 0\.16\);/)
    expect(component.methods.getResultPath({ path: '/docs/guide' })).toBe('/docs/guide')
  })
})
