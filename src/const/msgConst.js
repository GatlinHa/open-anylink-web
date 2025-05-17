export const msgType = {
  NO_MORE_MSG: 1,
  USER_MSG: 2
}

export const proto = {
  magic: 0x8e110b0b,
  version: 0x01
}

// 和服务端约定好的，第一个消息都是从10001开始的
export const BEGIN_MSG_ID = 10001

/**
 * 消息内容类型
 * MIX类型为TEXT,EMOJI,SCREENSHOT,AT,QUOTE的组合
 */
export const msgContentType = {
  TEXT: 0b0000000000000001, // 文本
  EMOJI: 0b0000000000000010, // 表情
  SCREENSHOT: 0b0000000000000100, // 截图
  AT: 0b0000000000001000, // @
  QUOTE: 0b0000000000010000, // 引用

  IMAGE: 0b0000001000000000, // 图片
  RECORDING: 0b0000010000000000, // 语音
  AUDIO: 0b0000100000000000, // 音频文件
  VIDEO: 0b0001000000000000, // 视频
  DOCUMENT: 0b0010000000000000, // 文档
  FORWARD_TOGETHER: 0b0100000000000000 // 合并转发消息
}

// 消息发送状态
export const msgSendStatus = {
  PENDING: 'pending', // 发送中
  OK: 'ok', // 发送成功
  FAILED: 'failed', // 发送失败
  UPLOAD_FAILED: 'uploadFailed' // 文件上传失败
}

/**
 * 消息中文件的上传状态
 * 目前没有实现上传状态以及上传进度的效果
 */
export const msgFileUploadStatus = {
  UPLOAD_DEFAULT: 0, // 默认状态，不上传
  UPLOADING: 1, // 上传中
  UPLOAD_SUCCESS: 2, // 上传成功
  UPLOAD_FAILED: 3 // 上传失败
}

/**
 * 消息撤回时间限制 10分钟
 */
export const MSG_REVOKE_TIME_LIMIT = 365 * 24 * 60 * 60 * 1000

/**
 * 消息撤回后能重新编辑的时间限制 2分钟
 */
export const MSG_REEDIT_TIME_LIMIT = 2 * 60 * 1000
