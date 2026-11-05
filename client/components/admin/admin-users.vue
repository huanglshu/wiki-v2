<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-customer.svg', :alt='$t("admin:ui.users.title")', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft {{ $t('admin:ui.users.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{ $t('admin:ui.users.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s.mr-3(outlined, color='grey', icon, @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='primary', large, depressed, @click='createUser')
            v-icon(left) mdi-plus
            span {{ $t('admin:ui.users.create') }}
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-account-search-outline'
              :label='$t("admin:ui.users.search")'
              hide-details
              style='max-width: 400px;'
              dense
              )
            v-spacer
            v-select(
              solo
              flat
              hide-details
              :label='$t("admin:ui.users.provider")'
              :items='strategyOptions'
              v-model='filterStrategy'
              item-text='displayName'
              item-value='key'
              style='max-width: 300px;'
              dense
            )
          v-divider
          v-data-table(
            v-model='selected'
            :items='usersFiltered',
            :headers='headers',
            :search='search',
            :page.sync='pagination'
            :items-per-page='15'
            :loading='loading'
            @page-count='pageCount = $event'
            hide-default-footer
            )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='$router.push("/users/" + props.item.id)')
                //- td
                  v-checkbox(hide-details, :input-value='props.selected', color='blue darken-2', @click='props.selected = !props.selected')
                td {{ props.item.id }}
                td: strong {{ props.item.name }}
                td {{ props.item.email }}
                td {{ getStrategyName(props.item.providerKey) }}
                td {{ formatCreatedDate(props.item.createdAt) }}
                td
                  span(v-if='props.item.lastLoginAt') {{ formatRelativeTime(props.item.lastLoginAt) }}
                  em.grey--text(v-else) {{ $t('admin:ui.users.never') }}
                td.text-right
                  v-icon.mr-3(v-if='props.item.isSystem') mdi-lock-outline
                  status-indicator(positive, pulse, v-if='props.item.isActive')
                  status-indicator(negative, pulse, v-else)
            template(slot='no-data')
              .pa-3
                v-alert.text-left(icon='mdi-alert', outlined, color='grey')
                  em.body-2 {{ $t('admin:ui.users.empty') }}
          v-card-chin(v-if='pageCount > 1')
            v-spacer
            v-pagination(v-model='pagination', :length='pageCount')
            v-spacer

    user-create(v-model='isCreateDialogShown', @refresh='refresh(false)')
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'

import { StatusIndicator } from 'vue-status-indicator'
import UserCreate from './admin-users-create.vue'

const providerTranslations = {
  local: 'Local',
  ldap: 'LDAP / Active Directory',
  saml: 'SAML',
  oidc: 'OpenID Connect',
  oauth2: 'OAuth2',
  auth0: 'Auth0',
  azure: 'Microsoft Azure',
  cas: 'CAS',
  discord: 'Discord',
  dropbox: 'Dropbox',
  facebook: 'Facebook',
  github: 'GitHub',
  gitlab: 'GitLab',
  google: 'Google',
  keycloak: 'Keycloak',
  slack: 'Slack',
  twitch: 'Twitch'
}

export default {
  components: {
    StatusIndicator,
    UserCreate
  },
  data() {
    return {
      selected: [],
      pagination: 1,
      pageCount: 0,
      users: [],
      headers: [
        { text: this.$t('admin:ui.users.columns.id'), value: 'id', width: 80, sortable: true },
        { text: this.$t('admin:ui.users.columns.name'), value: 'name', sortable: true },
        { text: this.$t('admin:ui.users.columns.email'), value: 'email', sortable: true },
        { text: this.$t('admin:ui.users.columns.provider'), value: 'provider', sortable: true },
        { text: this.$t('admin:ui.users.columns.created'), value: 'createdAt', sortable: true },
        { text: this.$t('admin:ui.users.columns.lastLogin'), value: 'lastLoginAt', sortable: true },
        { text: '', value: 'actions', sortable: false, width: 80 }
      ],
      strategies: [],
      filterStrategy: 'all',
      search: '',
      loading: false,
      isCreateDialogShown: false
    }
  },
  computed: {
    strategyOptions () {
      return _.concat({
        key: 'all',
        displayName: this.$t('admin:ui.users.allProviders')
      }, this.strategies)
    },
    usersFiltered () {
      const all = this.filterStrategy === 'all' || this.filterStrategy === ''
      return _.filter(this.users, u => all || u.providerKey === this.filterStrategy)
    }
  },
  methods: {
    formatRelativeTime(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      const language = this.$i18n.i18next.language || this.$moment.locale()
      return value.locale(language === 'zh' ? 'zh-cn' : language).fromNow()
    },
    formatCreatedDate(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      return value.locale('en').format('YYYY-MM-DD HH:mm:ss')
    },
    createUser() {
      this.isCreateDialogShown = true
    },
    async refresh(notify = true) {
      await this.$apollo.queries.users.refetch()
      if (notify) {
        this.$store.commit('showNotification', {
          message: this.$t('admin:ui.users.refreshSuccess'),
          style: 'success',
          icon: 'cached'
        })
      }
    },
    getStrategyName(key) {
      const displayName = (_.find(this.strategies, ['key', key]) || {}).displayName || providerTranslations[key] || key
      return this.$t(`admin:ui.users.providers.${key}`, { defaultValue: displayName })
    }
  },
  apollo: {
    users: {
      query: gql`
        query {
          users {
            list {
              id
              name
              email
              providerKey
              isSystem
              isActive
              createdAt
              lastLoginAt
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => data.users.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-users-refresh')
      }
    },
    strategies: {
      query: gql`
        query {
          authentication {
            activeStrategies {
              key
              displayName
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => _.get(data, 'authentication.activeStrategies', []),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-users-strategies-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
