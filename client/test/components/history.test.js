/* eslint-env jest */

const fs = require('fs')
const path = require('path')
const compiler = require('vue-template-compiler')
const pug = require('pug')

const source = fs.readFileSync(path.join(__dirname, '../../components/history.vue'), 'utf8')
const sfc = compiler.parseComponent(source)

describe('history layout', () => {
  it('uses the site header color and a white history toolbar', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)

    const header = root.querySelector('nav-header')
    expect(header.hasAttribute('site-header')).toBe(true)

    const toolbar = root.querySelector('.history-toolbar')
    expect(toolbar.getAttribute('color')).toBe('white')
    expect(toolbar.hasAttribute('light')).toBe(true)
    expect(toolbar.hasAttribute('dark')).toBe(false)
    expect(sfc.styles[0].content).toMatch(/\.history\s*\{[^}]*\.history-toolbar\s*\{[^}]*background-color:\s*#fff !important;[^}]*color:\s*rgba\(0,\s*0,\s*0,\s*\.87\) !important;/)
  })

  it('keeps history metadata legible on the light toolbar', () => {
    const html = pug.render(sfc.template.content)
    expect(html).toContain('class="caption grey--text text--darken-2 mr-4"')
    expect(html).toContain('class="caption grey--text text--darken-2"')
    expect(html).not.toContain('blue--text text--lighten-3')
  })

  it('uses blue accents for the path, metadata values and return button', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const title = root.querySelector('.history-title strong')
    const html = pug.render(sfc.template.content)

    expect(title).not.toBeNull()
    expect(html.match(/history-meta-value/g)).toHaveLength(2)
    expect(html).toContain('class="ml-4 history-return"')
    expect(html).toContain('outlined="outlined"')

    const styles = sfc.styles[0].content
    expect(styles).toMatch(/\.history-title strong\s*\{[^}]*color:\s*#1976d2;/)
    expect(styles).toMatch(/\.history-meta-value\s*\{[^}]*border:\s*1px solid #90caf9;[^}]*background-color:\s*#fff;/)
    expect(styles).toMatch(/\.history-return\s*\{[^}]*background-color:\s*#fff !important;[^}]*border-color:\s*#1976d2 !important;[^}]*color:\s*#1976d2 !important;/)
  })

  it('keeps the history target summary compact and responsive', () => {
    const root = document.createElement('div')
    root.innerHTML = pug.render(sfc.template.content)
    const summary = root.querySelector('.history-target-summary')
    expect(summary.querySelector('.history-target-summary__identity')).not.toBeNull()
    expect(summary.querySelector('.history-target-summary__title')).not.toBeNull()
    expect(summary.querySelector('.history-target-summary__description')).not.toBeNull()
    expect(summary.querySelector('.history-target-summary__view')).not.toBeNull()
    expect(summary.querySelector('.row')).toBeNull()

    const styles = sfc.styles[0].content
    expect(styles).toMatch(/&-target-summary\s*\{[^}]*display:\s*flex;[^}]*gap:\s*16px;[^}]*padding:\s*12px 16px;/)
    expect(styles).toMatch(/@media \(max-width:\s*599px\)\s*\{[^}]*align-items:\s*stretch;[^}]*flex-direction:\s*column;/)
  })
})
