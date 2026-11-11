/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
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

  it('renders line-by-line IDE style search rows with highlight mark and right-aligned doc + line number', () => {
    expect(source).toContain('.search-result-line(')
    expect(source).toContain('mark.search-highlight(')
    expect(source).toContain('span.search-result-line__doc(')
    expect(source).toContain('span.search-result-line__lineno(')
  })
})
