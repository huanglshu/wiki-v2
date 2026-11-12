/* eslint-env jest */

const fs = require('fs')
const path = require('path')

describe('default theme footer', () => {
  it('renders the shlin powered-by text without the Wiki.js link', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../themes/default/components/nav-footer.vue'), 'utf8')

    expect(source).toContain('Powered by shlin')
    expect(source).not.toContain('https://wiki.js.org')
  })
})
