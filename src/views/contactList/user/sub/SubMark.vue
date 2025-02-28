<script setup>
import { ref, onMounted, computed } from 'vue'
import { userQueryService } from '@/api/user'
import { messageStore, userCardStore } from '@/stores'
import ContactListUserItem from '@/views/contactList/user/components/ContactListUserItem.vue'
import { ElLoading } from 'element-plus'
import { el_loading_options } from '@/const/commonConst'
import { Search } from '@element-plus/icons-vue'
import HashNoData from '@/components/common/HasNoData.vue'
import { MsgType } from '@/proto/msg'

const messageData = messageStore()
const userCardData = userCardStore()
const totalCount = computed(() => {
  return Object.keys(markData.value).length
})

onMounted(async () => {
  await messageData.loadPartitions()
})

const markSearchKey = ref('')
const markData = computed(() => {
  if (Object.values(messageData.sessionList).length === 0) return []
  const data = []
  Object.values(messageData.sessionList).forEach((item) => {
    if (item.sessionType === MsgType.CHAT) {
      if (item.mark) {
        if (!markSearchKey.value) {
          data.push(item)
        } else {
          if (
            item.objectInfo.nickName.toLowerCase().includes(markSearchKey.value.toLowerCase()) ||
            item.objectInfo.account === markSearchKey.value ||
            item.mark.toLowerCase().includes(markSearchKey.value.toLowerCase())
          ) {
            data.push(item)
          }
        }
      }
    }
  })

  return data
})

const onShowUserCard = ({ sessionId, account }) => {
  const loadingInstance = ElLoading.service(el_loading_options)
  userQueryService({ account: account })
    .then((res) => {
      messageData.updateSession({
        sessionId: sessionId,
        objectInfo: {
          ...messageData.sessionList[sessionId].objectInfo,
          nickName: res.data.data.nickName,
          signature: res.data.data.signature,
          avatarThumb: res.data.data.avatarThumb,
          gender: res.data.data.gender,
          phoneNum: res.data.data.phoneNum,
          email: res.data.data.email
        }
      })
      userCardData.setUserInfo(messageData.sessionList[sessionId].objectInfo)
    })
    .finally(() => {
      loadingInstance.close()
      userCardData.setIsShow(true)
    })
}
</script>

<template>
  <el-container style="height: 100%">
    <el-header class="bdr-b">
      <div style="font-size: 14px">全部({{ totalCount }})</div>
      <el-input
        v-model.trim="markSearchKey"
        placeholder="搜索：昵称/账号/备注"
        :prefix-icon="Search"
        :clearable="true"
        style="width: 180px"
      />
    </el-header>
    <el-main class="my-scrollbar" style="padding: 8px">
      <div v-if="markData.length">
        <ContactListUserItem
          v-for="item in markData"
          :key="item.sessionId"
          :session="item"
          :type="'mark'"
          :keyWords="markSearchKey"
          @showUserCard="onShowUserCard"
        ></ContactListUserItem>
      </div>
      <HashNoData v-else :size="100"></HashNoData>
    </el-main>
  </el-container>
</template>

<style lang="scss" scoped>
.el-header {
  height: 48px;
  display: flex;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 16px;
  align-items: center;
}

.el-input {
  width: 150px;
  height: 30px;

  :deep(.el-input__wrapper) {
    border-radius: 25px;
  }
}
</style>
