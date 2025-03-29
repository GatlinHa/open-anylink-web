import { useMessageStore, useGroupStore } from '@/stores'
import { msgChatQuerySessionService } from '@/api/message'
import { groupInfoService } from '@/api/group'

export const onReceiveGroupSystemMsg = (updateScroll, capacity) => {
  return async (msg) => {
    const messageData = useMessageStore()
    const groupData = useGroupStore()
    const sessionId = msg.body.sessionId
    const now = new Date()

    // 更新session
    msgChatQuerySessionService({ sessionId: sessionId }).then((res) => {
      messageData.addSession(res.data.data.session)
    })

    // 更新group信息
    groupInfoService({ groupId: msg.body.groupId }).then((res) => {
      groupData.setGroupInfo({
        groupId: msg.body.groupId,
        groupInfo: res.data.data.groupInfo || {}
      })
      groupData.setGroupMembers({
        groupId: msg.body.groupId,
        members: res.data.data.members || {}
      })
    })

    // 更新聊天记录
    await messageData.addMsgRecords(sessionId, [
      {
        sessionId: sessionId,
        msgId: msg.body.msgId,
        fromId: msg.body.fromId,
        msgType: msg.header.msgType,
        content: msg.body.content,
        msgTime: now
      }
    ])

    // 如果是当前正打开的会话
    if (messageData.selectedSessionId === sessionId) {
      updateScroll()
      capacity.value++ //接收一条消息,展示列表的容量就+1
    }
  }
}
