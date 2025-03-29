import { defineStore } from 'pinia'
import { ref } from 'vue'
import {} from '@/api/group'

// groupCard群组详情卡片相关的缓存数据，不持久化存储
export const useGroupCardStore = defineStore('anylink-groupCard', () => {
  const isShow = ref(false)

  const groupId = ref('')

  const showModel = ref('')

  const changeMemberModel = ref('')

  const setOpened = (id) => {
    isShow.value = true
    groupId.value = id
  }

  const setClosed = () => {
    isShow.value = false
    groupId.value = ''
  }

  const setShowModel = (model) => {
    showModel.value = model
  }

  const setChangeMemberModel = (model) => {
    changeMemberModel.value = model
  }

  return {
    isShow,
    groupId,
    showModel,
    changeMemberModel,

    setOpened,
    setClosed,
    setShowModel,
    setChangeMemberModel
  }
})
