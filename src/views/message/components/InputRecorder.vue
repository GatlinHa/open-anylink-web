<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Microphone } from '@element-plus/icons-vue'
import { ElLoading, ElMessage } from 'element-plus'
import { audioStore } from '@/stores'
import { mtsUploadService } from '@/api/mts'
import { el_loading_options } from '@/const/commonConst'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps(['sessionId'])
const emit = defineEmits(['exit', 'sendRecording'])

const audioData = audioStore()
const spaceDown = ref(false) // 空格键是否被按下
const isRecord = ref(false) // 是否开始录音
const isCancel = ref(false) // 取消发送
const mediaRecorder = ref(null)
const recordedChunks = ref([])
const recordBlob = ref(null)
const recordType = 'audio/webm;codecs=opus'
const fileSuffix = 'webm'
let recordStart = 0 // 录制开始时间
let recordDuration = 0 // 录制时长
const dynamicDuration = ref(0)
let dynamicDurationInterval = null

let timer
const handleKeyDown = async (event) => {
  if (event.key === 'Escape') {
    if (isRecord.value) {
      cancelSend()
    } else {
      emit('exit')
    }
  } else if (event.key === ' ' && !spaceDown.value) {
    event.preventDefault()
    clearTimeout(timer)
    timer = setTimeout(() => {
      isRecord.value = true
      spaceDown.value = true
      isCancel.value = false
    }, 300)
  }
}

const handleKeyUp = (event) => {
  if (event.key === ' ') {
    clearTimeout(timer)

    if (spaceDown.value) {
      event.preventDefault()
      isRecord.value = false
      spaceDown.value = false
      dynamicDuration.value = 0
      clearInterval(dynamicDurationInterval)
      stopRecording()
    }
  }
}

const handleExit = () => {
  emit('exit')
}

const cancelSend = () => {
  isRecord.value = false
  isCancel.value = true
  dynamicDuration.value = 0
  clearInterval(dynamicDurationInterval)
  recordedChunks.value = []
  stopRecording()
}

const startRecording = async () => {
  // 检查是否有麦克风授权
  const permission = await navigator.permissions.query({ name: 'microphone' })
  const initPermissionState = permission.state

  if (permission.state === 'denied') {
    ElMessage.warning('您拒绝授权麦克风，无法发送语音')
    return
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((mediaStream) => {
      mediaRecorder.value = new MediaRecorder(mediaStream)
      // 初次授权要弹出窗口，空格键可能已经弹起，因此先不录音直接返回
      if (initPermissionState === 'prompt') {
        // 授权时跳出授权窗口会使监听按键弹起的事件失效，状态需要手动更新
        isRecord.value = false
        spaceDown.value = false
        stopRecording()
        return
      }

      mediaRecorder.value.onstart = () => {
        recordStart = new Date().getTime()
        dynamicDurationInterval = setInterval(() => {
          dynamicDuration.value = Math.floor((new Date().getTime() - recordStart) / 1000)
        }, 1000)
      }

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.value.push(event.data)
        }
      }

      mediaRecorder.value.onstop = () => {
        recordDuration = new Date().getTime() - recordStart
        recordBlob.value = new Blob(recordedChunks.value, { type: recordType })
        if (!isCancel.value) {
          // 语音时长过短不予处理，单位ms
          if (recordDuration > 1000) {
            uploadRecord()
          } else {
            ElMessage.warning('语音时长过短')
          }
        }

        recordedChunks.value = []
        recordStart = 0
        recordDuration = 0
      }

      mediaRecorder.value.start()
    })
    .catch(() => {
      // 用户不授权，也要把状态手动更新
      isRecord.value = false
      spaceDown.value = false
    })
}

const stopRecording = () => {
  if (mediaRecorder.value) {
    if (mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop()
    }
    const stream = mediaRecorder.value.stream
    stream.getTracks().forEach((track) => track.stop()) // 停止 MediaStream 中的所有音轨
  }
}

const uploadRecord = () => {
  const loadingInstance = ElLoading.service(el_loading_options)
  const fileName = `${uuidv4()}.${fileSuffix}`
  const file = new File([recordBlob.value], fileName, { type: recordType })
  mtsUploadService({ file, storeType: 1, duration: Math.floor(recordDuration / 1000) })
    .then((res) => {
      if (res.data.code === 0) {
        audioData.setAudio(props.sessionId, res.data.data) // 缓存audio的数据
        emit('sendRecording', res.data.data)
      }
    })
    .finally(() => {
      loadingInstance.close()
    })
}

// 格式化时间
const formatDynamicDuration = computed(() => {
  if (!dynamicDuration.value) {
    return ''
  }

  const minutes = Math.floor(dynamicDuration.value / 60)
  const seconds = Math.floor(dynamicDuration.value % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

watch(
  () => isRecord.value,
  async (newValue) => {
    if (newValue) {
      await startRecording()
    }
  }
)

defineExpose({
  cancelSend
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="audio-recorder">
    <div class="tips" style="height: 20px">{{ formatDynamicDuration }}</div>
    <div class="recorder-icon-wrapper">
      <Microphone class="recorder-icon" />
      <div v-show="isRecord" class="sound-wave"></div>
    </div>
    <span v-if="isRecord" class="tips">
      松开发送，按Esc键或点击
      <span @click="cancelSend" class="button-text">取消发送</span>
    </span>
    <span v-else class="tips">
      长按空格键说话，按Esc键或点击
      <span @click="handleExit" class="button-text">退出</span>
    </span>
  </div>
</template>

<style lang="scss" scoped>
.audio-recorder {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;

  .recorder-icon-wrapper {
    width: 32px;
    height: 32px;
    padding: 16px;
    border-radius: 50%;
    background: radial-gradient(circle, #90c0f3 30%, #409eff 70%);
    box-shadow: 0 0 10px rgba(64, 158, 255, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;

    .recorder-icon {
      color: white;
    }

    .sound-wave {
      position: absolute;
      transform: translate(-50%, -50%);
      width: calc(100% - 4px);
      height: calc(100% - 4px);
      border-radius: 50%;
      border: 2px solid rgba(64, 158, 255, 0.5);
      animation: soundVibration 0.5s infinite alternate;
      pointer-events: none;
    }
  }

  .tips {
    font-size: 14px;
    color: gray;

    .button-text {
      color: #409eff;
      cursor: pointer;
    }
  }
}

@keyframes soundVibration {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>
