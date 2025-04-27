import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMenuStore = defineStore('anylink-menu', () => {
  const activeMenu = ref('') // 当前激活的菜单组件名称

  // 设置当前激活的菜单
  const setActiveMenu = (menuName) => {
    activeMenu.value = menuName
  }

  return {
    activeMenu,
    setActiveMenu
  }
})
