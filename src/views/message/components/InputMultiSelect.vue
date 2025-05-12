<script setup>
import { onMounted, onUnmounted } from 'vue'
import ForwardIcon from '@/assets/svg/forward.svg'
import ForwardoboIcon from '@/assets/svg/forwardobo.svg'
import DeletemsgIcon from '@/assets/svg/deletemsg.svg'
import CancleIcon from '@/assets/svg/cancle.svg'
import { ElMessageBox } from 'element-plus'

const props = defineProps(['selectedCount'])
const emit = defineEmits(['exit', 'forwardTogether', 'forwardOneByOne', 'batchDelete'])

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    cancel()
  }
}

const cancel = () => {
  emit('exit')
}

defineExpose({ cancel })

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const handleForwardTogether = () => {
  if (props.selectedCount > 0) {
    emit('forwardTogether')
  }
}

const handleForwardOneByOne = () => {
  if (props.selectedCount > 0) {
    emit('forwardOneByOne')
  }
}

const handleBatchDelete = () => {
  if (props.selectedCount > 0) {
    ElMessageBox.confirm(`确定删除选中的消息记录吗？`, '温馨提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    }).then(() => {
      emit('batchDelete')
    })
  }
}
</script>

<template>
  <div class="input-multi-select">
    <span class="selected-count">已选中：{{ props.selectedCount || 0 }}条消息</span>
    <div class="multi-select-funtions">
      <div class="function-item">
        <div class="fun-icon" @click="handleForwardTogether">
          <ForwardIcon></ForwardIcon>
        </div>
        <span>合并转发</span>
      </div>
      <div class="function-item">
        <div class="fun-icon" @click="handleForwardOneByOne">
          <ForwardoboIcon style="width: 20px; height: 20px"></ForwardoboIcon>
        </div>
        <span>逐条转发</span>
      </div>
      <div class="function-item">
        <div class="fun-icon" @click="handleBatchDelete">
          <DeletemsgIcon></DeletemsgIcon>
        </div>
        <span>批量删除</span>
      </div>
      <div class="function-item">
        <div class="fun-icon" @click="cancel">
          <CancleIcon></CancleIcon>
        </div>
        <span>取消</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.input-multi-select {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  font-size: 14px;
  color: gray;

  .multi-select-funtions {
    display: flex;
    gap: 24px;

    .function-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;

      .fun-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background-color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
          background-color: #409eff;
        }
      }
    }
  }
}

.svg-icon {
  width: 24px;
  height: 24px;
  // fill: gray;
}
</style>
