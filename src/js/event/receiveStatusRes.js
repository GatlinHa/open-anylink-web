import { useUserStore, useMessageStore, useGroupStore } from '@/stores'
import { combineId, jsonParseSafe } from '@/js/utils/common'
import { MsgType } from '@/proto/msg'

export const onReceiveStatusResMsg = () => {
  return async (msg) => {
    const userData = useUserStore()
    const messageData = useMessageStore()
    const groupData = useGroupStore()

    // 1. 更新本账号的多端下的最终状态
    const content = jsonParseSafe(msg.body.content)
    if (content[userData.user.account]) {
      userData.updateUserStatus(content[userData.user.account])
    }

    const selectedSession = messageData.sessionList[messageData.selectedSessionId]

    // 2. 更新单聊对象的状态
    Object.keys(content).forEach((key) => {
      //遍历content的每个属性，属性key是account
      const sessionId = combineId(userData.user.account, key)
      if (messageData.sessionList[sessionId]) {
        messageData.updateSession({
          sessionId: sessionId,
          objectInfo: {
            ...messageData.sessionList[sessionId].objectInfo,
            status: content[key]
          }
        })
      }

      // 3. 更新打开群组聊天中的成员对象的状态
      if (selectedSession && selectedSession.sessionType === MsgType.GROUP_CHAT) {
        const groupId = selectedSession.remoteId
        const groupMembers = groupData.groupMembersList[groupId]
        if (groupMembers && key in groupMembers) {
          groupMembers[key].status = content[key]
        }
      }
    })
  }
}
