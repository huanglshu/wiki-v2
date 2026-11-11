/* eslint-env jest */

const {
  clearSearchHighlights,
  findSearchLocation,
  highlightSearchLocation
} = require('../../helpers/search-location')

describe('search result location', () => {
  it('locates the requested occurrence across formatted content', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>first <strong>matching text</strong></p><p>second <strong>matching text</strong></p>'
    const params = new URLSearchParams({ text: '**matching text**', query: 'matching', occurrence: '1' })

    const range = findSearchLocation(container, params)
    expect(range.toString()).toBe('matching text')
    expect(range.startContainer.parentElement.closest('p').textContent).toBe('second matching text')
  })

  it('finds a table cell from a markdown table row', () => {
    const container = document.createElement('div')
    container.innerHTML = '<table><tr><td>companyCode</td><td>company name</td></tr></table>'
    const params = new URLSearchParams({ text: '| companyCode | company name |', query: 'companyCode' })

    expect(findSearchLocation(container, params).toString()).toBe('companyCode')
  })

  it('finds matching text inside highlighted code', () => {
    const container = document.createElement('div')
    container.innerHTML = '<pre><code><span>const</span> target = true;\n<span>const</span> target = true;</code></pre>'
    const params = new URLSearchParams({ text: 'const target = true;', query: 'target', occurrence: '1' })
    const range = findSearchLocation(container, params)

    expect(range.toString()).toBe('const target = true;')
    expect(range.startOffset).toBe(0)
    expect(range.startContainer.parentElement.previousSibling.nodeValue).toContain('\n')
  })

  it('finds and highlights mixed-case English in a rendered div', () => {
    const container = document.createElement('div')
    container.innerHTML = '<div>Administrator <strong>Login</strong> Type</div>'
    const params = new URLSearchParams({ text: 'Administrator Login Type', query: 'LOGIN' })

    const range = findSearchLocation(container, params)
    expect(range.toString()).toBe('Administrator Login Type')
    expect(highlightSearchLocation(container, range, 'LOGIN').textContent).toBe('Login')
  })

  it('highlights mixed-case English across code formatting', () => {
    const container = document.createElement('div')
    container.innerHTML = '<pre><code><span>LOG</span>inType</code></pre>'
    const params = new URLSearchParams({ text: 'loginType', query: 'login' })

    highlightSearchLocation(container, findSearchLocation(container, params), 'login')
    expect(Array.from(container.querySelectorAll('mark')).map(mark => mark.textContent)).toEqual(['LOG', 'in'])
  })

  it('does not invent a location for text absent from the rendered page', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>other content</p>'
    expect(findSearchLocation(container, new URLSearchParams({ text: 'missing', query: 'missing' }))).toBeNull()
  })

  it('highlights only the selected occurrence and restores its content', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>first matching text</p><p>second <a href="/target">matching text</a></p>'
    const link = container.querySelector('a')
    const params = new URLSearchParams({ text: 'matching text', query: 'matching', occurrence: '1' })
    const range = findSearchLocation(container, params)

    const mark = highlightSearchLocation(container, range, 'matching')
    expect(mark.textContent).toBe('matching')
    expect(container.querySelectorAll('mark')).toHaveLength(1)
    expect(link.contains(mark)).toBe(true)
    expect(container.querySelector('p').textContent).toBe('first matching text')

    clearSearchHighlights(container)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.querySelector('a')).toBe(link)
    expect(link.textContent).toBe('matching text')
  })

  it('highlights a keyword spanning code formatting without removing the formatting', () => {
    const container = document.createElement('div')
    container.innerHTML = '<pre><code><span class="token">tar</span>get = true</code></pre>'
    const params = new URLSearchParams({ text: 'target = true', query: 'target' })
    const range = findSearchLocation(container, params)

    highlightSearchLocation(container, range, 'target')
    const marks = container.querySelectorAll('mark')
    expect(Array.from(marks).map(mark => mark.textContent)).toEqual(['tar', 'get'])
    expect(container.querySelector('.token').textContent).toBe('tar')
    clearSearchHighlights(container)
    expect(container.querySelector('code').textContent).toBe('target = true')
  })

  it('highlights multiple literal search terms only inside the selected line', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>other alpha and beta</p><p>alpha and beta and alpha+</p>'
    const params = new URLSearchParams({ text: 'alpha and beta and alpha+', query: 'alpha+ beta' })
    const range = findSearchLocation(container, params)

    highlightSearchLocation(container, range, 'alpha+ beta')
    expect(Array.from(container.querySelectorAll('mark')).map(mark => mark.textContent)).toEqual(['beta', 'alpha+'])
    expect(container.querySelector('p').querySelector('mark')).toBeNull()
  })

  it('clears previous highlights before highlighting a different occurrence', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>first target</p><p>second target</p>'
    const params = new URLSearchParams({ text: 'target', query: 'target', occurrence: '0' })
    highlightSearchLocation(container, findSearchLocation(container, params), 'target')
    clearSearchHighlights(container)
    params.set('occurrence', '1')
    highlightSearchLocation(container, findSearchLocation(container, params), 'target')

    expect(container.querySelectorAll('mark')).toHaveLength(1)
    expect(container.querySelector('mark').parentElement.textContent).toBe('second target')
  })
})
