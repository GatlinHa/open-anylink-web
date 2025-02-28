import msgReceive from '@/assets/audio/msgreceive.mp3'
import msgSend from '@/assets/audio/msgsend.mp3'

export const playMsgReceive = () => {
  const audio = new Audio(msgReceive)
  audio.play().catch(() => {
    // do nothing
  })
}

export const playMsgSend = () => {
  const audio = new Audio(msgSend)
  audio.play().catch(() => {
    // do nothing
  })
}
