const pageHelper = require('../../helpers/page')

describe('helpers/page/getHomeRedirect', () => {
  const groups = {
    1: { id: 1, redirectOnLogin: '/' },
    2: { id: 2, redirectOnLogin: '/zh/首页' },
    3: { id: 3, redirectOnLogin: '/zh/其他页面' }
  }
  const user = { id: 10, groups: [1, 2, 3] }

  beforeEach(() => {
    global.WIKI = { config: { lang: { code: 'zh' } } }
  })

  it('redirects the root and localized home entries to the first configured group', () => {
    expect(pageHelper.getHomeRedirect('/', user, groups)).toBe('/zh/首页')
    expect(pageHelper.getHomeRedirect('/home', user, groups)).toBe('/zh/首页')
    expect(pageHelper.getHomeRedirect('/zh/home', user, groups)).toBe('/zh/首页')
    expect(pageHelper.getHomeRedirect('/', { id: 10, groups: [{ id: 2 }] }, groups)).toBe('/zh/首页')
  })

  it('does not redirect other pages, guests, or users without a configured group', () => {
    expect(pageHelper.getHomeRedirect('/zh/文档', user, groups)).toBeNull()
    expect(pageHelper.getHomeRedirect('/', { id: 2, groups: [2] }, groups)).toBeNull()
    expect(pageHelper.getHomeRedirect('/', { id: 10, groups: [1] }, groups)).toBeNull()
    expect(pageHelper.getHomeRedirect('/', { groups: [2] }, groups)).toBeNull()
    expect(pageHelper.getHomeRedirect('/', null, groups)).toBeNull()
  })

  it('avoids looping when the target is the current home page', () => {
    const homeGroup = { 2: { id: 2, redirectOnLogin: '/zh/home' } }
    expect(pageHelper.getHomeRedirect('/', user, homeGroup)).toBe('/zh/home')
    expect(pageHelper.getHomeRedirect('/home', user, homeGroup)).toBeNull()
    expect(pageHelper.getHomeRedirect('/zh/home', user, homeGroup)).toBeNull()
    expect(pageHelper.getHomeRedirect('/en/home', user, homeGroup)).toBe('/zh/home')
  })

  it('uses the active site locale for the configured home page', () => {
    global.WIKI.config.lang.code = 'en'
    const group = { 2: { id: 2, redirectOnLogin: '/zh/首页?from=login#top' } }

    expect(pageHelper.getHomeRedirect('/', user, group)).toBe('/en/首页?from=login#top')
    expect(pageHelper.getHomeRedirect('/en/首页', user, group)).toBeNull()
  })

  it.each(['/', '/?source=home', '/#top', '/docs/..', '//example.com', '/\\example.com', 'https://example.com'])(
    'rejects a loop or external target: %s',
    target => {
      expect(pageHelper.getHomeRedirect('/', user, { 2: { redirectOnLogin: target } })).toBeNull()
    }
  )
})
