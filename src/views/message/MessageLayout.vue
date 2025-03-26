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
import DragLine from '@/components/common/DragLine.vue'
import SearchBox from '@/components/search/SearchBox.vue'
import AddButton from '@/components/common/AddButton.vue'
import SessionItem from '@/views/message/components/SessionItem.vue'
import InputToolBar from '@/views/message/components/InputToolBar.vue'
import InputEditor from '@/views/message/components/InputEditor.vue'
import MessageItem from '@/views/message/components/MessageItem.vue'
import SessionTag from '@/views/message/components/SessionTag.vue'
import SelectUserDialog from '@/components/common/SelectUserDialog.vue'
import {
  userStore,
  settingStore,
  messageStore,
  userCardStore,
  groupCardStore,
  groupStore
} from '@/stores'
import backgroupImage from '@/assets/svg/messagebx_bg.svg'
import {
  msgChatPullMsgService,
  msgChatCreateSessionService,
  msgChatQuerySessionService
} from '@/api/message'
import { groupInfoService, groupCreateService } from '@/api/group'
import { MsgType } from '@/proto/msg'
import wsConnect from '@/js/websocket/wsConnect'
import { onReceiveChatMsg, onReceiveGroupChatMsg, onReceiveGroupSystemMsg } from '@/js/event'
import { userQueryService } from '@/api/user'
import { ElLoading, ElMessage } from 'element-plus'
import { el_loading_options } from '@/const/commonConst'
import { combineId, sessionIdConvert } from '@/js/utils/common'
import SessionMenu from '@/views/message/components/SessionMenu.vue'
import router from '@/router'
import { BEGIN_MSG_ID, msgContentType, msgSendStatus } from '@/const/msgConst'
import EditDialog from '@/components/common/EditDialog.vue'
import AddOprMenu from '@/views/message/components/AddOprMenu.vue'
import MessageGroupRightSide from '@/views/message/components/MessageGroupRightSide.vue'
import HashNoData from '@/components/common/HasNoData.vue'
import InputRecorder from '@/views/message/components/InputRecorder.vue'
import { playMsgSend } from '@/js/utils/audio'

const userData = userStore()
const settingData = settingStore()
const messageData = messageStore()
const userCardData = userCardStore()
const groupCardData = groupCardStore()
const groupData = groupStore()
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

// 消息拉取是否结束
const pullMsgDone = computed(() => {
  return selectedSession.value.pullMsgDone || false
})

const msgIdSortArray = computed(() => {
  return messageData.msgIdSortArray[selectedSessionId.value]
})

// 缓存的消息列表是否为空，注意和hasNoMoreMsg的区别
const noMsg = computed(() => {
  return msgIdSortArray.value?.length === 0
})
// 当前session的第一条消息ID
const firstMsgId = computed(() => {
  if (!noMsg.value) {
    return msgIdSortArray.value[0]
  } else {
    return 0
  }
})
// 当前session的最后一条消息ID
const lastMsgId = computed(() => {
  if (!noMsg.value) {
    const len = msgIdSortArray.value?.length
    return len ? msgIdSortArray.value[len - 1] : 0
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
    const len = msgIdSortArray.value?.length
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
}

const locateSession = (sessionId) => {
  nextTick(() => {
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
  })
}

const msgIdsShow = computed(() => {
  const ids = msgIdSortArray.value?.slice(startIndex.value)
  if (!ids) return []
  return ids
})

let lastReadMsgId = 0
const msgExtend = computed(() => {
  const data = {}
  for (let index = 0; index < msgIdsShow.value.length; index++) {
    const ext = {}
    if (index > 0) {
      const preMsg = messageData.getMsg(selectedSessionId.value, msgIdsShow.value[index - 1])
      // 上一条消息的时间，相邻的时间只出一条tips
      ext['preMsgTime'] = preMsg.msgTime
      // 判断是否是打开session后的第一条未读消息
      if (preMsg.msgId === lastReadMsgId) {
        ext['isFirstNew'] = true
      } else {
        ext['isFirstNew'] = false
      }
    } else {
      ext['preMsgTime'] = null
      ext['isFirstNew'] = false
    }
    data[msgIdsShow.value[index]] = ext
  }
  return data
})

const selectedSession = computed(() => {
  return messageData.sessionList[selectedSessionId.value] || {}
})

onMounted(async () => {
  await messageData.loadSessionList()
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
          const a_msgIds = messageData.msgIdSortArray[a.sessionId]
          const a_msgIds_len = a_msgIds?.length
          if (!a_msgIds_len) return 1
          const a_lastMsg = messageData.getMsg(a.sessionId, a_msgIds[a_msgIds_len - 1])

          const b_msgIds = messageData.msgIdSortArray[b.sessionId]
          const b_msgIds_len = b_msgIds?.length
          if (!b_msgIds_len) return -1
          const b_lastMsg = messageData.getMsg(b.sessionId, b_msgIds[b_msgIds_len - 1])

          const bTime = new Date(b_lastMsg.msgTime).getTime()
          const aTIme = new Date(a_lastMsg.msgTime).getTime()
          if (bTime !== aTIme) {
            return bTime - aTIme
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
      await messageData.addMsgRecords(sessionId, res.data.data.msgList)
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
      if (!groupMembers.value) {
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

    lastReadMsgId = selectedSession.value.readMsgId //保存这个readMsgId,要留给MessageItem用
    handleRead()
  }
}

const handleRead = () => {
  if (selectedSessionId.value && selectedSession.value.readMsgId < lastMsgId.value) {
    const content = lastMsgId.value.toString()
    const msgType =
      selectedSession.value.sessionType === MsgType.CHAT
        ? MsgType.CHAT_READ
        : MsgType.GROUP_CHAT_READ
    wsConnect.sendMsg(selectedSessionId.value, showId.value, msgType, content + '', '', () => {})
    // 更新本地缓存的已读位置
    messageData.updateSession({
      sessionId: selectedSessionId.value,
      readMsgId: content,
      readTime: new Date(),
      unreadCount: 0
    })
  }
}

const handleSendMessage = (content, resendSeq = '') => {
  if (isNotInGroup.value) {
    ElMessage.warning('您已离开该群或群已被解散')
    return
  }
  if (isMutedInGroup.value) {
    ElMessage.warning('您已被禁言，请联系管理员')
    return
  }

  if (inputToolBarRef.value) inputToolBarRef.value.closeWindow()

  const msg = {
    sessionId: selectedSessionId.value,
    fromId: myAccount.value,
    msgType: selectedSession.value.sessionType,
    content: content,
    status: msgSendStatus.PENDING,
    msgTime: new Date(),
    sendTime: new Date()
  }

  const resendInterval = 2000 //2秒
  const before = async (seq, data) => {
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
                setTimeout(async () => {
                  if (msg.status === msgSendStatus.PENDING) {
                    messageData.removeMsgRecord(msg.sessionId, msg.msgId)
                    msg.status = msgSendStatus.FAILED
                    await messageData.addMsgRecords(msg.sessionId, [msg])
                    ElMessage.error('消息发送失败')
                  }
                }, resendInterval)
              }
            }, resendInterval)
          }
        }, resendInterval)
      }
    }, resendInterval)

    messageData.updateSession({
      sessionId: msg.sessionId,
      unreadCount: 0, // 最后一条消息是自己发的，因此未读是0
      draft: '' //草稿意味着要清空
    })
    msg.seq = seq
    msg.msgId = seq //服务器没有回复DELIVERED消息之前，都用seq暂代msgId
    await messageData.addMsgRecords(msg.sessionId, [msg])
  }

  const after = async (msgId) => {
    messageData.updateSession({
      sessionId: msg.sessionId,
      readMsgId: msgId, // 最后一条消息是自己发的，因此已读更新到刚发的这条消息的msgId
      readTime: new Date()
    })
    messageData.removeMsgRecord(msg.sessionId, msg.msgId) //移除seq为key的msg
    msg.msgId = msgId
    msg.status = msgSendStatus.OK
    await messageData.addMsgRecords(msg.sessionId, [msg]) //添加服务端返回msgId为key的msg
    if (!messageData.sessionList[msg.sessionId].dnd) {
      playMsgSend()
    }
  }

  wsConnect.sendMsg(
    msg.sessionId,
    showId.value,
    selectedSession.value.sessionType,
    content,
    resendSeq,
    before,
    after
  )

  capacity.value++
  msgListReachBottom()
  locateSession(msg.sessionId)
}

const handleResendMessage = ({ content, seq }) => {
  handleSendMessage(content, seq)
}

const onLoadMore = async () => {
  const scrollHeight = msgListDiv.value.scrollHeight
  const scrollTop = msgListDiv.value.scrollTop
  if (msgIdSortArray.value?.length <= capacity.value) {
    await pullMsg(msgIdsShow.value[0])
  }
  const len = msgIdSortArray.value?.length
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
  setTimeout(() => {
    msgListDiv.value?.scrollTo({
      top: msgListDiv.value.scrollHeight,
      behavior: behavior
    })
    newMsgTips.value.isShowBottomTips = false
    disToBottom.value = 0
  }, 0)
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
  handleRead()
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

        if (messageData.sessionList[sessionId].sessionType === MsgType.GROUP_CHAT) {
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
 * 监视msgIdsShow的数据变化,给出新消息的tips提示
 */
watch(
  () => msgIdsShow.value,
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

const showAddOprMenu = (e) => {
  addOprMenuRef.value.handleSessionMenu(e)
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
  inputEditorRef.value.addEmoji(key)
}

const onSendImage = ({ objectId }) => {
  handleSendMessage(JSON.stringify({ type: msgContentType.IMAGE, value: objectId }))
}

const onSendAudio = ({ objectId }) => {
  handleSendMessage(JSON.stringify({ type: msgContentType.AUDIO, value: objectId }))
}

const onSendRecording = ({ objectId }) => {
  handleSendMessage(JSON.stringify({ type: msgContentType.RECORDING, value: objectId }))
}

const onSendVideo = ({ objectId }) => {
  handleSendMessage(JSON.stringify({ type: msgContentType.VIDEO, value: objectId }))
}

const onSendDocument = ({ objectId }) => {
  handleSendMessage(JSON.stringify({ type: msgContentType.DOCUMENT, value: objectId }))
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
          <AddOprMenu ref="addOprMenuRef" @selectMenu="onSelectOprMenu">
            <AddButton :size="30" @click="showAddOprMenu($event)"></AddButton>
          </AddOprMenu>
        </div>

        <SessionMenu
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
        </SessionMenu>
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
              >
                <MessageItem
                  v-for="item in msgIdsShow"
                  :key="selectedSessionId + '-' + item"
                  :sessionId="selectedSessionId"
                  :msgId="item"
                  :extend="msgExtend[item]"
                  :obj="getMsgSenderObj(item)"
                  :readMsgId="selectedSession.readMsgId"
                  :remoteRead="selectedSession.remoteRead"
                  :firstMsgId="firstMsgId"
                  :lastMsgId="lastMsgId"
                  :hasNoMoreMsg="hasNoMoreMsg"
                  :isLoadMoreLoading="selectedSessionCache[selectedSessionId]?.isLoadMoreLoading"
                  @loadMore="onLoadMore"
                  @showUserCard="onShowUserCard"
                  @showGroupCard="onShowGroupCard"
                  @resendMsg="handleResendMessage"
                  @loadFinished="updateScroll"
                ></MessageItem>
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
            </div>
            <div class="input-box bdr-t" :style="{ height: inputBoxHeight + 'px' }">
              <el-container v-if="isShowRecorder">
                <InputRecorder
                  ref="inputRecorderRef"
                  :sessionId="selectedSessionId"
                  @exit="isShowRecorder = false"
                  @sendRecording="onSendRecording"
                ></InputRecorder>
              </el-container>
              <el-container v-else class="input-box-container">
                <el-header class="input-box-header">
                  <InputToolBar
                    ref="inputToolBarRef"
                    :sessionId="selectedSessionId"
                    :isShowToolSet="!isNotInGroup"
                    @sendEmoji="onSendEmoji"
                    @sendImage="onSendImage"
                    @sendAudio="onSendAudio"
                    @sendVideo="onSendVideo"
                    @sendDocument="onSendDocument"
                    @showRecorder="onShowRecorder"
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
              transition: bottom 1s ease-in-out;

              &.showIt {
                bottom: -2px;
              }
            }

            .top-tips {
              position: absolute;
              right: 0%;
              top: -40px;
              transition: top 1s ease-in-out;

              &.showIt {
                top: -2px;
              }
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
