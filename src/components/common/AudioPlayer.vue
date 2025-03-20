<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Play, Pause } from '@element-plus/icons-vue'

const props = defineProps({
  audioUrl: {
    type: String,
    required: true
  }
})

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const audioContext = ref(null)
const audioBuffer = ref(null)
const analyser = ref(null)
const canvas = ref(null)
const canvasCtx = ref(null)
const animationFrame = ref(null)
const audio = ref(null)

// 格式化时间
const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// 初始化音频上下文和分析器
const initAudioContext = async () => {
  audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
  analyser.value = audioContext.value.createAnalyser()
  analyser.value.fftSize = 256

  try {
    const response = await fetch(props.audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer.value = await audioContext.value.decodeAudioData(arrayBuffer)
    duration.value = audioBuffer.value.duration
  } catch (error) {
    console.error('音频加载失败:', error)
  }
}

// 绘制音频波形
const drawWaveform = () => {
  if (!isPlaying.value || !canvas.value || !analyser.value) return

  const bufferLength = analyser.value.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.value.getByteFrequencyData(dataArray)

  canvasCtx.value.fillStyle = '#f5f5f5'
  canvasCtx.value.fillRect(0, 0, canvas.value.width, canvas.value.height)

  const barWidth = (canvas.value.width / bufferLength) * 2.5
  let barHeight
  let x = 0

  for (let i = 0; i < bufferLength; i++) {
    barHeight = (dataArray[i] / 255) * canvas.value.height
    canvasCtx.value.fillStyle = '#409eff'
    canvasCtx.value.fillRect(x, canvas.value.height - barHeight, barWidth, barHeight)
    x += barWidth + 1
  }

  animationFrame.value = requestAnimationFrame(drawWaveform)
}

// 播放/暂停音频
const togglePlay = async () => {
  if (!audioContext.value) {
    await initAudioContext()
  }

  if (isPlaying.value) {
    audioContext.value.suspend()
    cancelAnimationFrame(animationFrame.value)
  } else {
    audioContext.value.resume()
    drawWaveform()
  }
  isPlaying.value = !isPlaying.value
}

// 更新进度
const updateProgress = (e) => {
  if (!audioBuffer.value) return
  const time = e.target.value
  currentTime.value = time
  audio.value.currentTime = time
}

// 组件卸载时清理资源
onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.close()
  }
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})

onMounted(() => {
  initAudioContext()
})
</script>

<template>
  <div class="audio-player">
    <el-button class="play-button" :icon="isPlaying ? Pause : Play" circle @click="togglePlay" />
    <div class="progress-container">
      <canvas ref="canvas" class="waveform" width="300" height="40"></canvas>
      <el-slider
        v-model="currentTime"
        :max="duration"
        :step="0.1"
        @change="updateProgress"
        class="progress-slider"
      />
    </div>
    <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.play-button {
  flex-shrink: 0;
}

.progress-container {
  flex: 1;
  position: relative;
  height: 40px;
}

.waveform {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.progress-slider {
  position: relative;
  z-index: 2;
}

.time {
  flex-shrink: 0;
  font-size: 14px;
  color: #606266;
  min-width: 100px;
  text-align: right;
}

:deep(.el-slider__runway) {
  background-color: transparent;
}

:deep(.el-slider__bar) {
  background-color: rgba(64, 158, 255, 0.3);
}

:deep(.el-slider__button-wrapper) {
  z-index: 3;
}
</style>
