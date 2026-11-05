/* eslint-env jest */

const fs = require('fs')
const path = require('path')

describe('editor conflict label', () => {
  it('uses the editor conflict translation instead of a hard-coded label', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../components/editor.vue'), 'utf8')

    expect(source).toContain("{{ $t('editor:conflict.title') }}")
    expect(source).not.toMatch(/\bConflict\b(?![^\n]*\$t)/)
  })
})
