<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img(src='/_assets/svg/icon-console.svg', :alt='$t("admin:ui.devFlags.title")', style='width: 80px;')
          .admin-header-title
            .headline.primary--text {{ $t('admin:ui.devFlags.title') }}
            .subtitle-1.grey--text {{ $t('admin:ui.devFlags.subtitle') }}
          v-spacer
          v-btn(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}

        v-card.mt-3(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `white grey--text text--darken-3`')
          v-alert(color='red', :value='true', icon='mdi-alert', dark, prominent)
            span {{ $t('admin:ui.devFlags.warning') }}
            .caption {{ $t('admin:ui.devFlags.warning2') }}
          v-card-text
            v-switch.mt-3(
              color='primary'
              :hint='$t("admin:ui.devFlags.ldap.hint")'
              persistent-hint
              :label='$t("admin:ui.devFlags.ldap.label")'
              v-model='flags.ldapdebug'
              inset
            )
            v-divider.mt-3
            v-switch.mt-3(
              color='red'
              :hint='$t("admin:ui.devFlags.sql.hint")'
              persistent-hint
              :label='$t("admin:ui.devFlags.sql.label")'
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
          message: this.$t('admin:ui.devFlags.saveSuccess'),
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
