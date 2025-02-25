<script setup>
import { ref, computed, nextTick } from 'vue'
import {
  Close,
  Male,
  Female,
  Check,
  Edit,
  ChatRound,
  Microphone,
  VideoCamera
} from '@element-plus/icons-vue'
import avatar from '@/assets/image/default_avatar.png'
import { userStore, messageStore, userCardStore } from '@/stores'
import { combineId } from '@/js/utils/common'
import { MsgType } from '@/proto/msg'
import { msgChatCreateSessionService } from '@/api/message'
import router from '@/router'
import { ElMessage } from 'element-plus'

const userData = userStore()
const messageData = messageStore()
const userCardData = userCardStore()

const sessionId = computed(() => {
  return combineId(userData.user.account, userCardData.userInfo?.account)
})
const mark = computed(() => {
  return messageData.sessionList[sessionId.value]?.mark || ''
})
const markEditing = ref(false)
const newMark = ref('')
const markEditRef = ref()

const partitions = computed(() => {
  return messageData.partitions
})
const partitionId = computed(() => {
  return messageData.sessionList[sessionId.value]?.partitionId || null
})
const partitioEditing = ref(false)
const newPartitionId = ref(null)

const isSelf = computed(() => {
  return userData.user.account === userCardData.userInfo.account
})

const preventClose = (event) => {
  event.stopPropagation()
}

const truncatedSignature = computed(() => {
  const signature = userCardData.userInfo.signature || 'TA还没有个性签名。'
  const lengthLimit = 50
  return signature.length > lengthLimit ? signature.slice(0, lengthLimit) + '...' : signature
})

// 关闭的时候触发
const onClose = () => {
  userCardData.setIsShow(false)
  markEditing.value = false
}

const onClickEditMark = () => {
  newMark.value = mark.value || ''
  markEditing.value = true
  nextTick(() => {
    markEditRef.value.focus()
  })
}

const createSessionIfNotExist = async () => {
  // 如果会话列表没有这个用户,则创建会话
  if (messageData.sessionList[sessionId.value] === undefined) {
    const res = await msgChatCreateSessionService({
      sessionId: sessionId.value,
      account: userData.user.account,
      remoteId: userCardData.userInfo.account,
      sessionType: MsgType.CHAT
    })
    messageData.addSession(res.data.data.session)
  }
}

const saveMark = async () => {
  if (newMark.value !== mark.value) {
    await createSessionIfNotExist()
    await messageData.updateSession({
      sessionId: sessionId.value,
      mark: newMark.value
    })
  }
  markEditing.value = false
}

const cancelMark = () => {
  markEditing.value = false
}

const onClickEditParition = () => {
  newPartitionId.value = partitionId.value
  partitioEditing.value = true
}

const onChangePartition = async () => {
  if (newPartitionId.value !== partitionId.value) {
    await createSessionIfNotExist()
    await messageData.updateSession({
      sessionId: sessionId.value,
      partitionId: newPartitionId.value || 0
    })
  }
  partitioEditing.value = false
}

const onCancelPartition = () => {
  partitioEditing.value = false
}

const goToSessionTab = () => {
  onClose()
  router.push({
    path: '/message',
    query: {
      sessionId: sessionId.value
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
  <div class="user-card-wrapper">
    <el-dialog
      :model-value="userCardData.isShow"
      :modal="false"
      :show-close="false"
      @close="onClose"
    >
      <template #header>
        <div style="background-color: red"></div>
      </template>

      <div class="user-card" @click.self="preventClose($event)">
        <div class="header">
          <el-icon class="close-button" @click="onClose"><Close /></el-icon>
          <div class="main">
            <el-avatar class="avatar" :src="userCardData.userInfo.avatarThumb || avatar" />
            <div class="gender">
              <el-icon v-if="userCardData.userInfo.gender === 1" color="#508afe"><Male /></el-icon>
              <el-icon v-if="userCardData.userInfo.gender === 2" color="#ff5722"
                ><Female
              /></el-icon>
            </div>
            <div class="nickname">
              {{ userCardData.userInfo.nickName || '未设置昵称' }}({{
                userCardData.userInfo.account
              }})
            </div>
          </div>
        </div>

        <div class="body">
          <el-text class="signature">
            {{ truncatedSignature }}
          </el-text>
          <div class="info-item phone">
            <span class="label">手机：</span>
            <span class="value">{{ userCardData.userInfo.phoneNum || '-' }}</span>
          </div>
          <div class="info-item email">
            <span class="label">邮箱：</span>
            <span class="value">{{ userCardData.userInfo.email || '-' }}</span>
          </div>
          <div class="info-item nickname">
            <span class="label">部门：</span>
            <span class="value">{{ userCardData.userInfo.organize || '-' }}</span>
          </div>
          <div v-if="!isSelf" class="info-item mark">
            <span class="label">备注：</span>
            <div v-if="!markEditing" class="value value-editable">
              <span @click="onClickEditMark" style="cursor: pointer">{{ mark || '-' }}</span>
              <el-button
                type="primary"
                :icon="Edit"
                size="small"
                circle
                @click="onClickEditMark"
              ></el-button>
            </div>
            <div v-else class="edit">
              <el-input
                ref="markEditRef"
                class="edit-component"
                v-model.trim="newMark"
                maxlength="10"
                show-word-limit
                size="small"
                @keyup.enter="saveMark"
              ></el-input>
              <el-button
                type="success"
                :icon="Check"
                size="small"
                circle
                @click.stop="saveMark"
              ></el-button>
              <el-button
                type="info"
                :icon="Close"
                size="small"
                circle
                @click.stop="cancelMark"
              ></el-button>
            </div>
          </div>
          <div v-if="!isSelf" class="info-item partition">
            <span class="label">分组：</span>
            <div v-if="!partitioEditing" class="value value-editable">
              <span @click="onClickEditParition" style="cursor: pointer">
                {{ partitions[partitionId]?.partitionName || '-' }}
              </span>
              <el-button
                type="primary"
                :icon="Edit"
                size="small"
                circle
                @click="onClickEditParition"
              ></el-button>
            </div>
            <div v-else class="edit">
              <el-select
                class="edit-component"
                v-model="newPartitionId"
                placeholder="请选择分组"
                size="small"
                clearable
              >
                <el-option
                  v-for="item in partitions"
                  :key="item.partitionId"
                  :label="item.partitionName"
                  :value="item.partitionId"
                />
              </el-select>
              <el-button
                type="success"
                :icon="Check"
                size="small"
                circle
                @click.stop="onChangePartition"
              ></el-button>
              <el-button
                type="info"
                :icon="Close"
                size="small"
                circle
                @click.stop="onCancelPartition"
              ></el-button>
            </div>
          </div>
        </div>
        <div v-if="!isSelf" class="bottom">
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
            title="语音通话"
            color="#409eff"
            @click="onVoiceCall"
          >
            <Microphone />
          </el-icon>
          <el-icon
            class="action-button"
            size="20"
            title="视频通话"
            color="#409eff"
            @click="onVideoCall"
          >
            <VideoCamera />
          </el-icon>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.user-card-wrapper {
  //不需要用到el-dialog的布局,只是利用了其覆盖层
  :deep(.el-dialog) {
    background-color: transparent;
    width: 0;
    height: 0;
    padding: 0;
  }
}

.user-card {
  width: 300px;
  height: 500px;
  border-radius: 10px;
  padding: 0px;
  box-shadow: 2px 2px 20px gray;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  z-index: 1;

  .header {
    width: 100%;
    height: 200px;
    background: linear-gradient(to bottom, #a0cfff, #ecf5ff);

    &::before {
      width: 150px;
      height: 150px;
      content: '';
      background: linear-gradient(to right, #79bbff, #fff);
      position: absolute;
      z-index: 1;
      border-radius: 50%;
      right: -25%;
      top: -15%;
    }

    .close-button {
      color: gray;
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 1;

      &:hover {
        color: #fff;
        background-color: red;
      }
    }

    .main {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;

      .avatar {
        width: 100px;
        height: 100px;
        position: absolute;
        top: 35px;
        border: 2px solid #fff;

        :deep(img) {
          margin: 0;
        }
      }

      .gender {
        width: 20px;
        height: 20px;
        position: absolute;
        left: 190px;
        top: 120px;
        border-radius: 50%;
      }

      .nickname {
        position: absolute;
        top: 145px;
        width: 80%;
        height: 48px;
        font-size: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        color: #409eff;
        font-weight: bold;
        user-select: text;
        word-break: break-all;
      }
    }
  }

  .body {
    width: 100%;
    flex: 1;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;

    .signature {
      width: 80%;
      margin-top: 16px;
      margin-bottom: 10px;
      padding: 5px;
      border-radius: 4px;
      background-color: #f5f5f5;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      white-space: normal; //允许文本内容自动换行
      user-select: text;
    }

    .info-item {
      margin-top: 10px;
      width: 80%;
      display: flex;
      font-size: 14px;

      .label {
        color: #909399;
        flex-shrink: 0;
      }

      .value {
        color: #409eff;
        user-select: text;
      }

      .value-editable {
        width: 100%;
        display: flex;
        justify-content: space-between;
      }

      .edit {
        width: 100%;
        display: flex;
        justify-content: space-between;
      }

      .edit-component {
        width: 130px;
        margin: 0 2px 0 0;
      }

      .el-button {
        margin: 0 2px 0 2px;
      }
    }
  }

  .bottom {
    width: 100%;
    height: 60px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background-color: #f5f5f5;

    .action-button {
      padding: 8px;
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
