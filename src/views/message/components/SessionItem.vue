<script setup>
import { ref, computed, watch, reactive } from 'vue'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import GroupAvatarIcon from '@/components/common/GroupAvatarIcon.vue'
import SessionTag from './SessionTag.vue'
import { jsonParseSafe, sessionShowTime } from '@/js/utils/common'
import { Top, MuteNotification } from '@element-plus/icons-vue'
import { MsgType } from '@/proto/msg'
import { userStore, messageStore, groupStore } from '@/stores'
import { msgChatCloseSessionService } from '@/api/message'
import router from '@/router'
import { ElMessage } from 'element-plus'
import { msgSendStatus } from '@/const/msgConst'

const props = defineProps([
  'sessionId',
  'selectedSessionId',
  'showMenuSessionId',
  'selectedMenuItem'
])
const emit = defineEmits([
  'isSelected',
  'showUserCard',
  'showGroupCard',
  'openSessionMenu',
  'noneSelected',
  'showUpdateMarkDialog'
])
const messageData = messageStore()
const groupData = groupStore()
const userData = userStore()
const myAccount = computed(() => userData.user.account)
const sessionInfo = computed(() => {
  return messageData.sessionList[props.sessionId]
})

const top = ref(sessionInfo.value.top)
const dnd = ref(sessionInfo.value.dnd)

watch([() => sessionInfo.value.top, () => sessionInfo.value.dnd], ([newTop, newDnd]) => {
  ;(top.value = newTop), (dnd.value = newDnd)
})

const hasBeenSelected = computed(() => {
  return props.sessionId === props.selectedSessionId
})

const hasBeenShowMenu = computed(() => {
  return props.sessionId === props.showMenuSessionId
})

const showName = computed(() => {
  switch (sessionInfo.value.sessionType) {
    case MsgType.CHAT:
      return sessionInfo.value.objectInfo.nickName
    case MsgType.GROUP_CHAT:
      return (
        groupData.groupInfoList[sessionInfo.value.remoteId]?.groupName ||
        sessionInfo.value.objectInfo.groupName
      )
    default:
      return ''
  }
})

const showId = computed(() => {
  return sessionInfo.value.remoteId
})

const showAvatarThumb = computed(() => {
  switch (sessionInfo.value.sessionType) {
    case MsgType.CHAT:
    case MsgType.GROUP_CHAT:
      return sessionInfo.value.objectInfo.avatarThumb
    default:
      return ''
  }
})

const isNotInGroup = computed(() => {
  return sessionInfo.value.sessionType === MsgType.GROUP_CHAT && sessionInfo.value.leave
})

const lastMsg = computed(() => {
  const msgIds = messageData.msgIdSortArray[props.sessionId]
  if (!msgIds?.length) {
    return reactive({})
  }
  return reactive({ ...messageData.getMsg(props.sessionId, msgIds[msgIds.length - 1]) })
})

const lastMsgId = computed(() => {
  return lastMsg.value.msgId
})

const showTime = computed(() => {
  return sessionShowTime(lastMsg.value.msgTime)
})

const getSysGroupCreateMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let membersExcludeCreator = members.filter((item) => item.account !== operator.account)
  let str = ''
  membersExcludeCreator.forEach((item) => {
    str = str + item.nickName + '，'
  })
  return operator.nickName + '创建了群聊，并邀请了' + str.slice(0, -1)
}

const getSysGroupAddMemberMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let str = ''
  members.forEach((item) => {
    str = str + item.nickName + '，'
  })
  return operator.nickName + '邀请' + str.slice(0, -1) + '加入了群聊'
}

const getSysGroupDelMemberMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let str = ''
  members.forEach((item) => {
    str = str + item.nickName + '，'
  })
  return operator.nickName + '移出了' + str.slice(0, -1)
}

const getSysGroupChangeRoleMsgTips = (msgType, content) => {
  const operator = content['operator']
  const member = content['member']
  return msgType === MsgType.SYS_GROUP_SET_ADMIN
    ? `${operator.nickName}设置了${member.nickName}为管理员`
    : `${operator.nickName}取消了${member.nickName}的管理员权限`
}

const getSysGroupUpdateAllMuted = (msgType, content) => {
  const operator = content['operator']
  return msgType === MsgType.SYS_GROUP_SET_ALL_MUTED
    ? `${operator.nickName}设置了全员禁言`
    : `${operator.nickName}取消了全员禁言`
}

const getSysGroupUpdateJoinApproval = (msgType, content) => {
  const operator = content['operator']
  return msgType === MsgType.SYS_GROUP_SET_JOIN_APPROVAL
    ? `${operator.nickName}设置了全员禁言`
    : `${operator.nickName}取消了全员禁言`
}

const getSysGroupUpdateHistoryBrowse = (msgType, content) => {
  const operator = content['operator']
  return msgType === MsgType.SYS_GROUP_SET_HISTORY_BROWSE
    ? `${operator.nickName}开启了新成员浏览历史记录`
    : `${operator.nickName}关闭了新成员浏览历史记录`
}

const getSysGroupOwnerTransfer = (content) => {
  const operator = content['operator']
  const member = content['member']
  return `${operator.nickName}将群主转让给了${member.nickName}`
}

const getSysGroupUpdateMemberMuted = (content) => {
  const operator = content['operator']
  const member = content['member']
  const mutedMode = content['mutedMode']
  const allMuted = groupData.groupInfoList[sessionInfo.value.remoteId]?.allMuted
  if (allMuted) {
    if (mutedMode === 2) {
      return `${operator.nickName}允许了${member.nickName}的发言`
    } else {
      return `${operator.nickName}禁止了${member.nickName}的发言`
    }
  } else {
    if (mutedMode === 1) {
      return `${operator.nickName}禁止了${member.nickName}的发言`
    } else {
      return `${operator.nickName}允许了${member.nickName}的发言`
    }
  }
}

const getSysGroupLeave = (content) => {
  const operator = content['operator']
  return `${operator.nickName}离开了群组`
}

const getSysGroupDrop = (content) => {
  const operator = content['operator']
  return `${operator.nickName}解散了群组`
}

const getSysGroupUpdateAnnouncement = (content) => {
  const operator = content['operator']
  return `${operator.nickName}更改了群公告`
}

const getSysGroupUpdateName = (content) => {
  const operator = content['operator']
  const groupName = content['groupName']
  return `${operator.nickName}更改了群聊名称：${groupName}`
}

const getSysGroupUpdateAvatar = (content) => {
  const operator = content['operator']
  return `${operator.nickName}更改了群头像`
}

const getGroupChatMsgTips = (content) => {
  const memberList = groupData.groupMembersList[showId.value]
  const prefix = memberList ? memberList[lastMsg.value.fromId].nickName : lastMsg.value.fromId
  return prefix + '：' + content
}

const showDetailContent = computed(() => {
  if (isShowDraft.value) {
    return sessionInfo.value.draft?.replace(/\{\d+\}/g, '{图片}') // 把内容中的`{xxxxxx}`格式的图片统一转成`{图片}`
  } else {
    const replaceContent = lastMsg.value.content?.replace(/\{\d+\}/g, '{图片}') // 把内容中的`{xxxxxx}`格式的图片统一转成`{图片}`
    if (replaceContent) {
      if (sessionInfo.value.sessionType === MsgType.GROUP_CHAT) {
        const content = jsonParseSafe(replaceContent)
        switch (lastMsg.value.msgType) {
          case MsgType.SYS_GROUP_CREATE:
            return getSysGroupCreateMsgTips(content)
          case MsgType.SYS_GROUP_ADD_MEMBER:
            return getSysGroupAddMemberMsgTips(content)
          case MsgType.SYS_GROUP_DEL_MEMBER:
            return getSysGroupDelMemberMsgTips(content)
          case MsgType.SYS_GROUP_UPDATE_ANNOUNCEMENT:
            return getSysGroupUpdateAnnouncement(content)
          case MsgType.SYS_GROUP_UPDATE_NAME:
            return getSysGroupUpdateName(content)
          case MsgType.SYS_GROUP_UPDATE_AVATAR:
            return getSysGroupUpdateAvatar(content)
          case MsgType.SYS_GROUP_SET_ADMIN:
          case MsgType.SYS_GROUP_CANCEL_ADMIN:
            return getSysGroupChangeRoleMsgTips(lastMsg.value.msgType, content)
          case MsgType.SYS_GROUP_SET_ALL_MUTED:
          case MsgType.SYS_GROUP_CANCEL_ALL_MUTED:
            return getSysGroupUpdateAllMuted(lastMsg.value.msgType, content)
          case MsgType.SYS_GROUP_SET_JOIN_APPROVAL:
          case MsgType.SYS_GROUP_CANCEL_JOIN_APPROVAL:
            return getSysGroupUpdateJoinApproval(lastMsg.value.msgType, content)
          case MsgType.SYS_GROUP_SET_HISTORY_BROWSE:
          case MsgType.SYS_GROUP_CANCEL_HISTORY_BROWSE:
            return getSysGroupUpdateHistoryBrowse(lastMsg.value.msgType, content)
          case MsgType.SYS_GROUP_OWNER_TRANSFER:
            return getSysGroupOwnerTransfer(content)
          case MsgType.SYS_GROUP_UPDATE_MEMBER_MUTED:
            return getSysGroupUpdateMemberMuted(content)
          case MsgType.SYS_GROUP_LEAVE:
            return getSysGroupLeave(content)
          case MsgType.SYS_GROUP_DROP:
            return getSysGroupDrop(content)
          case MsgType.GROUP_CHAT:
            return getGroupChatMsgTips(replaceContent)
          default:
            return ''
        }
      } else {
        return replaceContent
      }
    } else {
      return '...'
    }
  }
})

const isShowDraft = computed(() => {
  return !hasBeenSelected.value && sessionInfo.value.draft
})

const isShowUnread = computed(() => {
  if (
    sessionInfo.value.sessionType === MsgType.CHAT &&
    !isShowDraft.value &&
    lastMsg.value?.fromId === myAccount.value &&
    lastMsg.value?.status === msgSendStatus.OK &&
    +sessionInfo.value?.remoteRead < +lastMsgId.value
  ) {
    return true
  } else {
    return false
  }
})

const isShowRead = computed(() => {
  if (
    sessionInfo.value.sessionType === MsgType.CHAT &&
    !isShowDraft.value &&
    lastMsg.value?.fromId === myAccount.value &&
    lastMsg.value?.status === msgSendStatus.OK &&
    +sessionInfo.value?.remoteRead === +lastMsgId.value
  ) {
    return true
  } else {
    return false
  }
})

const isShowUnSend = computed(() => {
  if (
    sessionInfo.value.sessionType === MsgType.CHAT &&
    !isShowDraft.value &&
    lastMsg.value?.fromId === myAccount.value &&
    lastMsg.value?.status === msgSendStatus.FAILED
  ) {
    return true
  } else {
    return false
  }
})

const isShowUnreadCount = computed(() => {
  return sessionInfo.value.unreadCount > 0
})

const onShowUserCard = () => {
  emit('showUserCard', { sessionId: props.sessionId, account: showId.value })
}

const onShowGroupCard = () => {
  if (isNotInGroup.value) {
    ElMessage.warning('您已离开该群或群已被解散')
    return
  }

  emit('showGroupCard', { sessionId: props.sessionId, groupId: showId.value })
}

// 这里有防抖动效果
let timer
const switchTag = (func) => {
  func()
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (top.value === sessionInfo.value.top && dnd.value === sessionInfo.value.dnd) {
      return
    }

    //自己可以自己就处理了，不用交给父组件
    messageData.updateSession({
      sessionId: props.sessionId,
      top: top.value,
      dnd: dnd.value
    })
  }, 300) // 这个时间太长会影响置顶按钮的响应时长
}

const handleSelectedMenuItem = async () => {
  if (hasBeenShowMenu.value && props.selectedMenuItem) {
    switch (props.selectedMenuItem.label) {
      case 'top':
        switchTag(() => {
          top.value = !top.value
        })
        break
      case 'dnd':
        switchTag(() => {
          dnd.value = !dnd.value
        })
        break
      case 'close':
        await msgChatCloseSessionService({ sessionId: props.sessionId })
        if (hasBeenSelected.value) emit('noneSelected') // 如果关闭的session是这个选中的session，需要通知父组件处理
        messageData.deleteSession(props.sessionId)
        router.push({
          path: '/message',
          query: {}
        })
        break
      case 'mark':
        emit('showUpdateMarkDialog') //返回父组件处理：弹窗 + 保存修改
        break
      default:
        break
    }
  }
}

const openSessionMenu = () => {
  emit('openSessionMenu', props.sessionId)
}

defineExpose({
  handleSelectedMenuItem
})
</script>

<template>
  <div class="session-item-wrapper" @contextmenu.prevent="openSessionMenu">
    <div
      class="session-item"
      :class="{ 'bgc-for-active': hasBeenSelected, 'bgc-for-top': top && !hasBeenSelected }"
    >
      <UserAvatarIcon
        v-if="sessionInfo.sessionType === MsgType.CHAT"
        class="avatar-session-item"
        :showName="showName"
        :showId="showId"
        :showAvatarThumb="showAvatarThumb"
        :userStatus="sessionInfo.objectInfo.status"
        @click="onShowUserCard"
      ></UserAvatarIcon>
      <GroupAvatarIcon
        v-else-if="sessionInfo.sessionType === MsgType.GROUP_CHAT"
        :avatarThumb="showAvatarThumb"
        :isValid="!isNotInGroup"
        style="cursor: pointer"
        @click="onShowGroupCard"
      ></GroupAvatarIcon>
      <div class="content-box" @click="emit('isSelected', props.sessionId)">
        <div class="header">
          <div class="title">
            <SessionTag
              v-if="sessionInfo.sessionType === MsgType.GROUP_CHAT"
              tagType="groupchat"
            ></SessionTag>
            <SessionTag v-if="isNotInGroup" tagType="groupleave"></SessionTag>
            <span
              class="showName text-ellipsis"
              :title="sessionInfo.mark ? `${sessionInfo.mark}(${showName})` : showName"
            >
              {{ sessionInfo.mark ? `${sessionInfo.mark}(${showName})` : showName }}
            </span>
            <span
              v-if="sessionInfo.objectInfo.account"
              class="showAccount"
              :title="sessionInfo.objectInfo.account"
            >
              {{ sessionInfo.objectInfo.account }}
            </span>
          </div>
          <div class="datetime">
            <span>{{ showTime }}</span>
          </div>
        </div>
        <div class="body">
          <div class="content">
            <span v-if="isShowUnreadCount" class="unread-count"
              >[{{ sessionInfo.unreadCount > 99 ? '99+' : sessionInfo.unreadCount }}条]</span
            >
            <span v-if="isShowDraft" class="draft">[草稿]</span>
            <span v-else-if="isShowUnread" class="unread-or-read">[未读]</span>
            <span v-else-if="isShowRead" class="unread-or-read">[已读]</span>
            <span v-else-if="isShowUnSend" class="unread-or-read">[未送达]</span>
            <span class="detail text-ellipsis"> {{ showDetailContent }}</span>
          </div>
          <div class="action">
            <el-button
              class="action-button-top"
              :icon="Top"
              :title="top ? '取消置顶' : '置顶'"
              @click.stop="
                switchTag(() => {
                  top = !top
                })
              "
              circle
            />
            <el-button
              class="action-button-dnd"
              :icon="MuteNotification"
              :title="dnd ? '取消免打扰' : '设置免打扰'"
              @click.stop="
                switchTag(() => {
                  dnd = !dnd
                })
              "
              circle
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bgc-for-active {
  background-color: #c6e2ff;
}

.bgc-for-top {
  background-color: #ecf5ff;
}

.session-item {
  height: 60px;
  margin: 1px;
  margin-left: 5px;
  padding: 5px;
  border-radius: 6px;
  padding-right: 0;
  display: flex;
  align-items: center;
  user-select: none;
  position: relative;

  &:hover {
    background-color: #c6e2ff;
  }

  .content-box {
    width: 100%;
    height: 100%;
    margin-left: 10px;
    display: flex;
    justify-content: center;
    flex: 1 1;
    flex-direction: column;
    overflow: hidden;

    .header {
      width: 100%;
      height: 24px;
      margin-bottom: 2px;
      display: flex;
      align-items: center;

      .title {
        line-height: 20px;
        display: flex;
        align-items: center;
        flex: 1 1;
        overflow: hidden;

        .showName {
          font-size: 14px;
          margin-right: 5px;
          flex-shrink: 0;
        }

        .showAccount {
          font-size: 12px;
          margin-right: 5px;
          color: gray;
          white-space: nowrap; /*不换行*/
        }
      }

      .datetime {
        width: 52px;
        font-size: 12px;
        margin-right: 10px;
        color: gray;
        display: flex;
        justify-content: flex-end;
      }
    }

    .body {
      height: 20px;
      display: flex;
      justify-content: space-between;

      .content {
        font-size: 12px;
        display: flex;
        flex: 1 1;
        overflow: hidden;

        .unread-count {
          color: red;
          flex-shrink: 0;
        }

        .draft {
          color: red;
          flex-shrink: 0;
        }

        .unread-or-read {
          color: gray;
          flex-shrink: 0;
        }

        .detail {
          color: gray;
        }
      }

      .action {
        margin-right: 10px;
        display: flex;

        .action-button-top {
          width: 20px;
          height: 20px;
          margin-left: 2px;
          opacity: v-bind('top ? 1: 0');

          &:hover {
            opacity: 1;
            background-color: #409eff;
            color: #fff;
          }
        }

        .action-button-dnd {
          width: 20px;
          height: 20px;
          margin-left: 2px;
          opacity: v-bind('dnd ? 1: 0');

          &:hover {
            opacity: 1;
            background-color: #409eff;
            color: #fff;
          }
        }
      }
    }
  }
}
</style>
