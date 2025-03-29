import { useMessageStore } from '@/stores'

export const onReceiveChatReadMsg = () => {
  return async (msg) => {
    const messageData = useMessageStore()
    messageData.updateSession({
      sessionId: msg.body.sessionId,
      remoteRead: msg.body.content
    })

    if (msg.body.fromId === msg.body.toId) {
      const now = new Date()
      messageData.updateSession({
        sessionId: msg.body.sessionId,
        readMsgId: msg.body.msgId,
        readTime: now,
        unreadCount: 0 // 未读清空
      })
    }
  }
}
