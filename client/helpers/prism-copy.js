import ClipboardJS from 'clipboard'
import i18next from 'i18next'

const registeredToolbars = new WeakSet()

export function registerPrismCopyButton (prism) {
  const toolbar = prism.plugins.toolbar
  if (!registeredToolbars.has(toolbar)) {
    toolbar.registerButton('wikijs-copy', createPrismCopyButton)
    registeredToolbars.add(toolbar)
  }
}

export function createPrismCopyButton (env) {
  const button = document.createElement('button')
  const icon = document.createElement('i')
  const status = document.createElement('span')
  button.type = 'button'
  button.className = 'prism-copy-button'
  icon.setAttribute('aria-hidden', 'true')
  status.className = 'prism-copy-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.hidden = true
  button.appendChild(icon)
  button.appendChild(status)

  let resetTimer
  const showStatus = (iconName, key, fallback) => {
    const label = i18next.t(key, { defaultValue: fallback })
    icon.className = `mdi ${iconName}`
    button.setAttribute('aria-label', label)
    button.title = label
  }
  const resetStatus = () => {
    showStatus('mdi-content-copy', 'common:code.copy', 'Copy code')
    status.hidden = true
    status.textContent = ''
  }
  const showTemporaryStatus = (iconName, key, fallback) => {
    clearTimeout(resetTimer)
    showStatus(iconName, key, fallback)
    status.textContent = button.title
    status.hidden = false
    resetTimer = setTimeout(resetStatus, 5000)
  }

  resetStatus()
  const clipboard = new ClipboardJS(button, { text: () => env.code })
  clipboard.on('success', () => showTemporaryStatus('mdi-check', 'common:code.copied', 'Copied'))
  clipboard.on('error', () => showTemporaryStatus('mdi-alert-circle-outline', 'common:code.copyFailed', 'Copy failed. Press Ctrl+C to copy.'))
  return button
}
