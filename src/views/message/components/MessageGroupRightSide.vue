<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { MsgType } from '@/proto/msg'
import { Edit, Search } from '@element-plus/icons-vue'
import { userStore, settingStore, messageStore, groupStore, groupCardStore } from '@/stores'
import DragLine from '@/components/common/DragLine.vue'
import GroupMembersTable from '@/components/common/GroupMembersTable.vue'

const props = defineProps(['sessionId'])
const emit = defineEmits(['showGroupCard', 'openSession'])

const userData = userStore()
const settingData = settingStore()
const messageData = messageStore()
const groupData = groupStore()
const groupCardData = groupCardStore()

const msgGroupRightSideWidth = ref(0)
const announcementInSideHeight = ref(0)

const searchRef = ref()
const groupMembersRef = ref()
const searchMode = ref(false)
const memberSearchKey = ref('')

const myAccount = computed(() => {
  return userData.user.account
})

onMounted(() => {
  msgGroupRightSideWidth.value = settingData.msgGroupRightSideDrag[myAccount.value] || 200
  announcementInSideHeight.value = settingData.announcementInSideDrag[myAccount.value] || 100

  document.addEventListener('click', clickListener)
})

onUnmounted(() => {
  document.removeEventListener('click', clickListener)
})

const sessionType = computed(() => {
  return messageData.sessionList[props.sessionId]?.sessionType
})

const groupId = computed(() => {
  return messageData.sessionList[props.sessionId]?.remoteId
})

const announcement = computed(() => {
  return groupData.groupInfoList[groupId.value]?.announcement || '暂无公告'
})

const isNotInGroup = computed(() => {
  return messageData.sessionList[props.sessionId]?.leave
})

const membersCount = computed(() => {
  if (isNotInGroup.value) return 0
  const validMembers = groupData.getValidGroupMembers(groupId.value)
  return Object.values(validMembers).length
})

const iAmAdmin = computed(() => {
  const members = groupData.groupMembersList[groupId.value]
  if (members) {
    return members[myAccount.value]?.role > 0
  } else {
    return false
  }
})

const clickListener = (e) => {
  if (!searchMode.value) return
  if (
    !searchRef.value?.$el.contains(e.target) &&
    !groupMembersRef.value?.$el.contains(e.target) &&
    !e.target.closest('.member-context-menu')
  ) {
    searchMode.value = false
    memberSearchKey.value = ''
  }
}

const onMsgGroupRightSideWidthDragUpdate = ({ width }) => {
  msgGroupRightSideWidth.value = width
  settingData.setMsgGroupRightSideDrag({
    ...settingData.msgGroupRightSideDrag,
    [myAccount.value]: width
  })
}

const onAnnouncementInSideHeightDragUpdate = ({ height }) => {
  announcementInSideHeight.value = height
  settingData.setAnnouncementInSideDrag({
    ...settingData.announcementInSideDrag,
    [myAccount.value]: height
  })
}

const onEditAnnouncement = () => {
  groupCardData.setShowModel('editAnnouncement')
  emit('showGroupCard', { groupId: groupId.value })
}

const onSwitchSearchMode = () => {
  memberSearchKey.value = ''
  searchMode.value = true
  nextTick(() => {
    searchRef.value.focus()
  })
}

const onOpenSession = (obj) => {
  emit('openSession', obj)
}
</script>

<template>
  <div
    v-if="sessionType === MsgType.GROUP_CHAT"
    class="msg-group-right-side bdr-l"
    :style="{ width: msgGroupRightSideWidth + 'px' }"
  >
    <DragLine
      direction="left"
      :min="200"
      :max="400"
      :origin-size="msgGroupRightSideWidth"
      @drag-update="onMsgGroupRightSideWidthDragUpdate"
    ></DragLine>
    <div
      class="announcement-in-side-wrapper bdr-b"
      :style="{ height: announcementInSideHeight + 'px' }"
    >
      <div style="height: 100%; display: flex; flex-direction: column">
        <div style="padding: 10px; display: flex; justify-content: space-between">
          <span>群公告</span>
          <el-icon
            class="edit-announcement"
            v-if="iAmAdmin"
            title="修改群公告"
            @click.stop="onEditAnnouncement"
          >
            <Edit />
          </el-icon>
        </div>
        <div class="announcement my-scrollbar">{{ announcement }}</div>
      </div>
      <DragLine
        direction="bottom"
        :min="100"
        :max="400"
        :origin-size="announcementInSideHeight"
        @drag-update="onAnnouncementInSideHeightDragUpdate"
      ></DragLine>
    </div>
    <div class="members-in-side-wrapper">
      <div v-if="!searchMode" style="padding: 10px; display: flex; justify-content: space-between">
        <span style="height: 28px">群组成员 ({{ membersCount }})</span>
        <el-icon class="search-member" title="搜索成员" @click.stop="onSwitchSearchMode">
          <Search />
        </el-icon>
      </div>
      <el-input
        v-else
        ref="searchRef"
        v-model="memberSearchKey"
        placeholder="搜索：群内昵称/账号"
        :prefix-icon="Search"
        :clearable="true"
      ></el-input>
      <GroupMembersTable
        class="my-scrollbar"
        ref="groupMembersRef"
        :groupId="groupId"
        :memberSearchKey="memberSearchKey"
        @openSession="onOpenSession"
        style="padding: 0 4px 0 8px; overflow-y: scroll"
      ></GroupMembersTable>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.msg-group-right-side {
  width: 200px;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  position: relative;

  .announcement-in-side-wrapper {
    position: relative;
    margin: 2px;

    .announcement {
      height: 0;
      padding: 0 4px 0 8px;
      display: flex;
      flex: 1;
      color: gray;
      overflow-y: scroll;
      user-select: text;
      white-space: pre-wrap; //给文本中的\n换行
      word-wrap: break-word; //允许长单词换行
      word-break: break-all; //在任意字符处断行
    }
  }

  .members-in-side-wrapper {
    height: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    margin: 2px;

    .el-input {
      height: 48px;
      padding: 10px;
      :deep(.el-input__wrapper) {
        border-radius: 25px;
      }
    }
  }
}

.edit-announcement,
.search-member {
  padding: 4px;
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #dedfe0;
  }
}
</style>
