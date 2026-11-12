/* eslint-env jest */

const { withSearchIndexWrite, markSearchIndexDirty } = require('../../helpers/search-index-write')

describe('search index write fencing', () => {
  let engine

  beforeEach(() => {
    engine = {
      key: 'elasticsearch',
      acquireWriteLock: jest.fn().mockResolvedValue('owner'),
      releaseWriteLock: jest.fn().mockResolvedValue(),
      invalidateLineIndex: jest.fn().mockResolvedValue()
    }
    global.WIKI = { data: { searchEngine: engine }, logger: { error: jest.fn() } }
  })

  afterEach(() => {
    delete global.WIKI
  })

  it('holds a single lock through nested writes', async () => {
    const result = await withSearchIndexWrite(async () => {
      markSearchIndexDirty()
      return withSearchIndexWrite(async () => 'done')
    })
    expect(result).toBe('done')
    expect(engine.acquireWriteLock).toHaveBeenCalledTimes(1)
    expect(engine.releaseWriteLock).toHaveBeenCalledWith('owner')
    expect(engine.invalidateLineIndex).not.toHaveBeenCalled()
  })

  it('invalidates before unlocking when a dirty write fails', async () => {
    await expect(withSearchIndexWrite(async () => {
      markSearchIndexDirty()
      throw new Error('write failed')
    })).rejects.toThrow('write failed')
    expect(engine.invalidateLineIndex).toHaveBeenCalledTimes(1)
    expect(engine.releaseWriteLock).toHaveBeenCalledWith('owner')
    expect(engine.invalidateLineIndex.mock.invocationCallOrder[0]).toBeLessThan(engine.releaseWriteLock.mock.invocationCallOrder[0])
  })

  it('keeps the lock when index invalidation fails', async () => {
    engine.invalidateLineIndex.mockRejectedValue(new Error('ES offline'))
    await expect(withSearchIndexWrite(async () => {
      markSearchIndexDirty()
      throw new Error('write failed')
    })).rejects.toThrow('write failed')
    expect(engine.releaseWriteLock).not.toHaveBeenCalled()
    expect(global.WIKI.logger.error).toHaveBeenCalled()
  })

  it('releases the lock without invalidation when validation fails before a write', async () => {
    await expect(withSearchIndexWrite(async () => {
      throw new Error('invalid input')
    })).rejects.toThrow('invalid input')
    expect(engine.invalidateLineIndex).not.toHaveBeenCalled()
    expect(engine.releaseWriteLock).toHaveBeenCalledWith('owner')
  })

  it('does not acquire a lock for other search engines', async () => {
    engine.key = 'db'
    await withSearchIndexWrite(async () => 'done')
    expect(engine.acquireWriteLock).not.toHaveBeenCalled()
  })
})
