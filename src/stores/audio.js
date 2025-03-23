import { mtsAudioService } from '@/api/mts'
import { defineStore } from 'pinia'
import { ref } from 'vue'

// audio的缓存数据，不持久化存储
export const audioStore = defineStore('anylink-audio', () => {
  /**
   * {
   *   objectId_01: {objectId: objectId_01, url: xxx},
   *   objectId_02: {objectId: objectId_02, url: xxx},
   * }
   */
  const audio = ref({})

  /**
   * 在同一个session中的audio（id）集合
   */
  const audioInSession = ref({})

  const setAudio = (sessionId, obj) => {
    audio.value[obj.objectId] = obj
    if (!audioInSession.value[sessionId]) {
      audioInSession.value[sessionId] = []
    }
    audioInSession.value[sessionId].push(obj.objectId)
  }

  const loadAudio = async (sessionId, objectId) => {
    if (!(objectId in audio.value)) {
      const res = await mtsAudioService({ objectId: objectId })
      setAudio(sessionId, res.data.data) // 缓存image数据
    }
  }

  return {
    audio,
    audioInSession,
    setAudio,
    loadAudio
  }
})
