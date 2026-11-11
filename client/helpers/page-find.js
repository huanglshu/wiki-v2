const blockSelector = 'address, article, aside, blockquote, div, dl, dt, dd, h1, h2, h3, h4, h5, h6, li, p, pre, section, table, td, th'
const excludedSelector = 'script, style, textarea, select, button, svg, [hidden], [aria-hidden="true"]'

export function clearPageFindHighlights(container) {
  if (!container) {
    return
  }
  const parents = new Set()
  container.querySelectorAll('mark[data-page-find]').forEach(mark => {
    const parent = mark.parentNode
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parents.add(parent)
  })
  parents.forEach(parent => parent.normalize())
}

export function highlightPageFind(container, query) {
  if (!container || !query) {
    return []
  }

  const doc = container.ownerDocument
  const view = doc.defaultView
  const visibility = new Map()
  const isVisible = element => {
    for (let current = element; current && current !== container; current = current.parentElement) {
      if (visibility.has(current)) {
        return visibility.get(current)
      }
      const style = view.getComputedStyle(current)
      if (style.display === 'none' || style.visibility === 'hidden') {
        visibility.set(current, false)
        return false
      }
    }
    visibility.set(element, true)
    return true
  }
  const walker = doc.createTreeWalker(container, view.NodeFilter.SHOW_TEXT)
  const groups = []
  let group
  let node
  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent || parent.closest(excludedSelector) || !isVisible(parent)) {
      continue
    }
    const block = parent.closest(blockSelector) || container
    if (!group || group.block !== block) {
      group = { block, text: '', nodes: [] }
      groups.push(group)
    }
    group.nodes.push({ node, offset: group.text.length, matches: [] })
    group.text += node.nodeValue
  }

  const matches = []
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  groups.forEach(part => {
    let nodeIndex = 0
    let match
    while ((match = pattern.exec(part.text))) {
      const matchIndex = matches.length
      const end = match.index + match[0].length
      matches.push([])
      while (nodeIndex < part.nodes.length &&
        part.nodes[nodeIndex].offset + part.nodes[nodeIndex].node.nodeValue.length <= match.index) {
        nodeIndex++
      }
      for (let index = nodeIndex; index < part.nodes.length && part.nodes[index].offset < end; index++) {
        const entry = part.nodes[index]
        const startOffset = Math.max(match.index, entry.offset)
        const endOffset = Math.min(end, entry.offset + entry.node.nodeValue.length)
        if (endOffset > startOffset) {
          entry.matches.push({ start: startOffset - entry.offset, end: endOffset - entry.offset, matchIndex })
        }
      }
    }
  })

  groups.forEach(part => {
    part.nodes.forEach(entry => {
      entry.matches.reverse().forEach(match => {
        entry.node.splitText(match.end)
        const text = entry.node.splitText(match.start)
        const mark = doc.createElement('mark')
        mark.className = 'page-find-highlight'
        mark.setAttribute('data-page-find', '')
        text.parentNode.insertBefore(mark, text)
        mark.appendChild(text)
        matches[match.matchIndex].push(mark)
      })
    })
  })
  return matches
}
