<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img(src='/_assets/svg/icon-maintenance.svg', alt='其他', style='width: 80px;')
          .admin-header-title
            .headline.primary--text 其他
            .subtitle-1.grey--text 维护、迁移及站点工具

      v-flex(lg3, xs12)
        v-card.animated.fadeInUp
          v-toolbar(flat, color='primary', dark, dense)
            .subtitle-1 工具
          v-list(two-line, dense).py-0
            template(v-for='(tool, idx) in tools')
              v-list-item(:key='tool.key', @click='selectedTool = tool.key', :disabled='!tool.isAvailable')
                v-list-item-avatar
                  v-icon(:color='!tool.isAvailable ? `grey lighten-1` : (selectedTool === tool.key ? `blue ` : `grey darken-1`)') {{ tool.icon }}
                v-list-item-content
                  v-list-item-title.body-2(:class='!tool.isAvailable ? `grey--text` : (selectedTool === tool.key ? `primary--text` : ``)') {{ tool.title }}
                  v-list-item-subtitle: .caption(:class='!tool.isAvailable ? `grey--text text--lighten-1` : (selectedTool === tool.key ? `blue--text ` : ``)') {{ tool.subtitle }}
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
          i18nKey: 'auth',
          title: '身份验证',
          subtitle: '重新生成证书或重置访客用户',
          isAvailable: true
        },
        {
          key: 'UtilityContent',
          icon: 'mdi-content-duplicate',
          i18nKey: 'content',
          title: '内容',
          subtitle: '重建页面树、重新渲染页面及迁移内容',
          isAvailable: true
        },
        {
          key: 'UtilityExport',
          icon: 'mdi-database-export',
          i18nKey: 'export',
          title: '导出',
          subtitle: '将站点数据导出到文件系统',
          isAvailable: true
        },
        {
          key: 'UtilityBackup',
          icon: 'mdi-package-variant-closed',
          // Wiki.js 3.x backup utility has its own labels.
          title: '导出为 Wiki.js 3.x',
          subtitle: '创建 .wkbackup 迁移包',
          isAvailable: true
        },
        {
          key: 'UtilityCache',
          icon: 'mdi-database-refresh',
          i18nKey: 'cache',
          title: '缓存',
          subtitle: '清空页面、资源及客户端语言缓存',
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
          i18nKey: 'importv1',
          title: '从 Wiki.js 1.x 导入',
          subtitle: '导入旧版 Wiki.js 的内容及用户',
          isAvailable: true
        },
        {
          key: 'UtilityTelemetry',
          icon: 'mdi-math-compass',
          i18nKey: 'telemetry',
          title: '遥测',
          subtitle: '查看并管理匿名使用数据',
          isAvailable: true
        }
      ]
    }
  }
}
</script>

<style lang='scss'>

</style>
