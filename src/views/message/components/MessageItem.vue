<script setup>
import { ref, computed, onMounted, h, createApp, watch, nextTick } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { MsgType } from '@/proto/msg'
import {
  useUserStore,
  useMessageStore,
  useGroupStore,
  useGroupCardStore,
  useImageStore,
  useAudioStore,
  useVideoStore,
  useDocumentStore
} from '@/stores'
import { messageSysShowTime, showTimeFormat, jsonParseSafe } from '@/js/utils/common'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { emojis } from '@/js/utils/emojis'
import { MSG_REEDIT_TIME_LIMIT, msgContentType, msgSendStatus } from '@/const/msgConst'
import MsgBoxRecording from '@/views/message/components/MsgBoxRecording.vue'
import MsgBoxImage from '@/views/message/components/MsgBoxImage.vue'
import MsgBoxAudio from '@/views/message/components/MsgBoxAudio.vue'
import MsgBoxVideo from '@/views/message/components/MsgBoxVideo.vue'
import MsgBoxDocument from '@/views/message/components/MsgBoxDocument.vue'
import MenuMsgItem from '@/views/message/components/MenuMsgItem.vue'
import { ElMessage } from 'element-plus'
import {
  msgChatDeleteMsgService,
  msgChatQueryMessagesService,
  msgChatRevokeMsgService
} from '@/api/message'
import DialogForMsgForward from '@/views/message/components/DialogForMsgForward.vue'
import { showSimplifyMsgContent } from '@/js/utils/message'

const props = defineProps([
  'sessionId',
  'msgKey',
  'extend',
  'obj',
  'readMsgId',
  'remoteRead',
  'firstMsgId',
  'lastMsgId',
  'hasNoMoreMsg',
  'isLoadMoreLoading',
  'inputEditorRef',
  'isMultiSelect',
  'isSelected'
])
const emit = defineEmits([
  'loadMore',
  'showUserCard',
  'showGroupCard',
  'resendMsg',
  'loadFinished',
  'showHighlight',
  'forwardMsg',
  'select'
])

const userData = useUserStore()
const messageData = useMessageStore()
const groupData = useGroupStore()
const groupCardData = useGroupCardStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()

const forwardMsgs = ref([])
const quoteMsg = ref({})

onMounted(async () => {
  await loadRelatedMsg()
  rendering()
})

/**
 * 加载和本消息相关的消息：引用消息，合并转发消息
 */
const loadRelatedMsg = async () => {
  const arr = jsonParseSafe(msg.value.content)
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return
  }

  for (const item of arr) {
    if (item.type === msgContentType.QUOTE) {
      // 先从本地消息缓存中获取
      const msg = messageData.getMsg(props.sessionId, item.value.msgId)
      if (!msg.msgId) {
        // 如果本地消息缓存中没有，再去服务器查询
        const res = await msgChatQueryMessagesService({
          sessionId: props.sessionId,
          msgIds: item.value.msgId
        })

        if (res.data.data && res.data.data.length > 0) {
          quoteMsg.value = res.data.data[0]
        }
      } else {
        quoteMsg.value = msg
      }
    } else if (item.type === msgContentType.FORWARD) {
      const forwatdMsgIds = item.value.data.map((item) => item.msgId)

      const toQueryMsgIds = []
      for (const msgId of forwatdMsgIds) {
        // 先从本地消息缓存中获取
        const msg = messageData.getMsg(props.sessionId, msgId)
        if (!msg.msgId) {
          // 如果本地消息缓存中没有，再去服务器查询
          toQueryMsgIds.push(msgId)
        } else {
          forwardMsgs.value.push(msg)
        }
      }

      if (toQueryMsgIds.length > 0) {
        const res = await msgChatQueryMessagesService({
          sessionId: item.value.sessionId,
          msgIds: toQueryMsgIds.join(',')
        })
        res.data.data.forEach((item) => {
          forwardMsgs.value.push(item)
        })
      }
    }
  }
}

let app = null
const rendering = () => {
  const msgContent = document.querySelector(`#div-content-${msg.value.msgId}`)
  if (msgContent) {
    if (app) {
      app.unmount()
    }
    const vnode = renderComponent(msg.value.content)
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
const renderComponent = (content) => {
  const arr = jsonParseSafe(content)

  // 不允许非结构化的content
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return h('span', '')
  }

  return arr.map((item) => {
    if (!item.type || !item.value) {
      return h('span', '')
    }

    switch (item.type) {
      case msgContentType.TEXT:
        return renderText(item.value)
      case msgContentType.EMOJI:
        return renderEmoji(item.value)
      case msgContentType.SCREENSHOT:
        return renderImage(item.value, true)
      case msgContentType.AT:
        return renderAt(item.value)
      case msgContentType.QUOTE:
        return renderQuote(item.value)

      case msgContentType.IMAGE:
        return renderImage(item.value)
      case msgContentType.RECORDING:
        return renderRecording(item.value)
      case msgContentType.AUDIO:
        return renderAudio(item.value)
      case msgContentType.VIDEO:
        return renderVideo(item.value)
      case msgContentType.DOCUMENT:
        return renderDocument(item.value)
      case msgContentType.FORWARD:
        return renderForwardTogether(item.value)
      default:
        return h('span', content)
    }
  })
}

const renderText = (text) => {
  return h('span', text)
}

const renderQuote = (quoteContent) => {
  const { nickName, msgId } = quoteContent
  return h(
    // 和InputEditor.vue中的结构保持一致，使用相同class可以复用样式
    'div',
    {
      class: 'quote-block',
      style: { cursor: 'pointer' },
      onClick: () => {
        emit('showHighlight', msgId)
      }
    },
    h(
      'div',
      {
        class: 'quote-wrapper'
      },
      [
        h('div', { class: 'quote-sender' }, [
          h('span', { class: 'quote-nickName' }, nickName + '  '),
          h('span', { class: 'quote-msgTime' }, showTimeFormat(quoteMsg.value.msgTime) + '：')
        ]),
        h('span', { class: 'quote-content' }, showSimplifyMsgContent(quoteMsg.value.content))
      ]
    )
  )
}

const renderForwardTogether = (forwardContent) => {
  if (!forwardMsgs.value || forwardMsgs.value.length == 0) {
    return h('span', '')
  }

  // 把content.data(取里面的nickName) 和 msgs合一
  const newMsgs = {}
  forwardMsgs.value.forEach((item) => {
    newMsgs[item.msgId] = item
  })
  forwardContent.data.forEach((item) => {
    if (item.msgId in newMsgs) {
      newMsgs[item.msgId] = {
        ...newMsgs[item.msgId],
        ...item
      }
    }
  })

  const msgsSorted = Object.values(newMsgs).sort((a, b) => {
    const timeA = new Date(a.sendTime || a.msgTime).getTime()
    const timeB = new Date(b.sendTime || b.msgTime).getTime()
    return timeA - timeB
  })

  const title =
    (forwardMsgs.value[0].msgType === MsgType.GROUP_CHAT ? '群聊' : nickNameFromMsg.value) +
    '的聊天记录'

  return h(
    'div',
    {
      class: 'forward-together',
      onVnodeMounted: () => {
        emit('loadFinished')
      },
      onClick: () => {
        // 创建挂载容器
        const container = document.createElement('div')
        document.body.appendChild(container)
        const app = createApp({
          render: () => {
            return h(DialogForMsgForward, {
              isShow: true,
              title,
              sessionId: msgsSorted[0].sessionId,
              msgs: msgsSorted,
              onClose: () => {
                app.unmount()
                document.body.removeChild(container)
              }
            })
          }
        })
        // 挂载到新创建的容器
        app.mount(container)
      }
    },
    [
      h('div', { class: 'main' }, [
        h('span', { class: 'title' }, title),
        h(
          'div',
          { class: 'msg-list' },
          msgsSorted.map((msg, index) => {
            return h('div', { class: 'msg-item', key: index }, [
              h('span', { class: 'msg-item-nickname' }, msg.nickName || msg.fromId),
              h('span', '：'),
              h('span', { class: 'msg-item-content' }, showSimplifyMsgContent(msg.content))
            ])
          })
        )
      ]),
      h('span', { class: 'footer bdr-t' }, `查看${msgsSorted.length}条转发消息`)
    ]
  )
}

const renderAt = (atContent) => {
  const style = {
    color: '#337ECC',
    fontWeight:
      atContent.account === myAccount.value || atContent.account === '0' ? 'bold' : 'normal'
  }
  return h('span', { style }, `@${atContent.nickName} `)
}

const renderEmoji = (emojiId) => {
  const url = emojis[emojiId]
  if (url) {
    return h('img', {
      class: 'emoji',
      src: url,
      alt: emojiId,
      title: emojiId.slice(1, -1),
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', emojiId)
  }
}

const renderVideo = (videoId) => {
  const url = videoData.video[videoId]?.downloadUrl
  if (url) {
    return h(MsgBoxVideo, {
      msgId: msg.value.msgId,
      videoId,
      url,
      fileName: videoData.video[videoId].fileName,
      size: videoData.video[videoId].size,
      width: videoData.video[videoId].width,
      height: videoData.video[videoId].height,
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', `[${videoId}]`)
  }
}

const renderImage = (imgId, isScreenShot = false) => {
  if (imageData.image[imgId]) {
    // 只要这里渲染，就收集该session下的所有image，用于preview-src-list
    imageData.setImageInSession(props.sessionId, imageData.image[imgId])
    return h(MsgBoxImage, {
      sessionId: props.sessionId,
      imgId,
      isScreenShot,
      thumbWidth: imageData.image[imgId].thumbWidth,
      thumbHeight: imageData.image[imgId].thumbHeight,
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', `[${imgId}]`)
  }
}

const renderRecording = (audioId) => {
  const url = audioData.audio[audioId]?.downloadUrl
  const duration = audioData.audio[audioId]?.duration
  if (url) {
    return h(MsgBoxRecording, {
      audioUrl: url,
      duration: duration,
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', '[语音]')
  }
}

const renderAudio = (audioId) => {
  const url = audioData.audio[audioId]?.downloadUrl
  if (url) {
    return h(MsgBoxAudio, {
      url,
      fileName: audioData.audio[audioId].fileName,
      size: audioData.audio[audioId].size,
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', `[${audioId}]`)
  }
}

const renderDocument = (documentId) => {
  const url = documentData.document[documentId]?.downloadUrl
  if (url) {
    return h(MsgBoxDocument, {
      url,
      fileName: documentData.document[documentId].fileName,
      fileSize: documentData.document[documentId].size,
      contentType: documentData.document[documentId].documentType,
      onLoad: () => {
        emit('loadFinished')
      }
    })
  } else {
    return h('span', `[${documentId}]`)
  }
}

const msg = computed(() => {
  return messageData.getMsg(props.sessionId, props.msgKey)
})

const msgStatus = computed(() => {
  return msg.value.status || msgSendStatus.OK
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

const nickNameFromMsg = computed(() => {
  if (isGroupChatMsgType.value) {
    const groupId = messageData.sessionList[props.sessionId]?.remoteId
    const members = groupData.groupMembersList[groupId]
    if (members) {
      return members[msg.value.fromId].nickName
    } else {
      return ''
    }
  } else {
    return objectInfoFromMsg.value.nickName
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

const isNotInGroup = computed(() => {
  const session = messageData.sessionList[props.sessionId]
  return session.sessionType === MsgType.GROUP_CHAT && session.leave
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

const objectInfoFromMsg = computed(() => {
  if (isGroupChatMsgType.value) {
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
  return objectInfoFromMsg.value.account
})

const nickName = computed(() => {
  return objectInfoFromMsg.value.nickName
})

const avatarThumb = computed(() => {
  return objectInfoFromMsg.value.avatarThumb
})

const sysShowTime = computed(() => {
  return messageSysShowTime(new Date(msg.value.msgTime))
})

const isRevoke = computed(() => {
  return msg.value.revoke
})

const isDelete = computed(() => {
  return msg.value.delete
})

/**
 * 是否支持撤回重新编辑
 */
const isReedit = computed(() => {
  const type = msg.value.contentType
  if (
    type === msgContentType.IMAGE ||
    type === msgContentType.RECORDING ||
    type === msgContentType.AUDIO ||
    type === msgContentType.VIDEO ||
    type === msgContentType.DOCUMENT
  ) {
    return false
  } else {
    return true
  }
})

const isReeditTimeOut = ref(true)

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
  if (msg.value.status === msgSendStatus.FAILED) {
    emit('resendMsg', msg.value)
  }
}

const onSelectMenuMsgItem = async (label) => {
  switch (label) {
    case 'copy':
      try {
        let text = ''
        const arr = jsonParseSafe(msg.value.content)
        if (arr && Array.isArray(arr)) {
          for (const item of arr) {
            if (item.type === msgContentType.TEXT) {
              text += item.value
            }
          }
        }

        const clipboardItem = new ClipboardItem({
          'text/html': new Blob(
            [`<div data-quill-custom=${encodeURIComponent(msg.value.content)}></div>`],
            {
              type: 'text/html'
            }
          ), // 在html自定义属性data-quill-custom中传递clipboardContent结构化数据
          'text/plain': new Blob([text], { type: 'text/plain' }) // 纯文本
        })

        try {
          await navigator.clipboard.write([clipboardItem])
        } catch (error) {
          await navigator.clipboard.writeText(text) // 降级方案：仅写入纯文本
        }
        ElMessage.success('已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制出错 ', error)
      }
      break
    case 'revoke':
      if (!isNotInGroup.value) {
        msgChatRevokeMsgService({
          sessionId: props.sessionId,
          revokeMsgId: msg.value.msgId, // 服务器上撤销用msg.value.msgId
          isGroupChat: isGroupChatMsgType.value,
          remoteId: messageData.sessionList[props.sessionId].remoteId
        })
          .then((res) => {
            if (res.data.code === 0) {
              // 本地撤销用props.msgKey，因为key有可能是发送消息时产生的本地UUID
              messageData.revokeMsgRcord(props.sessionId, props.msgKey)
              isReeditTimeOut.value = false
              setTimeout(() => {
                isReeditTimeOut.value = true
              }, MSG_REEDIT_TIME_LIMIT)
              ElMessage.success('消息已撤回')
            }
          })
          .catch((error) => {
            console.error(error)
          })
      } else {
        ElMessage.warning('您已离开该群或群已被解散')
      }
      break
    case 'delete':
      if (msgStatus.value !== msgSendStatus.OK) {
        // 本地删除用props.msgKey，因为key有可能是发送消息时产生的本地UUID
        messageData.removeMsgRecord(props.sessionId, props.msgKey)
        ElMessage.success('消息已删除')
      } else {
        msgChatDeleteMsgService({
          sessionId: props.sessionId,
          deleteMsgIds: [msg.value.msgId] // 服务器上删除用msg.value.msgId
        })
          .then((res) => {
            if (res.data.code === 0) {
              // 本地删除用props.msgKey，因为key有可能是发送消息时产生的本地UUID
              messageData.removeMsgRecord(props.sessionId, props.msgKey)
              ElMessage.success('消息已删除')
            }
          })
          .catch((error) => {
            console.error(error)
          })
      }
      break
    case 'quote':
      // 非输入框模式无法引用
      props.inputEditorRef?.insertQuote({
        account: msg.value.fromId,
        nickName: nickNameFromMsg.value,
        msgKey: props.msgKey, // 引用本地缓存消息的时候用
        msgId: msg.value.msgId, // 引用要用msg.value.msgId
        content: msg.value.content,
        msgTime: msg.value.msgTime
      })
      break
    case 'forward':
      emit('forwardMsg', props.msgKey)
      break
    case 'multiSelect':
      emit('select', props.msgKey, true)
      break
    default:
      break
  }
}

const handleReedit = () => {
  // 非输入框模式无法重新编辑
  props.inputEditorRef?.reeditFromRevoke(msg.value.content)
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

/**
 * 哪些情况在多选模式下是禁选的
 */
const multiSelectOptionDisabled = computed(() => {
  return (
    msg.value.contentType === msgContentType.RECORDING ||
    isSystemMsg.value ||
    isRevoke.value ||
    isDelete.value ||
    msgStatus.value !== msgSendStatus.OK
  )
})

const handleItemClick = () => {
  if (props.isMultiSelect && !multiSelectOptionDisabled.value) {
    emit('select', props.msgKey, !props.isSelected)
  }
}
</script>

<template>
  <div
    class="message-item-wrapper"
    :class="{
      'multi-select-mode': props.isMultiSelect,
      'is-selected': props.isSelected,
      'is-valid-option': props.isMultiSelect && !multiSelectOptionDisabled
    }"
    @click="handleItemClick"
  >
    <div v-if="props.isMultiSelect" class="message-checkbox">
      <el-checkbox
        :model-value="props.isSelected"
        :disabled="multiSelectOptionDisabled"
        @update:model-value="handleItemClick"
        @click.stop
      />
    </div>
    <div
      class="message-item"
      :data-msg-key="props.msgKey"
      :data-disabled="multiSelectOptionDisabled"
      :class="{ unreadMsg: isUnreadMsg }"
    >
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
      <div v-else-if="!isSystemMsg && isRevoke" class="revoke-delete">
        <div v-if="isSelf">
          <span>你撤回了一条消息</span>
          <span
            v-if="isReedit && !isReeditTimeOut"
            style="margin-left: 2px; color: #409eff; cursor: pointer"
            @click="handleReedit"
          >
            重新编辑
          </span>
        </div>
        <div v-else>
          <div v-if="isChatMsgType">对方撤回了一条消息</div>
          <div v-else>{{ `“${objectInfoFromMsg.nickName}”撤回了一条消息` }}</div>
        </div>
      </div>
      <div v-else-if="!isSystemMsg && isDelete" class="revoke-delete">
        <span>消息已删除</span>
      </div>
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
                  v-if="msgStatus === msgSendStatus.PENDING"
                  class="my-message-status my-message-status-pending"
                >
                  <div class="loading-circular" v-loading="true"></div>
                </div>
                <div
                  v-else-if="
                    msgStatus === msgSendStatus.FAILED || msgStatus === msgSendStatus.UPLOAD_FAILED
                  "
                  class="my-message-status my-message-status-failed"
                >
                  <el-icon
                    color="red"
                    :title="msgStatus === msgSendStatus.FAILED ? '点击重发' : ''"
                    @click="onResendMsg"
                    ><WarningFilled
                  /></el-icon>
                </div>
                <div v-else-if="isChatMsgType" class="my-message-status">
                  <div v-if="myMsgIsRead" class="remote_read"></div>
                  <div v-else class="remote_unread"></div>
                </div>
                <MenuMsgItem :msg="msg" @selectMenu="onSelectMenuMsgItem">
                  <div class="div-content" :id="`div-content-${msg.msgId}`"></div>
                </MenuMsgItem>
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
                <MenuMsgItem :msg="msg" @selectMenu="onSelectMenuMsgItem">
                  <div class="div-content" :id="`div-content-${msg.msgId}`"></div>
                </MenuMsgItem>
              </el-main>
            </el-container>
          </el-main>
        </el-container>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-item-wrapper {
  position: relative;
  padding-left: 8px;
  border-radius: 5px;
  transition: background-color 0.3s;

  &.multi-select-mode {
    padding-left: 32px;
  }

  &.is-selected {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.is-valid-option {
    cursor: pointer;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }

  .message-checkbox {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }
}

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
    margin-top: 10px;
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

  .revoke-delete {
    padding: 2px 4px 2px 4px;
    margin-top: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    font-size: 14px;
    color: gray;
    background-color: #fff;
  }

  .message-container-wrapper {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;

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
              // white-space: pre-wrap;
              // word-break: break-word; /* 长单词或URL强制换行 */
              // overflow-wrap: break-word; /* 兼容性更好的换行 */
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
              // white-space: pre-wrap;
              // word-break: break-word; /* 长单词或URL强制换行 */
              // overflow-wrap: break-word; /* 兼容性更好的换行 */
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

// h函数中动态生成的组件，这里的样式需要用deep穿透
:deep(.forward-together) {
  width: 240px;

  padding: 8px;
  border-radius: 4px;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 5px;

    .msg-list {
      max-height: 72px;
      color: gray;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .msg-item {
        display: flex;
        font-size: 12px;

        .msg-item-nickname {
          max-width: 80px;
          white-space: nowrap; //防止文本自动换行，确保在一行内显示，这样当文本超出宽度时才会触发省略号
          overflow: hidden; //当文本超出元素范围时，隐藏超出的部分。
          text-overflow: ellipsis; //在文本溢出并且overflow属性设置为hidden时，显示省略号。
        }

        .msg-item-content {
          flex: 1;
          white-space: nowrap; //防止文本自动换行，确保在一行内显示，这样当文本超出宽度时才会触发省略号
          overflow: hidden; //当文本超出元素范围时，隐藏超出的部分。
          text-overflow: ellipsis; //在文本溢出并且overflow属性设置为hidden时，显示省略号。
        }
      }
    }
  }

  .footer {
    font-size: 12px;
    color: gray;
  }
}
</style>
