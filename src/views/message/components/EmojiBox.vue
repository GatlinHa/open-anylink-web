<script setup>
import { ref, watch } from 'vue'
import { emojis, getEmojiHtml } from '@/js/utils/emojis'

const props = defineProps(['isShow'])
const emit = defineEmits(['close', 'sendEmoji'])

const isShowDialog = ref(false)
const elementRef = ref()
const tabOption = ref('system')

const clickListener = (e) => {
  if (!isShowDialog.value) return
  if (!elementRef.value?.contains(e.target)) {
    close()
  }
}

const handleEscKey = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}

const close = () => {
  isShowDialog.value = false
  document.removeEventListener('click', clickListener)
  document.removeEventListener('keydown', handleEscKey)
  emit('close')
}

watch(
  () => props.isShow,
  (newValue) => {
    isShowDialog.value = newValue
    if (isShowDialog.value) {
      tabOption.value = 'system'
      setTimeout(() => {
        document.addEventListener('click', clickListener)
        document.addEventListener('keydown', handleEscKey)
      }, 0)
    } else {
      // 父组件通过props.isShow关闭时也要注销掉listener
      document.removeEventListener('click', clickListener)
      document.removeEventListener('keydown', handleEscKey)
    }
  }
)

const onSelectEmoji = (key) => {
  emit('sendEmoji', key)
}
</script>

<template>
  <div class="emoji-box" v-show="isShowDialog" ref="elementRef" @click.self="close">
    <el-tabs v-model="tabOption">
      <el-tab-pane class="emoji-container my-scrollbar" label="系统表情" name="system">
        <div
          v-for="key in Object.keys(emojis)"
          :key="key"
          class="emoji-item"
          v-html="getEmojiHtml(key)"
          @click="onSelectEmoji(key)"
        ></div>
      </el-tab-pane>
      <el-tab-pane class="emoji-container my-scrollbar" label="我的收藏" name="custom">
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.emoji-box {
  width: 472px;
  height: 240px;
  padding: 0 5px 0 5px;
  position: absolute;
  left: 5px;
  bottom: 45px;
  border-radius: 10px;
  border: #f0f0f0 solid 1px;
  background-color: #fff;

  .emoji-container {
    width: auto;
    height: 190px;
    padding: 5px;
    display: flex;
    flex-wrap: wrap;
    overflow-y: scroll;

    .emoji-item {
      padding: 5px;
      display: flex;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: scale(1.5);
      }
    }
  }

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}
</style>
