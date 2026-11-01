<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 遥测
    v-form
      v-card-text
        .subtitle-2 什么是遥测？
        .body-2.mt-3 遥测允许 Wiki.js 开发者收集使用情况及主机环境的基本匿名数据，从而改进软件。#[br] 此功能完全可选，且 #[strong 绝不会] 收集内容或个人数据等隐私信息。
        .body-2.mt-3 为最大程度保护隐私，安装时会生成随机客户端 ID。该 ID 仅用于对请求进行匿名分组，可随时在下方重置。
        v-divider.my-4
        .subtitle-2 会收集哪些数据？
        .body-2.mt-3 启用遥测后，仅传输以下数据：
        v-list
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 已安装的 Wiki.js 版本
              v-list-item-subtitle.caption: em 例如 v2.0.123
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 操作系统基本信息
              v-list-item-subtitle.caption: em 平台（Linux、macOS 或 Windows）、CPU 核心总数及数据库类型（PostgreSQL、MySQL、MariaDB、SQLite 或 SQL Server）
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 崩溃调试数据
              v-list-item-subtitle.caption: em 错误堆栈信息
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 安装统计
              v-list-item-subtitle.caption: em 已到达的安装阶段
        .body-2 崩溃调试数据最长保存 30 天，统计数据最长保存 16 个月，之后将被永久删除。
        v-divider.my-4
        .subtitle-2 数据有什么用途？
        .body-2.mt-3 开发者使用遥测数据改进 Wiki.js，主要用于以下目的：
        v-list(dense)
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 更容易识别关键缺陷并及时修复。
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 了解当前安装的升级情况。
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 根据常见运行环境优化性能和测试场景。
        .body-2 仅授权开发者可访问这些数据，不会与任何第三方共享，也不会用于改进 Wiki.js 之外的其他用途。
        v-divider.my-4
        .subtitle-2 设置
        .mt-3
          v-switch.mt-0(
            v-model='telemetry',
            label='启用遥测',
            color='primary',
            hint='允许 Wiki.js 传输遥测数据。',
            persistent-hint
          )
        v-divider.my-4
        .subtitle-2.mt-3.grey--text.text--darken-1 客户端 ID
        .body-2.mt-2 {{clientId}}
      v-card-chin
        v-btn.px-3(depressed, color='success', @click='updateTelemetry')
          v-icon(left) mdi-chevron-right
          | 保存更改
        v-spacer
        v-btn.px-3(outlined, color='grey', @click='resetClientId')
          v-icon(left) mdi-autorenew
          span 重置客户端 ID

</template>

<script>
import _ from 'lodash'

import utilityTelemetryResetIdMutation from 'gql/admin/utilities/utilities-mutation-telemetry-resetid.gql'
import utilityTelemetrySetMutation from 'gql/admin/utilities/utilities-mutation-telemetry-set.gql'
import utilityTelemetryQuery from 'gql/admin/utilities/utilities-query-telemetry.gql'

export default {
  data() {
    return {
      telemetry: false,
      clientId: '不适用'
    }
  },
  methods: {
    async updateTelemetry() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-telemetry-set')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityTelemetrySetMutation,
          variables: {
            enabled: this.telemetry
          }
        })
        const resp = _.get(respRaw, 'data.system.setTelemetry.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '遥测设置更新成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-telemetry-set')
      this.loading = false
    },
    async resetClientId() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-telemetry-resetid')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityTelemetryResetIdMutation
        })
        const resp = _.get(respRaw, 'data.system.resetTelemetryClientId.responseResult', {})
        if (resp.succeeded) {
          this.$apollo.queries.telemetry.refetch()
          this.$store.commit('showNotification', {
            message: '遥测客户端 ID 重置成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-telemetry-resetid')
      this.loading = false
    }
  },
  apollo: {
    telemetry: {
      query: utilityTelemetryQuery,
      fetchPolicy: 'network-only',
      manual: true,
      result ({ data }) {
        this.telemetry = _.get(data, 'system.info.telemetry', false)
        this.clientId = _.get(data, 'system.info.telemetryClientId', '不适用')
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-utilities-telemetry-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
