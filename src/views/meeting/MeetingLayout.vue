<script setup>
import { onMounted } from 'vue'
import { useMessageStore } from '@/stores'

const messageData = useMessageStore()

onMounted(async () => {
  await messageData.loadSessionList()
})
</script>

<template>
  <h1>开发中，敬请期待！</h1>
</template>
