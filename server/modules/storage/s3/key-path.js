const _ = require('lodash')

function normalizeBasePath (basePath) {
  const normalized = _.trim(basePath || '').replace(/^\/+|\/+$/g, '')
  return normalized ? `${normalized}/` : ''
}

function getObjectKey (basePath, objectPath) {
  const normalizedObjectPath = String(objectPath || '').trim().replace(/^\/+/g, '')
  return `${normalizeBasePath(basePath)}${normalizedObjectPath}`
}

module.exports = {
  getObjectKey,
  normalizeBasePath
}
