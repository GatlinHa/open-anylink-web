<script setup>
import { ref, onMounted, computed } from 'vue'
import { userStore } from '@/stores'
import router from '@/router'
import { userModifySelfService } from '@/api/user'
import defaultImg from '@/assets/image/select_avatar.jpg'
import { cloneDeep, isEqual } from 'lodash'
import { maskPhoneNum } from '@/js/utils/common'
import EditAvatar from '@/components/common/EditAvatar.vue'
import { ElMessage } from 'element-plus'

const userData = userStore()
// 准备表单数据
const formModel = ref({})
const isLoading = ref(false)
const isShowEditAvatar = ref(false)

onMounted(() => {
  formModel.value = cloneDeep(userData.user)
})

const onNewAvatar = ({ avatar, avatarThumb }) => {
  formModel.value.avatar = avatar
  formModel.value.avatarThumb = avatarThumb
}

const onSave = () => {
  if (isEqual(formModel.value, userData.user)) {
    ElMessage.warning('您还没有修改任何信息哦！')
    return
  }

  isLoading.value = true
  const res = userModifySelfService(formModel.value)
  res.then(() => {
    ElMessage.success('信息保存成功')
    userData.updateUser()
  })
  res.finally(() => {
    isLoading.value = false
  })
}

const displayPhone = computed(() => {
  if (formModel.value.phoneNum) {
    return maskPhoneNum(formModel.value.phoneNum)
  } else {
    return ''
  }
})
</script>

<template>
  <el-container>
    <el-header class="bdr-b">个人信息</el-header>
    <el-container class="el-container__body">
      <el-aside width="240px">
        <img
          :src="formModel.avatar || defaultImg"
          alt="图片加载错误"
          @click="isShowEditAvatar = true"
          style="text-align: center; border-radius: 10px"
        />
        <el-button
          type="info"
          @click="isShowEditAvatar = true"
          style="margin-top: 20px; cursor: pointer"
        >
          点击修改头像
        </el-button>
      </el-aside>
      <el-main>
        <el-form :model="formModel" ref="formRef">
          <el-form-item label="登录账号：" prop="account">
            {{ formModel.account }}
          </el-form-item>
          <el-form-item label="手机号码：" prop="phoneNum">
            {{ displayPhone || '未绑定' }}
            <el-button
              type="primary"
              text
              @click="router.push('/setting/security')"
              style="margin-left: 15px"
            >
              {{ displayPhone ? '修改' : '去绑定' }}
            </el-button>
          </el-form-item>
          <el-form-item label="电子邮箱：" prop="email">
            {{ formModel.email || '未绑定' }}
            <el-button
              type="primary"
              text
              @click="router.push('/setting/security')"
              style="margin-left: 15px"
            >
              {{ formModel.email ? '修改' : '去绑定' }}
            </el-button>
          </el-form-item>
          <el-form-item label="我的昵称：" prop="nickname">
            <el-input
              v-model.trim="formModel.nickName"
              maxlength="10"
              show-word-limit
              style="width: 300px"
            ></el-input>
          </el-form-item>
          <el-form-item label="我的性别：" prop="gender">
            <el-radio-group v-model="formModel.gender">
              <el-radio :value="1">男</el-radio>
              <el-radio :value="2">女</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="我的生日：" prop="birthday">
            <el-date-picker
              v-model="formModel.birthday"
              type="date"
              placeholder="请选择日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="个性签名：" prop="level">
            <el-input
              v-model.trim="formModel.signature"
              maxlength="50"
              show-word-limit
              style="width: 300px"
              type="textarea"
              :rows="3"
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-button
              @click="onSave"
              type="primary"
              :loading="isLoading"
              style="margin-left: 84px"
            >
              保存修改
            </el-button>
          </el-form-item>
        </el-form>
      </el-main>
    </el-container>

    <EditAvatar
      v-model="isShowEditAvatar"
      :model="'user'"
      @update:newAvatar="onNewAvatar"
    ></EditAvatar>
  </el-container>
</template>

<style lang="scss" scoped>
.el-header {
  width: 100%;
  height: 60px;
  line-height: 60px;
  padding-left: 15px;
  font-size: 18px;
}

.el-aside {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  cursor: pointer;
}
</style>
