<script setup>
import { ref, computed } from 'vue'
import { Search, Close } from '@element-plus/icons-vue'
import SessionTitleItem from '@/components/item/SessionTitleItem.vue'
import HashNoData from '@/components/common/HasNoData.vue'
import { userQueryService, userQueryByNickService } from '@/api/user'
import { combineId, smartMatch } from '@/js/utils/common'
import { useUserStore, useMessageStore } from '@/stores'
import { MsgType } from '@/proto/msg'
import { ElMessage } from 'element-plus'

const props = defineProps(['isShow', 'sessionListSortedKey'])
const emit = defineEmits(['update:isShow', 'showUserCard', 'showGroupCard', 'confirm', 'close'])

const userData = useUserStore()
const messageData = useMessageStore()

const selected = ref([])

const myAccount = computed(() => {
  return userData.user.account
})

const searchKey = ref('')
const optionsFromServer = ref({})

const optionsAll = computed(() => {
  return {
    ...messageData.sessionList,
    ...optionsFromServer.value
  }
})

const optionKeys = computed(() => {
  const allKeys = [...props.sessionListSortedKey, ...Object.keys(optionsFromServer.value)]
  if (!searchKey.value) {
    return allKeys
  } else {
    const data = []
    allKeys.forEach((key) => {
      const item = optionsAll.value[key]
      if (
        item.sessionType === MsgType.CHAT &&
        (item.objectInfo.account === searchKey.value ||
          smartMatch(item.objectInfo.nickName, searchKey.value) ||
          smartMatch(item.mark, searchKey.value))
      ) {
        data.push(key)
      } else if (
        item.sessionType === MsgType.GROUP_CHAT &&
        (item.objectInfo.groupId === searchKey.value ||
          smartMatch(item.objectInfo.groupName, searchKey.value) ||
          smartMatch(item.mark, searchKey.value))
      ) {
        data.push(key)
      }
    })
    return data
  }
})

let timer
const onQuery = () => {
  if (!searchKey.value) return

  clearTimeout(timer)
  const key = searchKey.value //在异步执行中，变量禁止使用响应式，因为在将来执行的时候响应式数据随时会发生改变
  timer = setTimeout(async () => {
    userQueryByNickService({ keyWords: key }).then((res) => {
      res.data.data?.forEach((item) => {
        const sessionId = combineId(myAccount.value, item.account)
        if (!messageData.sessionList[sessionId]) {
          // 这里先不create Session，点击确认转发才create Session
          optionsFromServer.value[sessionId] = {}
          optionsFromServer.value[sessionId].sessionId = sessionId
          optionsFromServer.value[sessionId].sessionType = MsgType.CHAT
          optionsFromServer.value[sessionId].mark = ''
          optionsFromServer.value[sessionId].objectInfo = item
        }
      })
    })
    const sessionId = combineId(myAccount.value, key)
    if (!messageData.sessionList[sessionId]) {
      userQueryService({ account: key }).then((res) => {
        if (res.data.data) {
          // 这里先不create Session，点击确认转发才create Session
          optionsFromServer.value[sessionId] = {}
          optionsFromServer.value[sessionId].sessionId = sessionId
          optionsFromServer.value[sessionId].sessionType = MsgType.CHAT
          optionsFromServer.value[sessionId].mark = ''
          optionsFromServer.value[sessionId].objectInfo = res.data.data
        }
      })
    }
  }, 300)
}

const onShowUserCard = (account) => {
  emit('showUserCard', { account })
}

const onShowGroupCard = (groupId) => {
  emit('showGroupCard', { groupId })
}

const onConfirm = () => {
  if (selected.value.length === 0) {
    ElMessage.warning('您还没有选择目标会话')
  } else {
    const data = []
    selected.value.forEach((account) => {
      data.push(optionsAll.value[account])
    })
    emit('confirm', data)
  }
}

const onOpen = () => {
  searchKey.value = ''
}

const onClose = () => {
  selected.value = []
  optionsFromServer.value = {}
  emit('update:isShow', false)
  emit('close')
}

const onCancle = () => {
  emit('update:isShow', false)
  emit('close')
}

const onClearSelected = () => {
  selected.value = []
}

const onRemoveSelectedItem = (index) => {
  selected.value.splice(index, 1)
}
</script>

<template>
  <el-dialog
    class="select-dialog"
    :model-value="props.isShow"
    :modal="false"
    :top="'30vh'"
    :width="'610px'"
    :z-index="1000"
    style="border-radius: 10px"
    @open="onOpen"
    @close="onClose"
  >
    <template #header>
      <slot name="title"></slot>
    </template>
    <div class="main bdr-t bdr-b bdr-l bdr-r">
      <div class="left bdr-r">
        <el-input
          v-model.trim="searchKey"
          placeholder="搜索：昵称/账号/备注/群名称"
          :prefix-icon="Search"
          :clearable="true"
          @input="onQuery"
        />
        <div v-if="optionKeys.length > 0" class="my-scrollbar" style="flex: 1; overflow-y: scroll">
          <el-checkbox-group v-model="selected">
            <el-checkbox v-for="item in optionKeys" :key="item" :value="item">
              <SessionTitleItem
                :session="optionsAll[item]"
                :keyWords="searchKey"
                @showUserCard="onShowUserCard"
                @showGroupCard="onShowGroupCard"
              ></SessionTitleItem>
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <HashNoData v-else></HashNoData>
      </div>
      <div class="right">
        <div class="head bdr-b">
          <div style="font-size: 13px; color: gray">
            {{ `已选择：${selected.length} 个会话` }}
          </div>
          <el-button type="info" size="small" @click="onClearSelected" plain>清空</el-button>
        </div>
        <div v-if="selected.length > 0" class="my-scrollbar" style="flex: 1; overflow-y: scroll">
          <div class="selected-item" v-for="(item, index) in selected" :key="index">
            <SessionTitleItem
              :session="optionsAll[item]"
              @showUserCard="onShowUserCard"
              @showGroupCard="onShowGroupCard"
            ></SessionTitleItem>
            <el-button :icon="Close" size="small" circle @click="onRemoveSelectedItem(index)" />
          </div>
        </div>
        <HashNoData v-else></HashNoData>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="info" @click="onCancle" plain>取消</el-button>
        <el-button type="primary" @click="onConfirm" plain>确认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.main {
  height: 360px;
  margin: 10px 0 10px 0;
  display: flex;
  flex-direction: row;

  .left {
    width: 49%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .head {
      display: flex;
      align-items: center;
    }

    .el-checkbox-group {
      display: flex;
      flex-direction: column;

      .el-checkbox {
        height: 45px;
        margin: 0 2px 2px 0;
        padding: 0 10px 0 10px;
        border-radius: 8px;
        color: black;

        &:hover {
          background-color: #dedfe0;
        }
      }

      .is-checked {
        background-color: #dedfe0;
      }
    }
  }

  .right {
    padding: 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .head {
      height: 30px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .selected-item {
      height: 45px;
      margin: 0 0 2px 0;
      padding: 0 10px 0 10px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: black;
      --close-button-color: transparent;

      &:hover {
        background: #dedfe0;
        --close-button-color: auto;
      }

      .el-button {
        border: none;
        color: var(--close-button-color);
        background-color: var(--close-button-background-color);

        &:hover {
          --close-button-background-color: #f0f0f0;
        }
      }
    }
  }
}

.el-input {
  width: 100%;
  height: 30px;
  margin-bottom: 10px;

  :deep(.el-input__wrapper) {
    border-radius: 25px;
  }
}
</style>
