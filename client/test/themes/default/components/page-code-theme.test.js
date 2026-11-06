/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const sass = require('sass')

describe('default theme code blocks', () => {
  it('uses readable light colors without changing the dark theme', () => {
    const clientPath = path.resolve(__dirname, '../../../..')
    const scssPath = path.join(clientPath, 'scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const theme = fs.readFileSync(path.join(clientPath, 'themes/default/scss/app.scss'), 'utf8')
    const prism = fs.readFileSync(require.resolve('prismjs/themes/prism-twilight.css'), 'utf8')
    const style = document.createElement('style')
    style.textContent = `${prism}\n${sass.renderSync({
      data: `${globals}\n${theme}`,
      includePaths: [scssPath]
    }).css.toString()}`
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'theme--light'
    root.innerHTML = '<main class="v-main"><div class="contents"><div class="code-toolbar"><pre class="prismjs line-numbers language-sql"><code class="language-sql"><span class="token keyword">SELECT</span> <span class="token string">value</span></code></pre><div class="toolbar"><div class="toolbar-item"><button class="prism-copy-button"></button></div></div></div></div></main>'
    document.body.appendChild(root)
    const pre = root.querySelector('pre')
    const code = root.querySelector('code')
    const keyword = root.querySelector('.keyword')
    const string = root.querySelector('.string')
    const button = root.querySelector('button')

    try {
      expect(getComputedStyle(pre).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(code).color).toBe('rgb(36, 41, 47)')
      expect(getComputedStyle(code).textShadow).toBe('none')
      expect(getComputedStyle(keyword).color).toBe('rgb(5, 80, 174)')
      expect(getComputedStyle(string).color).toBe('rgb(17, 99, 41)')
      expect(getComputedStyle(button).width).toBe('32px')

      root.className = 'theme--dark'
      expect(getComputedStyle(pre).backgroundColor).not.toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(code).color).toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(keyword).color).not.toBe('rgb(5, 80, 174)')
    } finally {
      root.remove()
      style.remove()
    }
  })
})
