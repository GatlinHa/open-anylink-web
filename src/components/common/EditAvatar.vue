<script setup>
import { ref, computed } from 'vue'
import { userStore } from '@/stores'
import { Plus, Upload, RefreshLeft, RefreshRight, Refresh } from '@element-plus/icons-vue'
import { mtsUploadService } from '@/api/mts'
import { ElMessage } from 'element-plus'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'

const props = defineProps(['modelValue', 'model', 'groupInfo'])
const emit = defineEmits(['update:modelValue', 'update:newAvatar'])
const userData = userStore()

const cropper = ref()
const srcImg = ref('')
const previewImg = ref('')
const isLoading = ref(false)
const fileName = ref('')
const resetData = ref({})

const avatar = computed(() => {
  if (props.model === 'user') {
    return userData.user.avatar
  } else if (props.model === 'group') {
    return props.groupInfo.avatar
  } else {
    return ''
  }
})

// 打开的时候触发
const onOpen = () => {
  fileName.value = avatar.value?.split('/').pop()
  srcImg.value = import.meta.env.VITE_OSS_CORS_FLAG + avatar.value
  previewImg.value = srcImg.value
  resetData.value = {
    previewImg: previewImg.value
  }
}

// 关闭的时候触发
const onClose = () => {
  isLoading.value = false
}

// 选择了文件触发
const onSelected = (file) => {
  fileName.value = file.name
  srcImg.value = URL.createObjectURL(file.raw)
  previewImg.value = srcImg.value
  resetData.value = {
    previewImg: previewImg.value
  }
}

const onUpload = async () => {
  cropper.value.getCropBlob(async (blob) => {
    const lastDotIndex = fileName.value.lastIndexOf('.')
    const prefix = fileName.value.substring(0, lastDotIndex)
    const suffix = fileName.value.substring(lastDotIndex)
    let file = new File(
      [blob],
      `${prefix}_${Math.round(cropper.value.cropW)}x${Math.round(cropper.value.cropH)}${suffix}`,
      {
        type: blob.type,
        lastModified: Date.now()
      }
    )

    isLoading.value = true
    try {
      const res = await mtsUploadService({ file: file })
      emit('update:newAvatar', {
        avatar: res.data.data.originUrl,
        avatarThumb: res.data.data.thumbUrl
      })
      emit('update:modelValue', false)
      ElMessage.success('头像上传成功')
    } catch (error) {
      /* empty */
    } finally {
      isLoading.value = false
    }
  })
}

const stopCrop = () => {
  cropper.value.getCropData((data) => {
    previewImg.value = data
  })
}

let timer
const onCropperWheel = () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    stopCrop()
  }, 100)
}

const onReset = () => {
  cropper.value.refresh()
  previewImg.value = resetData.value.previewImg
}

const onRotateLeft = () => {
  cropper.value.rotateLeft()
  cropper.value.getCropData((data) => {
    previewImg.value = data
  })
}

const onRotateRight = () => {
  cropper.value.rotateRight()
  cropper.value.getCropData((data) => {
    previewImg.value = data
  })
}
</script>

<template>
  <div class="edit-avatar-wrapper">
    <el-dialog
      :modelValue="props.modelValue"
      @update:modelValue="emit('update:modelValue', false)"
      @open="onOpen"
      @close="onClose"
      title="更换头像"
      width="700"
    >
      <div class="edit-avatar">
        <div class="left-area">
          <div class="canvas">
            <vueCropper
              ref="cropper"
              :img="srcImg"
              :full="true"
              :autoCrop="true"
              :autoCropWidth="250"
              :autoCropHeight="250"
              :canScale="true"
              :centerBox="true"
              @mouseup="stopCrop"
              @wheel="onCropperWheel"
            ></vueCropper>
          </div>
          <div class="action-buttons">
            <el-button type="primary" :icon="Refresh" plain @click="onReset">重置</el-button>
            <el-button type="primary" :icon="RefreshLeft" plain @click="onRotateLeft"
              >90°</el-button
            >
            <el-button type="primary" :icon="RefreshRight" plain @click="onRotateRight"
              >90°</el-button
            >
          </div>
        </div>

        <div class="right-area">
          <div class="preview-area">
            <span style="font-size: 16px">预览</span>
            <el-avatar class="preview-100" :src="previewImg" />
            <span>100×100</span>
            <el-avatar class="preview-40" :src="previewImg" />
            <span>40×40</span>
          </div>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onSelected"
            style="display: flex"
          >
            <template #trigger>
              <el-button type="primary" :icon="Plus" size="large"> 选择图片 </el-button>
            </template>
            <el-button
              type="success"
              :icon="Upload"
              size="large"
              @click="onUpload"
              :loading="isLoading"
              style="margin-left: 10px"
            >
              上传头像
            </el-button>
          </el-upload>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dialog) {
  border-radius: 8px;
}

.left-area {
  .canvas {
    width: 400px;
    height: 400px;
  }

  .action-buttons {
    margin-top: 20px;
    display: flex;
    justify-content: space-around;
  }
}

.edit-avatar {
  display: flex;
  .right-area {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-left: 20px;

    .preview-area {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;

      .el-avatar {
        margin-top: 30px;
      }
    }
  }

  .preview-100 {
    width: 100px;
    height: 100px;
  }

  .preview-40 {
    width: 40px;
    height: 40px;
  }
}
</style>
