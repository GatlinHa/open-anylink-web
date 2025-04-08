<script setup>
import { QuillEditor, Delta, Quill } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { onMounted, onUnmounted, onBeforeUnmount, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useMessageStore, useImageStore } from '@/stores'
import { ElMessage } from 'element-plus'
import { emojiTrans, getEmojiHtml } from '@/js/utils/emojis'
import { base64ToFile } from '@/js/utils/common'
import { mtsUploadService } from '@/api/mts'
import { msgContentType, msgFileUploadStatus } from '@/const/msgConst'

const props = defineProps(['sessionId', 'draft'])
const emit = defineEmits(['saveLocalMsg', 'sendMessage'])
const messageData = useMessageStore()
const imageData = useImageStore()

const editorRef = ref()

const getQuill = () => {
  return editorRef.value?.getQuill()
}

onMounted(async () => {
  // 给组件增加滚动条样式
  document.querySelector('.ql-editor').classList.add('my-scrollbar')
  await imageData.loadImageInfoFromContent(props.sessionId, props.draft)
  formatContent(props.draft)
  getQuill().on('composition-start', () => {
    // 当用户使用拼音输入法开始输入汉字时，这个事件就会被触发
    getQuill().root.dataset.placeholder = ''
  })
  getQuill().on('composition-end', () => {
    // 当用户使用拼音输入法输入完成后，把值恢复成原来的值
    getQuill().root.dataset.placeholder = getQuill().options.placeholder
  })
})

onBeforeUnmount(async () => {
  const contentObj = parseContent()
  const draft = messageData.sessionList[props.sessionId]?.draft
  const content = contentObj.contentFromLocal.join('').trim()
  // 草稿若发生变动，则触发存储
  if (content && draft && content !== draft) {
    messageData.updateSession({
      sessionId: props.sessionId,
      draft: content
    })
  }

  // 有图片需要上传，再保存一次draft
  if (contentObj.needUploadCount.value > 0) {
    const stopWatch = watch(
      () => contentObj.uploadedTotalCount.value,
      () => {
        if (contentObj.needUploadCount.value === contentObj.uploadedTotalCount.value) {
          // 满足第一个相等条件就停止监视
          stopWatch()
          if (contentObj.uploadSuccessCount.value === contentObj.needUploadCount.value) {
            // 满足第二个相等条件才保存草稿
            messageData.updateSession({
              sessionId: props.sessionId,
              draft: contentObj.contentFromServer.join('').trim()
            })
          }
        }
      }
    )
  }
})

onUnmounted(() => {
  if (editorRef.value) {
    document.querySelector('.ql-editor').classList.remove('my-scrollbar')
    getQuill().setText('')
    getQuill().off('composition-start')
    getQuill().off('composition-end')
    getQuill().destroy()
  }
})

const parseContent = (sessionId = props.sessionId) => {
  const delta = getQuill().getContents()
  let contentFromLocal = new Array(delta.ops.length).fill('')
  let contentFromServer = new Array(delta.ops.length).fill('')
  let needUploadCount = ref(0) // 需要上传的图片个数
  let uploadedTotalCount = ref(0) // 已发上传请求的图片个数，包括上传成功和失败
  let uploadSuccessCount = ref(0) // 已经上传成功的图片个数
  for (let index = 0; index < delta.ops.length; index++) {
    const op = delta.ops[index]
    const insert = op.insert
    if (insert && typeof insert === 'string') {
      // 文本
      contentFromLocal[index] = insert
      contentFromServer[index] = insert
    } else if (insert && insert.image) {
      const alt = op.attributes?.alt
      if (alt && alt.startsWith('[') && alt.endsWith(']')) {
        // 表情id
        contentFromLocal[index] = alt
        contentFromServer[index] = alt
      } else if (alt && alt.startsWith('{') && alt.endsWith('}')) {
        // 图片id
        contentFromLocal[index] = alt
        contentFromServer[index] = alt
      } else if (insert.image.startsWith('data:') && insert.image.includes('base64')) {
        // base64编码的图片
        needUploadCount.value++
        const file = base64ToFile(insert.image, uuidv4()) // base64转file
        const tempObjectId = new Date().getTime()
        // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
        const localSrc = URL.createObjectURL(file)
        imageData.setLocalImage({
          objectId: tempObjectId,
          originUrl: localSrc,
          thumbUrl: localSrc,
          fileName: file.name,
          size: file.size
        })
        contentFromLocal[index] = `{${tempObjectId}}`

        //上传图片至服务端
        mtsUploadService({ file: file, storeType: 1 })
          .then((res) => {
            imageData.setServerImage(sessionId, res.data.data) // 缓存image数据
            uploadSuccessCount.value++
            contentFromServer[index] = `{${res.data.data.objectId}}`
            // TODO 这里要判断是最后一个上传的图片
            // 这里用异步有个问题，后面请求上传的图片传的块，在content中就会跑到前面去，图片的顺序会错乱
            // 可以把content设成一个数组，按照index下标给每个数组元素设置，防止乱序
            // 这样也可以watch每个元素如果都填满，就sendMessage
          })
          .finally(() => {
            uploadedTotalCount.value++
          })
      } else {
        // 当文本处理
        contentFromLocal[index] = insert
        contentFromServer[index] = insert
      }
    }
  }

  return {
    needUploadCount: needUploadCount,
    uploadedTotalCount: uploadedTotalCount,
    uploadSuccessCount: uploadSuccessCount,
    contentFromLocal: contentFromLocal,
    contentFromServer: contentFromServer
  }
}

// 监控session发生了切换
watch(
  () => props.sessionId,
  async (newSessionId, oldSessionId) => {
    const contentObj = parseContent(oldSessionId)
    const content = contentObj.contentFromLocal.join('').trim()
    // 草稿若发生变动，则触发存储
    if (oldSessionId && content !== messageData.sessionList[oldSessionId].draft) {
      messageData.updateSession({
        sessionId: oldSessionId,
        draft: content
      })
    }

    // 有图片需要上传，再保存一次draft
    if (contentObj.needUploadCount.value > 0) {
      const stopWatch = watch(
        () => contentObj.uploadedTotalCount.value,
        () => {
          if (contentObj.needUploadCount.value === contentObj.uploadedTotalCount.value) {
            // 满足第一个相等条件就停止监视
            stopWatch()
            if (contentObj.uploadSuccessCount.value === contentObj.needUploadCount.value) {
              // 满足第二个相等条件才保存草稿
              if (oldSessionId) {
                messageData.updateSession({
                  sessionId: oldSessionId,
                  draft: contentObj.contentFromServer.join('').trim()
                })
              }
            }
          }
        }
      )
    }

    formatContent(messageData.sessionList[newSessionId].draft || '')
  },
  { deep: true }
)

const formatContent = (content) => {
  let html = emojiTrans(content)
  html = imageData.imageTrans(html)
  html = html.replace(/\n/g, '<br>')
  getQuill().setText('')
  getQuill().clipboard.dangerouslyPasteHTML(0, html)
  getQuill().setSelection(getQuill().getLength(), 0, 'user')
}

const handleEnter = async () => {
  const contentObj = parseContent()
  const content = contentObj.contentFromLocal.join('').trim()
  if (!content) {
    ElMessage.warning('请勿发送空内容')
    getQuill().setText('')
    return
  } else if (content.length > 3000) {
    ElMessage.warning('发送内容请不要超过3000个字')
    return
  }

  if (contentObj.needUploadCount.value === 0) {
    emit('sendMessage', content)
  } else {
    // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
    let msg = {}
    emit('saveLocalMsg', {
      contentType: msgContentType.MIX,
      content: content,
      fn: (result) => {
        msg = result
      }
    })

    // 有图片需要上传
    if (contentObj.needUploadCount.value > 0) {
      msg.uploadStatus = msgFileUploadStatus.UPLOADING
      msg.uploadProgress = 0
    }
    // 监视图片上传结果，图片上传完后向服务器发送消息
    const stopWatch = watch(
      () => contentObj.uploadedTotalCount.value,
      () => {
        msg.uploadProgress = Math.floor(
          (contentObj.uploadSuccessCount.value / contentObj.needUploadCount.value) * 100
        )
        if (contentObj.uploadedTotalCount.value === contentObj.needUploadCount.value) {
          stopWatch()
          if (contentObj.uploadSuccessCount.value === contentObj.needUploadCount.value) {
            msg.uploadStatus = msgFileUploadStatus.UPLOAD_SUCCESS
            msg.content = contentObj.contentFromServer.join('').trim()
            emit('sendMessage', msg)
          }
        } else {
          msg.uploadStatus = msgFileUploadStatus.UPLOAD_FAILED
        }
      }
    )
  }
  getQuill().setText('') // 编辑窗口置空
}

/**
 * 处理粘贴格式问题
 */
const Clipboard = Quill.import('modules/clipboard')
class PlainClipboard extends Clipboard {
  onPaste(range, { text }) {
    const delta = new Delta().retain(range.index).delete(range.length).insert(text)
    this.quill.updateContents(delta, Quill.sources.USER)
    this.quill.setSelection(delta.length() - range.length, Quill.sources.SILENT)
    this.quill.scrollSelectionIntoView()
  }
}
Quill.register(
  {
    'modules/clipboard': PlainClipboard
  },
  true
)

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
  const quill = getQuill()
  if (!quill) return 0

  return (quill.getSelection() || {}).index || 0
}

const addEmoji = (key) => {
  const quill = getQuill()
  let index = getQuillSelectionIndex()
  if (index == 1 && quill.getLength() == 1 && quill.getText(0, 1) == '\n') {
    quill.deleteText(0, 1)
    index = 0
  }

  quill.clipboard.dangerouslyPasteHTML(index, getEmojiHtml(key))
  quill.setSelection(index + 1, 0, 'user')
}

defineExpose({
  addEmoji
})
</script>

<template>
  <div class="input-editor">
    <QuillEditor
      class="editor"
      ref="editorRef"
      :options="options"
      content-type="text"
    ></QuillEditor>
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
    }
  }
}

img {
  margin-left: 2px;
  margin-right: 2px;
}
</style>
