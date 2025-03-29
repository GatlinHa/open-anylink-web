import { useMessageStore } from '@/stores'

export const onReceiveGroupChatReadMsg = () => {
  return async (msg) => {
    if (msg.body.fromId === msg.body.toId) {
      const messageData = useMessageStore()
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
