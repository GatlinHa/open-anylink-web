<script setup>
import { ref, computed } from 'vue'

const isVisible = ref(false)
const elementRef = ref()
const mouseX = ref(0)
const mouseY = ref(0)

const modalStyle = computed(() => {
  return {
    top: `${mouseY.value - 400}px`, // 400 is height if image
    left: `${mouseX.value}px`
  }
})

const clickListener = (e) => {
  if (!isVisible.value) return
  if (!elementRef.value?.contains(e.target)) {
    close()
  }
}

const close = () => {
  isVisible.value = false
  document.removeEventListener('click', clickListener)
}

const show = async (event) => {
  isVisible.value = true
  mouseX.value = event.clientX + 20 // 20px offset from mouse X
  mouseY.value = event.clientY

  document.removeEventListener('click', clickListener)
  setTimeout(() => {
    document.addEventListener('click', clickListener)
  }, 0)
}

defineExpose({ show })
</script>

<template>
  <div ref="elementRef" v-if="isVisible" class="modal" :style="modalStyle">
    <img src="@/assets/image/wxcard.jpg" alt="联系我们" />
  </div>
</template>

<style lang="scss" scoped>
.modal {
  position: fixed;
  z-index: 1000;
}

.modal img {
  height: 400px;
  border-radius: 8px;
}
</style>
