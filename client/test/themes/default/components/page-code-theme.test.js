/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const sass = require('sass')

describe('default theme code blocks', () => {
  it('hides heading anchor symbols without removing heading targets', () => {
    const clientPath = path.resolve(__dirname, '../../../..')
    const scssPath = path.join(clientPath, 'scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const theme = fs.readFileSync(path.join(clientPath, 'themes/default/scss/app.scss'), 'utf8')
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${theme}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.innerHTML = '<main class="v-main"><div class="contents"><h3 id="heading"><a class="toc-anchor" href="#heading">¶</a>Heading</h3></div></main>'
    document.body.appendChild(root)
    try {
      const heading = root.querySelector('h3')
      const anchor = heading.querySelector('.toc-anchor')
      expect(getComputedStyle(anchor).display).toBe('none')
      expect(style.textContent).not.toMatch(/h3:hover\s+\.toc-anchor/)
      expect(heading.id).toBe('heading')
    } finally {
      root.remove()
      style.remove()
    }
  })

  it('scales Mermaid SVG height with its width', () => {
    const clientPath = path.resolve(__dirname, '../../../..')
    const scssPath = path.join(clientPath, 'scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const theme = fs.readFileSync(path.join(clientPath, 'themes/default/scss/app.scss'), 'utf8')
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${theme}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.innerHTML = '<main class="v-main"><div class="contents"><div class="mermaid"><svg viewBox="0 0 1000 800" height="800"></svg></div></div></main>'
    document.body.appendChild(root)
    try {
      expect(getComputedStyle(root.querySelector('svg')).height).toBe('auto')
    } finally {
      root.remove()
      style.remove()
    }
  })

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
    root.innerHTML = '<main class="v-main"><div class="contents"><div class="code-toolbar"><pre class="prismjs line-numbers language-sql"><code class="language-sql"><span class="token keyword">SELECT</span> <span class="token string">value</span></code></pre><div class="toolbar"><div class="toolbar-item"><button class="prism-copy-button"></button></div></div></div><pre class="prismjs"><code>plain code</code></pre></div></main>'
    document.body.appendChild(root)
    const pre = root.querySelector('pre')
    const code = root.querySelector('code')
    const keyword = root.querySelector('.keyword')
    const string = root.querySelector('.string')
    const button = root.querySelector('button')
    const plainCode = root.querySelectorAll('pre')[1].querySelector('code')

    try {
      expect(getComputedStyle(pre).backgroundColor).toBe('rgb(244, 247, 250)')
      expect(getComputedStyle(code).color).toBe('rgb(36, 41, 47)')
      expect(getComputedStyle(code).textShadow).toBe('none')
      expect(getComputedStyle(keyword).color).toBe('rgb(5, 80, 174)')
      expect(getComputedStyle(string).color).toBe('rgb(31, 77, 122)')
      expect(getComputedStyle(button).width).toBe('32px')
      expect(getComputedStyle(pre).maxHeight).toBe('calc(40.25rem + 2px)')
      expect(getComputedStyle(pre).overflow).toBe('auto')
      expect(getComputedStyle(plainCode).backgroundColor).toBe('transparent')
      expect(getComputedStyle(plainCode).padding).toBe('0px')
      expect(getComputedStyle(plainCode).lineHeight).toBe('1.5')

      root.className = 'theme--dark'
      expect(getComputedStyle(pre).backgroundColor).not.toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(code).color).toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(keyword).color).not.toBe('rgb(5, 80, 174)')
      expect(getComputedStyle(pre).maxHeight).toBe('calc(40.25rem + 2px)')
    } finally {
      root.remove()
      style.remove()
    }
  })

  it('presents light document tables and plain quotes without changing callouts', () => {
    const clientPath = path.resolve(__dirname, '../../../..')
    const scssPath = path.join(clientPath, 'scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const theme = fs.readFileSync(path.join(clientPath, 'themes/default/scss/app.scss'), 'utf8')
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${theme}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'theme--light'
    root.innerHTML = '<main class="v-main"><div class="contents"><div><h2>Heading</h2><blockquote><p>Quote</p></blockquote><blockquote class="is-info"><p>Info</p></blockquote><div class="table-container"><table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody><tr><td><code>field_name</code></td><td>Value</td></tr><tr><td>Other</td><td>Value</td></tr></tbody></table></div><figure class="table"><table><tbody><tr><td>Figure</td></tr></tbody></table></figure></div></div></main>'
    document.body.appendChild(root)

    try {
      expect(getComputedStyle(root.querySelector('h2')).color).toBe('rgb(48, 57, 67)')
      expect(getComputedStyle(root.querySelector('blockquote')).borderLeftWidth).toBe('3px')
      expect(getComputedStyle(root.querySelector('blockquote')).backgroundColor).toBe('rgb(241, 246, 251)')
      expect(getComputedStyle(root.querySelector('.is-info')).borderLeftWidth).toBe('55px')
      expect(getComputedStyle(root.querySelector('.table-container')).overflowX).toBe('auto')
      expect(getComputedStyle(root.querySelector('table')).width).toBe('100%')
      expect(getComputedStyle(root.querySelector('th')).backgroundColor).toBe('rgb(241, 246, 251)')
      expect(getComputedStyle(root.querySelector('th')).borderRightWidth).toBe('1px')
      expect(getComputedStyle(root.querySelector('td')).borderRightWidth).toBe('1px')
      expect(getComputedStyle(root.querySelector('th:last-child')).borderRightWidth).toBe('0px')
      expect(getComputedStyle(root.querySelector('tbody tr:nth-child(2) td:nth-child(2)')).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(getComputedStyle(root.querySelector('figure.table')).overflowX).toBe('auto')
      expect(getComputedStyle(root.querySelector('td code')).overflowWrap).toBe('anywhere')
    } finally {
      root.remove()
      style.remove()
    }
  })

  it('aligns numbered list markers with the first line of paragraph content', () => {
    const clientPath = path.resolve(__dirname, '../../../..')
    const scssPath = path.join(clientPath, 'scss')
    const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
    const theme = fs.readFileSync(path.join(clientPath, 'themes/default/scss/app.scss'), 'utf8')
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${theme}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'theme--light'
    root.innerHTML = '<main class="v-main"><div class="contents"><ol><li><p>First line<br><code>mysql&gt; use mysql</code><br>Database changed</p></li><li><p>Next item</p><ol><li><p>Nested item</p></li></ol></li></ol><ul><li><p>Unordered item</p></li></ul></div></main>'
    document.body.appendChild(root)

    try {
      const paragraphs = root.querySelectorAll('ol > li > p')
      paragraphs.forEach(paragraph => expect(getComputedStyle(paragraph).display).toBe('block'))
      expect(getComputedStyle(root.querySelector('ul > li > p')).display).toBe('inline-block')
    } finally {
      root.remove()
      style.remove()
    }
  })
})
