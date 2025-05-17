import { msgSendStatus } from '@/const/msgConst'

/**
 * 消息渲染及缓存时用到实体类，收录所有可能用到的属性，目前作为参考用，并未实际调用
 */
class Message {
  /**
   * 会话内唯一消息Id
   */
  msgId

  /**
   * 消息序列号
   */
  seq

  /**
   * 消息所属的会话ID
   */
  sessionId

  /**
   * 消息发送ID
   */
  fromId

  /**
   * 消息类型
   */
  msgType

  /**
   * 消息内容
   */
  content

  /**
   * 消息状态：发送中，发送成功，发送失败
   */
  status

  /**
   * 接收消息的时间
   */
  msgTime

  /**
   * 消息发送的时间，发送消息时才需要填
   */
  sendTime

  /**
   * 消息中文件的上传状态
   */
  uploadStatus

  /**
   * 消息中文件的上传进度
   */
  uploadProgress

  constructor(
    sessionId,
    fromId,
    msgType,
    content,
    contentType,
    msgTime,
    sendTime = undefined,
    msgId = undefined,
    seq = undefined,
    status = msgSendStatus.PENDING,
    uploadStatus = undefined,
    uploadProgress = undefined
  ) {
    this.msgId = msgId
    this.seq = seq
    this.sessionId = sessionId
    this.fromId = fromId
    this.msgType = msgType
    this.content = content
    this.contentType = contentType
    this.status = status
    this.msgTime = msgTime
    this.sendTime = sendTime
    this.uploadStatus = uploadStatus
    this.uploadProgress = uploadProgress
  }
}

export { Message }
