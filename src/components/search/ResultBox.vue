<script setup>
import HashNoData from '@/components/common/HasNoData.vue'
import ContactItem from '@/components/item/ContactItem.vue'
import GroupItem from '@/components/item/GroupItem.vue'
import { useSearchStore } from '@/stores'

const props = defineProps(['searchTab', 'keyWords'])
const emit = defineEmits(['showContactCard', 'showGroupCard', 'openSession'])

const searchData = useSearchStore()

const onShowContactCard = (contactInfo) => {
  emit('showContactCard', contactInfo)
}

const onShowGroupCard = (groupInfo) => {
  emit('showGroupCard', groupInfo)
}

const onOpenSession = (obj) => {
  emit('openSession', obj)
}
</script>

<template>
  <div class="result-box my-scrollbar">
    <div v-if="searchTab === 'contact' && searchData.curContactResult.length">
      <ContactItem
        v-for="item in searchData.curContactResult"
        :key="item.account"
        :contactInfo="item"
        :keyWords="props.keyWords"
        @showContactCard="onShowContactCard"
        @openSession="onOpenSession"
      ></ContactItem>
    </div>
    <div v-else-if="props.searchTab === 'group' && searchData.curGroupResult.length">
      <GroupItem
        v-for="item in searchData.curGroupResult"
        :key="item.groupId"
        :groupInfo="item"
        :keyWords="props.keyWords"
        @showGroupCard="onShowGroupCard"
        @openSession="onOpenSession"
      ></GroupItem>
    </div>
    <div
      v-else-if="props.searchTab === 'organization' && searchData.curOrganizationResult.length"
    ></div>
    <div v-else-if="props.searchTab === 'hisotry' && searchData.curHisotryResult.length"></div>
    <div v-else-if="props.searchTab === 'todo' && searchData.curTodoResult.length"></div>
    <HashNoData v-else></HashNoData>
  </div>
</template>

<style lang="scss" scoped>
.result-box {
  height: 100%;
  margin: 10px;
  overflow-x: hidden;
  overflow-y: auto;
}

.contact-item:hover {
  background-color: #c6e2ff;
}

.group-item:hover {
  background-color: #c6e2ff;
}

// 全局样式是hover才能看到滑块，这里需要一直显示滑块
.my-scrollbar {
  &::-webkit-scrollbar-thumb {
    background-color: #409eff;
  }
}
</style>
