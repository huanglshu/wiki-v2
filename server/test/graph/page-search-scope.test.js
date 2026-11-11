/* eslint-env jest */

jest.mock('../../helpers/search-lines', () => ({
  queryPageLineMatches: jest.fn()
}))

const { queryPageLineMatches } = require('../../helpers/search-lines')
const page = require('../../graph/resolvers/page')

describe('page search scopes', () => {
  const context = { req: { user: { id: 1 } } }
  const results = [
    { path: 'docs/allowed', locale: 'zh', tags: [] },
    { path: 'docs/private', locale: 'zh', tags: [] }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.WIKI = {
      data: {
        searchEngine: {
          query: jest.fn().mockResolvedValue({ results, suggestions: [], totalHits: 2 })
        }
      },
      auth: { checkAccess: jest.fn((user, permissions, target) => target.path !== 'docs/private') }
    }
    queryPageLineMatches.mockResolvedValue({ results, suggestions: [], totalHits: 2 })
  })

  afterEach(() => {
    delete global.WIKI
  })

  it('checks page permissions for scoped results', async () => {
    const args = { query: 'needle', scope: 'folder', path: 'docs', locale: 'zh' }
    const response = await page.PageQuery.search(null, args, context)

    expect(queryPageLineMatches).toHaveBeenCalledWith('needle', args)
    expect(response.results).toEqual([results[0]])
    expect(response.totalHits).toBe(1)
  })

  it('keeps global queries on the configured search engine', async () => {
    const args = { query: 'needle', scope: 'global' }
    const response = await page.PageQuery.search(null, args, context)

    expect(global.WIKI.data.searchEngine.query).toHaveBeenCalledWith('needle', args)
    expect(queryPageLineMatches).not.toHaveBeenCalled()
    expect(response.results).toEqual([results[0]])
  })
})
