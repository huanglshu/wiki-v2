/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')

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
      return { sync: () => () => '' }
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
    source
  }
}

describe('client/components/common/search-results.vue', () => {
  const { component, source } = loadSearchResultsComponent()

  it('extracts line numbers from composite search result ids', () => {
    expect(component.methods.getLineNumber({ id: '21:51' })).toBe('51')
    expect(component.methods.getLineNumber({ id: 'abc-hash' })).toBe('')
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

  it('renders line-by-line IDE style search rows with highlight mark and right-aligned doc + line number', () => {
    expect(source).toContain('.search-result-line(')
    expect(source).toContain('mark.search-highlight(')
    expect(source).toContain('span.search-result-line__doc(')
    expect(source).toContain('span.search-result-line__lineno(')
  })
})
