<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { Search, Edit, Delete, Check, Close } from '@element-plus/icons-vue'
import AddButton from '@/components/common/AddButton.vue'
import HashNoData from '@/components/common/HasNoData.vue'
import SelectUserDialog from '@/components/common/SelectUserDialog.vue'
import { groupStore, userStore, messageStore, userCardStore, groupCardStore } from '@/stores'
import { combineId } from '@/js/utils/common'
import { userQueryService } from '@/api/user'
import { ElLoading, ElMessage } from 'element-plus'
import { el_loading_options, PARTITION_TYPE } from '@/const/commonConst'
import { groupCreateService, groupSearchMemberService, groupInfoService } from '@/api/group'
import ContactListGroupItem from '@/views/contactList/group/components/ContactListGroupItem.vue'
import { MsgType } from '@/proto/msg'

const props = defineProps(['tab', 'params'])

const groupData = groupStore()
const userData = userStore()
const messageData = messageStore()
const userCardData = userCardStore()
const groupCardData = groupCardStore()
const searchKey = ref('')
const searchData = ref([])
const isShowSelectDialog = ref(false)
const initDone = ref(false) //避免还未数据加载完时就显示无数据

const markEditing = ref({})
const newMark = ref({})
const markEditRef = ref({})

const partitioEditing = ref({})
const newPartitionId = ref({})

onMounted(async () => {
  await messageData.loadPartitions()
  await groupData.loadGroupInfoList()
  initDone.value = true
})

const initData = computed(() => {
  if (!initDone.value) return {}

  let data = {}
  const values = Object.values(groupData.groupInfoList)
  switch (props.tab) {
    case undefined:
    case 'all':
    default:
      return groupData.groupInfoList
    case 'created':
      values.forEach((item) => {
        if (item.myRole === 2) {
          data[item.groupId] = item
        }
      })
      return data
    case 'managed':
      values.forEach((item) => {
        if (item.myRole > 0) {
          data[item.groupId] = item
        }
      })
      return data
    case 'joined':
      values.forEach((item) => {
        if (item.myRole === 0) {
          data[item.groupId] = item
        }
      })
      return data
    case 'mark':
      values.forEach((item) => {
        if (messageData.sessionList[item.groupId]?.mark) {
          data[item.groupId] = item
        }
      })
      return data
    case 'partition':
      values.forEach((item) => {
        if (messageData.sessionList[item.groupId]?.partitionId === props.params.partitionId) {
          data[item.groupId] = item
        }
      })
      return data
  }
})

const partitions = computed(() => {
  const data = {}
  Object.values(messageData.partitions).forEach((item) => {
    if (item.partitionType === PARTITION_TYPE.GROUP) {
      data[item.partitionId] = item
    }
  })
  return data
})

const showData = computed(() => {
  if (!searchKey.value) {
    return Object.values(initData.value)
  }

  const data = []
  const searchDataGroupIds = new Set(searchData.value?.map((item) => item.groupId))
  Object.values(initData.value).forEach((item) => {
    // 1.放群名称和群ID，或群备注的匹配结果
    if (
      item.groupName.toLowerCase().includes(searchKey.value.toLowerCase()) ||
      item.groupId === searchKey.value ||
      (props.tab === 'mark' &&
        messageData.sessionList[item.groupId].mark
          .toLowerCase()
          .includes(searchKey.value.toLowerCase()))
    ) {
      item['sortMark'] = '1' // 让群名称和群ID的匹配结果放在前面, 因为群成员的匹配结果会滞后出现,如果不排序在出现的时候页面数据刷新变化很大
      data.push(item)
    } else if (searchDataGroupIds?.has(item.groupId)) {
      // 2.放群成员的匹配结果
      item['sortMark'] = '2'
      data.push(item)
    }
  })
  return data.sort((a, b) => {
    return a.sortMark - b.sortMark
  })
})

const searchPlaceholder = computed(() => {
  switch (props.tab) {
    default:
      return '搜索：群名称/群ID/成员群昵称/成员账号'
    case 'mark':
      return '搜索：群名称/群备注/群ID/成员群昵称/成员账号'
  }
})

// 需要给符合条件的groupId保存下查询结果高亮的提示
const searchResultTips = computed(() => {
  const tips = {
    title: {},
    html: {}
  }

  if (!searchKey.value) {
    return tips
  }

  let nickNameMatchCnt = {} // 对同一个群的搜索结果个数计数
  searchData.value.forEach((item) => {
    const regex = new RegExp(searchKey.value, 'gi')
    if (item.nickName.toLowerCase().includes(searchKey.value.toLowerCase())) {
      if (item.groupId in nickNameMatchCnt) {
        nickNameMatchCnt[item.groupId] = nickNameMatchCnt[item.groupId] + 1
      } else {
        nickNameMatchCnt[item.groupId] = 1
      }

      //最多展示3个昵称,多的用"等x人"表示
      if (nickNameMatchCnt[item.groupId] === 4) {
        tips.title[item.groupId] =
          tips.title[item.groupId] + `等${nickNameMatchCnt[item.groupId]}人`
        tips.html[item.groupId] = tips.html[item.groupId] + `等${nickNameMatchCnt[item.groupId]}人`
      } else if (nickNameMatchCnt[item.groupId] > 4) {
        //do nothing
      } else {
        if (item.groupId in tips.title) {
          tips.title[item.groupId] = tips.title[item.groupId] + ', ' + item.nickName
          tips.html[item.groupId] =
            tips.html[item.groupId] +
            ', ' +
            item.nickName.replace(regex, `<span style="color: #409eff;">$&</span>`)
        } else {
          tips.title[item.groupId] = '包含：' + item.nickName
          tips.html[item.groupId] =
            '包含：' + item.nickName.replace(regex, `<span style="color: #409eff;">$&</span>`)
        }
      }
    } else if (item.account === searchKey.value) {
      tips.title[item.groupId] = '包含：' + item.account + `(${item.nickName})`
      tips.html[item.groupId] =
        '包含：' +
        item.account.replace(regex, `<span style="color: #409eff;">$&</span>`) +
        `(${item.nickName})`
    }
  })

  return tips
})

let timer
const onSearch = () => {
  if (!searchKey.value) {
    searchData.value = []
    return
  }

  clearTimeout(timer)
  const key = searchKey.value
  timer = setTimeout(() => {
    groupSearchMemberService({ searchKey: key }).then((res) => {
      searchData.value = res.data.data
    })
  }, 300)
}

const totalCount = computed(() => {
  return showData.value.length
})

const onCreateGroup = () => {
  isShowSelectDialog.value = true
}

const onShowUserCard = (account) => {
  const sessionId = combineId(account, userData.user.account)
  const loadingInstance = ElLoading.service(el_loading_options)
  userQueryService({ account: account })
    .then((res) => {
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
      userCardData.setUserInfo(res.data.data)
    })
    .finally(() => {
      loadingInstance.close()
      userCardData.setIsShow(true)
    })
}

/**
 * 用于显示创建群组弹窗中的候选成员名单
 */
const selectDialogOptions = computed(() => {
  const data = {}
  Object.values(messageData.sessionList).forEach((item) => {
    if (item.sessionType === MsgType.CHAT) {
      data[item.objectInfo.account] = item.objectInfo
    }
  })
  return data
})

const onConfirmSelect = async (selected) => {
  if (selected.length < 2) {
    ElMessage.warning('请至少选择两位群成员')
    return
  }

  const members = selected.map((item) => ({ account: item.account, nickName: item.nickName }))
  members.push({ account: userData.user.account, nickName: userData.user.nickName })
  const loadingInstance = ElLoading.service(el_loading_options)
  groupCreateService({
    groupName: `${userData.user.nickName}、${selected[0].nickName}、${selected[1].nickName}等的群组`,
    groupType: 1, //普通群
    members: members
  }).finally(() => {
    isShowSelectDialog.value = false
    loadingInstance.close()
  })
}

const onShowGroupCard = async (groupInfo) => {
  const res = await groupInfoService({ groupId: groupInfo.groupId })
  groupCardData.setOpened(groupInfo.groupId)
  groupData.setGroupMembers({
    groupId: groupInfo.groupId,
    members: res.data.data.members
  })
}

const onClickEditMark = (groupId) => {
  newMark.value[groupId] = messageData.sessionList[groupId].mark || ''
  markEditing.value[groupId] = true
  nextTick(() => {
    markEditRef.value[groupId].focus()
  })
}

const saveMark = (groupId) => {
  if (newMark.value[groupId] !== messageData.sessionList[groupId].mark) {
    const sessionId = groupId
    messageData.updateSession({
      sessionId: sessionId,
      mark: newMark.value[groupId]
    })
  }
  markEditing.value[groupId] = false
}

const deleteMark = (groupId) => {
  if (!messageData.sessionList[groupId].mark) {
    return
  } else {
    newMark.value[groupId] = ''
    saveMark(groupId)
  }
}

const cancelMark = (groupId) => {
  markEditing.value[groupId] = false
}

const onClickEditPartition = (groupId) => {
  partitioEditing.value[groupId] = true
  newPartitionId.value[groupId] = messageData.sessionList[groupId]?.partitionId
}

const onClearPartition = (groupId) => {
  messageData.updateSession({
    sessionId: groupId,
    partitionId: 0 //和后端约定0表示不分组
  })
  newPartitionId.value[groupId] = 0
}

const onChangePartition = (groupId) => {
  if (newPartitionId.value[groupId] !== messageData.sessionList[groupId]?.partitionId) {
    messageData.updateSession({
      sessionId: groupId,
      partitionId: newPartitionId.value[groupId]
    })
  }
  partitioEditing.value[groupId] = false
}

const onCancelPartition = (groupId) => {
  partitioEditing.value[groupId] = false
  newPartitionId.value[groupId] = messageData.sessionList[groupId]?.partitionId
}
</script>

<template>
  <el-container style="height: 100%">
    <el-header class="bdr-b">
      <div style="font-size: 14px">全部({{ totalCount }})</div>
      <div class="search-and-add">
        <el-input
          v-model.trim="searchKey"
          :placeholder="searchPlaceholder"
          :prefix-icon="Search"
          :clearable="true"
          @input="onSearch"
        />
        <AddButton :size="20" @click="onCreateGroup"></AddButton>
      </div>
    </el-header>
    <el-main class="my-scrollbar" style="padding: 8px">
      <div v-if="showData.length">
        <ContactListGroupItem
          v-for="item in showData"
          :key="item.groupId"
          :groupInfo="item"
          :keyWords="searchKey"
          @showGroupCard="onShowGroupCard(item)"
        >
          <template #showMore_1>
            <div v-if="props.tab === 'mark'" class="mark" style="margin-left: 10px">
              <div class="tips-block">备注</div>
              <div v-if="!markEditing[item.groupId]" class="mark-content-wrapper">
                <div
                  class="mark-content text-ellipsis"
                  :title="messageData.sessionList[item.groupId].mark"
                  @click="onClickEditMark(item.groupId)"
                >
                  {{ messageData.sessionList[item.groupId].mark }}
                </div>
                <div style="display: flex; flex-direction: row">
                  <el-button
                    type="primary"
                    :icon="Edit"
                    size="small"
                    title="编辑备注"
                    circle
                    @click="onClickEditMark(item.groupId)"
                  ></el-button>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    size="small"
                    title="删除备注"
                    circle
                    @click="deleteMark(item.groupId)"
                    style="margin-left: 5px"
                  ></el-button>
                </div>
              </div>
              <div v-else class="mark-edit-wrapper">
                <el-input
                  :ref="
                    (el) => {
                      markEditRef[item.groupId] = el
                    }
                  "
                  class="mark-edit"
                  v-model.trim="newMark[item.groupId]"
                  maxlength="10"
                  show-word-limit
                  size="small"
                  clearable
                  @keyup.enter="saveMark(item.groupId)"
                ></el-input>
                <div style="display: flex; flex-direction: row">
                  <el-button
                    type="success"
                    :icon="Check"
                    size="small"
                    title="确认"
                    circle
                    @click="saveMark(item.groupId)"
                  ></el-button>
                  <el-button
                    type="info"
                    :icon="Close"
                    size="small"
                    title="取消"
                    circle
                    @click="cancelMark(item.groupId)"
                    style="margin-left: 5px"
                  ></el-button>
                </div>
              </div>
            </div>
            <div v-if="props.tab === 'partition'" class="partition" style="margin-left: 10px">
              <div class="tips-block">分组</div>
              <div v-if="!partitioEditing[item.groupId]" class="partition-content-wrapper">
                <div
                  class="partition-content text-ellipsis"
                  :title="
                    partitions[messageData.sessionList[item.groupId]?.partitionId]?.partitionName
                  "
                  @click="onClickEditPartition(item.groupId)"
                >
                  {{
                    partitions[messageData.sessionList[item.groupId]?.partitionId]?.partitionName
                  }}
                </div>
                <div style="display: flex; flex-direction: row">
                  <el-button
                    type="primary"
                    :icon="Edit"
                    size="small"
                    title="调整分组"
                    circle
                    @click="onClickEditPartition(item.groupId)"
                  ></el-button>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    size="small"
                    title="从该分组中移除"
                    circle
                    @click="onClearPartition(item.groupId)"
                    style="margin-left: 5px"
                  ></el-button>
                </div>
              </div>
              <div v-else class="partition-edit-wrapper">
                <el-select
                  class="partition-edit"
                  v-model="newPartitionId[item.groupId]"
                  placeholder="请选择分组"
                  size="small"
                  style="margin-left: 5px"
                >
                  <el-option
                    v-for="item in Object.values(partitions)"
                    :key="item.partitionId"
                    :label="item.partitionName"
                    :value="item.partitionId"
                  />
                </el-select>
                <div style="display: flex; flex-direction: row">
                  <el-button
                    type="success"
                    :icon="Check"
                    size="small"
                    title="确认"
                    circle
                    @click="onChangePartition(item.groupId)"
                  ></el-button>
                  <el-button
                    type="info"
                    :icon="Close"
                    size="small"
                    title="取消"
                    circle
                    @click="onCancelPartition(item.groupId)"
                    style="margin-left: 5px"
                  ></el-button>
                </div>
              </div>
            </div>
          </template>
          <template #showMore_2>
            <div
              class="text-ellipsis"
              :title="searchResultTips.title[item.groupId]"
              v-html="searchResultTips.html[item.groupId]"
              style="width: 200px; margin-left: 10px"
            ></div>
          </template>
        </ContactListGroupItem>
      </div>
      <HashNoData v-else-if="showData.length === 0 && initDone" :size="100"></HashNoData>
    </el-main>
  </el-container>
  <SelectUserDialog
    v-model="isShowSelectDialog"
    :options="selectDialogOptions"
    :searchModel="'server'"
    @showUserCard="onShowUserCard"
    @confirm="onConfirmSelect"
  >
    <template #title>
      <div style="font-size: 16px; font-weight: bold; white-space: nowrap">创建群组</div>
    </template>
  </SelectUserDialog>
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

.search-and-add {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .el-input {
    width: 350px;
    height: 30px;
    margin-right: 10px;

    :deep(.el-input__wrapper) {
      border-radius: 25px;
    }
  }
}

.mark {
  height: 100%;
  display: flex;
  align-items: center;

  .tips-block {
    justify-content: start;
    border-radius: 4px;
    padding-left: 5px;
    padding-right: 5px;
    background: rgb(221.7, 222.6, 224.4);
    flex-shrink: 0;
  }

  .mark-content-wrapper {
    width: 220px;
    display: flex;
    justify-content: space-between;

    .mark-content {
      margin-left: 5px;
      display: flex;
      align-items: center;
      color: #409eff;
      cursor: pointer;
    }
  }

  .mark-edit-wrapper {
    width: 220px;
    display: flex;
    justify-content: space-between;
    .mark-edit {
      width: 140px;
      margin-left: 5px;
    }
  }
}

.partition {
  height: 100%;
  display: flex;
  align-items: center;

  .tips-block {
    justify-content: start;
    border-radius: 4px;
    padding-left: 5px;
    padding-right: 5px;
    background: rgb(221.7, 222.6, 224.4);
    flex-shrink: 0;
  }

  .partition-content-wrapper {
    width: 220px;
    display: flex;
    justify-content: space-between;

    .partition-content {
      margin-left: 5px;
      display: flex;
      align-items: center;
      color: #409eff;
      cursor: pointer;
    }
  }

  .partition-edit-wrapper {
    width: 220px;
    display: flex;
    justify-content: space-between;
    .partition-edit {
      width: 140px;
      margin-left: 5px;
    }
  }
}
</style>
