/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const compiler = require('vue-template-compiler')
const pug = require('pug')
const sass = require('sass')

function readStyle(filename) {
  const source = fs.readFileSync(filename, 'utf8')
  return compiler.parseComponent(source).styles[0].content
}

describe('editor workspace theme', () => {
  const clientPath = path.resolve(__dirname, '../../..')
  const scssPath = path.join(clientPath, 'scss')
  const globals = fs.readFileSync(path.join(scssPath, 'global.scss'), 'utf8')
  const codeMirror = fs.readFileSync(path.join(scssPath, 'components/codemirror.scss'), 'utf8')
  const editorStyle = readStyle(path.join(clientPath, 'components/editor.vue'))

  it('uses a white editor page background only in light mode', () => {
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${editorStyle}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'editor theme--light'
    const wrap = document.createElement('div')
    wrap.className = 'application--wrap'
    root.appendChild(wrap)
    document.body.appendChild(root)

    try {
      expect(window.getComputedStyle(root).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(window.getComputedStyle(wrap).backgroundColor).toBe('rgb(255, 255, 255)')
      root.className = 'editor theme--dark'
      expect(window.getComputedStyle(root).backgroundColor).toBe('rgb(33, 33, 33)')
      expect(window.getComputedStyle(wrap).backgroundColor).toBe('rgb(33, 33, 33)')
    } finally {
      root.remove()
      style.remove()
    }
  })

  it.each(['markdown', 'asciidoc', 'code'])('uses a white %s editing area only in light mode', name => {
    const componentStyle = readStyle(path.join(clientPath, `components/editor/editor-${name}.vue`))
    const css = sass.renderSync({
      data: `${globals}\n${codeMirror}\n${componentStyle}\n${editorStyle}`,
      includePaths: [scssPath]
    }).css.toString()
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'editor theme--light'
    const sidebar = document.createElement('div')
    sidebar.className = `editor-${name}-sidebar`
    const editor = document.createElement('div')
    editor.className = `editor-${name}-editor`
    const code = document.createElement('div')
    code.className = 'CodeMirror cm-s-wikijs-dark'
    const gutters = document.createElement('div')
    gutters.className = 'CodeMirror-gutters'
    const lineNumber = document.createElement('span')
    lineNumber.className = 'CodeMirror-linenumber'
    const activeLine = document.createElement('div')
    activeLine.className = 'CodeMirror-activeline-background'
    const cursor = document.createElement('div')
    cursor.className = 'CodeMirror-cursor'
    const selection = document.createElement('div')
    selection.className = 'CodeMirror-selected'
    const line = document.createElement('pre')
    line.className = 'CodeMirror-line'
    const tag = document.createElement('span')
    tag.className = 'cm-tag'
    const string = document.createElement('span')
    string.className = 'cm-string'
    const bracket = document.createElement('span')
    bracket.className = 'CodeMirror-matchingbracket'
    gutters.appendChild(lineNumber)
    line.append(tag, string, bracket)
    code.append(gutters, activeLine, cursor, selection, line)
    editor.appendChild(code)
    root.append(sidebar, editor)
    document.body.appendChild(root)

    try {
      expect(window.getComputedStyle(sidebar).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(window.getComputedStyle(sidebar).borderRightWidth).toBe('1px')
      expect(window.getComputedStyle(sidebar).borderRightColor).toBe('#aaa')
      expect(window.getComputedStyle(editor).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(window.getComputedStyle(code).backgroundColor).toBe('rgb(255, 255, 255)')
      expect(window.getComputedStyle(code).color).toBe('rgb(33, 33, 33)')
      expect(window.getComputedStyle(gutters).backgroundColor).toBe('rgb(245, 245, 245)')
      expect(window.getComputedStyle(lineNumber).color).toBe('rgb(102, 102, 102)')
      expect(window.getComputedStyle(cursor).borderLeftColor).toBe('#212121')
      expect(window.getComputedStyle(activeLine).backgroundColor).toBe('rgb(245, 245, 245)')
      expect(window.getComputedStyle(selection).backgroundColor).toBe('rgb(207, 226, 255)')
      expect(window.getComputedStyle(tag).color).toBe(name === 'markdown' ? 'rgb(5, 80, 174)' : 'rgb(33, 33, 33)')
      expect(window.getComputedStyle(string).color).toBe(name === 'markdown' ? 'rgb(17, 99, 41)' : 'rgb(33, 33, 33)')
      expect(window.getComputedStyle(bracket).color).toBe('rgb(33, 33, 33)')

      root.className = 'editor theme--dark'
      expect(window.getComputedStyle(sidebar).backgroundColor).toBe('rgb(33, 33, 33)')
      expect(window.getComputedStyle(sidebar).borderRightColor).toBe('#888')
      expect(window.getComputedStyle(code).backgroundColor).not.toBe('rgb(255, 255, 255)')
    } finally {
      root.remove()
      style.remove()
    }
  })

  it.each(['markdown', 'asciidoc', 'code'])('makes %s sidebar buttons follow the active theme', name => {
    const source = fs.readFileSync(path.join(clientPath, `components/editor/editor-${name}.vue`), 'utf8')
    const template = compiler.parseComponent(source).template.content
    const ast = compiler.compile(pug.render(template)).ast
    const buttons = []

    function visit(node, inSidebar = false) {
      if (!node || node.type !== 1) { return }
      inSidebar = inSidebar || (node.attrsMap.class || '').split(' ').includes(`editor-${name}-sidebar`)
      if (inSidebar && node.tag === 'v-btn') {
        buttons.push(node)
      }
      node.children.forEach(child => visit(child, inSidebar))
      Object.values(node.scopedSlots || {}).forEach(slot => visit(slot, inSidebar))
    }

    visit(ast)
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach(button => {
      expect(button.attrsMap[':dark']).toBe('$vuetify.theme.dark')
      expect(button.attrsMap.dark).toBeUndefined()
    })
  })

  it.each(['markdown', 'asciidoc'])('separates the %s preview from the editor', name => {
    const componentStyle = readStyle(path.join(clientPath, `components/editor/editor-${name}.vue`))
    const style = document.createElement('style')
    style.textContent = sass.renderSync({
      data: `${globals}\n${componentStyle}`,
      includePaths: [scssPath]
    }).css.toString()
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.className = 'theme--light'
    const preview = document.createElement('div')
    preview.className = `editor-${name}-preview`
    root.appendChild(preview)
    document.body.appendChild(root)

    try {
      expect(window.getComputedStyle(preview).borderLeftWidth).toBe('1px')
      expect(window.getComputedStyle(preview).borderLeftColor).toBe('#aaa')
      root.className = 'theme--dark'
      expect(window.getComputedStyle(preview).borderLeftColor).toBe('#888')
    } finally {
      root.remove()
      style.remove()
    }
  })
})
