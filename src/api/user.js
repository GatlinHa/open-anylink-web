import request from '@/js/utils/request'
import { useUserStore } from '@/stores'
import { CLIENT_TYPE, CLIENT_NAME, CLIENT_VERSION } from '@/const/userConst'
import { encryptPasswordObj, encryptDoublePasswordObj } from '@/js/utils/crypto'

export const userRegisterService = async ({ account, nickName, password }) => {
  const obj = await encryptPasswordObj(account, password)
  return request.post('/user/register', {
    account: account,
    clientId: useUserStore().clientId,
    nickName: nickName,
    ...obj
  })
}

export const userNonceService = ({ account }) => {
  return request.get('/user/nonce', {
    params: {
      account: account,
      clientId: useUserStore().clientId
    }
  })
}

export const userGetCaptchaService = () => {
  return request.get('/user/getCaptcha')
}

export const userVerifyCaptchaService = (obj) => {
  return request.post('/user/verifyCaptcha', obj)
}

export const userForgetService = async (obj) => {
  const passwordObjObj = await encryptPasswordObj(obj.account, obj.password)
  delete obj.password
  return request.post('/user/forget', {
    clientId: useUserStore().clientId,
    ...obj,
    ...passwordObjObj
  })
}

export const userLoginService = async ({ account, password }) => {
  const obj = await encryptPasswordObj(account, password)
  return request.post('/user/login', {
    account: account,
    clientId: useUserStore().clientId,
    ...obj
  })
}

export const userLogoutService = ({ account }) => {
  return request.post('/user/logout', { account: account })
}

export const userInfoService = () => {
  return request.get('/user/querySelf')
}

export const userModifySelfService = (obj) => {
  return request.post('/user/modifySelf', obj)
}

export const userModifyPassword = async ({ account, oldPasswordStr, newPasswordStr }) => {
  const obj = await encryptDoublePasswordObj(account, oldPasswordStr, newPasswordStr)
  return request.post('/user/modifyPwd', {
    clientId: useUserStore().clientId,
    ...obj
  })
}

export const userQueryService = (obj) => {
  return request.get('/user/query', { params: obj })
}

export const userQueryByNickService = (obj) => {
  return request.get('/user/findByNick', { params: obj })
}

export const refreshToken = async () => {
  return request.post('/user/refreshToken', {
    clientType: CLIENT_TYPE,
    clientName: CLIENT_NAME,
    clientVersion: CLIENT_VERSION
  })
}
