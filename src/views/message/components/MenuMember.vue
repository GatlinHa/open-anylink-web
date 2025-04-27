<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw, watch } from 'vue'
import {
  ChatDotRound,
  Tickets,
  Microphone,
  VideoCamera,
  Mute,
  Phone
} from '@element-plus/icons-vue'
import AtIcon from '@/assets/svg/at.svg'
import adminIcon from '@/assets/svg/administrator.svg'
import DeleteIcon from '@/assets/svg/delete.svg'
import TransferIcon from '@/assets/svg/transfer.svg'
import { useUserStore, useGroupStore, useMenuStore } from '@/stores'

const props = defineProps(['groupId', 'account'])
const emit = defineEmits(['selectMenu'])

const userData = useUserStore()
const groupData = useGroupStore()
const menuData = useMenuStore()
const menuName = 'MenuMember' // 菜单唯一标识

const myAccount = computed(() => userData.user.account)

const memberIsSelf = computed(() => {
  return myAccount.value === props.account
})

const groupInfo = computed(() => {
  return groupData.groupInfoList[props.groupId] || {}
})

const memberInfo = computed(() => {
  return groupData.groupMembersList[props.groupId][props.account]
})

const iAmAdmin = computed(() => {
  return groupData.groupMembersList[props.groupId][myAccount.value].role > 0
})

const iAmOwner = computed(() => {
  return groupData.groupMembersList[props.groupId][myAccount.value].role === 2
})

const memberIsMuted = computed(() => {
  if (
    memberInfo.value.mutedMode === 1 ||
    (groupInfo.value.allMuted && memberInfo.value.mutedMode !== 2)
  ) {
    return true
  } else {
    return false
  }
})

const memberIsAdmin = computed(() => {
  return memberInfo.value.role > 0
})

const lable_sendMsg = ref({
  label: 'sendMsg',
  desc: '发送消息',
  icon: markRaw(ChatDotRound) // 这里的动态组件用markRaw包裹，否则vue以为组件是响应式的，解析响应式数据消耗额外性能
})
const lable_atTa = ref({
  label: 'atTa',
  desc: '@TA',
  icon: markRaw(AtIcon)
})
const lable_voiceCall = ref({
  label: 'voiceCall',
  desc: '语音通话',
  icon: markRaw(Phone)
})
const lable_videoCall = ref({
  label: 'videoCall',
  desc: '视频通话',
  icon: markRaw(VideoCamera)
})
const lable_setMuted = computed(() => {
  return {
    label: 'setMuted',
    desc: memberIsMuted.value ? '取消禁言' : '禁言',
    icon: memberIsMuted.value ? markRaw(Microphone) : markRaw(Mute)
  }
})
const lable_setAdmin = computed(() => {
  return {
    label: 'setAdmin',
    desc: memberIsAdmin.value ? '取消管理员' : '设为管理员',
    icon: markRaw(adminIcon)
  }
})
const lable_delete = ref({
  label: 'delete',
  desc: '从本群移出',
  icon: markRaw(DeleteIcon)
})
const lable_transferOwner = ref({
  label: 'transferOwner',
  desc: '转移群主',
  icon: markRaw(TransferIcon)
})
const lable_queryInfo = ref({
  label: 'queryInfo',
  desc: '查看信息',
  icon: markRaw(Tickets)
})

const menu = computed(() => {
  if (memberIsSelf.value) {
    if (memberIsAdmin.value) {
      return [lable_queryInfo.value, lable_setMuted.value]
    } else {
      return [lable_queryInfo.value]
    }
  } else if (iAmOwner.value) {
    return [
      lable_sendMsg.value,
      lable_atTa.value,
      lable_voiceCall.value,
      lable_videoCall.value,
      lable_setMuted.value,
      lable_setAdmin.value,
      lable_delete.value,
      lable_transferOwner.value,
      lable_queryInfo.value
    ]
  } else if (iAmAdmin.value) {
    if (memberIsAdmin.value) {
      return [
        lable_sendMsg.value,
        lable_atTa.value,
        lable_voiceCall.value,
        lable_videoCall.value,
        lable_setMuted.value,
        lable_queryInfo.value
      ]
    } else {
      return [
        lable_sendMsg.value,
        lable_atTa.value,
        lable_voiceCall.value,
        lable_videoCall.value,
        lable_setMuted.value,
        lable_delete.value,
        lable_queryInfo.value
      ]
    }
  } else {
    return [
      lable_sendMsg.value,
      lable_atTa.value,
      lable_voiceCall.value,
      lable_videoCall.value,
      lable_queryInfo.value
    ]
  }
})

const containerRef = ref()
const menuRef = ref()
const isShowMenu = ref(false)
const x = ref(0)
const y = ref(0)

onMounted(() => {
  containerRef.value?.addEventListener('contextmenu', handleShowMenu)
  document.addEventListener('keydown', handleEscEvent)
  document.addEventListener('click', closeMenu) //在其他地方的click事件要能关闭菜单
  document.addEventListener('contextmenu', closeMenu) //在其他地方的菜单事件也要能关闭菜单
})

onUnmounted(() => {
  containerRef.value?.removeEventListener('contextmenu', handleShowMenu)
  document.removeEventListener('keydown', handleEscEvent)
  document.removeEventListener('click', closeMenu)
  document.removeEventListener('contextmenu', closeMenu)
})

// 监听菜单状态变化
watch(
  () => menuData.activeMenu,
  (newVal) => {
    if (newVal !== menuName && isShowMenu.value) {
      closeMenu()
    }
  }
)

const handleShowMenu = (e) => {
  e.preventDefault() //阻止浏览器默认行为
  e.stopPropagation() // 阻止冒泡
  isShowMenu.value = true
  menuData.setActiveMenu(menuName)

  nextTick(() => {
    //如果发现菜单超出window.innerWidth屏幕宽度，x要修正一下，往左边弹出菜单
    if (e.clientX + menuRef.value.clientWidth > window.innerWidth) {
      x.value = e.clientX - menuRef.value.clientWidth
    } else {
      x.value = e.clientX
    }

    // 如果发现菜单超出window.innerHeight屏幕高度，y要修正一下，往上面弹出菜单
    if (e.clientY + menuRef.value.clientHeight > window.innerHeight) {
      y.value = e.clientY - menuRef.value.clientHeight
    } else {
      y.value = e.clientY
    }
  })
}

const handleEscEvent = (event) => {
  if (event.key === 'Escape') isShowMenu.value = false
}

const closeMenu = () => {
  isShowMenu.value = false
}

const handleClick = (item) => {
  emit('selectMenu', item)
}
</script>

<template>
  <div class="context-menu-container" ref="containerRef">
    <!-- 在定义的插槽范围内都能打开菜单，超出了就不行 -->
    <slot></slot>
    <Teleport to="body">
      <div
        v-if="isShowMenu"
        class="member-context-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        @contextmenu.prevent
        ref="menuRef"
      >
        <div class="menu-list">
          <div
            class="member-menu-item"
            v-for="item in menu"
            :key="item.label"
            @click="handleClick(item)"
          >
            <component class="menu-icon" :is="item.icon" />
            <span class="menu-desc text-ellipsis">{{ item.desc }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.member-context-menu {
  padding: 5px;
  border-radius: 6px;
  background-color: #fff;
  position: fixed;
  box-shadow: 2px 2px 20px gray;
  z-index: 1; //因为el-drawer的遮罩元素的z-index是1，这里如果不改菜单出不来

  .member-menu-item {
    padding: 5px;
    padding-left: 10px;
    padding-right: 10px;
    margin-top: 3px;
    border-radius: 4px;
    display: flex;
    cursor: pointer;

    &:hover {
      background-color: #e6e8eb;
    }

    .menu-icon {
      width: 20px;
      height: 20px;
    }

    .menu-desc {
      padding-left: 10px;
      padding-right: 10px;
      display: flex;
      justify-content: start;
      align-items: center;
      font-size: 14px;
    }
  }
}
</style>
