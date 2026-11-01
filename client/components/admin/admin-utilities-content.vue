<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 内容
    v-card-text
      .subtitle-1.pb-3.primary--text 重建页面树
      .body-2 Wiki 的虚拟结构会根据页面路径自动推导。如果虚拟目录缺失或已失效，可重建完整页面树。
      v-btn(outlined, color='primary', @click='rebuildTree', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续

      v-divider.my-5

      .subtitle-1.pb-3.primary--text 重新渲染所有页面
      .body-2 将重新渲染所有页面。内部链接失效或渲染管线变更时可以使用。
      v-btn(outlined, color='primary', @click='rerenderPages', :disabled='loading', :loading='isRerendering').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
      v-dialog(
        v-model='isRerendering'
        persistent
        max-width='450'
        )
        v-card(color='blue darken-2', dark)
          v-card-text.pa-10.text-center
            semipolar-spinner.animated.fadeIn(
              :animation-duration='1500'
              :size='65'
              color='#FFF'
              style='margin: 0 auto;'
            )
            .mt-5.body-1.white--text 正在渲染所有页面...
            .caption(v-if='renderIndex > 0') 正在渲染 {{renderCurrentPath}}... ({{renderIndex}}/{{renderTotal}}, {{renderProgress}}%)
            .caption.mt-4 操作完成前请勿离开此页面。
            v-progress-linear.mt-5(
              color='white'
              :value='renderProgress'
              stream
              rounded
              :buffer-value='0'
            )

      v-divider.my-5

      .subtitle-1.pb-3.pl-0.primary--text 将所有页面迁移到目标语言
      .body-2 如果在启用语言命名空间前已创建内容，可将全部内容迁移到目标语言。
      .body-2.red--text: strong 这是不可撤销的破坏性操作，请先确认已做好备份！
      v-toolbar.radius-7.mt-5(flat, :color='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-4`', height='80')
        v-select(
          label='源语言'
          outlined
          hide-details
          :items='locales'
          item-text='name'
          item-value='code'
          v-model='sourceLocale'
        )
        v-icon.mx-3(large) mdi-chevron-right-box-outline
        v-select(
          label='目标语言'
          outlined
          hide-details
          :items='locales'
          item-text='name'
          item-value='code'
          v-model='targetLocale'
        )
      .body-2.mt-5 已位于目标语言的页面不会改变。若目标位置已有页面，源页面不会被修改，以避免冲突。如需覆盖目标页面，必须先删除目标页面。
      v-btn(outlined, color='primary', @click='migrateToLocale', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续

      v-divider.my-5

      .subtitle-1.pb-3.pl-0.primary--text 清除页面历史
      .body-2 可清除较旧的页面历史以减少数据库占用。
      .body-2 此操作仅影响数据库，不会影响存储模块保存的历史（例如 Git 版本历史）。
      v-toolbar.radius-7.mt-5(flat, :color='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-4`', height='80')
        v-select(
          label='删除早于以下时间的历史...'
          outlined
          hide-details
          :items='purgeHistoryOptions'
          item-text='title'
          item-value='key'
          v-model='purgeHistorySelection'
        )
      v-btn(outlined, color='primary', @click='purgeHistory', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import utilityContentMigrateLocaleMutation from 'gql/admin/utilities/utilities-mutation-content-migratelocale.gql'
import utilityContentRebuildTreeMutation from 'gql/admin/utilities/utilities-mutation-content-rebuildtree.gql'

import { SemipolarSpinner } from 'epic-spinners'

/* global siteLangs, siteConfig */

export default {
  components: {
    SemipolarSpinner
  },
  data: () => {
    return {
      isRerendering: false,
      loading: false,
      renderProgress: 0,
      renderIndex: 0,
      renderTotal: 0,
      renderCurrentPath: '',
      sourceLocale: '',
      targetLocale: '',
      purgeHistorySelection: 'P1Y',
      purgeHistoryOptions: [
        { key: 'P1D', title: '今天' },
        { key: 'P1M', title: '1 个月' },
        { key: 'P3M', title: '3 个月' },
        { key: 'P6M', title: '6 个月' },
        { key: 'P1Y', title: '1 年' },
        { key: 'P2Y', title: '2 年' },
        { key: 'P3Y', title: '3 年' },
        { key: 'P5Y', title: '5 年' }
      ]
    }
  },
  computed: {
    currentLocale () {
      return siteConfig.lang
    },
    locales () {
      return siteLangs
    }
  },
  methods: {
    async rebuildTree () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-rebuildtree')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityContentRebuildTreeMutation
        })
        const resp = _.get(respRaw, 'data.pages.rebuildTree.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '页面树重建成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-rebuildtree')
      this.loading = false
    },
    async rerenderPages () {
      this.loading = true
      this.isRerendering = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-rerender')

      try {
        const pagesRaw = await this.$apollo.query({
          query: gql`
            {
              pages {
                list {
                  id
                  path
                  locale
                }
              }
            }
          `,
          fetchPolicy: 'network-only'
        })
        if (_.get(pagesRaw, 'data.pages.list', []).length < 1) {
          throw new Error('没有找到可渲染的页面！')
        }

        this.renderIndex = 0
        this.renderTotal = pagesRaw.data.pages.list.length
        let failed = 0
        for (const page of pagesRaw.data.pages.list) {
          this.renderCurrentPath = `${page.locale}/${page.path}`
          this.renderIndex++
          this.renderProgress = Math.round(this.renderIndex / this.renderTotal * 100)
          const respRaw = await this.$apollo.mutate({
            mutation: gql`
              mutation($id: Int!) {
                pages {
                  render(id: $id) {
                    responseResult {
                      succeeded
                      errorCode
                      slug
                      message
                    }
                  }
                }
              }
            `,
            variables: {
              id: page.id
            }
          })
          const resp = _.get(respRaw, 'data.pages.render.responseResult', {})
          if (!resp.succeeded) {
            failed++
          }
        }
        if (failed > 0) {
          this.$store.commit('showNotification', {
            message: `已完成，但有 ${failed} 个页面渲染失败，请检查服务器日志。`,
            style: 'error',
            icon: 'alert'
          })
        } else {
          this.$store.commit('showNotification', {
            message: '所有页面渲染成功。',
            style: 'success',
            icon: 'check'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-rerender')
      this.isRerendering = false
      this.loading = false
    },
    async migrateToLocale () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-migratelocale')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityContentMigrateLocaleMutation,
          variables: {
            sourceLocale: this.sourceLocale,
            targetLocale: this.targetLocale
          }
        })
        const resp = _.get(respRaw, 'data.pages.migrateToLocale.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: `已成功将 ${_.get(respRaw, 'data.pages.migrateToLocale.count', 0)} 个页面迁移到目标语言。`,
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-migratelocale')
      this.loading = false
    },
    async purgeHistory () {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-content-purgehistory')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: gql`
            mutation ($olderThan: String!) {
              pages {
                purgeHistory (
                  olderThan: $olderThan
                ) {
                  responseResult {
                    errorCode
                    message
                    slug
                    succeeded
                  }
                }
              }
            }
          `,
          variables: {
            olderThan: this.purgeHistorySelection
          }
        })
        const resp = _.get(respRaw, 'data.pages.purgeHistory.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: `页面历史清除成功。`,
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-content-purgehistory')
      this.loading = false
    }
  }
}
</script>

<style lang='scss'>

</style>
