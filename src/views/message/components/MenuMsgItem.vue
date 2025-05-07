<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, markRaw } from 'vue'
import QuoteIcon from '@/assets/svg/quote.svg'
import ForwardIcon from '@/assets/svg/forward.svg'
import DeletemsgIcon from '@/assets/svg/deletemsg.svg'
import CopyIcon from '@/assets/svg/copy.svg'
import MultiselectIcon from '@/assets/svg/multiselect.svg'
import RevokeIcon from '@/assets/svg/revoke.svg'
import { useUserStore, useMenuStore } from '@/stores'
import { jsonParseSafe } from '@/js/utils/common'
import { MSG_REVOKE_TIME_LIMIT, msgContentType, msgSendStatus } from '@/const/msgConst'

const props = defineProps(['msg'])
const emit = defineEmits(['selectMenu'])

const userData = useUserStore()
const menuData = useMenuStore()
const openMenuTime = ref(null)

const menuName = computed(() => {
  return 'MenuMsgItem-' + props.msg.msgId
})

const myAccount = computed(() => {
  return userData.user.account
})

const contentType = computed(() => {
  const contentJson = jsonParseSafe(props.msg.content)
  if (!contentJson) {
    return msgContentType.MIX
  }

  const type = contentJson['type']
  if (!type) {
    return msgContentType.MIX
  } else {
    return type
  }
})

const msgStatus = computed(() => {
  return props.msg.status || msgSendStatus.OK
})

const menu = computed(() => {
  const o = [
    {
      label: 'delete',
      desc: '删除',
      icon: markRaw(DeletemsgIcon),
      index: 5
    }
  ]

  if (contentType.value !== msgContentType.RECORDING) {
    o.push({
      label: 'copy',
      desc: '复制',
      icon: markRaw(CopyIcon),
      index: 0
    })
  }

  if (msgStatus.value === msgSendStatus.OK) {
    o.push({
      label: 'multiSelect',
      desc: '多选',
      icon: markRaw(MultiselectIcon),
      index: 2
    })
    o.push({
      label: 'quote',
      desc: '引用',
      icon: markRaw(QuoteIcon),
      index: 3
    })
  }

  if (msgStatus.value === msgSendStatus.OK && contentType.value !== msgContentType.RECORDING) {
    o.push({
      label: 'forward',
      desc: '转发',
      icon: markRaw(ForwardIcon),
      index: 1
    })
  }

  if (
    myAccount.value === props.msg.fromId &&
    msgStatus.value === msgSendStatus.OK &&
    openMenuTime.value - new Date(props.msg.msgTime) < MSG_REVOKE_TIME_LIMIT
  ) {
    o.push({
      label: 'revoke',
      desc: '撤回',
      icon: markRaw(RevokeIcon),
      index: 4
    })
  }

  return o.sort((a, b) => a.index - b.index)
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
    if (newVal !== menuName.value && isShowMenu.value) {
      closeMenu()
    }
  }
)

const handleShowMenu = (e) => {
  e.preventDefault() //阻止浏览器默认行为
  e.stopPropagation() // 阻止冒泡
  isShowMenu.value = true
  menuData.setActiveMenu(menuName.value)
  openMenuTime.value = new Date()
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
  openMenuTime.value = null
}

const handleClick = (item) => {
  emit('selectMenu', item.label)
}
</script>

<template>
  <div class="context-menu-container" ref="containerRef">
    <!-- 在定义的插槽范围内都能打开菜单，超出了就不行 -->
    <slot></slot>
    <Teleport to="body">
      <div
        v-if="isShowMenu"
        class="context-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        @contextmenu.prevent
        ref="menuRef"
      >
        <div class="menu-list">
          <div class="menu-item" v-for="item in menu" :key="item.label" @click="handleClick(item)">
            <component class="menu-icon" :is="item.icon" />
            <span class="menu-desc text-ellipsis">{{ item.desc }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.context-menu {
  padding: 5px;
  border-radius: 6px;
  background-color: #fff;
  position: absolute;
  box-shadow: 2px 2px 20px gray;

  .menu-item {
    padding: 5px;
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
      padding-left: 5px;
      padding-right: 5px;
      display: flex;
      justify-content: start;
      align-items: center;
      font-size: 14px;
    }
  }
}
</style>
