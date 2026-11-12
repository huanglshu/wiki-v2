<template lang="pug">
  div
    v-dialog(v-model='isShown', max-width='650', persistent)
      v-card
        .dialog-header.is-short
          v-icon.mr-3(color='white') mdi-plus
          span {{$t('admin:api.newKeyTitle')}}
        v-card-text.pt-5
          v-text-field(
            outlined
            prepend-icon='mdi-format-title'
            v-model='name'
            :label='$t(`admin:api.newKeyName`)'
            persistent-hint
            ref='keyNameInput'
            :hint='$t(`admin:api.newKeyNameHint`)'
            counter='255'
            )
          v-select.mt-3(
            :items='expirations'
            outlined
            prepend-icon='mdi-clock'
            v-model='expiration'
            :label='$t(`admin:api.newKeyExpiration`)'
            :hint='$t(`admin:api.newKeyExpirationHint`)'
            persistent-hint
            )
          v-divider.mt-4
          v-autocomplete.mt-4(
            :items='users'
            :item-text='userText'
            item-value='id'
            outlined
            prepend-icon='mdi-account'
            color='indigo'
            v-model='userId'
            :label='$t(`admin:ui.api.boundUser`)'
            :hint='$t(`admin:ui.api.boundUserHint`)'
            persistent-hint
            )
        v-card-chin
          v-spacer
          v-btn(text, @click='isShown = false', :disabled='loading') {{$t('common:actions.cancel')}}
          v-btn.px-3(depressed, color='primary', @click='generate', :loading='loading')
            v-icon(left) mdi-chevron-right
            span {{$t('common:actions.generate')}}

    v-dialog(
      v-model='isCopyKeyDialogShown'
      max-width='750'
      persistent
      overlay-color='blue darken-5'
      overlay-opacity='.9'
      )
      v-card
        v-toolbar(dense, flat, color='primary', dark) {{$t('admin:api.newKeyTitle')}}
        v-card-text.pt-5
          .body-2.text-center {{ $t('admin:ui.api.keySafetyWarning', { defaultValue: 'Store this API key securely and do not share it with unauthorized users.' }) }}
          v-textarea.mt-3(
            ref='keyContentsIpt'
            filled
            no-resize
            readonly
            v-model='key'
            :rows='10'
            hide-details
          )
        v-card-chin
          v-spacer
          v-btn.px-3(depressed, dark, color='primary', @click='isCopyKeyDialogShown = false') {{$t('common:actions.close')}}
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'

export default {
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      name: '',
      expiration: '1y',
      users: [],
      userId: null,
      isCopyKeyDialogShown: false,
      key: ''
    }
  },
  computed: {
    isShown: {
      get() { return this.value },
      set(val) { this.$emit('input', val) }
    },
    expirations() {
      return [
        { value: '30d', text: this.$t('admin:api.expiration30d') },
        { value: '90d', text: this.$t('admin:api.expiration90d') },
        { value: '180d', text: this.$t('admin:api.expiration180d') },
        { value: '1y', text: this.$t('admin:api.expiration1y') },
        { value: '3y', text: this.$t('admin:api.expiration3y') }
      ]
    }
  },
  watch: {
    value (newValue, oldValue) {
      if (newValue) {
        setTimeout(() => {
          this.$refs.keyNameInput.focus()
        }, 400)
      }
    }
  },
  methods: {
    userText (user) {
      return `${user.name} (${user.email})`
    },
    async generate () {
      try {
        if (_.trim(this.name).length < 2 || this.name.length > 255) {
          throw new Error(this.$t('admin:api.newKeyNameError'))
        } else if (!this.userId) {
          throw new Error(this.$t('admin:ui.api.boundUserError'))
        }
      } catch (err) {
        return this.$store.commit('showNotification', {
          style: 'red',
          message: err,
          icon: 'alert'
        })
      }

      this.loading = true

      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($name: String!, $expiration: String!, $userId: Int!) {
              authentication {
                createApiKey (name: $name, expiration: $expiration, userId: $userId) {
                  key
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
            name: this.name,
            expiration: this.expiration,
            userId: this.userId
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-create')
          }
        })
        if (_.get(resp, 'data.authentication.createApiKey.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('admin:api.newKeySuccess'),
            icon: 'check'
          })

          this.name = ''
          this.expiration = '1y'
          this.userId = null
          this.isShown = false
          this.$emit('refresh')

          this.key = _.get(resp, 'data.authentication.createApiKey.key', '???')
          this.isCopyKeyDialogShown = true

          setTimeout(() => {
            this.$refs.keyContentsIpt.$refs.input.select()
          }, 400)
        } else {
          this.$store.commit('showNotification', {
            style: 'red',
            message: _.get(resp, 'data.authentication.createApiKey.responseResult.message', 'An unexpected error occurred.'),
            icon: 'alert'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.loading = false
    }
  },
  apollo: {
    users: {
      query: gql`
        {
          authentication {
            apiKeyUsers {
              id
              name
              email
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => data.authentication.apiKeyUsers,
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-api-users-refresh')
      }
    }
  }
}
</script>
