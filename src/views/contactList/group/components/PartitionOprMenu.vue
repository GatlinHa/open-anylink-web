<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { CirclePlus, Delete, Edit } from '@element-plus/icons-vue'
import { useMenuStore } from '@/stores'

const emit = defineEmits(['selectMenu'])

const menuData = useMenuStore()
const menuName = 'GroupPartitionOprMenu' // 菜单唯一标识

const menu = computed(() => {
  return [
    {
      label: 'addSession',
      desc: '添加群组',
      icon: CirclePlus
    },
    {
      label: 'updateName',
      desc: '更改名称',
      icon: Edit
    },
    {
      label: 'delete',
      desc: '删除分组',
      icon: Delete
    }
  ]
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
}

const handleClick = (item) => {
  emit('selectMenu', item.label)
}

defineExpose({
  handleShowMenu
})
</script>

<template>
  <div class="partition-opr-menu" ref="containerRef">
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
