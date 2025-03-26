<script setup>
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import { formatFileSize } from '@/js/utils/common'

const props = defineProps(['url', 'imgId', 'srcList', 'initialIndex', 'fileName', 'size'])
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

const formatSize = computed(() => {
  return formatFileSize(props.size)
})
</script>

<template>
  <div class="image-msg-wrapper">
    <el-image
      :src="props.url"
      :alt="props.imgId"
      :preview-src-list="props.srcList"
      :initial-index="props.initialIndex"
      :infinite="false"
      :lazy="false"
      fit="contain"
      @load="onLoad"
    >
    </el-image>
    <div v-if="props.fileName || props.size > 0" class="info">
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
.image-msg-wrapper {
  display: flex;
  position: relative;

  .el-image {
    max-width: 300px;
    max-height: 200px;
    width: auto;
    height: auto;

    :deep(.el-image__inner) {
      margin: 0;
    }
  }

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
