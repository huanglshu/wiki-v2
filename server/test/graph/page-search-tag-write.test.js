/* eslint-env jest */

const page = require('../../graph/resolvers/page')

describe('tag changes and search indexing', () => {
  let engine
  let tags

  beforeEach(() => {
    engine = {
      key: 'elasticsearch',
      acquireWriteLock: jest.fn().mockResolvedValue('owner'),
      releaseWriteLock: jest.fn().mockResolvedValue(),
      invalidateLineIndex: jest.fn().mockResolvedValue(),
      rebuild: jest.fn().mockResolvedValue()
    }
    tags = {
      findById: jest.fn(),
      deleteById: jest.fn().mockResolvedValue(1)
    }
    global.WIKI = {
      data: { searchEngine: engine },
      models: { tags: { query: () => tags } },
      logger: { error: jest.fn() }
    }
  })

  afterEach(() => {
    delete global.WIKI
  })

  it('holds the search lock until deleted tags have been reindexed', async () => {
    const unrelate = jest.fn().mockResolvedValue()
    tags.findById.mockResolvedValue({ $relatedQuery: () => ({ unrelate }) })
    const response = await page.PageMutation.deleteTag(null, { id: 1 }, {})
    expect(response.responseResult.succeeded).toBe(true)
    expect(unrelate).toHaveBeenCalled()
    expect(engine.rebuild).toHaveBeenCalled()
    expect(engine.rebuild.mock.invocationCallOrder[0]).toBeLessThan(engine.releaseWriteLock.mock.invocationCallOrder[0])
  })

  it('invalidates the search index when tag reindexing fails', async () => {
    tags.findById.mockReturnValue({ patch: jest.fn().mockResolvedValue(1) })
    engine.rebuild.mockRejectedValue(new Error('rebuild failed'))
    const response = await page.PageMutation.updateTag(null, { id: 1, tag: 'secret', title: 'Secret' }, {})
    expect(response.responseResult.succeeded).toBe(false)
    expect(engine.invalidateLineIndex).toHaveBeenCalled()
    expect(engine.invalidateLineIndex.mock.invocationCallOrder[0]).toBeLessThan(engine.releaseWriteLock.mock.invocationCallOrder[0])
  })
})
