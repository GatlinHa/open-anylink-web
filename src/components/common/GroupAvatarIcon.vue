<script setup>
import { ref, computed, watch } from 'vue'
import groupChatIcon from '@/assets/svg/groupchat.svg'

/**
 * avatarThumb: 群组头像
 * size：尺寸，不传即显示默认值
 * isValid: 这个群是否是有效群（离开群组了视为无效）
 */
const props = defineProps(['avatarThumb', 'size', 'isValid'])

const avatarSize = computed(() => {
  switch (props.size) {
    case 'huge':
      return 100
    case 'large':
      return 50
    case 'small':
      return 30
    case 'tiny':
      return 24
    case 'default':
    default:
      return 40
  }
})

const svgSize = computed(() => {
  switch (props.size) {
    case 'huge':
      return 80
    case 'large':
      return 30
    case 'small':
      return 18
    case 'tiny':
      return 16
    case 'default':
    default:
      return 24
  }
})

const isValid = computed(() => {
  return props.isValid === undefined ? true : props.isValid
})

const isShowImg = computed(() => {
  return props.avatarThumb && !isImageError.value
})

// 标记图片是否加载失败
const isImageError = ref(false)
const handleAvatarError = () => {
  isImageError.value = true
}

// props.avatarThumb更新触发isImageError重置
watch(
  () => props.avatarThumb,
  () => {
    isImageError.value = false
  }
)
</script>

<template>
  <div class="group-avatar-box">
    <el-avatar
      class="avatar"
      v-if="isShowImg"
      :src="props.avatarThumb"
      :size="avatarSize"
      @error="handleAvatarError"
    />
    <div v-else class="svg-avatar" :style="{ width: avatarSize + 'px', height: avatarSize + 'px' }">
      <groupChatIcon :style="{ width: svgSize + 'px', height: svgSize + 'px' }"></groupChatIcon>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.avatar {
  border: 1px solid #fff;

  :deep(img) {
    margin: 0;
  }
}

.svg-avatar {
  border-radius: 50%;
  background-color: v-bind('isValid ? "rgb(121.3, 187.1, 255)" : "rgb(177.3, 179.4, 183.6)"');
  display: flex;
  justify-content: center;
  align-items: center;

  .svg-icon {
    fill: #fff;
  }
}
</style>
