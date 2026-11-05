/* eslint-env jest */

const fs = require('fs')
const path = require('path')

describe('admin back to site navigation', () => {
  it('links to the site home instead of the configured post-login page', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../components/common/nav-header.vue'), 'utf8')

    expect(source).toContain("v-btn.nav-header-back-to-site(v-else, text, tile, height='64', href='/', :aria-label='$t(`common:header.backToSite`)')")
    expect(source).not.toContain(":href='loginRedirect'")
  })
})
