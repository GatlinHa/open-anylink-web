<script setup>
import { msgContentType } from '@/const/msgConst'
import MsgBoxDocument from '@/views/message/components/MsgBoxDocument.vue'

const props = defineProps(['isShow', 'target', 'contentType', 'fileName', 'fileSize', 'src'])
const emit = defineEmits(['update:isShow', 'confirm'])

const handleConfirm = () => {
  emit('confirm')
  emit('update:isShow', false)
}

const handleClose = () => {
  emit('update:isShow', false)
}
</script>

<template>
  <el-dialog
    title="发送给："
    :model-value="props.isShow"
    width="400"
    top="40vh"
    @close="handleClose"
  >
    <div style="display: flex; flex-direction: column; gap: 20px">
      <span
        class="target"
        style="
          background-color: #ebedf0;
          border-radius: 4px;
          padding: 2px 8px 2px 8px;
          user-select: text;
        "
        >{{ props.target }}</span
      >
      <div class="content" style="display: flex; justify-content: center">
        <img
          v-if="props.contentType === msgContentType.IMAGE"
          :src="props.src"
          alt="本地图片加载错误"
          style="
            max-width: 360px;
            max-height: 270px;
            object-fit: contain;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          "
        />
        <MsgBoxDocument
          v-else
          :fileName="props.fileName"
          :fileSize="props.fileSize"
          :contentType="props.contentType"
          :use="'agree'"
        ></MsgBoxDocument>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">发送</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped></style>
