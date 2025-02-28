<script setup>
import contactListIcon from '@/assets/svg/contactList.svg'
import groupIcon from '@/assets/svg/group.svg'
import organizationIcon from '@/assets/svg/organization.svg'
import { onMounted } from 'vue'
import { messageStore } from '@/stores'

const messageData = messageStore()

onMounted(async () => {
  await messageData.loadSessionList()
})
</script>

<template>
  <el-container class="contactList">
    <el-header class="bdr-b">通讯录</el-header>
    <el-container class="el-container__body">
      <el-aside class="bdr-r">
        <el-menu :default-active="$route.meta.active_2" text-color="black" router>
          <el-menu-item index="/contactList/user">
            <contactListIcon></contactListIcon>
            <span>联系人</span>
          </el-menu-item>

          <el-menu-item index="/contactList/group">
            <groupIcon></groupIcon>
            <span>群组</span>
          </el-menu-item>

          <el-menu-item index="/contactList/organization">
            <organizationIcon></organizationIcon>
            <span>组织</span>
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
.contactList {
  height: 100%;
}

.el-header {
  width: 100%;
  height: 60px;
  line-height: 60px;
  padding-left: 15px;
  font-size: 18px;
}

.el-container__body {
  height: calc(100vh - 60px);
}

.el-aside {
  width: 130px;
  height: 100%;
  padding: 8px;
}

.el-menu {
  --el-menu-bg-color: #f5f5f5; // 这个是控制整个菜单的背景色，不是某个菜单选项
  border: 0;
}

.el-menu-item {
  border-radius: 8px;
  margin-bottom: 5px;

  &:hover {
    background-color: #dedfe0;
  }
}

.is-active {
  --fillColor: #409eff; // 与el-menu-item的active-text-color默认颜色保持一致
  background-color: #dedfe0; // 这个是控制被选中菜单的背景色
  //文字颜色默认是#409eff，可以用color修改
}

.svg-icon {
  width: 20px;
  height: 20px;
  fill: var(--fillColor);
  margin-right: 8px;
  transition: fill var(--el-transition-duration); //过度时长沿用el-menu-item的
}
</style>
