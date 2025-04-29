import request from '@/js/utils/request'

export const msgChatSessionListService = () => {
  return request.get('/chat/sessionList')
}

export const msgUpdateSessionService = (obj) => {
  return request.post('/chat/updateSession', obj)
}

export const msgChatPullMsgService = (obj) => {
  return request.get('/chat/pullMsg', { params: obj })
}

export const msgChatRevokeMsgService = (obj) => {
  return request.post('/chat/revokeMsg', obj)
}

export const msgChatDeleteMsgService = (obj) => {
  return request.post('/chat/deleteMsg', obj)
}

export const msgAtService = () => {
  return request.get('/chat/queryAt')
}

export const msgChatCreateSessionService = (obj) => {
  return request.post('/chat/createSession', obj)
}

export const msgChatQuerySessionService = (obj) => {
  return request.get('/chat/querySession', { params: obj })
}

export const msgChatCloseSessionService = (obj) => {
  return request.post('/chat/closeSession', obj)
}

export const msgCreatePartitionService = (obj) => {
  return request.post('/chat/createPartition', obj)
}

export const msgQueryPartitionService = () => {
  return request.get('/chat/queryPartition')
}

export const msgUpdatePartitionService = (obj) => {
  return request.post('/chat/updatePartition', obj)
}

export const msgDeletePartitionService = (obj) => {
  return request.post('/chat/delPartition', obj)
}
