<script setup>
import { onMounted, computed } from 'vue'
import AudioFileIcon from '@/assets/svg/audiofile.svg'
import { formatFileSize } from '@/js/utils/common'

const props = defineProps(['url', 'fileName', 'size'])
const emits = defineEmits(['load'])

const formatSize = computed(() => {
  return formatFileSize(props.size)
})

onMounted(() => {
  emits('load') //向父组件暴露load事件
})
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
        <a :href="props.url" :download="props.fileName">下载</a>
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
    }
  }
}
</style>
