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

  const setVideo = (sessionId, obj) => {
    video.value[obj.objectId] = obj
  }

  const preloadVideo = async (sessionId, msgRecords) => {
    const videoIds = new Set()
    msgRecords.forEach((item) => {
      const content = item.content
      const contentJson = jsonParseSafe(content)
      if (contentJson && contentJson['type'] === msgContentType.VIDEO) {
        const objectId = contentJson['value']
        if (!video.value[objectId]) {
          videoIds.add(objectId)
        }
      }
    })

    if (videoIds.size > 0) {
      const res = await mtsVideoService({ objectIds: [...videoIds].join(',') })
      res.data.data.forEach((item) => {
        setVideo(sessionId, item)
      })
    }
  }

  return {
    video,
    setVideo,
    preloadVideo
  }
})
