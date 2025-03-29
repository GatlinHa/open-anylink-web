<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { useUserStore } from '@/stores'
import { userModifySelfService } from '@/api/user'
import { ElMessage } from 'element-plus'

defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue', 'success'])

const userData = useUserStore()

const form = ref()
const formModel = ref({
  password: '',
  new_phone: '',
  verify_code: ''
})
const totalSec = 60 // 验证码发送间隔
const remainSec = ref(60) // 剩余发送的时间
const timer = ref() // 计时器
const isLoading = ref(false)

// 表单的校验规则
const rules = {
  password: [{ required: true, message: '', trigger: 'blur' }],
  new_phone: [
    { required: true, message: '', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '手机号格式不正确',
      trigger: 'blur'
    },
    {
      validator: (rule, value, callback) => {
        if (value === userData.user.phoneNum) {
          callback(new Error('新手机号不能和旧手机号一样'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const onComfirm = async () => {
  await form.value.validate()
  if (!formModel.value.verify_code) {
    ElMessage.warning('验证码不能为空')
    return
  } else if (!/^\d{4,6}$/.test(formModel.value.verify_code)) {
    ElMessage.warning('验证码位数不正确')
    return
  }

  isLoading.value = true
  const res = userModifySelfService({
    phoneNum: formModel.value.new_phone
  })
  res.then(() => {
    ElMessage.success('绑定手机修改成功')
    emit('update:modelValue', false)
    emit('success')
  })
  res.finally(() => {
    isLoading.value = false
  })
}

const onCancle = () => {
  emit('update:modelValue', false)
}

const createTimer = () => {
  timer.value = setInterval(() => {
    remainSec.value = remainSec.value - 1
    if (remainSec.value <= 0) {
      clearInterval(timer.value)
      timer.value = null
      remainSec.value = totalSec
    }
  }, 1000)
}

const onSendCodde = async () => {
  await form.value.validate()
  if (!timer.value && remainSec.value === totalSec) {
    // TODO 发送短信验证码
    ElMessage.success('验证码已发送，注意查收')
    // 将计时器到期时间保存到本地存储，防止刷新页面丢失
    localStorage.setItem('phone-timer-end-time', new Date().getTime() + totalSec * 1000)
    createTimer()
  }
}
// 关闭时清除数据
const onReset = () => {
  form.value.resetFields()
}

// 在钩子函数中清除
onBeforeUnmount(() => {
  clearInterval(timer)
})

// 在挂载钩子函数中恢复计时器
onMounted(() => {
  const timerEndTime = localStorage.getItem('phone-timer-end-time')
  const nowTime = new Date().getTime()
  if (timerEndTime - nowTime > 0 && timerEndTime - nowTime < totalSec * 1000) {
    remainSec.value = Math.floor((timerEndTime - nowTime) / 1000)
    createTimer()
  } else {
    localStorage.removeItem('phone-timer-end-time')
  }
})
</script>

<template>
  <el-dialog
    class="edit-phone"
    :modelValue="modelValue"
    @update:modelValue="emit('update:modelValue', false)"
    @close="onReset"
    title="更换绑定手机"
    width="500"
  >
    <el-form :model="formModel" :rules="rules" ref="form">
      <el-form-item label="登录密码" label-width="100px" prop="password">
        <el-input v-model="formModel.password" autocomplete="off" type="password" />
      </el-form-item>
      <el-form-item label="新手机号码" label-width="100px" prop="new_phone">
        <el-input v-model="formModel.new_phone" autocomplete="off" />
      </el-form-item>
      <el-form-item
        label="短信验证码"
        label-width="100px"
        prop="verify_code"
        style="display: flex; justify-content: space-between"
      >
        <el-input
          v-model="formModel.verify_code"
          placeholder="请输入验证码"
          autocomplete="off"
          style="width: 120px"
        />
        <el-button
          type="info"
          :disabled="remainSec !== totalSec"
          @click="onSendCodde"
          style="margin-left: 20px"
        >
          {{ remainSec === totalSec ? '获取验证码' : remainSec + '秒后重新发送' }}
        </el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onCancle">取消</el-button>
        <el-button type="primary" @click="onComfirm" :loading="isLoading"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.edit-phone {
  .el-form-item {
    width: 430px;
  }
}
</style>
