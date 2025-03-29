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
   * 在同一个session中的image（id）集合
   */
  const imageInSession = ref({})

  const setImage = (sessionId, obj) => {
    image.value[obj.objectId] = obj
    if (!imageInSession.value[sessionId]) {
      imageInSession.value[sessionId] = []
    }
    imageInSession.value[sessionId].push(obj.objectId)
  }

  const imageTrans = (content, maxWidth = 400, maxHeight = 300) => {
    const matches = content.match(pattern)
    if (!matches || matches.length === 0) {
      return content
    }

    new Set(matches).forEach((item) => {
      let startIndex = item.indexOf('{')
      let endIndex = item.indexOf('}')
      const objectId = item.slice(startIndex + 1, endIndex)
      const thumbUrl = image.value[objectId]?.thumbUrl
      const originUrl = image.value[objectId]?.originUrl
      if (thumbUrl) {
        const imageHtml =
          `<img class="image" alt="{${objectId}}" src="${thumbUrl}" data-origin-url="${originUrl}" ` +
          `style="max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: auto; height: auto;cursor: pointer;">`
        content = content.replaceAll(item, imageHtml)
      }
    })

    return content
  }

  const loadImageInfoFromContent = async (sessionId, content) => {
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
        setImage(sessionId, item) // 缓存image数据
      })
    }
  }

  const preloadImage = async (sessionId, msgRecords) => {
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
        setImage(sessionId, item)
      })
    }
  }

  return {
    image,
    imageInSession,
    setImage,
    imageTrans,
    loadImageInfoFromContent,
    preloadImage
  }
})
