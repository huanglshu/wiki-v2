<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 导出为 Wiki.js 3.x
    v-card-text
      .text-center
        img.animated.fadeInUp.wait-p1s(src='/_assets/svg/icon-big-parcel.svg')
        .body-2 导出为 .wkbackup 迁移包
      v-divider.my-4
      .body-2 选择要包含的内容：
      v-checkbox(
        v-for='choice of entityChoices'
        :class='choice.requires ? `ml-6` : ``'
        :key='choice.key'
        :label='choice.label'
        :value='choice.key'
        :disabled='choice.requires && !entities.includes(choice.requires)'
        color='deep-orange darken-2'
        hide-details
        v-model='entities'
        )
        template(v-slot:label)
          div
            strong.deep-orange--text.text--darken-2 {{choice.label}}
            .text-caption {{choice.hint}}

      v-alert.mt-7(color='blue-grey darken-2', outlined, icon='mdi-information-outline', prominent)
        .body-2 迁移包会写入 Wiki.js 数据目录下的 #[strong backup] 文件夹，完成后可下载。
        .body-2 可在 Wiki.js 3.x 中通过 #[strong 管理 → 其他 → 从 Wiki.js 2.x 导入] 导入。文件由浏览器读取，不会上传到任何位置。

      v-alert.mt-3(color='deep-orange', outlined, icon='mdi-alert', prominent)
        .body-2 迁移包包含用户密码哈希、双重验证密钥和站点配置密钥，且未加密或签名。请像保管数据库一样妥善保管。
        .body-2 保留这些凭据可让用户迁移后继续使用原密码和身份验证器。

    v-card-chin
      v-btn.px-3(depressed, color='deep-orange darken-2', :disabled='entities.length < 1', @click='startBackup').ml-0
        v-icon(left, color='white') mdi-package-variant-closed
        span.white--text 创建迁移包
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
          .mt-5.body-1.white--text 正在创建迁移包...
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
      max-width='450'
      )
      v-card(color='green darken-2', dark)
        v-card-text.pa-10.text-center
          v-icon(size='60') mdi-check-circle-outline
          .mt-5.body-1.white--text 迁移包创建完成
          .mt-2.caption.white--text {{filename}}
          .caption(v-if='fileSize') {{prettyFileSize}}
          .mt-3.caption.text-truncate(v-if='filePath', :title='filePath') {{filePath}}
        v-card-actions.green.darken-1
          v-spacer
          v-btn.px-5(
            color='white'
            outlined
            @click='downloadBackup'
          )
            v-icon(left) mdi-download
            span 下载
          v-btn.px-5(
            color='white'
            text
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
          .body-2.pl-3 迁移包创建失败
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
      entities: ['assets', 'navigation', 'pages', 'history', 'comments', 'settings', 'groups', 'users'],
      isLoading: false,
      isSuccess: false,
      isFailed: false,
      errorMessage: '',
      filename: '',
      filePath: '',
      fileSize: 0,
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
          key: 'navigation',
          label: '导航',
          hint: '使用静态或自定义导航时的侧边栏链接。'
        },
        {
          key: 'pages',
          label: '页面',
          hint: '页面内容、标签及相关元数据。不包含渲染后的 HTML，因为 Wiki.js 3.x 会自行渲染页面。'
        },
        // -> Neither of these makes sense without the pages they belong to.
        {
          key: 'history',
          label: '页面历史',
          hint: '页面的所有历史版本及相关元数据。',
          requires: 'pages'
        },
        {
          key: 'comments',
          label: '评论',
          hint: '仅包含使用内置评论模块发表的评论。',
          requires: 'pages'
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
          hint: '用户元数据、用户组关系、密码哈希和双重验证密钥。'
        }
      ]
    },
    prettyFileSize () {
      const units = ['字节', 'KB', 'MB', 'GB', 'TB']
      let size = this.fileSize
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit++
      }
      return `${unit === 0 ? size : size.toFixed(2)} ${units[unit]}`
    }
  },
  watch: {
    entities (newEntities) {
      const orphaned = this.entityChoices
        .filter(choice => choice.requires && !newEntities.includes(choice.requires))
        .map(choice => choice.key)
      if (orphaned.some(key => newEntities.includes(key))) {
        this.entities = newEntities.filter(key => !orphaned.includes(key))
      }
    }
  },
  methods: {
    downloadBackup () {
      window.location.assign(`/_backup/${this.filename}`)
    },
    async checkProgress () {
      try {
        const respStatus = await this.$apollo.query({
          query: gql`
            {
              system {
                backupStatus {
                  status
                  progress
                  message
                  startedAt
                  filename
                  filePath
                  fileSize
                }
              }
            }
          `,
          fetchPolicy: 'network-only'
        })
        const respStatusObj = _get(respStatus, 'data.system.backupStatus', {})
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
              this.filename = respStatusObj.filename
              this.filePath = respStatusObj.filePath || ''
              this.fileSize = respStatusObj.fileSize || 0
              this.isLoading = false
              this.isSuccess = true
              break
            }
            default: {
              throw new Error('备份状态无效。')
            }
          }
        }
      } catch (err) {
        this.errorMessage = err.message
        this.isLoading = false
        this.isFailed = true
      }
    },
    async startBackup () {
      this.isFailed = false
      this.isSuccess = false
      this.isLoading = true
      this.progress = 0

      setTimeout(async () => {
        try {
          // -> Initiate backup
          const respBackup = await this.$apollo.mutate({
            mutation: gql`
              mutation (
                $entities: [String]!
              ) {
                system {
                  createBackup (
                    entities: $entities
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
              entities: this.entities
            }
          })

          const respBackupObj = _get(respBackup, 'data.system.createBackup', {})
          if (!_get(respBackupObj, 'responseResult.succeeded', false)) {
            this.errorMessage = _get(respBackupObj, 'responseResult.message', '发生意外错误。')
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
