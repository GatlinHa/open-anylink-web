<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import { smartMatch } from '@/js/utils/common'

const props = defineProps(['modelValue', 'options', 'disabledOptionIds'])
const emit = defineEmits(['update:modelValue', 'showUserCard', 'confirm'])

const selected = ref('')
const searchKey = ref('')

const showOptions = computed(() => {
  if (!searchKey.value) {
    return props.options
  } else {
    const data = []
    props.options.forEach((item) => {
      if (item.account === searchKey.value || smartMatch(item.nickName, searchKey.value)) {
        data.push(item)
      }
    })
    return data
  }
})

const onOpen = () => {
  searchKey.value = ''
}

const onClose = () => {
  emit('update:modelValue', false)
  selected.value = ''
}

const onCancle = () => {
  emit('update:modelValue', false)
}

const onShowUserCard = (account) => {
  emit('showUserCard', account)
}

const onConfirm = () => {
  if (!selected.value) {
    ElMessage.warning('请选择一个成员')
    return
  }

  ElMessageBox.confirm(`是否要转移群主给该成员？`, '温馨提示', {
    type: 'warning',
    confirmButtonText: '确认',
    cancelButtonText: '取消'
  })
    .then(() => {
      emit('confirm', selected.value)
    })
    .catch(() => {
      // do nothing
    })
}
</script>

<template>
  <el-dialog
    class="single-select-dialog"
    :model-value="props.modelValue"
    :modal="false"
    :top="'30vh'"
    :width="'300px'"
    :z-index="1000"
    style="height: 460px; border-radius: 10px"
    @open="onOpen"
    @close="onClose"
  >
    <template #header>
      <slot name="title"></slot>
    </template>
    <el-input
      v-model.trim="searchKey"
      placeholder="搜索：成员昵称/账号"
      :prefix-icon="Search"
      :clearable="true"
    />
    <div class="select-options my-scrollbar">
      <el-radio-group v-model="selected">
        <el-radio
          v-for="item in showOptions"
          :key="item.account"
          :value="item.account"
          size="large"
          :disabled="props.disabledOptionIds.includes(item.account)"
        >
          <div style="display: flex; align-items: center">
            <UserAvatarIcon
              :showName="item.nickName"
              :showId="item.account"
              :showAvatarThumb="item.avatarThumb"
              :userStatus="item.status"
              :size="'small'"
              @click="onShowUserCard(item.account)"
            ></UserAvatarIcon>
            <div
              style="
                margin-left: 5px;
                display: flex;
                flex-direction: column;
                flex: 1;
                user-select: text;
              "
            >
              <span
                class="text-ellipsis"
                :title="item.nickName"
                style="height: 20px; font-size: 14px"
              >
                {{ item.nickName }}
              </span>
              <span
                class="text-ellipsis"
                :title="item.account"
                style="height: 20px; font-size: 12px"
              >
                {{ item.account }}
              </span>
            </div>
          </div>
        </el-radio>
      </el-radio-group>
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
.select-options {
  height: 300px;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;

  .el-radio-group {
    padding-left: 10px;
    padding-right: 10px;
    .el-radio {
      width: 100%;
      margin: 2px;
      padding: 0 10px 0 10px;
      border-radius: 8px;

      &:hover {
        background-color: #dedfe0;
      }
    }

    .is-checked {
      background-color: #dedfe0;
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
