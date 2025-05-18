import msgReceive from '@/assets/audio/msgreceive.mp3'
import msgSend from '@/assets/audio/msgsend.mp3'
import { useUserStore } from '@/stores'
const userData = useUserStore()

let playMsgReceiveTimer
export const playMsgReceive = () => {
  if (!userData.user.newMsgTips) {
    return
  }
  clearTimeout(playMsgReceiveTimer)
  playMsgReceiveTimer = setTimeout(() => {
    const audio = new Audio(msgReceive)
    audio.play().catch(() => {
      // do nothing
    })
  }, 300)
}

let playMsgSendTimer
export const playMsgSend = () => {
  if (!userData.user.sendMsgTips) {
    return
  }

  clearTimeout(playMsgSendTimer)
  playMsgSendTimer = setTimeout(() => {
    const audio = new Audio(msgSend)
    audio.play().catch(() => {
      // do nothing
    })
  }, 300)
}
