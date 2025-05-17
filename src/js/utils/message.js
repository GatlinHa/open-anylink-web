import { msgContentType } from '@/const/msgConst'
import { jsonParseSafe, showDurationFormat } from './common'
import { useImageStore, useAudioStore, useVideoStore, useDocumentStore } from '@/stores'
import { emojis } from './emojis'

const imageData = useImageStore()
const audioData = useAudioStore()
const videoData = useVideoStore()
const documentData = useDocumentStore()

export const showSimplifyMsgContent = (content) => {
  const arr = jsonParseSafe(content)
  if (!arr) {
    return content
  }

  let simplifyContent = ''

  for (const item of arr) {
    if (!item.type || !item.value) {
      return content
    }

    switch (item.type) {
      case msgContentType.TEXT:
      case msgContentType.EMOJI:
        simplifyContent = simplifyContent + item.value
        break
      case msgContentType.AT:
        simplifyContent = simplifyContent + `@${item.value.nickName} `
        break
      case msgContentType.SCREENSHOT:
        simplifyContent = simplifyContent + `[截图]`
        break
      case msgContentType.QUOTE:
        simplifyContent = simplifyContent + '[引用]'
        break
      case msgContentType.RECORDING:
        simplifyContent =
          simplifyContent + `[语音] ${showDurationFormat(audioData.audio[item.value].duration)}`
        break
      case msgContentType.IMAGE:
        simplifyContent = simplifyContent + `[图片] ${imageData.image[item.value].fileName}`
        break
      case msgContentType.AUDIO:
        simplifyContent = simplifyContent + `[音频] ${audioData.audio[item.value].fileName}`
        break
      case msgContentType.VIDEO:
        simplifyContent = simplifyContent + `[视频] ${videoData.video[item.value].fileName}`
        break
      case msgContentType.DOCUMENT:
        simplifyContent = simplifyContent + `[文件] ${documentData.document[item.value].fileName}`
        break
      case msgContentType.FORWARD_TOGETHER:
        simplifyContent = simplifyContent + '[聊天记录]'
        break

      default:
        simplifyContent = simplifyContent + item.value
        break
    }
  }
  return simplifyContent
}

/**
 * 内容字符串是否匹配消息结构
 */
export const isMatchMsgStruct = (contentStr) => {
  const contentArr = jsonParseSafe(contentStr)
  if (!contentArr || !Array.isArray(contentArr) || contentArr.length === 0) {
    return false
  }

  for (const item of contentArr) {
    const { type, value } = item
    if (!type || !value) {
      return false
    }

    switch (type) {
      case msgContentType.TEXT:
        break
      case msgContentType.EMOJI:
        if (!(value in emojis)) {
          return false
        }
        break
      case msgContentType.SCREENSHOT:
      case msgContentType.IMAGE:
      case msgContentType.RECORDING:
      case msgContentType.AUDIO:
      case msgContentType.VIDEO:
      case msgContentType.DOCUMENT:
        if (!/^\d+$/.test(value)) {
          return false
        }
        break
      case msgContentType.AT: {
        const { account, nickName } = value
        if (!account || !nickName) {
          return false
        }
        break
      }
      case msgContentType.QUOTE: {
        const { msgId, nickName } = value
        if (!msgId || !nickName || !/^\d+$/.test(msgId)) {
          return false
        }
        break
      }
      case msgContentType.FORWARD_TOGETHER: {
        const { sessionId, data } = value
        if (!sessionId || !data) {
          return false
        }

        if (Array.isArray(data)) {
          return
        }

        for (const item of data) {
          const { msgId, nickName } = item
          if (!msgId || !nickName || !/^\d+$/.test(msgId)) {
            return false
          }
        }
        break
      }
      default:
        return false
    }
  }

  return true
}

/**
 * 是否为 MIX 类型
 * @param {*} type
 * @returns
 */
export const isMixType = (type) => {
  const MIX_CANDIDATES =
    msgContentType.TEXT |
    msgContentType.EMOJI |
    msgContentType.SCREENSHOT |
    msgContentType.AT |
    msgContentType.QUOTE

  return type <= MIX_CANDIDATES
}

/**
 * 所有包含图片的type集合
 * @returns
 */
export const imageTypes = () => {
  return [
    msgContentType.IMAGE,
    msgContentType.SCREENSHOT,
    msgContentType.SCREENSHOT || msgContentType.TEXT,
    msgContentType.SCREENSHOT || msgContentType.EMOJI,
    msgContentType.SCREENSHOT || msgContentType.AT,
    msgContentType.SCREENSHOT || msgContentType.QUOTE,
    msgContentType.SCREENSHOT || msgContentType.TEXT || msgContentType.EMOJI,
    msgContentType.SCREENSHOT || msgContentType.TEXT || msgContentType.AT,
    msgContentType.SCREENSHOT || msgContentType.TEXT || msgContentType.QUOTE,
    msgContentType.SCREENSHOT || msgContentType.EMOJI || msgContentType.AT,
    msgContentType.SCREENSHOT || msgContentType.EMOJI || msgContentType.QUOTE,
    msgContentType.SCREENSHOT || msgContentType.AT || msgContentType.QUOTE,
    msgContentType.SCREENSHOT || msgContentType.TEXT || msgContentType.EMOJI || msgContentType.AT,
    msgContentType.SCREENSHOT || msgContentType.TEXT || msgContentType.AT || msgContentType.QUOTE,
    msgContentType.SCREENSHOT || msgContentType.EMOJI || msgContentType.AT || msgContentType.QUOTE,

    msgContentType.SCREENSHOT ||
      msgContentType.TEXT ||
      msgContentType.EMOJI ||
      msgContentType.QUOTE,

    msgContentType.SCREENSHOT ||
      msgContentType.TEXT ||
      msgContentType.EMOJI ||
      msgContentType.AT ||
      msgContentType.QUOTE
  ]
}
