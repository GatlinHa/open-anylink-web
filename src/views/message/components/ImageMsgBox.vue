<script setup>
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import { formatFileSize } from '@/js/utils/common'
import { useImageStore } from '@/stores'

const props = defineProps(['sessionId', 'imgId', 'isForMix'])
const emits = defineEmits(['load'])

const imageData = useImageStore()

const onLoad = (e) => {
  const img = e.target
  const maxWidth = 360
  const maxHeight = 180

  if (img.naturalWidth / img.naturalHeight > maxWidth / maxHeight) {
    // 如果图片更宽，以宽度为基准
    img.style.width = maxWidth + 'px'
    img.style.height = 'auto'
  } else {
    // 如果图片更高，以高度为基准
    img.style.height = maxHeight + 'px'
    img.style.width = 'auto'
  }

  emits('load') //向父组件暴露load事件
}

const url = computed(() => {
  return imageData.image[props.imgId]?.thumbUrl
})

const imageInSessionSort = computed(() => {
  const imageList = imageData.imageInSession[props.sessionId]
  return imageList.sort((a, b) => {
    const bTime = new Date(b.createdTime).getTime()
    const aTime = new Date(a.createdTime).getTime()
    return aTime - bTime
  })
})

const srcList = computed(() => {
  return imageInSessionSort.value.map((item) => item.originUrl)
})

const initialIndex = computed(() => {
  const imgIdList = imageInSessionSort.value.map((item) => item.objectId.toString())
  return imgIdList.indexOf(props.imgId.toString())
})

const fileName = computed(() => {
  return props.isForMix ? '' : imageData.image[props.imgId]?.fileName
})

const size = computed(() => {
  return props.isForMix ? '' : imageData.image[props.imgId]?.size
})

const formatSize = computed(() => {
  return formatFileSize(size.value)
})
</script>

<template>
  <div class="image-msg-wrapper">
    <el-image
      :src="url"
      :alt="props.imgId"
      :preview-src-list="srcList"
      :initial-index="initialIndex"
      :infinite="false"
      :lazy="false"
      fit="contain"
      @load="onLoad"
    >
    </el-image>
    <div v-if="fileName || size > 0" class="info">
      <span class="name item text-ellipsis" :title="fileName">
        {{ fileName || '' }}
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
    width: auto;
    height: auto;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);

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
