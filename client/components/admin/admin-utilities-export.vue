<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 导出
    v-card-text
      .text-center
        img.animated.fadeInUp.wait-p1s(src='/_assets/svg/icon-big-parcel.svg')
        .body-2 导出为压缩包 / 文件系统目录
      v-divider.my-4
      .body-2 选择要导出的内容：
      v-checkbox(
        v-for='choice of entityChoices'
        :key='choice.key'
        :label='choice.label'
        :value='choice.key'
        color='deep-orange darken-2'
        hide-details
        v-model='entities'
        )
        template(v-slot:label)
          div
            strong.deep-orange--text.text--darken-2 {{choice.label}}
            .text-caption {{choice.hint}}
      v-text-field.mt-7(
        outlined
        label='目标文件夹路径'
        hint='用于保存导出内容的绝对路径或相对于 Wiki.js 安装目录的路径。注意：目标文件夹必须为空！'
        persistent-hint
        v-model='filePath'
      )

      v-alert.mt-3(color='deep-orange', outlined, icon='mdi-alert', prominent)
        .body-2 根据所选内容，压缩包可能包含站点配置密钥和用户密码哈希等敏感数据，请妥善保管。
        .body-2 如需长期保存备份，建议对压缩包进行加密。

    v-card-chin
      v-btn.px-3(depressed, color='deep-orange darken-2', :disabled='entities.length < 1', @click='startExport').ml-0
        v-icon(left, color='white') mdi-database-export
        span.white--text 开始导出
    v-dialog(
      v-model='isLoading'
      persistent
      max-width='350'
      )
      v-card(color='deep-orange darken-2', dark)
        v-card-text.pa-10.text-center
          self-building-square-spinner.animated.fadeIn(
            :animation-duration='4500'
            :size='40'
            color='#FFF'
            style='margin: 0 auto;'
          )
          .mt-5.body-1.white--text 正在导出...
          .caption 请稍候，此操作可能需要一段时间
          v-progress-linear.mt-5(
            color='white'
            :value='progress'
            stream
            rounded
            :buffer-value='0'
          )
    v-dialog(
      v-model='isSuccess'
      persistent
      max-width='350'
      )
      v-card(color='green darken-2', dark)
        v-card-text.pa-10.text-center
          v-icon(size='60') mdi-check-circle-outline
          .my-5.body-1.white--text 导出完成
        v-card-actions.green.darken-1
          v-spacer
          v-btn.px-5(
            color='white'
            outlined
            @click='isSuccess = false'
          ) 关闭
          v-spacer
    v-dialog(
      v-model='isFailed'
      persistent
      max-width='800'
      )
      v-card(color='red darken-2', dark)
        v-toolbar(color='red darken-2', dense)
          v-icon mdi-alert
          .body-2.pl-3 导出失败
          v-spacer
          v-btn.px-5(
            color='white'
            text
            @click='isFailed = false'
            ) 关闭
        v-card-text.pa-5.red.darken-4.white--text
          span {{errorMessage}}
</template>

<script>
import { SelfBuildingSquareSpinner } from 'epic-spinners'

import gql from 'graphql-tag'
import _get from 'lodash/get'

export default {
  components: {
    SelfBuildingSquareSpinner
  },
  data() {
    return {
      entities: [],
      filePath: './data/export',
      isLoading: false,
      isSuccess: false,
      isFailed: false,
      errorMessage: '',
      progress: 0
    }
  },
  computed: {
    entityChoices () {
      return [
        {
          key: 'assets',
          label: '资源文件',
          hint: '图片、文档等媒体文件。'
        },
        {
          key: 'comments',
          label: '评论',
          hint: '仅包含使用内置评论模块发表的评论。'
        },
        {
          key: 'navigation',
          label: '导航',
          hint: '使用静态或自定义导航时的侧边栏链接。'
        },
        {
          key: 'pages',
          label: '页面',
          hint: '页面内容、标签及相关元数据。'
        },
        {
          key: 'history',
          label: '页面历史',
          hint: '页面的所有历史版本及相关元数据。'
        },
        {
          key: 'settings',
          label: '设置',
          hint: '站点配置和模块设置。'
        },
        {
          key: 'groups',
          label: '用户组',
          hint: '组权限及页面规则。'
        },
        {
          key: 'users',
          label: '用户',
          hint: '用户元数据及用户组关系。'
        }
      ]
    }
  },
  methods: {
    async checkProgress () {
      try {
        const respStatus = await this.$apollo.query({
          query: gql`
            {
              system {
                exportStatus {
                  status
                  progress
                  message
                  startedAt
                }
              }
            }
          `,
          fetchPolicy: 'network-only'
        })
        const respStatusObj = _get(respStatus, 'data.system.exportStatus', {})
        if (!respStatusObj) {
          throw new Error('发生意外错误。')
        } else {
          switch (respStatusObj.status) {
            case 'error': {
              throw new Error(respStatusObj.message || '发生意外错误。')
            }
            case 'running': {
              this.progress = respStatusObj.progress || 0
              window.requestAnimationFrame(() => {
                setTimeout(() => {
                  this.checkProgress()
                }, 5000)
              })
              break
            }
            case 'success': {
              this.isLoading = false
              this.isSuccess = true
              break
            }
            default: {
              throw new Error('导出状态无效。')
            }
          }
        }
      } catch (err) {
        this.errorMessage = err.message
        this.isLoading = false
        this.isFailed = true
      }
    },
    async startExport () {
      this.isFailed = false
      this.isSuccess = false
      this.isLoading = true
      this.progress = 0

      setTimeout(async () => {
        try {
          // -> Initiate export
          const respExport = await this.$apollo.mutate({
            mutation: gql`
              mutation (
                $entities: [String]!
                $path: String!
              ) {
                system {
                  export (
                    entities: $entities
                    path: $path
                  ) {
                    responseResult {
                      succeeded
                      message
                    }
                  }
                }
              }
            `,
            variables: {
              entities: this.entities,
              path: this.filePath
            }
          })

          const respExportObj = _get(respExport, 'data.system.export', {})
          if (!_get(respExportObj, 'responseResult.succeeded', false)) {
            this.errorMessage = _get(respExportObj, 'responseResult.message', '发生意外错误。')
            this.isLoading = false
            this.isFailed = true
            return
          }

          // -> Check for progress
          this.checkProgress()
        } catch (err) {
          this.$store.commit('pushGraphError', err)
          this.isLoading = false
        }
      }, 1500)
    }
  }
}
</script>

<style lang='scss'>

</style>
