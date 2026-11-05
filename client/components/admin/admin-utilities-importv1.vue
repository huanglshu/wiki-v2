<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 {{ $t('admin:ui.utilities.importv1.title') }}
    v-card-text
      .text-center
        img.animated.fadeInUp.wait-p1s(src='/_assets/svg/icon-software.svg')
        .body-2 {{ $t('admin:ui.utilities.importv1.title') }}
      v-divider.my-4
      .body-2 {{ $t('admin:ui.utilities.importv1.intro') }}
      v-checkbox(
        :label='$t("admin:ui.utilities.importv1.contentAndUploads")'
        value='content'
        color='deep-orange darken-2'
        v-model='importFilters'
        hide-details
        )
        template(v-slot:label)
          strong.deep-orange--text.text--darken-2 {{ $t('admin:ui.utilities.importv1.contentAndUploads') }}
      .pl-8(v-if='wantContent')
        v-radio-group(v-model='contentMode', hide-details)
          v-radio(
            value='git'
            color='primary'
            )
            template(v-slot:label)
              div
                span {{ $t('admin:ui.utilities.importv1.fromGit') }}
                .caption: em {{ $t('admin:ui.utilities.importv1.fromGitHint') }}
        .pl-8.mt-5(v-if='needGit')
          v-row
            v-col(cols='8')
              v-select(
                :label='$t("admin:ui.utilities.importv1.authMode")'
                :items='localizedGitAuthModes'
                v-model='gitAuthMode'
                outlined
                hide-details
              )
            v-col(cols='4')
              v-switch(
                :label='$t("admin:ui.utilities.importv1.verifySsl")'
                v-model='gitVerifySSL'
                hide-details
                color='primary'
              )
            v-col(cols='8')
              v-text-field(
                outlined
                :label='$t("admin:ui.utilities.importv1.repoUrl")'
                :placeholder='(gitAuthMode === `ssh`) ? `e.g. git@github.com:orgname/repo.git` : `e.g. https://github.com/orgname/repo.git`'
                hide-details
                v-model='gitRepoUrl'
              )
            v-col(cols='4')
              v-text-field(
                :label='$t("admin:ui.utilities.importv1.branch")'
                placeholder='e.g. master'
                v-model='gitRepoBranch'
                outlined
                hide-details
              )
            v-col(v-if='gitAuthMode === `ssh`', cols='12')
              v-textarea(
                outlined
                :label='$t("admin:ui.utilities.importv1.privateKey")'
                placeholder='-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----'
                hide-details
                v-model='gitPrivKey'
              )
            template(v-else-if='gitAuthMode === `basic`')
              v-col(cols='6')
                v-text-field(
                  :label='$t("admin:ui.utilities.importv1.username")'
                  v-model='gitUsername'
                  outlined
                  hide-details
                )
              v-col(cols='6')
                v-text-field(
                  type='password'
                  :label='$t("admin:ui.utilities.importv1.password")'
                  v-model='gitPassword'
                  outlined
                  hide-details
                )
            v-col(cols='6')
              v-text-field(
                :label='$t("admin:ui.utilities.importv1.authorEmail")'
                placeholder='e.g. name@company.com'
                v-model='gitUserEmail'
                outlined
                hide-details
              )
            v-col(cols='6')
              v-text-field(
                :label='$t("admin:ui.utilities.importv1.authorName")'
                placeholder='e.g. John Smith'
                v-model='gitUserName'
                outlined
                hide-details
              )
            v-col(cols='12')
              v-text-field(
                :label='$t("admin:ui.utilities.importv1.localRepoPath")'
                placeholder='e.g. ./data/repo'
                v-model='gitRepoPath'
                outlined
                hide-details
              )
              .caption.mt-2 {{ $t('admin:ui.utilities.importv1.localRepoPathHint') }}
          v-alert(color='deep-orange', outlined, icon='mdi-alert', prominent)
            .body-2 - {{ $t('admin:ui.utilities.importv1.gitWarning') }}
            .body-2 - {{ $t('admin:ui.utilities.importv1.gitWarning2') }}
        v-radio-group(v-model='contentMode', hide-details)
          v-divider
          v-radio.mt-3(
            value='disk'
            color='primary'
            )
            template(v-slot:label)
              div
                span {{ $t('admin:ui.utilities.importv1.fromDisk') }}
                .caption: em {{ $t('admin:ui.utilities.importv1.fromDiskHint') }}
        .pl-8.mt-5(v-if='needDisk')
          v-text-field(
            outlined
            :label='$t("admin:ui.utilities.importv1.contentPath")'
            :hint='$t("admin:ui.utilities.importv1.contentPathHint")'
            persistent-hint
            v-model='contentPath'
          )

      v-checkbox(
        :label='$t("admin:ui.utilities.importv1.users")'
        value='users'
        color='deep-orange darken-2'
        v-model='importFilters'
        hide-details
        )
        template(v-slot:label)
          strong.deep-orange--text.text--darken-2 {{ $t('admin:ui.utilities.importv1.users') }}
      .pl-8.mt-5(v-if='wantUsers')
        v-text-field(
          outlined
          :label='$t("admin:ui.utilities.importv1.mongoConn")'
          :hint='$t("admin:ui.utilities.importv1.mongoConnHint")'
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
                span {{ $t('admin:ui.utilities.importv1.groupMulti') }}
                .caption: em {{ $t('admin:ui.utilities.importv1.groupMultiHint') }}
          v-divider
          v-radio.mt-3(
            value='SINGLE'
            color='primary'
            )
            template(v-slot:label)
              div
                span {{ $t('admin:ui.utilities.importv1.groupSingle') }}
                .caption: em {{ $t('admin:ui.utilities.importv1.groupSingleHint') }}
          v-divider
          v-radio.mt-3(
            value='NONE'
            color='primary'
            )
            template(v-slot:label)
              div
                span {{ $t('admin:ui.utilities.importv1.groupNone') }}
                .caption: em {{ $t('admin:ui.utilities.importv1.groupNoneHint') }}

        v-alert.mt-5(color='deep-orange', outlined, icon='mdi-alert', prominent)
          .body-2 {{ $t('admin:ui.utilities.importv1.existingUsersWarning') }}
          .caption.grey--text {{ $t('admin:ui.utilities.importv1.existingUsersHint') }}

    v-card-chin
      v-btn.px-3(depressed, color='deep-orange darken-2', :disabled='!wantUsers && !wantContent', @click='startImport').ml-0
        v-icon(left, color='white') mdi-database-import
        span.white--text {{ $t('admin:ui.utilities.importv1.start') }}
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
          .mt-5.body-1.white--text {{ $t('admin:ui.utilities.importv1.running') }}
          .caption {{ $t('admin:ui.utilities.importv1.wait') }}
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
          .my-5.body-1.white--text {{ $t('admin:ui.utilities.importv1.success') }}
          template(v-if='wantUsers')
            .body-2
              span {{ $t('admin:ui.utilities.importv1.usersImported', { count: successUsers }) }}
              v-btn.text-none.ml-3(
                v-if='failedUsers.length > 0'
                text
                color='white'
                dark
                @click='showFailedUsers = true'
                )
                v-icon(left) mdi-alert
                span {{ $t('admin:ui.utilities.importv1.failedCount', { count: failedUsers.length }) }}
            .body-2 {{ $t('admin:ui.utilities.importv1.groupsCreated', { count: successGroups }) }}
        v-card-actions.green.darken-1
          v-spacer
          v-btn.px-5(
            color='white'
            outlined
            @click='isSuccess = false'
          ) {{ $t('common:actions.close') }}
          v-spacer
    v-dialog(
      v-model='showFailedUsers'
      persistent
      max-width='800'
      )
      v-card(color='red darken-2', dark)
        v-toolbar(color='red darken-2', dense)
          v-icon mdi-alert
          .body-2.pl-3 {{ $t('admin:ui.utilities.importv1.failedTitle') }}
          v-spacer
          v-btn.px-5(
            color='white'
            text
            @click='showFailedUsers = false'
            ) {{ $t('common:actions.close') }}
        v-simple-table(dense, fixed-header, height='300px')
          template(v-slot:default)
            thead
              tr
                th {{ $t('admin:ui.utilities.importv1.provider') }}
                th {{ $t('admin:ui.users.email') }}
                th {{ $t('admin:ui.utilities.importv1.error') }}
            tbody
              tr(v-for='(fusr, idx) in failedUsers', :key='`fusr-` + idx')
                td {{fusr.provider}}
                td {{fusr.email}}
                td {{ localizeError(fusr.error) }}
</template>

<script>
import _ from 'lodash'
import { getNotificationMessage } from '../../helpers/notification-message'

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
        { textKey: 'admin:ui.utilities.importv1.basicAuth', value: 'basic' }
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
    },
    localizedGitAuthModes () {
      return this.gitAuthModes.map(mode => ({
        ...mode,
        text: mode.text || this.$t(mode.textKey)
      }))
    }
  },
  methods: {
    localizeError (message) {
      return getNotificationMessage(message, (key, options) => this.$t(key, options))
    },
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
              throw new Error(_.get(respObj, 'responseResult.message', this.$t('common:error.unexpected')))
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
                throw new Error(_.get(respObj, 'responseResult.message', this.$t('common:error.unexpected')))
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
                    throw new Error(this.$t('admin:ui.utilities.importv1.storageConfigError'))
                  }
                  switch (st.status) {
                    case 'pending':
                      if (statusAttempts >= 10) {
                        throw new Error(this.$t('admin:ui.utilities.importv1.storagePendingError'))
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
                  throw new Error(this.$t('admin:ui.utilities.importv1.storageStatusError'))
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
                throw new Error(_.get(respImportObj, 'responseResult.message', this.$t('common:error.unexpected')))
              }

              this.progress += 15
            } else {
              throw new Error(this.$t('admin:ui.utilities.importv1.storageTargetsError'))
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
