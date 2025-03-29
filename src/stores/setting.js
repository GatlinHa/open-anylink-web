import { defineStore } from 'pinia'
import { ref } from 'vue'

// 界面设置相关需要缓存的设置
export const useSettingStore = defineStore(
  'anylink-setting',
  () => {
    const sessionListDrag = ref(0)
    const inputBoxDrag = ref(0)
    const msgGroupRightSideDrag = ref(0)
    const announcementInSideDrag = ref(0)

    const setSessionListDrag = (width) => {
      sessionListDrag.value = width
    }

    const setInputBoxDrag = (height) => {
      inputBoxDrag.value = height
    }

    const setMsgGroupRightSideDrag = (value) => {
      msgGroupRightSideDrag.value = value
    }

    const setAnnouncementInSideDrag = (value) => {
      announcementInSideDrag.value = value
    }

    return {
      sessionListDrag,
      inputBoxDrag,
      setSessionListDrag,
      setInputBoxDrag,
      msgGroupRightSideDrag,
      setMsgGroupRightSideDrag,
      announcementInSideDrag,
      setAnnouncementInSideDrag
    }
  },
  {
    persist: true
  }
)
