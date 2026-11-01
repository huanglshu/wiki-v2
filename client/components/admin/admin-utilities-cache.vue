<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 缓存
    v-card-text
      .subtitle-1.pb-3.primary--text 清空页面和资源缓存
      .body-2 页面和资源会缓存到磁盘以提高性能。清空缓存后，所有内容将重新从数据库获取。
      v-btn(outlined, color='primary', @click='flushCache', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
      v-divider.my-5
      .subtitle-1.pb-3.primary--text 清空临时上传文件
      .body-2 新上传文件在处理期间会临时保存到磁盘，处理完成后自动删除。此工具可用于立即清理。
      .body-2.red--text 注意：上传进行中执行此操作可能导致上传失败。
      v-btn(outlined, color='primary', @click='flushUploads', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
      v-divider.my-5
      .subtitle-1.pb-3.primary--text 清空客户端语言缓存
      .body-2 语言文本会在浏览器本地存储中缓存 24 小时。可清空当前缓存，以便下次加载页面时获取最新数据。
      .body-2 注意：此操作仅影响 #[strong 当前浏览器]，不会影响其他用户。
      v-btn(outlined, color='primary', @click='flushClientLocaleCache', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
</template>

<script>
import _ from 'lodash'
import utilityCacheFlushCacheMutation from 'gql/admin/utilities/utilities-mutation-cache-flushcache.gql'
import utilityCacheFlushUploadsMutation from 'gql/admin/utilities/utilities-mutation-cache-flushuploads.gql'

export default {
  data() {
    return {
      loading: false
    }
  },
  methods: {
    async flushCache() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-cache-flushCache')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityCacheFlushCacheMutation
        })
        const resp = _.get(respRaw, 'data.pages.flushCache.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '缓存清空成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-cache-flushCache')
      this.loading = false
    },
    async flushUploads() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-cache-flushUploads')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityCacheFlushUploadsMutation
        })
        const resp = _.get(respRaw, 'data.assets.flushTempUploads.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '临时上传文件清空成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-cache-flushUploads')
      this.loading = false
    },
    async flushClientLocaleCache () {
      for (let i = 0; i < window.localStorage.length; i++) {
        const lsKey = window.localStorage.key(i)
        if (_.startsWith(lsKey, 'i18next_res')) {
          window.localStorage.removeItem(lsKey)
        }
      }
      this.$store.commit('showNotification', {
        message: '客户端语言缓存清空成功。',
        style: 'success',
        icon: 'check'
      })
    }
  }
}
</script>

<style lang='scss'>

</style>
