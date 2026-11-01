<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-people.svg', alt='组', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft 组
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p4s 浏览和管理用户组
          v-spacer
          v-btn.animated.fadeInDown.wait-p3s(icon, outlined, color='grey', href='https://docs.requarks.io/groups', target='_blank')
            v-icon mdi-help-circle
          v-btn.animated.fadeInDown.wait-p2s.mx-3(color='grey', outlined, @click='refresh', icon)
            v-icon mdi-refresh
          v-dialog(v-model='newGroupDialog', max-width='500')
            template(v-slot:activator='{ on }')
              v-btn.animated.fadeInDown(color='primary', depressed, v-on='on', large)
                v-icon(left) mdi-plus
                span 新建组
            v-card
              .dialog-header.is-short 新建组
              v-card-text.pt-5
                v-text-field.md2(
                  outlined
                  prepend-icon='mdi-account-group'
                  v-model='newGroupName'
                  label='组名称'
                  counter='255'
                  @keyup.enter='createGroup'
                  @keyup.esc='newGroupDialog = false'
                  ref='groupNameIpt'
                  )
              v-card-chin
                v-spacer
                v-btn(text, @click='newGroupDialog = false') 取消
                v-btn(color='primary', @click='createGroup') 创建
        v-card.mt-3.animated.fadeInUp
          v-data-table(
            :items='groups'
            :headers='headers'
            :search='search'
            :page.sync='pagination'
            :items-per-page='15'
            :loading='loading'
            @page-count='pageCount = $event'
            must-sort,
            hide-default-footer
          )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='$router.push("/groups/" + props.item.id)')
                td {{ props.item.id }}
                td: strong {{ props.item.name }}
                td {{ props.item.userCount }}
                td {{ props.item.createdAt | moment('calendar') }}
                td {{ props.item.updatedAt | moment('calendar') }}
                td
                  v-tooltip(left, v-if='props.item.isSystem')
                    template(v-slot:activator='{ on }')
                      v-icon(v-on='on') mdi-lock-outline
                    span 系统组
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outline) 暂无可显示的组。
          .text-xs-center.py-2(v-if='pageCount > 1')
            v-pagination(v-model='pagination', :length='pageCount')
</template>

<script>
import _ from 'lodash'

import groupsQuery from 'gql/admin/groups/groups-query-list.gql'
import createGroupMutation from 'gql/admin/groups/groups-mutation-create.gql'

export default {
  data() {
    return {
      newGroupDialog: false,
      newGroupName: '',
      selectedGroup: {},
      pagination: 1,
      pageCount: 0,
      groups: [],
      headers: [
        { text: '编号', value: 'id', width: 80, sortable: true },
        { text: '名称', value: 'name' },
        { text: '用户数', value: 'userCount', width: 200 },
        { text: '创建时间', value: 'createdAt', width: 250 },
        { text: '最后更新', value: 'updatedAt', width: 250 },
        { text: '', value: 'isSystem', width: 20, sortable: false }
      ],
      search: '',
      loading: false
    }
  },
  watch: {
    newGroupDialog(newValue, oldValue) {
      if (newValue) {
        this.$nextTick(() => {
          this.$refs.groupNameIpt.focus()
        })
      }
    }
  },
  methods: {
    async refresh() {
      await this.$apollo.queries.groups.refetch()
      this.$store.commit('showNotification', {
        message: '组列表已刷新。',
        style: 'success',
        icon: 'cached'
      })
    },
    async createGroup() {
      if (_.trim(this.newGroupName).length < 1) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: '请输入组名称。',
          icon: 'warning'
        })
        return
      }
      this.newGroupDialog = false
      try {
        await this.$apollo.mutate({
          mutation: createGroupMutation,
          variables: {
            name: this.newGroupName
          },
          update (store, resp) {
            const data = _.get(resp, 'data.groups.create', { responseResult: {} })
            if (data.responseResult.succeeded === true) {
              const apolloData = store.readQuery({ query: groupsQuery })
              data.group.userCount = 0
              apolloData.groups.list.push(data.group)
              store.writeQuery({ query: groupsQuery, data: apolloData })
            } else {
              throw new Error(data.responseResult.message)
            }
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-groups-create')
          }
        })
        this.newGroupName = ''
        this.$store.commit('showNotification', {
          style: 'success',
          message: `组创建成功。`,
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  },
  apollo: {
    groups: {
      query: groupsQuery,
      fetchPolicy: 'network-only',
      update: (data) => data.groups.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-groups-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
