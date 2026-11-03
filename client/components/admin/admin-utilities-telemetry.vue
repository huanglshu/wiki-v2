<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 {{ $t('admin:ui.utilities.telemetry.title') }}
    v-form
      v-card-text
        .subtitle-2 {{ $t('admin:ui.utilities.telemetry.whatTitle') }}
        .body-2.mt-3 {{ $t('admin:ui.utilities.telemetry.whatHint') }}
        .body-2.mt-3 {{ $t('admin:ui.utilities.telemetry.clientIdHint') }}
        v-divider.my-4
        .subtitle-2 {{ $t('admin:ui.utilities.telemetry.dataTitle') }}
        .body-2.mt-3 {{ $t('admin:ui.utilities.telemetry.dataHint') }}
        v-list
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 {{ $t('admin:ui.utilities.telemetry.items.version') }}
              v-list-item-subtitle.caption: em {{ $t('admin:ui.utilities.telemetry.items.versionHint') }}
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 {{ $t('admin:ui.utilities.telemetry.items.system') }}
              v-list-item-subtitle.caption: em {{ $t('admin:ui.utilities.telemetry.items.systemHint') }}
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 {{ $t('admin:ui.utilities.telemetry.items.crash') }}
              v-list-item-subtitle.caption: em {{ $t('admin:ui.utilities.telemetry.items.crashHint') }}
          v-list-item
            v-list-item-avatar: v-icon mdi-information-outline
            v-list-item-content
              v-list-item-title.body-2 {{ $t('admin:ui.utilities.telemetry.items.install') }}
              v-list-item-subtitle.caption: em {{ $t('admin:ui.utilities.telemetry.items.installHint') }}
        .body-2 {{ $t('admin:ui.utilities.telemetry.retention') }}
        v-divider.my-4
        .subtitle-2 {{ $t('admin:ui.utilities.telemetry.purposeTitle') }}
        .body-2.mt-3 {{ $t('admin:ui.utilities.telemetry.purposeHint') }}
        v-list(dense)
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 {{ $t('admin:ui.utilities.telemetry.items.defects') }}
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 {{ $t('admin:ui.utilities.telemetry.items.upgrades') }}
          v-list-item
            v-list-item-avatar: v-icon mdi-chevron-right
            v-list-item-content: v-list-item-title: .body-2 {{ $t('admin:ui.utilities.telemetry.items.performance') }}
        .body-2 {{ $t('admin:ui.utilities.telemetry.sharing') }}
        v-divider.my-4
        .subtitle-2 {{ $t('admin:ui.utilities.telemetry.settings') }}
        .mt-3
          v-switch.mt-0(
            v-model='telemetry',
            :label='$t("admin:ui.utilities.telemetry.enable")',
            color='primary',
            :hint='$t("admin:ui.utilities.telemetry.enableHint")',
            persistent-hint
          )
        v-divider.my-4
        .subtitle-2.mt-3.grey--text.text--darken-1 {{ $t('admin:ui.utilities.telemetry.clientId') }}
        .body-2.mt-2 {{clientId}}
      v-card-chin
        v-btn.px-3(depressed, color='success', @click='updateTelemetry')
          v-icon(left) mdi-chevron-right
          | {{ $t('common:actions.saveChanges') }}
        v-spacer
        v-btn.px-3(outlined, color='grey', @click='resetClientId')
          v-icon(left) mdi-autorenew
          span {{ $t('admin:ui.utilities.telemetry.resetClientId') }}

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
      clientId: ''
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
            message: this.$t('admin:ui.utilities.telemetry.saveSuccess'),
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
            message: this.$t('admin:ui.utilities.telemetry.resetSuccess'),
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
        this.clientId = _.get(data, 'system.info.telemetryClientId', this.$t('common:notApplicable'))
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
