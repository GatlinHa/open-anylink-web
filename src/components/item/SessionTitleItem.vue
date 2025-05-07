<script setup>
import { computed } from 'vue'
import UserAvatarIcon from '@/components/common/UserAvatarIcon.vue'
import GroupAvatarIcon from '@/components/common/GroupAvatarIcon.vue'
import { MsgType } from '@/proto/msg'
import { useGroupStore } from '@/stores'
import { highLightedText } from '@/js/utils/common'

/**
 * objectInfo：对象详情
 * keyWords：搜索关键字，用于高亮显示检索的关键字
 */
const props = defineProps(['session', 'keyWords'])
const emit = defineEmits(['showUserCard', 'showGroupCard'])

const groupData = useGroupStore()

const showName = computed(() => {
  let name = ''
  if (props.session.sessionType === MsgType.CHAT) {
    name = props.session.objectInfo.nickName
  } else if (props.session.sessionType === MsgType.GROUP_CHAT) {
    name = props.session.objectInfo.groupName
  } else {
    return ''
  }

  return props.session.mark ? `${props.session.mark}(${name})` : name
})

const showId = computed(() => {
  if (props.session.sessionType === MsgType.CHAT) {
    return props.session.objectInfo.account
  } else if (props.session.sessionType === MsgType.GROUP_CHAT) {
    return props.session.objectInfo.groupId
  } else {
    return ''
  }
})

const onShowUserCard = (e) => {
  e.preventDefault()
  emit('showUserCard', showId.value)
}

const onShowGroupCard = (e) => {
  e.preventDefault()
  emit('showGroupCard', showId.value)
}
</script>

<template>
  <div class="session-wrapper">
    <div v-if="props.session.sessionType === MsgType.CHAT" class="user-session">
      <UserAvatarIcon
        class="user-session-avatar"
        :showName="showName"
        :showId="showId"
        :showAvatarThumb="props.session.objectInfo.avatarThumb"
        :size="'small'"
        @click="onShowUserCard"
      ></UserAvatarIcon>
      <div class="user-session-info">
        <span
          class="name text-ellipsis"
          :title="showName"
          v-html="highLightedText(showName, props.keyWords, '#409eff')"
        >
        </span>
        <span
          class="id"
          :title="showId"
          v-html="highLightedText(showId, props.keyWords, '#409eff', 'full')"
        >
        </span>
      </div>
    </div>
    <div v-else-if="props.session.sessionType === MsgType.GROUP_CHAT" class="group-session">
      <GroupAvatarIcon
        class="group-session-avatar"
        :avatarThumb="groupData.groupInfoList[props.session.objectInfo.groupId].avatarThumb"
        :size="'small'"
        @click="onShowGroupCard"
      ></GroupAvatarIcon>
      <div class="group-session-info">
        <span
          class="name text-ellipsis"
          :title="showName"
          v-html="highLightedText(showName, props.keyWords, '#409eff')"
        >
        </span>
        <span
          class="id"
          :title="showId"
          v-html="highLightedText(showId, props.keyWords, '#409eff', 'full')"
        >
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.session-wrapper {
  padding: 2px 0 2px 5px;

  .user-session {
    display: flex;
    gap: 5px;

    .user-session-info {
      max-width: 165px;
      display: flex;
      align-items: center;
      gap: 5px;
      user-select: text;

      .id {
        font-size: 12px;
      }
    }
  }

  .group-session {
    display: flex;
    gap: 5px;

    .group-session-info {
      max-width: 165px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      user-select: text;

      .id {
        font-size: 12px;
      }
    }
  }
}
</style>
