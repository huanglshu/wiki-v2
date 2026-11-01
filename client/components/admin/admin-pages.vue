<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-file.svg', alt='页面', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft 页面
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s 浏览、筛选和管理页面
          v-spacer
          v-btn.animated.fadeInDown.wait-p1s(icon, color='grey', outlined, @click='refresh')
            v-icon.grey--text mdi-refresh
          //- v-btn.animated.fadeInDown.mx-3(color='primary', outlined, @click='recyclebin', disabled)
          //-   v-icon(left) mdi-delete-outline
          //-   span Recycle Bin
          v-btn.animated.fadeInDown(color='primary', depressed, large, to='pages/visualize')
            v-icon(left) mdi-graph
            span 可视化
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-file-search-outline'
              label='搜索页面...'
              hide-details
              dense
              style='max-width: 400px;'
              )
            v-spacer
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              label='语言'
              :items='langs'
              v-model='selectedLang'
              style='max-width: 250px;'
            )
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              label='发布状态'
              :items='states'
              v-model='selectedState'
              style='max-width: 250px;'
            )
          v-divider
          v-data-table(
            :items='filteredPages'
            :headers='headers'
            :search='search'
            :page.sync='pagination'
            :items-per-page='15'
            :loading='loading'
            must-sort,
            sort-by='updatedAt',
            sort-desc,
            hide-default-footer
            @page-count="pageTotal = $event"
          )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='$router.push(`/pages/` + props.item.id)')
                td.text-xs-right {{ props.item.id }}
                td
                  .body-2: strong {{ props.item.title }}
                  .caption {{ props.item.description }}
                td.admin-pages-path
                  v-chip(label, small, :color='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`') {{ getLocaleName(props.item.locale) }}
                  span.ml-2.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') / {{ props.item.path }}
                td {{ props.item.createdAt | moment('calendar') }}
                td {{ props.item.updatedAt | moment('calendar') }}
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outlined) 暂无可显示的页面。
          .text-center.py-2.animated.fadeInDown(v-if='this.pageTotal > 1')
            v-pagination(v-model='pagination', :length='pageTotal')
</template>

<script>
import _ from 'lodash'
import pagesQuery from 'gql/admin/pages/pages-query-list.gql'

/* global siteLangs */

export default {
  data() {
    return {
      selectedPage: {},
      pagination: 1,
      pages: [],
      pageTotal: 0,
      headers: [
        { text: '编号', value: 'id', width: 80, sortable: true },
        { text: '标题', value: 'title' },
        { text: '路径', value: 'path' },
        { text: '创建时间', value: 'createdAt', width: 250 },
        { text: '最后更新', value: 'updatedAt', width: 250 }
      ],
      search: '',
      selectedLang: null,
      selectedState: null,
      states: [
        { text: '全部发布状态', value: null },
        { text: '已发布', value: true },
        { text: '未发布', value: false }
      ],
      loading: false
    }
  },
  computed: {
    filteredPages () {
      return _.filter(this.pages, pg => {
        if (this.selectedLang !== null && this.selectedLang !== pg.locale) {
          return false
        }
        if (this.selectedState !== null && this.selectedState !== pg.isPublished) {
          return false
        }
        return true
      })
    },
    langs () {
      const pageLocales = _.uniqBy(this.pages, 'locale').map(pg => {
        const locale = _.find(siteLangs, ['code', pg.locale])
        return {
          text: locale ? locale.name : pg.locale,
          value: pg.locale
        }
      })
      return _.concat({ text: '全部语言', value: null }, pageLocales)
    }
  },
  methods: {
    getLocaleName (code) {
      return _.get(_.find(siteLangs, ['code', code]), 'name', code)
    },
    async refresh() {
      await this.$apollo.queries.pages.refetch()
      this.$store.commit('showNotification', {
        message: '页面列表已刷新。',
        style: 'success',
        icon: 'cached'
      })
    },
    newpage() {
      this.pageSelectorShown = true
    },
    recyclebin () { }
  },
  apollo: {
    pages: {
      query: pagesQuery,
      fetchPolicy: 'network-only',
      update: (data) => data.pages.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.admin-pages-path {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-family: 'Roboto Mono', monospace;
}
</style>
