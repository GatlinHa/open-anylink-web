<script setup>
import { ref, onMounted } from 'vue'
import { userStore } from '@/stores'
import { userModifySelfService } from '@/api/user'

const userData = userStore()

const isNewMsgTips = ref()
const isSendMsgTips = ref()

onMounted(() => {
  isNewMsgTips.value = userData.user.newMsgTips
  isSendMsgTips.value = userData.user.sendMsgTips
})

const handleSwitch = (obj) => {
  userModifySelfService(obj).then(() => {
    userData.updateUser().then(() => {
      isNewMsgTips.value = userData.user.newMsgTips
      isSendMsgTips.value = userData.user.sendMsgTips
    })
  })
}
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header class="bdr-b">通知设置</el-header>
      <el-main class="list">
        <div class="item bdr-b">
          <div class="content">
            <div class="name">新消息提示音</div>
            <span class="desc">当前状态：{{ isNewMsgTips ? '开启' : '关闭' }}</span>
          </div>
          <div class="modify">
            <el-switch
              v-model="isNewMsgTips"
              @change="handleSwitch({ newMsgTips: isNewMsgTips })"
            />
          </div>
        </div>

        <div class="item bdr-b">
          <div class="content">
            <div class="name">发送消息提示音</div>
            <div class="desc">当前状态：{{ isSendMsgTips ? '开启' : '关闭' }}</div>
          </div>
          <div class="modify">
            <el-switch
              v-model="isSendMsgTips"
              @change="handleSwitch({ sendMsgTips: isSendMsgTips })"
            />
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.el-header {
  width: 100%;
  height: 60px;
  line-height: 60px;
  padding-left: 15px;
  font-size: 18px;
  font-weight: bold;
}

.el-main {
  .list {
    padding: 15px;
    padding-top: 0;

    .item {
      margin: 5px 0;
      padding: 5px 0;
      display: flex;
      align-items: center;

      &:first-child {
        margin-top: 0;
      }

      .content {
        flex: auto;
        .name {
          height: 40px;
          font-size: 15px;
          line-height: 40px;
          font-weight: 500;
        }

        .desc {
          color: gray;
          height: 30px;
          line-height: 30px;
          font-size: 13px;
        }
      }

      .modify {
        width: 120px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
    }
  }
}
</style>
