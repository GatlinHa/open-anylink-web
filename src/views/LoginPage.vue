<script setup>
import { User, Lock } from '@element-plus/icons-vue'
import { ref, watch, onMounted } from 'vue'
import router from '@/router'
import { userRegisterService, userLoginService } from '@/api/user.js'
import { userStore } from '@/stores'
import { generateClientId } from '@/js/utils/common'
import { ElMessage } from 'element-plus'

const isRegister = ref(false)

// 提交的整个form表单的数据
const formModel = ref({
  username: '',
  password: '',
  repassword: ''
})
// 表单对象
const form = ref()
const isRemenberMe = ref(false)

// 表单的校验规则
const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]{6,32}$/,
      message: '账号必须是6-32位的字母、数字或下划线',
      trigger: 'blur'
    }
  ],
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
      ElMessage.success('登录成功')
      userData.setAt(res.data.data.accessToken)
      userData.setRt(res.data.data.refreshToken)
      userData.setIsRemenberMe(isRemenberMe.value)
      await userData.updateUser() //这里要用await确保拿到结果了再跳转，否则其他页面依赖user的不能及时得到更新
      router.push('/')
    })
    .catch(() => {
      formModel.value.password = ''
    })
}

onMounted(() => {
  isRemenberMe.value = userData.isRemenberMe
  if (isRemenberMe.value) {
    formModel.value.username = userData.user.account
  }

  if (!userData.clientId) {
    userData.setClientId(generateClientId())
  }
})

watch(isRegister, () => {
  formModel.value = {
    username: !isRegister.value && isRemenberMe.value ? userData.user.account : '',
    password: '',
    repassword: ''
  }
})
</script>

<template>
  <div>
    <el-row class="login-page">
      <el-col :span="12" class="bg"></el-col>
      <el-col :span="6" :offset="3" class="form">
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
          <el-form-item prop="username">
            <el-input
              v-model="formModel.username"
              :prefix-icon="User"
              placeholder="请输入账号"
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formModel.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入密码"
            ></el-input>
          </el-form-item>
          <el-form-item prop="repassword">
            <el-input
              v-model="formModel.repassword"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入再次密码"
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-button @click="register" class="button" type="primary" auto-insert-space>
              注册
            </el-button>
          </el-form-item>
          <el-form-item class="flex">
            <el-link type="info" :underline="false" @click="isRegister = false"> ← 登录 </el-link>
          </el-form-item>
        </el-form>
        <el-form
          :model="formModel"
          :rules="rules"
          ref="form"
          size="large"
          autocomplete="off"
          v-else
        >
          <el-form-item>
            <h1>登录</h1>
          </el-form-item>
          <el-form-item prop="username">
            <el-input
              v-model="formModel.username"
              :prefix-icon="User"
              placeholder="请输入账号"
            ></el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formModel.password"
              name="password"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入密码"
              @keyup.enter="login"
            ></el-input>
          </el-form-item>
          <el-form-item class="flex">
            <div class="flex">
              <el-checkbox v-model="isRemenberMe">记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码？</el-link>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button @click="login" class="button" type="primary" auto-insert-space
              >登录</el-button
            >
          </el-form-item>
          <el-form-item class="flex">
            <el-link type="info" :underline="false" @click="isRegister = true"> 注册 → </el-link>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
    <div class="footer">
      <span class="item">©2024 - 2025 Open-AnyLink 版权所有</span>
      <a class="item" href="https://beian.miit.gov.cn/" target="_blank">陕ICP备2025059454号-2</a>
      <a class="item" href="https://github.com/GatlinHa/open-anylink/" target="_blank"
        >Github源码</a
      >
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-width: 1024px;
  min-height: 768px;
  height: 100vh;
  overflow: auto;
  background-color: #fff;
  .bg {
    background: url('@/assets/login_bg.png') no-repeat center / cover;
    border-radius: 0 20px 20px 0;
  }
  .form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    user-select: none;
    .title {
      margin: 0 auto;
    }
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
  justify-content: center;
  font-size: 12px;
  .item {
    margin-left: 5px;
    margin-right: 5px;
  }
}
</style>
