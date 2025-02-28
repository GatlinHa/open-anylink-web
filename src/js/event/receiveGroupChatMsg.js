import { nextTick } from 'vue'
import { messageStore } from '@/stores'
import { MsgType } from '@/proto/msg'
import { msgChatQuerySessionService } from '@/api/message'
import { playMsgReceive } from '../utils/audio'

export const onReceiveGroupChatMsg = (msgListDiv = null, capacity = null) => {
  return async (msg) => {
    const messageData = messageStore()
    const sessionId = msg.body.sessionId
    const now = new Date()

    // 如果sessionList中没有,需要加载这个session
    if (!messageData.sessionList[sessionId]) {
      msgChatQuerySessionService({
        sessionId: sessionId
      }).then((res) => {
        messageData.addSession(res.data.data.session)
      })
    }

    // 是不是自己的其他客户端发送过来的已读同步消息
    const readParams =
      msg.body.fromId === msg.body.toId
        ? {
            readMsgId: msg.body.msgId, // 最后一条消息是自己发的，因此已读更新到刚发的这条消息的msgId
            readTime: now,
            unreadCount: 0 // 最后一条消息是自己发的，因此未读是0
          }
        : {}

    messageData.updateSession({
      sessionId: sessionId,
      unreadCount: messageData.sessionList[sessionId].unreadCount + 1,
      ...readParams
    })

    messageData.addMsgRecords(sessionId, [
      {
        sessionId: sessionId,
        msgId: msg.body.msgId,
        fromId: msg.body.fromId,
        msgType: MsgType.GROUP_CHAT,
        content: msg.body.content,
        msgTime: now
      }
    ])

    playMsgReceive()

    // 如果是当前正打开的会话
    if (msgListDiv && capacity && messageData.selectedSessionId === sessionId) {
      const scrollHeight = msgListDiv.value?.scrollHeight
      const clientHeight = document.querySelector('.show-message-box')?.clientHeight
      capacity.value += 1 //接收一条消息,展示列表的容量就+1
      nextTick(() => {
        // 如果滚动条触底,接收到新消息时继续保持触底
        if (scrollHeight - msgListDiv.value?.scrollTop - clientHeight < 1) {
          msgListDiv.value.scrollTop = msgListDiv.value?.scrollHeight
        }
      })
    }
  }
}
