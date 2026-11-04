<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-file.svg', :alt='$t("admin:ui.pages.title")', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft {{ $t('admin:ui.pages.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{ $t('admin:ui.pages.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown.wait-p1s(icon, color='grey', outlined, @click='refresh')
            v-icon.grey--text mdi-refresh
          //- v-btn.animated.fadeInDown.mx-3(color='primary', outlined, @click='recyclebin', disabled)
          //-   v-icon(left) mdi-delete-outline
          //-   span Recycle Bin
          v-btn.animated.fadeInDown(color='primary', depressed, large, to='pages/visualize')
            v-icon(left) mdi-graph
            span {{ $t('admin:ui.pages.visualize') }}
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-file-search-outline'
              :label='$t("admin:ui.pages.search")'
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
              :label='$t("admin:ui.pages.locale")'
              :items='langs'
              v-model='selectedLang'
              style='max-width: 250px;'
            )
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              :label='$t("admin:ui.pages.state")'
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
                td {{ formatPageListDate(props.item.createdAt) }}
                td {{ formatPageListDate(props.item.updatedAt) }}
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outlined) {{ $t('admin:ui.pages.empty') }}
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
        { text: this.$t('admin:ui.pages.columns.id'), value: 'id', width: 80, sortable: true },
        { text: this.$t('admin:ui.pages.columns.title'), value: 'title' },
        { text: this.$t('admin:ui.pages.columns.path'), value: 'path' },
        { text: this.$t('admin:ui.pages.columns.created'), value: 'createdAt', width: 250 },
        { text: this.$t('admin:ui.pages.columns.updated'), value: 'updatedAt', width: 250 }
      ],
      search: '',
      selectedLang: null,
      selectedState: null,
      states: [
        { text: this.$t('admin:ui.pages.states.all'), value: null },
        { text: this.$t('admin:ui.pages.states.published'), value: true },
        { text: this.$t('admin:ui.pages.states.unpublished'), value: false }
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
      return _.concat({ text: this.$t('admin:ui.pages.allLocales'), value: null }, pageLocales)
    }
  },
  methods: {
    formatPageListDate(date) {
      if (!date) {
        return date
      }
      const value = this.$moment(date)
      if (!value.isValid()) {
        return date
      }
      return value.locale('en').format('YYYY-MM-DD HH:mm:ss')
    },
    getLocaleName (code) {
      return _.get(_.find(siteLangs, ['code', code]), 'name', code)
    },
    async refresh() {
      await this.$apollo.queries.pages.refetch()
      this.$store.commit('showNotification', {
        message: this.$t('admin:ui.pages.refreshSuccess'),
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
