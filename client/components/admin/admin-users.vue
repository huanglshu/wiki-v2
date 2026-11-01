<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-customer.svg', alt='用户', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft 用户
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s 浏览、筛选和管理用户
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s.mr-3(outlined, color='grey', icon, @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='primary', large, depressed, @click='createUser')
            v-icon(left) mdi-plus
            span 新建用户
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-account-search-outline'
              label='搜索用户...'
              hide-details
              style='max-width: 400px;'
              dense
              )
            v-spacer
            v-select(
              solo
              flat
              hide-details
              label='身份验证方式'
              :items='strategies'
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
                td {{ props.item.createdAt | moment('from') }}
                td
                  span(v-if='props.item.lastLoginAt') {{ props.item.lastLoginAt | moment('from') }}
                  em.grey--text(v-else) 从未登录
                td.text-right
                  v-icon.mr-3(v-if='props.item.isSystem') mdi-lock-outline
                  status-indicator(positive, pulse, v-if='props.item.isActive')
                  status-indicator(negative, pulse, v-else)
            template(slot='no-data')
              .pa-3
                v-alert.text-left(icon='mdi-alert', outlined, color='grey')
                  em.body-2 暂无可显示的用户。
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
  local: '本地账户',
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
        { text: '编号', value: 'id', width: 80, sortable: true },
        { text: '名称', value: 'name', sortable: true },
        { text: '邮箱', value: 'email', sortable: true },
        { text: '验证方式', value: 'provider', sortable: true },
        { text: '创建时间', value: 'createdAt', sortable: true },
        { text: '最后登录', value: 'lastLoginAt', sortable: true },
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
    usersFiltered () {
      const all = this.filterStrategy === 'all' || this.filterStrategy === ''
      return _.filter(this.users, u => all || u.providerKey === this.filterStrategy)
    }
  },
  methods: {
    createUser() {
      this.isCreateDialogShown = true
    },
    async refresh(notify = true) {
      await this.$apollo.queries.users.refetch()
      if (notify) {
        this.$store.commit('showNotification', {
          message: '用户列表已刷新。',
          style: 'success',
          icon: 'cached'
        })
      }
    },
    getStrategyName(key) {
      return (_.find(this.strategies, ['key', key]) || {}).displayName || providerTranslations[key] || key
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
      update: (data) => {
        return _.concat({
          key: 'all',
          displayName: '全部验证方式'
        }, data.authentication.activeStrategies)
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-users-strategies-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
