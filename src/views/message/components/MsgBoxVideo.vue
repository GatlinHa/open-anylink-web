<script setup>
import { ref, onMounted, computed } from 'vue'
import Player from 'xgplayer'
import 'xgplayer/dist/index.min.css'
import { formatFileSize } from '@/js/utils/common'
import VideoloadfailedIcon from '@/assets/svg/videoloadfailed.svg'

const props = defineProps(['msgId', 'videoId', 'url', 'fileName', 'size', 'width', 'height'])
const emits = defineEmits(['load'])

const isLoaded = ref(0) // 0未加载，1加载成功，2加载失败
const isClickPlay = ref(false)
const videoWrapperRef = ref(null)

const formatSize = computed(() => {
  return formatFileSize(props.size)
})

const renderWidth = computed(() => {
  if (!props.width || !props.height) {
    return 480 // 如果拿不到视频大小，默认以 480*270 尺寸播放
  } else if (props.width > props.height) {
    return 480
  } else {
    return (props.width / props.height) * 320
  }
})

const renderHeight = computed(() => {
  if (!props.width || !props.height) {
    return 270 // 如果拿不到视频大小，默认以 480*270 尺寸播放
  } else if (props.width > props.height) {
    return (props.height / props.width) * 480
  } else {
    return 320
  }
})

onMounted(() => {
  const player = new Player({
    id: `msg-xgplayer-${props.msgId}-${props.videoId}`,
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
    videoElement.addEventListener('loadedmetadata', () => {
      videoWrapperRef.value.style.width = `${renderWidth.value}px`
      videoWrapperRef.value.style.height = `${renderHeight.value}px`
      videoWrapperRef.value.style.padding = 0
      isLoaded.value = 1
      emits('load') //向父组件暴露load事件
    })
  })

  // 监听视频加载失败事件
  player.on('error', () => {
    isLoaded.value = 2
  })
})
</script>

<template>
  <div
    class="video-msg-wrapper"
    :class="{ loading: isLoaded === 0 }"
    :style="{ width: `${renderWidth}px`, height: `${renderHeight}px` }"
  >
    <div
      v-show="isLoaded === 1"
      ref="videoWrapperRef"
      :id="`msg-xgplayer-${props.msgId}-${props.videoId}`"
    ></div>
    <div v-show="isLoaded === 2" class="error">
      <VideoloadfailedIcon style="width: 48px; height: 48px; fill: #fff" />
      <span style="color: #fff">视频加载失败</span>
    </div>

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
  display: flex;
  justify-content: center;
  align-items: center;

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

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
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
