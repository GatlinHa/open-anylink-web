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

// 消息内容类型
export const msgContentType = {
  MIX: 0, // 组合，包含多种类型
  TEXT: 1, // 文本
  IMAGE: 2, // 图片
  RECORDING: 3, // 录音
  AUDIO: 4, // 音频文件
  EMOJI: 5, // 视频
  VIDEO: 6 //表情
}

// 消息发送状态
export const msgSendStatus = {
  PENDING: 'pending', // 发送中
  OK: 'ok', // 发送成功
  FAILED: 'failed' // 发送失败
}
