<script setup>
import { ref, onMounted, computed } from 'vue'
import Player from 'xgplayer'
import 'xgplayer/dist/index.min.css'
import { formatFileSize } from '@/js/utils/common'

const props = defineProps(['videoId', 'url', 'fileName', 'size', 'width', 'height'])
const emits = defineEmits(['load'])

const isLoaded = ref(false)
const isClickPlay = ref(false)
const videoWrapperRef = ref(null)

const formatSize = computed(() => {
  return formatFileSize(props.size)
})

const renderWidth = computed(() => {
  if (!props.width || !props.height) {
    return 480
  } else if (props.width > props.height) {
    return 480
  } else {
    return Math.floor((props.width / props.height) * 320)
  }
})

const renderHeight = computed(() => {
  if (!props.width || !props.height) {
    return 270
  } else if (props.width > props.height) {
    return Math.floor((props.height / props.width) * 480)
  } else {
    return 320
  }
})

onMounted(() => {
  const player = new Player({
    id: `msg-xgplayer-${props.videoId}`,
    url: props.url,
    fluid: true,
    autoplay: false,
    lang: 'zh-cn',
    download: true,
    keyShortcut: false
  })

  // 监听播放开始事件
  player.on('play', () => {
    isClickPlay.value = true
  })

  // 监听播放ready事件
  player.on('ready', () => {
    // 监听视频元数据加载完成事件
    const videoElement = player.root.querySelector('video')
    videoElement.addEventListener('loadedmetadata', async () => {
      videoWrapperRef.value.style.width = `${renderWidth.value}px`
      videoWrapperRef.value.style.height = `${renderHeight.value}px`
      videoWrapperRef.value.style.padding = 0
      isLoaded.value = true
      emits('load') //向父组件暴露load事件
    })
  })
})
</script>

<template>
  <div
    class="video-msg-wrapper loading"
    :style="{ width: `${renderWidth}px`, height: `${renderHeight}px` }"
  >
    <div v-show="isLoaded" ref="videoWrapperRef" :id="`msg-xgplayer-${props.videoId}`"></div>
    <div v-if="!isClickPlay && (props.fileName || props.size > 0)" class="info">
      <span class="name item text-ellipsis" :title="props.fileName">
        {{ props.fileName || '' }}
      </span>
      <span class="size item text-ellipsis" :title="formatSize">
        {{ formatSize }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.video-msg-wrapper {
  position: relative;
  background: #000;

  .info {
    width: 100%;
    height: 32px;
    line-height: 32px;
    left: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5));
    position: absolute;

    .item {
      max-width: 40%;
      color: #fff;
      font-size: 12px;
    }

    .name {
      margin-left: 8px;
    }

    .size {
      margin-right: 8px;
    }
  }
}

.video-msg-wrapper.loading::before {
  content: '';
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30px;
  height: 30px;
  margin-top: -15px;
  margin-left: -15px;
  border-radius: 50%;
  border: 3px solid #ccc;
  border-top-color: #007bff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
