<script setup>
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue'
import { useUserStore, useMessageStore, useGroupStore } from '@/stores'
import { MsgType } from '@/proto/msg'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import groupIcon from '@/assets/svg/group.svg'
import { smartMatch } from '@/js/utils/common'

const props = defineProps(['modelValue', 'sessionId', 'offsetX', 'offsetY', 'atKey'])
const emit = defineEmits(['update:modelValue', 'selected'])

const userData = useUserStore()
const messageData = useMessageStore()
const groupData = useGroupStore()
const atListRef = ref()
const x = ref(0)
const y = ref(0)
const selectedAtIndex = ref(0) // @列表默认选中的下标

const myAccount = computed(() => userData.user.account)

const session = computed(() => {
  return messageData.sessionList[props.sessionId]
})

const atList = computed(() => {
  if (session.value.sessionType !== MsgType.GROUP_CHAT) {
    return []
  }

  const members = groupData.groupMembersList[session.value.remoteId]
  if (!members) {
    return []
  }

  const list = Object.values(members)
    .map((item) => ({
      account: item.account,
      avatarThumb: item.avatarThumb,
      nickName: item.nickName
    }))
    .filter((item) => item.account !== myAccount.value)
    .sort((a, b) => b.account - a.account)

  if (members[myAccount.value].role === 2) {
    list.unshift({ account: 0, avatarThumb: null, nickName: '所有人' })
  }

  return list.filter((item) => smartMatch(item.nickName, props.atKey))
})

onMounted(() => {
  selectedAtIndex.value = 0
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('contextmenu', handleDocumentContextMenu)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('contextmenu', handleDocumentContextMenu)
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => {
    return [props.offsetX, props.offsetY, props.atKey]
  },
  () => {
    nextTick(() => {
      if (atList.value.length > 0) {
        x.value = props.offsetX
        y.value = props.offsetY - atListRef.value?.offsetHeight
      }
    })
  }
)

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      selectedAtIndex.value = 0
    }
  }
)

const handleDocumentClick = () => {
  emit('update:modelValue', false) //关闭窗口
}

const handleDocumentContextMenu = () => {
  emit('update:modelValue', false) //关闭窗口
}

const handleKeydown = (e) => {
  if (!props.modelValue) {
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault() // 阻止默认行为，避免输入框内容上的光标移动
    if (selectedAtIndex.value > 0) {
      selectedAtIndex.value = selectedAtIndex.value - 1
      nextTick(scrollToSelectedItem)
    } else if (selectedAtIndex.value === 0) {
      nextTick(scrollToTop)
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault() // 阻止默认行为，避免输入框内容上的光标移动
    if (selectedAtIndex.value < atList.value.length - 1) {
      selectedAtIndex.value = selectedAtIndex.value + 1
      nextTick(scrollToSelectedItem)
    } else if (selectedAtIndex.value === atList.value.length - 1) {
      nextTick(scrollToButtom)
    }
  } else if (e.key === 'Enter') {
    if (atList.value[selectedAtIndex.value]) {
      emit('selected', atList.value[selectedAtIndex.value])
    }
    emit('update:modelValue', false) //关闭窗口
  } else if (e.key === 'Escape') {
    emit('update:modelValue', false) //关闭窗口
  }
}

// 滚动到选中的项
const scrollToSelectedItem = () => {
  const container = atListRef.value
  if (!container || selectedAtIndex.value < 0) return

  const items = container.querySelectorAll('.at-list-item')
  if (items.length > selectedAtIndex.value) {
    const selectedItem = items[selectedAtIndex.value]
    // 确保选中项在容器视口内
    const itemTop = selectedItem.offsetTop
    const itemHeight = selectedItem.offsetHeight
    const containerHeight = container.clientHeight
    const scrollTop = container.scrollTop

    if (itemTop < scrollTop) {
      // 项在可视区域上方，滚动到顶部对齐
      container.scrollTop = itemTop
    } else if (itemTop + itemHeight > scrollTop + containerHeight) {
      // 项在可视区域下方，滚动到底部对齐
      container.scrollTop = itemTop + itemHeight - containerHeight
    }
  }
}

const scrollToTop = () => {
  const container = atListRef.value
  if (!container) return
  container.scrollTop = 0
}

const scrollToButtom = () => {
  const container = atListRef.value
  if (!container) return
  container.scrollTop = container.scrollHeight
}

const onSelected = (index) => {
  emit('selected', atList.value[index])
  emit('update:modelValue', false) //关闭窗口
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.modelValue && atList.length > 0"
      ref="atListRef"
      class="at-list my-scrollbar"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div
        v-for="(item, index) in atList"
        :key="item.account"
        class="at-list-item bdr-b"
        :class="{ active: index === selectedAtIndex }"
        @click="onSelected(index)"
      >
        <UserAvatarIcon
          v-if="item.account !== 0"
          :showName="item.nickName"
          :showId="item.account"
          :showAvatarThumb="item.avatarThumb"
          :userStatus="item.status"
          :size="'tiny'"
        ></UserAvatarIcon>
        <div v-else class="all-icon">
          <groupIcon></groupIcon>
        </div>
        <span class="text-ellipsis" :title="item.nickName">{{ item.nickName }}</span>
        <span
          class="text-ellipsis"
          v-if="item.account !== 0"
          :title="item.account"
          style="color: gray"
        >
          {{ item.account }}
        </span>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.at-list {
  position: absolute;
  width: 160px;
  max-height: 160px; // 刚好是5个item的高度
  border-radius: 4px;
  padding: 4px;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  overflow-y: scroll;

  .at-list-item {
    height: 24px;
    display: flex;
    border-radius: 2px;
    padding: 2px;
    gap: 5px;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      background-color: #c6e2ff;
    }

    .all-icon {
      border: #fff solid 1px;
      border-radius: 50%;
      background-color: #409eff;

      .svg-icon {
        height: 24px;
        width: 24px;
        fill: #fff;
      }
    }
  }

  .active {
    background-color: #c6e2ff;
  }

  &.my-scrollbar {
    &::-webkit-scrollbar-thumb {
      background-color: #409eff;
    }
  }
}
</style>
