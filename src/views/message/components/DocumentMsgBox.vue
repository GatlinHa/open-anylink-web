<script setup>
import { onMounted, computed } from 'vue'
import { formatFileSize } from '@/js/utils/common'
import DocumentIcon from '@/assets/svg/document.svg'
import ArchiveIcon from '@/assets/svg/archive.svg'
import FileTemplateIcon from '@/assets/svg/filetemplate.svg'

const props = defineProps(['url', 'fileName', 'contentType', 'size'])
const emits = defineEmits(['load'])

const iconMap = {
  'text/csv': 'CSV',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/html': 'HTML',
  'application/pdf': 'PDF',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'text/plain': 'TXT',
  'application/vnd.ms-works': 'WPS',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/zip': ArchiveIcon,
  'application/vnd.rar': ArchiveIcon,
  'application/x-zip-compressed': ArchiveIcon,
  'application/x-7z-compressed': ArchiveIcon,
  'application/x-tar': ArchiveIcon,
  'application/gzip': ArchiveIcon,
  'application/x-bzip2': ArchiveIcon
}

const iconComponent = computed(() => {
  return iconMap[props.contentType] || DocumentIcon
})

const formatSize = computed(() => {
  return formatFileSize(props.size)
})

onMounted(() => {
  emits('load') //向父组件暴露load事件
})
</script>

<template>
  <div class="document-msg-wrapper">
    <div v-if="typeof iconComponent === 'string'" class="file-template">
      <FileTemplateIcon></FileTemplateIcon>
      <span class="extension">{{ iconComponent }}</span>
    </div>
    <component v-else :is="iconComponent" />
    <div class="main">
      <span class="file-name text-ellipsis" :title="props.fileName || '未知'">
        {{ props.fileName || '未知' }}
      </span>
      <div class="footer">
        <div class="size" :title="formatSize">{{ formatSize }}</div>
        <a :href="props.url" :download="props.fileName">下载</a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.document-msg-wrapper {
  padding: 4px 8px 4px 8px;
  display: flex;
  gap: 10px;

  .file-template {
    position: relative;

    .extension {
      width: 100%;
      position: absolute;
      left: 0;
      top: 16px;
      font-size: 16px;
      line-height: 24px;
      font-weight: bold;
      letter-spacing: -2px;
      text-align: center;
      color: #fff;
      user-select: none;
    }
  }

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
    }
  }
}
</style>
