<script setup>
import { ref, computed } from 'vue'
import { Mute } from '@element-plus/icons-vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import { el_loading_options } from '@/const/commonConst'
import { userStore, groupStore, messageStore, userCardStore } from '@/stores'
import {
  groupUpdateMuteService,
  groupChangeRoleService,
  groupDelMembersService,
  groupOwnerTransferService
} from '@/api/group'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { combineId } from '@/js/utils/common'
import { userQueryService } from '@/api/user'
import MemberMenu from '@/views/message/components/MemberMenu.vue'
import { MsgType } from '@/proto/msg'

const props = defineProps(['groupId', 'memberSearchKey'])
const emit = defineEmits(['openSession'])

const userData = userStore()
const groupData = groupStore()
const messageData = messageStore()
const userCardData = userCardStore()

const myAccount = computed(() => userData.user.account)

const groupInfo = computed(() => {
  return groupData.groupInfoList[props.groupId] || {}
})

const validMembers = computed(() => {
  return groupData.getValidGroupMembers(props.groupId)
})

const isNotInGroup = computed(() => {
  return messageData.sessionList[props.groupId]?.leave
})

/**
 * 按照role倒序排, 其中自己在role相同时是第一个
 */
const validMembersSorted = computed(() => {
  if (isNotInGroup.value) return []

  const data = []
  Object.values(validMembers.value).forEach((item) => {
    if (!props.memberSearchKey) {
      data.push(item)
    } else {
      if (
        item.nickName.toLowerCase().includes(props.memberSearchKey.toLowerCase()) ||
        item.account === props.memberSearchKey
      ) {
        data.push(item)
      }
    }
  })

  return data.sort((a, b) => {
    if (b.role !== a.role) {
      return b.role - a.role
    } else {
      if (myAccount.value === b.account) {
        return 1
      } else if (myAccount.value === a.account) {
        return -1
      } else {
        return 0
      }
    }
  })
})

const onOpenSession = () => {
  emit('openSession', {
    msgType: MsgType.CHAT,
    objectInfo: validMembers.value[showMenuAccount.value]
  })
}

const mutedButtonTitle = (mutedMode) => {
  if (!iAmAdmin.value) return ''
  return isMuted(mutedMode) ? '取消禁言' : '禁言'
}

const isMuted = (mutedMode) => {
  if (mutedMode === 1 || (groupInfo.value.allMuted && mutedMode !== 2)) {
    return true
  } else {
    return false
  }
}

let setMutedTimer
const setMuted = (account, mode) => {
  if (!iAmAdmin.value) return

  let mutedMode
  if (groupInfo.value.allMuted) {
    // 全员禁言模式下对某个成员取消禁言就是把mutedMode置为2(白名单), 设置禁言就是把mutedMode置为0(从白名单剔除)
    mutedMode = mode === 'cancle' ? 2 : 0
  } else {
    // 非全员禁言模式下对某个成员设置禁言就是把mutedMode置为1(黑名单), 取消禁言就是把mutedMode置为0(从黑名单剔除)
    mutedMode = mode === 'set' ? 1 : 0
  }

  clearTimeout(setMutedTimer)
  setMutedTimer = setTimeout(() => {
    const loadingInstance = ElLoading.service(el_loading_options)
    groupUpdateMuteService({
      groupId: props.groupId,
      account: account,
      mutedMode: mutedMode
    })
      .then((res) => {
        if (res.data.code === 0) {
          groupData.setOneOfGroupMembers({
            groupId: props.groupId,
            account: account,
            userInfo: {
              ...validMembers.value[account],
              mutedMode: mutedMode
            }
          })
          ElMessage.success('设置成功')
        }
      })
      .finally(() => {
        loadingInstance.close()
      })
  }, 300)
}

const iAmAdmin = computed(() => {
  return validMembers.value[myAccount.value]?.role > 0
})

const setAdmin = (userInfo) => {
  ElMessageBox.confirm(
    `是否要将 ${userInfo.nickName}(${userInfo.account}) 设为管理员？`,
    '温馨提示',
    {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    }
  )
    .then(() => {
      const loadingInstance = ElLoading.service(el_loading_options)
      groupChangeRoleService({
        groupId: props.groupId,
        account: userInfo.account,
        role: 1
      })
        .then((res) => {
          if (res.data.code === 0) {
            groupData.setOneOfGroupMembers({
              groupId: props.groupId,
              account: userInfo.account,
              userInfo: {
                ...userInfo,
                role: 1
              }
            })
            ElMessage.success('设置成功')
          }
        })
        .finally(() => {
          loadingInstance.close()
        })
    })
    .catch(() => {
      // do nothing
    })
}

const cancelAdmin = (userInfo) => {
  ElMessageBox.confirm(
    `是否要取消 ${userInfo.nickName}(${userInfo.account}) 的管理员权限？`,
    '温馨提示',
    {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    }
  )
    .then(() => {
      const loadingInstance = ElLoading.service(el_loading_options)
      groupChangeRoleService({
        groupId: props.groupId,
        account: userInfo.account,
        role: 0
      })
        .then((res) => {
          if (res.data.code === 0) {
            groupData.setOneOfGroupMembers({
              groupId: props.groupId,
              account: userInfo.account,
              userInfo: {
                ...userInfo,
                role: 0
              }
            })
            ElMessage.success('取消成功')
          }
        })
        .finally(() => {
          loadingInstance.close()
        })
    })
    .catch(() => {
      // do nothing
    })
}

const onDelete = (userInfo) => {
  ElMessageBox.confirm(
    `是否要将 ${userInfo.nickName}(${userInfo.account}) 从本群移出？`,
    '温馨提示',
    {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    }
  )
    .then(() => {
      const loadingInstance = ElLoading.service(el_loading_options)
      const members = [{ account: userInfo.account, nickName: userInfo.nickName }]
      groupDelMembersService({
        operatorId: myAccount.value,
        operatorNickName: validMembers.value[myAccount.value].nickName,
        groupId: props.groupId,
        members: members
      })
        .then((res) => {
          if (res.data.code === 0) {
            ElMessage.success('移出成功')
          } else {
            ElMessage.error('移出失败')
          }
        })
        .finally(() => {
          loadingInstance.close()
        })
    })
    .catch(() => {
      // do nothing
    })
}

const onTransferOwner = (userInfo) => {
  ElMessageBox.confirm(
    `是否要将群主转移给 ${userInfo.nickName}(${userInfo.account}) ？`,
    '温馨提示',
    {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    }
  )
    .then(() => {
      const loadingInstance = ElLoading.service(el_loading_options)
      groupOwnerTransferService({
        groupId: props.groupId,
        account: userInfo.account
      })
        .then((res) => {
          if (res.data.code === 0) {
            groupData.setOneOfGroupMembers({
              groupId: props.groupId,
              account: myAccount.value,
              userInfo: {
                ...validMembers.value[myAccount.value],
                role: 1
              }
            })
            groupData.setOneOfGroupMembers({
              groupId: props.groupId,
              account: userInfo.account,
              userInfo: {
                ...userInfo,
                role: 2
              }
            })
            groupData.setGroupInfo({
              groupId: props.groupId,
              groupInfo: {
                ...groupInfo.value,
                myRole: 1
              }
            })

            ElMessage.success('转移成功')
          }
        })
        .finally(() => {
          loadingInstance.close()
        })
    })
    .catch(() => {
      // do nothing
    })
}

const onShowUserCard = (account) => {
  const sessionId = combineId(account, myAccount.value)
  const loadingInstance = ElLoading.service(el_loading_options)
  userQueryService({ account: account })
    .then((res) => {
      userCardData.setUserInfo(res.data.data)
      if (sessionId in messageData.sessionList) {
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
      }

      groupData.setOneOfGroupMembers({
        groupId: props.groupId,
        account: account,
        userInfo: {
          ...validMembers.value[account],
          nickName: res.data.data.nickName,
          avatar: res.data.data.avatar,
          avatarThumb: res.data.data.avatarThumb
        }
      })
    })
    .finally(() => {
      loadingInstance.close()
      userCardData.setIsShow(true)
    })
}

const showMenuAccount = ref('')
const showMenuMember = computed(() => {
  return validMembers.value[showMenuAccount.value]
})

const showMenuMemberIsAdmin = computed(() => {
  return showMenuMember.value.role > 0
})

const onRowContextmenu = (e) => {
  showMenuAccount.value = e.account
}

const onDblclick = (e) => {
  showMenuAccount.value = e.account
  onOpenSession()
}

const onSelectMenu = (item) => {
  switch (item.label) {
    case 'sendMsg':
      onOpenSession()
      break
    case 'atTa':
      ElMessage.warning('功能开发中')
      break
    case 'voiceCall':
      ElMessage.warning('功能开发中')
      break
    case 'videoCall':
      ElMessage.warning('功能开发中')
      break
    case 'setMuted':
      setMuted(showMenuAccount.value, isMuted(showMenuMember.value.mutedMode) ? 'cancle' : 'set')
      break
    case 'setAdmin':
      if (showMenuMemberIsAdmin.value) {
        cancelAdmin(showMenuMember.value)
      } else {
        setAdmin(showMenuMember.value)
      }
      break
    case 'delete':
      onDelete(showMenuMember.value)
      break
    case 'transferOwner':
      onTransferOwner(showMenuMember.value)
      break
    case 'queryInfo':
      onShowUserCard(showMenuAccount.value)
      break
    default:
      break
  }
}
</script>

<template>
  <MemberMenu :groupId="props.groupId" :account="showMenuAccount" @selectMenu="onSelectMenu">
    <el-table
      class="group-members-table"
      :data="validMembersSorted"
      :show-header="false"
      @row-contextmenu="onRowContextmenu"
      @row-dblclick="onDblclick"
      style="background-color: transparent"
    >
      <el-table-column>
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <UserAvatarIcon
              :showName="scope.row.nickName"
              :showId="scope.row.account"
              :showAvatarThumb="scope.row.avatarThumb"
              :userStatus="scope.row.status"
              :size="'small'"
              @click="onShowUserCard(scope.row.account)"
            ></UserAvatarIcon>
            <div
              style="
                margin-left: 5px;
                display: flex;
                flex-direction: column;
                flex: 1;
                width: 0;
                user-select: text;
              "
            >
              <span
                class="text-ellipsis"
                :title="scope.row.nickName"
                style="height: 20px; font-size: 14px"
              >
                {{ scope.row.nickName }}
              </span>
              <span
                class="text-ellipsis"
                :title="scope.row.account"
                style="height: 20px; font-size: 12px"
              >
                {{ scope.row.account }}
              </span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column width="45">
        <template #default="scope">
          <div
            v-if="scope.row.role === 2"
            style="
              font-size: 12px;
              background-color: rgb(197.7, 225.9, 255);
              text-align: center;
              border-radius: 4px;
            "
          >
            群主
          </div>
          <div
            v-else-if="scope.row.role === 1"
            style="
              font-size: 12px;
              background-color: rgb(209.4, 236.7, 195.9);
              text-align: center;
              border-radius: 4px;
            "
          >
            管理员
          </div>
        </template>
      </el-table-column>
      <el-table-column width="30">
        <template #default="scope">
          <el-button
            class="el-button-muted"
            :class="{
              'muted-active': isMuted(scope.row.mutedMode),
              'muted-not-active': !isMuted(scope.row.mutedMode)
            }"
            :icon="Mute"
            size="small"
            circle
            :title="mutedButtonTitle(scope.row.mutedMode)"
            @click="setMuted(scope.row.account, isMuted(scope.row.mutedMode) ? 'cancle' : 'set')"
          />
        </template>
      </el-table-column>
    </el-table>
  </MemberMenu>
</template>

<style lang="scss" scoped>
.group-members-table {
  :deep(.el-table) {
    --el-table-bg-color: transparent;
  }

  :deep(.el-table__cell) {
    padding: 2px;
    z-index: auto; // 解决右键菜单被el-table透视的问题
  }

  :deep(.el-table__body tr) {
    --el-table-tr-bg-color: transparent;
    --el-table-row-hover-bg-color: #fff;
  }

  :deep(.cell) {
    padding: 0;
  }

  :deep(.el-table__inner-wrapper) {
    &::before {
      //el-table的最下面有一条灰色的先，z-index默认是3，总是会透视出来
      z-index: auto;
    }
  }

  .el-button-muted {
    cursor: v-bind('iAmAdmin ? "pointer": "default"');
  }

  .muted-active {
    opacity: 1;
  }

  .muted-not-active {
    opacity: 0;
    &:hover {
      opacity: v-bind('iAmAdmin ? 1: 0');
    }
  }
}
</style>
