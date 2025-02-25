<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Top, Bottom, MuteNotification, Bell, CircleClose, Edit } from '@element-plus/icons-vue'
import { messageStore } from '@/stores'

const props = defineProps(['sessionId'])
const emit = defineEmits(['selectMenu', 'closeMenu'])

const messageData = messageStore()

const top = computed(() => {
  if (props.sessionId) {
    return messageData.sessionList[props.sessionId].top
  } else {
    return undefined
  }
})

const dnd = computed(() => {
  if (props.sessionId) {
    return messageData.sessionList[props.sessionId].dnd
  } else {
    return undefined
  }
})

const menu = computed(() => {
  return [
    {
      label: 'top',
      desc: top.value ? '取消置顶' : '置顶',
      icon: top.value ? Bottom : Top
    },
    {
      label: 'dnd',
      desc: dnd.value ? '取消免打扰' : '设置免打扰',
      icon: dnd.value ? Bell : MuteNotification
    },
    {
      label: 'mark',
      desc: '修改备注',
      icon: Edit
    },
    {
      label: 'close',
      desc: '关闭会话',
      icon: CircleClose
    }
  ]
})

const containerRef = ref()
const menuRef = ref()
const isShowMenu = ref(false)
const x = ref(0)
const y = ref(0)

onMounted(() => {
  containerRef.value?.addEventListener('contextmenu', handleSessionMenu)
  document.addEventListener('keydown', handleEscEvent)
  document.addEventListener('click', closeMenu) //在其他地方的click事件要能关闭菜单
  document.addEventListener('contextmenu', closeMenu) //在其他地方的菜单事件也要能关闭菜单
})

onUnmounted(() => {
  containerRef.value?.removeEventListener('contextmenu', handleSessionMenu)
  document.removeEventListener('keydown', handleEscEvent)
  document.removeEventListener('click', closeMenu)
  document.removeEventListener('contextmenu', closeMenu)
})

const handleSessionMenu = (e) => {
  isShowMenu.value = props.sessionId && true
  if (!isShowMenu.value) {
    return
  }

  e.preventDefault() //阻止浏览器默认行为
  e.stopPropagation() // 阻止冒泡
  x.value = e.clientX
  y.value = e.clientY

  // 如果发现菜单超出window.innerHeight屏幕高度，y要修正一下，往上面弹出菜单
  nextTick(() => {
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
  emit('closeMenu')
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
  position: fixed;
  box-shadow: 2px 2px 20px gray;

  .menu-item {
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
