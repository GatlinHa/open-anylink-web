import { mtsAudioService } from '@/api/mts'
import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe } from '@/js/utils/common'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// audio的缓存数据，不持久化存储
export const useAudioStore = defineStore('anylink-audio', () => {
  /**
   * {
   *   objectId_01: {objectId: objectId_01, url: xxx},
   *   objectId_02: {objectId: objectId_02, url: xxx},
   * }
   */
  const audio = ref({})

  const setAudio = (obj) => {
    audio.value[obj.objectId] = obj
  }

  const preloadAudioFromMsgList = async (msgRecords) => {
    const audioIds = new Set()
    msgRecords.forEach((item) => {
      const aar = jsonParseSafe(item.content)
      aar.forEach((item) => {
        if (item.type === msgContentType.AUDIO || item.type === msgContentType.RECORDING) {
          const objectId = item.value
          if (!audio.value[objectId]) {
            audioIds.add(objectId)
          }
        }
      })
    })

    if (audioIds.size > 0) {
      const res = await mtsAudioService({ objectIds: [...audioIds].join(',') })
      res.data.data.forEach((item) => {
        setAudio(item)
      })
    }
  }

  const clear = () => {
    Object.values(audio.value).forEach((item) => {
      if (item.downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.downloadUrl)
      }
    })

    audio.value = {}
  }

  return {
    audio,
    setAudio,
    preloadAudioFromMsgList,
    clear
  }
})
