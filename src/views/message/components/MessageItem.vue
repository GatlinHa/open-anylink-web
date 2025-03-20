<script setup>
import { computed, onMounted, h, createApp, watch, nextTick, reactive } from 'vue'
import { ElImage } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { MsgType } from '@/proto/msg'
import { userStore, messageStore, groupStore, groupCardStore, imageStore } from '@/stores'
import { messageSysShowTime, showTimeFormat, jsonParseSafe } from '@/js/utils/common'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { emojis } from '@/js/utils/emojis'
import { msgContentType } from '@/const/msgConst'

const props = defineProps([
  'sessionId',
  'msgId',
  'extend',
  'obj',
  'readMsgId',
  'remoteRead',
  'firstMsgId',
  'lastMsgId',
  'hasNoMoreMsg',
  'isLoadMoreLoading'
])
const emit = defineEmits(['loadMore', 'showUserCard', 'showGroupCard', 'resendMsg', 'loadFinished'])

const userData = userStore()
const messageData = messageStore()
const groupData = groupStore()
const groupCardData = groupCardStore()
const imageData = imageStore()

onMounted(() => {
  rendering()
})

let app = null
const rendering = async () => {
  const msgContent = document.querySelector(`#div-content-${msg.value.msgId}`)
  if (msgContent) {
    if (app) {
      app.unmount()
    }
    const vnode = await renderComponent(msg.value.content)
    app = createApp({
      render: () => vnode
    })
    app.mount(msgContent)
  }
}

/**
 * 动态渲染消息内容
 * @param content 消息内容
 */
const renderComponent = async (content) => {
  const contentJson = jsonParseSafe(content)
  if (!contentJson) {
    return await renderRich(content)
  }

  const type = contentJson['type']
  const value = contentJson['value']
  if (!type || !value) {
    return await renderRich(content)
  }

  switch (type) {
    case msgContentType.RICH:
      return await renderRich(value)
    case msgContentType.TEXT:
      return renderText(value)
    case msgContentType.AUDIO:
      return h('div', [])
    case msgContentType.IMAGE:
      if (value.startsWith('{') && value.endsWith('}')) {
        await imageData.loadImageInfoFromContent(props.sessionId, value)
        return renderImage(value)
      } else {
        return h('span', value)
      }
    case msgContentType.EMOJI:
      if (value.startsWith('[') && value.endsWith(']')) {
        return renderEmoji(value)
      } else {
        return h('span', value)
      }
    case msgContentType.VIDEO:
    default:
      return h('div', [])
  }
}

const renderText = (content) => {
  return h('span', content)
}

const renderRich = async (content) => {
  if (!content) return h('div', [])

  // 如果content存在图片则提前load
  const mathes = content.match(/\{[a-f0-9]+\}/g)
  if (mathes && mathes.length > 0) {
    await imageData.loadImageInfoFromContent(props.sessionId, content)
  }

  let contentArray = []
  //匹配内容中的图片
  content.split(/(\{.*?\})/).forEach((item) => {
    //匹配内容中的表情
    item.split(/(\[.*?\])/).forEach((item) => {
      if (item) {
        contentArray.push(item)
      }
    })
  })

  return contentArray.map((item) => {
    if (item.startsWith('{') && item.endsWith('}')) {
      return renderImage(item)
    } else if (item.startsWith('[') && item.endsWith(']')) {
      return renderEmoji(item)
    } else {
      return h('span', item)
    }
  })
}

const renderEmoji = (content) => {
  const emojiId = `[${content.slice(1, -1)}]`
  const url = emojis[emojiId]
  if (url) {
    return h('img', {
      class: 'emoji',
      src: url,
      alt: emojiId,
      title: content.slice(1, -1),
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', content)
  }
}

const renderImage = (content) => {
  const imgId = content.slice(1, -1)
  const url = imageData.image[imgId]?.thumbUrl
  if (url) {
    const imgIdList = imageData.imageInSession[props.sessionId].sort((a, b) => a - b)
    const srcList = imgIdList.map((item) => imageData.image[item].originUrl)
    return h(ElImage, {
      src: url,
      alt: `{${imgId}}`,
      fit: 'contain',
      previewSrcList: srcList,
      initialIndex: imgIdList.indexOf(imgId),
      infinite: false,
      lazy: true,
      style: {
        maxWidth: '300px',
        maxHeight: '200px',
        width: 'auto',
        height: 'auto'
      },
      onLoad: (e) => {
        const img = e.target
        const ratio = img.naturalWidth / img.naturalHeight
        const maxRatio = 300 / 200 // 最大宽高比

        // 如果图片尺寸在限制范围内，保持原始尺寸
        if (img.naturalWidth <= 300 && img.naturalHeight <= 200) {
          img.style.width = img.naturalWidth + 'px'
          img.style.height = img.naturalHeight + 'px'
        } else if (ratio > maxRatio) {
          // 如果图片更宽，以宽度为基准
          img.style.width = '300px'
          img.style.height = 'auto'
        } else {
          // 如果图片更高，以高度为基准
          img.style.height = '200px'
          img.style.width = 'auto'
        }
        emit('loadFinished')
      }
    })
  } else {
    return h('span', content)
  }
}

const msg = computed(() => {
  return reactive({ ...messageData.getMsg(props.sessionId, props.msgId) })
})

const msgStatus = computed(() => {
  return msg.value.status || 'ok'
})

const isSystemMsg = computed(() => {
  if (
    msg.value.msgType === MsgType.SYS_GROUP_CREATE ||
    msg.value.msgType === MsgType.SYS_GROUP_ADD_MEMBER ||
    msg.value.msgType === MsgType.SYS_GROUP_DEL_MEMBER ||
    msg.value.msgType === MsgType.SYS_GROUP_SET_ADMIN ||
    msg.value.msgType === MsgType.SYS_GROUP_CANCEL_ADMIN ||
    msg.value.msgType === MsgType.SYS_GROUP_SET_ALL_MUTED ||
    msg.value.msgType === MsgType.SYS_GROUP_CANCEL_ALL_MUTED ||
    msg.value.msgType === MsgType.SYS_GROUP_SET_JOIN_APPROVAL ||
    msg.value.msgType === MsgType.SYS_GROUP_CANCEL_JOIN_APPROVAL ||
    msg.value.msgType === MsgType.SYS_GROUP_SET_HISTORY_BROWSE ||
    msg.value.msgType === MsgType.SYS_GROUP_CANCEL_HISTORY_BROWSE ||
    msg.value.msgType === MsgType.SYS_GROUP_OWNER_TRANSFER ||
    msg.value.msgType === MsgType.SYS_GROUP_UPDATE_MEMBER_MUTED ||
    msg.value.msgType === MsgType.SYS_GROUP_LEAVE ||
    msg.value.msgType === MsgType.SYS_GROUP_DROP ||
    msg.value.msgType === MsgType.SYS_GROUP_UPDATE_ANNOUNCEMENT ||
    msg.value.msgType === MsgType.SYS_GROUP_UPDATE_NAME ||
    msg.value.msgType === MsgType.SYS_GROUP_UPDATE_AVATAR
  ) {
    return true
  } else {
    return false
  }
})

const myAccount = computed(() => {
  return userData.user.account
})

const iAmAdmin = computed(() => {
  const groupId = messageData.sessionList[props.sessionId]?.remoteId
  const members = groupData.groupMembersList[groupId]
  if (members) {
    return members[myAccount.value]?.role > 0
  } else {
    return false
  }
})

const getSysCreateGroupMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let membersExcludeCreator = members.filter((item) => item.account !== operator.account)
  let str = ''
  membersExcludeCreator.forEach((item) => {
    str =
      str +
      `<span class="member-nickName" id="${item.account}" style="color: #409eff; cursor: pointer;">${item.nickName}</span>，`
  })

  const modifyGroupNameTips = iAmAdmin.value
    ? `<span class="update-group-name" style="color: #409eff; cursor: pointer;">修改群聊名称</span>`
    : ''
  return (
    `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>` +
    '创建了群聊，并邀请了' +
    str.slice(0, -1) +
    '。' +
    modifyGroupNameTips
  )
}

const getSysGroupAddMemberMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let str = ''
  members.forEach((item) => {
    str =
      str +
      `<span class="member-nickName" id="${item.account}" style="color: #409eff; cursor: pointer;">${item.nickName}</span>，`
  })

  return (
    `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>` +
    '邀请' +
    str.slice(0, -1) +
    '加入了群聊'
  )
}

const getSysGroupDelMemberMsgTips = (content) => {
  const operator = content['operator']
  const members = content['members']
  let str = ''
  members.forEach((item) => {
    str =
      str +
      `<span class="member-nickName" id="${item.account}" style="color: #409eff; cursor: pointer;">${item.nickName}</span>，`
  })
  return (
    `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>` +
    '移出了' +
    str.slice(0, -1)
  )
}

const getSysGroupChangeRoleMsgTips = (msgType, content) => {
  const operator = content['operator']
  const member = content['member']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const memberStr = `<span class="member-nickName" id="${member.account}" style="color: #409eff; cursor: pointer;">${member.nickName}</span>`
  return msgType === MsgType.SYS_GROUP_SET_ADMIN
    ? `${operatorStr}设置了${memberStr}为管理员`
    : `${operatorStr}取消了${memberStr}的管理员权限`
}

const getSysGroupUpdateAllMuted = (msgType, content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  return msgType === MsgType.SYS_GROUP_SET_ALL_MUTED
    ? `${operatorStr}设置了全员禁言`
    : `${operatorStr}取消了全员禁言`
}

const getSysGroupUpdateJoinApproval = (msgType, content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  return msgType === MsgType.SYS_GROUP_SET_JOIN_APPROVAL
    ? `${operatorStr}开启了入群验证`
    : `${operatorStr}关闭了入群验证`
}

const getSysGroupUpdateHistoryBrowse = (msgType, content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  return msgType === MsgType.SYS_GROUP_SET_HISTORY_BROWSE
    ? `${operatorStr}开启了新成员浏览历史记录`
    : `${operatorStr}关闭了新成员浏览历史记录`
}

const getSysGroupOwnerTransfer = (content) => {
  const operator = content['operator']
  const member = content['member']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const memberStr = `<span class="member-nickName" id="${member.account}" style="color: #409eff; cursor: pointer;">${member.nickName}</span>`
  return `${operatorStr}将群主转让给了${memberStr}`
}

const getSysGroupUpdateMemberMuted = (content) => {
  const operator = content['operator']
  const member = content['member']
  const mutedMode = content['mutedMode']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const memberStr = `<span class="member-nickName" id="${member.account}" style="color: #409eff; cursor: pointer;">${member.nickName}</span>`
  const groupId = messageData.sessionList[props.sessionId]?.remoteId
  const allMuted = groupData.groupInfoList[groupId]?.allMuted
  if (allMuted) {
    if (mutedMode === 2) {
      return `${operatorStr}允许了${memberStr}的发言`
    } else {
      return `${operatorStr}禁止了${memberStr}的发言`
    }
  } else {
    if (mutedMode === 1) {
      return `${operatorStr}禁止了${memberStr}的发言`
    } else {
      return `${operatorStr}允许了${memberStr}的发言`
    }
  }
}

const getSysGroupLeave = (content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  return `${operatorStr}离开了群组`
}

const getSysGroupDrop = (content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  return `${operatorStr}解散了群组`
}

const getSysGroupUpdateAnnouncement = (content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const title = `<div style="text-align: center;">${operatorStr}更改了群公告：</div>`
  const announcement = content['announcement']
  const announcementDivs = `
  <div style="width: 100%; min-height: 100px; margin-top: 5px; padding: 5px 10px 5px 10px; border-radius: 10px; border: transparent solid 1px; background-color: #fff">
    <div style="display: flex; justify-content: start; align-items: center; border-bottom: #f0f0f0 solid 1px;">
      <svg
        t="1734959290210"
        class="svg-icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="4307"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        width="30"
        height="30"
        fill="#E6A23C"
      >
        <path d="M874.839 475.363h-152.11c-8.298 0-16.242 3.353-22.07 9.273a31.544 31.544 0 0 0-9.09 22.156v9.798c0 17.302 14.034 31.342 31.247 31.342h152.023c17.216 0 31.161-14.04 31.161-31.342v-9.798a31.543 31.543 0 0 0-9.09-22.156c-5.828-5.92-13.774-9.273-22.071-9.273zM522.15 206.37c-47.318 37.607-146.28 90.312-217.436 141.074h-0.086c-0.798 0.53-1.59 3.353-2.475 3.794-8.384 4.767-12.181 17.747-57.913 17.747h-89.16c-22.955 0-37.081 10.768-37.081 34.96v214.788c0 24.187 12.98 36.106 37.08 36.106h89.515c45.468 0.091 49.175 13.066 57.56 17.747 0.797 0.44 1.59 3.263 2.383 3.793h0.09c69.036 50.762 168.62 107.53 217.523 143.635 14.748 10.858 63.656 29.93 63.656-37.166V240.8c0-67.182-49.353-45.733-63.656-34.43z m140.371 148.135c8.122 14.212 24.101 17.833 35.753 7.944l124.918-105.317c11.742-9.802 14.565-29.312 6.535-43.61l-4.59-8.035c-8.035-14.212-24.102-17.747-35.758-7.945L664.462 302.86c-11.65 9.889-14.565 29.312-6.53 43.611l4.59 8.035zM698.19 661.2c-11.656-9.803-27.635-6.182-35.667 7.944l-4.59 8.03c-8.035 14.217-5.12 33.727 6.53 43.616L789.38 826.196c11.656 9.798 27.635 6.268 35.667-7.944l4.59-8.035c8.035-14.212 5.122-33.727-6.53-43.61L698.189 661.198z" p-id="4308">
        </path>
      </svg>
      <span style="margin-left: 5px; font-weight: bold">群公告</span>
    </div>
    <span style="display: flex; justify-content: start; white-space: pre-wrap; word-wrap: break-word; word-break: break-all;">${announcement}</span>
  </div>
  `
  return title + announcementDivs
}

const getSysGroupUpdateName = (content) => {
  const operator = content['operator']
  const groupName = content['groupName']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const groupNameStr = `<span class="show-group-card" style="color: #409eff; cursor: pointer;">${groupName}</span>`
  return `${operatorStr}更改了群名称：${groupNameStr}`
}

const getSysGroupUpdateAvatar = (content) => {
  const operator = content['operator']
  const operatorStr = `<span class="member-nickName" id="${operator.account}" style="color: #409eff; cursor: pointer;">${operator.nickName}</span>`
  const avatarStr = `<span class="show-group-card" style="color: #409eff; cursor: pointer;">群头像</span>`
  return `${operatorStr}更改了${avatarStr}`
}

const systemMsgContent = computed(() => {
  const content = jsonParseSafe(msg.value.content)
  switch (msg.value.msgType) {
    case MsgType.SYS_GROUP_CREATE:
      return `<div style="text-align: center;">${getSysCreateGroupMsgTips(content)}</div>`
    case MsgType.SYS_GROUP_ADD_MEMBER:
      return `<div style="text-align: center;">${getSysGroupAddMemberMsgTips(content)}</div>`
    case MsgType.SYS_GROUP_DEL_MEMBER:
      return `<div style="text-align: center;">${getSysGroupDelMemberMsgTips(content)}</div>`
    case MsgType.SYS_GROUP_UPDATE_ANNOUNCEMENT:
      return getSysGroupUpdateAnnouncement(content) //更新公告的系统消息需要特殊处理
    case MsgType.SYS_GROUP_UPDATE_NAME:
      return `<div style="text-align: center;">${getSysGroupUpdateName(content)}</div>`
    case MsgType.SYS_GROUP_UPDATE_AVATAR:
      return `<div style="text-align: center;">${getSysGroupUpdateAvatar(content)}</div>`
    case MsgType.SYS_GROUP_SET_ADMIN:
    case MsgType.SYS_GROUP_CANCEL_ADMIN:
      return `<div style="text-align: center;">${getSysGroupChangeRoleMsgTips(
        msg.value.msgType,
        content
      )}</div>`
    case MsgType.SYS_GROUP_SET_ALL_MUTED:
    case MsgType.SYS_GROUP_CANCEL_ALL_MUTED:
      return `<div style="text-align: center;">${getSysGroupUpdateAllMuted(
        msg.value.msgType,
        content
      )}</div>`
    case MsgType.SYS_GROUP_SET_JOIN_APPROVAL:
    case MsgType.SYS_GROUP_CANCEL_JOIN_APPROVAL:
      return `<div style="text-align: center;">${getSysGroupUpdateJoinApproval(
        msg.value.msgType,
        content
      )}</div>`
    case MsgType.SYS_GROUP_SET_HISTORY_BROWSE:
    case MsgType.SYS_GROUP_CANCEL_HISTORY_BROWSE:
      return `<div style="text-align: center;">${getSysGroupUpdateHistoryBrowse(
        msg.value.msgType,
        content
      )}</div>`
    case MsgType.SYS_GROUP_OWNER_TRANSFER:
      return `<div style="text-align: center;">${getSysGroupOwnerTransfer(content)}</div>`
    case MsgType.SYS_GROUP_UPDATE_MEMBER_MUTED:
      return `<div style="text-align: center;">${getSysGroupUpdateMemberMuted(content)}</div>`
    case MsgType.SYS_GROUP_LEAVE:
      return `<div style="text-align: center;">${getSysGroupLeave(content)}</div>`
    case MsgType.SYS_GROUP_DROP:
      return `<div style="text-align: center;">${getSysGroupDrop(content)}</div>`
    default:
      return ''
  }
})

const isChatMsgType = computed(() => {
  return msg.value.msgType === MsgType.CHAT
})

const isGroupChatMsgType = computed(() => {
  return msg.value.msgType === MsgType.GROUP_CHAT
})

const loadMoreTips = computed(() => {
  return props.isLoadMoreLoading ? '' : '查看更多消息'
})

const isUnreadMsg = computed(() => {
  if (!isSystemMsg.value && props.readMsgId < msg.value.msgId && !isSelf.value) {
    return true
  } else {
    return false
  }
})

const myMsgIsRead = computed(() => {
  return isSelf.value && msg.value.msgId <= props.remoteRead
})

const isShowLoadMore = computed(() => {
  // 这里用弱等于"=="，左边是数字，右边是string
  if (msg.value.msgId == props.firstMsgId && !props.hasNoMoreMsg) {
    return true
  } else {
    return false
  }
})
const isShowNoMoreMsg = computed(() => {
  // 这里用弱等于"=="，左边是数字，右边是string
  if (msg.value.msgId == props.firstMsgId && props.hasNoMoreMsg) {
    return true
  } else {
    return false
  }
})
const loadMoreCursor = computed(() => {
  return props.isLoadMoreLoading ? 'auto' : 'pointer'
})

const isSelf = computed(() => {
  return userData.user.account === msg.value.fromId
})

const objectInfo = computed(() => {
  if (msg.value.msgType === MsgType.GROUP_CHAT) {
    const groupId = messageData.sessionList[props.sessionId]?.remoteId
    const members = groupData.groupMembersList[groupId]
    return members ? members[msg.value.fromId] : { account: msg.value.fromId }
  } else {
    if (myAccount.value === msg.value.fromId) {
      return userData.user
    } else {
      return messageData.sessionList[props.sessionId].objectInfo
    }
  }
})

const account = computed(() => {
  return objectInfo.value.account
})

const nickName = computed(() => {
  return objectInfo.value.nickName
})

const avatarThumb = computed(() => {
  return objectInfo.value.avatarThumb
})

const sysShowTime = computed(() => {
  return messageSysShowTime(new Date(msg.value.msgTime))
})

// 判断是否是连续的会话，与上个会话时间差小于5分钟
const isContinuousSession = computed(() => {
  if (!props.extend.preMsgTime) {
    return false
  }

  const diff = new Date(msg.value.msgTime).getTime() - new Date(props.extend.preMsgTime).getTime()
  if (diff < 5 * 60 * 1000) {
    return true
  } else {
    return false
  }
})

const msgTime = computed(() => {
  return showTimeFormat(msg.value.msgTime)
})

const onLoadMore = () => {
  emit('loadMore')
}

const onShowUserCard = () => {
  emit('showUserCard', { sessionId: props.sessionId, account: account.value })
}

const onClickSystemMsg = (e) => {
  if (e.target.className === 'update-group-name') {
    emit('showGroupCard', { groupId: messageData.sessionList[props.sessionId].remoteId })
    setTimeout(() => {
      // 这里要延迟打开，否则会与GroupCard的初始化ShowModel冲突
      groupCardData.setShowModel('editAvatarAndName')
    }, 100)
  } else if (e.target.className === 'member-nickName') {
    emit('showUserCard', { sessionId: props.sessionId, account: e.target.id })
  } else if (e.target.className === 'show-group-card') {
    emit('showGroupCard', { groupId: messageData.sessionList[props.sessionId].remoteId })
  }
}

const onResendMsg = () => {
  emit('resendMsg', msg.value)
}

/**
 * 只要内容发生变化，重新渲染
 */
watch(
  () => msg.value.content,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        rendering()
      })
    }
  }
)
</script>

<template>
  <div class="message-item" :class="{ unreadMsg: isUnreadMsg }">
    <span v-if="isShowNoMoreMsg" class="no-more-message">当前无更多消息</span>
    <div v-if="isShowLoadMore" class="load-more-wrapper">
      <div
        class="load-more"
        v-loading="props.isLoadMoreLoading"
        @click="onLoadMore"
        :style="{ cursor: loadMoreCursor }"
      >
        {{ loadMoreTips }}
      </div>
    </div>
    <el-divider v-if="props.extend.isFirstNew" class="new-messages-tips" content-position="center"
      >以下是新消息</el-divider
    >
    <span v-if="!isContinuousSession" class="datetime">{{ sysShowTime }}</span>
    <div
      v-if="isSystemMsg"
      class="system-message"
      v-html="systemMsgContent"
      @click="onClickSystemMsg"
    ></div>
    <div v-else class="message-container-wrapper">
      <el-container class="el-container-right" v-if="isSelf">
        <el-main class="el-main-right">
          <el-container class="message-content-wrapper">
            <el-header class="message-time">
              <span v-if="isGroupChatMsgType">{{ nickName }}</span>
              <span style="margin-left: 5px">{{ msgTime }}</span>
            </el-header>
            <el-main class="message-content">
              <div
                v-if="msgStatus === 'pending'"
                class="my-message-status my-message-status-pending"
              >
                <div class="loading-circular" v-loading="true"></div>
              </div>
              <div
                v-else-if="msgStatus === 'failed'"
                class="my-message-status my-message-status-failed"
              >
                <el-icon color="red" title="点击重发" @click="onResendMsg"
                  ><WarningFilled
                /></el-icon>
              </div>
              <div v-else-if="isChatMsgType" class="my-message-status">
                <div v-if="myMsgIsRead" class="remote_read"></div>
                <div v-else class="remote_unread"></div>
              </div>
              <div class="div-content" :id="`div-content-${msg.msgId}`">内容加载中...</div>
            </el-main>
          </el-container>
        </el-main>
        <el-aside class="el-aside-right">
          <UserAvatarIcon
            class="avatar-message-item"
            :showId="account"
            :showName="nickName"
            :showAvatarThumb="avatarThumb"
            @click="onShowUserCard"
          ></UserAvatarIcon>
        </el-aside>
      </el-container>

      <el-container class="el-container-left" v-else>
        <el-aside class="el-aside-left">
          <UserAvatarIcon
            class="avatar-message-item"
            :showId="account"
            :showName="nickName"
            :showAvatarThumb="avatarThumb"
            @click="onShowUserCard"
          ></UserAvatarIcon>
        </el-aside>
        <el-main class="el-main-left">
          <el-container class="message-content-wrapper">
            <el-header class="message-time">
              <span v-if="isGroupChatMsgType" style="margin-right: 5px">{{ nickName }}</span>
              <span>{{ msgTime }}</span>
            </el-header>
            <el-main class="message-content">
              <div class="div-content" :id="`div-content-${msg.msgId}`">内容加载中...</div>
            </el-main>
          </el-container>
        </el-main>
      </el-container>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-item {
  width: 100%;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .no-more-message {
    width: 100%;
    height: 30px;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: gray;
    user-select: text;
  }

  .load-more-wrapper {
    width: 100%;
    height: 30px;
    padding: 10px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    .load-more {
      color: #409eff;
      font-size: 14px;
    }

    :deep(.circular) {
      width: 24px;
      height: 24px;
      position: absolute;
      top: 12px;
      left: -12px;
    }
  }

  .new-messages-tips {
    width: 40%;
    user-select: text;
    :deep(.el-divider__text) {
      background-color: #f5f5f5;
      font-size: 14px;
      font-weight: normal;
      color: gray;
      white-space: nowrap;
    }
  }

  .datetime {
    border-radius: 2px;
    padding-left: 5px;
    padding-right: 5px;
    font-size: 12px;
    background-color: #c8c9cc;
    color: white;
    user-select: text;
  }

  .system-message {
    max-width: 600px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
    color: gray;
    user-select: text;
  }

  .message-container-wrapper {
    width: 100%;
    margin-top: 10px;
    margin-bottom: 10px;

    .el-container-right {
      width: 100%;
      display: flex;

      .el-aside-right {
        width: auto;
        margin-top: 5px;
        display: flex;
      }
      .el-main-right {
        padding: 0;
        display: flex;

        .message-content-wrapper {
          margin-right: 10px;

          .message-time {
            height: auto;
            padding: 0;
            font-size: 12px;
            color: gray;
            user-select: text;
            text-align: end;
          }

          .message-content {
            margin-top: 5px;
            padding: 0;
            display: flex;
            justify-content: right;

            .div-content {
              max-width: 500px;
              padding: 8px;
              font-size: 14px;
              background-color: #c6e2ff;
              border-radius: 10px;
              border-top-right-radius: 0;
              user-select: text;
              white-space: pre-wrap;
            }

            .my-message-status {
              margin-right: 5px;
              display: flex;
              align-items: end;
            }

            .my-message-status-pending {
              width: 16px;
              position: relative;
              .loading-circular {
                bottom: 4px;
                :deep(.circular) {
                  width: 16px;
                  height: 16px;
                }
              }
            }

            .my-message-status-failed {
              .el-icon {
                &:hover {
                  cursor: pointer;
                }
              }
            }

            .remote_read {
              width: 10px;
              height: 10px;
              background-color: #95d475;
              border-radius: 50%;
            }

            .remote_unread {
              width: 10px;
              height: 10px;
              background-color: #eebe77;
              border-radius: 50%;
            }
          }
        }
      }
    }

    .el-container-left {
      width: 100%;
      display: flex;

      .el-aside-left {
        width: auto;
        margin-top: 5px;
        display: flex;
      }
      .el-main-left {
        padding: 0;
        display: flex;

        .message-content-wrapper {
          margin-left: 10px;

          .message-time {
            height: auto;
            padding: 0;
            font-size: 12px;
            color: gray;
            user-select: text;
          }

          .message-content {
            margin-top: 5px;
            padding: 0;
            display: flex;
            justify-content: left;

            .div-content {
              max-width: 500px;
              padding: 8px;
              font-size: 14px;
              background-color: #dedfe0;
              border-radius: 10px;
              border-top-left-radius: 0;
              user-select: text;
              white-space: pre-wrap;
            }
          }
        }
      }
    }
  }
}

.el-container {
  width: 100%;
  display: flex;
}
</style>
