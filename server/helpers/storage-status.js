const _ = require('lodash')

function getStorageStatusMessage (message, fallback = 'Initializing...') {
  if (_.isNil(message) || _.trim(String(message)).length === 0) {
    return fallback
  }
  return String(message)
}

module.exports = {
  getStorageStatusMessage
}
