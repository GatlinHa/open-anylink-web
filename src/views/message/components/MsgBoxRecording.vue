<script setup>
import { ref, onMounted } from 'vue'
import { ElIcon, ElMessage } from 'element-plus'
import PlayIcon from '@/assets/svg/play.svg'
import PauseIcon from '@/assets/svg/pause.svg'
import { AVWaveform } from 'vue-audio-visual'
import { showDurationFormat } from '@/js/utils/common'

const props = defineProps(['audioUrl', 'duration'])
const emits = defineEmits(['load'])

const waveformRef = ref(null)
const isPlaying = ref(false)
const audioDuration = ref(null)

const playAudio = async () => {
  const audioPlayer = waveformRef.value.querySelector('audio')
  if (audioPlayer) {
    try {
      await audioPlayer.play()
    } catch (error) {
      ElMessage.error('音频播放遇到问题')
    }
  }
}

const pauseAudio = async () => {
  const audioPlayer = waveformRef.value.querySelector('audio')
  if (audioPlayer) {
    try {
      await audioPlayer.pause()
    } catch (error) {
      ElMessage.error('音频暂停遇到问题')
    }
  }
}

// 播放/暂停音频
const togglePlay = async () => {
  if (isPlaying.value) {
    pauseAudio()
  } else {
    playAudio()
  }
  isPlaying.value = !isPlaying.value
}

onMounted(() => {
  const audioPlayer = waveformRef.value.querySelector('audio')
  if (audioPlayer) {
    // 监听播放事件
    audioPlayer.addEventListener('play', () => {
      isPlaying.value = true
    })

    // 监听暂停事件
    audioPlayer.addEventListener('pause', () => {
      isPlaying.value = false
    })

    // 监听音频元数据加载完成事件
    audioPlayer.addEventListener('loadedmetadata', () => {
      // 媒体文件中，语音消息没有duration信息，所以要从服务端返回的字段获取
      if (audioPlayer.duration !== Infinity) {
        audioDuration.value = audioPlayer.duration
      } else {
        audioDuration.value = props.duration
      }
    })
  }
  emits('load') //触发load事件
})
</script>

<template>
  <div ref="waveformRef" class="audio-player">
    <div class="play-button" @click="togglePlay">
      <el-icon v-if="isPlaying"><PauseIcon /></el-icon>
      <el-icon v-else><PlayIcon /></el-icon>
    </div>

    <AVWaveform
      :src="props.audioUrl"
      :audio-controls="false"
      :playtime="false"
      :canv-width="120"
      :canv-height="40"
      :playtime-slider-color="`#409eff`"
    ></AVWaveform>

    <span class="time">{{ showDurationFormat(audioDuration) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 10px;
  background-color: #f5f5f5;
  border-radius: 4px;

  :deep(canvas) {
    cursor: pointer;
  }

  .play-button {
    padding: 8px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
    cursor: pointer;

    &:hover {
      background-color: #c6e2ff;
      color: #409eff;
    }
  }

  .time {
    font-size: 12px;
    color: #606266;
    text-align: center;
  }
}
</style>
