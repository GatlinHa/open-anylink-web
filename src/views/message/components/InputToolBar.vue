<script setup>
import { ref } from 'vue'
import { Clock, Microphone } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import EmojiIcon from '@/assets/svg/emoji.svg'
import FileIcon from '@/assets/svg/file.svg'
import ImageIcon from '@/assets/svg/image.svg'
import CodeIcon from '@/assets/svg/code.svg'
import VoteIcon from '@/assets/svg/vote.svg'
import EmojiBox from './EmojiBox.vue'
import InputTool from '@/views/message/components/InputTool.vue'
import { mtsUploadService } from '@/api/mts'
import { messageStore, imageStore, audioStore, videoStore, documentStore } from '@/stores'
import { el_loading_options } from '@/const/commonConst'
import { MsgType } from '@/proto/msg'

const props = defineProps(['sessionId', 'isShowToolSet'])
const emit = defineEmits([
  'sendEmoji',
  'sendImage',
  'sendAudio',
  'sendVideo',
  'sendDocument',
  'showRecorder'
])

const messageData = messageStore()
const imageData = imageStore()
const audioData = audioStore()
const videoData = videoStore()
const documentData = documentStore()
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
  } else if (file.raw.type && file.raw.type.startsWith('video/')) {
    const loadingInstance = ElLoading.service(el_loading_options)
    mtsUploadService({ file: file.raw, storeType: 1 })
      .then((res) => {
        if (res.data.code === 0) {
          videoData.setVideo(props.sessionId, res.data.data) // 缓存video的数据
          emit('sendVideo', res.data.data)
        }
      })
      .finally(() => {
        loadingInstance.close()
      })
  } else {
    const loadingInstance = ElLoading.service(el_loading_options)
    mtsUploadService({ file: file.raw, storeType: 1 })
      .then((res) => {
        if (res.data.code === 0) {
          documentData.setDocument(props.sessionId, res.data.data) // 缓存video的数据
          emit('sendDocument', res.data.data)
        }
      })
      .finally(() => {
        loadingInstance.close()
      })
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
      <InputTool tips="图片">
        <template #iconSlot>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="onSelectedFile"
          >
            <template #trigger>
              <ImageIcon />
            </template>
          </el-upload>
        </template>
      </InputTool>
      <InputTool tips="文件">
        <template #iconSlot>
          <el-upload :auto-upload="false" :show-file-list="false" :on-change="onSelectedFile">
            <template #trigger>
              <FileIcon />
            </template>
          </el-upload>
        </template>
      </InputTool>

      <InputTool tips="语音消息" @click="showRecorder">
        <template #iconSlot>
          <Microphone />
        </template>
      </InputTool>
      <InputTool tips="代码" @click="ElMessage.warning('功能开发中')">
        <template #iconSlot>
          <CodeIcon />
        </template>
      </InputTool>
      <!-- <InputTool tips="位置" @click="ElMessage.warning('功能开发中')">
        <template #iconSlot>
          <LocationInformation />
        </template>
      </InputTool> -->
      <InputTool
        v-if="messageData.sessionList[props.sessionId].sessionType === MsgType.GROUP_CHAT"
        tips="群投票"
        @click="ElMessage.warning('功能开发中')"
      >
        <template #iconSlot>
          <VoteIcon />
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
