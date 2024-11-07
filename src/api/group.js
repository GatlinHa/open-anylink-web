import request from '@/js/utils/request'
import { getReqBody } from '@/api/common'

export const groupCreateService = (obj) => {
  return request.post('/groupmng/createGroup', getReqBody(obj))
}

export const groupListService = () => {
  return request.post('/groupmng/queryGroupList', getReqBody())
}
