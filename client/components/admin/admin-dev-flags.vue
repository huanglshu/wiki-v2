<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img(src='/_assets/svg/icon-console.svg', alt='开发工具', style='width: 80px;')
          .admin-header-title
            .headline.primary--text 开发工具
            .subtitle-1.grey--text 标志
          v-spacer
          v-btn(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}

        v-card.mt-3(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `white grey--text text--darken-3`')
          v-alert(color='red', :value='true', icon='mdi-alert', dark, prominent)
            span 除非明确了解这些标志的作用，否则请勿启用！
            .caption 启用后可能导致数据丢失或安装损坏！
          v-card-text
            v-switch.mt-3(
              color='primary'
              hint='记录 LDAP/AD 登录尝试的详细调试信息。'
              persistent-hint
              label='LDAP 调试'
              v-model='flags.ldapdebug'
              inset
            )
            v-divider.mt-3
            v-switch.mt-3(
              color='red'
              hint='将所有数据库查询记录到控制台。'
              persistent-hint
              label='SQL 查询日志'
              v-model='flags.sqllog'
              inset
            )
</template>

<script>
import _ from 'lodash'

import flagsQuery from 'gql/admin/dev/dev-query-flags.gql'
import flagsMutation from 'gql/admin/dev/dev-mutation-save-flags.gql'

export default {
  data() {
    return {
      flags: {
        sqllog: false
      }
    }
  },
  methods: {
    async save() {
      try {
        await this.$apollo.mutate({
          mutation: flagsMutation,
          variables: {
            flags: _.transform(this.flags, (result, value, key) => {
              result.push({ key, value })
            }, [])
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-dev-flags-update')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: '标志已成功应用。',
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  },
  apollo: {
    flags: {
      query: flagsQuery,
      fetchPolicy: 'network-only',
      update: (data) => _.transform(data.system.flags, (result, row) => {
        _.set(result, row.key, row.value)
      }, {}),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-dev-flags-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
