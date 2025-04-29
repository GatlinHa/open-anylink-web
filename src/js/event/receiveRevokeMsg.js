import { useMessageStore } from '@/stores'

export const onReceiveRevokeMsg = () => {
  return (msg) => {
    const messageData = useMessageStore()
    const sessionId = msg.body.sessionId
    const revokeMsgId = msg.body.content
    messageData.revokeMsgRcord(sessionId, revokeMsgId)
  }
}
