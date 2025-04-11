import { mtsImageService } from '@/api/mts'
import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe } from '@/js/utils/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const pattern = /\{[a-f0-9]+\}/g

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
   * 在同一个session中的需要渲染的image对象数组
   */
  const imageInSession = ref({})

  const setImage = (obj) => {
    image.value[obj.objectId] = obj
  }

  const setImageInSession = (sessionId, obj) => {
    if (!imageInSession.value[sessionId]) {
      imageInSession.value[sessionId] = []
    }
    imageInSession.value[sessionId].push(obj)
  }

  const clearImageInSession = (sessionId) => {
    if (imageInSession.value[sessionId]) {
      imageInSession.value[sessionId] = []
    }
  }

  const loadImageInfoFromContent = async (content) => {
    const imageIds = new Set()
    const matches = content.match(pattern)
    if (matches && matches.length > 0) {
      matches.forEach((item) => {
        let startIndex = item.indexOf('{')
        let endIndex = item.indexOf('}')
        const objectId = item.slice(startIndex + 1, endIndex)
        if (!image.value[objectId]) {
          imageIds.add(objectId)
        }
      })
    }
    if (imageIds.size > 0) {
      const res = await mtsImageService({ objectIds: [...imageIds].join(',') })
      res.data.data.forEach((item) => {
        setImage(item) // 缓存image数据
      })
    }
  }

  const preloadImage = async (msgRecords) => {
    const imageIds = new Set()
    msgRecords.forEach((item) => {
      const content = item.content
      const contentJson = jsonParseSafe(content)
      if (contentJson && contentJson['type'] === msgContentType.IMAGE) {
        const objectId = contentJson['value']
        if (!image.value[objectId]) {
          imageIds.add(objectId)
        }
      } else {
        const matches = content.match(pattern)
        if (matches && matches.length > 0) {
          matches.forEach((item) => {
            let startIndex = item.indexOf('{')
            let endIndex = item.indexOf('}')
            const objectId = item.slice(startIndex + 1, endIndex)
            if (!image.value[objectId]) {
              imageIds.add(objectId)
            }
          })
        }
      }
    })

    if (imageIds.size > 0) {
      const res = await mtsImageService({ objectIds: [...imageIds].join(',') })
      res.data.data.forEach((item) => {
        setImage(item)
      })
    }
  }

  return {
    image,
    imageInSession,
    setImage,
    setImageInSession,
    clearImageInSession,
    loadImageInfoFromContent,
    preloadImage
  }
})
