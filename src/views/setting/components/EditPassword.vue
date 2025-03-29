<script setup>
import { ref } from 'vue'
import { userModifyPassword } from '@/api/user'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores'

defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const userData = useUserStore()

const form = ref()
const formModel = ref({
  old_password: '',
  new_password: '',
  new_password_2: ''
})
const isLoading = ref(false)

// 表单的校验规则
const rules = {
  old_password: [{ required: true, message: '', trigger: 'blur' }],
  new_password: [
    { required: true, message: '', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是6-15位的非空字符',
      trigger: 'blur'
    },
    {
      validator: (rule, value, callback) => {
        if (value === formModel.value.old_password) {
          callback(new Error('新密码不能与旧密码一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  new_password_2: [
    { required: true, message: '', trigger: 'blur' },
    {
      pattern: /^\S{6,15}$/,
      message: '密码必须是6-15位的非空字符',
      trigger: 'blur'
    },
    {
      validator: (rule, value, callback) => {
        if (value !== formModel.value.new_password) {
          callback(new Error('两次输入密码不一致'))
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
  isLoading.value = true
  const res = userModifyPassword({
    account: userData.user.account,
    oldPasswordStr: formModel.value.old_password,
    newPasswordStr: formModel.value.new_password
  })
  res.then(() => {
    ElMessage.success('密码修改成功')
    emit('update:modelValue', false)
  })
  res.finally(() => {
    isLoading.value = false
  })
}

const onCancle = () => {
  emit('update:modelValue', false)
}
// 关闭时清除数据
const onReset = () => {
  form.value.resetFields()
}
</script>

<template>
  <el-dialog
    class="edit-password"
    :modelValue="modelValue"
    @update:modelValue="emit('update:modelValue', false)"
    @close="onReset"
    title="修改密码"
    width="500"
  >
    <el-form :model="formModel" :rules="rules" ref="form">
      <el-form-item label="旧密码" label-width="100px" prop="old_password">
        <el-input v-model="formModel.old_password" autocomplete="off" type="password" />
      </el-form-item>
      <el-form-item label="新密码" label-width="100px" prop="new_password">
        <el-input
          v-model="formModel.new_password"
          autocomplete="off"
          type="password"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认新密码" label-width="100px" prop="new_password_2">
        <el-input
          v-model="formModel.new_password_2"
          autocomplete="off"
          type="password"
          show-password
        />
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
.edit-password {
  .el-form-item {
    width: 430px;
  }
}
</style>
