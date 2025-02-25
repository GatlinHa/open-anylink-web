<script setup>
import { User, Lock, Avatar } from '@element-plus/icons-vue'
import { ref, watch, onMounted } from 'vue'
import router from '@/router'
import { userRegisterService, userLoginService } from '@/api/user.js'
import { userStore } from '@/stores'
import { generateClientId } from '@/js/utils/common'
import { ElMessage } from 'element-plus'

const isRegister = ref(false)

// 提交的整个form表单的数据
const formModel = ref({
  account: '',
  nickName: '',
  password: '',
  repassword: ''
})
// 表单对象
const form = ref()
const isRemenberMe = ref(false)

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
  ]
}

const userData = userStore()

const register = async () => {
  await form.value.validate() // 注册之前预校验
  await userRegisterService(formModel.value)
  ElMessage.success('注册成功')
  isRegister.value = false
}

const login = async () => {
  await form.value.validate() // 登录之前预校验
  const response = userLoginService(formModel.value)
  response
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

onMounted(() => {
  isRemenberMe.value = userData.isRemenberMe
  if (isRemenberMe.value) {
    formModel.value.account = userData.user.account
  }

  if (!userData.clientId) {
    userData.setClientId(generateClientId())
  }
})

const forgetPassword = () => {
  ElMessage.warning('功能开发中')
}

watch(isRegister, () => {
  formModel.value = {
    account: !isRegister.value && isRemenberMe.value ? userData.user.account : '',
    nickName: '',
    password: '',
    repassword: ''
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-title">
      <span class="logo">Open AnyLink</span>
      <span class="feature">开源·轻量·分布式</span>
      <span class="desc">企业IM即时通信解决方案</span>
    </div>

    <div class="login-box">
      <el-form
        :model="formModel"
        :rules="rules"
        ref="form"
        size="large"
        autocomplete="off"
        v-if="isRegister"
      >
        <el-form-item>
          <h1>注册</h1>
        </el-form-item>
        <el-form-item prop="account">
          <el-input
            v-model="formModel.account"
            :prefix-icon="User"
            placeholder="请输入账号"
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
        <el-form-item>
          <el-button @click="register" class="button" type="primary" auto-insert-space>
            注册
          </el-button>
        </el-form-item>
        <el-form-item class="flex">
          <el-link type="primary" :underline="false" @click="isRegister = false">
            ← 已有账号，立即登录
          </el-link>
        </el-form-item>
      </el-form>
      <el-form :model="formModel" :rules="rules" ref="form" size="large" autocomplete="off" v-else>
        <el-form-item>
          <h1>登录</h1>
        </el-form-item>
        <el-form-item prop="account">
          <el-input
            v-model="formModel.account"
            :prefix-icon="User"
            placeholder="请输入账号"
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
        <el-form-item class="flex">
          <div class="flex">
            <el-checkbox v-model="isRemenberMe">记住我</el-checkbox>
            <el-link type="primary" :underline="false" @click="forgetPassword">忘记密码？</el-link>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button @click="login" class="button" type="primary" auto-insert-space>登录</el-button>
        </el-form-item>
        <el-form-item class="flex">
          <el-link type="primary" :underline="false" @click="isRegister = true">
            没有账号？立即注册 →
          </el-link>
        </el-form-item>
      </el-form>
    </div>
    <div class="footer">
      <div class="row">
        <span class="item">©2024 - 2025 Open-AnyLink 版权所有</span>
      </div>
      <div class="row">
        <a class="item" href="https://github.com/GatlinHa/open-anylink/" target="_blank">
          Github源码
        </a>
      </div>
      <div class="row">
        <p class="item" style="margin: 0">
          <img src="@/assets/image/head-logo.png" width="20" />
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=61011602000694" target="_blank">
            陕公网安备61011602000694号
          </a>
        </p>
        <a class="item" href="https://beian.miit.gov.cn/" target="_blank">陕ICP备2025059454号-2</a>
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
  flex-direction: column;
  position: relative;
  justify-content: center;
  align-items: center;

  .login-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: absolute;
    top: 10%;

    .logo {
      font-family: 'Segoe UI', system-ui, sans-serif; /* 现代无衬线字体 */
      font-weight: 700; /* 增强品牌识别度 */
      font-size: 50px; /* 36px */
      letter-spacing: -0.5px; /* 紧凑型字距 */
      color: #1a365d; /* 深品牌蓝 */
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
    }

    .desc {
      font-family: 'Segoe UI Semibold', sans-serif;
      font-size: 30px; /* 18px */
      color: #2b6cb0; /* 品牌辅助蓝 */
      letter-spacing: 0.25px;
      display: block;
    }
  }

  .login-box {
    width: 360px;
    height: 480px;
    background-color: #fff;
    border: #e0e0e0 solid 1px;
    border-radius: 10px;
    padding: 20px;
    position: absolute;
    top: 25%;

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
  }

  .footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-size: 12px;
    position: absolute;
    bottom: 20px;

    .row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 5px;
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
