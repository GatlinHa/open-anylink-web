import axios from 'axios'
import { userStore } from '@/stores'
import router from '@/router'
import { generateSign } from './crypto'
import { v4 as uuidv4 } from 'uuid'
import { ElMessage } from 'element-plus'
import { CLIENT_TYPE, CLIENT_NAME, CLIENT_VERSION } from '@/const/userConst'

const baseURL = import.meta.env.VITE_BASE_URL
const noTokenReqList = [
  '/user/getCaptcha',
  '/user/verifyCaptcha',
  '/user/nonce',
  '/user/login',
  '/user/register',
  '/user/validateAccount'
]

const instance = axios.create({
  baseURL,
  timeout: 10000
})

// 请求拦截器
instance.interceptors.request.use(
  async (config) => {
    const userData = userStore()
    if (config.url === '/user/refreshToken') {
      const token = userData.getRefreshToken()
      const traceId = uuidv4()
      const timestamp = Math.floor(new Date().getTime() / 1000)
      const sign = generateSign(userData.rt.secret, `${traceId}${timestamp}`)
      config.headers.traceId = traceId
      config.headers.timestamp = timestamp
      config.headers.sign = sign
      config.headers.refreshToken = token
    } else if (!noTokenReqList.includes(config.url)) {
      const token = await userData.getAccessToken()
      const traceId = uuidv4()
      const timestamp = Math.floor(new Date().getTime() / 1000)
      const sign = generateSign(userData.at.secret, `${traceId}${timestamp}`)
      config.headers.traceId = traceId
      config.headers.timestamp = timestamp
      config.headers.sign = sign
      config.headers.accessToken = token
    }
    config.headers.clientType = CLIENT_TYPE
    config.headers.clientName = CLIENT_NAME
    config.headers.clientVersion = CLIENT_VERSION

    return config
  },
  (err) => Promise.reject(err)
)

// 响应拦截器
instance.interceptors.response.use(
  (res) => {
    if (res.data.code === 0) {
      return res
    }

    ElMessage.error(res.data.desc || '服务异常')
    return Promise.reject(res.data)
  },
  async (err) => {
    if (err.response?.status === 401) {
      userStore().clearAt()
      userStore().clearRt()
      ElMessage.error('您还未登录，请先登录')
      router.push('/login')
    } else {
      ElMessage.error(err.response?.message || '服务异常')
    }

    return Promise.reject(err)
  }
)

export default instance
export { baseURL }
