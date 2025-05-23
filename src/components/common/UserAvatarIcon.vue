<script setup>
import { ref, computed, watch } from 'vue'
import { getAvatarColor, getFontColor } from '@/js/utils/common'
import { STATUS } from '@/const/userConst'
import default_avatar from '@/assets/image/default_avatar.png'
import { ElAvatar } from 'element-plus'

const props = defineProps(['showName', 'showId', 'showAvatarThumb', 'userStatus', 'size'])

const avatarSize = computed(() => {
  switch (props.size) {
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

const avatarFontSize = computed(() => {
  switch (props.size) {
    case 'large':
      return 20
    case 'small':
      return 16
    case 'tiny':
      return 14
    case 'default':
    default:
      return 18
  }
})

const statusCircleSize = computed(() => {
  switch (props.size) {
    case 'large':
      return 16
    case 'small':
      return 10
    case 'default':
    default:
      return 12
  }
})

const isShowImg = computed(() => {
  return props.showAvatarThumb && !isImageError.value ? true : false
})

const firstChar = computed(() => {
  return props.showName ? props.showName.charAt(0) : ''
})

const avatarColor = computed(() => {
  return getAvatarColor(props.showName || props.showId)
})

const fontColor = computed(() => {
  return getFontColor(avatarColor.value)
})

const statusCircleColor = computed(() => {
  switch (props.userStatus) {
    case STATUS.LEAVING:
      return 'yellow'
    case STATUS.ONLINE:
      return '#95d475'
    case STATUS.BUSYING:
      return 'red'
    case STATUS.OFFLINE:
    default:
      return 'gray'
  }
})

// 标记图片是否加载失败
const isImageError = ref(false)
const handleAvatarError = () => {
  isImageError.value = true
}

// props.showAvatarThumb更新触发isImageError重置
watch(
  () => props.showAvatarThumb,
  () => {
    isImageError.value = false
  }
)
</script>

<template>
  <div class="user-avatar-box" :style="{ width: avatarSize + 'px', height: avatarSize + 'px' }">
    <el-avatar
      class="avatar"
      v-if="isShowImg"
      :src="props.showAvatarThumb"
      :size="avatarSize"
      @error="handleAvatarError"
    />
    <span
      class="first-char-box"
      v-else-if="firstChar"
      :style="{ backgroundColor: avatarColor, color: fontColor, fontSize: avatarFontSize + 'px' }"
    >
      {{ firstChar }}
    </span>
    <el-avatar class="avatar" v-else :src="default_avatar" :size="avatarSize" />
    <div
      v-if="props.userStatus != null"
      class="status-circle"
      :style="{
        width: statusCircleSize + 'px',
        height: statusCircleSize + 'px',
        backgroundColor: statusCircleColor
      }"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
.user-avatar-box {
  flex-shrink: 0;
  cursor: pointer;
  overflow: hidden;
  position: relative;

  .first-char-box {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;

    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.2) 25%, rgba(0, 0, 0, 0.5) 100%),
      v-bind(avatarColor); // 组合渐变色与动态背景色
    position: relative;
    // 调整高光位置
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
    }
  }

  .status-circle {
    border: 1px solid #fff;
    border-radius: 50%;
    position: absolute;
    bottom: 0;
    right: 0;
  }

  .avatar {
    border: 1px solid #fff;

    :deep(img) {
      margin: 0;
    }
  }
}
</style>
