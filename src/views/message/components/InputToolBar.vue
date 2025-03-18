<script setup>
import { ref } from 'vue'
import { LocationInformation, Clock, FolderAdd, CreditCard } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import EmojiIcon from '@/assets/svg/emoji.svg'
import EmojiBox from './EmojiBox.vue'
import InputTool from '@/views/message/components/InputTool.vue'
import { mtsUploadService } from '@/api/mts'
import { imageStore } from '@/stores'

const props = defineProps(['sessionId', 'isShowToolSet'])
const emit = defineEmits(['sendEmoji', 'sendImage'])

const imageData = imageStore()

const isShowEmojiBox = ref(false)

const onSelectedFile = (file) => {
  if (!file) {
    return
  }

  if (file.raw.type && file.raw.type.startsWith('image/')) {
    mtsUploadService({ file: file.raw, storeType: 1 }).then((res) => {
      if (res.data.code === 0) {
        imageData.setImage(props.sessionId, res.data.data) // 缓存image数据
        emit('sendImage', res.data.data)
      }
    })
  } else {
    ElMessage.warning('不支持上传该文件格式')
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
