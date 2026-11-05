/* eslint-env jest */

import { getAsciiDocDefaultContent, getCodeDefaultContent } from '../../../components/editor/default-content'

const translations = {
  'editor:code.defaultHeading': '标题',
  'editor:code.defaultContent': '在此输入内容',
  'editor:asciidoc.defaultHeading': '标题',
  'editor:asciidoc.defaultContent': '在此输入内容'
}

const translate = (key, options) => translations[key] || options.defaultValue

describe('editor default content', () => {
  it('uses the current system language for HTML source', () => {
    expect(getCodeDefaultContent(translate)).toBe('<h1>标题</h1>\n\n<p>在此输入内容</p>')
  })

  it('uses the current system language for AsciiDoc', () => {
    expect(getAsciiDocDefaultContent(translate)).toBe('== 标题\n\n在此输入内容')
  })
})
