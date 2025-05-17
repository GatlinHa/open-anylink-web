<script setup>
import { ref, computed } from 'vue'
import { Clock, Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import EmojiIcon from '@/assets/svg/emoji.svg'
import FileIcon from '@/assets/svg/file.svg'
import ImageIcon from '@/assets/svg/image.svg'
import CodeIcon from '@/assets/svg/code.svg'
import VoteIcon from '@/assets/svg/vote.svg'
import EmojiBox from '@/views/message/components/EmojiBox.vue'
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
import { msgContentType, msgFileUploadStatus, msgSendStatus } from '@/const/msgConst'
import { prehandleImage } from '@/js/utils/image'
import { prehandleVideo } from '@/js/utils/video'
import { getMd5 } from '@/js/utils/file'
import AgreeBeforeSend from '@/views/message/components/AgreeBeforeSend.vue'

const props = defineProps(['sessionId', 'isShowToolSet'])
const emit = defineEmits(['sendEmoji', 'showRecorder', 'sendMessage', 'saveLocalMsg'])

const messageData = useMessageStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()
const isShowEmojiBox = ref(false)
const showAgreeDialog = ref(false)

const session = computed(() => {
  return messageData.sessionList[props.sessionId]
})

const remoteName = computed(() => {
  if (session.value.sessionType === MsgType.CHAT) {
    return session.value.objectInfo.nickName
  } else if (session.value.sessionType === MsgType.GROUP_CHAT) {
    return session.value.objectInfo.groupName
  } else {
    return ''
  }
})

let selectedFile
let contentType
let md5
let prehandleImageObj
let prehandleVideoObj
let localSrc

const onSelectedFile = async (file) => {
  if (!file) {
    return
  }

  selectedFile = file
  localSrc = URL.createObjectURL(selectedFile.raw)
  try {
    md5 = await getMd5(file.raw)
    if (file.raw.type.startsWith('image/')) {
      contentType = msgContentType.IMAGE
      prehandleImageObj = await prehandleImage(file.raw)
    } else if (file.raw.type.startsWith('audio/')) {
      contentType = msgContentType.AUDIO
    } else if (file.raw.type.startsWith('video/')) {
      contentType = msgContentType.VIDEO
      prehandleVideoObj = await prehandleVideo(file.raw)
    } else {
      contentType = msgContentType.DOCUMENT
    }

    showAgreeDialog.value = true
  } catch (error) {
    ElMessage.error(error.message)
    URL.revokeObjectURL(localSrc)
    return
  }
}

const onConfirmSendFile = () => {
  // 写本地数据
  setLocalData()

  // 写本地消息
  let msg = {}
  emit('saveLocalMsg', {
    content: JSON.stringify([{ type: contentType, value: selectedFile.uid }]),
    contentType: contentType,
    fn: (result) => {
      msg = result
    }
  })

  // 上传文件
  let requestApi = mtsUploadService
  const requestBody = {
    storeType: 1,
    md5,
    fileName: selectedFile.name,
    fileRawType: selectedFile.raw.type,
    size: selectedFile.raw.size
  }
  const files = { originFile: selectedFile.raw }

  if (contentType === msgContentType.IMAGE) {
    requestBody.originWidth = prehandleImageObj.originWidth
    requestBody.originHeight = prehandleImageObj.originHeight
    requestBody.thumbWidth = prehandleImageObj.thumbWidth
    requestBody.thumbHeight = prehandleImageObj.thumbHeight
    files.thumbFile = prehandleImageObj.thumbFile
    requestApi = mtsUploadServiceForImage
  } else if (contentType === msgContentType.VIDEO) {
    requestBody.videoWidth = prehandleVideoObj.width
    requestBody.videoHeight = prehandleVideoObj.height
  }

  messageData.updateMsg(msg.sessionId, msg.msgId, {
    uploadStatus: msgFileUploadStatus.UPLOADING,
    uploadProgress: 0
  })
  requestApi(requestBody, files)
    .then((res) => {
      if (res.data.code === 0) {
        setStoreData(res.data.data)
        messageData.updateMsg(msg.sessionId, msg.msgId, {
          uploadStatus: msgFileUploadStatus.UPLOAD_SUCCESS,
          uploadProgress: 100
        })
        const content = JSON.stringify([{ type: contentType, value: res.data.data.objectId }])
        emit('sendMessage', { msg, content }) // 上传完成后发网络消息
      }
    })
    .catch((error) => {
      messageData.updateMsg(msg.sessionId, msg.msgId, {
        uploadStatus: msgFileUploadStatus.UPLOAD_FAILED,
        status: msgSendStatus.UPLOAD_FAILED
      })
      if (error.status === 200 && error.data?.code !== 0) {
        ElMessage.error(error.data.desc || '文件上传失败')
      } else {
        ElMessage.error('文件上传失败')
      }
    })
}

/**
 * 发送的时候设置本地缓存（非服务端数据），用于立即渲染
 */
const setLocalData = () => {
  switch (contentType) {
    case msgContentType.IMAGE:
      imageData.setImage({
        objectId: selectedFile.uid,
        originUrl: localSrc,
        thumbUrl: localSrc, // 本地缓存缩略图用的是原图
        fileName: selectedFile.name,
        size: selectedFile.raw.size,
        thumbWidth: prehandleImageObj.originWidth,
        thumbHeight: prehandleImageObj.originHeight,
        createdTime: new Date()
      })
      break
    case msgContentType.AUDIO:
      audioData.setAudio({
        objectId: selectedFile.uid,
        downloadUrl: localSrc,
        fileName: selectedFile.name,
        size: selectedFile.raw.size
      })
      break
    case msgContentType.VIDEO:
      videoData.setVideo({
        objectId: selectedFile.uid,
        downloadUrl: localSrc,
        fileName: selectedFile.name,
        size: selectedFile.raw.size,
        width: prehandleVideoObj.width,
        height: prehandleVideoObj.height
      })
      break
    case msgContentType.DOCUMENT:
    default:
      documentData.setDocument({
        objectId: selectedFile.uid,
        documentType: selectedFile.raw.type,
        downloadUrl: localSrc,
        fileName: selectedFile.name,
        size: selectedFile.raw.size
      })
  }
}

/**
 * 服务端响应数据回来后，设置store缓存
 * @param data
 */
const setStoreData = (data) => {
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
  <AgreeBeforeSend
    v-model:isShow="showAgreeDialog"
    :target="remoteName"
    :contentType="contentType"
    :fileName="selectedFile?.name"
    :fileSize="selectedFile?.raw.size"
    :src="localSrc"
    @confirm="onConfirmSendFile"
  ></AgreeBeforeSend>
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
