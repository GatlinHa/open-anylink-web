<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Close } from '@element-plus/icons-vue'
import HashNoData from '@/components/common/HasNoData.vue'
import { groupSearchGroupInfoService } from '@/api/group'
import GroupItem from '../item/GroupItem.vue'
import { smartMatch } from '@/js/utils/common'

/**
 * disabledOptions: 排除项的群ID，比如已经选过了某些群，那么这么群组应该在待选项里被禁用
 * searchModel：default/local 仅搜索本地session，server 还搜索云端数据
 */
const props = defineProps([
  'modelValue',
  'options',
  'disabledOptions',
  'defaultSelected',
  'searchModel'
])
const emit = defineEmits(['update:modelValue', 'showGroupCard', 'confirm'])

const selected = ref([])
watch(
  () => props.defaultSelected,
  (newValue) => {
    selected.value = newValue
  }
)

const searchKey = ref('')
const optionsFromServer = ref({})

const optionsAll = computed(() => {
  return {
    ...props.options,
    ...optionsFromServer.value
  }
})

const optionKeys = computed(() => {
  if (!searchKey.value) {
    return Object.keys(optionsAll.value)
  } else {
    const data = []
    Object.keys(optionsAll.value).forEach((key) => {
      const item = optionsAll.value[key]
      if (item.groupId === searchKey.value || smartMatch(item.groupName, searchKey.value)) {
        data.push(key)
      }
    })
    return data
  }
})

const isDisable = (groupId) => {
  if (props.disabledOptions) {
    return props.disabledOptions.includes(groupId)
  } else {
    return false
  }
}

let timer
const onQuery = () => {
  if (!searchKey.value || props.searchModel !== 'server') return
  clearTimeout(timer)
  const key = searchKey.value //在异步执行中，变量禁止使用响应式，因为在将来执行的时候响应式数据随时会发生改变
  timer = setTimeout(async () => {
    groupSearchGroupInfoService({ searchKey: key }).then((res) => {
      if (res.data.data) {
        res.data.data.forEach((item) => {
          optionsFromServer.value[item.groupId] = item
        })
      }
    })
  }, 300)
}

const onShowGroupCard = ({ groupId }) => {
  emit('showGroupCard', groupId)
}

const onConfirm = () => {
  const data = []
  selected.value.forEach((groupId) => {
    data.push(optionsAll.value[groupId])
  })
  emit('confirm', data)
}

const onOpen = () => {
  searchKey.value = ''
}

const onClose = () => {
  emit('update:modelValue', false)
  selected.value = []
  optionsFromServer.value = {}
}

const onCancle = () => {
  emit('update:modelValue', false)
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
    :model-value="props.modelValue"
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
          placeholder="搜索：群名称/群ID"
          :prefix-icon="Search"
          :clearable="true"
          @input="onQuery"
        />
        <div v-if="optionKeys.length > 0" class="my-scrollbar" style="flex: 1; overflow-y: scroll">
          <el-checkbox-group v-model="selected">
            <el-checkbox
              v-for="item in optionKeys"
              :key="item"
              :value="item"
              :disabled="isDisable(item)"
            >
              <GroupItem
                :groupInfo="optionsAll[item]"
                :size="'small'"
                @showGroupCard="onShowGroupCard"
                style="width: 200px"
              ></GroupItem>
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <HashNoData v-else></HashNoData>
      </div>
      <div class="right">
        <div class="head bdr-b">
          <div style="font-size: 13px; color: gray">
            {{ `已选择：${selected.length} 个` }}
          </div>
          <el-button type="info" size="small" @click="onClearSelected" plain>清空</el-button>
        </div>
        <div v-if="selected.length > 0" class="my-scrollbar" style="flex: 1; overflow-y: scroll">
          <div class="selected-item" v-for="(item, index) in selected" :key="index">
            <GroupItem
              :groupInfo="optionsAll[item]"
              :size="'small'"
              @showGroupCard="onShowGroupCard"
              style="width: 200px"
            ></GroupItem>
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
