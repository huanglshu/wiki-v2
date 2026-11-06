/* eslint-env jest */

const CodeMirror = require('codemirror')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/sql/sql')
require('codemirror/addon/runmode/runmode')

describe('Markdown SQL code blocks', () => {
  it('distinguishes SQL keywords, strings and comments', () => {
    const tokens = []
    CodeMirror.runMode("```sql\nSELECT name FROM users WHERE id = 42 AND name = 'test'; -- comment\n```", 'text/markdown', (text, style) => {
      tokens.push({ text, style })
    })

    expect(tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'SELECT', style: 'keyword' }),
      expect.objectContaining({ text: '42', style: 'number' }),
      expect.objectContaining({ text: "'test'", style: 'string' }),
      expect.objectContaining({ text: '-- comment', style: 'comment' })
    ]))
  })
})
