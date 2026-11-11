export function findSearchLocation(container, params) {
  if (!container || !params) {
    return null
  }

  const query = (params.get('query') || '').trim().toLowerCase()
  const terms = query.split(/\s+/).filter(Boolean)
  const text = (params.get('text') || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_#>~]/g, '')
  const fragments = text.split('|').map(part => part.trim()).filter(Boolean)
  const candidates = fragments
    .filter(part => terms.every(term => part.toLowerCase().includes(term)))
    .sort((a, b) => b.length - a.length)
  terms.forEach(term => {
    if (!candidates.some(part => part.toLowerCase() === term)) {
      candidates.push(term)
    }
  })

  const blockSelector = 'h1, h2, h3, h4, h5, h6, p, pre, td, th, li, div'
  const blocks = Array.from(container.querySelectorAll(blockSelector))
    .filter(block => !block.querySelector(blockSelector))
  const occurrence = Math.max(0, Number.parseInt(params.get('occurrence'), 10) || 0)

  for (const candidate of candidates) {
    const matches = []
    for (const block of blocks) {
      const walker = document.createTreeWalker(block, window.NodeFilter.SHOW_TEXT)
      const nodes = []
      let content = ''
      let node
      while ((node = walker.nextNode())) {
        nodes.push({ node, start: content.length })
        content += node.nodeValue
      }
      const lowerContent = content.toLowerCase()
      const needle = candidate.toLowerCase()
      let index = lowerContent.indexOf(needle)
      while (index !== -1) {
        const start = nodes.slice().reverse().find(entry => entry.start <= index)
        const endIndex = index + candidate.length
        const end = nodes.slice().reverse().find(entry => entry.start < endIndex)
        if (start && end) {
          const range = document.createRange()
          range.setStart(start.node, index - start.start)
          range.setEnd(end.node, endIndex - end.start)
          matches.push(range)
        }
        index = lowerContent.indexOf(needle, index + needle.length)
      }
    }
    if (matches.length) {
      return matches[Math.min(occurrence, matches.length - 1)]
    }
  }
  return null
}

export function clearSearchHighlights(container) {
  if (!container) {
    return
  }
  container.querySelectorAll('mark[data-search-result-highlight]').forEach(mark => {
    const parent = mark.parentNode
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
  })
}

export function highlightSearchLocation(container, range, query) {
  const terms = String(query || '').trim().split(/\s+/).filter(Boolean)
    .sort((a, b) => b.length - a.length)
  if (!container || !range || !terms.length) {
    return null
  }

  const walker = document.createTreeWalker(container, window.NodeFilter.SHOW_TEXT)
  const nodes = []
  let content = ''
  let node
  while ((node = walker.nextNode())) {
    if (!range.intersectsNode(node)) {
      continue
    }
    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : node.nodeValue.length
    if (end > start) {
      nodes.push({ node, start, end, offset: content.length, matches: [] })
      content += node.nodeValue.slice(start, end)
    }
  }

  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const matches = content.matchAll(new RegExp(pattern, 'gi'))
  for (const match of matches) {
    const matchStart = match.index
    const matchEnd = matchStart + match[0].length
    nodes.forEach(entry => {
      const start = Math.max(matchStart, entry.offset)
      const end = Math.min(matchEnd, entry.offset + entry.end - entry.start)
      if (end > start) {
        entry.matches.push({
          start: entry.start + start - entry.offset,
          end: entry.start + end - entry.offset
        })
      }
    })
  }

  nodes.forEach(entry => {
    entry.matches.reverse().forEach(match => {
      entry.node.splitText(match.end)
      const matchedText = entry.node.splitText(match.start)
      const mark = document.createElement('mark')
      mark.className = 'page-search-result-highlight'
      mark.setAttribute('data-search-result-highlight', '')
      matchedText.parentNode.insertBefore(mark, matchedText)
      mark.appendChild(matchedText)
    })
  })
  return container.querySelector('mark[data-search-result-highlight]')
}
