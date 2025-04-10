import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  msgUpdateSessionService,
  msgChatSessionListService,
  msgQueryPartitionService
} from '@/api/message'
import { ElMessage } from 'element-plus'
import { useImageStore, useAudioStore, useVideoStore, useDocumentStore } from '@/stores'

// 消息功能相关需要缓存的数据，不持久化存储
export const useMessageStore = defineStore('anylink-message', () => {
  /**
   * message页面当前被选中的sessionId
   */
  const selectedSessionId = ref('')

  const setSelectedSessionId = (id) => {
    selectedSessionId.value = id
  }

  /**
   * 会话列表
   * 格式：{sessionId_1: session_1, sessionId_2: session_2, ...}
   */
  const sessionList = ref({})

  /**
   * 会话消息，双层key-value结构，方便随机查找
   * 格式：
   * {
   *   sessionId_1: {
   *     msgKey_1: {msgId: msgId_1, fromId: xxx,...}, //msgKey取自msgId，msgId在发消息之后会更新，但msgKey不会
   *     msgKey_2: {msgId: msgId_2, fromId: xxx,...},
   *     ...
   *   }
   *   sessionId_2: {
   *     msgKey_a: {msgId: msgId_a, fromId: xxx,...},
   *     msgKey_b: {msgId: msgId_b, fromId: xxx,...},
   *     ...
   *   }
   *   ...
   * }
   */
  const msgRecordsList = ref({})

  /**
   * sessionList中同一会话下的msgKey排序后的数组
   * 格式：
   * {
   *   sessionId_1: [msgKey_1, msgKey_2...],
   *   sessionId_2: [msgKey_a, msgKey_b...]
   *   ...
   * }
   */
  const msgKeySortedArray = ref({})

  const addSession = (session) => {
    sessionList.value[session.sessionId] = session
  }

  const deleteSession = (sessionId) => {
    delete sessionList.value[sessionId]
  }

  const updateSession = async (obj) => {
    let params = { sessionId: obj.sessionId }
    let flag = false // 是否需要更新云端的数据
    if ('top' in obj) {
      params.top = obj.top
      flag = true
    }
    if ('dnd' in obj) {
      params.dnd = obj.dnd
      flag = true
    }
    // 注意,这里draft允许为""空串,有实际意义
    if ('draft' in obj && sessionList.value[obj.sessionId].draft !== obj.draft) {
      params.draft = obj.draft
      flag = true
    }
    if ('mark' in obj) {
      params.mark = obj.mark
      flag = true
    }
    if ('partitionId' in obj) {
      params.partitionId = obj.partitionId
      flag = true
    }

    const mySession = sessionList.value[obj.sessionId]
    if ('unreadCount' in obj) mySession.unreadCount = obj.unreadCount
    if ('remoteRead' in obj) mySession.remoteRead = obj.remoteRead
    if ('readMsgId' in obj) mySession.readMsgId = obj.readMsgId
    if ('readTime' in obj) mySession.readTime = obj.readTime
    if ('pullMsgDone' in obj) mySession.pullMsgDone = obj.pullMsgDone
    if ('objectInfo' in obj) mySession.objectInfo = obj.objectInfo

    if (flag) {
      //TODO 这里可以加一个loading遮罩效果
      const res = await msgUpdateSessionService(params)
      // 云端更新成功再更新本地，保持数据同步
      if (res.data.code === 0) {
        if ('top' in obj) mySession.top = obj.top
        if ('dnd' in obj) mySession.dnd = obj.dnd
        if ('draft' in obj) mySession.draft = obj.draft
        if ('mark' in obj) {
          mySession.mark = obj.mark
          ElMessage.success('保存成功')
        }
        if ('partitionId' in obj) {
          mySession.partitionId = obj.partitionId
          ElMessage.success('保存成功')
        }
      }
    }
  }

  /**
   * 预加载消息中的媒体资源
   * @param {*} sessionId
   * @param {*} msgRecords
   */
  const preloadResource = async (msgRecords) => {
    await useImageStore().preloadImage(msgRecords)
    await useAudioStore().preloadAudio(msgRecords)
    await useVideoStore().preloadVideo(msgRecords)
    await useDocumentStore().preloadDocument(msgRecords)
  }

  /**
   * 更新msgKey排序
   * @param {*} sessionId 会话id
   */
  const updateMsgKeySort = (sessionId) => {
    // 更新排序
    const msgs = msgRecordsList.value[sessionId]
    const array = Object.keys(msgs).sort((a, b) => {
      const timeA = new Date(msgs[a].sendTime || msgs[a].msgTime).getTime()
      const timeB = new Date(msgs[b].sendTime || msgs[b].msgTime).getTime()
      return timeA - timeB
    })
    msgKeySortedArray.value[sessionId] = array
  }

  /**
   * 对话列表中加入新的消息数组（预加载资源）
   * @param {*} sessionId 会话id
   * @param {*} msgRecords 新的消息数组
   */
  const addMsgRecords = (sessionId, msgRecords) => {
    if (!msgRecords?.length) return
    msgRecords.forEach((item) => {
      if (!msgRecordsList.value[sessionId]) {
        msgRecordsList.value[sessionId] = ref({})
      }
      msgRecordsList.value[sessionId][item.msgId] = ref(item)
    })
  }

  /**
   * 移除某个消息：消息已发出后，用正式消息替换temp消息场景
   * @param {*} sessionId 会话id
   * @param {*} msgKey 消息id
   */
  const removeMsgRecord = (sessionId, msgKey) => {
    if (msgRecordsList.value[sessionId] && msgKey in msgRecordsList.value[sessionId]) {
      delete msgRecordsList.value[sessionId][msgKey]
    }
  }

  const getMsg = (sessionId, msgKey) => {
    if (!msgRecordsList.value[sessionId] || !msgRecordsList.value[sessionId][msgKey]) {
      return ref({})
    }
    return msgRecordsList.value[sessionId][msgKey]
  }

  const updateMsg = (sessionId, msgKey, obj) => {
    if (!msgRecordsList.value[sessionId] || !msgRecordsList.value[sessionId][msgKey]) {
      return
    }

    if ('msgId' in obj) msgRecordsList.value[sessionId][msgKey].msgId = obj.msgId
    if ('status' in obj) msgRecordsList.value[sessionId][msgKey].status = obj.status
    if ('msgTime' in obj) msgRecordsList.value[sessionId][msgKey].msgTime = obj.msgTime
    if ('sendTime' in obj) msgRecordsList.value[sessionId][msgKey].sendTime = obj.sendTime
    updateMsgKeySort(sessionId)
  }

  const totalUnReadCount = computed(() => {
    return Object.values(sessionList.value).reduce(
      (sum, item) => (item?.unreadCount ? sum + item.unreadCount : sum),
      0
    )
  })

  const el = document.getElementsByTagName('title')[0]
  const title = import.meta.env.VITE_TITLE
  let task = null
  watch(
    () => totalUnReadCount.value,
    (newValue) => {
      if (totalUnReadCount.value > 0) {
        const newTitle = `您有(${newValue > 99 ? '99+' : newValue})条未读消息!`
        clearInterval(task)
        task = setInterval(() => {
          el.innerText = el.innerText === title ? newTitle : title
        }, 1000)
      } else {
        clearInterval(task)
        el.innerText = title
      }
    }
  )

  const clear = () => {
    selectedSessionId.value = ''
    sessionList.value = {}
    msgRecordsList.value = {}
    partitions.value = {}
  }

  /**
   * 分组信息
   */
  const partitions = ref({})
  /**
   * 是否已经加载过分组信息
   */
  const isPartitionsLoaded = ref(false)

  /**
   * 加载会话列表
   * @returns
   */
  const loadSessionList = async () => {
    if (!Object.keys(sessionList.value).length) {
      const res = await msgChatSessionListService()
      Object.keys(res.data.data).forEach(async (item) => {
        addSession(res.data.data[item].session)
        const msgList = res.data.data[item].msgList
        if (msgList) {
          await preloadResource(msgList)
          addMsgRecords(item, msgList)
          updateMsgKeySort(item)
        }
      })
    }
  }

  /**
   * 加载分组信息
   * @returns
   */
  const loadPartitions = async () => {
    // 如果已经加载过，直接返回
    if (isPartitionsLoaded.value) {
      return
    }

    if (Object.keys(partitions.value).length === 0) {
      const res = await msgQueryPartitionService()
      res.data.data.forEach((item) => {
        partitions.value[item.partitionId] = item
      })
      // 标记为已加载
      isPartitionsLoaded.value = true
    }
  }

  const addPartition = (obj) => {
    partitions.value[obj.partitionId] = obj
  }

  const removePartition = (partitionId) => {
    delete partitions.value[partitionId]
  }

  return {
    selectedSessionId,
    setSelectedSessionId,
    sessionList,
    addSession,
    deleteSession,
    updateSession,
    loadSessionList,

    msgRecordsList,
    msgKeySortedArray,
    preloadResource,
    updateMsgKeySort,
    addMsgRecords,
    removeMsgRecord,
    getMsg,
    updateMsg,

    partitions,
    loadPartitions,
    addPartition,
    removePartition,

    clear
  }
})
