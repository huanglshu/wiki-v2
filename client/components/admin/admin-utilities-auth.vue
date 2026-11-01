<template lang='pug'>
  v-card
    v-toolbar(flat, color='primary', dark, dense)
      .subtitle-1 身份验证
    v-card-text
      .subtitle-1.pb-3.primary--text 生成新的身份验证公钥 / 私钥证书
      .body-2 此操作会使所有现有会话令牌失效，并让所有用户退出登录。
      .body-2.red--text 操作完成后需要重新登录。
      v-btn(outlined, color='primary', @click='regenCerts', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
      v-divider.my-5
      .subtitle-1.pb-3.primary--text 重置访客用户
      .body-2 将访客用户重置为默认参数和权限。
      v-btn(outlined, color='primary', @click='resetGuest', :disabled='loading').ml-0.mt-3
        v-icon(left) mdi-gesture-double-tap
        span 继续
</template>

<script>
import _ from 'lodash'
import Cookies from 'js-cookie'
import utilityAuthRegencertsMutation from 'gql/admin/utilities/utilities-mutation-auth-regencerts.gql'
import utilityAuthResetguestMutation from 'gql/admin/utilities/utilities-mutation-auth-resetguest.gql'

export default {
  data: () => {
    return {
      loading: false
    }
  },
  methods: {
    async regenCerts() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-auth-regencerts')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityAuthRegencertsMutation
        })
        const resp = _.get(respRaw, 'data.authentication.regenerateCertificates.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '新证书生成成功。',
            style: 'success',
            icon: 'check'
          })
          Cookies.remove('jwt')
          _.delay(() => {
            window.location.assign('/login')
          }, 1000)
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-auth-regencerts')
      this.loading = false
    },
    async resetGuest() {
      this.loading = true
      this.$store.commit(`loadingStart`, 'admin-utilities-auth-resetguest')

      try {
        const respRaw = await this.$apollo.mutate({
          mutation: utilityAuthResetguestMutation
        })
        const resp = _.get(respRaw, 'data.authentication.resetGuestUser.responseResult', {})
        if (resp.succeeded) {
          this.$store.commit('showNotification', {
            message: '访客用户重置成功。',
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(resp.message)
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }

      this.$store.commit(`loadingStop`, 'admin-utilities-auth-resetguest')
      this.loading = false
    }
  }
}
</script>

<style lang='scss'>

</style>
