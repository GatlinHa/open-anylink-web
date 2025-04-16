import axios from 'axios'
import { useUserStore } from '@/stores'
import router from '@/router'
import { generateSign } from './crypto'
import { v4 as uuidv4 } from 'uuid'
import { ElMessage } from 'element-plus'
import { CLIENT_TYPE, CLIENT_NAME, CLIENT_VERSION } from '@/const/userConst'

const baseURL = import.meta.env.VITE_RESTAPI_URL
const noTokenReqList = [
  '/user/getCaptcha',
  '/user/verifyCaptcha',
  '/user/nonce',
  '/user/login',
  '/user/register'
]

const instance = axios.create({
  baseURL,
  timeout: 10000
})

// 请求拦截器
instance.interceptors.request.use(
  async (config) => {
    const userData = useUserStore()
    const traceId = uuidv4()
    if (config.url === '/user/refreshToken') {
      const token = userData.getRefreshToken()
      const timestamp = Math.floor(new Date().getTime() / 1000)
      const sign = generateSign(userData.rt.secret, `${traceId}${timestamp}`)
      config.headers.timestamp = timestamp
      config.headers.sign = sign
      config.headers.refreshToken = token
    } else if (!noTokenReqList.includes(config.url)) {
      const token = await userData.getAccessToken()
      const timestamp = Math.floor(new Date().getTime() / 1000)
      const sign = generateSign(userData.at.secret, `${traceId}${timestamp}`)
      config.headers.timestamp = timestamp
      config.headers.sign = sign
      config.headers.accessToken = token
    }
    config.headers.traceId = traceId
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
    console.error(
      'The response was not the expected code: ',
      res.config?.url,
      res.data?.code,
      res.data?.desc
    )
    return Promise.reject(res)
  },
  async (err) => {
    if (err.response?.status === 401) {
      useUserStore().clearAt()
      useUserStore().clearRt()
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    } else {
      console.error(
        'The request was failed: ',
        err.config?.url,
        err.response?.status,
        err.response?.message
      )
    }

    return Promise.reject(err)
  }
)

export default instance
export { baseURL }
