<script setup>
import { QuillEditor, Delta, Quill } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { computed, onMounted, onUnmounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import {
  useMessageStore,
  useImageStore,
  useAudioStore,
  useDocumentStore,
  useVideoStore
} from '@/stores'
import { ElMessage } from 'element-plus'
import { emojis } from '@/js/utils/emojis'
import { base64ToFile, jsonParseSafe, showTimeFormat } from '@/js/utils/common'
import { mtsUploadServiceForImage } from '@/api/mts'
import { msgContentType, msgFileUploadStatus, msgSendStatus } from '@/const/msgConst'
import { getMd5 } from '@/js/utils/file'
import { prehandleImage } from '@/js/utils/image'
import { MsgType } from '@/proto/msg'
import AtList from '@/views/message/components/AtList.vue'
import AgreeBeforeSend from '@/views/message/components/AgreeBeforeSend.vue'
import { isMatchMsgStruct, showSimplifyMsgContent } from '@/js/utils/message'
import { msgChatQueryMessagesService } from '@/api/message'

/**
 * 处理复制/粘贴结构化数据
 */
const Clipboard = Quill.import('modules/clipboard')
class PlainClipboard extends Clipboard {
  onPaste(range, data) {
    if (!data.html) {
      handlePaste(range, data.text)
      return
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(data.html, 'text/html')
    const elements = doc.querySelectorAll('[data-quill-custom]') // 查找所有具有 data-quill-custom 属性的元素
    if (elements.length > 0) {
      // 取第一个匹配的元素
      const encodedData = elements[0].getAttribute('data-quill-custom')
      const decodedData = decodeURIComponent(encodedData)
      handlePaste(range, decodedData)
    } else {
      handlePaste(range, data.text) // 降级方案
    }
  }

  onCopy(range) {
    return handleCopy(range)
  }
}
Quill.register(
  {
    'modules/clipboard': PlainClipboard
  },
  true
)

/**
 * 自定义 Blot 处理 @ 提及
 */
const Embed = Quill.import('blots/embed')
class AtMention extends Embed {
  static blotName = 'atMention'
  static tagName = 'span'
  static className = 'at-mention'

  static create({ account, nickName }) {
    const node = super.create()
    node.dataset.account = account
    node.dataset.nickName = nickName
    node.textContent = `@${nickName}`
    return node
  }

  static value(node) {
    return {
      account: node.dataset.account,
      nickName: node.dataset.nickName
    }
  }

  /**
   * 重写 length 方法，让 Blot 长度为 1
   */
  length() {
    return 1
  }
}
Quill.register(AtMention, true)

class QuoteBlock extends Embed {
  static blotName = 'quoteBlock'
  static tagName = 'div'
  static className = 'quote-block'

  constructor(scroll, node) {
    super(scroll, node)
    this.closeBtn = node.querySelector('.quote-close-btn')
    this.handleCloseClick = this.handleCloseClick.bind(this)
    this.closeBtn.addEventListener('click', this.handleCloseClick)
  }

  handleCloseClick(e) {
    e.stopPropagation()
    const index = this.offset() // 当前Blot的位置
    quill.value.deleteText(index, 2) // 删除操作
  }

  remove() {
    // 解绑事件监听器
    if (this.closeBtn) {
      this.closeBtn.removeEventListener('click', this.handleCloseClick)
    }
    super.remove()
  }

  static create({ account, nickName, msgKey, msgId, content, msgTime }) {
    const node = super.create()
    node.dataset.account = account
    node.dataset.nickName = nickName
    node.dataset.msgKey = msgKey
    node.dataset.msgId = msgId
    node.dataset.msgTime = showTimeFormat(msgTime)
    node.dataset.content = content
    node.innerHTML = `
      <div class="quote-wrapper">
        <div class="quote-sender">
          <span class="quote-nickName">${node.dataset.nickName}</span>
          <span class="quote-msgTime">${node.dataset.msgTime}：</span>
        </div>
        <span class="quote-content">${showSimplifyMsgContent(node.dataset.content)}</span>
        <button type="button" class="quote-close-btn">
          <span >&times;</span>
        </button>
      </div>
    `
    return node
  }

  static value(node) {
    return {
      account: node.dataset.account,
      nickName: node.dataset.nickName,
      msgKey: node.dataset.msgKey,
      msgId: node.dataset.msgId,
      content: node.dataset.content,
      msgTime: node.dataset.msgTime
    }
  }

  length() {
    return 1
  }
}

Quill.register(QuoteBlock, true)

const props = defineProps(['sessionId', 'draft'])
const emit = defineEmits(['saveLocalMsg', 'sendMessage'])
const messageData = useMessageStore()
const imageData = useImageStore()
const audioData = useAudioStore()
const documentData = useDocumentStore()
const videoData = useVideoStore()
const inputEditorRef = ref()
const editorRef = ref()
const isShowAtList = ref(false)
const atIndex = ref(0) //记录输入@符号后的光标位置
const atKey = ref('')
const atListOffsetX = ref(0)
const atListOffsetY = ref(0)
const toSendAtList = ref([])
const showAgreeDialog = ref(false)

const session = computed(() => {
  return messageData.sessionList[props.sessionId]
})

const remoteName = computed(() => {
  if (session.value.sessionType === MsgType.CHAT) {
    return session.value.objectInfo.nickName
  } else if (session.value.sessionType === MsgType.GROUP_CHAT) {
    return session.value.objectInfo.groupName
  } else {
    return ''
  }
})

const quill = computed(() => {
  return editorRef.value?.getQuill()
})

onMounted(async () => {
  toSendAtList.value = []
  // 给组件增加滚动条样式
  document.querySelector('.ql-editor').classList.add('my-scrollbar')
  await imageData.preloadImageFromMsg(props.draft)
  await renderContent(props.draft) // 渲染草稿
  quill.value.on('composition-start', () => {
    // 当用户使用拼音输入法开始输入汉字时，这个事件就会被触发
    quill.value.root.dataset.placeholder = ''
  })
  quill.value.on('composition-end', () => {
    // 当用户使用拼音输入法输入完成后，把值恢复成原来的值
    quill.value.root.dataset.placeholder = quill.value.options.placeholder
  })

  // 监听文本变化检测@符号
  quill.value.on('text-change', (delta, oldDelta, source) => {
    if (session.value.sessionType === MsgType.GROUP_CHAT && source === Quill.sources.USER) {
      const insertOps = delta.ops.filter((op) => op.insert && typeof op.insert === 'string')
      const insertContent = insertOps.map((item) => item.insert).join('')
      if (insertContent.length > 0) {
        const lastChar = insertContent[insertContent.length - 1]
        if (lastChar === '@') {
          // 这里可以添加检测到@符号后的逻辑，例如弹出用户选择框等
          isShowAtList.value = true
          atKey.value = ''
          nextTick(() => {
            const selection = quill.value.getSelection()
            const bounds = quill.value.getBounds(selection.index)
            const rect = inputEditorRef.value.getBoundingClientRect()
            atListOffsetX.value = rect.left + bounds.left
            atListOffsetY.value = rect.top + bounds.top
            atIndex.value = getQuillSelectionIndex()
          })
        } else if (insertContent && isShowAtList.value) {
          atKey.value = atKey.value + insertContent
        }
      }

      // 检测删除@
      if (delta.ops.some((op) => op.delete)) {
        // 解析删除操作的起始位置和长度
        let deleteStart = 0
        let deleteLength = 0

        // 处理delta结构（可能包含retain+delete）
        delta.ops.forEach((op) => {
          if (op.retain) {
            deleteStart = op.retain
          }
          if (op.delete) {
            deleteLength = op.delete
          }
        })

        if (deleteStart < atIndex.value) {
          isShowAtList.value = false
        }

        let currentPos = 0
        const deleteEnd = deleteStart + deleteLength

        const getOpLength = (insert) => {
          if (typeof insert === 'string') return insert.length
          if (insert?.atMention) return 1
          if (insert?.image) return 1
          return 0
        }

        toSendAtList.value = []
        // 遍历旧内容，计算操作内容
        oldDelta.ops.forEach((oldOp) => {
          if (currentPos >= deleteEnd) return
          const opLength = getOpLength(oldOp.insert)
          const opEnd = currentPos + opLength
          // 判断当前操作是否与删除范围有交集
          if (opEnd > deleteStart && currentPos < deleteEnd) {
            // 计算交集范围
            const start = Math.max(0, deleteStart - currentPos)
            const end = Math.min(opLength, deleteEnd - currentPos)
            const deleteCount = end - start

            if (deleteCount > 0) {
              // 处理被删除的部分
              if (oldOp.insert && typeof oldOp.insert === 'string' && isShowAtList.value) {
                const deletePart = oldOp.insert.slice(start, end)
                if (atKey.value.endsWith(deletePart)) {
                  // 将atKey从末尾删除deletePart
                  atKey.value = atKey.value.slice(0, atKey.value.length - deletePart.length)
                }
              }
            } else {
              if (oldOp.insert && oldOp.insert.atMention) {
                toSendAtList.value.push(oldOp.insert.atMention.account)
              }
            }
          } else {
            if (oldOp.insert && oldOp.insert.atMention) {
              toSendAtList.value.push(oldOp.insert.atMention.account)
            }
          }
          currentPos = opEnd
        })
      }
    }
  })

  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(async () => {
  const draft = messageData.sessionList[props.sessionId]?.draft
  const callbacks = {
    someOneUploadedSuccessFn: () => {},
    someUploadedFailFn: () => {},
    allUploadedSuccessFn: () => {}
  }
  const contentObj = await parseContent(callbacks)

  const fn = (content) => {
    // 草稿若发生变动，则触发存储
    if (content && draft && content !== draft) {
      messageData.updateSession({
        sessionId: props.sessionId,
        draft: content
      })
    }
  }

  fn(JSON.stringify(contentObj.contentFromLocal.filter((item) => item)))

  callbacks.allUploadedSuccessFn = () => {
    fn(JSON.stringify(contentObj.contentFromServer.filter((item) => item)))
  }
})

onUnmounted(() => {
  if (editorRef.value) {
    document.querySelector('.ql-editor').classList.remove('my-scrollbar')
    quill.value.setText('')
    quill.value.off('composition-start')
    quill.value.off('composition-end')
    quill.value.destroy()
  }

  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKeydown)
})

const handleClick = () => {
  cursorProtectForQuote()
}

const handleKeydown = (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Home') {
    cursorProtectForQuote()
  }
}

/**
 * 光标守卫，防止光标移动到quote引用消息之前
 */
const cursorProtectForQuote = () => {
  if (quill.value.hasFocus()) {
    if (quill.value.scroll.descendants(QuoteBlock).length > 0) {
      const range = quill.value.getSelection()
      if (range.index < 3) {
        quill.value.setSelection(3, 0, Quill.sources.USER)
      }
    }
  }
}

/**
 * 解析输入框内容
 * @param callbacks 解析过程中需要触发的回调
 */
const parseContent = async (callbacks) => {
  const delta = quill.value.getContents()
  let contentFromLocal = new Array(delta.ops.length).fill('') // 这里用new Array + index填充方式，而不用push，是为了保证内容的顺序
  let contentFromServer = new Array(delta.ops.length).fill('') // contentFromServer更新了某些服务端返回的数据
  let needUploadCount = 0 // 需要上传的图片个数
  let uploadedTotalCount = 0 // 已发上传请求的图片个数，包括上传成功和失败
  let uploadSuccessCount = 0 // 已经上传成功的图片个数

  delta.ops.forEach((item) => {
    if (
      item.insert &&
      item.insert.image &&
      item.insert.image.startsWith('data:') &&
      item.insert.image.includes('base64')
    ) {
      needUploadCount++
    }
  })

  for (let index = 0; index < delta.ops.length; index++) {
    const op = delta.ops[index]
    const insert = op.insert
    if (insert && typeof insert === 'string') {
      // 文本
      let contentText = {}
      if (index === delta.ops.length - 1) {
        const lastInsert = insert.endsWith('\n') ? insert.slice(0, -1) : insert // 去除最后一个换行符
        if (lastInsert) {
          contentText = {
            type: msgContentType.TEXT,
            value: lastInsert
          }
        } else {
          break
        }
      } else {
        contentText = {
          type: msgContentType.TEXT,
          value: insert
        }
      }
      contentFromLocal[index] = contentText
      contentFromServer[index] = contentText
    } else if (insert && insert.atMention) {
      // 处理用于@的自定义Blot
      const { account, nickName } = insert.atMention
      const contentAt = { type: msgContentType.AT, value: { account, nickName } }
      contentFromLocal[index] = contentAt
      contentFromServer[index] = contentAt
    } else if (insert && insert.quoteBlock) {
      // 处理用于引用的自定义Blot
      contentFromLocal[index] = {
        type: msgContentType.QUOTE,
        value: {
          nickName: insert.quoteBlock.nickName,
          msgId: insert.quoteBlock.msgKey // 注意这里的区别
        }
      }
      contentFromServer[index] = {
        type: msgContentType.QUOTE,
        value: {
          nickName: insert.quoteBlock.nickName,
          msgId: insert.quoteBlock.msgId // 注意这里的区别
        }
      }
    } else if (insert && insert.image) {
      const alt = op.attributes?.alt
      if (alt && alt.startsWith('[') && alt.endsWith(']')) {
        // 表情id
        const contentEmoji = { type: msgContentType.EMOJI, value: alt }
        contentFromLocal[index] = contentEmoji
        contentFromServer[index] = contentEmoji
      } else if (alt && alt.startsWith('{') && alt.endsWith('}')) {
        // 已有objectId的截图，说明是已上传过服务端的
        const contentSceenShot = { type: msgContentType.SCREENSHOT, value: alt.slice(1, -1) }
        contentFromLocal[index] = contentSceenShot
        contentFromServer[index] = contentSceenShot
      } else if (insert.image.startsWith('data:') && insert.image.includes('base64')) {
        // 截图的原始base64编码的图片
        const file = base64ToFile(insert.image, uuidv4()) // base64转file
        const tempObjectId = new Date().getTime()
        contentFromLocal[index] = { type: msgContentType.SCREENSHOT, value: tempObjectId }
        // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
        const md5 = await getMd5(file)
        const prehandleImageObj = await prehandleImage(file)
        const localSrc = URL.createObjectURL(file)
        imageData.setImage({
          objectId: tempObjectId,
          originUrl: localSrc,
          thumbUrl: localSrc, // 本地缓存缩略图用的是原图
          fileName: file.name,
          size: file.size,
          thumbWidth: prehandleImageObj.originWidth,
          thumbHeight: prehandleImageObj.originHeight,
          createdTime: new Date()
        })
        const files = {
          originFile: file,
          thumbFile: prehandleImageObj.thumbFile
        }
        const requestBody = {
          storeType: 1,
          md5,
          fileName: file.name,
          fileRawType: file.type,
          size: file.size,
          originWidth: prehandleImageObj.originWidth,
          originHeight: prehandleImageObj.originHeight,
          thumbWidth: prehandleImageObj.thumbWidth,
          thumbHeight: prehandleImageObj.thumbHeight
        }

        //上传图片至服务端
        mtsUploadServiceForImage(requestBody, files)
          .then((res) => {
            imageData.setImage(res.data.data) // 缓存image数据
            uploadSuccessCount++
            contentFromServer[index] = {
              type: msgContentType.SCREENSHOT,
              value: res.data.data.objectId
            }
            callbacks.someOneUploadedSuccessFn()
            if (uploadSuccessCount === needUploadCount) {
              callbacks.allUploadedSuccessFn()
            }
          })
          .finally(() => {
            uploadedTotalCount++
            if (uploadedTotalCount === needUploadCount && uploadSuccessCount < needUploadCount) {
              callbacks.someUploadedFailFn()
            }
          })
      } else {
        // 当文本处理
        const contentText = { type: msgContentType.TEXT, value: insert }
        contentFromLocal[index] = contentText
        contentFromServer[index] = contentText
      }
    }
  }

  return {
    needUploadCount,
    uploadedTotalCount,
    uploadSuccessCount,
    contentFromLocal,
    contentFromServer
  }
}

// 监控session发生了切换
watch(
  () => props.sessionId,
  async (newSessionId, oldSessionId) => {
    toSendAtList.value = []
    const callbacks = {
      someOneUploadedSuccessFn: () => {},
      someUploadedFailFn: () => {},
      allUploadedSuccessFn: () => {}
    }
    const contentObj = await parseContent(callbacks)

    const fn = (content) => {
      // 草稿若发生变动，则触发存储
      if (oldSessionId && content !== messageData.sessionList[oldSessionId].draft) {
        messageData.updateSession({
          sessionId: oldSessionId,
          draft: content
        })
      }
    }

    callbacks.allUploadedSuccessFn = () => {
      // JSON.stringify(contentObj.contentFromServer.filter((item) => item))在空值时返回'[]''
      let inputContent = JSON.stringify(contentObj.contentFromServer.filter((item) => item))
      fn(inputContent === '[]' ? '' : inputContent)
    }

    // JSON.stringify(contentObj.contentFromLocal.filter((item) => item))在空值时返回'[]''
    let inputContent = JSON.stringify(contentObj.contentFromLocal.filter((item) => item))
    fn(inputContent === '[]' ? '' : inputContent)

    await renderContent(messageData.sessionList[newSessionId].draft || '') // 切换session时渲染新session的草稿
  },
  { deep: true }
)

const pasteObj = {
  content: null,
  contentType: null,
  fileName: null,
  fileSize: null,
  url: null
}

const clearPasteObj = () => {
  pasteObj.content = null
  pasteObj.contentType = null
  pasteObj.fileName = null
  pasteObj.fileSize = null
  pasteObj.url = null
}

/**
 * 处理复制
 */
const handleCopy = ({ index, length }) => {
  const delta = quill.value.getContents(index, length)

  const clipboardContent = []
  let clipboardText = ''

  for (let index = 0; index < delta.ops.length; index++) {
    const op = delta.ops[index]
    const insert = op.insert
    if (insert && typeof insert === 'string') {
      // 文本
      clipboardContent.push({
        type: msgContentType.TEXT,
        value: insert
      })
      clipboardText += insert
    } else if (insert && insert.image) {
      const alt = op.attributes?.alt
      if (alt && alt.startsWith('[') && alt.endsWith(']')) {
        // 表情
        clipboardContent.push({ type: msgContentType.EMOJI, value: alt })
      } else if (alt && alt.startsWith('{') && alt.endsWith('}')) {
        // 已有objectId的截图，复制原消息粘贴的，撤回重新编辑，从草稿渲染
        clipboardContent.push({ type: msgContentType.SCREENSHOT, value: alt.slice(1, -1) })
      } else if (insert.image.startsWith('data:') && insert.image.includes('base64')) {
        // 截图后原始的base64编码
      }
    }
  }

  return {
    // 在html自定义属性data-quill-custom中传递clipboardContent结构化数据
    html: `<div data-quill-custom=${encodeURIComponent(JSON.stringify(clipboardContent))}></div>`,
    text: clipboardText // 纯文本
  }
}

/**
 * 处理粘贴
 * @param range
 */
const handlePaste = (range, text) => {
  if (!text) {
    return
  }

  if (!isMatchMsgStruct(text)) {
    const delta = new Delta().retain(range.index).delete(range.length).insert(text)
    quill.value.updateContents(delta, Quill.sources.USER)
    quill.value.setSelection(delta.length() - range.length, Quill.sources.USER)
    return
  }

  const delta = new Delta().retain(range.index).delete(range.length)

  const arr = jsonParseSafe(text)
  for (const item of arr) {
    const { type, value } = item
    if (
      type === msgContentType.IMAGE ||
      type === msgContentType.AUDIO ||
      type === msgContentType.VIDEO ||
      type === msgContentType.DOCUMENT
    ) {
      clearPasteObj()
      pasteObj.content = item
      pasteObj.contentType = type
      const fileId = value
      switch (type) {
        case msgContentType.IMAGE:
          pasteObj.fileName = imageData.image[fileId]?.fileName
          pasteObj.fileSize = imageData.image[fileId]?.size
          pasteObj.url = imageData.image[fileId]?.thumbUrl
          break
        case msgContentType.AUDIO:
          pasteObj.fileName = audioData.audio[fileId]?.fileName
          pasteObj.fileSize = audioData.audio[fileId]?.size
          break
        case msgContentType.VIDEO:
          pasteObj.fileName = videoData.video[fileId]?.fileName
          pasteObj.fileSize = videoData.video[fileId]?.size
          break
        case msgContentType.DOCUMENT:
          pasteObj.fileName = documentData.document[fileId]?.fileName
          pasteObj.fileSize = documentData.document[fileId]?.size
          break
        default:
          break
      }

      // 文件确实存在才发送
      if (pasteObj.fileName) {
        showAgreeDialog.value = true
        return // 这四种类型的数组只能有1个元素，所以直接return
      }
    } else {
      switch (type) {
        case msgContentType.TEXT:
          delta.insert(value)
          break
        case msgContentType.EMOJI: {
          const emojiUrl = emojis[value]
          if (emojiUrl) {
            delta.insert({ image: emojiUrl }, { alt: value })
          } else {
            delta.insert(value)
          }
          break
        }
        case msgContentType.SCREENSHOT: {
          const imageUrl = imageData.image[value]?.originUrl
          if (imageUrl) {
            delta.insert({ image: imageUrl }, { alt: `{${value}}` }) // 添加区别于emoji表情alt的符号，方便parse时识别
          } else {
            delta.insert(value)
          }
          break
        }
        case msgContentType.AT: {
          const { account, nickName } = value
          toSendAtList.value.push(account)
          delta.insert({ atMention: { account, nickName } })
          break
        }
        case msgContentType.QUOTE:
        default:
          break
      }
    }
  }
  quill.value.updateContents(delta, Quill.sources.USER)
  quill.value.setSelection(delta.length() - range.length, Quill.sources.USER)
}

/**
 * 输入框从空状态渲染可视内容
 * 1. 渲染草稿
 * 2. 消息撤回后的重新编辑
 * @param content json结构化内容的字符串
 */
const renderContent = async (content) => {
  if (!content) {
    quill.value.setText('')
    return
  }

  const arr = jsonParseSafe(content)
  // 不允许非结构化的content
  if (!arr) {
    quill.value.setText('')
    return
  }

  // 创建一个新的 Delta 对象
  const delta = new Delta()
  for (const item of arr) {
    if (!item.type || !item.value) {
      delta.insert('')
    }

    switch (item.type) {
      case msgContentType.TEXT:
        delta.insert(item.value)
        break
      case msgContentType.EMOJI: {
        const emojiUrl = emojis[item.value]
        if (emojiUrl) {
          delta.insert({ image: emojiUrl }, { alt: item.value })
        } else {
          delta.insert(item.value)
        }
        break
      }
      case msgContentType.SCREENSHOT: {
        const imageUrl = imageData.image[item.value]?.originUrl
        if (imageUrl) {
          delta.insert({ image: imageUrl }, { alt: `{${item.value}}` }) // 添加区别于emoji表情alt的符号，方便parse时识别
        } else {
          delta.insert(item.value)
        }
        break
      }
      case msgContentType.AT: {
        const { account, nickName } = item.value
        toSendAtList.value.push(account)
        delta.insert({ atMention: { account, nickName } })
        break
      }
      case msgContentType.QUOTE: {
        // 先从本地消息缓存中获取
        let msg = messageData.getMsg(props.sessionId, item.value.msgId)
        if (!msg) {
          // 如果本地消息缓存中没有，再去服务器查询
          const res = await msgChatQueryMessagesService({
            sessionId: props.sessionId,
            msgIds: [item.value.msgId]
          })

          if (res.data.data && res.data.data.length > 0) {
            msg = res.data.data[0]
          }
        }
        delta.insert({
          quoteBlock: {
            account: msg.fromId,
            nickName: item.value.nickName,
            msgId: msg.msgId,
            content: showSimplifyMsgContent(msg.content),
            msgTime: msg.msgTime
          }
        })
        break
      }
      default:
        delta.insert('')
    }
  }

  quill.value.setText('') // 清空编辑器内容
  quill.value.updateContents(delta) // 使用 Delta 对象更新编辑器内容
  quill.value.setSelection(quill.value.getLength(), 0, Quill.sources.USER) // 设置光标位置
}

/**
 * 处理Enter发送
 */
const handleEnter = async () => {
  if (isShowAtList.value) {
    return
  }

  const callbacks = {
    someOneUploadedSuccessFn: () => {},
    someUploadedFailFn: () => {},
    allUploadedSuccessFn: () => {}
  }

  const contentObj = pasteObj.content
    ? { contentFromLocal: [pasteObj.content], contentFromServer: [pasteObj.content] }
    : await parseContent(callbacks)

  let textLength = 0
  let contentType = 0
  contentObj.contentFromLocal.forEach((item) => {
    if (item.type === msgContentType.TEXT) {
      textLength = textLength + item.value.length
    }
    contentType = contentType | item.type
  })

  if (contentType === 0) {
    ElMessage.warning('请勿发送空内容')
    quill.value.setText('')
    return
  }

  if (textLength > 3000) {
    ElMessage.warning('发送内容请不要超过3000个字')
    return
  }

  // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
  let msg = {}
  emit('saveLocalMsg', {
    contentType: contentType,
    content: JSON.stringify(contentObj.contentFromLocal.filter((item) => item)),
    fn: (result) => {
      msg = result
    }
  })

  if (contentObj.needUploadCount > 0) {
    messageData.updateMsg(msg.sessionId, msg.msgId, {
      uploadStatus: msgFileUploadStatus.UPLOADING,
      uploadProgress: 0
    })
  } else {
    const content = JSON.stringify(contentObj.contentFromServer.filter((item) => item))
    emit('sendMessage', { msg, content, at: toSendAtList.value }) // content 要更新后发给服务端，和saveLocalMsg的本地消息由些许差异
  }

  // callback：每成功上传一个图片，更新一下进度
  callbacks.someOneUploadedSuccessFn = () => {
    msg.uploadProgress = Math.floor(
      (contentObj.uploadSuccessCount / contentObj.needUploadCount) * 100
    )
  }

  // callback：如果有失败的上传，则状态修改为上传失败
  callbacks.someUploadedFailFn = () => {
    messageData.updateMsg(msg.sessionId, msg.msgId, {
      uploadStatus: msgFileUploadStatus.UPLOAD_FAILED,
      status: msgSendStatus.UPLOAD_FAILED
    })
  }

  // callback：所有图片均上传，则发送消息
  const atTargets = toSendAtList.value // 异步函数里避免调用响应式数据
  callbacks.allUploadedSuccessFn = () => {
    messageData.updateMsg(msg.sessionId, msg.msgId, {
      uploadStatus: msgFileUploadStatus.UPLOAD_SUCCESS,
      uploadProgress: 100
    })
    const content = JSON.stringify(contentObj.contentFromServer.filter((item) => item))
    emit('sendMessage', { msg, content, at: atTargets })
  }

  clearPasteObj()
  toSendAtList.value = []
  quill.value.setText('') // 编辑窗口置空
  quill.value.setSelection(0, 0, Quill.sources.USER) // 设置光标位置
}

const options = {
  debug: false,
  modules: {
    toolbar: false,
    keyboard: {
      bindings: {
        enter: {
          key: 'Enter',
          handler: handleEnter
        }
      }
    }
  },
  placeholder: 'Enter发送 / Shift+Enter换行',
  theme: 'snow'
}

const getQuillSelectionIndex = () => {
  if (!quill.value) return 0

  return (quill.value.getSelection() || {}).index || 0
}

const addEmoji = (key) => {
  let index = getQuillSelectionIndex()
  if (index == 1 && quill.value.getLength() == 1 && quill.value.getText(0, 1) == '\n') {
    quill.value.deleteText(0, 1)
    index = 0
  }

  const delta = new Delta()
  delta.retain(index)
  delta.insert({ image: emojis[key] }, { alt: key })
  quill.value.updateContents(delta)
  quill.value.setSelection(index + 1, 0, Quill.sources.USER)
}

const onSelectedAtTarget = ({ account, nickName }) => {
  quill.value.focus() // 确保 Quill 编辑器获取焦点
  const range = quill.value.getSelection()
  if (!range || range.index < 1) return // 防止-1越界

  toSendAtList.value.push(account)

  if (range.index >= atIndex.value) {
    const delLen = range.index - atIndex.value + 1 // 删除用户输入的@符号及搜索关键字
    quill.value.deleteText(atIndex.value - 1, delLen)
    quill.value.insertEmbed(
      atIndex.value - 1,
      'atMention',
      { account, nickName },
      Quill.sources.USER
    ) // 插入Blot（占据1个位置）
    quill.value.insertText(atIndex.value, ' ', Quill.sources.USER) // 插入空格
    quill.value.setSelection(atIndex.value + 1, 0, Quill.sources.USER) // 定位光标
  } else {
    quill.value.insertEmbed(range.index, 'atMention', { account, nickName }, Quill.sources.USER) // 插入Blot（占据1个位置）
    quill.value.insertText(range.index + 1, ' ', Quill.sources.USER) // 插入空格
    quill.value.setSelection(range.index + 1 + 1, 0, Quill.sources.USER) // 定位光标
  }
}

const reeditFromRevoke = async (content) => {
  quill.value.setText('') // 清空编辑器内容
  quill.value.setSelection(0, 0, Quill.sources.SILENT) // 设置光标位置
  await renderContent(content)
}

const insertQuote = ({ account, nickName, msgKey, msgId, content, msgTime }) => {
  // 1. 保存原始选择范围
  quill.value.focus() // 先使 Quill 编辑器获取焦点，否则无法获取Selection
  const originalRange = quill.value.getSelection()
  const len = !originalRange ? 0 : originalRange.length
  let newIndex = !originalRange ? 0 : originalRange.index

  // 2. 删除所有旧的引用块及其后的换行符
  const quoteBlots = quill.value.scroll.descendants(QuoteBlock)
  quoteBlots.forEach((blot) => {
    const index = quill.value.getIndex(blot)
    quill.value.deleteText(index, 2, Quill.sources.SILENT) // 删除块和换行符
    newIndex = newIndex - 2
  })

  // 3. 插入新引用块到开头
  quill.value.insertEmbed(
    0,
    'quoteBlock',
    { account, nickName, msgKey, msgId, content, msgTime },
    Quill.sources.USER
  )
  quill.value.insertText(1, '\n', Quill.sources.SILENT)
  newIndex = newIndex + 2

  // 4. 恢复原始光标位置（如果有）
  quill.value.setSelection(newIndex, len, Quill.sources.USER)
}

defineExpose({
  addEmoji,
  reeditFromRevoke,
  insertQuote
})
</script>

<template>
  <div ref="inputEditorRef" class="input-editor">
    <QuillEditor
      class="editor"
      ref="editorRef"
      :options="options"
      content-type="text"
    ></QuillEditor>
    <AtList
      v-model="isShowAtList"
      :sessionId="props.sessionId"
      :offsetX="atListOffsetX"
      :offsetY="atListOffsetY"
      :atKey="atKey"
      @selected="onSelectedAtTarget"
    ></AtList>
    <AgreeBeforeSend
      v-model:isShow="showAgreeDialog"
      :target="remoteName"
      :contentType="pasteObj.contentType"
      :fileName="pasteObj.fileName"
      :fileSize="pasteObj.fileSize"
      :src="pasteObj.url"
      @confirm="handleEnter"
    ></AgreeBeforeSend>
  </div>
</template>

<style lang="scss">
.input-editor {
  height: 100%;

  .editor {
    height: 100%;
    border: none;

    .ql-editor {
      padding: 16px;
      padding-left: 16px;
      font-size: 14px;
      background-color: #fff;
      white-space: pre-wrap; /* 允许换行 */
      word-break: break-word; /* 长单词或URL强制换行 */
      overflow-wrap: break-word; /* 兼容性更好的换行 */
    }
  }
}

img {
  margin-left: 2px;
  margin-right: 2px;
}

.at-mention {
  display: inline-block;
  background: #e0f7fa;
  padding: 2px 4px;
  border-radius: 4px;
  margin: 0 2px;
  user-select: none; /* 禁止单独选中@提及中的字符 */
  pointer-events: none; /* 防止鼠标事件干扰 */
  cursor: default; /* 显示默认光标 */
  vertical-align: baseline;
}

.quote-block {
  max-width: 480px;
  width: fit-content; /* 宽高根据内容自适应，需要display: flex配合*/
  height: fit-content; /* 宽高根据内容自适应，需要display: flex配合*/
  display: flex;
  position: relative;
  background-color: #f5f5f5;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  user-select: none;

  span[contenteditable='false'] {
    width: 100%;
    display: flex;
    height: fit-content; /* 高度根据内容自适应，需要display: flex配合 */
  }

  &:hover {
    background-color: #fff;
  }
}

.quote-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: baseline; /* 基线对齐 */
  margin-bottom: 4px;
  gap: 4px;
}

.quote-sender {
  padding-right: 40px;
  display: flex;
  color: gray;
  gap: 5px;
}

.quote-content {
  width: 100%;
  color: #666;
  white-space: nowrap; //防止文本自动换行，确保在一行内显示，这样当文本超出宽度时才会触发省略号
  overflow: hidden; //当文本超出元素范围时，隐藏超出的部分。
  text-overflow: ellipsis; //在文本溢出并且overflow属性设置为hidden时，显示省略号。
}

/* 重置按钮默认样式 */
.quote-close-btn {
  position: absolute;
  right: 4px;
  top: 4px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

/* 交互优化 */
.quote-close-btn:hover {
  color: #666;
  background-color: rgba(0, 0, 0, 0.05);
}

.quote-close-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* 关闭符号样式 */
.quote-close-btn > span {
  font-size: 18px;
  line-height: 1;
  margin-top: -1px; /* 视觉居中调整 */
}
</style>
