<script setup>
import { QuillEditor, Delta, Quill } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { onMounted, onUnmounted, onBeforeUnmount, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useMessageStore, useImageStore } from '@/stores'
import { ElMessage } from 'element-plus'
import { emojis } from '@/js/utils/emojis'
import { base64ToFile } from '@/js/utils/common'
import { mtsUploadServiceForImage } from '@/api/mts'
import { msgContentType, msgFileUploadStatus } from '@/const/msgConst'
import { getMd5 } from '@/js/utils/file'
import { generateThumb } from '@/js/utils/image'

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
  await imageData.loadImageInfoFromContent(props.draft)
  renderContent(props.draft)
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

  fn(contentObj.contentFromLocal.join('').trim())

  callbacks.allUploadedSuccessFn = () => {
    fn(contentObj.contentFromServer.join('').trim())
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

/**
 * 解析输入框内容
 * @param callbacks 解析过程中需要触发的回调
 */
const parseContent = async (callbacks) => {
  const delta = getQuill().getContents()
  let contentFromLocal = new Array(delta.ops.length).fill('')
  let contentFromServer = new Array(delta.ops.length).fill('')
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
        const file = base64ToFile(insert.image, uuidv4()) // base64转file
        const tempObjectId = new Date().getTime()
        // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
        const localSrc = URL.createObjectURL(file)
        imageData.setImage({
          objectId: tempObjectId,
          originUrl: localSrc,
          thumbUrl: localSrc,
          fileName: file.name,
          size: file.size,
          createdTime: new Date()
        })
        contentFromLocal[index] = `{${tempObjectId}}`

        const md5 = await getMd5(file)
        const thumbObj = await generateThumb(file)
        const files = {
          originFile: file,
          thumbFile: thumbObj.thumbFile
        }
        const requestBody = {
          storeType: 0,
          md5,
          fileName: file.name,
          fileRawType: file.type,
          size: file.size,
          originWidth: thumbObj.originWidth,
          originHeight: thumbObj.originHeight,
          thumbWidth: thumbObj.thumbWidth,
          thumbHeight: thumbObj.thumbHeight
        }

        //上传图片至服务端
        mtsUploadServiceForImage(requestBody, files)
          .then((res) => {
            imageData.setImage(res.data.data) // 缓存image数据
            uploadSuccessCount++
            contentFromServer[index] = `{${res.data.data.objectId}}`
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
        contentFromLocal[index] = insert
        contentFromServer[index] = insert
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
      fn(contentObj.contentFromServer.join('').trim())
    }

    fn(contentObj.contentFromLocal.join('').trim())

    renderContent(messageData.sessionList[newSessionId].draft || '')
  },
  { deep: true }
)

/**
 * 把输入框的字符串内容渲染成富媒体内容
 * @param content 字符串内容
 */
const renderContent = (content) => {
  if (!content) {
    getQuill().setText('')
    return
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

  // 创建一个新的 Delta 对象
  const delta = new Delta()
  contentArray.map((item) => {
    if (item.startsWith('{') && item.endsWith('}')) {
      const imageId = item.slice(1, -1)
      const imageUrl = imageData.image[imageId].originUrl
      delta.insert({ image: imageUrl }, { alt: item })
    } else if (item.startsWith('[') && item.endsWith(']')) {
      const emojiUrl = emojis[item]
      delta.insert({ image: emojiUrl }, { alt: item })
    } else {
      delta.insert(item)
    }
  })

  getQuill().setText('') // 清空编辑器内容
  getQuill().updateContents(delta) // 使用 Delta 对象更新编辑器内容
  getQuill().setSelection(getQuill().getLength(), 0, 'user') // 设置光标位置
}

const handleEnter = async () => {
  const callbacks = {
    someOneUploadedSuccessFn: () => {},
    someUploadedFailFn: () => {},
    allUploadedSuccessFn: () => {}
  }

  const contentObj = await parseContent(callbacks)

  const content = contentObj.contentFromLocal.join('').trim()
  if (!content) {
    ElMessage.warning('请勿发送空内容')
    getQuill().setText('')
    return
  } else if (content.length > 3000) {
    ElMessage.warning('发送内容请不要超过3000个字')
    return
  }

  // 发送的时候设置本地缓存（非服务端数据），用于立即渲染
  let msg = {}
  emit('saveLocalMsg', {
    contentType: msgContentType.MIX,
    content: content,
    fn: (result) => {
      msg = result
    }
  })

  if (contentObj.needUploadCount > 0) {
    msg.uploadStatus = msgFileUploadStatus.UPLOADING
    msg.uploadProgress = 0
  } else {
    emit('sendMessage', msg)
  }

  // callback：每成功上传一个图片，更新一下进度
  callbacks.someOneUploadedSuccessFn = () => {
    msg.uploadProgress = Math.floor(
      (contentObj.uploadSuccessCount / contentObj.needUploadCount) * 100
    )
  }

  // callback：如果有失败的上传，则状态修改为上传失败
  callbacks.someUploadedFailFn = () => {
    msg.uploadStatus = msgFileUploadStatus.UPLOAD_FAILED
  }

  // callback：所有图片均上传，则发送消息
  callbacks.allUploadedSuccessFn = () => {
    msg.uploadStatus = msgFileUploadStatus.UPLOAD_SUCCESS
    msg.content = contentObj.contentFromServer.join('').trim()
    emit('sendMessage', msg)
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

  const delta = new Delta()
  delta.retain(index)
  delta.insert({ image: emojis[key] }, { alt: key })
  quill.updateContents(delta)
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
