<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 从 Wiki.js 1.x 导入
    v-card-text
      .text-center
        img.animated.fadeInUp.wait-p1s(src='/_assets/svg/icon-software.svg')
        .body-2 从 Wiki.js 1.x 导入
      v-divider.my-4
      .body-2 可使用此工具从 Wiki.js 1.x 安装导入数据。请选择要导入的内容：
      v-checkbox(
        label='内容 + 上传文件'
        value='content'
        color='deep-orange darken-2'
        v-model='importFilters'
        hide-details
        )
        template(v-slot:label)
          strong.deep-orange--text.text--darken-2 内容 + 上传文件
      .pl-8(v-if='wantContent')
        v-radio-group(v-model='contentMode', hide-details)
          v-radio(
            value='git'
            color='primary'
            )
            template(v-slot:label)
              div
                span 从 Git 连接导入
                .caption: em #[strong.primary--text 推荐] | 同时自动配置 Git 存储模块。
        .pl-8.mt-5(v-if='needGit')
          v-row
            v-col(cols='8')
              v-select(
                label='身份验证方式'
                :items='gitAuthModes'
                v-model='gitAuthMode'
                outlined
                hide-details
              )
            v-col(cols='4')
              v-switch(
                label='验证 SSL 证书'
                v-model='gitVerifySSL'
                hide-details
                color='primary'
              )
            v-col(cols='8')
              v-text-field(
                outlined
                label='仓库地址'
                :placeholder='(gitAuthMode === `ssh`) ? `e.g. git@github.com:orgname/repo.git` : `e.g. https://github.com/orgname/repo.git`'
                hide-details
                v-model='gitRepoUrl'
              )
            v-col(cols='4')
              v-text-field(
                label='分支'
                placeholder='e.g. master'
                v-model='gitRepoBranch'
                outlined
                hide-details
              )
            v-col(v-if='gitAuthMode === `ssh`', cols='12')
              v-textarea(
                outlined
                label='私钥内容'
                placeholder='-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'
                hide-details
                v-model='gitPrivKey'
              )
            template(v-else-if='gitAuthMode === `basic`')
              v-col(cols='6')
                v-text-field(
                  label='用户名'
                  v-model='gitUsername'
                  outlined
                  hide-details
                )
              v-col(cols='6')
                v-text-field(
                  type='password'
                  label='密码 / 个人访问令牌'
                  v-model='gitPassword'
                  outlined
                  hide-details
                )
            v-col(cols='6')
              v-text-field(
                label='默认作者邮箱'
                placeholder='e.g. name@company.com'
                v-model='gitUserEmail'
                outlined
                hide-details
              )
            v-col(cols='6')
              v-text-field(
                label='默认作者名称'
                placeholder='e.g. John Smith'
                v-model='gitUserName'
                outlined
                hide-details
              )
            v-col(cols='12')
              v-text-field(
                label='本地仓库路径'
                placeholder='e.g. ./data/repo'
                v-model='gitRepoPath'
                outlined
                hide-details
              )
              .caption.mt-2 此文件夹必须为空或尚不存在。#[strong.deep-orange--text.text--darken-2 请勿] 指向现有 Wiki.js 1.x 仓库目录。通常保持默认值即可。
          v-alert(color='deep-orange', outlined, icon='mdi-alert', prominent)
            .body-2 - 注意：如果已配置 Git 存储模块，其配置将被以上设置替换。
            .body-2 - 虽然 v1 和 v2 可以共用同一个远程 Git 仓库，但不应该同时编辑相同页面。
        v-radio-group(v-model='contentMode', hide-details)
          v-divider
          v-radio.mt-3(
            value='disk'
            color='primary'
            )
            template(v-slot:label)
              div
                span 从本地文件夹导入
                .caption: em 仅在 Wiki.js 1.x 未配置 Git 时选择此项。
        .pl-8.mt-5(v-if='needDisk')
          v-text-field(
            outlined
            label='内容仓库路径'
            hint='Wiki.js 1.x 内容在磁盘上的绝对路径。'
            persistent-hint
            v-model='contentPath'
          )

      v-checkbox(
        label='用户'
        value='users'
        color='deep-orange darken-2'
        v-model='importFilters'
        hide-details
        )
        template(v-slot:label)
          strong.deep-orange--text.text--darken-2 用户
      .pl-8.mt-5(v-if='wantUsers')
        v-text-field(
          outlined
          label='MongoDB 连接字符串'
          hint='用于连接 Wiki.js 1.x MongoDB 数据库的连接字符串。'
          persistent-hint
          v-model='dbConnStr'
        )
        v-radio-group(v-model='groupMode', hide-details, mandatory)
          v-radio(
            value='MULTI'
            color='primary'
            )
            template(v-slot:label)
              div
                span 为每种不同的用户权限配置创建组
                .caption: em #[strong.primary--text 推荐] | 权限相同的用户将分配到同一个组。可能会创建较多组。
          v-divider
          v-radio.mt-3(
            value='SINGLE'
            color='primary'
            )
            template(v-slot:label)
              div
                span 将所有已导入用户放入同一个组
                .caption: em 新组默认启用读取权限。
          v-divider
          v-radio.mt-3(
            value='NONE'
            color='primary'
            )
            template(v-slot:label)
              div
                span 不创建任何组
                .caption: em 在分配用户组之前，用户将无法访问 Wiki。

        v-alert.mt-5(color='deep-orange', outlined, icon='mdi-alert', prominent)
          .body-2 当前安装中已存在的用户不会被导入。完成后会显示被跳过的用户列表。
          .caption.grey--text 如需迁移旧安装中的用户，必须先删除当前安装中的同名用户。

    v-card-chin
      v-btn.px-3(depressed, color='deep-orange darken-2', :disabled='!wantUsers && !wantContent', @click='startImport').ml-0
        v-icon(left, color='white') mdi-database-import
        span.white--text 开始导入
    v-dialog(
      v-model='isLoading'
      persistent
      max-width='350'
      )
      v-card(color='deep-orange darken-2', dark)
        v-card-text.pa-10.text-center
          semipolar-spinner.animated.fadeIn(
            :animation-duration='1500'
            :size='65'
            color='#FFF'
            style='margin: 0 auto;'
          )
          .mt-5.body-1.white--text 正在从 Wiki.js 1.x 导入...
          .caption 请稍候
          v-progress-linear.mt-5(
            color='white'
            :value='progress'
            stream
            rounded
            :buffer-value='0'
          )
    v-dialog(
      v-model='isSuccess'
      persistent
      max-width='350'
      )
      v-card(color='green darken-2', dark)
        v-card-text.pa-10.text-center
          v-icon(size='60') mdi-check-circle-outline
          .my-5.body-1.white--text 导入完成
          template(v-if='wantUsers')
            .body-2
              span 已导入 #[strong {{successUsers}}] 个用户
              v-btn.text-none.ml-3(
                v-if='failedUsers.length > 0'
                text
                color='white'
                dark
                @click='showFailedUsers = true'
                )
                v-icon(left) mdi-alert
                span {{failedUsers.length}} 个失败
            .body-2 已创建 #[strong {{successGroups}}] 个组
        v-card-actions.green.darken-1
          v-spacer
          v-btn.px-5(
            color='white'
            outlined
            @click='isSuccess = false'
          ) 关闭
          v-spacer
    v-dialog(
      v-model='showFailedUsers'
      persistent
      max-width='800'
      )
      v-card(color='red darken-2', dark)
        v-toolbar(color='red darken-2', dense)
          v-icon mdi-alert
          .body-2.pl-3 用户导入失败记录
          v-spacer
          v-btn.px-5(
            color='white'
            text
            @click='showFailedUsers = false'
            ) 关闭
        v-simple-table(dense, fixed-header, height='300px')
          template(v-slot:default)
            thead
              tr
                th 验证方式
                th 邮箱
                th 错误
            tbody
              tr(v-for='(fusr, idx) in failedUsers', :key='`fusr-` + idx')
                td {{fusr.provider}}
                td {{fusr.email}}
                td {{fusr.error}}
</template>

<script>
import _ from 'lodash'

import { SemipolarSpinner } from 'epic-spinners'

import utilityImportv1UsersMutation from 'gql/admin/utilities/utilities-mutation-importv1-users.gql'
import storageTargetsQuery from 'gql/admin/storage/storage-query-targets.gql'
import storageStatusQuery from 'gql/admin/storage/storage-query-status.gql'
import targetExecuteActionMutation from 'gql/admin/storage/storage-mutation-executeaction.gql'
import targetsSaveMutation from 'gql/admin/storage/storage-mutation-save-targets.gql'

export default {
  components: {
    SemipolarSpinner
  },
  data() {
    return {
      importFilters: ['content', 'users'],
      groupMode: 'MULTI',
      contentMode: 'git',
      dbConnStr: 'mongodb://',
      contentPath: '/wiki-v1/repo',
      isLoading: false,
      isSuccess: false,
      gitAuthMode: 'ssh',
      gitAuthModes: [
        { text: 'SSH', value: 'ssh' },
        { text: '用户名和密码', value: 'basic' }
      ],
      gitVerifySSL: true,
      gitRepoUrl: '',
      gitRepoBranch: 'master',
      gitPrivKey: '',
      gitUsername: '',
      gitPassword: '',
      gitUserEmail: '',
      gitUserName: '',
      gitRepoPath: './data/repo',
      progress: 0,
      successGroups: 0,
      successUsers: 0,
      successPages: 0,
      showFailedUsers: false,
      failedUsers: []
    }
  },
  computed: {
    wantContent () {
      return this.importFilters.indexOf('content') >= 0
    },
    wantUsers () {
      return this.importFilters.indexOf('users') >= 0
    },
    needDisk () {
      return this.contentMode === `disk`
    },
    needGit () {
      return this.contentMode === `git`
    }
  },
  methods: {
    async startImport () {
      this.isLoading = true
      this.progress = 0
      this.failedUsers = []

      _.delay(async () => {
        // -> Import Users

        if (this.wantUsers) {
          try {
            const resp = await this.$apollo.mutate({
              mutation: utilityImportv1UsersMutation,
              variables: {
                mongoDbConnString: this.dbConnStr,
                groupMode: this.groupMode
              }
            })
            const respObj = _.get(resp, 'data.system.importUsersFromV1', {})
            if (!_.get(respObj, 'responseResult.succeeded', false)) {
              throw new Error(_.get(respObj, 'responseResult.message', '发生意外错误。'))
            }
            this.successUsers = _.get(respObj, 'usersCount', 0)
            this.successGroups = _.get(respObj, 'groupsCount', 0)
            this.failedUsers = _.get(respObj, 'failed', [])
            this.progress += 50
          } catch (err) {
            this.$store.commit('pushGraphError', err)
            this.isLoading = false
            return
          }
        }

        // -> Import Content

        if (this.wantContent) {
          try {
            const resp = await this.$apollo.query({
              query: storageTargetsQuery,
              fetchPolicy: 'network-only'
            })
            if (_.has(resp, 'data.storage.targets')) {
              this.progress += 10
              let targets = resp.data.storage.targets.map(str => {
                let nStr = {
                  ...str,
                  config: _.sortBy(str.config.map(cfg => ({
                    ...cfg,
                    value: JSON.parse(cfg.value)
                  })), [t => t.value.order])
                }

                // -> Setup Git Module

                if (this.contentMode === 'git' && nStr.key === 'git') {
                  nStr.isEnabled = true
                  nStr.mode = 'sync'
                  nStr.syncInterval = 'PT5M'
                  nStr.config = [
                    { key: 'authType', value: { value: this.gitAuthMode } },
                    { key: 'repoUrl', value: { value: this.gitRepoUrl } },
                    { key: 'branch', value: { value: this.gitRepoBranch } },
                    { key: 'sshPrivateKeyMode', value: { value: 'contents' } },
                    { key: 'sshPrivateKeyPath', value: { value: '' } },
                    { key: 'sshPrivateKeyContent', value: { value: this.gitPrivKey } },
                    { key: 'verifySSL', value: { value: this.gitVerifySSL } },
                    { key: 'basicUsername', value: { value: this.gitUsername } },
                    { key: 'basicPassword', value: { value: this.gitPassword } },
                    { key: 'defaultEmail', value: { value: this.gitUserEmail } },
                    { key: 'defaultName', value: { value: this.gitUserName } },
                    { key: 'localRepoPath', value: { value: this.gitRepoPath } },
                    { key: 'gitBinaryPath', value: { value: '' } }
                  ]
                }

                // -> Setup Disk Module
                if (this.contentMode === 'disk' && nStr.key === 'disk') {
                  nStr.isEnabled = true
                  nStr.mode = 'push'
                  nStr.syncInterval = 'P0D'
                  nStr.config = [
                    { key: 'path', value: { value: this.contentPath } },
                    { key: 'createDailyBackups', value: { value: false } }
                  ]
                }
                return nStr
              })

              // -> Save storage modules configuration

              const respSv = await this.$apollo.mutate({
                mutation: targetsSaveMutation,
                variables: {
                  targets: targets.map(tgt => _.pick(tgt, [
                    'isEnabled',
                    'key',
                    'config',
                    'mode',
                    'syncInterval'
                  ])).map(str => ({...str, config: str.config.map(cfg => ({...cfg, value: JSON.stringify({ v: cfg.value.value })}))}))
                }
              })
              const respObj = _.get(respSv, 'data.storage.updateTargets', {})
              if (!_.get(respObj, 'responseResult.succeeded', false)) {
                throw new Error(_.get(respObj, 'responseResult.message', '发生意外错误。'))
              }

              this.progress += 10

              // -> Wait for success sync

              let statusAttempts = 0
              while (statusAttempts < 10) {
                statusAttempts++
                const respStatus = await this.$apollo.query({
                  query: storageStatusQuery,
                  fetchPolicy: 'network-only'
                })
                if (_.has(respStatus, 'data.storage.status[0]')) {
                  const st = _.find(respStatus.data.storage.status, ['key', this.contentMode])
                  if (!st) {
                    throw new Error('无法配置存储目标。')
                  }
                  switch (st.status) {
                    case 'pending':
                      if (statusAttempts >= 10) {
                        throw new Error('存储目标一直处于等待状态，请重试。')
                      } else {
                        continue
                      }
                    case 'operational':
                      statusAttempts = 10
                      break
                    case 'error':
                      throw new Error(st.message)
                  }
                } else {
                  throw new Error('无法获取存储同步状态。')
                }
              }

              this.progress += 15

              // -> Perform import all

              const respImport = await this.$apollo.mutate({
                mutation: targetExecuteActionMutation,
                variables: {
                  targetKey: this.contentMode,
                  handler: 'importAll'
                }
              })

              const respImportObj = _.get(respImport, 'data.storage.executeAction', {})
              if (!_.get(respImportObj, 'responseResult.succeeded', false)) {
                throw new Error(_.get(respImportObj, 'responseResult.message', '发生意外错误。'))
              }

              this.progress += 15
            } else {
              throw new Error('无法获取存储目标。')
            }
          } catch (err) {
            this.$store.commit('pushGraphError', err)
            this.isLoading = false
            return
          }
        }

        this.isLoading = false
        this.isSuccess = true
      }, 1500)
    }
  }
}
</script>

<style lang='scss'>

</style>
