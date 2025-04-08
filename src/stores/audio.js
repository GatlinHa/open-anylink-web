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

  const setAudio = (sessionId, obj) => {
    audio.value[obj.objectId] = obj
  }

  const preloadAudio = async (sessionId, msgRecords) => {
    const audioIds = new Set()
    msgRecords.forEach((item) => {
      const content = item.content
      const contentJson = jsonParseSafe(content)
      if (
        (contentJson && contentJson['type'] === msgContentType.RECORDING) ||
        (contentJson && contentJson['type'] === msgContentType.AUDIO)
      ) {
        const objectId = contentJson['value']
        if (!audio.value[objectId]) {
          audioIds.add(objectId)
        }
      }
    })

    if (audioIds.size > 0) {
      const res = await mtsAudioService({ objectIds: [...audioIds].join(',') })
      res.data.data.forEach((item) => {
        setAudio(sessionId, item)
      })
    }
  }

  return {
    audio,
    setAudio,
    preloadAudio
  }
})
