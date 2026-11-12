/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const { runInThisContext } = require('vm')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const Prism = require('prismjs')
const Vue = require('vue/dist/vue.common.js')

global.Prism = Prism
require('prismjs/components/prism-markdown')
require('prismjs/plugins/line-numbers/prism-line-numbers')
require('prismjs/plugins/normalize-whitespace/prism-normalize-whitespace')
require('prismjs/plugins/toolbar/prism-toolbar')
require('prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard')

const source = fs.readFileSync(path.join(__dirname, '../../components/source.vue'), 'utf8')
const sfc = compiler.parseComponent(source)
const code = babel.transformSync(sfc.script.content, {
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code
const componentModule = { exports: {} }
runInThisContext(`(function (require, module, exports) {\n${code}\n})`)(
  name => name === 'prismjs' ? Prism : require(name),
  componentModule,
  componentModule.exports
)

describe('source page Prism isolation', () => {
  it('hides raw source until Vue mounts', () => {
    const template = fs.readFileSync(path.join(__dirname, '../../../server/views/source.pug'), 'utf8')
    const html = pug.render(template.replace(/^extends master\.pug\s*\n/, ''), {
      page: {
        id: 1,
        localeCode: 'en',
        path: 'home',
        contentType: 'markdown',
        versionId: 0,
        versionDate: '',
        content: '# Example'
      },
      effectivePermissions: {}
    })
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const root = container.querySelector('#root')
    expect(window.getComputedStyle(root).display).toBe('none')
    expect(root.querySelector('code').textContent).toBe('# Example')

    const app = new Vue({
      el: root,
      components: {
        PageSource: {
          render (h) {
            return h('main', this.$slots.default)
          }
        }
      }
    })
    expect(app.$el.hasAttribute('v-cloak')).toBe(false)
    expect(window.getComputedStyle(app.$el).display).not.toBe('none')
    app.$destroy()
    container.remove()
  })

  it('keeps source controls local and preserves normal page highlighting', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const pre = root.querySelector('.source-code-block')
    pre.innerHTML = '<code>  # Heading\n  text</code>'
    document.body.appendChild(root)

    const hooks = Prism.hooks.all.complete
    const defaults = { ...Prism.plugins.NormalizeWhitespace.defaults }
    const context = { $el: root, $nextTick: callback => callback() }
    componentModule.exports.default.mounted.call(context)

    expect(context.sourceLineCount).toBe(2)
    expect(context.sourceCode).toBe('  # Heading\n  text')
    expect(pre.querySelector('code').textContent).toBe('  # Heading\n  text')
    expect(pre.querySelector('.line-numbers-rows')).not.toBeNull()
    expect(root.querySelector('.code-toolbar .toolbar button')).toBeNull()
    expect(Prism.hooks.all.complete).toBe(hooks)
    expect(Prism.plugins.NormalizeWhitespace.defaults).toEqual(defaults)

    const normal = document.createElement('div')
    normal.innerHTML = '<pre class="line-numbers"><code class="language-markdown"># Normal page\ntext</code></pre>'
    document.body.appendChild(normal)
    Prism.highlightAllUnder(normal)

    expect(normal.querySelector('.line-numbers-rows')).not.toBeNull()
    expect(normal.querySelector('.code-toolbar .toolbar button')).not.toBeNull()
    root.remove()
    normal.remove()
  })

  it('copies the original source and reports the result', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const button = root.querySelector('.source-copy')
    expect(button.getAttribute('v-clipboard')).toBe('sourceCode')
    expect(button.getAttribute('@success')).toBe('onSourceCopied')
    expect(button.getAttribute('@error')).toBe('onSourceCopyError')

    const commit = jest.fn()
    const clearSelection = jest.fn()
    const context = { $store: { commit }, $t: key => key }
    componentModule.exports.default.methods.onSourceCopied.call(context, { clearSelection })
    componentModule.exports.default.methods.onSourceCopyError.call(context)
    expect(clearSelection).toHaveBeenCalled()
    expect(commit.mock.calls.map(call => call[1].message)).toEqual([
      'common:code.copied',
      'common:code.copyFailed'
    ])
  })
})
