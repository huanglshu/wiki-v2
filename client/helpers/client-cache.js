/**
 * Clear user-specific client state before changing the active session.
 */
export default async function clearClientCache () {
  try {
    if (window.graphQL) {
      await window.graphQL.clearStore()
    }
  } catch (err) {
    console.error(err)
  }

  try {
    window.localStorage.clear()
    window.sessionStorage.clear()
  } catch (err) {
    console.error(err)
  }

  try {
    if (window.caches) {
      const cacheKeys = await window.caches.keys()
      await Promise.all(cacheKeys.map(cacheKey => window.caches.delete(cacheKey)))
    }
  } catch (err) {
    console.error(err)
  }
}
