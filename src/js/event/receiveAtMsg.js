import { useMessageStore } from '@/stores'
import { jsonParseSafe } from '../utils/common'

export const onReceiveAtMsg = () => {
  return (msg) => {
    const messageData = useMessageStore()
    const sessionId = msg.body.sessionId
    const content = jsonParseSafe(msg.body.content)
    messageData.addAtRecords(sessionId, {
      msgId: msg.body.msgId,
      sessionId,
      fromId: msg.body.fromId,
      groupId: msg.body.groupId,
      referMsgId: content.referMsgId,
      msgTime: new Date()
    })
  }
}
