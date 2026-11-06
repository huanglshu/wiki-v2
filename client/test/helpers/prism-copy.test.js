/* eslint-env jest */

import ClipboardJS from 'clipboard'
import i18next from 'i18next'
import { createPrismCopyButton } from '../../helpers/prism-copy'
import zh from '../../../data/sideload/zh.json'

jest.mock('clipboard', () => jest.fn())
jest.mock('i18next', () => ({ t: jest.fn() }))

describe('Prism copy button', () => {
  let callbacks

  beforeEach(() => {
    jest.useFakeTimers()
    callbacks = {}
    ClipboardJS.mockImplementation(() => ({
      on: (event, callback) => { callbacks[event] = callback }
    }))
    i18next.t.mockImplementation((key, options) => zh[key] || options.defaultValue)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('copies the original code and shows localized icon states', () => {
    const code = 'SELECT 1;\nSELECT 2;'
    const button = createPrismCopyButton({ code })
    expect(button.querySelector('.mdi-content-copy')).not.toBeNull()
    expect(button.getAttribute('aria-label')).toBe('复制代码')
    expect(button.title).toBe('复制代码')
    expect(ClipboardJS.mock.calls[0][1].text()).toBe(code)

    callbacks.success()
    expect(button.querySelector('.mdi-check')).not.toBeNull()
    expect(button.getAttribute('aria-label')).toBe('已复制')

    callbacks.error()
    expect(button.querySelector('.mdi-alert-circle-outline')).not.toBeNull()
    expect(button.title).toBe('复制失败，请按 Ctrl+C 手动复制。')
    jest.advanceTimersByTime(5000)
    expect(button.querySelector('.mdi-content-copy')).not.toBeNull()
    expect(button.getAttribute('aria-label')).toBe('复制代码')
  })

  it('falls back to English when translations are unavailable', () => {
    i18next.t.mockImplementation((key, options) => options.defaultValue)
    const button = createPrismCopyButton({ code: 'test' })
    expect(button.title).toBe('Copy code')
    callbacks.success()
    expect(button.title).toBe('Copied')
  })
})
