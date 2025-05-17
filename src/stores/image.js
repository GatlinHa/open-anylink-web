import { mtsImageService } from '@/api/mts'
import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe } from '@/js/utils/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// image的缓存数据，不持久化存储
export const useImageStore = defineStore('anylink-image', () => {
  /**
   * {
   *   objectId_01: {objectId: objectId_01, originUrl: xxx, thumbUrl: xxx},
   *   objectId_02: {objectId: objectId_02, originUrl: xxx, thumbUrl: xxx},
   * }
   */
  const image = ref({})

  /**
   * 在同一个session中的需要渲染的image对象
   *
   * {
   *   sessionId_01: {objectId_x: {objectId: objectId_x, originUrl: xxx, thumbUrl: xxx}...},
   *   sessionId_02: {objectId_x: {objectId: objectId_x, originUrl: xxx, thumbUrl: xxx}...},
   * }
   */
  const imageInSession = ref({})

  const setImage = (obj) => {
    image.value[obj.objectId] = obj
  }

  const setImageInSession = (sessionId, obj) => {
    if (!imageInSession.value[sessionId]) {
      imageInSession.value[sessionId] = {}
    }
    imageInSession.value[sessionId][obj.objectId] = obj
  }

  const clearImageInSession = (sessionId) => {
    if (imageInSession.value[sessionId]) {
      imageInSession.value[sessionId] = {}
    }
  }

  const preloadImageFromMsg = async (content) => {
    if (!content) return

    const imageIds = new Set()
    const aar = jsonParseSafe(content)
    aar.forEach((item) => {
      if (item.type === msgContentType.SCREENSHOT || item.type === msgContentType.IMAGE) {
        const objectId = item.value
        if (!image.value[objectId]) {
          imageIds.add(objectId)
        }
      }
    })

    if (imageIds.size > 0) {
      const res = await mtsImageService({ objectIds: [...imageIds].join(',') })
      res.data.data.forEach((item) => {
        setImage(item) // 缓存image数据
      })
    }
  }

  const preloadImageFromMsgList = async (msgRecords) => {
    const imageIds = new Set()
    msgRecords.forEach((item) => {
      const aar = jsonParseSafe(item.content)
      aar.forEach((item) => {
        if (item.type === msgContentType.SCREENSHOT || item.type === msgContentType.IMAGE) {
          const objectId = item.value
          if (!image.value[objectId]) {
            imageIds.add(objectId)
          }
        }
      })
    })

    if (imageIds.size > 0) {
      const res = await mtsImageService({ objectIds: [...imageIds].join(',') })
      res.data.data.forEach((item) => {
        setImage(item)
      })
    }
  }

  const clear = () => {
    Object.values(image.value).forEach((item) => {
      if (item.originUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.originUrl)
      }

      if (item.thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.thumbUrl)
      }
    })

    image.value = {}
  }

  return {
    image,
    imageInSession,
    setImage,
    setImageInSession,
    clearImageInSession,
    preloadImageFromMsg,
    preloadImageFromMsgList,
    clear
  }
})
