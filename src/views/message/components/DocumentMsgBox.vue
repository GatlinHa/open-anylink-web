<script setup>
import { onMounted, computed } from 'vue'
import { formatFileSize } from '@/js/utils/common'
import CsvIcon from '@/assets/svg/csv.svg'
import DocIcon from '@/assets/svg/doc.svg'
import DocumentIcon from '@/assets/svg/document.svg'
import DocxIcon from '@/assets/svg/docx.svg'
import HtmlIcon from '@/assets/svg/html.svg'
import PdfIcon from '@/assets/svg/pdf.svg'
import PptIcon from '@/assets/svg/ppt.svg'
import PptxIcon from '@/assets/svg/pptx.svg'
import TxtIcon from '@/assets/svg/txt.svg'
import WpsIcon from '@/assets/svg/wps.svg'
import XlsIcon from '@/assets/svg/xls.svg'
import XlsxIcon from '@/assets/svg/xlsx.svg'
import ArchiveIcon from '@/assets/svg/archive.svg'

const props = defineProps(['url', 'fileName', 'contentType', 'size'])
const emits = defineEmits(['load'])

const iconMap = {
  'text/csv': CsvIcon,
  'application/msword': DocIcon,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DocxIcon,
  'text/html': HtmlIcon,
  'application/pdf': PdfIcon,
  'application/vnd.ms-powerpoint': PptIcon,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': PptxIcon,
  'text/plain': TxtIcon,
  'application/vnd.ms-works': WpsIcon,
  'application/vnd.ms-excel': XlsIcon,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': XlsxIcon,
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
    <component :is="iconComponent" />
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
