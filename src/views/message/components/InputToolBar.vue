<script setup>
import { ref } from 'vue'
import {
  LocationInformation,
  Clock,
  FolderAdd,
  CreditCard,
  Microphone
} from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import EmojiIcon from '@/assets/svg/emoji.svg'
import EmojiBox from './EmojiBox.vue'
import InputTool from '@/views/message/components/InputTool.vue'
import { mtsUploadService } from '@/api/mts'
import { imageStore, audioStore } from '@/stores'
import { el_loading_options } from '@/const/commonConst'

const props = defineProps(['sessionId', 'isShowToolSet'])
const emit = defineEmits(['sendEmoji', 'sendImage', 'sendAudio', 'showRecorder'])

const imageData = imageStore()
const audioData = audioStore()
const isShowEmojiBox = ref(false)

const onSelectedFile = (file) => {
  if (!file) {
    return
  }

  if (file.raw.type && file.raw.type.startsWith('image/')) {
    const loadingInstance = ElLoading.service(el_loading_options)
    mtsUploadService({ file: file.raw, storeType: 1 })
      .then((res) => {
        if (res.data.code === 0) {
          imageData.setImage(props.sessionId, res.data.data) // 缓存image数据
          emit('sendImage', res.data.data)
        }
      })
      .finally(() => {
        loadingInstance.close()
      })
  } else if (file.raw.type && file.raw.type.startsWith('audio/')) {
    const loadingInstance = ElLoading.service(el_loading_options)
    mtsUploadService({ file: file.raw, storeType: 1 })
      .then((res) => {
        if (res.data.code === 0) {
          audioData.setAudio(props.sessionId, res.data.data) // 缓存audio的数据
          emit('sendAudio', res.data.data)
        }
      })
      .finally(() => {
        loadingInstance.close()
      })
  } else {
    ElMessage.warning('不支持发送该格式的文件')
  }
}

const onSendEmoji = (key) => {
  emit('sendEmoji', key)
}

/**
 * 关掉bar上弹出的窗口
 */
const closeWindow = () => {
  isShowEmojiBox.value = false
}

const showRecorder = () => {
  emit('showRecorder')
}

defineExpose({
  closeWindow
})
</script>

<template>
  <div class="tool-set">
    <div v-if="props.isShowToolSet" class="left-tools">
      <InputTool tips="表情" @click="isShowEmojiBox = true">
        <template #iconSlot>
          <EmojiIcon />
        </template>
      </InputTool>
      <el-upload :auto-upload="false" :show-file-list="false" :on-change="onSelectedFile">
        <template #trigger>
          <InputTool tips="文件">
            <template #iconSlot>
              <FolderAdd />
            </template>
          </InputTool>
        </template>
      </el-upload>
      <InputTool tips="语音消息" @click="showRecorder">
        <template #iconSlot>
          <Microphone />
        </template>
      </InputTool>
      <InputTool tips="代码" @click="ElMessage.warning('功能开发中')">
        <template #iconSlot>
          <CreditCard />
        </template>
      </InputTool>
      <InputTool tips="位置" @click="ElMessage.warning('功能开发中')">
        <template #iconSlot>
          <LocationInformation />
        </template>
      </InputTool>
    </div>
    <div class="right-tools">
      <InputTool tips="聊天记录" @click="ElMessage.warning('功能开发中')">
        <template #iconSlot>
          <Clock />
        </template>
      </InputTool>
    </div>
  </div>
  <EmojiBox
    :isShow="isShowEmojiBox"
    @close="isShowEmojiBox = false"
    @sendEmoji="onSendEmoji"
  ></EmojiBox>
</template>

<style lang="scss" scoped>
.tool-set {
  height: 42px;
  display: flex;
  position: relative;

  .left-tools {
    display: flex;

    // 调整文件按钮选中之后的颜色，默认是rgb(64, 158, 255)
    :deep(.el-upload) {
      color: #000;
      fill: #000;
      outline-color: #000;
    }
  }

  .right-tools {
    position: absolute;
    right: 0;
  }
}
</style>
