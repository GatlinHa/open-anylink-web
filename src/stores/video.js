import { mtsVideoService } from '@/api/mts'
import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe } from '@/js/utils/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// video的缓存数据，不持久化存储
export const useVideoStore = defineStore('anylink-video', () => {
  /**
   * {
   *   objectId_01: {objectId: objectId_01, url: xxx},
   *   objectId_02: {objectId: objectId_02, url: xxx},
   * }
   */
  const video = ref({})

  const setVideo = (obj) => {
    video.value[obj.objectId] = obj
  }

  const preloadVideoFromMsgList = async (msgRecords) => {
    const videoIds = new Set()
    msgRecords.forEach((item) => {
      const aar = jsonParseSafe(item.content)
      aar.forEach((item) => {
        if (item.type === msgContentType.VIDEO) {
          const objectId = item.value
          if (!video.value[objectId]) {
            videoIds.add(objectId)
          }
        }
      })
    })

    if (videoIds.size > 0) {
      const res = await mtsVideoService({ objectIds: [...videoIds].join(',') })
      res.data.data.forEach((item) => {
        setVideo(item)
      })
    }
  }

  const clear = () => {
    Object.values(video.value).forEach((item) => {
      if (item.downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.downloadUrl)
      }
    })

    video.value = {}
  }

  return {
    video,
    setVideo,
    preloadVideoFromMsgList,
    clear
  }
})
