<script setup>
import { ElImage } from 'element-plus'

const props = defineProps(['url', 'imgId', 'srcList', 'initialIndex'])
const emits = defineEmits(['load'])

const onLoad = (e) => {
  const img = e.target
  const ratio = img.naturalWidth / img.naturalHeight
  const maxRatio = 300 / 200 // 最大宽高比

  // 如果图片尺寸在限制范围内，保持原始尺寸
  if (img.naturalWidth <= 300 && img.naturalHeight <= 200) {
    img.style.width = img.naturalWidth + 'px'
    img.style.height = img.naturalHeight + 'px'
  } else if (ratio > maxRatio) {
    // 如果图片更宽，以宽度为基准
    img.style.width = '300px'
    img.style.height = 'auto'
  } else {
    // 如果图片更高，以高度为基准
    img.style.height = '200px'
    img.style.width = 'auto'
  }

  emits('load') //向父组件暴露load事件
}
</script>

<template>
  <div>
    <el-image
      :src="props.url"
      :alt="props.imgId"
      :preview-src-list="props.srcList"
      :initial-index="props.initialIndex"
      :infinite="false"
      :lazy="false"
      fit="contain"
      @load="onLoad"
    ></el-image>
  </div>
</template>

<style lang="scss" scoped>
.el-image {
  max-width: 300px;
  max-height: 200px;
  width: auto;
  height: auto;
}
</style>
