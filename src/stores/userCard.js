import { defineStore } from 'pinia'
import { ref } from 'vue'
import {} from '@/api/group'

// userCard用户详情卡片相关的缓存数据，不持久化存储
export const useUserCardStore = defineStore('anylink-userCard', () => {
  const isShow = ref(false)

  const userInfo = ref({})

  const setIsShow = (flag) => {
    isShow.value = flag
  }

  const setUserInfo = (info) => {
    userInfo.value = info
  }

  return {
    isShow,
    userInfo,

    setIsShow,
    setUserInfo
  }
})
