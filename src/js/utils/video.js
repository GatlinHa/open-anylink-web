export const prehandleVideo = async (blob) => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      })
    }

    video.onerror = () => {
      reject(new Error('视频文件元数据加载失败'))
    }

    video.src = url
  })
}
