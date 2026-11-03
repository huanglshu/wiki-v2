const { getStorageStatusMessage } = require('../../../helpers/storage-status')

describe('modules/storage/status', () => {
  it('falls back when a persisted status message is null', () => {
    expect(getStorageStatusMessage(null)).toBe('Initializing...')
  })

  it('preserves an actual error message', () => {
    expect(getStorageStatusMessage('Connection refused')).toBe('Connection refused')
  })
})
