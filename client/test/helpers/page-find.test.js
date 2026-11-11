/* eslint-env jest */

const { clearPageFindHighlights, highlightPageFind } = require('../../helpers/page-find')

describe('document find highlights', () => {
  it('finds case-insensitive matches across inline formatting and keeps links intact', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p><a href="/docs"><strong>Lo</strong>gin</a> and LOGIN</p>'
    const link = container.querySelector('a')
    const matches = highlightPageFind(container, 'login')

    expect(matches).toHaveLength(2)
    expect(matches.map(group => group.map(mark => mark.textContent).join(''))).toEqual(['Login', 'LOGIN'])
    expect(link.contains(matches[0][0])).toBe(true)
    clearPageFindHighlights(container)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(container.querySelector('a')).toBe(link)
    expect(container.textContent).toBe('Login and LOGIN')
  })

  it('treats search input literally, skips hidden content and does not match across blocks', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>A.b Axb</p><p hidden>A.b</p><div style="display:none"><p>A.b</p></div><p>A</p><p>.b</p>'

    const matches = highlightPageFind(container, 'A.b')
    expect(matches).toHaveLength(1)
    expect(matches[0][0].textContent).toBe('A.b')
    clearPageFindHighlights(container)
    expect(highlightPageFind(container, '')).toEqual([])
  })

  it('keeps consecutive matches in their original order across text nodes', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>foo<strong>foo</strong>foo</p>'
    const matches = highlightPageFind(container, 'foo')
    expect(matches).toHaveLength(3)
    expect(matches.map(group => group[0])).toEqual(Array.from(container.querySelectorAll('mark')))
  })
})
