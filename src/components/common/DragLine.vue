<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const props = defineProps({
  direction: { type: String },
  min: { type: Number },
  max: { type: Number },
  originSize: { type: Number }
})
const emit = defineEmits(['dragUpdate'])

const dragData = ref({ status: false, pageX: 0, pageY: 0, width: 0, height: 0 })
const dragRef = ref()

const onMouseUp = () => {
  dragData.value.status = false
}

const onMouseDown = (e) => {
  dragData.value = {
    status: true,
    pageX: e.pageX,
    pageY: e.pageY,
    width: ['left', 'right'].includes(props.direction) ? props.originSize : 0,
    height: ['left', 'right'].includes(props.direction) ? 0 : props.originSize
  }
}

const onMouseMove = (e) => {
  if (!dragData.value.status) return

  let width,
    height = 0
  switch (props.direction) {
    case 'left':
      width = dragData.value.width + dragData.value.pageX - e.pageX
      break
    case 'right':
      width = dragData.value.width + e.pageX - dragData.value.pageX
      break
    case 'top':
      height = dragData.value.height + dragData.value.pageY - e.pageY
      break
    case 'bottom':
      height = dragData.value.height + e.pageY - dragData.value.pageY
      break
  }

  if (width < props.min) width = props.min
  if (width > props.max) width = props.max
  if (height < props.min) height = props.min
  if (height > props.max) height = props.max

  emit('dragUpdate', { width: width, height: height })
}

onMounted(() => {
  dragRef.value.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <div
    class="drag-line"
    :class="['drag-line-' + props.direction, { drag_resizing: dragData.status }]"
    ref="dragRef"
  ></div>
</template>

<style lang="scss" scoped>
.drag-line {
  position: absolute;
  cursor: col-resize;
  transition: all 0.3s;

  &:hover,
  &.drag_resizing {
    background-color: #409eff;
  }

  &.drag-line-top {
    top: 0;
    left: 0;
    height: 2px;
    width: 100%;
    cursor: row-resize;
  }

  &.drag-line-bottom {
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    cursor: row-resize;
  }

  &.drag-line-left {
    left: 0;
    top: 0;
    width: 2px;
    height: 100%;
  }

  &.drag-line-right {
    right: 0;
    top: 0;
    width: 2px;
    height: 100%;
  }
}
</style>
