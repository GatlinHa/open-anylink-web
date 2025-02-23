<script setup>
import { ChatRound, Microphone, VideoCamera } from '@element-plus/icons-vue'
import GroupItem from '@/components/item/GroupItem.vue'
import router from '@/router'
import { ElMessage } from 'element-plus'

const props = defineProps(['groupInfo', 'keyWords'])
const emit = defineEmits(['showGroupCard'])

const onShowGroupCard = () => {
  emit('showGroupCard')
}

const goToSessionTab = () => {
  router.push({
    path: '/message',
    query: {
      sessionId: props.groupInfo.groupId
    }
  })
}

const onVoiceCall = () => {
  ElMessage.warning('功能开发中')
}

const onVideoCall = () => {
  ElMessage.warning('功能开发中')
}
</script>

<template>
  <div class="contactList-group-item">
    <div class="content-wrapper">
      <GroupItem
        :groupInfo="props.groupInfo"
        :keyWords="keyWords"
        @showGroupCard="onShowGroupCard"
        style="width: 300px; margin-right: 20px"
      ></GroupItem>
      <slot name="showMore_1"></slot>
      <slot name="showMore_2"></slot>
      <div class="action">
        <el-icon
          class="action-button"
          size="20"
          title="发送消息"
          color="#409eff"
          @click="goToSessionTab"
        >
          <ChatRound />
        </el-icon>
        <el-icon
          class="action-button"
          size="20"
          title="多人语音"
          color="#409eff"
          @click="onVoiceCall"
        >
          <Microphone />
        </el-icon>
        <el-icon
          class="action-button"
          size="20"
          title="视频会议"
          color="#409eff"
          @click="onVideoCall"
        >
          <VideoCamera />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.contactList-group-item {
  height: 40px;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e9e9eb;
  display: flex;
  justify-content: space-between;

  &:hover {
    border: 1px solid #409eff;
  }
}

.content-wrapper {
  width: 100%;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: text;

  .action {
    margin-left: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .action-button {
      padding: 8px;
      margin-left: 10px;
      border-radius: 50%;
      background-color: #fff;
      border: transparent solid 1px;
      cursor: pointer;

      &:hover {
        border: #409eff solid 1px;
        color: #409eff;
      }
    }
  }
}
</style>
