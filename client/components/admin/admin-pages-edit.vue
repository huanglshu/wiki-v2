<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap, v-if='page.id')
      v-flex(xs12)
        .admin-header.admin-page-details-header
          img.animated.fadeInUp(src='/_assets/svg/icon-view-details.svg', :alt='$t("admin:ui.pageDetails.title", { defaultValue: "Page Details" })', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft {{ $t('admin:ui.pageDetails.title', { defaultValue: 'Page Details' }) }}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s
              v-chip.ml-0.mr-2(label, small).caption ID {{page.id}}
              span /{{page.locale}}/{{page.path}}
          v-spacer
          template(v-if='page.isPublished')
            status-indicator.mr-3(positive, pulse)
            .caption.green--text {{$t('common:page.published')}}
          template(v-else)
            status-indicator.mr-3(negative, pulse)
            .caption.red--text {{$t('common:page.unpublished')}}
          template(v-if='page.isPrivate')
            status-indicator.mr-3.ml-4(intermediary, pulse)
            .caption.deep-orange--text {{$t('common:page.private')}}
          template(v-else)
            status-indicator.mr-3.ml-4(active, pulse)
            .caption.blue--text {{$t('common:page.global')}}
          v-spacer
          v-btn.animated.fadeInDown.wait-p3s(color='grey', icon, outlined, to='/pages', :aria-label='$t("admin:ui.pageDetails.back", { defaultValue: "Back to pages" })')
            v-icon mdi-arrow-left
          v-menu(offset-y, origin='top right')
            template(v-slot:activator='{ on }')
              v-btn.mx-3.animated.fadeInDown.wait-p2s(color='black', v-on='on', depressed, dark)
                span {{ $t('admin:ui.pageDetails.actions', { defaultValue: 'Actions' }) }}
                v-icon(right) mdi-chevron-down
            v-list(dense, nav)
              v-list-item(:href='`/` + page.locale + `/` + page.path')
                v-list-item-icon
                  v-icon(color='indigo') mdi-text-subject
                v-list-item-title {{ $t('common:header.view') }}
              v-list-item(:href='`/e/` + page.locale + `/` + page.path')
                v-list-item-icon
                  v-icon(color='indigo') mdi-pencil
                v-list-item-title {{ $t('common:header.edit') }}
              //- v-list-item(@click='', disabled)
              //-   v-list-item-icon
              //-     v-icon(color='grey') mdi-cube-scan
              //-   v-list-item-title Re-Render
              //- v-list-item(@click='', disabled)
              //-   v-list-item-icon
              //-     v-icon(color='grey') mdi-earth-remove
              //-   v-list-item-title Unpublish
              v-list-item(:href='`/s/` + page.locale + `/` + page.path')
                v-list-item-icon
                  v-icon(color='indigo') mdi-code-tags
                v-list-item-title {{ $t('common:header.viewSource') }}
              v-list-item(:href='`/h/` + page.locale + `/` + page.path')
                v-list-item-icon
                  v-icon(color='indigo') mdi-history
                v-list-item-title {{ $t('admin:ui.pageDetails.viewHistory', { defaultValue: 'View History' }) }}
              //- v-list-item(@click='', disabled)
              //-   v-list-item-icon
              //-     v-icon(color='grey') mdi-content-duplicate
              //-   v-list-item-title Duplicate
              //- v-list-item(@click='', disabled)
              //-   v-list-item-icon
              //-     v-icon(color='grey') mdi-content-save-move-outline
              //-   v-list-item-title Move / Rename
              v-dialog(v-model='deletePageDialog', max-width='500')
                template(v-slot:activator='{ on }')
                  v-list-item(v-on='on')
                    v-list-item-icon
                      v-icon(color='red') mdi-trash-can-outline
                    v-list-item-title {{ $t('common:actions.delete') }}
                v-card
                  .dialog-header.is-short.is-red
                    v-icon.mr-2(color='white') mdi-file-document-box-remove-outline
                    span {{$t('common:page.delete')}}
                  v-card-text.pt-5
                    i18next.body-2(path='common:page.deleteTitle', tag='div')
                      span.red--text.text--darken-2(place='title') {{page.title}}
                    .caption {{$t('common:page.deleteSubtitle')}}
                    v-chip.mt-3.ml-0.mr-1(label, color='red lighten-4', disabled, small)
                      .caption.red--text.text--darken-2 {{page.locale.toUpperCase()}}
                    v-chip.mt-3.mx-0(label, color='red lighten-5', disabled, small)
                      span.red--text.text--darken-2 /{{page.path}}
                  v-card-chin
                    v-spacer
                    v-btn(text, @click='deletePageDialog = false', :disabled='loading') {{$t('common:actions.cancel')}}
                    v-btn(color='red darken-2', @click='deletePage', :loading='loading').white--text {{$t('common:actions.delete')}}
          v-btn.animated.fadeInDown(color='success', large, depressed, disabled)
            v-icon(left) mdi-check
            span {{ $t('common:actions.saveChanges') }}
      v-flex(xs12, lg6)
        v-card.animated.fadeInUp
          v-toolbar(color='primary', dense, dark, flat)
            v-icon.mr-2 mdi-text-subject
            span {{ $t('common:actions.properties') }}
          v-list.py-0(two-line, dense)
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.fieldTitle', { defaultValue: 'Title' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.title }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.description', { defaultValue: 'Description' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.description || '-' }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pages.locale') }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.locale }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pages.columns.path') }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.path }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:editor.title') }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.editor || '?' }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.contentType', { defaultValue: 'Content Type' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.contentType || '?' }}
            v-divider
            v-list-item
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.hash', { defaultValue: 'Page Hash' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.hash }}

      v-flex(xs12, lg6)
        v-card.animated.fadeInUp.wait-p2s
          v-toolbar(color='primary', dense, dark, flat)
            v-icon.mr-2 mdi-account-multiple
            span {{ $t('admin:ui.pageDetails.users', { defaultValue: 'Users' }) }}
          v-list.py-0(two-line, dense)
            v-list-item
              v-list-item-avatar(size='24')
                v-btn(icon, :to='`/users/` + page.creatorId')
                  v-icon(color='grey') mdi-account
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.creator', { defaultValue: 'Creator' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.creatorName }} #[em.caption ({{ page.creatorEmail }})]
              v-list-item-action
                v-list-item-action-text {{ formatPageDate(page.createdAt) }}
            v-divider
            v-list-item
              v-list-item-avatar(size='24')
                v-btn(icon, :to='`/users/` + page.authorId')
                  v-icon(color='grey') mdi-account
              v-list-item-content
                v-list-item-title: .overline.grey--text {{ $t('admin:ui.pageDetails.lastEditor', { defaultValue: 'Last Editor' }) }}
                v-list-item-subtitle.body-2(:class='$vuetify.theme.dark ? `grey--text text--lighten-2` : `grey--text text--darken-3`') {{ page.authorName }} #[em.caption ({{ page.authorEmail }})]
              v-list-item-action
                v-list-item-action-text {{ formatPageDate(page.updatedAt) }}

    v-layout(row, align-center, v-else)
      v-progress-circular(indeterminate, width='2', color='grey')
      .body-2.pl-3.grey--text {{ $t('common:page.loading') }}

</template>
<script>
import _ from 'lodash'
import { StatusIndicator } from 'vue-status-indicator'

import pageQuery from 'gql/admin/pages/pages-query-single.gql'
import deletePageMutation from 'gql/common/common-pages-mutation-delete.gql'

export default {
  components: {
    StatusIndicator
  },
  data() {
    return {
      deletePageDialog: false,
      page: {},
      loading: false
    }
  },
  methods: {
    formatPageDate (date) {
      const language = this.$i18n.i18next.language || this.$moment.locale()
      return this.$moment(date).locale(language === 'zh' ? 'zh-cn' : language).calendar()
    },
    async deletePage() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'page-delete')
      try {
        const resp = await this.$apollo.mutate({
          mutation: deletePageMutation,
          variables: {
            id: this.page.id
          }
        })
        if (_.get(resp, 'data.pages.delete.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'green',
            message: this.$t('admin:ui.pageDetails.deleteSuccess', { defaultValue: 'Page deleted successfully.' }),
            icon: 'check'
          })
          this.$router.replace('/pages')
        } else {
          throw new Error(_.get(resp, 'data.pages.delete.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit(`loadingStop`, 'page-delete')
    },
    async rerenderPage() {
      this.$store.commit('showNotification', {
        style: 'indigo',
        message: this.$t('admin:ui.pageDetails.comingSoon', { defaultValue: 'Coming soon...' }),
        icon: 'directions_boat'
      })
    }
  },
  apollo: {
    page: {
      query: pageQuery,
      variables() {
        return {
          id: _.toSafeInteger(this.$route.params.id)
        }
      },
      fetchPolicy: 'network-only',
      update: (data) => data.pages.single,
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.admin-page-details-header {
  flex-wrap: wrap;
  row-gap: 8px;

  .admin-header-title {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}
</style>
