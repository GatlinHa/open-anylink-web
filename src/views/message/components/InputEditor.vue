<script setup>
import { QuillEditor, Delta, Quill } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { onMounted, onUnmounted, onBeforeUnmount, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useMessageStore, useImageStore } from '@/stores'
import { ElMessage, ElLoading } from 'element-plus'
import { emojiTrans, getEmojiHtml } from '@/js/utils/emojis'
import { base64ToFile } from '@/js/utils/common'
import { mtsUploadService } from '@/api/mts'
import { el_loading_options } from '@/const/commonConst'

const props = defineProps(['sessionId', 'draft'])
const emit = defineEmits(['sendMessage'])
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
  let content = await getContent()
  // 草稿若没发生变动，则不触发存储
  if (content !== messageData.sessionList[props.sessionId].draft) {
    messageData.updateSession({
      sessionId: props.sessionId,
      draft: content
    })
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

const getContent = async () => {
  const delta = getQuill().getContents()
  let content = ''
  for (let index = 0; index < delta.ops.length; index++) {
    const op = delta.ops[index]
    const insert = op.insert
    if (insert && typeof insert === 'string') {
      // 文本
      content = content + insert
    } else if (insert && insert.image) {
      const alt = op.attributes?.alt
      if (alt && alt.startsWith('[') && alt.endsWith(']')) {
        // 表情
        content = content + alt
      } else if (alt && alt.startsWith('{') && alt.endsWith('}')) {
        // 图片
        content = content + alt
      } else if (insert.image.startsWith('data:') && insert.image.includes('base64')) {
        // base64编码的图片
        const file = base64ToFile(insert.image, uuidv4()) // base64转file
        el_loading_options.text = '图片上传中...' //上传中加一个loading效果
        const loadingInstance = ElLoading.service(el_loading_options)
        try {
          const res = await mtsUploadService({ file: file, storeType: 1 }) //上传图片至服务端
          imageData.setImage(props.sessionId, res.data.data) // 缓存image数据
          content = content + `{${res.data.data.objectId}}`
        } finally {
          loadingInstance.close()
        }
      }
    }
  }
  return content.trim()
}

// 监控session发生了切换
watch(
  () => props.sessionId,
  async (newValue, oldValue) => {
    let content = await getContent()
    // 草稿若没发生变动，则不触发存储
    if (oldValue && content !== messageData.sessionList[oldValue].draft) {
      messageData.updateSession({
        sessionId: oldValue,
        draft: content
      })
    }
    formatContent(messageData.sessionList[newValue].draft || '')
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
  const content = await getContent()
  if (!content) {
    ElMessage.warning('请勿发送空内容')
    getQuill().setText('')
  } else if (content.length > 3000) {
    ElMessage.warning('发送内容请不要超过3000个字')
  } else {
    emit('sendMessage', content)
    getQuill().setText('')
  }
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
