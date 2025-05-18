<script setup>
import { ref, onMounted, computed } from 'vue'
import AudioFileIcon from '@/assets/svg/audiofile.svg'
import { formatFileSize } from '@/js/utils/common'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'

const props = defineProps(['url', 'fileName', 'size'])
const emits = defineEmits(['load'])

const formatSize = computed(() => {
  return formatFileSize(props.size)
})

onMounted(() => {
  emits('load') //向父组件暴露load事件
})

const isDownloading = ref(false)
const isDownloadComplete = ref(false)
const isDownloadError = ref(false)
const progress = ref(0)

const onDownload = async () => {
  isDownloading.value = true
  isDownloadComplete.value = false
  isDownloadError.value = false
  progress.value = 0
  try {
    const response = await fetch(props.url)
    if (!response.ok) {
      ElMessage.error('文件资源异常，请稍后再试。')
      isDownloading.value = false
      isDownloadError.value = true
      return
    }
    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    let loaded = 0

    const reader = response.body.getReader()
    const chunks = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      progress.value = total > 0 ? (loaded / total) * 100 : 0
    }
    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = props.fileName
    a.click()

    URL.revokeObjectURL(url)
    isDownloading.value = false
    isDownloadComplete.value = true
  } catch (error) {
    ElMessage.error('下载文件时出错，请稍后再试。')
    isDownloading.value = false
    isDownloadError.value = true
  }
}
</script>

<template>
  <div class="audio-msg-wrapper">
    <AudioFileIcon />
    <div class="main">
      <span class="file-name text-ellipsis" :title="props.fileName || '未知'">
        {{ props.fileName || '未知' }}
      </span>
      <div class="footer">
        <div class="size" :title="formatSize">{{ formatSize }}</div>
        <div v-if="props.url" class="download">
          <span
            v-if="!isDownloading && !isDownloadComplete && !isDownloadError"
            @click="onDownload"
            style="cursor: pointer"
          >
            下载
          </span>
          <div
            v-else-if="isDownloading"
            class="loading-ring"
            :style="{ '--progress': progress + '%' }"
          >
            <div class="progress"></div>
          </div>
          <div
            v-else-if="!isDownloading && isDownloadComplete"
            class="check-success"
            title="已下载"
          >
            <CircleCheckFilled />
          </div>
          <div
            v-else-if="!isDownloading && isDownloadError"
            class="check-fail"
            title="点击重试"
            @click="onDownload"
          >
            <WarningFilled />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.audio-msg-wrapper {
  padding: 4px 8px 4px 8px;
  display: flex;
  gap: 10px;

  .svg-icon {
    width: 48px;
    height: 48px;
  }

  .main {
    width: 140px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    gap: 8px;

    .file-name {
      font-size: 14px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 12px;

      .download {
        width: 32px;
        color: blue;
        display: flex;
        justify-content: center;
      }

      .loading-ring {
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: inline-block;
        vertical-align: middle;

        .progress {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
        }
      }

      .loading-ring:not(.completed) {
        background: conic-gradient(#007bff 0% var(--progress), #ccc var(--progress) 100%);
      }

      .loading-ring.completed {
        background: #007bff;
      }

      .check-success {
        width: 18px;
        height: 18px;
        color: #95d475;
      }

      .check-fail {
        width: 18px;
        height: 18px;
        color: red;
        cursor: pointer;
      }
    }
  }
}
</style>
