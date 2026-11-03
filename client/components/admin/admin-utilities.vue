<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img(src='/_assets/svg/icon-maintenance.svg', :alt='$t("admin:ui.utilities.title")', style='width: 80px;')
          .admin-header-title
            .headline.primary--text {{ $t('admin:ui.utilities.title') }}
            .subtitle-1.grey--text {{ $t('admin:ui.utilities.subtitle') }}

      v-flex(lg3, xs12)
        v-card.animated.fadeInUp
          v-toolbar(flat, color='primary', dark, dense)
            .subtitle-1 {{ $t('admin:ui.utilities.tools') }}
          v-list(two-line, dense).py-0
            template(v-for='(tool, idx) in tools')
              v-list-item(:key='tool.key', @click='selectedTool = tool.key', :disabled='!tool.isAvailable')
                v-list-item-avatar
                  v-icon(:color='!tool.isAvailable ? `grey lighten-1` : (selectedTool === tool.key ? `blue ` : `grey darken-1`)') {{ tool.icon }}
                v-list-item-content
                  v-list-item-title.body-2(:class='!tool.isAvailable ? `grey--text` : (selectedTool === tool.key ? `primary--text` : ``)') {{ $t(tool.titleKey) }}
                  v-list-item-subtitle: .caption(:class='!tool.isAvailable ? `grey--text text--lighten-1` : (selectedTool === tool.key ? `blue--text ` : ``)') {{ $t(tool.subtitleKey) }}
                v-list-item-avatar(v-if='selectedTool === tool.key')
                  v-icon.animated.fadeInLeft(color='primary', large) mdi-chevron-right
              v-divider(v-if='idx < tools.length - 1')

      v-flex.animated.fadeInUp.wait-p2s(xs12, lg9)
        transition(name='admin-router')
          component(:is='selectedTool')

</template>

<script>

export default {
  components: {
    UtilityAuth: () => import(/* webpackChunkName: "admin" */ './admin-utilities-auth.vue'),
    UtilityBackup: () => import(/* webpackChunkName: "admin" */ './admin-utilities-backup.vue'),
    UtilityContent: () => import(/* webpackChunkName: "admin" */ './admin-utilities-content.vue'),
    UtilityCache: () => import(/* webpackChunkName: "admin" */ './admin-utilities-cache.vue'),
    UtilityExport: () => import(/* webpackChunkName: "admin" */ './admin-utilities-export.vue'),
    UtilityImportv1: () => import(/* webpackChunkName: "admin" */ './admin-utilities-importv1.vue'),
    UtilityTelemetry: () => import(/* webpackChunkName: "admin" */ './admin-utilities-telemetry.vue')
  },
  data() {
    return {
      selectedTool: 'UtilityAuth',
      tools: [
        {
          key: 'UtilityAuth',
          icon: 'mdi-lock-open-outline',
          titleKey: 'admin:ui.utilities.auth.title',
          subtitleKey: 'admin:ui.utilities.auth.subtitle',
          isAvailable: true
        },
        {
          key: 'UtilityContent',
          icon: 'mdi-content-duplicate',
          titleKey: 'admin:ui.utilities.content.title',
          subtitleKey: 'admin:ui.utilities.content.subtitle',
          isAvailable: true
        },
        {
          key: 'UtilityExport',
          icon: 'mdi-database-export',
          titleKey: 'admin:ui.utilities.export.title',
          subtitleKey: 'admin:ui.utilities.export.subtitle',
          isAvailable: true
        },
        {
          key: 'UtilityBackup',
          icon: 'mdi-package-variant-closed',
          titleKey: 'admin:ui.utilities.backup.title',
          subtitleKey: 'admin:ui.utilities.backup.subtitle',
          isAvailable: true
        },
        {
          key: 'UtilityCache',
          icon: 'mdi-database-refresh',
          titleKey: 'admin:ui.utilities.cache.title',
          subtitleKey: 'admin:ui.utilities.cache.subtitle',
          isAvailable: true
        },
        // {
        //   key: 'UtilityGraphEndpoint',
        //   icon: 'mdi-graphql',
        //   i18nKey: 'graphEndpoint',
        //   isAvailable: false
        // },
        {
          key: 'UtilityImportv1',
          icon: 'mdi-database-import',
          titleKey: 'admin:ui.utilities.importv1.title',
          subtitleKey: 'admin:ui.utilities.importv1.subtitle',
          isAvailable: true
        },
        {
          key: 'UtilityTelemetry',
          icon: 'mdi-math-compass',
          titleKey: 'admin:ui.utilities.telemetry.title',
          subtitleKey: 'admin:ui.utilities.telemetry.subtitle',
          isAvailable: true
        }
      ]
    }
  }
}
</script>

<style lang='scss'>

</style>
