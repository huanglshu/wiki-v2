import { getNotificationMessage } from './notification-message'

describe('notification message', () => {
  const t = key => {
    return key === 'common:error.network' ? '网络错误，请检查网络连接后重试。' : key
  }

  it('translates network errors instead of exposing the raw Apollo message', () => {
    expect(getNotificationMessage('Network Error: Failed to fetch', t)).toBe('网络错误，请检查网络连接后重试。')
  })

  it('keeps non-network notification content unchanged', () => {
    expect(getNotificationMessage('保存成功', t)).toBe('保存成功')
  })
})
