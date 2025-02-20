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
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;

  .login-box {
    width: 360px;
    height: 480px;
    border: #e0e0e0 solid 1px;
    border-radius: 10px;
    padding: 20px;

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
    width: 100%;
    display: flex;
    justify-content: center;
    font-size: 12px;
    position: absolute;
    bottom: 20px;

    .item {
      margin-left: 5px;
      margin-right: 5px;
      color: #a0a0a0;
    }
  }
}
</style>
