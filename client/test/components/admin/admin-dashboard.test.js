/* eslint-env jest */

const fs = require('fs')
const path = require('path')

describe('admin dashboard version card', () => {
  it('does not render the system settings wrench shortcut', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../components/admin/admin-dashboard.vue'), 'utf8')

    expect(source).toContain("{{$t('admin:dashboard.versionLatest')}}")
    expect(source).not.toContain('btn-animate-wrench')
    expect(source).not.toContain("to='system'")
  })
})
