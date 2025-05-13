<script setup lang="jsx">
import { ref, onMounted, computed, watch, createApp, h } from 'vue'
import { ElDialog, ElLoading, ElIcon } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import {
  useUserStore,
  useUserCardStore,
  useMessageStore,
  useImageStore,
  useAudioStore,
  useVideoStore,
  useDocumentStore
} from '@/stores'
import { showTimeFormat, jsonParseSafe } from '@/js/utils/common'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { el_loading_options } from '@/const/commonConst'
import { userQueryService } from '@/api/user'
import router from '@/router'
import { msgContentType } from '@/const/msgConst'
import MsgBoxRecording from '@/views/message/components/MsgBoxRecording.vue'
import MsgBoxImage from '@/views/message/components/MsgBoxImage.vue'
import MsgBoxAudio from '@/views/message/components/MsgBoxAudio.vue'
import MsgBoxVideo from '@/views/message/components/MsgBoxVideo.vue'
import MsgBoxDocument from '@/views/message/components/MsgBoxDocument.vue'
import DialogForMsgList from '@/views/message/components/DialogForMsgList.vue'
import { emojis } from '@/js/utils/emojis'
import { MsgType } from '@/proto/msg'
import { msgChatQueryMessagesService } from '@/api/message'

const props = defineProps(['isShow', 'title', 'sessionId', 'msgs', 'tier'])
const emit = defineEmits(['update:isShow', 'showUserCard', 'close'])

const userData = useUserStore()
const userCardData = useUserCardStore()
const messageData = useMessageStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()

const msgsFromServer = ref({})

onMounted(async () => {
  const loadingInstance = ElLoading.service(el_loading_options)
  try {
    await messageData.preloadResource(props.msgs)
    await loadForwardTogetherMsgs()
  } finally {
    loadingInstance.close()
  }
})

/**
 * 切换session时要强制关闭：比如点击列表中头像 => 弹出的UserCard => 点击发送消息按钮
 */
watch(
  () => router.currentRoute.value.query.sessionId,
  () => {
    onClose()
  }
)

const loadForwardTogetherMsgs = async () => {
  for (const msg of props.msgs) {
    const content = msg.content
    const contentJson = jsonParseSafe(content)
    if (!contentJson) {
      return
    }

    const type = contentJson['type']
    const value = contentJson['value']
    if (!type || !value) {
      return
    } else {
      if (type === msgContentType.FORWARD_TOGETHER) {
        let res
        try {
          const msgIds = value.data
            .map((item) => {
              return item.msgId
            })
            .join(',')
          res = await msgChatQueryMessagesService({
            sessionId: value.sessionId,
            msgIds
          })
        } catch (error) {
          console.error(error)
          return
        }

        const msgs = res.data.data
        if (!res.data.data || res.data.data.length == 0) {
          return
        }

        // value.data(取里面的nickName) 和 msgs合一
        const newMsgs = {}
        msgs.forEach((item) => {
          newMsgs[item.msgId] = item
        })
        value.data.forEach((item) => {
          if (item.msgId in newMsgs) {
            newMsgs[item.msgId] = {
              ...newMsgs[item.msgId],
              ...item
            }
          }
        })

        msgsFromServer.value[msg.msgId] = Object.values(newMsgs).sort((a, b) => {
          const timeA = new Date(a.sendTime || a.msgTime).getTime()
          const timeB = new Date(b.sendTime || b.msgTime).getTime()
          return timeA - timeB
        })
      }
    }
  }
}

const myAccount = computed(() => {
  return userData.user.account
})

const isMyAccount = (account) => {
  return myAccount.value === account
}

const renderContent = ({ msg }) => {
  const content = msg.content
  const msgId = msg.msgId
  const msgType = msg.msgType
  const contentJson = jsonParseSafe(content)
  if (!contentJson) {
    return renderMix(content, msgType)
  }

  const type = contentJson['type']
  const value = contentJson['value']
  if (!type || !value) {
    return renderMix(content, msgType)
  }

  switch (type) {
    case msgContentType.MIX:
      return renderMix(value, msgType)
    case msgContentType.TEXT:
      return renderText(value)
    case msgContentType.RECORDING:
      return renderRecording(value)
    case msgContentType.AUDIO:
      return renderAudio(value)
    case msgContentType.IMAGE:
      return renderImage(value)
    case msgContentType.EMOJI:
      return renderEmoji(value)
    case msgContentType.VIDEO:
      return renderVideo(value, msgId)
    case msgContentType.DOCUMENT:
      return renderDocument(value)
    case msgContentType.FORWARD_TOGETHER:
      return renderForwardTogether(msgId)
    default:
      return <span>{content}</span>
  }
}

const renderMix = (content, msgType) => {
  if (!content) return h('div', [])
  let contentArray = []

  // 1. 先匹配quote引用内容
  content.split(/(「\{.*?\}」)/).forEach((item) => {
    if (item.startsWith('「{') && item.endsWith('}」')) {
      // quote引用内容直接添加如数组
      contentArray.push(item)
    } else {
      //2. 匹配内容中的图片
      item.split(/(\{\d+\})/).forEach((item) => {
        //3. 匹配内容中的表情
        item.split(/(\[.*?\])/).forEach((item) => {
          item.split(/(<.*?>)/).forEach((item) => {
            if (item) {
              contentArray.push(item)
            }
          })
        })
      })
    }
  })

  return contentArray.map((item) => {
    if (item.startsWith('{') && item.endsWith('}')) {
      return renderImage(item.slice(1, -1), true)
    } else if (item.startsWith('[') && item.endsWith(']')) {
      return renderEmoji(item.slice(1, -1))
    } else if (item.startsWith('<') && item.endsWith('>')) {
      return renderAt(item.slice(1, -1), msgType)
    } else if (item.startsWith('「{') && item.endsWith('}」')) {
      return renderQuote(item.slice(1, -1))
    } else {
      return <span>{item.trim()}</span>
    }
  })
}

const renderText = (content) => {
  return <span>{content}</span>
}

const renderRecording = (content) => {
  const audioId = content
  const url = audioData.audio[audioId]?.downloadUrl
  const duration = audioData.audio[audioId]?.duration
  if (url) {
    return <MsgBoxRecording audioUrl={url} duration={duration}></MsgBoxRecording>
  } else {
    return <span>{content}</span>
  }
}

const renderAudio = (content) => {
  const audioId = content
  const url = audioData.audio[audioId]?.downloadUrl
  if (url) {
    return (
      <MsgBoxAudio
        url={url}
        fileName={audioData.audio[audioId].fileName}
        size={audioData.audio[audioId].size}
      ></MsgBoxAudio>
    )
  } else {
    return <span>{content}</span>
  }
}

const renderEmoji = (content) => {
  const emojiId = `[${content}]`
  const url = emojis[emojiId]
  if (url) {
    return <img class={'emoji'} src={url} alt={emojiId} title={content}></img>
  } else {
    return <span>{content}</span>
  }
}

const renderImage = (content, isForMix = false) => {
  const imgId = content
  imageData.setImageInSession(props.sessionId, imageData.image[imgId])
  if (imageData.image[imgId]) {
    return (
      <MsgBoxImage
        sessionId={props.sessionId}
        imgId={imgId}
        isForMix={isForMix}
        thumbWidth={imageData.image[imgId].thumbWidth}
        thumbHeight={imageData.image[imgId].thumbHeight}
      ></MsgBoxImage>
    )
  } else {
    return <span>{isForMix ? content : `[${content}]`}</span>
  }
}

const renderVideo = (content, msgId) => {
  const videoId = content
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
        height={videoData.video[videoId].height}
      ></MsgBoxVideo>
    )
  } else {
    return <span>{content}</span>
  }
}

const renderDocument = (content) => {
  const documentId = content
  const url = documentData.document[documentId]?.downloadUrl
  if (url) {
    return (
      <MsgBoxDocument
        url={url}
        fileName={documentData.document[documentId].fileName}
        fileSize={documentData.document[documentId].size}
        contentType={documentData.document[documentId].documentType}
      ></MsgBoxDocument>
    )
  } else {
    return <span>{content}</span>
  }
}

const renderForwardTogether = (msgId) => {
  const title = '聊天记录'
  const msgsSorted = msgsFromServer.value[msgId]

  if (!msgsSorted) {
    return <div class={'forward-together'}></div>
  }

  return (
    <div
      class={'forward-together'}
      onClick={() => {
        // 创建挂载容器
        const container = document.createElement('div')
        document.body.appendChild(container)
        const app = createApp({
          render: () => {
            return h(DialogForMsgList, {
              isShow: true,
              title,
              sessionId: msgsSorted[0].sessionId,
              msgs: msgsSorted,
              tier: (props.tier || 0) + 1,
              onClose: () => {
                app.unmount()
                document.body.removeChild(container)
              }
            })
          }
        })
        // 挂载到新创建的容器
        app.mount(container)
      }}
    >
      <div class={'main'}>
        <span class={'title'}>{title}</span>
        <div class={'msg-list'}>
          {msgsSorted.map((msg, index) => {
            return (
              <div key={index} class={'msg-item'}>
                <span class={'msg-item-nickname'}>{msg.nickName || msg.fromId}</span>
                <span>{'：'}</span>
                <span class={'msg-item-content'}>
                  {showMsgContentInForwardTogether(msg.content)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <span class={'footer bdr-t'}>{`查看${msgsSorted.length}条转发消息`}</span>
    </div>
  )
}

const renderAt = (content, msgType) => {
  const index = content.indexOf('-')
  if (index !== -1) {
    const nickName = content.slice(index + 1)
    if (msgType === MsgType.GROUP_CHAT && nickName) {
      return <span>{`@${nickName} `}</span>
    } else {
      return <span>{`<${content}>`}</span>
    }
  } else {
    return <span>{`<${content}>`}</span>
  }
}

const renderQuote = (quoteContent) => {
  const { nickName, content, msgTime } = jsonParseSafe(quoteContent)
  let showContent = content || ''
  if (content) {
    const defaultContent = content.replace(/<(?:.*?)-(.*?)>/g, '@$1').replace(/\{\d+\}/g, '[图片]')
    showContent = defaultContent
    const contentJson = jsonParseSafe(defaultContent)
    if (contentJson) {
      const type = contentJson['type']
      const objectId = contentJson['value']
      switch (type) {
        case msgContentType.RECORDING:
          showContent = '[语音]'
          break
        case msgContentType.AUDIO:
          showContent = `[音频] ${audioData.audio[objectId].fileName}`
          break
        case msgContentType.IMAGE:
          showContent = `[图片] ${imageData.image[objectId].fileName}`
          break
        case msgContentType.VIDEO:
          showContent = `[视频] ${videoData.video[objectId].fileName}`
          break
        case msgContentType.DOCUMENT:
          showContent = `[文档] ${documentData.document[objectId].fileName}`
          break
        default:
          break
      }
    }
  }

  // 和InputEditor.vue中的结构保持一致，使用相同class可以复用样式
  return (
    <div class={'quote-block'}>
      <div class={'quote-wrapper'}>
        <div class={'quote-sender'}>
          <span class="quote-nickName">{nickName + '  '}</span>
          <span class={'quote-msgTime'}>{msgTime + '：'}</span>
        </div>
        <span class={'quote-content'}>{showContent}</span>
      </div>
    </div>
  )
}

const showMsgContentInForwardTogether = (content) => {
  const jsonContent = jsonParseSafe(content)
  let template
  if (jsonContent && jsonContent['type'] && jsonContent['value']) {
    if (jsonContent['type'] == msgContentType.IMAGE) {
      template = '[图片]'
    } else if (jsonContent['type'] == msgContentType.AUDIO) {
      template = '[音频]'
    } else if (jsonContent['type'] == msgContentType.RECORDING) {
      template = '[语音]'
    } else if (jsonContent['type'] == msgContentType.VIDEO) {
      template = '[视频]'
    } else if (jsonContent['type'] == msgContentType.DOCUMENT) {
      template = '[文件]'
    } else if (jsonContent['type'] == msgContentType.FORWARD_TOGETHER) {
      template = '[聊天记录]'
    } else {
      template = jsonContent['value']
    }
    return template
  } else {
    return content
      .replace(/\{\d+\}/g, '[图片]')
      .replace(/(「\{.*?\}」)/, '[引用]')
      .split(/(<.*?>)/)
      .map((item) => {
        const sliceStr = item.slice(1, -1)
        const index = sliceStr.indexOf('-')
        if (index !== -1) {
          const nickName = sliceStr.slice(index + 1)
          if (nickName) {
            return `@${nickName}`
          } else {
            return item
          }
        }
        return item
      })
      .join('')
  }
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
</script>

<template>
  <div class="dialog-msg-list-wrapper">
    <el-dialog
      class="dialog-msg-list"
      :model-value="props.isShow"
      :modal="false"
      :width="'600px'"
      :top="`${30 + (props.tier || 0)}vh`"
      :z-index="1000"
      :style="{
        minHeight: '360px',
        marginLeft: `calc(50% - 300px + ${props.tier || 0} * 1vw)`
      }"
      :show-close="false"
      @closed="onClose"
    >
      <template #header>
        <span class="title bdr-b">{{ props.title }}</span>
        <el-icon class="close-button" @click="onClose"><Close /></el-icon>
      </template>
      <div class="dialog-msg-item-container my-scrollbar">
        <div
          v-for="item in props.msgs"
          :key="item.msgId"
          class="dialog-msg-item"
          :style="{
            flexDirection: isMyAccount(item.fromId) ? 'row-reverse' : 'row',
            justifyContent: isMyAccount(item.fromId) ? 'end' : 'start'
          }"
        >
          <div class="dialog-msg-item-avatar">
            <UserAvatarIcon
              class="avatar-message-item"
              :size="'small'"
              :showId="item.fromId"
              :showName="item.nickName"
              @click="onShowUserCard(item.fromId)"
            ></UserAvatarIcon>
          </div>
          <div class="dialog-msg-item-main">
            <div
              class="dialog-msg-item-header"
              :style="{
                justifyContent: isMyAccount(item.fromId) ? 'end' : 'start'
              }"
            >
              <div class="dialog-msg-item-nickname">{{ item.nickName }}</div>
              <div class="dialog-msg-item-time">{{ showTimeFormat(item.msgTime) }}</div>
            </div>
            <div
              class="dialog-msg-item-body"
              :style="{
                justifyContent: isMyAccount(item.fromId) ? 'end' : 'start'
              }"
            >
              <div
                class="dialog-msg-item-content"
                :style="{
                  borderTopLeftRadius: isMyAccount(item.fromId) ? '10px' : '0',
                  borderTopRightRadius: isMyAccount(item.fromId) ? '0' : '10px',
                  backgroundColor: isMyAccount(item.fromId) ? '#c6e2ff' : '#dedfe0'
                }"
              >
                <renderContent :msg="item" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.dialog-msg-list-wrapper {
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

  .dialog-msg-list {
    .dialog-msg-item-container {
      max-height: 480px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 5px;
      overflow-y: scroll;

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
            }
          }
        }
      }
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
