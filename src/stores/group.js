import { defineStore } from 'pinia'
import { ref } from 'vue'
import { groupInfoListService } from '@/api/group'

// group群组相关的缓存数据，不持久化存储
export const useGroupStore = defineStore('anylink-group', () => {
  /**
   * 和我有关的所有群组，格式：{groupId_1: groupInfo_1, groupId_2: groupInfo_2}
   */
  const groupInfoList = ref({})

  /**
   * 群组成员，格式：双层对象结构，编译数据检索，第一层的key是groupId，第二层的key是account
   * {groupId_1: [accoount1: {accoount: xx, nickName: xx,...}, ...], groupId_2: {...}}
   */
  const groupMembersList = ref({})

  /**
   * 获取有效的成员数组，意思是刨除inStatus不等于0的
   * @param {*} groupId
   */
  const getValidGroupMembers = (groupId) => {
    const data = {}
    const membersArray = Object.values(groupMembersList.value[groupId] || {})
    for (let index = 0; index < membersArray.length; index++) {
      const item = membersArray[index]
      if (item.inStatus === 0) {
        data[item.account] = item
      }
    }
    return data
  }

  const setGroupInfo = ({ groupId, groupInfo }) => {
    groupInfoList.value[groupId] = groupInfo
  }

  const setGroupMembers = ({ groupId, members }) => {
    groupMembersList.value[groupId] = members
  }

  const setOneOfGroupMembers = ({ groupId, account, userInfo }) => {
    groupMembersList.value[groupId][account] = userInfo
  }

  const deleteGroup = (groupId) => {
    delete groupInfoList.value[groupId]
    delete groupMembersList.value[groupId]
  }

  const loadGroupInfoList = async () => {
    if (Object.keys(groupInfoList.value).length === 0) {
      const res = await groupInfoListService()
      res.data.data?.forEach((item) => {
        groupInfoList.value[item.groupId] = item
      })
    }
  }

  return {
    groupInfoList,
    groupMembersList,
    getValidGroupMembers,
    setGroupInfo,
    setGroupMembers,
    setOneOfGroupMembers,
    deleteGroup,
    loadGroupInfoList
  }
})
