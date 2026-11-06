import ClipboardJS from 'clipboard'
import i18next from 'i18next'

export function createPrismCopyButton (env) {
  const button = document.createElement('button')
  const icon = document.createElement('i')
  button.type = 'button'
  button.className = 'prism-copy-button'
  button.setAttribute('aria-live', 'polite')
  icon.setAttribute('aria-hidden', 'true')
  button.appendChild(icon)

  let resetTimer
  const showStatus = (iconName, key, fallback) => {
    const label = i18next.t(key, { defaultValue: fallback })
    icon.className = `mdi ${iconName}`
    button.setAttribute('aria-label', label)
    button.title = label
  }
  const resetStatus = () => showStatus('mdi-content-copy', 'common:code.copy', 'Copy code')
  const showTemporaryStatus = (iconName, key, fallback) => {
    clearTimeout(resetTimer)
    showStatus(iconName, key, fallback)
    resetTimer = setTimeout(resetStatus, 5000)
  }

  resetStatus()
  const clipboard = new ClipboardJS(button, { text: () => env.code })
  clipboard.on('success', () => showTemporaryStatus('mdi-check', 'common:code.copied', 'Copied'))
  clipboard.on('error', () => showTemporaryStatus('mdi-alert-circle-outline', 'common:code.copyFailed', 'Copy failed. Press Ctrl+C to copy.'))
  return button
}
