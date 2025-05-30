<script setup lang="jsx">
import { ref, computed, watch, createApp, h, nextTick } from 'vue'
import { ElLoading, ElMessage } from 'element-plus'
import { Close, Filter, Search } from '@element-plus/icons-vue'
import {
  useUserStore,
  useUserCardStore,
  useGroupStore,
  useMessageStore,
  useImageStore,
  useAudioStore,
  useVideoStore,
  useDocumentStore
} from '@/stores'
import { showTimeFormat, jsonParseSafe, baseMatch } from '@/js/utils/common'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { el_loading_options } from '@/const/commonConst'
import { userQueryService } from '@/api/user'
import router from '@/router'
import { BEGIN_MSG_ID, msgContentType } from '@/const/msgConst'
import MsgBoxRecording from '@/views/message/components/MsgBoxRecording.vue'
import MsgBoxImage from '@/views/message/components/MsgBoxImage.vue'
import MsgBoxAudio from '@/views/message/components/MsgBoxAudio.vue'
import MsgBoxVideo from '@/views/message/components/MsgBoxVideo.vue'
import MsgBoxDocument from '@/views/message/components/MsgBoxDocument.vue'
import DialogForMsgForward from '@/views/message/components/DialogForMsgForward.vue'
import HashNoData from '@/components/common/HasNoData.vue'
import { emojis } from '@/js/utils/emojis'
import { msgChatHistoryService, msgChatQueryMessagesService } from '@/api/message'
import { imageTypes, quoteTypes, showSimplifyMsgContent } from '@/js/utils/message'
import { MsgType } from '@/proto/msg'

const props = defineProps(['isShow', 'sessionId'])
const emit = defineEmits(['update:isShow', 'showUserCard', 'close'])

const userData = useUserStore()
const userCardData = useUserCardStore()
const groupData = useGroupStore()
const messageData = useMessageStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()

const tabOption = ref('all')
const forwardMsgs = ref({})
const quoteMsg = ref({})
const isFilter = ref(false)
const keyword = ref('')
const timeRange = ref([])

const elTabOptions = [
  { label: '全部', name: 'all' },
  { label: '图片', name: 'image' },
  { label: '语音', name: 'recording' },
  { label: '音频', name: 'audio' },
  { label: '视频', name: 'video' },
  { label: '文件', name: 'document' },
  { label: '@我', name: 'at' },
  { label: '引用', name: 'quote' },
  { label: '聊天记录', name: 'forward' }
]

const timeRangeShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    }
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      return [start, end]
    }
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 3)
      return [start, end]
    }
  },
  {
    text: '最近半年',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setMonth(start.getMonth() - 6)
      return [start, end]
    }
  }
]

/**
 * 切换session时要强制关闭：比如点击列表中头像 => 弹出的UserCard => 点击发送消息按钮
 */
watch(
  () => router.currentRoute.value.query.sessionId,
  () => {
    onClose()
  }
)

const initConfig = () => {
  isFilter.value = false
  endIndex.value = step
  keyword.value = ''
  timeRange.value = []
  pullDoneFlag.value = false
  isAtbottom.value = false

  nextTick(() => {
    const element = document.querySelector(`#dialog-msg-item-container-${tabOption.value}`)
    element.scrollTo({
      top: 0,
      behavior: 'instant'
    })
  })
}

const initData = () => {
  historyMsgsAll.value = []
  historyMsgsImage.value = []
  historyMsgsRecording.value = []
  historyMsgsAudio.value = []
  historyMsgsVideo.value = []
  historyMsgsDocument.value = []
  historyMsgsAt.value = []
  historyMsgsQuote.value = []
  historyMsgsForward.value = []
}

watch(
  () => props.isShow,
  async (newValue) => {
    // 打开历史消息界面
    if (newValue) {
      tabOption.value = 'all'
      initConfig()
      initData()

      const msgs = messageData.msgRecordsList[props.sessionId]
      if (msgs) {
        historyMsgsAll.value = Object.values(msgs).sort((a, b) => {
          const timeA = new Date(a.sendTime || a.msgTime).getTime()
          const timeB = new Date(b.sendTime || b.msgTime).getTime()
          return timeB - timeA
        })
        nextTick(() => {
          loadRelatedMsg()
        })
      }
    }
  }
)

const tabContentTypes = computed(() => {
  switch (tabOption.value) {
    case 'all':
      return [0]
    case 'image':
      return imageTypes()
    case 'recording':
      return [msgContentType.RECORDING]
    case 'audio':
      return [msgContentType.AUDIO]
    case 'video':
      return [msgContentType.VIDEO]
    case 'document':
      return [msgContentType.DOCUMENT]
    case 'at':
      return [msgContentType.AT]
    case 'quote':
      return quoteTypes()
    case 'forward':
      return [msgContentType.FORWARD]
    default:
      return [0]
  }
})

const historyMsgsAll = ref([])
const historyMsgsImage = ref([])
const historyMsgsRecording = ref([])
const historyMsgsAudio = ref([])
const historyMsgsVideo = ref([])
const historyMsgsDocument = ref([])
const historyMsgsAt = ref([])
const historyMsgsQuote = ref([])
const historyMsgsForward = ref([])

const historyMsgs = computed(() => {
  switch (tabOption.value) {
    case 'all':
      return historyMsgsAll.value
    case 'image':
      return historyMsgsImage.value
    case 'recording':
      return historyMsgsRecording.value
    case 'audio':
      return historyMsgsAudio.value
    case 'video':
      return historyMsgsVideo.value
    case 'document':
      return historyMsgsDocument.value
    case 'at':
      return historyMsgsAt.value
    case 'quote':
      return historyMsgsQuote.value
    case 'forward':
      return historyMsgsForward.value
    default:
      return []
  }
})

const historyMsgsShow = computed(() => {
  // 过滤关键字
  let data
  if (!keyword.value) {
    data = historyMsgs.value
  } else {
    data = historyMsgs.value.filter((msg) => {
      const arr = jsonParseSafe(msg.content)
      // 不允许非结构化的content
      if (!arr || !Array.isArray(arr) || arr.length === 0) {
        return false
      }

      for (const item of arr) {
        if (!item.type || !item.value) {
          continue
        }

        switch (item.type) {
          case msgContentType.TEXT:
            if (baseMatch(item.value, keyword.value)) {
              return true
            } else {
              continue
            }
          case msgContentType.EMOJI:
            continue
          case msgContentType.SCREENSHOT:
            continue
          case msgContentType.AT:
            continue
          case msgContentType.QUOTE:
            continue

          case msgContentType.IMAGE:
            if (baseMatch(imageData.image[item.value].fileName, keyword.value)) {
              return true
            } else {
              continue
            }
          case msgContentType.RECORDING:
            continue
          case msgContentType.AUDIO:
            if (baseMatch(audioData.audio[item.value].fileName, keyword.value)) {
              return true
            } else {
              continue
            }
          case msgContentType.VIDEO:
            if (baseMatch(videoData.video[item.value].fileName, keyword.value)) {
              return true
            } else {
              continue
            }
          case msgContentType.DOCUMENT:
            if (baseMatch(documentData.document[item.value].fileName, keyword.value)) {
              return true
            } else {
              continue
            }
          case msgContentType.FORWARD:
            continue
          default:
            continue
        }
      }

      return false
    })
  }

  return data.slice(0, endIndex.value)
})

const historyMsgsAddData = async (list) => {
  await messageData.preloadResource(list)

  for (const item of list) {
    historyMsgs.value.push(item)
  }

  historyMsgs.value.sort((a, b) => {
    const timeA = new Date(a.sendTime || a.msgTime).getTime()
    const timeB = new Date(b.sendTime || b.msgTime).getTime()
    return timeB - timeA
  })

  await loadRelatedMsg()
}

/**
 * 加载引用消息和聊天记录中的消息
 */
const loadRelatedMsg = async () => {
  for (const msg of historyMsgs.value) {
    const content = msg.content
    const arr = jsonParseSafe(content)
    if (!arr || !Array.isArray(arr) || arr.length === 0) {
      continue
    }

    for (const item of arr) {
      if (item.type === msgContentType.QUOTE) {
        if (quoteMsg.value[msg.msgId]) {
          continue
        }

        // 先从本地消息缓存中获取
        const msgFromStore = messageData.getMsg(msg.sessionId, item.value.msgId)
        if (!msgFromStore.msgId) {
          // 如果本地消息缓存中没有，再去服务器查询
          const res = await msgChatQueryMessagesService({
            sessionId: msg.sessionId,
            msgIds: item.value.msgId
          })

          if (res.data.data && res.data.data.length > 0) {
            quoteMsg.value[msg.msgId] = res.data.data[0]
          }
        } else {
          quoteMsg.value[msg.msgId] = msgFromStore
        }
      } else if (item.type === msgContentType.FORWARD) {
        if (forwardMsgs.value[msg.msgId] && forwardMsgs.value[msg.msgId].length > 0) {
          continue
        } else {
          forwardMsgs.value[msg.msgId] = []
        }

        const forwatdMsgIds = item.value.data.map((item) => item.msgId)
        const toQueryMsgIds = []
        for (const msgId of forwatdMsgIds) {
          // 先从本地消息缓存中获取
          const msgFromStore = messageData.getMsg(item.value.sessionId, msgId)
          if (!msgFromStore.msgId) {
            // 如果本地消息缓存中没有，再去服务器查询
            toQueryMsgIds.push(msgId)
          } else {
            forwardMsgs.value[msg.msgId].push(msgFromStore)
          }
        }

        if (toQueryMsgIds.length > 0) {
          const res = await msgChatQueryMessagesService({
            sessionId: item.value.sessionId,
            msgIds: toQueryMsgIds.join(',')
          })
          res.data.data.forEach((item) => {
            forwardMsgs.value[msg.msgId].push(item)
          })
        }
      }
    }
  }
}

const usersInfo = computed(() => {
  const session = messageData.sessionList[props.sessionId]
  if (session.sessionType === MsgType.CHAT) {
    return {
      [myAccount.value]: userData.user,
      [session.objectInfo.account]: session.objectInfo
    }
  } else if (session.sessionType === MsgType.GROUP_CHAT) {
    const groupId = session.remoteId
    const members = groupData.groupMembersList[groupId]
    return members
  } else {
    return {}
  }
})

const myAccount = computed(() => {
  return userData.user.account
})

const renderContent = ({ msg }) => {
  const content = msg.content
  const msgId = msg.msgId
  const arr = jsonParseSafe(content)
  // 不允许非结构化的content
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return <span></span>
  }

  return arr.map((item) => {
    if (!item.type || !item.value) {
      return <span></span>
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
        return renderQuote(item.value, msgId)

      case msgContentType.IMAGE:
        return renderImage(item.value)
      case msgContentType.RECORDING:
        return renderRecording(item.value)
      case msgContentType.AUDIO:
        return renderAudio(item.value)
      case msgContentType.VIDEO:
        return renderVideo(item.value, msgId)
      case msgContentType.DOCUMENT:
        return renderDocument(item.value)
      case msgContentType.FORWARD:
        return renderForward(item.value, msgId)
      default:
        return <span></span>
    }
  })
}

const renderText = (text) => {
  return <span>{text}</span>
}

const renderRecording = (audioId) => {
  const url = audioData.audio[audioId]?.downloadUrl
  const duration = audioData.audio[audioId]?.duration
  if (url) {
    return <MsgBoxRecording audioUrl={url} duration={duration}></MsgBoxRecording>
  } else {
    return <span>{'[语音]'}</span>
  }
}

const renderAudio = (audioId) => {
  const url = audioData.audio[audioId]?.downloadUrl
  if (url) {
    return (
      <MsgBoxAudio
        url={url}
        fileName={audioData.audio[audioId].fileName}
        size={audioData.audio[audioId].size}></MsgBoxAudio>
    )
  } else {
    return <span>{`[${audioId}]`}</span>
  }
}

const renderEmoji = (emojiId) => {
  const url = emojis[emojiId]
  if (url) {
    return <img class={'emoji'} src={url} alt={emojiId} title={emojiId.slice(1, -1)}></img>
  } else {
    return <span>{emojiId}</span>
  }
}

const renderImage = (imgId, isScreenShot = false) => {
  if (imageData.image[imgId]) {
    imageData.setImageInSession(props.sessionId, imageData.image[imgId])
    return (
      <MsgBoxImage
        sessionId={props.sessionId}
        imgId={imgId}
        isScreenShot={isScreenShot}
        thumbWidth={imageData.image[imgId].thumbWidth}
        thumbHeight={imageData.image[imgId].thumbHeight}></MsgBoxImage>
    )
  } else {
    return <span>{`[${imgId}]`}</span>
  }
}

const renderVideo = (videoId, msgId) => {
  const url = videoData.video[videoId]?.downloadUrl
  if (url) {
    return (
      <MsgBoxVideo
        msgId={msgId + '-' + new Date().getTime().toString()} // 加个时间戳，避免视频播放组件的id冲突
        videoId={videoId}
        url={url}
        fileName={videoData.video[videoId].fileName}
        size={videoData.video[videoId].size}
        width={videoData.video[videoId].width}
        height={videoData.video[videoId].height}></MsgBoxVideo>
    )
  } else {
    return <span>{`[${videoId}]`}</span>
  }
}

const renderDocument = (documentId) => {
  const url = documentData.document[documentId]?.downloadUrl
  if (url) {
    return (
      <MsgBoxDocument
        url={url}
        fileName={documentData.document[documentId].fileName}
        fileSize={documentData.document[documentId].size}
        contentType={documentData.document[documentId].documentType}></MsgBoxDocument>
    )
  } else {
    return <span>{`[${documentId}]`}</span>
  }
}

const renderForward = (forwardContent, msgId) => {
  const msgs = forwardMsgs.value[msgId]
  if (!msgs) {
    return <div class={'forward-together'}></div>
  }

  // forwardContent(取里面的nickName) 和 msgs合一
  const newMsgs = {}
  msgs.forEach((item) => {
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

  if (!msgsSorted) {
    return <div class={'forward-together'}></div>
  }

  const title = '聊天记录'

  return (
    <div
      class={'forward-together'}
      onClick={() => {
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
              tier: 0,
              onClose: () => {
                app.unmount()
                document.body.removeChild(container)
              }
            })
          }
        })
        // 挂载到新创建的容器
        app.mount(container)
      }}>
      <div class={'main'}>
        <span class={'title'}>{title}</span>
        <div class={'msg-list'}>
          {msgsSorted.map((msg, index) => {
            return (
              <div key={index} class={'msg-item'}>
                <span class={'msg-item-nickname'}>{msg.nickName || msg.fromId}</span>
                <span>{'：'}</span>
                <span class={'msg-item-content'}>{showSimplifyMsgContent(msg.content)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <span class={'footer bdr-t'}>{`查看${msgsSorted.length}条转发消息`}</span>
    </div>
  )
}

const renderAt = (atContent) => {
  return <span>{`@${atContent.nickName} `}</span>
}

const renderQuote = (quoteContent, msgId) => {
  const { nickName } = quoteContent
  const { content, msgTime } = quoteMsg.value[msgId]
    ? quoteMsg.value[msgId]
    : { content: '', msgTime: '' }
  // 和InputEditor.vue中的结构保持一致，使用相同class可以复用样式
  return (
    <div class={'quote-block'}>
      <div class={'quote-wrapper'}>
        <div class={'quote-sender'}>
          <span class="quote-nickName">{nickName}</span>
          <span class={'quote-msgTime'}>{` ${showTimeFormat(msgTime)}：`}</span>
        </div>
        <span class={'quote-content'}>{showSimplifyMsgContent(content)}</span>
      </div>
    </div>
  )
}

const onClose = () => {
  emit('update:isShow', false)
  emit('close')
}

const onShowUserCard = (account) => {
  const loadingInstance = ElLoading.service(el_loading_options)
  if (myAccount.value === account) {
    userData
      .updateUser()
      .then(() => {
        userCardData.setUserInfo(userData.user)
        userCardData.setIsShow(true)
      })
      .finally(() => {
        loadingInstance.close()
      })
  } else {
    userQueryService({ account: account })
      .then((res) => {
        userCardData.setUserInfo(res.data.data)
        userCardData.setIsShow(true)
      })
      .finally(() => {
        loadingInstance.close()
      })
  }
}

const pullDoneFlag = ref(false) // 消息拉取是否结束
const isAtbottom = ref(false) // 消息是否到达底部
const isLoadingMsg = ref(false) // 是否正在加载消息
const step = 10
const endIndex = ref(step)

const loadTipsStr = computed(() => {
  if (pullDoneFlag.value) {
    return '没有更多消息了'
  } else if (isLoadingMsg.value) {
    return '加载中...'
  } else {
    return '加载更多'
  }
})

const pullMsg = async () => {
  if (pullDoneFlag.value) {
    return
  }

  const endMsgId =
    historyMsgs.value.length > 0 ? historyMsgs.value[historyMsgs.value.length - 1].msgId : 0
  if (endMsgId === BEGIN_MSG_ID) {
    return
  }

  const pageSize = 30
  const params = {
    sessionId: props.sessionId,
    pageSize,
    ...(tabOption.value !== 'all' && { contentTypes: tabContentTypes.value.join(',') }),
    ...(endMsgId && { endMsgId }),
    ...(timeRange.value &&
      timeRange.value.length > 1 && {
        startTime: timeRange.value[0].getTime(),
        endTime: timeRange.value[1].getTime()
      })
  }
  const loadingInstance = ElLoading.service(el_loading_options)
  isLoadingMsg.value = true
  try {
    const res = await msgChatHistoryService(params)
    const list = res.data.data.msgList
    const totalCount = res.data.data.count
    if (totalCount > 0) {
      await historyMsgsAddData(list)
      isAtbottom.value = false
    }

    // 如果totalCount比pageSize少，说明服务器没有更多数据了
    if (totalCount < pageSize) {
      pullDoneFlag.value = true
    }

    if (list.length > step) {
      endIndex.value += step
    } else {
      endIndex.value += list.length
    }
  } finally {
    isLoadingMsg.value = false
    loadingInstance.close()
  }
}

let noMoreMsgTipsTimer = null
const handleListWheel = (tab) => {
  const element = document.querySelector(`#dialog-msg-item-container-${tab}`)
  const clientHeight = element.clientHeight // 容器高度
  const scrollHeight = element.scrollHeight // 滚动条高度
  const scrollTop = element.scrollTop // 当前滚动位置
  const isScrollAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 判断是否滚动到底部, 10个像素点误差

  if (isScrollAtBottom) {
    isAtbottom.value = true
    const diff = historyMsgs.value.length - endIndex.value
    if (diff >= step) {
      endIndex.value += step
    } else if (diff < step && diff > 0) {
      endIndex.value = historyMsgs.value.length
    } else if (diff <= 0 && !isLoadingMsg.value && !pullDoneFlag.value) {
      pullMsg()
    } else if (pullDoneFlag.value) {
      clearTimeout(noMoreMsgTipsTimer)
      noMoreMsgTipsTimer = setTimeout(() => {
        ElMessage.warning('没有更多消息了')
      }, 300)
    }
  } else {
    isAtbottom.value = false
  }
}

const onTabChange = async () => {
  initConfig()

  if (historyMsgs.value.length === 0) {
    await pullMsg()
  }
}

const handleConfirmTimeFilter = async () => {
  initData()
  endIndex.value = step
  pullDoneFlag.value = false
  isAtbottom.value = false
  await pullMsg()

  setTimeout(() => {
    const element = document.querySelector(`#dialog-msg-item-container-${tabOption.value}`)
    element.scrollTo({
      top: 0,
      behavior: 'instant'
    })
  }, 100)
}
</script>

<template>
  <div class="dialog-msg-history-wrapper">
    <el-dialog
      class="dialog-msg-history"
      :model-value="props.isShow"
      :modal="false"
      draggable
      :width="'800px'"
      :top="'20vh'"
      :z-index="1000"
      :style="{
        minHeight: '720px'
      }"
      :show-close="false"
      @closed="onClose"
    >
      <template #header>
        <span class="title bdr-b">历史消息</span>
        <el-icon class="close-button" @click="onClose"><Close /></el-icon>
      </template>

      <el-tabs v-model="tabOption" type="card" @tab-change="onTabChange">
        <el-tab-pane
          v-for="(item, index) in elTabOptions"
          :key="index"
          :label="item.label"
          :name="item.name"
        >
          <div
            v-if="item.name === tabOption"
            class="dialog-msg-item-container"
            :class="{ 'my-scrollbar': historyMsgsShow.length > 0 }"
            :id="`dialog-msg-item-container-${item.name}`"
            @wheel="handleListWheel(item.name)"
          >
            <div v-for="item in historyMsgsShow" :key="item.msgId" class="dialog-msg-item">
              <div class="dialog-msg-item-avatar">
                <UserAvatarIcon
                  class="avatar-message-item"
                  :size="'small'"
                  :showId="item.fromId"
                  :showName="usersInfo[item.fromId].nickName"
                  :showAvatarThumb="usersInfo[item.fromId].avatarThumb"
                  @click="onShowUserCard(item.fromId)"
                ></UserAvatarIcon>
              </div>
              <div class="dialog-msg-item-main">
                <div class="dialog-msg-item-header">
                  <div class="dialog-msg-item-nickname">{{ usersInfo[item.fromId].nickName }}</div>
                  <div class="dialog-msg-item-time">{{ showTimeFormat(item.msgTime) }}</div>
                </div>
                <div class="dialog-msg-item-body">
                  <div class="dialog-msg-item-content">
                    <renderContent :msg="item" />
                  </div>
                </div>
              </div>
            </div>
            <HashNoData v-if="historyMsgsShow.length === 0" :size="100"></HashNoData>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-button
        class="filter-cion"
        :type="isFilter ? 'primary' : 'default'"
        :icon="Filter"
        title="过滤"
        circle
        @click="isFilter = !isFilter"
      />

      <div v-if="isFilter" class="filters">
        <div class="filter-keyword filter-item">
          <el-input
            v-model.trim="keyword"
            placeholder="搜索：关键字"
            :prefix-icon="Search"
            :clearable="true"
          />
        </div>

        <div class="filter-time filter-item">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            :shortcuts="timeRangeShortcuts"
            range-separator="到"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            @change="handleConfirmTimeFilter"
          />
        </div>

        <el-icon class="close-button" @click="isFilter = false"><Close /></el-icon>
      </div>

      <div
        v-if="isAtbottom"
        class="load-tips"
        :style="{
          cursor: pullDoneFlag ? 'default' : 'pointer',
          color: pullDoneFlag ? 'gray' : '#409eff'
        }"
        @click="pullMsg()"
      >
        {{ loadTipsStr }}
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.dialog-msg-history-wrapper {
  :deep(.el-dialog) {
    .el-dialog__header {
      position: relative;
      .title {
        width: 100%;
        display: flex;
        justify-content: center;
        padding-bottom: 16px;
        font-size: 16px;
      }

      .close-button {
        width: 16px;
        height: 16px;
        color: gray;
        position: absolute;
        top: 0;
        right: 0;
        background: none;
        border: none;
        cursor: pointer;
        z-index: 1;

        &:hover {
          color: #409eff;
        }
      }
    }
  }

  .dialog-msg-history {
    position: relative;

    .my-scrollbar {
      overflow-y: scroll;
    }

    .dialog-msg-item-container {
      height: 560px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 5px;

      .dialog-msg-item {
        display: flex;
        gap: 5px;

        .dialog-msg-item-main {
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .dialog-msg-item-header {
            display: flex;
            gap: 5px;
            font-size: 12px;
          }
          .dialog-msg-item-body {
            display: flex;

            .dialog-msg-item-content {
              padding: 8px;
              border-radius: 10px;
              border-top-left-radius: 0;
              border-top-right-radius: 10px;
              background-color: #dedfe0;
              user-select: text;
            }
          }
        }
      }
    }

    .filter-cion {
      position: absolute;
      right: 20px;
      top: 80px;
      cursor: pointer;
    }

    .filters {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: absolute;
      left: calc(50% - 234px);
      top: 150px;
      padding: 24px 24px 16px 24px;
      box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
      border-radius: 5px;
      background-color: #f5f5f5;
      .filter-time {
        :deep(.el-input__wrapper) {
          border-radius: 25px;
        }
      }

      .filter-keyword {
        :deep(.el-input__wrapper) {
          border-radius: 25px;
        }
      }

      .close-button {
        width: 16px;
        height: 16px;
        color: gray;
        position: absolute;
        top: 4px;
        right: 4px;
        background: none;
        border: none;
        cursor: pointer;
        z-index: 1;

        &:hover {
          color: #409eff;
        }
      }
    }

    .load-tips {
      width: 120px;
      display: flex;
      justify-content: center;
      position: absolute;
      left: calc(50% - 60px);
      bottom: 5px;
      cursor: pointer;
      color: #409eff;
    }
  }
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
