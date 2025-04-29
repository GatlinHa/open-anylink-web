import { useMessageStore } from '@/stores'

export const onReceiveDeleteMsg = () => {
  return (msg) => {
    const messageData = useMessageStore()
    const sessionId = msg.body.sessionId
    const deleteMsgId = msg.body.content
    messageData.removeMsgRecord(sessionId, deleteMsgId)
  }
}
