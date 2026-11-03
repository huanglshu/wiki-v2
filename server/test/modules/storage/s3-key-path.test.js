const { getObjectKey, normalizeBasePath } = require('../../../modules/storage/s3/key-path')

describe('modules/storage/s3/key-path', () => {
  it('keeps objects at the bucket root when no base path is set', () => {
    expect(normalizeBasePath('')).toBe('')
    expect(getObjectKey('', 'home.md')).toBe('home.md')
  })

  it('normalizes slashes in the configured base path', () => {
    expect(normalizeBasePath('/wiki/content/')).toBe('wiki/content/')
    expect(getObjectKey('/wiki/content/', '/folder/home.md')).toBe('wiki/content/folder/home.md')
  })

  it('coerces non-string object paths without throwing', () => {
    expect(getObjectKey('wiki', 123)).toBe('wiki/123')
  })
})
