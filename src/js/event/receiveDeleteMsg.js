import { useMessageStore } from '@/stores'

export const onReceiveDeleteMsg = () => {
  return (msg) => {
    const messageData = useMessageStore()
    const sessionId = msg.body.sessionId
    const deleteMsgIds = msg.body.content

    deleteMsgIds.split(',').forEach((item) => {
      messageData.removeMsgRecord(sessionId, item)
    })
  }
}
