const { AsyncLocalStorage } = require('async_hooks')

const writes = new AsyncLocalStorage()

/* global WIKI */

async function withSearchIndexWrite(operation) {
  const engine = WIKI.data && WIKI.data.searchEngine
  if (!engine || engine.key !== 'elasticsearch') {
    return operation()
  }
  const current = writes.getStore()
  if (current && current.engine === engine) {
    return operation()
  }

  const lock = await engine.acquireWriteLock()
  const state = { engine, dirty: false }
  return writes.run(state, async () => {
    try {
      const result = await operation()
      await engine.releaseWriteLock(lock)
      return result
    } catch (err) {
      try {
        if (state.dirty) {
          await engine.invalidateLineIndex()
        }
        await engine.releaseWriteLock(lock)
      } catch (cleanupError) {
        WIKI.logger.error('(SEARCH/ELASTICSEARCH) Search index write lock requires recovery:', cleanupError)
      }
      throw err
    }
  })
}

function markSearchIndexDirty() {
  const state = writes.getStore()
  if (state) {
    state.dirty = true
  }
}

module.exports = { withSearchIndexWrite, markSearchIndexDirty }
