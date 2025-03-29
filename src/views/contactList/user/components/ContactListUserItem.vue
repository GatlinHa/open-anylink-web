<script setup>
import { ref, nextTick, computed } from 'vue'
import { ChatRound, Phone, VideoCamera, Edit, Delete, Check, Close } from '@element-plus/icons-vue'
import ContactItem from '@/components/item/ContactItem.vue'
import { sessionShowTime } from '@/js/utils/common'
import router from '@/router'
import { useMessageStore } from '@/stores'
import { ElMessage } from 'element-plus'

const props = defineProps(['type', 'session', 'partitions', 'keyWords'])
const emit = defineEmits(['showUserCard'])

const messageData = useMessageStore()

const markEditing = ref(false)
const newMark = ref('')
const markEditRef = ref()

const partitioEditing = ref(false)
const newPartitionId = ref(props.session.partitionId)

const lastMsg = computed(() => {
  const msgIds = messageData.msgIdSortArray[props.session.sessionId]
  if (!msgIds?.length) {
    return {}
  }
  return messageData.getMsg(props.session.sessionId, msgIds[msgIds.length - 1])
})

const onShowCard = () => {
  emit('showUserCard', {
    sessionId: props.session.sessionId,
    account: props.session.objectInfo.account
  })
}

const onClickEditMark = () => {
  newMark.value = props.session.mark || ''
  markEditing.value = true
  nextTick(() => {
    markEditRef.value.focus()
  })
}

const saveMark = () => {
  if (newMark.value !== props.session.mark) {
    const sessionId = props.session.sessionId
    messageData.updateSession({
      sessionId: sessionId,
      mark: newMark.value
    })
  }
  markEditing.value = false
}

const deleteMark = () => {
  if (!props.session.mark) {
    return
  } else {
    newMark.value = ''
    saveMark()
  }
}

const cancelMark = () => {
  markEditing.value = false
}

const onClickEditPartition = () => {
  partitioEditing.value = true
}

const onChangePartition = () => {
  if (newPartitionId.value !== props.session.partitionId) {
    const sessionId = props.session.sessionId
    messageData.updateSession({
      sessionId: sessionId,
      partitionId: newPartitionId.value
    })
  }
  partitioEditing.value = false
}

const onClearPartition = () => {
  const sessionId = props.session.sessionId
  messageData.updateSession({
    sessionId: sessionId,
    partitionId: 0 //和后端约定0表示不分组
  })
}

const onCancelPartition = () => {
  partitioEditing.value = false
}

const goToSessionTab = () => {
  router.push({
    path: '/message',
    query: {
      sessionId: props.session.sessionId
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
  <div class="contactList-user-item">
    <div class="content-wrapper">
      <ContactItem
        :contactInfo="props.session.objectInfo"
        :keyWords="props.keyWords"
        @showContactCard="onShowCard"
        style="width: 200px"
      ></ContactItem>
      <div class="diff-display">
        <div v-if="props.type === 'all'" class="all">
          <div class="tips-block">{{ sessionShowTime(lastMsg.msgTime) }}</div>
          <div class="all-content text-ellipsis" :title="lastMsg.content">
            {{ lastMsg.content }}
          </div>
        </div>
        <div v-if="props.type === 'mark'" class="mark">
          <div class="tips-block">备注</div>
          <div v-if="!markEditing" class="mark-content-wrapper">
            <div
              class="mark-content text-ellipsis"
              :title="props.session.mark"
              @click="onClickEditMark"
            >
              {{ props.session.mark }}
            </div>
            <div style="display: flex; flex-direction: row">
              <el-button
                type="primary"
                :icon="Edit"
                size="small"
                title="编辑备注"
                circle
                @click="onClickEditMark"
              ></el-button>
              <el-button
                type="danger"
                :icon="Delete"
                size="small"
                title="删除备注"
                circle
                @click="deleteMark"
                style="margin-left: 5px"
              ></el-button>
            </div>
          </div>
          <div v-else class="mark-edit-wrapper">
            <el-input
              ref="markEditRef"
              class="mark-edit"
              v-model.trim="newMark"
              maxlength="10"
              show-word-limit
              size="small"
              clearable
              @keyup.enter="saveMark"
            ></el-input>
            <div style="display: flex; flex-direction: row">
              <el-button
                type="success"
                :icon="Check"
                size="small"
                title="确认"
                circle
                @click="saveMark"
              ></el-button>
              <el-button
                type="info"
                :icon="Close"
                size="small"
                title="取消"
                circle
                @click="cancelMark"
                style="margin-left: 5px"
              ></el-button>
            </div>
          </div>
        </div>
        <div v-if="props.type === 'partition'" class="partition">
          <div class="tips-block">分组</div>
          <div v-if="!partitioEditing" class="partition-content-wrapper">
            <div
              class="partition-content text-ellipsis"
              :title="props.partitions[props.session.partitionId].partitionName"
              @click="onClickEditPartition"
            >
              {{ props.partitions[props.session.partitionId].partitionName }}
            </div>
            <div style="display: flex; flex-direction: row">
              <el-button
                type="primary"
                :icon="Edit"
                size="small"
                title="调整分组"
                circle
                @click="onClickEditPartition"
              ></el-button>
              <el-button
                type="danger"
                :icon="Delete"
                size="small"
                title="从该分组中移除"
                circle
                @click="onClearPartition"
                style="margin-left: 5px"
              ></el-button>
            </div>
          </div>
          <div v-else class="partition-edit-wrapper">
            <el-select
              class="partition-edit"
              v-model="newPartitionId"
              placeholder="请选择分组"
              size="small"
              style="margin-left: 5px"
            >
              <el-option
                v-for="item in props.partitions"
                :key="item.partitionId"
                :label="item.partitionName"
                :value="item.partitionId"
              />
            </el-select>
            <div style="display: flex; flex-direction: row">
              <el-button
                type="success"
                :icon="Check"
                size="small"
                title="确认"
                circle
                @click="onChangePartition"
              ></el-button>
              <el-button
                type="info"
                :icon="Close"
                size="small"
                title="取消"
                circle
                @click="onCancelPartition"
                style="margin-left: 5px"
              ></el-button>
            </div>
          </div>
        </div>
      </div>
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
          title="语音通话"
          color="#409eff"
          @click="onVoiceCall"
        >
          <Phone />
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
  </div>
</template>

<style lang="scss" scoped>
.contactList-user-item {
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

  .diff-display {
    height: 100%;
    margin-left: 20px;

    .tips-block {
      justify-content: start;
      border-radius: 4px;
      padding-left: 5px;
      padding-right: 5px;
      background: rgb(221.7, 222.6, 224.4);
      flex-shrink: 0;
    }

    .all {
      width: 200px;
      height: 100%;
      display: flex;
      align-items: center;

      .all-content {
        margin-left: 5px;
      }
    }

    .mark {
      height: 100%;
      display: flex;
      align-items: center;

      .mark-content-wrapper {
        width: 220px;
        display: flex;
        justify-content: space-between;

        .mark-content {
          margin-left: 5px;
          display: flex;
          align-items: center;
          color: #409eff;
          cursor: pointer;
        }
      }

      .mark-edit-wrapper {
        width: 220px;
        display: flex;
        justify-content: space-between;
        .mark-edit {
          width: 160px;
          margin-left: 5px;
        }
      }
    }

    .partition {
      height: 100%;
      display: flex;
      align-items: center;

      .partition-content-wrapper {
        width: 220px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .partition-content {
          margin-left: 5px;
          display: flex;
          align-items: center;
          color: #409eff;
          cursor: pointer;
        }
      }

      .partition-edit-wrapper {
        width: 220px;
        display: flex;
        justify-content: space-between;
        .partition-edit {
          width: 140px;
          margin-left: 5px;
        }
      }
    }
  }

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
