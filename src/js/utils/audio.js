import msgReceive from '@/assets/audio/msgreceive.mp3'
import msgSend from '@/assets/audio/msgsend.mp3'
import { userStore } from '@/stores'
const userData = userStore()

export const playMsgReceive = () => {
  if (!userData.user.newMsgTips) {
    return
  }
  const audio = new Audio(msgReceive)
  audio.play().catch(() => {
    // do nothing
  })
}

export const playMsgSend = () => {
  if (!userData.user.sendMsgTips) {
    return
  }
  const audio = new Audio(msgSend)
  audio.play().catch(() => {
    // do nothing
  })
}
