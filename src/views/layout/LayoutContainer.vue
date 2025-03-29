<script setup>
import {
  ChatRound,
  Notebook,
  VideoCameraFilled,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import ContactUs from '@/views/layout/components/ContactUs.vue'
import { userStore, messageStore, searchStore, groupStore } from '@/stores'
import router from '@/router'
import MyCard from '@/views/layout/components/MyCard.vue'
import NaviMenu from '@/views/layout/components/NaviMenu.vue'
import { userLogoutService } from '@/api/user'
import wsConnect from '@/js/websocket/wsConnect'
import { ElMessageBox } from 'element-plus'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import {
  STATUS,
  LEAVING_AFTER_DURATION,
  LOGOUT_AFTER_DURATION,
  STATUS_REQ_INTERVAL
} from '@/const/userConst'
import UserCard from '@/components/card/UserCard.vue'
import GroupCard from '@/components/card/GroupCard.vue'
import { MsgType } from '@/proto/msg'
import contactusIcon from '@/assets/svg/contactus.svg'
import githubIcon from '@/assets/svg/github.svg'
import SourceCode from '@/views/layout/components/SourceCode.vue'

const myAvatar = ref()
const userData = userStore()
const messageData = messageStore()
const searchData = searchStore()
const groupData = groupStore()
const isShowMyCard = ref(false)
const contactUsRef = ref(null)
const sourceCodeRef = ref(null)

const userStatusDesc = computed(() => {
  switch (userData.user.status) {
    case STATUS.LEAVING:
      return '离开'
    case STATUS.ONLINE:
      return '在线'
    case STATUS.BUSYING:
      return '忙碌'
    case STATUS.OFFLINE:
    default:
      return '离线'
  }
})

const statusCircleColor = computed(() => {
  switch (userData.user.status) {
    case STATUS.LEAVING:
      return 'yellow'
    case STATUS.ONLINE:
      return '#95d475'
    case STATUS.BUSYING:
      return 'red'
    case STATUS.OFFLINE:
    default:
      return 'gray'
  }
})

let statusReqTask
onMounted(() => {
  wsConnect.createWs() // 页面onMounted时主动同步一次本账号本客户端的状态
  statusSync()
  // 启动全局的用户状态同步器
  setTimeout(() => {
    wsConnect.statusReq(toSyncStatusAccounts.value) //延迟500毫秒启动第一次同步
    statusReqTask = setInterval(() => {
      wsConnect.statusReq(toSyncStatusAccounts.value)
    }, STATUS_REQ_INTERVAL)
  }, 500)
})

onUnmounted(() => {
  clearInterval(statusReqTask)
  statusSyncTimer && clearTimeout(statusSyncTimer)
  autoLogoutTimer && clearTimeout(autoLogoutTimer)

  userData.clear()
  messageData.clear()
  searchData.clear()
  wsConnect.closeWs()
})

const toSyncStatusAccounts = computed(() => {
  const accountsSet = new Set()

  // 1. 定时任务查询本账号的多端下的最终状态（多端设备场景，比如其他设备正在忙碌，要同步过来）
  accountsSet.add(userData.user.account)

  // 2. 定时更新单聊对象的状态
  Object.keys(messageData.sessionList).forEach((key) => {
    const session = messageData.sessionList[key]
    const sessionType = session.sessionType
    if (sessionType === MsgType.CHAT) {
      //只看单聊的，群里在打开聊天窗时触发查询
      accountsSet.add(session.objectInfo.account)
    }
  })

  // 3. 更新打开群组聊天中的成员对象的状态
  const selectedSession = messageData.sessionList[messageData.selectedSessionId]
  if (selectedSession && selectedSession.sessionType === MsgType.GROUP_CHAT) {
    const groupId = selectedSession.remoteId
    const groupMembers = groupData.groupMembersList[groupId]
    if (groupMembers) {
      Object.keys(groupMembers).forEach((item) => {
        accountsSet.add(item)
      })
    }
  }

  return [...accountsSet]
})

const onMouseMove = () => {
  if (!document.hasFocus()) return

  statusSync() //状态同步：5分钟内未移动鼠标表示离开
  autoLogout() //自动登出：8小时内未移动鼠标就会自动登出
}

// 同步本账号本客户端的状态
let statusSyncTimer
const statusSync = () => {
  if (userData.user.status <= STATUS.LEAVING) {
    userData.updateUserStatus(STATUS.ONLINE) //修改本地状态
    wsConnect.statusSync(STATUS.ONLINE) //状态同步给云端
  }
  clearTimeout(statusSyncTimer)
  statusSyncTimer = setTimeout(() => {
    if (userData.user.status === STATUS.ONLINE) {
      userData.updateUserStatus(STATUS.LEAVING) //修改本地状态
      wsConnect.statusSync(STATUS.LEAVING) //状态同步给云端
    }
  }, LEAVING_AFTER_DURATION)
}

let autoLogoutTimer
const autoLogout = () => {
  clearTimeout(autoLogoutTimer)
  autoLogoutTimer = setTimeout(() => {
    userLogoutService(userData.user.account).finally(() => {
      userData.clear()
      router.push('/login')
    })
  }, LOGOUT_AFTER_DURATION)
}

const onExit = async () => {
  ElMessageBox.confirm('确认要退出吗？', '温馨提示', {
    type: 'warning',
    confirmButtonText: '确认',
    cancelButtonText: '取消'
  })
    .then(() => {
      userLogoutService(userData.user.account).finally(() => {
        userData.clear()
        router.push('/login')
      })
    })
    .catch(() => {
      // do nothing
    })
}
</script>

<template>
  <el-container class="layout-container" @mousemove="onMouseMove">
    <el-aside width="100px">
      <div>
        <span class="avatar">
          <UserAvatarIcon
            ref="myAvatar"
            :showName="userData.user.nickName"
            :showId="userData.user.account"
            :showAvatarThumb="userData.user.avatarThumb"
            @click="isShowMyCard = true"
          >
          </UserAvatarIcon>
          <div class="user-status">
            <div class="status-circle" :style="{ backgroundColor: statusCircleColor }"></div>
            <span class="status-desc">{{ userStatusDesc }}</span>
          </div>
        </span>

        <el-menu
          active-text-color="#ecf5ff"
          background-color="#409eff"
          :default-active="$route.meta.active_1"
          text-color="#fff"
          router
        >
          <NaviMenu funcName="消息" index="/message">
            <template #iconSlot>
              <ChatRound />
            </template>
          </NaviMenu>
          <NaviMenu funcName="通讯录" index="/contactList">
            <template #iconSlot>
              <Notebook />
            </template>
          </NaviMenu>
          <NaviMenu funcName="会议" index="/meeting">
            <template #iconSlot>
              <VideoCameraFilled />
            </template>
          </NaviMenu>
          <NaviMenu funcName="设置" index="/setting">
            <template #iconSlot>
              <Setting />
            </template>
          </NaviMenu>
        </el-menu>
      </div>

      <div class="footer">
        <el-icon class="footer-item" title="联系我们" @click="contactUsRef.show($event)">
          <contactusIcon />
        </el-icon>
        <el-icon class="footer-item" title="源码" @click="sourceCodeRef.show()">
          <githubIcon />
        </el-icon>
        <el-icon class="footer-item" title="退出" :size="20" @click="onExit()">
          <SwitchButton />
        </el-icon>
      </div>
    </el-aside>
    <el-main style="padding: 0">
      <router-view></router-view>
    </el-main>
    <MyCard :isShow="isShowMyCard" @close="isShowMyCard = false"></MyCard>
    <UserCard></UserCard>
    <GroupCard></GroupCard>
    <ContactUs ref="contactUsRef"></ContactUs>
    <SourceCode ref="sourceCodeRef"></SourceCode>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  min-width: 1024px;
  min-height: 768px;
  height: 100vh;
  overflow: auto;
  user-select: none;

  .el-aside {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(to bottom, #409eff, rgb(159.5, 206.5, 255));
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    position: relative;

    .avatar {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin-top: 20px;
      margin-bottom: 20px;

      .el-avatar {
        width: 40px;
        height: 40px;
        cursor: pointer;
      }

      .user-status {
        display: flex;
        align-items: center;

        .status-circle {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid #fff;
        }

        .status-desc {
          padding-left: 2px;
          font-size: 14px;
        }
      }
    }

    .el-menu {
      background-color: transparent;
      border-right: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .footer {
      display: flex;
      flex-direction: column;
      align-items: center;

      .footer-item {
        width: 40px;
        height: 40px;
        margin-top: 5px;
        margin-bottom: 5px;
        border-radius: 16px;
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;

        &:hover {
          background-color: #337ecc;
        }
      }

      .svg-icon {
        fill: #fff;
        width: 20px;
        height: 20px;
      }
    }
  }

  .el-main {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
}
</style>
