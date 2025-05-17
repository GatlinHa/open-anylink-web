eslint-disable prettier/prettier
<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import {
  Phone,
  VideoCamera,
  MoreFilled,
  CirclePlus,
  ArrowDownBold,
  ArrowUp
} from '@element-plus/icons-vue'
import { v4 as uuidv4 } from 'uuid'
import DragLine from '@/components/common/DragLine.vue'
import SearchBox from '@/components/search/SearchBox.vue'
import AddButton from '@/components/common/AddButton.vue'
import SessionItem from '@/views/message/components/SessionItem.vue'
import InputToolBar from '@/views/message/components/InputToolBar.vue'
import InputEditor from '@/views/message/components/InputEditor.vue'
import MessageItem from '@/views/message/components/MessageItem.vue'
import SessionTag from '@/views/message/components/SessionTag.vue'
import SelectUserDialog from '@/components/common/SelectUserDialog.vue'
import SelectSessionDialog from '@/components/common/SelectSessionDialog.vue'
import {
  useUserStore,
  useSettingStore,
  useMessageStore,
  useUserCardStore,
  useGroupCardStore,
  useGroupStore,
  useImageStore
} from '@/stores'
import backgroupImage from '@/assets/svg/messagebx_bg.svg'
import {
  msgChatPullMsgService,
  msgChatCreateSessionService,
  msgChatQuerySessionService,
  msgChatDeleteMsgService
} from '@/api/message'
import { groupInfoService, groupCreateService } from '@/api/group'
import { MsgType } from '@/proto/msg'
import wsConnect from '@/js/websocket/wsConnect'
import { onReceiveChatMsg, onReceiveGroupChatMsg, onReceiveGroupSystemMsg } from '@/js/event'
import { userQueryService } from '@/api/user'
import { ElLoading, ElMessage } from 'element-plus'
import { el_loading_options } from '@/const/commonConst'
import { combineId, jsonParseSafe, sessionIdConvert } from '@/js/utils/common'
import MenuSession from '@/views/message/components/MenuSession.vue'
import router from '@/router'
import { BEGIN_MSG_ID, msgContentType, msgSendStatus } from '@/const/msgConst'
import EditDialog from '@/components/common/EditDialog.vue'
import MenuAddOpr from '@/views/message/components/MenuAddOpr.vue'
import MenuMsgMain from '@/views/message/components/MenuMsgMain.vue'
import MessageGroupRightSide from '@/views/message/components/MessageGroupRightSide.vue'
import HashNoData from '@/components/common/HasNoData.vue'
import InputRecorder from '@/views/message/components/InputRecorder.vue'
import InputMultiSelect from '@/views/message/components/InputMultiSelect.vue'
import { playMsgSend } from '@/js/utils/audio'

const userData = useUserStore()
const settingData = useSettingStore()
const messageData = useMessageStore()
const userCardData = useUserCardStore()
const groupCardData = useGroupCardStore()
const groupData = useGroupStore()
const imageData = useImageStore()
const sessionListRef = ref()

const asideWidth = ref(0)
const asideWidthMin = 200
const asideWidthMax = 500

const inputBoxHeight = ref(0)
const inputBoxHeightMin = 200
const inputBoxHeightMax = 500

const msgListDiv = ref()
const disToBottom = ref(0)
const nearBottomDis = 50
const newMsgTips = ref({
  isShowTopTips: false,
  isShowBottomTips: false,
  unreadCount: 0,
  firstElement: null
})

const inputToolBarRef = ref()

const myAccount = computed(() => {
  return userData.user.account
})

//当前被选中的session
const selectedSessionId = computed(() => {
  return messageData.selectedSessionId || ''
})

const readAtMsgIds = ref([]) //已读的at消息的msgId
const highlightedMsgIds = ref(new Set()) //需要高亮的msgId
const unreadAtRecords = computed(() => {
  let atRecords = messageData.atRecordsList[selectedSessionId.value] || []
  if (selectedSession.value.sessionType === MsgType.GROUP_CHAT && atRecords) {
    atRecords = atRecords
      .filter(
        (item) =>
          lastReadMsgId.value > 0 &&
          item.referMsgId > lastReadMsgId.value &&
          !readAtMsgIds.value.includes(item.msgId)
      )
      .sort((a, b) => a.msgId - b.msgId)
  }

  if (atRecords.length === 1 && groupMembers.value) {
    atRecords[0] = {
      ...atRecords[0],
      nickName: groupMembers.value[atRecords[0].fromId].nickName
    }
  }

  return atRecords
})

const handleShowHighlight = (msgId) => {
  let targetKey = msgId
  let element = document.querySelector(
    `#message-item-${sessionIdConvert(selectedSessionId.value)}-${msgId}`
  ) // 先拿msgId定位到元素，如果不行再用msgKey
  if (!element) {
    // 用msgId逆向找msgKey
    for (const msgKey of msgKeysShow.value) {
      const msg = messageData.getMsg(selectedSessionId.value, msgKey)
      if (msg.msgId == msgId) {
        targetKey = msgKey
        element = document.querySelector(
          `#message-item-${sessionIdConvert(selectedSessionId.value)}-${msgKey}`
        )
        break
      }
    }

    if (!element) {
      ElMessage.success('请加载更多消息后查找')
      return
    }
  }

  const msgListRect = msgListDiv.value.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  // 判断 element 是否在 msgListDiv 的视口内
  const isInViewport = rect.top >= msgListRect.top && rect.bottom <= msgListRect.bottom
  if (!isInViewport) {
    nextTick(() => {
      msgListDiv.value.scrollTo({
        top: msgListDiv.value.scrollTop - (msgListRect.top - rect.top),
        behavior: 'smooth'
      })
    })
  }
  highlightedMsgIds.value.add(targetKey + '')
  setTimeout(() => {
    highlightedMsgIds.value.delete(targetKey + '')
  }, 2000)
}

const handleReadAt = () => {
  const len = unreadAtRecords.value.length
  if (len === 0) return

  const readReferMsgId = unreadAtRecords.value[len - 1].referMsgId
  handleShowHighlight(readReferMsgId)
  readAtMsgIds.value.push(unreadAtRecords.value[len - 1].msgId)
}

const handleReadAllAt = () => {
  const len = unreadAtRecords.value.length
  if (len === 0) return

  unreadAtRecords.value.forEach((item) => {
    readAtMsgIds.value.push(item.msgId)
  })
}

// 消息拉取是否结束
const pullMsgDone = computed(() => {
  return selectedSession.value.pullMsgDone || false
})

const msgKeySortedArray = computed(() => {
  return messageData.msgKeySortedArray[selectedSessionId.value]
})

// 缓存的消息列表是否为空，注意和hasNoMoreMsg的区别
const noMsg = computed(() => {
  return msgKeySortedArray.value?.length === 0
})
// 当前session的第一条消息ID
const firstMsgId = computed(() => {
  if (!noMsg.value) {
    return msgKeySortedArray.value[0]
  } else {
    return 0
  }
})
// 当前session的最后一条消息ID
const lastMsgId = computed(() => {
  if (!noMsg.value && msgKeySortedArray.value && msgKeySortedArray.value.length > 0) {
    // msgKeySortedArray有序数组最后一个对应的msgid
    const key = msgKeySortedArray.value.at(-1)
    const lastMsg = messageData.getMsg(selectedSessionId.value, key)
    return lastMsg.msgId
  } else {
    return 0
  }
})

// 是否是没有更多消息了：从服务器拉取结束了，或者firstMsgId是BEGIN_MSG_ID
const hasNoMoreMsg = computed(() => {
  return pullMsgDone.value || firstMsgId.value === BEGIN_MSG_ID
})

const groupMembers = computed(() => {
  return groupData.groupMembersList[selectedSession.value?.remoteId]
})

const isNotInGroup = computed(() => {
  return selectedSession.value.sessionType === MsgType.GROUP_CHAT && selectedSession.value.leave
})

const isMutedInGroup = computed(() => {
  if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
    const groupInfo = groupData.groupInfoList[selectedSession.value.remoteId]
    const me = groupMembers.value[myAccount.value]
    if (me.mutedMode === 1 || (groupInfo.allMuted && me.mutedMode !== 2)) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
})

const isShowReturnBottom = ref(false)

// 留在该页面上的session状态缓存，例如：
//  isLoading: 正在加载数据，解释：会话首次被打开时开场加载数据的loading场景
//  isLoadMoreLoading: 是否加载更多中，解释：会话被打开后，向上移动滚轮到顶出现“加载更多”字样，继续滚动或者点击的loading场景
// 这些数据不能放在messageData，因为这个cache会随页面消亡而清除数据，重新回到页面后使用初始默认数据即可
// 数据格式示例：{'sessionId_xxx': {isLoadMoreLoading: false, isLoading: false}}
// 触发选中session事件后，才会给这个数据里面插入被选中session状态的缓存
const selectedSessionCache = ref({})

const capacity = ref(15) //TODO 现在是调试值
const step = 15 //TODO 现在是调试值
const startIndex = computed(() => {
  if (selectedSessionId.value) {
    const len = msgKeySortedArray.value?.length
    return len > capacity.value ? len - capacity.value : 0
  } else {
    return 0
  }
})

const initSession = (sessionId) => {
  capacity.value = 15 //会话的默认显示消息记录数
  msgListReachBottom() //会话默认滚到最底部
  isShowReturnBottom.value = false //会话默认不弹出“返回底部”的按钮
  // 如果selectedSessionCache有这个sessionId就不重置
  if (!selectedSessionCache.value[sessionId]) {
    selectedSessionCache.value[sessionId] = {
      isLoading: false,
      isLoadMoreLoading: false
    }
  }
  isShowRecorder.value = false // 麦克风输入状态重置
  inputRecorderRef.value?.cancelSend() // 取消音频发送
  inputMultiSelectRef.value?.cancel() // 取消多选模式
  imageData.clearImageInSession(sessionId) // 清除待渲染的图片队列
  readAtMsgIds.value = []
}

/**
 * 定位的session的位置
 * 这里受限sessionListSorted的排序速度，如果定位的时候排序没有完成，定位的位置就不对
 * @param sessionId
 */
const locateSession = (sessionId) => {
  let task
  let count = 0
  task = setInterval(() => {
    if (count >= 3) clearInterval(task)
    const selectedElement = document.querySelector(`#session-item-${sessionIdConvert(sessionId)}`)
    // 如果被选中元素的上边在scrollTop之的上面，或这在下边在scrollTop+clientHeight的下面（显示不全或者完全没有显示），则需要重新定位
    // 由于offsetTop和offsetHeight不包含外边距，因此定位存在细小误差，暂不处理
    if (selectedElement.offsetTop - selectedElement.offsetHeight < sessionListRef.value.scrollTop) {
      sessionListRef.value.scrollTop = selectedElement.offsetTop - selectedElement.offsetHeight
    } else if (
      selectedElement.offsetTop >
      sessionListRef.value.scrollTop + sessionListRef.value.clientHeight
    ) {
      sessionListRef.value.scrollTop = selectedElement.offsetTop - sessionListRef.value.clientHeight
    }
    count++
  }, 200)
}

const msgKeysShow = computed(() => {
  const ids = msgKeySortedArray.value?.slice(startIndex.value)
  if (!ids) return []
  return ids
})

const lastReadMsgId = ref(0)
const msgExtend = computed(() => {
  const data = {}
  for (let index = 0; index < msgKeysShow.value.length; index++) {
    const ext = {}
    if (index > 0) {
      const preMsg = messageData.getMsg(selectedSessionId.value, msgKeysShow.value[index - 1])
      // 上一条消息的时间，相邻的时间只出一条tips
      ext['preMsgTime'] = preMsg.msgTime
      // 判断是否是打开session后的第一条未读消息
      if (preMsg.msgId === lastReadMsgId.value) {
        ext['isFirstNew'] = true
      } else {
        ext['isFirstNew'] = false
      }
    } else {
      ext['preMsgTime'] = null
      ext['isFirstNew'] = false
    }
    data[msgKeysShow.value[index]] = ext
  }
  return data
})

const selectedSession = computed(() => {
  return messageData.sessionList[selectedSessionId.value] || {}
})

onMounted(async () => {
  await messageData.loadSessionList()
  await messageData.loadAt()
  await groupData.loadGroupInfoList()
  messageData.loadPartitions() // 异步加载

  asideWidth.value = settingData.sessionListDrag[myAccount.value] || 300
  inputBoxHeight.value = settingData.inputBoxDrag[myAccount.value] || 300

  wsConnect.bindEvent(MsgType.CHAT, onReceiveChatMsg(updateScroll, capacity)) //绑定接收Chat消息的事件
  wsConnect.bindEvent(MsgType.GROUP_CHAT, onReceiveGroupChatMsg(updateScroll, capacity)) //绑定接收GroupChat消息的事件
  wsConnect.bindGroupSystemMsgEvent(onReceiveGroupSystemMsg(updateScroll, capacity)) //绑定接收群系统消息事件

  // 这里要接收从其他页面跳转过来传递的sessionId参数
  const routerSessionId = router.currentRoute.value.query.sessionId
  if (routerSessionId) {
    if (routerSessionId in messageData.sessionList) {
      handleSelectedSession(routerSessionId)
    } else {
      msgChatQuerySessionService({ sessionId: routerSessionId })
        .then((res) => {
          if (res.data.data) {
            messageData.addSession(res.data.data.session)
            handleSelectedSession(routerSessionId)
          }
        })
        .catch(() => {
          router.replace({ query: {} })
        })
    }
  }
})

onUnmounted(() => {
  messageData.setSelectedSessionId('')
})

const handleMsgListWheel = async () => {
  if (
    msgListDiv.value.scrollTop === 0 &&
    !selectedSessionCache.value[selectedSessionId.value].isLoadMoreLoading
  ) {
    await onLoadMore()
  }

  const clientHeight = document.querySelector('.message-main').clientHeight
  disToBottom.value = msgListDiv.value.scrollHeight - msgListDiv.value.scrollTop - clientHeight
  // disToBottom接近50个像素的时候，关闭底部未读tips控件
  newMsgTips.value.isShowBottomTips =
    disToBottom.value < nearBottomDis ? false : newMsgTips.value.isShowBottomTips
  // isShowReturnBottom.value = disToBottom.value > 300  // 控制是否显示"回到底部"的按钮。暂时取消这个提示功能，与消息提示的按钮显得有点重复

  if (newMsgTips.value.firstElement?.getBoundingClientRect().top > 0) {
    newMsgTips.value.isShowTopTips = false
  }
}

// 把sessionList转成数组，并按照msgTime排序
const sessionListSorted = computed(() => {
  if (!Object.keys(messageData.sessionList)) {
    return []
  } else {
    let sessionArr = Object.values(messageData.sessionList)
    return sessionArr.sort((a, b) => {
      if (a.top && !b.top) {
        // 排序第一优先级：是否置顶
        return -1
      } else if (!a.top && b.top) {
        return 1
      } else {
        if (a.draft && !b.draft) {
          // 排序第二优先级：是否有草稿
          return -1
        } else if (!a.draft && b.draft) {
          return 1
        } else {
          // 排序第三优先级：最后一条消息的时间
          const a_msgIds = messageData.msgKeySortedArray[a.sessionId]
          const a_msgIds_len = a_msgIds?.length
          if (!a_msgIds_len) return 1
          const a_lastMsg = messageData.getMsg(a.sessionId, a_msgIds[a_msgIds_len - 1])
          const b_msgIds = messageData.msgKeySortedArray[b.sessionId]
          const b_msgIds_len = b_msgIds?.length
          if (!b_msgIds_len) return -1
          const b_lastMsg = messageData.getMsg(b.sessionId, b_msgIds[b_msgIds_len - 1])
          const bTime = new Date(b_lastMsg.msgTime).getTime()
          const aTime = new Date(a_lastMsg.msgTime).getTime()
          if (bTime !== aTime) {
            return bTime - aTime
          }
        }
      }
    })
  }
})

const showName = computed(() => {
  switch (selectedSession.value.sessionType) {
    case MsgType.CHAT:
      return selectedSession.value.objectInfo.nickName
    case MsgType.GROUP_CHAT:
      return (
        groupData.groupInfoList[selectedSession.value.remoteId]?.groupName ||
        selectedSession.value.objectInfo.groupName
      )
    default:
      return ''
  }
})

const showId = computed(() => {
  return selectedSession.value.remoteId
})

const getMsgSenderObj = (msgId) => {
  const msg = messageData.getMsg(selectedSessionId.value, msgId)
  if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
    // 如果此时memberList还没有加载完成，先return account给MessageItem子组件
    return groupMembers.value ? groupMembers.value[msg.fromId] : { account: msg.fromId }
  } else {
    if (myAccount.value === msg.fromId) {
      return userData.user
    } else {
      return selectedSession.value.objectInfo
    }
  }
}

const onAsideDragUpdate = ({ width }) => {
  asideWidth.value = width
  settingData.setSessionListDrag({
    ...settingData.sessionListDrag,
    [myAccount.value]: width
  })
}

const onInputBoxDragUpdate = ({ height }) => {
  inputBoxHeight.value = height
  msgListReachBottom('smooth')
  settingData.setInputBoxDrag({
    ...settingData.inputBoxDrag,
    [myAccount.value]: height
  })
}

/**
 * 从服务端拉取消息，endMsgId有值就表示最大拉到endMsgId-1的消息(滚轮上滚加载更多消息场景)
 * @param ref 标记更新的msgId位置
 */
const pullMsg = async (endMsgId = null) => {
  // 下列三种情况不拉取数据
  if (
    hasNoMoreMsg.value ||
    selectedSessionCache.value[selectedSessionId.value].isLoading ||
    selectedSessionCache.value[selectedSessionId.value].isLoadMoreLoading
  ) {
    return
  }

  const pageSize = 30
  const params = {
    sessionId: selectedSessionId.value,
    pageSize: pageSize,
    endMsgId: endMsgId
  }

  if (!endMsgId) selectedSessionCache.value[selectedSessionId.value].isLoading = true
  // 显示"加载更多中..."
  selectedSessionCache.value[selectedSessionId.value].isLoadMoreLoading = true

  // 这里一定不要响应式的sessionId，否则快速点击切换session会导致数据都叠加到最后一次的selectedSessionId上面
  const sessionId = selectedSessionId.value
  try {
    const res = await msgChatPullMsgService(params)
    const msgCount = res.data.data.count
    if (msgCount > 0) {
      await messageData.preloadResource(res.data.data.msgList)
      messageData.addMsgRecords(sessionId, res.data.data.msgList)
      messageData.updateMsgKeySort(sessionId)
    }

    if (msgCount < pageSize) {
      messageData.updateSession({
        sessionId: sessionId,
        pullMsgDone: true
      })
    }
  } finally {
    selectedSessionCache.value[selectedSessionId.value].isLoading = false
    selectedSessionCache.value[selectedSessionId.value].isLoadMoreLoading = false
  }
}

// 表示有个session被选中了
const handleSelectedSession = async (sessionId) => {
  router.replace({ query: { sessionId: sessionId } })

  if (selectedSessionId.value !== sessionId) {
    messageData.setSelectedSessionId(sessionId)
    initSession(sessionId)
    locateSession(sessionId)

    // 如果是群组，要加载成员列表（显示消息需要account，nickName，avatar信息）
    if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
      // 没有members数据才需要加载成员列表，加载过了就不重复加载了
      if (!groupMembers.value && !isNotInGroup.value) {
        const res = await groupInfoService({ groupId: selectedSession.value.remoteId })
        groupData.setGroupInfo({
          groupId: selectedSession.value.remoteId,
          groupInfo: res.data.data.groupInfo || {}
        })
        groupData.setGroupMembers({
          groupId: selectedSession.value.remoteId,
          members: res.data.data.members || {}
        })
      }
    }

    lastReadMsgId.value = selectedSession.value.readMsgId //保存这个readMsgId,要留给MessageItem用
    sendRead()
  }
}

const calibratedRemoteRead = computed(() => {
  const len = msgKeysShow.value.length
  for (let index = len - 1; index >= 0; index--) {
    const key = msgKeysShow.value[index]
    const msg = messageData.getMsg(selectedSessionId.value, key)
    if (msg.fromId === selectedSession.value.remoteId) {
      return Math.max(msg.msgId, selectedSession.value.remoteRead)
    }
  }
  return selectedSession.value.remoteRead
})

const sendRead = () => {
  if (selectedSessionId.value && selectedSession.value.readMsgId < lastMsgId.value) {
    const content = lastMsgId.value.toString()
    const msgType =
      selectedSession.value.sessionType === MsgType.CHAT
        ? MsgType.CHAT_READ
        : MsgType.GROUP_CHAT_READ
    wsConnect.sendMsg(selectedSessionId.value, showId.value, msgType, content + '', 0, '', () => {})
    // 更新本地缓存的已读位置
    messageData.updateSession({
      sessionId: selectedSessionId.value,
      readMsgId: content,
      readTime: new Date(),
      unreadCount: 0
    })
  }
}

/**
 * 处理发送转发的消息
 */
const handleSendForwardMsg = async ({ session, content, contentType }) => {
  if (session.sessionType === MsgType.GROUP_CHAT && session.leave) {
    ElMessage.warning('您已离开该群或群已被解散')
    return
  }

  if (session.sessionType === MsgType.GROUP_CHAT) {
    if (!groupData.groupMembersList[session.remoteId]) {
      const res = await groupInfoService({ groupId: session.remoteId })
      groupData.setGroupInfo({
        groupId: session.remoteId,
        groupInfo: res.data.data.groupInfo || {}
      })
      groupData.setGroupMembers({
        groupId: session.remoteId,
        members: res.data.data.members || {}
      })
    }

    const meInGroup = groupData.groupMembersList[session.remoteId][myAccount.value]
    if (
      meInGroup.mutedMode === 1 ||
      (groupData.groupInfoList[session.remoteId].allMuted && meInGroup.mutedMode !== 2)
    ) {
      ElMessage.warning('您已被禁言，请联系管理员')
      return
    }
  }

  const seq = uuidv4()
  const msg = {
    msgId: seq,
    seq,
    sessionId: session.sessionId,
    fromId: myAccount.value,
    remoteId: session.remoteId,
    msgType: session.sessionType,
    content,
    contentType,
    status: msgSendStatus.PENDING,
    msgTime: new Date(),
    sendTime: new Date()
  }
  messageData.addMsgRecords(msg.sessionId, [msg])
  messageData.updateMsgKeySort(msg.sessionId)

  if (selectedSessionId.value === msg.sessionId) {
    capacity.value++
    msgListReachBottom()
  }

  const resendInterval = 2000 //2秒
  const before = (data) => {
    setTimeout(() => {
      if (msg.status === msgSendStatus.PENDING) {
        wsConnect.sendAgent(data)
        setTimeout(() => {
          if (msg.status === msgSendStatus.PENDING) {
            wsConnect.sendAgent(data)
            setTimeout(() => {
              if (msg.status === msgSendStatus.PENDING) {
                wsConnect.sendAgent(data)
                setTimeout(() => {
                  if (msg.status === msgSendStatus.PENDING) {
                    messageData.updateMsg(msg.sessionId, msg.msgId, {
                      status: msgSendStatus.FAILED
                    })
                    ElMessage.error('消息发送失败')
                  }
                }, resendInterval)
              }
            }, resendInterval)
          }
        }, resendInterval)
      }
    }, resendInterval)
  }

  const after = (msgId) => {
    messageData.updateMsg(msg.sessionId, msg.msgId, { msgId, status: msgSendStatus.OK })
  }
  wsConnect.sendMsg(
    msg.sessionId,
    msg.remoteId,
    msg.msgType,
    msg.content,
    msg.contentType,
    msg.seq,
    before,
    after
  )
}

/**
 * 发送时先添加本地消息，可以立即渲染
 */
const handleLocalMsg = ({ content, contentType, fn }) => {
  const seq = uuidv4()
  const msg = {
    msgId: seq,
    seq: seq,
    sessionId: selectedSessionId.value,
    fromId: myAccount.value,
    msgType: selectedSession.value.sessionType,
    content,
    contentType,
    status: msgSendStatus.PENDING,
    msgTime: new Date(),
    sendTime: new Date()
  }
  messageData.addMsgRecords(msg.sessionId, [msg])
  messageData.updateMsgKeySort(msg.sessionId)
  capacity.value++
  msgListReachBottom()

  messageData.updateSession({
    sessionId: selectedSessionId.value,
    unreadCount: 0, // 最后一条消息是自己发的，因此未读是0
    draft: '' //草稿意味着要清空
  })

  fn(msg)
}

const handleSendMessage = ({ msg, content, at }) => {
  if (isNotInGroup.value) {
    ElMessage.warning('您已离开该群或群已被解散')
    return
  }
  if (isMutedInGroup.value) {
    ElMessage.warning('您已被禁言，请联系管理员')
    return
  }

  if (inputToolBarRef.value) inputToolBarRef.value.closeWindow()

  const resendInterval = 2000 //2秒
  const before = (data) => {
    // 当2s内status如果还是pending中，则重发3次。如果最后还是pending，则把status置为failed
    setTimeout(() => {
      if (msg.status === msgSendStatus.PENDING) {
        wsConnect.sendAgent(data)
        setTimeout(() => {
          if (msg.status === msgSendStatus.PENDING) {
            wsConnect.sendAgent(data)
            setTimeout(() => {
              if (msg.status === msgSendStatus.PENDING) {
                wsConnect.sendAgent(data)
                setTimeout(() => {
                  if (msg.status === msgSendStatus.PENDING) {
                    messageData.updateMsg(msg.sessionId, msg.msgId, {
                      status: msgSendStatus.FAILED
                    })
                    ElMessage.error('消息发送失败')
                  }
                }, resendInterval)
              }
            }, resendInterval)
          }
        }, resendInterval)
      }
    }, resendInterval)
  }

  const after = (msgId) => {
    messageData.updateSession({
      sessionId: msg.sessionId,
      readMsgId: msgId, // 最后一条消息是自己发的，因此已读更新到刚发的这条消息的msgId
      readTime: new Date()
    })

    messageData.updateMsg(msg.sessionId, msg.msgId, { msgId, status: msgSendStatus.OK })
    if (!messageData.sessionList[msg.sessionId].dnd) {
      playMsgSend()
    }

    if (at && at.length > 0) {
      handleSendAt(at, msg.sessionId, msgId)
    }
  }

  wsConnect.sendMsg(
    msg.sessionId,
    showId.value,
    selectedSession.value.sessionType,
    content,
    msg.contentType,
    msg.seq,
    before,
    after
  )

  msgListReachBottom()
  locateSession(msg.sessionId)
  handleReadAllAt()
}

const handleResendMessage = (msg) => {
  // 重发消息时更新这三个属性，其他不变
  messageData.updateMsg(msg.sessionId, msg.msgId, {
    status: msgSendStatus.PENDING,
    msgTime: new Date(),
    sendTime: new Date()
  })

  const toSendAtList = []
  jsonParseSafe(msg.content).forEach((item) => {
    if (item.type === msgContentType.AT) {
      const account = item.value.account
      if (account == 0) {
        toSendAtList.push(account)
      } else {
        if (groupMembers.value[account]) {
          toSendAtList.push(account)
        }
      }
    }
  })

  handleSendMessage({ msg, at: toSendAtList })
}

const handleSendAt = (at, sessionId, referMsgId) => {
  if (!at || at.length === 0) {
    return
  }

  const contentObj = { referMsgId }
  if (at.some((item) => item == 0)) {
    contentObj.isAtAll = true
  } else {
    contentObj.isAtAll = false
    contentObj.atList = at.filter((item) => groupMembers.value[item]) // 过滤不是当前合法群成员的数据
  }

  if (contentObj.isAtAll || (!contentObj.isAtAll && contentObj.atList.length > 0)) {
    wsConnect.sendMsg(
      sessionId,
      showId.value,
      MsgType.AT,
      JSON.stringify(contentObj),
      0,
      null,
      () => {},
      () => {}
    )
  }
}

const onLoadMore = async () => {
  const scrollHeight = msgListDiv.value.scrollHeight
  const scrollTop = msgListDiv.value.scrollTop
  if (msgKeySortedArray.value?.length <= capacity.value) {
    await pullMsg(msgKeysShow.value[0])
  }
  const len = msgKeySortedArray.value?.length
  if (len > capacity.value) {
    if (len - capacity.value > step) {
      capacity.value += step
    } else {
      capacity.value = len
    }
  }

  // 保持页面对话的锚定位置
  nextTick(() => {
    msgListDiv.value.scrollTop = msgListDiv.value.scrollHeight - scrollHeight + scrollTop
  })
}

const updateScroll = () => {
  if (disToBottom.value < nearBottomDis) {
    msgListReachBottom('smooth')
  }
}

/**
 * 消息列表拉到最底部
 * @param behavior smooth 平滑的, instant 立即（默认）
 */
const msgListReachBottom = (behavior = 'instant') => {
  const scrollToBottom = () => {
    setTimeout(() => {
      msgListDiv.value?.scrollTo({
        top: msgListDiv.value.scrollHeight,
        behavior: behavior
      })
      newMsgTips.value.isShowBottomTips = false
      disToBottom.value = 0
    }, 50)
  }

  if (msgListDiv.value) {
    scrollToBottom()
  } else {
    const stopWatch = watch(msgListDiv, (newValue) => {
      if (newValue) {
        scrollToBottom()
        stopWatch() // 停止监听
      }
    })
  }
}

const onReturnBottom = () => {
  msgListReachBottom('smooth')
}

const onReachFirstUnReadMsg = () => {
  const msgListRect = msgListDiv.value.getBoundingClientRect()
  const firstElRect = newMsgTips.value.firstElement.getBoundingClientRect()
  nextTick(() => {
    msgListDiv.value.scrollTop = msgListDiv.value.scrollTop - (msgListRect.top - firstElRect.top)
  })
  newMsgTips.value.isShowTopTips = false
}

const onClickMsgContainer = () => {
  sendRead()
}

const onShowUserCard = ({ sessionId, account }) => {
  const loadingInstance = ElLoading.service(el_loading_options)
  if (myAccount.value === account) {
    userData
      .updateUser()
      .then(() => {
        userCardData.setUserInfo(userData.user)
        userCardData.setIsShow(true)
      })
      .finally(() => {
        //防止请求异常，导致loading关不掉
        loadingInstance.close()
      })
  } else {
    userQueryService({ account: account })
      .then((res) => {
        userCardData.setUserInfo(res.data.data)
        userCardData.setIsShow(true)
        const sessionIdWithThisAccount = combineId(account, myAccount.value)
        // 如果有和这个用户的session，则更新一下session
        if (sessionIdWithThisAccount in messageData.sessionList) {
          messageData.updateSession({
            sessionId: sessionIdWithThisAccount,
            objectInfo: {
              ...messageData.sessionList[sessionIdWithThisAccount].objectInfo,
              nickName: res.data.data.nickName,
              signature: res.data.data.signature,
              avatar: res.data.data.avatar,
              avatarThumb: res.data.data.avatarThumb,
              gender: res.data.data.gender,
              phoneNum: res.data.data.phoneNum,
              email: res.data.data.email
            }
          })
        }

        if (sessionId && messageData.sessionList[sessionId].sessionType === MsgType.GROUP_CHAT) {
          const groupId = selectedSession.value.remoteId
          groupData.setOneOfGroupMembers({
            groupId: groupId,
            account: account,
            userInfo: {
              ...groupMembers.value[account],
              nickName: res.data.data.nickName,
              avatar: res.data.data.avatar,
              avatarThumb: res.data.data.avatarThumb
            }
          })
        }
      })
      .finally(() => {
        //防止请求异常，导致loading关不掉
        loadingInstance.close()
      })
  }
}

const showMenuSessionId = ref('') //当前被点击右键的sessionId（它可以不是选中的）
const selectedMenuItem = ref('') //菜单组件反馈用户点击的某个菜单项

const isShowUpdateMarkDialog = ref(false)
const titleForUpdateMark = ref('')
const onShowUpdateMarkDialog = () => {
  isShowUpdateMarkDialog.value = true
  const objectInfo = messageData.sessionList[showMenuSessionId.value].objectInfo
  if (messageData.sessionList[showMenuSessionId.value].sessionType === MsgType.CHAT) {
    titleForUpdateMark.value = `${objectInfo.nickName} ${objectInfo.account}`
  } else if (messageData.sessionList[showMenuSessionId.value].sessionType === MsgType.GROUP_CHAT) {
    titleForUpdateMark.value = `${objectInfo.groupName} ${objectInfo.groupId}`
  }
}

const onUpdateMarkConfirm = (inputValue) => {
  // 如果没有更改，不需要执行保存
  if (inputValue !== messageData.sessionList[showMenuSessionId.value].mark) {
    messageData.updateSession({
      sessionId: showMenuSessionId.value,
      mark: inputValue
    })
  }
  isShowUpdateMarkDialog.value = false
}

const onShowGroupCard = ({ groupId }) => {
  if (messageData.sessionList[groupId].leave) {
    ElMessage.warning('您已离开该群或群已被解散')
    return
  }
  const loadingInstance = ElLoading.service(el_loading_options)
  groupInfoService({ groupId: groupId })
    .then((res) => {
      groupCardData.setOpened(groupId)
      groupData.setGroupInfo({
        groupId: groupId,
        groupInfo: res.data.data.groupInfo || {}
      })
      groupData.setGroupMembers({
        groupId: groupId,
        members: res.data.data.members || {}
      })
    })
    .finally(() => {
      loadingInstance.close()
    })
}

const onShowContactCard = (contactInfo) => {
  userCardData.setUserInfo(contactInfo)
  userCardData.setIsShow(true)
}

const onOpenSession = async ({ msgType, objectInfo }) => {
  if (myAccount.value === objectInfo.account) {
    console.log('暂不支持自己给自己发消息') //TODO
    return
  }

  let sessionId
  let remoteId
  if (msgType === MsgType.CHAT) {
    sessionId = combineId(myAccount.value, objectInfo.account)
    remoteId = objectInfo.account
  } else if (msgType === MsgType.GROUP_CHAT) {
    sessionId = objectInfo.groupId
    remoteId = objectInfo.groupId
  } else {
    return
  }

  if (messageData.sessionList[sessionId]) {
    handleSelectedSession(sessionId)
  } else {
    const res = await msgChatCreateSessionService({
      sessionId: sessionId,
      remoteId: remoteId,
      sessionType: msgType
    })
    messageData.addSession(res.data.data.session)
    handleSelectedSession(sessionId)
  }
}

/**
 * 监视msgKeysShow的数据变化,给出新消息的tips提示
 */
watch(
  () => msgKeysShow.value,
  (newValue) => {
    if (!newValue || selectedSession.value.unreadCount === 0) return
    nextTick(() => {
      const unreadMsgEls = document.querySelectorAll('.unreadMsg')
      if (unreadMsgEls.length === 0) return
      const msgListRect = msgListDiv.value.getBoundingClientRect()
      Array.from(unreadMsgEls).some((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.bottom < msgListRect.top) {
          newMsgTips.value.isShowTopTips = true
          newMsgTips.value.unreadCount = selectedSession.value.unreadCount
          newMsgTips.value.firstElement = el
          return true
        } else if (rect.top > msgListRect.bottom) {
          newMsgTips.value.isShowBottomTips = true
          newMsgTips.value.unreadCount = selectedSession.value.unreadCount
          return true
        }
      })
    })
  }
)

watch(
  () => router.currentRoute.value.query.sessionId,
  (newValue) => {
    if (newValue) {
      handleSelectedSession(newValue)
    }
  }
)

const sessionItemRefCollection = ref({})
const setSessionItemRef = (sessionId, el) => {
  sessionItemRefCollection.value[sessionId] = el
}

const onSelectMenu = (item) => {
  selectedMenuItem.value = item
  nextTick(() => {
    // 要延后执行，否则selectedMenuItem的值还没有传过去，点击无效
    sessionItemRefCollection.value[showMenuSessionId.value].handleSelectedMenuItem()
  })
}

const onOpenSessionMenu = (sessionId) => {
  showMenuSessionId.value = sessionId
}

const onCloseSessionMenu = () => {
  showMenuSessionId.value = ''
}

const onNoneSelected = () => {
  messageData.setSelectedSessionId('')
}

const onVoiceCall = () => {
  ElMessage.warning('功能开发中')
}

const onVideoCall = () => {
  ElMessage.warning('功能开发中')
}

const onInviteToGroup = () => {
  if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
    const groupId = selectedSession.value.remoteId
    const joinGroupApproval = groupData.groupInfoList[groupId].joinGroupApproval
    if (joinGroupApproval || iAmAdmin.value) {
      onShowGroupCard({ groupId: selectedSession.value.remoteId })
      setTimeout(() => {
        groupCardData.setChangeMemberModel('addMember')
      }, 300)
    } else {
      ElMessage.warning('没有权限，请联系群组管理员')
    }
  } else if (selectedSession.value.sessionType === MsgType.CHAT) {
    defaultSelectedOptionIds.value = [selectedSession.value.remoteId]
    isShowSelectDialog.value = true
  }
}

const iAmAdmin = computed(() => {
  if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
    return groupMembers.value[myAccount.value].role > 0
  } else {
    return false
  }
})

const onMoreSetting = () => {
  if (selectedSession.value.sessionType === MsgType.CHAT) {
    onShowUserCard({
      sessionId: selectedSession.value.sessionId,
      account: selectedSession.value.objectInfo.account
    })
  } else if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
    onShowGroupCard({ groupId: selectedSession.value.remoteId })
  }
}

const isShowSelectDialog = ref(false)
const addOprMenuRef = ref()
const onSelectOprMenu = (label) => {
  switch (label) {
    case 'createGroup':
      defaultSelectedOptionIds.value = []
      isShowSelectDialog.value = true
      break
    case 'createVoiceMeeting':
      ElMessage.warning('功能开发中')
      break
    case 'createVideoMeeting':
      ElMessage.warning('功能开发中')
      break
    default:
      break
  }
}

const inputMultiSelectRef = ref(null)
const isMultiSelect = ref(false)
const multiSelectedMsgKeys = ref(new Set())
const handleMsgItemSelect = (msgKey, selected) => {
  if (!isMultiSelect.value) {
    isMultiSelect.value = true
  }

  if (selected) {
    multiSelectedMsgKeys.value.add(msgKey)
  } else {
    multiSelectedMsgKeys.value.delete(msgKey)
  }
}

const handleCancleMultiSelect = () => {
  isMultiSelect.value = false
  multiSelectedMsgKeys.value.clear()
}

const handleForwardTogether = () => {
  isShowForwardMsgDialog.value = true
  showForwardMsgDialogTitle.value = '合并转发'
}

const handleForwardOneByOne = () => {
  isShowForwardMsgDialog.value = true
  showForwardMsgDialogTitle.value = '逐条转发'
}

const handleBatchDeleteMsg = () => {
  const deleteMsgIds = [...multiSelectedMsgKeys.value].map((item) => {
    return messageData.getMsg(selectedSessionId.value, item).msgId
  })
  msgChatDeleteMsgService({
    sessionId: selectedSessionId.value,
    deleteMsgIds: [...deleteMsgIds]
  })
    .then((res) => {
      if (res.data.code === 0) {
        multiSelectedMsgKeys.value.forEach((msgKey) => {
          messageData.removeMsgRecord(selectedSessionId.value, msgKey)
        })
        handleCancleMultiSelect()
        ElMessage.success('消息已删除')
      }
    })
    .catch((error) => {
      console.error(error)
    })
}

// 选区相关状态
const selection = ref({
  isSelecting: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
})

// 计算选区样式
const selectionStyle = computed(() => {
  if (!selection.value.isSelecting) return { display: 'none' }

  const left = Math.min(selection.value.startX, selection.value.currentX)
  const top = Math.min(selection.value.startY, selection.value.currentY)
  const width = Math.abs(selection.value.currentX - selection.value.startX)
  const height = Math.abs(selection.value.currentY - selection.value.startY)

  return {
    display: 'block',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

// 处理鼠标按下
const handleMouseDown = (e) => {
  if (e.button !== 0) return // 如果不是左键则返回

  // 检查是否已有选中内容，如果已有选中文本则终止多选操作
  if (window.getSelection().toString().trim() !== '') {
    return
  }

  const rect = msgListDiv.value.getBoundingClientRect()
  selection.value.isSelecting = true
  selection.value.startX = e.clientX - rect.left
  selection.value.startY = e.clientY - rect.top
  selection.value.currentX = selection.value.startX
  selection.value.currentY = selection.value.startY

  // 添加全局监听
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
}

// 处理鼠标移动
const handleGlobalMouseMove = (e) => {
  if (!selection.value.isSelecting) return

  // 检查是否已有选中内容，如果已有选中文本则终止多选操作
  if (window.getSelection().toString().trim() !== '') {
    selection.value.isSelecting = false
    return
  }

  const rect = msgListDiv.value.getBoundingClientRect()
  selection.value.currentX = e.clientX - rect.left
  selection.value.currentY = e.clientY - rect.top
}

// 处理鼠标释放
const handleGlobalMouseUp = (e) => {
  // 只在鼠标左键释放时处理
  if (e.button !== 0) return

  // 检查是否已有选中内容，如果已有选中文本则终止多选操作
  if (window.getSelection().toString().trim() !== '') {
    selection.value.isSelecting = false
    return
  }

  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)

  if (
    !selection.value.isSelecting ||
    (selection.value.isSelecting &&
      selection.value.currentX === selection.value.startX &&
      selection.value.currentY === selection.value.startY)
  ) {
    selection.value.isSelecting = false
    return
  }

  selection.value.isSelecting = false

  // 检测选区内的消息项
  const selectionRect = {
    left: Math.min(selection.value.startX, selection.value.currentX),
    top: Math.min(selection.value.startY, selection.value.currentY),
    right: Math.max(selection.value.startX, selection.value.currentX),
    bottom: Math.max(selection.value.startY, selection.value.currentY)
  }

  const rect = msgListDiv.value.getBoundingClientRect()
  msgListDiv.value.querySelectorAll('.message-item').forEach((el) => {
    const itemRect = el.getBoundingClientRect()
    const itemLeft = itemRect.left - rect.left
    const itemTop = itemRect.top - rect.top
    const itemRight = itemRect.right - rect.left
    const itemBottom = itemRect.bottom - rect.top

    const isIntersect = !(
      itemBottom < selectionRect.top ||
      itemTop > selectionRect.bottom ||
      itemRight < selectionRect.left ||
      itemLeft > selectionRect.right
    )

    if (
      isIntersect &&
      (selectionRect.right - selectionRect.left > 50 || // 移动超过50 + 50才算有效
        selectionRect.bottom - selectionRect.top > 50)
    ) {
      if (!isMultiSelect.value) {
        isMultiSelect.value = true
      }

      const msgKey = el.dataset.msgKey
      const disabled = el.dataset.disabled
      if (disabled !== 'true' && !multiSelectedMsgKeys.value.has(msgKey)) {
        multiSelectedMsgKeys.value.add(msgKey)
      }

      const cancelClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        // 移除监听，确保只生效一次
        msgListDiv.value.removeEventListener('click', cancelClick, true)
      }
      // 在捕获阶段拦截点击事件
      msgListDiv.value.addEventListener('click', cancelClick, true)
    }
  })
}

const isShowForwardMsgDialog = ref(false)
const showForwardMsgDialogTitle = ref('')

const sessionListSortedKey = computed(() => {
  return sessionListSorted.value
    .filter((item) => {
      return !(item.sessionType === MsgType.GROUP_CHAT && item.leave)
    })
    .map((item) => item.sessionId)
})

const showForwardMsgDialog = (msgKey) => {
  multiSelectedMsgKeys.value.clear()
  multiSelectedMsgKeys.value.add(msgKey)
  isShowForwardMsgDialog.value = true
  showForwardMsgDialogTitle.value = '逐条转发'
}

const handleConfirmForwardMsg = async (sessions) => {
  const loadingInstance = ElLoading.service(el_loading_options)
  try {
    for (const item of sessions) {
      const sessionId = item.sessionId
      const remoteId = item.remoteId
      // 如果没有session，先创建session
      if (!messageData.sessionList[sessionId]) {
        const res = await msgChatCreateSessionService({
          sessionId: sessionId,
          remoteId: remoteId,
          sessionType: item.sessionType
        })
        messageData.addSession(res.data.data.session)
      }

      if (showForwardMsgDialogTitle.value === '逐条转发') {
        for (const msgKey of multiSelectedMsgKeys.value) {
          const msg = messageData.getMsg(selectedSessionId.value, msgKey)
          await handleSendForwardMsg({
            session: item,
            content: msg.content,
            contentType: msg.contentType
          })
        }
      } else if (showForwardMsgDialogTitle.value === '合并转发') {
        const msgs = [...multiSelectedMsgKeys.value].map((item) => {
          const msg = messageData.getMsg(selectedSessionId.value, item)
          let nickName = ''
          if (selectedSession.value.sessionType === MsgType.CHAT) {
            if (myAccount.value === msg.fromId) {
              nickName = userData.user.nickName
            } else {
              nickName = selectedSession.value.objectInfo.nickName
            }
          } else if (selectedSession.value.sessionType === MsgType.GROUP_CHAT) {
            const groupId = selectedSession.value.remoteId
            const members = groupData.groupMembersList[groupId]
            nickName = members[msg.fromId].nickName
          }
          return {
            nickName,
            msgId: msg.msgId
          }
        })
        await handleSendForwardMsg({
          session: item,
          content: JSON.stringify([
            {
              type: msgContentType.FORWARD_TOGETHER,
              value: {
                sessionId: selectedSessionId.value,
                data: [...msgs]
              }
            }
          ]),
          contentType: msgContentType.FORWARD_TOGETHER
        })
      }
    }
  } catch (error) {
    console.error('forward msg error: ', error)
  } finally {
    handleCloseForwardMsg()
    loadingInstance.close()
  }
}

const handleCloseForwardMsg = () => {
  isShowForwardMsgDialog.value = false
  showForwardMsgDialogTitle.value = ''
  handleCancleMultiSelect()
}

const showMenuAddOpr = (e) => {
  addOprMenuRef.value.handleShowMenu(e)
}

const onSelectMsgMainMenu = (label) => {
  switch (label) {
    case 'clearScreen':
      capacity.value = 0
      break
    default:
      break
  }
}

/**
 * 用于显示创建群组弹窗中的候选成员名单
 */
const selectDialogOptions = computed(() => {
  const data = {}
  Object.values(messageData.sessionList).forEach((item) => {
    if (item.sessionType === MsgType.CHAT) {
      data[item.objectInfo.account] = item.objectInfo
    }
  })
  return data
})

/**
 * 用于显示创建群组弹窗中的默认选中的名单id（account）
 */
const defaultSelectedOptionIds = ref([])

const onConfirmSelect = async (selected) => {
  if (selected.length < 2) {
    ElMessage.warning('请至少选择两位群成员')
    return
  }

  const members = selected.map((item) => ({ account: item.account, nickName: item.nickName }))
  members.push({ account: userData.user.account, nickName: userData.user.nickName })
  const res = await groupCreateService({
    groupName: `${userData.user.nickName}、${selected[0].nickName}、${selected[1].nickName}等的群组`,
    groupType: 1, //普通群
    members: members
  })
  groupData.setGroupInfo({
    groupId: res.data.data.groupInfo.groupId,
    groupInfo: res.data.data.groupInfo
  })

  const sessionId = res.data.data.groupInfo.groupId
  const loadingInstance = ElLoading.service(el_loading_options)
  new Promise((resolve, reject) => {
    let timeoutId = setTimeout(() => {
      reject()
    }, 3000)

    watch(
      () => messageData.sessionList[sessionId],
      (newValue) => {
        if (newValue) {
          clearTimeout(timeoutId)
          resolve()
        }
      }
    )
  })
    .then(() => {
      handleSelectedSession(sessionId)
    })
    .finally(() => {
      isShowSelectDialog.value = false
      loadingInstance.close()
    })
}

const inputEditorRef = ref()
const onSendEmoji = (key) => {
  inputEditorRef.value?.addEmoji(key)
}

const inputRecorderRef = ref(null)
const isShowRecorder = ref(false)
const onShowRecorder = () => {
  isShowRecorder.value = true
}
</script>

<template>
  <el-container class="msg-container-hole" @click="onClickMsgContainer">
    <el-aside class="msg-aside bdr-r" :style="{ width: asideWidth + 'px' }">
      <div class="msg-aside-main">
        <div class="header bdr-b">
          <SearchBox
            @showContactCard="onShowContactCard"
            @showGroupCard="onShowGroupCard"
            @openSession="onOpenSession"
          ></SearchBox>
          <MenuAddOpr ref="addOprMenuRef" @selectMenu="onSelectOprMenu">
            <AddButton :size="30" @click="showMenuAddOpr($event)"></AddButton>
          </MenuAddOpr>
        </div>

        <MenuSession
          :sessionId="showMenuSessionId"
          @selectMenu="onSelectMenu"
          @closeMenu="onCloseSessionMenu"
        >
          <div class="session-list my-scrollbar" ref="sessionListRef">
            <SessionItem
              :ref="(el) => setSessionItemRef(item.sessionId, el)"
              :id="`session-item-${sessionIdConvert(item.sessionId)}`"
              v-for="item in sessionListSorted"
              :key="item.sessionId"
              :sessionId="item.sessionId"
              :selectedSessionId="selectedSessionId"
              :showMenuSessionId="showMenuSessionId"
              :selectedMenuItem="selectedMenuItem"
              @isSelected="handleSelectedSession"
              @showUserCard="onShowUserCard"
              @showGroupCard="onShowGroupCard"
              @openSessionMenu="onOpenSessionMenu"
              @noneSelected="onNoneSelected"
              @showUpdateMarkDialog="onShowUpdateMarkDialog"
            ></SessionItem>
            <HashNoData
              v-if="sessionListSorted.length === 0"
              :size="100"
              style="height: 100%"
            ></HashNoData>
          </div>
        </MenuSession>
      </div>

      <DragLine
        direction="right"
        :min="asideWidthMin"
        :max="asideWidthMax"
        :origin-size="asideWidth"
        @drag-update="onAsideDragUpdate"
      ></DragLine>
    </el-aside>

    <el-main class="msg-box">
      <div v-if="!selectedSessionId" class="backgroup">
        <backgroupImage class="backgroup-image" v-if="!selectedSessionId"></backgroupImage>
        <span class="welcome">欢迎使用 Open AnyLink</span>
      </div>

      <el-container v-else class="container">
        <el-header class="header bdr-b">
          <div class="show-name-id" @click="onMoreSetting">
            <SessionTag
              v-if="selectedSession?.sessionType === MsgType.GROUP_CHAT"
              tagType="groupchat"
            ></SessionTag>
            <SessionTag v-if="isNotInGroup" tagType="groupleave"></SessionTag>
            <span
              class="show-name text-ellipsis"
              :title="selectedSession.mark ? `${selectedSession.mark}(${showName})` : showName"
            >
              {{ selectedSession.mark ? `${selectedSession.mark}(${showName})` : showName }}
            </span>
            <span class="show-id" :title="showId">{{ showId }}</span>
          </div>

          <div v-if="!isNotInGroup" class="action-set">
            <el-icon
              class="action-button"
              size="20"
              color="#409eff"
              :title="selectedSession.sessionType === MsgType.GROUP_CHAT ? '多人语音' : '语音通话'"
              @click="onVoiceCall"
            >
              <Phone />
            </el-icon>
            <el-icon
              class="action-button"
              size="20"
              color="#409eff"
              :title="selectedSession.sessionType === MsgType.GROUP_CHAT ? '视频会议' : '视频通话'"
              @click="onVideoCall"
            >
              <VideoCamera />
            </el-icon>
            <el-icon
              class="action-button"
              size="20"
              color="#409eff"
              :title="selectedSession.sessionType === MsgType.GROUP_CHAT ? '邀请进群' : '创建群组'"
              @click="onInviteToGroup"
            >
              <CirclePlus />
            </el-icon>
            <el-icon
              class="action-button"
              size="20"
              color="#409eff"
              title="更多设置"
              @click="onMoreSetting"
            >
              <MoreFilled />
            </el-icon>
          </div>
        </el-header>
        <el-main class="body">
          <div class="show-main">
            <div class="show-message-box">
              <div v-if="selectedSessionCache[selectedSessionId]?.isLoading" class="show-loading">
                数据加载中……
              </div>
              <div v-else-if="!lastMsgId" class="no-more-message">当前无更多消息</div>
              <div
                v-else
                class="message-main my-scrollbar"
                ref="msgListDiv"
                @wheel="handleMsgListWheel"
                @mousedown="handleMouseDown"
              >
                <div class="selection-box" :style="selectionStyle"></div>
                <MenuMsgMain @selectMenu="onSelectMsgMainMenu">
                  <MessageItem
                    v-for="item in msgKeysShow"
                    :key="selectedSessionId + '-' + item"
                    :id="'message-item-' + sessionIdConvert(selectedSessionId) + '-' + item"
                    :class="{ highlighted: highlightedMsgIds.has(item) }"
                    :sessionId="selectedSessionId"
                    :msgKey="item"
                    :extend="msgExtend[item]"
                    :obj="getMsgSenderObj(item)"
                    :readMsgId="selectedSession.readMsgId"
                    :remoteRead="calibratedRemoteRead"
                    :firstMsgId="firstMsgId"
                    :lastMsgId="lastMsgId"
                    :hasNoMoreMsg="hasNoMoreMsg"
                    :isLoadMoreLoading="selectedSessionCache[selectedSessionId]?.isLoadMoreLoading"
                    :inputEditorRef="inputEditorRef"
                    :isMultiSelect="isMultiSelect"
                    :isSelected="multiSelectedMsgKeys.has(item)"
                    @loadMore="onLoadMore"
                    @showUserCard="onShowUserCard"
                    @showGroupCard="onShowGroupCard"
                    @resendMsg="handleResendMessage"
                    @loadFinished="updateScroll"
                    @showHighlight="handleShowHighlight"
                    @forwardMsg="showForwardMsgDialog"
                    @select="handleMsgItemSelect"
                  ></MessageItem>
                </MenuMsgMain>
              </div>
              <el-button
                type="primary"
                class="return-bottom"
                :class="{ showIt: isShowReturnBottom }"
                @click="onReturnBottom"
              >
                返回底部
                <el-icon class="el-icon--right"><ArrowDownBold /></el-icon>
              </el-button>
              <el-button
                type="primary"
                class="bottom-tips"
                :class="{ showIt: newMsgTips.isShowBottomTips }"
                @click="onReturnBottom"
              >
                {{ newMsgTips.unreadCount > 99 ? `99+` : newMsgTips.unreadCount }}条未读消息
                <el-icon class="el-icon--right"><ArrowDownBold /></el-icon>
              </el-button>
              <el-button
                type="primary"
                class="top-tips"
                :class="{ showIt: newMsgTips.isShowTopTips }"
                @click="onReachFirstUnReadMsg"
              >
                {{ newMsgTips.unreadCount > 99 ? `99+` : newMsgTips.unreadCount }}条未读消息
                <el-icon class="el-icon--right"><ArrowUp /></el-icon>
              </el-button>
              <transition name="fade-slide">
                <div v-if="unreadAtRecords.length > 0" class="at-tips" @click="handleReadAt">
                  {{
                    unreadAtRecords.length > 1
                      ? `${unreadAtRecords.length}条消息提到了你`
                      : `${unreadAtRecords[0].nickName}提到了你`
                  }}
                </div>
              </transition>
            </div>
            <div class="input-box bdr-t" :style="{ height: inputBoxHeight + 'px' }">
              <el-container v-if="isMultiSelect">
                <InputMultiSelect
                  ref="inputMultiSelectRef"
                  :selectedCount="multiSelectedMsgKeys.size"
                  @exit="handleCancleMultiSelect"
                  @forwardTogether="handleForwardTogether"
                  @forwardOneByOne="handleForwardOneByOne"
                  @batchDelete="handleBatchDeleteMsg"
                ></InputMultiSelect>
              </el-container>
              <el-container v-else-if="isShowRecorder">
                <InputRecorder
                  ref="inputRecorderRef"
                  @exit="isShowRecorder = false"
                  @saveLocalMsg="handleLocalMsg"
                  @sendMessage="handleSendMessage"
                ></InputRecorder>
              </el-container>
              <el-container v-else class="input-box-container">
                <el-header class="input-box-header">
                  <InputToolBar
                    ref="inputToolBarRef"
                    :sessionId="selectedSessionId"
                    :isShowToolSet="!isNotInGroup"
                    @sendEmoji="onSendEmoji"
                    @showRecorder="onShowRecorder"
                    @saveLocalMsg="handleLocalMsg"
                    @sendMessage="handleSendMessage"
                  ></InputToolBar>
                </el-header>
                <el-main class="input-box-main">
                  <div
                    v-if="isNotInGroup"
                    style="
                      height: 100%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      font-size: 14px;
                      color: gray;
                      user-select: text;
                    "
                  >
                    您已离开该群或群已被解散
                  </div>
                  <InputEditor
                    v-else
                    ref="inputEditorRef"
                    :sessionId="selectedSessionId"
                    :draft="selectedSession.draft || ''"
                    @saveLocalMsg="handleLocalMsg"
                    @sendMessage="handleSendMessage"
                  ></InputEditor>
                </el-main>
              </el-container>
              <DragLine
                direction="top"
                :min="inputBoxHeightMin"
                :max="inputBoxHeightMax"
                :origin-size="inputBoxHeight"
                @drag-update="onInputBoxDragUpdate"
              ></DragLine>
            </div>
          </div>
          <MessageGroupRightSide
            :sessionId="selectedSessionId"
            @showGroupCard="onShowGroupCard"
            @openSession="onOpenSession"
          ></MessageGroupRightSide>
        </el-main>
      </el-container>
    </el-main>
  </el-container>
  <EditDialog
    :isShow="isShowUpdateMarkDialog"
    :title="'修改备注：'"
    :titleExt="titleForUpdateMark"
    :placeholder="'请输入备注'"
    :defaultInput="messageData.sessionList[showMenuSessionId]?.mark || ''"
    @close="isShowUpdateMarkDialog = false"
    @confirm="onUpdateMarkConfirm"
  ></EditDialog>
  <SelectUserDialog
    v-model="isShowSelectDialog"
    :options="selectDialogOptions"
    :defaultSelected="defaultSelectedOptionIds"
    :searchModel="'server'"
    @showUserCard="onShowUserCard"
    @confirm="onConfirmSelect"
  >
    <template #title>
      <div style="font-size: 16px; font-weight: bold; white-space: nowrap">创建群组</div>
    </template>
  </SelectUserDialog>
  <SelectSessionDialog
    v-model:isShow="isShowForwardMsgDialog"
    :sessionListSortedKey="sessionListSortedKey"
    @showUserCard="onShowUserCard"
    @showGroupCard="onShowGroupCard"
    @confirm="handleConfirmForwardMsg"
    @close="handleCloseForwardMsg"
  >
    <template #title>
      <div style="font-size: 16px; font-weight: bold; white-space: nowrap">
        {{ showForwardMsgDialogTitle }}
      </div>
    </template>
  </SelectSessionDialog>
</template>

<style lang="scss" scoped>
.msg-container-hole {
  height: 100%;
  user-select: none;

  .msg-aside {
    height: 100%;
    position: relative;

    .msg-aside-main {
      width: 100%;
      height: 100%;
      display: flex; // 需要flex布局，否则session-list的滚动条会有问题
      flex-direction: column;
      overflow: hidden; // 禁用它的滚动条

      .header {
        padding: 10px 10px 9px 0;
        display: flex;
        align-items: center;
      }

      .context-menu-container {
        height: 100%;
        overflow: hidden;

        .session-list {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0; // 防止右键点击到两个sessionItem中间的真空地带，造成弹出的菜单不能准确找到到session
          overflow-y: scroll;
        }
      }
    }
  }

  .msg-box {
    padding: 0;
    display: flex;
    justify-content: center;
    overflow: hidden; // 禁用它的滚动条

    .backgroup {
      display: flex;
      flex-direction: column;
      justify-content: center;

      .backgroup-image {
        width: 600px;
        height: 400px;
      }

      .welcome {
        text-align: center;
        color: #409eff;
        font-size: 40px;
        font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
      }
    }

    .container {
      width: 100%;
      height: 100%;

      .header {
        width: 100%;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .show-name-id {
          display: flex;
          justify-content: center;
          align-items: center;
          user-select: text;
          cursor: pointer;

          .show-name {
            max-width: 300px;
            font-size: 16px;
            font-weight: bold;
          }

          .show-id {
            margin-left: 10px;
            font-size: 14px;
            color: gray;
          }
        }

        .action-set {
          min-width: 200px;

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

      .body {
        width: 100%;
        height: 100%;
        padding: 0;
        display: flex;

        .show-main {
          display: flex;
          flex-direction: column;
          flex: 1;

          .show-message-box {
            display: flex;
            flex: 1;
            overflow: hidden;
            position: relative;

            .show-loading {
              width: 100%;
              height: 30px;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              color: #409eff;
              font-size: 14px;
            }

            .no-more-message {
              width: 100%;
              height: 30px;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 14px;
              color: gray;
              user-select: text;
            }

            .message-main {
              width: 100%;
              padding: 10px;
              overflow-y: scroll; // 用它的滚动条

              .selection-box {
                position: absolute;
                background-color: rgba(0, 0, 0, 0.1);
                pointer-events: none;
                z-index: 1000;
              }

              .message-item-wrapper {
                transition: background-color 1s ease;
              }

              .highlighted {
                background-color: #f8e3c5;
                transition: background-color 1s ease;
              }
            }

            .return-bottom {
              position: absolute;
              left: 0px;
              bottom: -40px;
              transition: bottom 1s ease-in-out;

              &.showIt {
                bottom: -2px;
              }
            }

            .bottom-tips {
              position: absolute;
              right: 0%;
              bottom: -40px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
              transition: bottom 1s ease-in-out;

              &.showIt {
                bottom: -2px;
              }
            }

            .top-tips {
              position: absolute;
              right: 0%;
              top: -40px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
              transition: top 1s ease-in-out;

              &.showIt {
                top: -2px;
              }
            }

            .at-tips {
              width: fit-content; /* 宽度根据内容自适应 */
              position: absolute;
              left: 0; /* 左侧贴紧父容器 */
              right: 0; /* 右侧贴紧父容器 */
              bottom: 0; /* 底部贴紧父容器 */
              margin: 0 auto; /* 水平居中 */
              display: flex;
              align-items: center;
              padding: 6px 16px 6px 16px;
              color: #fff;
              font-size: 14px;
              background-color: #409eff;
              border-radius: 20px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
              cursor: pointer;
            }

            /* 进入动画的初始状态 */
            .fade-slide-enter-from {
              opacity: 0;
              transform: translateY(20px);
            }

            /* 离开动画的最终状态 */
            .fade-slide-leave-to {
              opacity: 0;
              transform: translateY(20px);
            }

            /* 动画过程 */
            .fade-slide-enter-active,
            .fade-slide-leave-active {
              transition: all 1s ease;
            }

            /* 保持最终状态 */
            .fade-slide-enter-to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .input-box {
            width: 100%;
            display: flex;
            position: relative;

            .input-box-header {
              width: 100%;
              height: auto;
              padding: 0;
              position: relative;
            }

            .input-box-main {
              width: 100%;
              padding: 0;
            }
          }
        }
      }
    }
  }
}
</style>
