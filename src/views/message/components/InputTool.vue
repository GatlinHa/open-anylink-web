<script setup>
const props = defineProps(['tips'])
</script>

<template>
  <div class="tool-icon-wrapper" :title="props.tips">
    <el-icon class="tool-icon" :size="20">
      <slot name="iconSlot"></slot>
    </el-icon>
  </div>
</template>

<style lang="scss" scoped>
.tool-icon-wrapper {
  width: 30px;
  height: 30px;
  padding: 5px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  &:hover {
    background-color: #c6e2ff;
  }
}
</style>
