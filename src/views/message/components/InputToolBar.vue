<script setup>
import { ref } from 'vue'
import { Clock, Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import EmojiIcon from '@/assets/svg/emoji.svg'
import FileIcon from '@/assets/svg/file.svg'
import ImageIcon from '@/assets/svg/image.svg'
import CodeIcon from '@/assets/svg/code.svg'
import VoteIcon from '@/assets/svg/vote.svg'
import EmojiBox from './EmojiBox.vue'
import InputTool from '@/views/message/components/InputTool.vue'
import { mtsUploadService, mtsUploadServiceForImage } from '@/api/mts'
import {
  useMessageStore,
  useImageStore,
  useAudioStore,
  useVideoStore,
  useDocumentStore
} from '@/stores'
import { MsgType } from '@/proto/msg'
import { msgContentType, msgFileUploadStatus } from '@/const/msgConst'
import { generateThumb } from '@/js/utils/image'
import { getMd5 } from '@/js/utils/file'

const props = defineProps(['sessionId', 'isShowToolSet'])
const emit = defineEmits(['sendEmoji', 'showRecorder', 'sendMessage', 'saveLocalMsg'])

const messageData = useMessageStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()
const isShowEmojiBox = ref(false)

const onSelectedFile = async (file) => {
  if (!file) {
    return
  }

  let contentType = msgContentType.DOCUMENT
  const md5 = await getMd5(file.raw)
  let thumbObj
  if (file.raw.type.startsWith('image/')) {
    contentType = msgContentType.IMAGE
    thumbObj = await generateThumb(file.raw)
  } else if (file.raw.type.startsWith('audio/')) {
    contentType = msgContentType.AUDIO
  } else if (file.raw.type.startsWith('video/')) {
    contentType = msgContentType.VIDEO
  }

  setLocalData(contentType, file)
  let msg = {}
  emit('saveLocalMsg', {
    contentType: contentType,
    objectId: file.uid,
    fn: (result) => {
      msg = result
    }
  })
  msg.uploadStatus = msgFileUploadStatus.UPLOADING
  msg.uploadProgress = 0

  let requestApi = mtsUploadService
  const requestBody = {
    storeType: 1,
    md5,
    fileName: file.name,
    fileRawType: file.raw.type,
    size: file.raw.size
  }
  const files = { originFile: file.raw }

  if (contentType === msgContentType.IMAGE) {
    requestBody.originWidth = thumbObj.originWidth
    requestBody.originHeight = thumbObj.originHeight
    requestBody.thumbWidth = thumbObj.thumbWidth
    requestBody.thumbHeight = thumbObj.thumbHeight
    files.thumbFile = thumbObj.thumbFile
    requestApi = mtsUploadServiceForImage
  }

  requestApi(requestBody, files)
    .then((res) => {
      if (res.data.code === 0) {
        setStoreData(contentType, res.data.data)
        msg.uploadStatus = msgFileUploadStatus.UPLOAD_SUCCESS
        msg.uploadProgress = 100
        msg.content = JSON.stringify({ type: contentType, value: res.data.data.objectId })
        emit('sendMessage', msg)
      }
    })
    .catch((error) => {
      msg.uploadStatus = msgFileUploadStatus.UPLOAD_FAILED
      if (error.status === 200 && error.data?.code !== 0) {
        ElMessage.error(error.data.desc || '文件上传失败')
      } else {
        ElMessage.error('文件上传失败')
      }
    })
}

/**
 * 发送的时候设置本地缓存（非服务端数据），用于立即渲染
 * @param contentType
 * @param file
 */
const setLocalData = (contentType, file) => {
  const localSrc = URL.createObjectURL(file.raw)
  switch (contentType) {
    case msgContentType.IMAGE:
      imageData.setImage({
        objectId: file.uid,
        originUrl: localSrc,
        thumbUrl: localSrc,
        fileName: file.name,
        size: file.raw.size,
        createdTime: new Date()
      })
      break
    case msgContentType.AUDIO:
      audioData.setAudio({
        objectId: file.uid,
        downloadUrl: localSrc,
        fileName: file.name,
        size: file.raw.size
      })
      break
    case msgContentType.VIDEO:
      videoData.setVideo({
        objectId: file.uid,
        downloadUrl: localSrc,
        fileName: file.name,
        size: file.raw.size
      })
      break
    case msgContentType.DOCUMENT:
    default:
      documentData.setDocument({
        objectId: file.uid,
        documentType: file.raw.type,
        downloadUrl: localSrc,
        fileName: file.name,
        size: file.raw.size
      })
  }
}

/**
 * 服务端响应数据回来后，设置store缓存
 * @param contentType
 * @param file
 */
const setStoreData = (contentType, data) => {
  switch (contentType) {
    case msgContentType.IMAGE:
      imageData.setImage(data)
      break
    case msgContentType.AUDIO:
      audioData.setAudio(data)
      break
    case msgContentType.VIDEO:
      videoData.setVideo(data)
      break
    case msgContentType.DOCUMENT:
    default:
      documentData.setDocument(data)
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
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        accept="image/*"
        :on-change="onSelectedFile"
      >
        <template #trigger>
          <InputTool tips="图片">
            <template #iconSlot>
              <ImageIcon />
            </template>
          </InputTool>
        </template>
      </el-upload>
      <el-upload :auto-upload="false" :show-file-list="false" :on-change="onSelectedFile">
        <template #trigger>
          <InputTool tips="文件">
            <template #iconSlot>
              <FileIcon />
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
