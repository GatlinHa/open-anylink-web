import { Msg, MsgType } from '@/proto/msg'
import { useUserStore } from '@/stores'
import { v4 as uuidv4 } from 'uuid'
import { generateSign } from '../utils/crypto'
import {
  chatConstructor,
  heartBeatConstructor,
  helloConstructor,
  chatReadConstructor,
  statusReqConstructor,
  statusSyncConstructor,
  groupChatConstructor,
  groupChatReadConstructor,
  atConstructor
} from './constructor'
import {
  onReceiveStatusResMsg,
  onReceiveChatMsg,
  onReceiveChatReadMsg,
  onReceiveGroupChatMsg,
  onReceiveGroupChatReadMsg,
  onReceiveGroupSystemMsg,
  onReceiveAtMsg
} from '@/js/event'

class WsConnect {
  /**
   * 单例
   */
  static instance = null

  /**
   * 单例
   */
  static getInstance() {
    if (!WsConnect.instance) {
      WsConnect.instance = new WsConnect()
    }
    return WsConnect.instance
  }

  /**
   * WebSockt连接对象
   */
  connect

  /**
   * 是否连接标识
   */
  isConnect

  /**
   * 消息接收缓冲区
   */
  buffer

  /**
   * ws地址
   */
  url

  /**
   * 心跳设置
   */
  heartBeat = {
    interval: 5000, // 间隔时间
    timeoutTimes: 3, // 超时次数，超过该次数不再发心跳
    healthPoint: 0, // 健康指数，心跳发出+1，收到心跳-1，最小不能小于0，超过timeoutTimes次数视为心跳中断
    taskObj: null,
    task: null,
    start: null,
    stop: null
  }

  /**
   * 重连设置
   */
  reconnect = {
    interval: 5000, // 间隔时间
    task: null,
    taskObj: null,
    start: null,
    stop: null
  }

  /**
   * 重发设置
   */
  reSend = {
    interval: 1000, // 间隔时间
    timeoutTimes: 5, // 超时次数，超过该次数不再重发
    curReSendTimes: 0 // 当前重发的次数
  }

  /**
   * 消息发送时携带的是seq，没有msgId，服务端回复DELIVERED消息时返回了msgId，此时要回填msgId
   */
  msgIdRefillCallback = {}

  /**
   * onMessage消息不同类型绑定的处理事件
   */
  events = {
    [MsgType.HELLO]: () => {
      this.heartBeat.start()
      this.isConnect = true
    },
    [MsgType.DELIVERED]: (deliveredMsg) => {
      this.msgIdRefillCallback[deliveredMsg.body.seq](deliveredMsg.body.msgId)
      setTimeout(() => {
        // 不能立即删除，因为有可能重发消息还会用到
        delete this.msgIdRefillCallback[deliveredMsg.body.seq]
      }, 30000)
    },
    [MsgType.HEART_BEAT]: () => {
      if (this.heartBeat.healthPoint > 0) this.heartBeat.healthPoint--
    },
    [MsgType.STATUS_RES]: onReceiveStatusResMsg(),
    [MsgType.CHAT]: onReceiveChatMsg(),
    [MsgType.CHAT_READ]: onReceiveChatReadMsg(),
    [MsgType.GROUP_CHAT]: onReceiveGroupChatMsg(),
    [MsgType.GROUP_CHAT_READ]: onReceiveGroupChatReadMsg(),
    [MsgType.AT]: onReceiveAtMsg(),
    [MsgType.SYS_GROUP_CREATE]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_ADD_MEMBER]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_DEL_MEMBER]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_SET_ADMIN]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_CANCEL_ADMIN]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_SET_ALL_MUTED]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_CANCEL_ALL_MUTED]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_SET_JOIN_APPROVAL]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_CANCEL_JOIN_APPROVAL]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_SET_HISTORY_BROWSE]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_CANCEL_HISTORY_BROWSE]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_OWNER_TRANSFER]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_UPDATE_MEMBER_MUTED]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_LEAVE]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_DROP]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_UPDATE_ANNOUNCEMENT]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_UPDATE_NAME]: onReceiveGroupSystemMsg(),
    [MsgType.SYS_GROUP_UPDATE_AVATAR]: onReceiveGroupSystemMsg()
  }

  /**
   * 业务处理器
   */
  dataConstructor = {
    [MsgType.HELLO]: helloConstructor,
    [MsgType.HEART_BEAT]: heartBeatConstructor,
    [MsgType.CHAT]: chatConstructor,
    [MsgType.CHAT_READ]: chatReadConstructor,
    [MsgType.GROUP_CHAT]: groupChatConstructor,
    [MsgType.GROUP_CHAT_READ]: groupChatReadConstructor,
    [MsgType.STATUS_REQ]: statusReqConstructor,
    [MsgType.STATUS_SYNC]: statusSyncConstructor,
    [MsgType.AT]: atConstructor
  }

  /**
   * 构造函数
   */
  constructor() {
    this.buffer = new Uint8Array()
    this.isConnect = false

    this.heartBeat.task = this.sendHeartBeat.bind(this)
    this.heartBeat.start = this.heartBeatStart.bind(this)
    this.heartBeat.stop = this.heartBeatStop.bind(this)

    this.reconnect.task = this.reconnectTask.bind(this)
    this.reconnect.start = this.reconnectStart.bind(this)
    this.reconnect.stop = this.reconnectStop.bind(this)
  }

  /**
   * 创建ws连接，登录成功之后调用
   */
  async createWs() {
    if (this.isConnect) {
      return
    }
    // console.log('create websocket')
    const userData = useUserStore()
    const token = await userData.getAccessToken()
    const traceId = uuidv4()
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const sign = generateSign(userData.at.secret, `${traceId}${timestamp}`)
    this.url = `${import.meta.env.VITE_WS_URL}?traceId=${traceId}&timestamp=${timestamp}&sign=${sign}&token=${token}`
    this.connect = new WebSocket(this.url)
    this.connect.onmessage = this.onMessage.bind(this)
    this.connect.onclose = this.onClose.bind(this)
    this.connect.onopen = this.onOpen.bind(this)
    this.connect.onerror = this.onError.bind(this)
  }

  /**
   * 关闭ws连接，登出之后调用
   * @param {*} code 正常登出code填0
   */
  closeWs() {
    // console.log('client close the websocket connect')
    this.heartBeat.stop()
    this.reconnect.stop()
    this.connect && this.connect.close(1000) //1000表示正常退出
    this.connect = null
    this.isConnect = false
  }

  onOpen() {
    // console.log('onOpen', evt)
    this.connect.send(helloConstructor())
  }

  async onMessage(evt) {
    // console.log('onMessage', evt)
    const arrayBuffer = await evt.data.arrayBuffer()
    const frames = this.decode(new Uint8Array(arrayBuffer))

    frames.forEach((frame) => {
      const msg = Msg.decode(frame)
      // console.log(`receive a ${MsgType[msg.header.msgType]} msg: `, msg)
      if (this.events[msg.header.msgType]) this.events[msg.header.msgType](msg)
    })
  }

  async onClose(evt) {
    // console.log('onClose', evt)
    this.heartBeat.stop()
    this.connect && this.connect.close()
    this.connect = null
    this.isConnect = false
    if (evt.code != 1000) {
      this.reconnect.start() // 非正常关闭要重连
    }
  }

  onError() {
    // console.log('onError', evt)
    this.heartBeat.stop()
    this.connect && this.connect.close()
    this.connect = null
    this.isConnect = false
    this.reconnect.start()
  }

  /**
   * 数据解码，其中解决了半包黏包问题
   * @param {*} data
   * @returns
   */
  decode(data) {
    this.buffer = this.concatBuffers(this.buffer, data)

    const frames = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.buffer.length < 1) {
        break
      }

      let length = 0
      let shift = 0
      let byteIndex = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (byteIndex >= this.buffer.length) {
          break
        }
        const byte = this.buffer[byteIndex]
        length |= (byte & 0x7f) << shift
        byteIndex++
        if ((byte & 0x80) === 0) {
          break
        }
        shift += 7
      }

      if (this.buffer.length < byteIndex + length) {
        // console.log('receive half message, cache it first')
        break
      }

      const frame = this.buffer.subarray(byteIndex, byteIndex + length)
      frames.push(frame)
      this.buffer = this.buffer.subarray(byteIndex + length)
    }

    return frames
  }

  concatBuffers(buffer1, buffer2) {
    const newBuffer = new Uint8Array(buffer1.length + buffer2.length)
    newBuffer.set(buffer1)
    newBuffer.set(buffer2, buffer1.length)
    return newBuffer
  }

  /**
   * 绑定事件
   * @param {*} event
   * @param {*} callback
   */
  bindEvent(event, callback) {
    this.events[event] = callback
  }

  /**
   * 绑定GroupSystemMsg事件
   * @param {*} callback
   */
  bindGroupSystemMsgEvent(callback) {
    this.events[MsgType.SYS_GROUP_CREATE] = callback
    this.events[MsgType.SYS_GROUP_ADD_MEMBER] = callback
    this.events[MsgType.SYS_GROUP_DEL_MEMBER] = callback
    this.events[MsgType.SYS_GROUP_SET_ADMIN] = callback
    this.events[MsgType.SYS_GROUP_CANCEL_ADMIN] = callback
    this.events[MsgType.SYS_GROUP_SET_ALL_MUTED] = callback
    this.events[MsgType.SYS_GROUP_CANCEL_ALL_MUTED] = callback
    this.events[MsgType.SYS_GROUP_SET_JOIN_APPROVAL] = callback
    this.events[MsgType.SYS_GROUP_CANCEL_JOIN_APPROVAL] = callback
    this.events[MsgType.SYS_GROUP_SET_HISTORY_BROWSE] = callback
    this.events[MsgType.SYS_GROUP_CANCEL_HISTORY_BROWSE] = callback
    this.events[MsgType.SYS_GROUP_OWNER_TRANSFER] = callback
    this.events[MsgType.SYS_GROUP_UPDATE_MEMBER_MUTED] = callback
    this.events[MsgType.SYS_GROUP_LEAVE] = callback
    this.events[MsgType.SYS_GROUP_DROP] = callback
    this.events[MsgType.SYS_GROUP_UPDATE_ANNOUNCEMENT] = callback
    this.events[MsgType.SYS_GROUP_UPDATE_NAME] = callback
    this.events[MsgType.SYS_GROUP_UPDATE_AVATAR] = callback
  }

  /**
   * 发送msg，封装了重发机制
   * @param {*} sessionId 会话id
   * @param {*} remoteId 对方id或者群id
   * @param {*} msgType
   * @param {*} content
   * @param {*} seq
   * @param {*} before 发送前的处理，用于展示发送前状态
   * @param {*} after  发送后(接收MsgType.DELIVERED时)的处理，用于展示发送后状态
   */
  sendMsg(sessionId, remoteId, msgType, content, seq, before, after) {
    const sequence = seq || uuidv4()
    const data = this.dataConstructor[msgType]({ sessionId, remoteId, content, sequence })
    before(data)
    this.msgIdRefillCallback[sequence] = after
    this.sendAgent(data)
  }

  /**
   * 发送代理，封装了重发机制(ws网络问题)
   */
  sendAgent(data) {
    if (this.isConnect) {
      this.connect.send(data)
    } else {
      if (this.reSend.curReSendTimes >= this.reSend.timeoutTimes) {
        // console.log('resend too many times')
        this.reSend.curReSendTimes = 0
        // TODO 应该反馈到业务层给提示
      } else {
        setTimeout(() => {
          this.sendAgent(data)
        }, this.reSend.interval)
        this.reSend.curReSendTimes++
      }
    }
  }

  sendHeartBeat() {
    if (this.heartBeat.healthPoint >= this.heartBeat.timeoutTimes) {
      // console.log('heart beat timeout')
      this.heartBeatStop()
      this.connect && this.connect.close()
      this.connect = null
      this.isConnect = false
      this.reconnect.start()
    } else {
      this.isConnect && this.connect.send(heartBeatConstructor())
      this.heartBeat.healthPoint++
    }
  }

  heartBeatStart() {
    // console.log('启动心跳任务')
    if (this.heartBeat.taskObj) {
      return
    }
    this.heartBeat.taskObj = setInterval(this.heartBeat.task, this.heartBeat.interval)
  }

  heartBeatStop() {
    // console.log('中止心跳任务')
    this.heartBeat.taskObj && clearInterval(this.heartBeat.taskObj)
    this.heartBeat.taskObj = null
    this.heartBeat.healthPoint = 0
  }

  reconnectTask() {
    if (!this.isConnect) {
      // console.log('reconnecting websocket')
      this.createWs()
    } else {
      // console.log('no need to reconnect websocket')
      this.reconnectStop()
    }
  }

  reconnectStart() {
    // console.log('启动重连任务')
    if (this.reconnect.taskObj) {
      return
    }
    this.reconnect.taskObj = setInterval(this.reconnect.task, this.reconnect.interval)
  }

  reconnectStop() {
    // console.log('中止重连任务')
    this.reconnect.taskObj && clearInterval(this.reconnect.taskObj)
    this.reconnect.taskObj = null
  }

  statusReq(accounts) {
    if (accounts.length > 0) {
      const data = this.dataConstructor[MsgType.STATUS_REQ](JSON.stringify(accounts))
      this.isConnect && this.connect.send(data)
    }
  }

  statusSync(status) {
    const data = this.dataConstructor[MsgType.STATUS_SYNC](status)
    this.isConnect && this.connect.send(data)
  }
}

export default WsConnect.getInstance()
