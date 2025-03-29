import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userInfoService } from '@/api/user'
import { refreshToken } from '@/api/user'

// 用户模块
export const useUserStore = defineStore(
  'anylink-user',
  () => {
    const at = ref({
      token: '',
      secret: '',
      expiretime: 0
    })
    const rt = ref({
      token: '',
      secret: '',
      expiretime: 0
    })

    // 判断是否登录
    const isLogin = async () => {
      if (!at.value.token) {
        return false
      } else {
        const now = new Date().getTime()
        if (at.value.expiretime && now < at.value.expiretime) {
          return true
        } else {
          if (rt.value.token && rt.value.expiretime && now < rt.value.expiretime) {
            const res = await refreshToken()
            if (res.data.data.accessToken) {
              setAt(res.data.data.accessToken)
              return true
            } else {
              return false
            }
          } else {
            return false
          }
        }
      }
    }

    // 如果AT过期，则用RT去刷新AT
    const getAccessToken = async () => {
      if (!at.value.token || !at.value.expiretime) {
        // 没有值表示未登录
        clearAt()
        clearRt()
        return ''
      }

      const now = new Date().getTime()
      if (at.value.token && now < at.value.expiretime) {
        return at.value.token
      } else if (rt.value.token && rt.value.expiretime && now < rt.value.expiretime) {
        const res = await refreshToken()
        if (res.data.data.accessToken) {
          setAt(res.data.data.accessToken)
          return at.value.token
        } else {
          clearAt()
          clearRt()
          return ''
        }
      } else {
        clearAt()
        clearRt()
        return ''
      }
    }

    const getRefreshToken = () => {
      const now = new Date().getTime()
      if (rt.value.token && rt.value.expiretime && now < rt.value.expiretime) {
        return rt.value.token
      } else {
        clearAt()
        clearRt()
        return ''
      }
    }

    const setAt = (newAt) => {
      const now = new Date()
      at.value = {
        token: newAt.token,
        secret: newAt.secret,
        expiretime: now.getTime() + newAt.expire * 1000
      }
    }
    const setRt = (newRt) => {
      const now = new Date()
      rt.value = {
        token: newRt.token,
        secret: newRt.secret,
        expiretime: now.getTime() + newRt.expire * 1000
      }
    }
    const clearAt = () => {
      at.value = {
        token: '',
        secret: '',
        expiretime: 0
      }
    }
    const clearRt = () => {
      rt.value = {
        token: '',
        secret: '',
        expiretime: 0
      }
    }

    const user = ref({})

    const updateUser = async () => {
      const res = await userInfoService()
      user.value = res.data.data
    }

    const setUser = (obj) => {
      user.value = obj
    }

    const updateUserStatus = (status) => {
      user.value.status = status
    }

    const isRemenberMe = ref(false)

    const setIsRemenberMe = (flag) => {
      isRemenberMe.value = flag
    }

    const clientId = ref('')

    const setClientId = (id) => {
      clientId.value = id
    }

    const clear = () => {
      clearAt()
      clearRt()
      setUser({ account: user.value.account })
    }

    return {
      at,
      rt,
      setAt,
      setRt,
      isLogin,
      getAccessToken,
      getRefreshToken,
      clearAt,
      clearRt,
      user,
      updateUser,
      setUser,
      updateUserStatus,
      isRemenberMe,
      setIsRemenberMe,
      clientId,
      setClientId,
      clear
    }
  },
  {
    persist: true
  }
)
