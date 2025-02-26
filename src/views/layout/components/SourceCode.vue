<script setup>
import { ref } from 'vue'
import githubIcon from '@/assets/svg/github.svg'
import giteeIcon from '@/assets/svg/gitee.svg'

const isVisible = ref(false)

const tableData = [
  {
    project: '服务端',
    githubUrl: 'https://github.com/GatlinHa/open-anylink',
    giteeUrl: 'https://gitee.com/lijingbo-2021/open-anylink'
  },
  {
    project: 'Web端',
    githubUrl: 'https://github.com/GatlinHa/open-anylink-web',
    giteeUrl: 'https://gitee.com/lijingbo-2021/open-anylink-web'
  }
]

const show = () => {
  isVisible.value = true
}

defineExpose({ show })
</script>

<template>
  <el-dialog title="源码地址" v-model="isVisible" width="400" top="40vh">
    <el-table :data="tableData" stripe size="small" style="font-size: 14px">
      <el-table-column prop="project" label="项目" width="100"></el-table-column>
      <el-table-column prop="githubUrl">
        <template #header>
          <div class="column-header">
            <githubIcon></githubIcon>
            <span>github</span>
          </div>
        </template>
        <template #default="scope">
          <a :href="scope.row.githubUrl" target="_blank">链接</a>
        </template>
      </el-table-column>
      <el-table-column prop="giteeUrl">
        <template #header>
          <div class="column-header">
            <giteeIcon></giteeIcon>
            <span>gitee</span>
          </div>
        </template>
        <template #default="scope">
          <a :href="scope.row.giteeUrl" target="_blank">链接</a>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<style lang="scss" scoped>
.svg-icon {
  width: 20px;
  height: 20px;
}

.column-header {
  display: flex;
  align-items: center;
}
</style>
