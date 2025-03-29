<script setup>
import { onMounted } from 'vue'
import { User, Key, Bell } from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores'

const messageData = useMessageStore()

onMounted(async () => {
  await messageData.loadSessionList()
})
</script>

<template>
  <el-container class="setting-layout">
    <el-header class="bdr-b">我的设置</el-header>
    <el-container class="el-container__body">
      <el-aside class="bdr-r body" width="200px">
        <el-menu :default-active="$route.path" text-color="black" style="border: 0" router>
          <el-menu-item index="/setting/personal">
            <el-icon><User /></el-icon>
            <span>个人设置</span>
          </el-menu-item>

          <el-menu-item index="/setting/security">
            <el-icon><Key /></el-icon>
            <span>安全设置</span>
          </el-menu-item>
          <el-menu-item index="/setting/notify">
            <el-icon><Bell /></el-icon>
            <span>通知设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main style="padding: 0">
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.setting-layout {
  height: 100%;
}

.el-header {
  width: 100%;
  height: 60px;
  line-height: 60px;
  padding-left: 15px;
  font-size: 18px;
}

.el-aside {
  width: 150px;
  height: 100%;
  padding: 8px;
}

.el-menu {
  --el-menu-bg-color: #f5f5f5; // 这个是控制整个菜单的背景色，不是某个菜单选项
}

.el-menu-item {
  border-radius: 8px;
  margin-bottom: 5px;

  &:hover {
    background-color: #dedfe0;
  }
}

.is-active {
  background-color: #dedfe0;
  //文字颜色默认是#409eff，可以用color修改
}
</style>
