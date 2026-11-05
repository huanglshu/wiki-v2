export function getCodeDefaultContent (t) {
  const heading = t('editor:code.defaultHeading', { defaultValue: 'Title' })
  const content = t('editor:code.defaultContent', { defaultValue: 'Some text here' })
  return `<h1>${heading}</h1>\n\n<p>${content}</p>`
}

export function getAsciiDocDefaultContent (t) {
  const heading = t('editor:asciidoc.defaultHeading', { defaultValue: 'header' })
  const content = t('editor:asciidoc.defaultContent', { defaultValue: 'content' })
  return `== ${heading}\n\n${content}`
}
