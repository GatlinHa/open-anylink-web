<script setup>
import { ref, onMounted, computed } from 'vue'
import Player from 'xgplayer'
import 'xgplayer/dist/index.min.css'
import { formatFileSize } from '@/js/utils/common'

const props = defineProps(['videoId', 'url', 'fileName', 'size'])
const emits = defineEmits(['load'])

const isLoaded = ref(false)
const isClickPlay = ref(false)
const videoWrapperRef = ref(null)

const formatSize = computed(() => {
  return formatFileSize(props.size)
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
    videoElement.addEventListener('loadedmetadata', () => {
      const videoWidth = videoElement.videoWidth
      const videoHeight = videoElement.videoHeight
      const maxWidth = 480
      const maxHeight = 270
      let newWidth = videoWidth
      let newHeight = videoHeight

      // 判断是横屏还是竖屏
      if (videoWidth > videoHeight) {
        // 横屏视频，宽度固定为 480，高度按比例计算
        newWidth = maxWidth
        newHeight = Math.floor((maxWidth / videoWidth) * videoHeight)
      } else {
        // 竖屏视频，高度固定为 270，宽度按比例计算
        newHeight = maxHeight
        newWidth = Math.floor((maxHeight / videoHeight) * videoWidth)
      }

      videoWrapperRef.value.style.width = `${newWidth}px`
      videoWrapperRef.value.style.height = `${newHeight}px`
      videoWrapperRef.value.style.padding = 0

      isLoaded.value = true
      emits('load') //向父组件暴露load事件
    })
  })
})
</script>

<template>
  <div class="video-msg-wrapper">
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
</style>
