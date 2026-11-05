import { getLocalizedNotificationMarker, getNotificationMessage } from '../../helpers/notification-message'

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

  it('resolves translated notification keys at render time', () => {
    const t = jest.fn(key => `translated:${key}`)

    expect(getNotificationMessage('i18n:common:error.unexpected', t)).toBe('translated:common:error.unexpected')
    expect(t).toHaveBeenCalledWith('common:error.unexpected')
  })

  it('localizes the S3 endpoint error marker', () => {
    expect(getLocalizedNotificationMarker('Please use virtual hosted style to access.'))
      .toBe('i18n:common:error.storageS3Endpoint')

    const t = jest.fn(key => key === 'common:error.storageS3Endpoint' ? '对象存储同步失败。' : key)

    expect(getNotificationMessage('i18n:common:error.storageS3Endpoint', t)).toBe('对象存储同步失败。')
  })
})
