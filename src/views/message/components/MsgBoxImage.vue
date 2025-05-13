<script setup>
import { computed } from 'vue'
import { ElImage } from 'element-plus'
import { formatFileSize } from '@/js/utils/common'
import { useImageStore } from '@/stores'
import ImageloadfailedIcon from '@/assets/svg/imageloadfailed.svg'

const props = defineProps(['sessionId', 'imgId', 'isForMix', 'thumbWidth', 'thumbHeight'])
const emits = defineEmits(['load'])

const imageData = useImageStore()

const maxWidth = computed(() => {
  return props.isForMix ? Math.min(props.thumbWidth, 360) : 360
})

const maxHeight = computed(() => {
  return props.isForMix ? Math.min(props.thumbHeight, 270) : 270
})

const renderWidth = computed(() => {
  if (!props.thumbWidth || !props.thumbHeight) {
    return 360 // 如果拿不到缩略图大小，默认以 360*270 尺寸显示
  } else if (props.thumbWidth / props.thumbHeight > maxWidth.value / maxHeight.value) {
    return maxWidth.value
  } else {
    return (props.thumbWidth / props.thumbHeight) * maxHeight.value
  }
})

const renderHeight = computed(() => {
  if (!props.thumbWidth || !props.thumbHeight) {
    return 270 // 如果拿不到缩略图大小，默认以 360*270 尺寸显示
  } else if (props.thumbWidth / props.thumbHeight > maxWidth.value / maxHeight.value) {
    return (props.thumbHeight / props.thumbWidth) * maxWidth.value
  } else {
    return maxHeight.value
  }
})

const onLoad = async () => {
  emits('load') //向父组件暴露load事件
}

const url = computed(() => {
  return imageData.image[props.imgId]?.thumbUrl
})

const imageInSessionSort = computed(() => {
  const imageList = Object.values(imageData.imageInSession[props.sessionId])
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
      :style="{ width: `${renderWidth}px`, height: `${renderHeight}px` }"
      @load="onLoad"
    >
      <template #placeholder>
        <div
          class="image-msg-bgc loading"
          :style="{ width: `${renderWidth}px`, height: `${renderHeight}px` }"
        ></div>
      </template>
      <template #error>
        <div
          class="image-msg-bgc error"
          :style="{ width: `${renderWidth}px`, height: `${renderHeight}px` }"
        >
          <ImageloadfailedIcon style="width: 48px; height: 48px; fill: #fff" />
        </div>
      </template>
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

.image-msg-bgc {
  background-color: #000;
}

.image-msg-bgc.loading::before {
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

.image-msg-bgc.error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
