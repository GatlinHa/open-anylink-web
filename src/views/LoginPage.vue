<script setup>
import { User, Lock, Avatar, Key, Postcard } from '@element-plus/icons-vue'
import { ref, watch, onMounted } from 'vue'
import router from '@/router'
import {
  userRegisterService,
  userLoginService,
  userGetCaptchaService,
  userVerifyCaptchaService,
  userForgetService
} from '@/api/user.js'
import { userStore } from '@/stores'
import { generateClientId } from '@/js/utils/common'
import { ElMessage } from 'element-plus'
import { flowLimiteWrapper } from '@/js/utils/flowLimite'

const tabMode = ref('login')

// 提交的整个form表单的数据
const formModel = ref({
  account: '',
  nickName: '',
  password: '',
  repassword: '',
  captchaCode: '',
  forgetKey: '',
  forgetCode: ''
})
// 表单对象
const form = ref()
const isRemenberMe = ref(false)
const isReadProtocol = ref(false)

const demoFlag = import.meta.env.VITE_DEMO_FLAG === 'true'
const demoData = JSON.parse(import.meta.env.VITE_DEMO_ACCOUNTS)
const accountPlaceholder = demoFlag ? '请使用演示账号登录' : '请输入账号'

// 表单的校验规则
const rules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]{6,32}$/,
      message: '账号必须是6-32位的字母、数字或下划线',
      trigger: 'blur'
    }
  ],
  nickName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是6-15位的非空字符',
      trigger: 'blur'
    }
  ],
  repassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是6-15位的非空字符',
      trigger: 'blur'
    },
    {
      validator: (rule, value, callback) => {
        if (value !== formModel.value.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  captchaCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9]{4}$/,
      message: '验证码必须是4位数字或字母',
      trigger: 'blur'
    }
  ],
  forgetKey: [
    { required: true, message: '请输入手机号码或邮箱', trigger: 'blur' },
    {
      pattern: /^(1[3-9]\d{9}|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)$/,
      message: '手机号码或邮箱格式不正确',
      trigger: 'blur'
    }
  ],
  forgetCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      pattern: /^\d{4}$/,
      message: '验证码必须是4位数字',
      trigger: 'blur'
    }
  ]
}

const userData = userStore()

const register = async () => {
  if (demoFlag) {
    ElMessage.warning('演示环境不支持注册账号，请用演示账号登录')
    tabMode.value = 'login'
    return
  }
  await form.value.validate() // 注册之前预校验
  try {
    await verifyCaptchaWrapper()
  } catch (error) {
    formModel.value.captchaCode = ''
    return
  }

  await userRegisterService(formModel.value)
  ElMessage.success('注册成功')
  tabMode.value = 'login'
}

const login = async () => {
  if (demoFlag && !isReadProtocol.value) {
    ElMessage.warning('请阅读并同意协议')
    return
  }

  await form.value.validate() // 登录之前预校验
  loginWrapper()
    .then(async (res) => {
      userData.setAt(res.data.data.accessToken)
      userData.setRt(res.data.data.refreshToken)
      userData.setIsRemenberMe(isRemenberMe.value)
      await userData.updateUser() //这里要用await确保拿到结果了再跳转，否则其他页面依赖user的不能及时得到更新
      ElMessage.success('登录成功')
      router.push('/')
    })
    .catch(() => {
      formModel.value.password = ''
    })
}

const resetPasswrod = async () => {
  if (demoFlag) {
    ElMessage.warning('演示环境不支持找回密码，请用演示账号登录')
    tabMode.value = 'login'
    return
  }
  await form.value.validate() // 预校验
  try {
    await forgetWrapper()
  } catch (error) {
    formModel.value.forgetCode = ''
    return
  }

  ElMessage.success('密码重置成功')
  tabMode.value = 'login'
}

const onLoginDemoAccount = (index) => {
  formModel.value.account = demoData[index].account
  formModel.value.password = demoData[index].password
}

onMounted(() => {
  isRemenberMe.value = userData.isRemenberMe
  if (isRemenberMe.value) {
    formModel.value.account = userData.user.account
  }

  if (!userData.clientId) {
    userData.setClientId(generateClientId())
  }

  // 在挂载钩子函数中恢复计时器
  const forgetTimerEndTime = localStorage.getItem('forget-timer-end-time')
  const nowTime = new Date().getTime()
  if (forgetTimerEndTime - nowTime > 0 && forgetTimerEndTime - nowTime < totalSec * 1000) {
    forgetRemainSec.value = Math.floor((forgetTimerEndTime - nowTime) / 1000)
    createTimer()
  } else {
    localStorage.removeItem('forget-timer-end-time')
  }
})

const forgetPassword = () => {
  tabMode.value = 'forget'
}

const switchLogin = () => {
  tabMode.value = 'login'
}

const captchaId = ref('')
const captchaImage = ref('')

const switchRegister = () => {
  getCaptchaImageWrapper().catch(() => {
    // do nothing
  })
  tabMode.value = 'register'
}

const onClickCaptcha = () => {
  getCaptchaImageWrapper().catch(() => {
    // do nothing
  })
}

const loginWrapper = flowLimiteWrapper(
  async () => {
    return userLoginService(formModel.value)
  },
  5,
  60000
)
const getCaptchaImageWrapper = flowLimiteWrapper(
  async () => {
    captchaId.value = ''
    captchaImage.value = ''
    return userGetCaptchaService().then((res) => {
      captchaId.value = res.data.data.id
      captchaImage.value = res.data.data.base64
    })
  },
  10,
  60000
)
const verifyCaptchaWrapper = flowLimiteWrapper(
  async () => {
    return userVerifyCaptchaService({
      id: captchaId.value,
      code: formModel.value.captchaCode
    })
  },
  10,
  60000
)
const forgetWrapper = flowLimiteWrapper(
  async () => {
    return userForgetService({
      account: formModel.value.account,
      forgetType: parseforgetKey(),
      forgetKey: formModel.value.forgetKey,
      forgetCode: formModel.value.forgetCode,
      password: formModel.value.password
    })
  },
  5,
  60000
)

const totalSec = 60 // 忘记密码验证码发送间隔
const forgetTimer = ref() // 忘记密码验证码计时器
const forgetRemainSec = ref(totalSec) // 忘记密码验证码剩余发送的时间
const createTimer = () => {
  forgetTimer.value = setInterval(() => {
    forgetRemainSec.value = forgetRemainSec.value - 1
    if (forgetRemainSec.value <= 0) {
      clearInterval(forgetTimer.value)
      forgetTimer.value = null
      forgetRemainSec.value = totalSec
    }
  }, 1000)
}

const onSendForgetCodde = async () => {
  await form.value.validateField(['forgetKey'])
  if (!forgetTimer.value && forgetRemainSec.value === totalSec) {
    // TODO 发送真实的验证码
    const keyType = parseforgetKey()
    if (keyType === 'phoneNum') {
      ElMessage.success('验证码已发送至手机，注意查收')
    } else if (keyType === 'email') {
      ElMessage.success('验证码已发送至邮箱，注意查收')
    } else {
      ElMessage.success('手机号码或邮箱格式不正确')
    }
    // 将计时器到期时间保存到本地存储，防止刷新页面丢失
    localStorage.setItem('forget-timer-end-time', new Date().getTime() + totalSec * 1000)
    createTimer()
  }
}

const parseforgetKey = () => {
  const phoneRegex = /^1[3-9]\d{9}$/
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
  if (phoneRegex.test(formModel.value.forgetKey)) {
    return 'phoneNum'
  } else if (emailRegex.test(formModel.value.forgetKey)) {
    return 'email'
  } else {
    return 'none'
  }
}

watch(tabMode, () => {
  if (tabMode.value === 'login') {
    formModel.value = {
      account: isRemenberMe.value ? userData.user.account : '',
      password: ''
    }
  } else if (tabMode.value === 'register') {
    formModel.value = {
      account: '',
      nickName: '',
      password: '',
      repassword: '',
      captchaCode: ''
    }
  } else if (tabMode.value === 'forget') {
    formModel.value = {
      account: '',
      forgetKey: '',
      forgetCode: '',
      password: '',
      repassword: ''
    }
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-title">
      <span class="logo">Open AnyLink</span>
      <span class="feature">开源·轻量·分布式</span>
      <span class="desc">企业IM即时通讯解决方案</span>
    </div>
    <div class="login-box">
      <div class="login-header">
        <span v-if="tabMode === 'register'">注册</span>
        <span v-else-if="tabMode === 'login'">登录</span>
        <span v-else-if="tabMode === 'forget'">找回密码</span>
        <el-tag v-if="demoFlag" type="primary" size="large">演示环境</el-tag>
      </div>
      <el-form
        :model="formModel"
        :rules="rules"
        ref="form"
        size="large"
        autocomplete="off"
        v-if="tabMode === 'register'"
      >
        <el-form-item prop="account">
          <el-input
            v-model="formModel.account"
            :prefix-icon="User"
            :placeholder="accountPlaceholder"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item prop="nickName">
          <el-input
            v-model="formModel.nickName"
            :prefix-icon="Avatar"
            placeholder="请输入昵称"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="formModel.password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码"
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item prop="repassword">
          <el-input
            v-model="formModel.repassword"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入再次密码"
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item prop="captchaCode" class="captcha-form-item">
          <el-input
            v-model="formModel.captchaCode"
            :prefix-icon="Key"
            placeholder="请输入验证码"
            class="captcha-input"
          ></el-input>
          <div class="captcha-image">
            <img
              v-if="captchaImage"
              :src="captchaImage"
              @click="onClickCaptcha"
              style="cursor: pointer"
            />
            <img v-else src="@/assets/gif/loading.gif" style="width: 40px; height: 40px" />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button @click="register" class="button" type="primary" auto-insert-space>
            注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-link type="primary" :underline="false" @click="switchLogin">
            已有账号，立即登录
          </el-link>
        </el-form-item>
      </el-form>
      <el-form
        :model="formModel"
        :rules="rules"
        ref="form"
        size="large"
        autocomplete="off"
        v-else-if="tabMode === 'login'"
      >
        <el-form-item prop="account">
          <el-input
            v-model="formModel.account"
            :prefix-icon="User"
            :placeholder="accountPlaceholder"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item prop="password" style="margin-bottom: 10px">
          <el-input
            v-model="formModel.password"
            name="password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="login"
          ></el-input>
        </el-form-item>
        <el-form-item style="margin-bottom: 10px">
          <div class="flex">
            <el-checkbox v-model="isRemenberMe">记住我</el-checkbox>
            <el-link type="primary" :underline="false" @click="forgetPassword">
              忘记密码？
            </el-link>
          </div>
          <el-checkbox v-if="demoFlag" v-model="isReadProtocol">
            我已阅读并同意<a href="html/user-agreement.html" target="_blank"> 用户使用协议 </a>
            、
            <a href="html/privacy-policy.html" target="_blank">隐私政策 </a>
          </el-checkbox>
        </el-form-item>
        <el-form-item style="margin-bottom: 10px">
          <el-button @click="login" class="button" type="primary" auto-insert-space>
            登录
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-link type="primary" :underline="false" @click="switchRegister">
            没有账号？立即注册
          </el-link>
        </el-form-item>
      </el-form>
      <el-form
        :model="formModel"
        :rules="rules"
        ref="form"
        size="large"
        autocomplete="off"
        v-else-if="tabMode === 'forget'"
      >
        <el-form-item prop="account">
          <el-input
            v-model="formModel.account"
            :prefix-icon="User"
            :placeholder="accountPlaceholder"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item prop="forgetKey">
          <el-input
            v-model="formModel.forgetKey"
            :prefix-icon="Postcard"
            placeholder="请输入手机号码或邮箱"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="formModel.password"
            name="password"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="login"
          ></el-input>
        </el-form-item>
        <el-form-item prop="repassword">
          <el-input
            v-model="formModel.repassword"
            :prefix-icon="Lock"
            type="password"
            placeholder="请输入再次密码"
            show-password
          ></el-input>
        </el-form-item>
        <el-form-item prop="forgetCode" class="forgetcode-form-item">
          <el-input
            v-model="formModel.forgetCode"
            :prefix-icon="Key"
            placeholder="请输入验证码（填1234）"
            class="forgetcode-input"
          ></el-input>
          <el-button
            class="forgetcode-button"
            :disabled="forgetRemainSec !== totalSec"
            @click="onSendForgetCodde"
            style="margin-left: 20px"
          >
            {{ forgetRemainSec === totalSec ? '获取验证码' : forgetRemainSec + '秒后重新发送' }}
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetPasswrod" class="button" type="primary" auto-insert-space>
            重置
          </el-button>
        </el-form-item>
        <el-form-item>
          <div class="flex">
            <el-link type="primary" :underline="false" @click="switchRegister">
              没有账号？立即注册
            </el-link>
            <el-link type="primary" :underline="false" @click="switchLogin">
              已有账号，立即登录
            </el-link>
          </div>
        </el-form-item>
      </el-form>
      <div v-if="demoFlag && tabMode === 'login'" class="demo-info">
        <el-divider class="separation-line" content-position="center">演示账号</el-divider>
        <div class="demo-detail">
          <el-tag
            v-for="(item, index) in demoData"
            :key="item.account"
            class="demo-item"
            type="primary"
            @click="onLoginDemoAccount(index)"
          >
            账号{{ index + 1 }}
          </el-tag>
        </div>
      </div>
    </div>
    <div class="css-box">
      <ul class="bubble-bgwall">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>

    <div class="footer">
      <div v-if="demoFlag" class="row">
        <span class="item" style="color: red">
          特别声明：本演示环境为技术演示用途，不收集真实用户个人信息，所有演示数据均为虚拟测试数据，请勿发布或使用个人信息！
        </span>
      </div>
      <div class="row">
        <span class="item">©2024 - 2025 Open AnyLink</span>
      </div>
      <div class="row">
        <p class="item" style="margin: 0">
          <img src="@/assets/image/beian-logo.png" width="16" />
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=61011602000694" target="_blank">
            陕公网安备61011602000694号
          </a>
        </p>
        <a class="item" href="https://beian.miit.gov.cn/" target="_blank">陕ICP备2025059454号-2</a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-width: 1024px;
  min-height: 768px;
  height: 100vh;
  overflow: auto;
  background-color: transparent;
  display: flex;
  justify-content: center;
  position: relative;

  .login-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: absolute;
    top: 8%;

    .logo {
      font-family: 'Segoe UI', system-ui, sans-serif; /* 现代无衬线字体 */
      font-weight: 700; /* 增强品牌识别度 */
      font-size: 50px; /* 36px */
      letter-spacing: 2px;
      color: #1a365d; /* 深品牌蓝 */
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      display: block;
    }

    .feature {
      font-family:
        'SF Pro Text',
        -apple-system,
        sans-serif;
      font-weight: 500; /* 中等字重保持可读性 */
      font-size: 20px; /* 16px */
      color: #4a5568; /* 中灰色降低视觉干扰 */
      display: block;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    .desc {
      font-family: 'Segoe UI Semibold', sans-serif;
      font-size: 30px; /* 18px */
      color: #2b6cb0; /* 品牌辅助蓝 */
      letter-spacing: 0.25px;
      display: block;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
  }

  .login-box {
    width: 360px;
    background-color: #fff;
    border: #e0e0e0 solid 1px;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: start;
    position: absolute;
    top: 30%;

    .el-form {
      display: flex;
      flex-direction: column;
      justify-content: center;
      user-select: none;
      .button {
        width: 100%;
      }
      .flex {
        width: 100%;
        display: flex;
        justify-content: space-between;
      }
    }

    .demo-info {
      .demo-detail {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        flex-wrap: wrap;

        .demo-item {
          display: flex;
          flex-direction: row;
          margin: 3px 12px 3px 12px;
          cursor: pointer;

          &:hover {
            background-color: #dedfe0;
          }
        }
      }

      .separation-line {
        :deep(.el-divider__text) {
          font-size: 14px;
          font-weight: normal;
          color: gray;
          white-space: nowrap;
        }
      }
    }

    .login-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .captcha-form-item,
    .forgetcode-form-item {
      display: flex;
      align-items: center;
    }

    .captcha-input,
    .forgetcode-input {
      flex: 1; /* 占据剩余空间 */
      min-width: 0; /* 防止内容溢出 */
    }

    .captcha-image {
      width: 100px;
      height: 40px;
      flex-shrink: 0; /* 禁止图片缩小 */
      display: flex;
      justify-content: center;
      align-items: center;
      margin-left: 20px;
    }
  }

  .footer {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 12px;
    position: absolute;
    bottom: 10px;

    .row {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2px;
    }

    .item {
      margin-left: 5px;
      margin-right: 5px;
      display: flex;
      align-items: center;
    }
  }
}

.css-box {
  height: 100%;
  width: 100%;
  position: absolute;
  background-image: linear-gradient(
    to left bottom,
    rgb(51.2, 126.4, 204),
    rgb(121.3, 187.1, 255),
    rgb(159.5, 206.5, 255),
    rgb(197.7, 225.9, 255),
    rgb(216.8, 235.6, 255),
    rgb(235.9, 245.3, 255)
  );
  z-index: -1;
}

.bubble-bgwall {
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  padding: 0;
}

.bubble-bgwall li {
  display: flex;
  position: absolute;
  bottom: -200px;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.15);
  animation: bubble 20s infinite;
}

.bubble-bgwall li:nth-child(1) {
  left: 10%;
}

.bubble-bgwall li:nth-child(2) {
  left: 20%;
  width: 110px;
  height: 110px;
  animation-duration: 7s;
  animation-delay: 2s;
}

.bubble-bgwall li:nth-child(3) {
  left: 25%;
  animation-delay: 4s;
}

.bubble-bgwall li:nth-child(4) {
  left: 60%;
  width: 66px;
  height: 66px;
  background-color: rgba(255, 255, 255, 0.3);
  animation-duration: 8s;
}

.bubble-bgwall li:nth-child(5) {
  left: 70%;
}

.bubble-bgwall li:nth-child(6) {
  left: 60%;
  width: 180px;
  height: 180px;
  background-color: rgba(255, 255, 255, 0.2);
  animation-delay: 3s;
}

.bubble-bgwall li:nth-child(7) {
  left: 32%;
  width: 160px;
  height: 160px;
  animation-delay: 2s;
}

.bubble-bgwall li:nth-child(8) {
  left: 50%;
  width: 65px;
  height: 65px;
  animation-duration: 15s;
  animation-delay: 4s;
}

.bubble-bgwall li:nth-child(9) {
  left: 25%;
  width: 90px;
  height: 90px;
  background-color: rgba(255, 255, 255, 0.3);
  animation-duration: 12s;
  animation-delay: 2s;
}

.bubble-bgwall li:nth-child(10) {
  left: 80%;
  width: 180px;
  height: 180px;
  animation-delay: 5s;
}

@keyframes bubble {
  0% {
    opacity: 0.5;
    transform: translateY(0);
  }

  25% {
    opacity: 0.75;
    transform: translateY(-400px);
  }

  50% {
    opacity: 1;
    transform: translateY(-600px);
  }

  100% {
    opacity: 0;
    transform: translateY(-1000px);
  }
}
</style>
