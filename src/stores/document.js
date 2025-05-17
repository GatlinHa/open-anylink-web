import { mtsDocumentService } from '@/api/mts'
import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe } from '@/js/utils/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// document的缓存数据，不持久化存储
export const useDocumentStore = defineStore('anylink-document', () => {
  /**
   * {
   *   objectId_01: {objectId: objectId_01, url: xxx},
   *   objectId_02: {objectId: objectId_02, url: xxx},
   * }
   */
  const document = ref({})

  const setDocument = (obj) => {
    document.value[obj.objectId] = obj
  }

  const preloadDocumentFromMsgList = async (msgRecords) => {
    const documentIds = new Set()
    msgRecords.forEach((item) => {
      const aar = jsonParseSafe(item.content)
      aar.forEach((item) => {
        if (item.type === msgContentType.DOCUMENT) {
          const objectId = item.value
          if (!document.value[objectId]) {
            documentIds.add(objectId)
          }
        }
      })
    })

    if (documentIds.size > 0) {
      const res = await mtsDocumentService({ objectIds: [...documentIds].join(',') })
      res.data.data.forEach((item) => {
        setDocument(item)
      })
    }
  }

  const clear = () => {
    Object.values(document.value).forEach((item) => {
      if (item.downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.downloadUrl)
      }
    })

    document.value = {}
  }

  return {
    document,
    setDocument,
    preloadDocumentFromMsgList,
    clear
  }
})
