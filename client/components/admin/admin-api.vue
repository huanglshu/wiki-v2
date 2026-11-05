<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-rest-api.svg', alt='API', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{$t('admin:api.title')}}
            .subtitle-1.grey--text.animated.fadeInLeft {{$t('admin:api.subtitle')}}
          v-spacer
          template(v-if='enabled')
            status-indicator.mr-3(positive, pulse)
            .caption.green--text.animated.fadeInLeft {{$t('admin:api.enabled')}}
          template(v-else)
            status-indicator.mr-3(negative, pulse)
            .caption.red--text.animated.fadeInLeft {{$t('admin:api.disabled')}}
          v-spacer
          v-btn.mr-3.animated.fadeInDown.wait-p2s(outlined, color='grey', icon, @click='refresh')
            v-icon mdi-refresh
          v-btn.mr-3.animated.fadeInDown.wait-p1s(:color='enabled ? `red` : `green`', depressed, @click='globalSwitch', dark, :loading='isToggleLoading')
            v-icon(left) mdi-power
            span(v-if='!enabled') {{$t('admin:api.enableButton')}}
            span(v-else) {{$t('admin:api.disableButton')}}
          v-btn.animated.fadeInDown(color='primary', depressed, large, @click='newKey', dark)
            v-icon(left) mdi-plus
            span {{$t('admin:api.newKeyButton')}}
        v-card.mt-3.animated.fadeInUp
          v-simple-table(v-if='keys && keys.length > 0')
            template(v-slot:default)
              thead
                tr.grey(:class='$vuetify.theme.dark ? `darken-4-d5` : `lighten-5`')
                  th {{$t('admin:api.headerName')}}
                  th {{$t('admin:api.headerExpiration')}}
                  th {{$t('admin:api.headerCreated')}}
                  th {{$t('admin:api.headerLastUpdated')}}
                  th(width='120') {{$t('admin:ui.api.viewKey', { defaultValue: 'View Key' })}}
                  th(width='100') {{$t('admin:api.headerRevoke')}}
                  th(width='100') {{$t('admin:api.headerDelete')}}
              tbody
                tr(v-for='key of keys', :key='`key-` + key.id')
                  td
                    strong(:class='key.isRevoked ? `red--text` : ``') {{ key.name }}
                    em.caption.ml-1.red--text(v-if='key.isRevoked') ({{ $t('admin:ui.api.revoked', { defaultValue: 'revoked' }) }})
                  td(:style='key.isRevoked ? `text-decoration: line-through;` : ``') {{ formatApiDate(key.expiration) }}
                  td {{ formatApiDate(key.createdAt) }}
                  td {{ formatApiDate(key.updatedAt) }}
                  td
                    v-tooltip(bottom)
                      template(v-slot:activator='{ on }')
                        v-btn(
                          icon
                          v-on='on'
                          @click='viewKey(key)'
                          :loading='viewKeyLoadingId === key.id'
                          :disabled='viewKeyLoadingId !== null'
                          :aria-label='$t("admin:ui.api.viewKey", { defaultValue: "View Key" })'
                        )
                          v-icon mdi-eye
                      span {{ $t('admin:ui.api.viewKey', { defaultValue: 'View Key' }) }}
                  td: v-btn(icon, @click='revoke(key)', :disabled='key.isRevoked'): v-icon(color='error') mdi-cancel
                  td
                    v-tooltip(bottom)
                      template(v-slot:activator='{ on }')
                        v-btn(
                          icon
                          v-on='on'
                          @click='deleteKey(key)'
                          :disabled='!key.isRevoked || deleteLoading'
                          :aria-label='$t("admin:api.delete")'
                        )
                          v-icon(color='error') mdi-delete
                      span {{ $t('admin:api.delete') }}
          v-card-text(v-else)
            v-alert.mb-0(icon='mdi-information', :value='true', outlined, color='info') {{$t('admin:api.noKeyInfo')}}

    create-api-key(v-model='isCreateDialogShown', @refresh='refresh(false)')

    v-dialog(v-model='isViewKeyDialogShown', max-width='750')
      v-card
        .dialog-header.is-short {{ $t('admin:ui.api.viewKey', { defaultValue: 'View Key' }) }}
        v-card-text.pt-5
          .body-2 {{ viewedKeyName }}
          v-textarea.mt-3(
            :value='revealedKey'
            filled
            no-resize
            readonly
            :rows='6'
            hide-details
          )
        v-card-actions
          v-spacer
          v-tooltip(top)
            template(v-slot:activator='{ on }')
              v-btn(
                icon
                v-on='on'
                v-clipboard='revealedKey'
                @success='onKeyCopied'
                @error='onKeyCopyError'
                :disabled='!revealedKey'
                :aria-label='$t("admin:ui.api.copyKey", { defaultValue: "Copy Key" })'
              )
                v-icon mdi-content-copy
            span {{ $t('admin:ui.api.copyKey', { defaultValue: 'Copy Key' }) }}
          v-btn(text, @click='isViewKeyDialogShown = false') {{$t('common:actions.close')}}

    v-dialog(v-model='isRevokeConfirmDialogShown', max-width='500', persistent)
      v-card
        .dialog-header.is-red {{$t('admin:api.revokeConfirm')}}
        v-card-text.pa-4
          i18next(tag='span', path='admin:api.revokeConfirmText')
            strong(place='name') {{ current.name }}
        v-card-actions
          v-spacer
          v-btn(text, @click='isRevokeConfirmDialogShown = false', :disabled='revokeLoading') {{$t('common:actions.cancel')}}
          v-btn(color='red', dark, @click='revokeConfirm', :loading='revokeLoading') {{$t('admin:api.revoke')}}

    v-dialog(v-model='isDeleteConfirmDialogShown', max-width='500', persistent)
      v-card
        .dialog-header.is-red {{ $t('admin:api.deleteConfirm') }}
        v-card-text.pa-4
          i18next(tag='span', path='admin:api.deleteConfirmText')
            strong(place='name') {{ current.name }}
        v-card-actions
          v-spacer
          v-btn(text, @click='isDeleteConfirmDialogShown = false', :disabled='deleteLoading') {{ $t('common:actions.cancel') }}
          v-btn(color='red', dark, @click='deleteConfirm', :loading='deleteLoading') {{ $t('admin:api.delete') }}
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import { StatusIndicator } from 'vue-status-indicator'

import CreateApiKey from './admin-api-create.vue'

export default {
  components: {
    StatusIndicator,
    CreateApiKey
  },
  data() {
    return {
      enabled: false,
      isToggleLoading: false,
      keys: [],
      isCreateDialogShown: false,
      isViewKeyDialogShown: false,
      viewKeyLoadingId: null,
      viewedKeyName: '',
      revealedKey: '',
      isRevokeConfirmDialogShown: false,
      revokeLoading: false,
      isDeleteConfirmDialogShown: false,
      deleteLoading: false,
      current: {}
    }
  },
  watch: {
    isViewKeyDialogShown (isShown) {
      if (!isShown) {
        this.viewedKeyName = ''
        this.revealedKey = ''
      }
    }
  },
  beforeDestroy() {
    this.viewedKeyName = ''
    this.revealedKey = ''
  },
  methods: {
    formatApiDate(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      return value.locale('en').format('YYYY-MM-DD HH-mm-ss')
    },
    async viewKey(key) {
      if (this.viewKeyLoadingId !== null) {
        return
      }
      this.viewKeyLoadingId = key.id
      try {
        const resp = await this.$apollo.query({
          query: gql`
            query ($id: Int!) {
              authentication {
                apiKey(id: $id)
              }
            }
          `,
          variables: { id: key.id },
          fetchPolicy: 'no-cache'
        })
        const secret = _.get(resp, 'data.authentication.apiKey')
        if (!secret || typeof secret !== 'string') {
          throw new Error('API key unavailable')
        }
        if (!this._isBeingDestroyed && !this._isDestroyed) {
          this.viewedKeyName = key.name
          this.revealedKey = secret
          this.isViewKeyDialogShown = true
        }
      } catch (err) {
        if (!this._isBeingDestroyed && !this._isDestroyed) {
          this.$store.commit('showNotification', {
            style: 'red',
            message: this.$t('admin:ui.api.viewKeyError', { defaultValue: 'Unable to view the API key.' }),
            icon: 'alert'
          })
        }
      } finally {
        this.viewKeyLoadingId = null
      }
    },
    onKeyCopied(event) {
      if (event && event.clearSelection) {
        event.clearSelection()
      }
      this.$store.commit('showNotification', {
        style: 'success',
        message: this.$t('admin:ui.api.copyKeySuccess', { defaultValue: 'API key copied.' }),
        icon: 'check'
      })
    },
    onKeyCopyError() {
      this.$store.commit('showNotification', {
        style: 'red',
        message: this.$t('admin:ui.api.copyKeyError', { defaultValue: 'Copy failed. Please copy the key manually.' }),
        icon: 'alert'
      })
    },
    async refresh (notify = true) {
      this.$apollo.queries.keys.refetch()
      if (notify) {
        this.$store.commit('showNotification', {
          message: this.$t('admin:api.refreshSuccess'),
          style: 'success',
          icon: 'cached'
        })
      }
    },
    async globalSwitch () {
      this.isToggleLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($enabled: Boolean!) {
              authentication {
                setApiState (enabled: $enabled) {
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
            enabled: !this.enabled
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-toggle')
          }
        })
        if (_.get(resp, 'data.authentication.setApiState.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.enabled ? this.$t('admin:api.toggleStateDisabledSuccess') : this.$t('admin:api.toggleStateEnabledSuccess'),
            icon: 'check'
          })
          await this.$apollo.queries.enabled.refetch()
        } else {
          this.$store.commit('showNotification', {
            style: 'red',
            message: _.get(resp, 'data.authentication.setApiState.responseResult.message', 'An unexpected error occurred.'),
            icon: 'alert'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.isToggleLoading = false
    },
    async newKey () {
      this.isCreateDialogShown = true
    },
    revoke (key) {
      this.current = key
      this.isRevokeConfirmDialogShown = true
    },
    deleteKey (key) {
      if (!key.isRevoked) {
        return
      }
      this.current = key
      this.isDeleteConfirmDialogShown = true
    },
    async revokeConfirm () {
      this.revokeLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($id: Int!) {
              authentication {
                revokeApiKey (id: $id) {
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
            id: this.current.id
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-revoke')
          }
        })
        if (_.get(resp, 'data.authentication.revokeApiKey.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('admin:api.revokeSuccess'),
            icon: 'check'
          })
          this.refresh(false)
        } else {
          this.$store.commit('showNotification', {
            style: 'red',
            message: _.get(resp, 'data.authentication.revokeApiKey.responseResult.message', 'An unexpected error occurred.'),
            icon: 'alert'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.isRevokeConfirmDialogShown = false
      this.revokeLoading = false
    },
    async deleteConfirm () {
      if (!this.current.isRevoked) {
        return
      }
      this.deleteLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($id: Int!) {
              authentication {
                deleteApiKey (id: $id) {
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
            id: this.current.id
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-delete')
          }
        })
        const responseResult = _.get(resp, 'data.authentication.deleteApiKey.responseResult', {})
        if (responseResult.succeeded) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('admin:api.deleteSuccess'),
            icon: 'check'
          })
          await this.refresh(false)
        } else {
          throw new Error(responseResult.message || this.$t('common:error.unexpected'))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.isDeleteConfirmDialogShown = false
      this.deleteLoading = false
    }
  },
  apollo: {
    enabled: {
      query: gql`
        {
          authentication {
            apiState
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => data.authentication.apiState,
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-state-refresh')
      }
    },
    keys: {
      query: gql`
        {
          authentication {
            apiKeys {
              id
              name
              expiration
              isRevoked
              createdAt
              updatedAt
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => data.authentication.apiKeys,
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-keys-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
