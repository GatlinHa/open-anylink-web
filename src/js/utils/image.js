import { THUMB_IMAGE_MAX } from '@/const/mtsConst'

/**
 * 生成缩略图
 * @param {*}
 * @returns 缩略图file对象，原图宽高，缩略图宽高
 */
export const prehandleImage = async (blob, originalWidth = null, originalHeight = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onload = () => {
      const img = new Image()
      img.src = reader.result
      img.onload = () => {
        let width = originalWidth !== null ? originalWidth : img.width
        let height = originalHeight !== null ? originalHeight : img.height
        let thumbWidth = img.width
        let thumbHeight = img.height

        if (blob.size <= THUMB_IMAGE_MAX) {
          resolve({
            blob,
            originWidth: width,
            originHeight: height,
            thumbWidth,
            thumbHeight
          })
        }

        let accuracy = getAccuracy(blob.size)
        const scaleRatio = Math.sqrt(accuracy) // 根据 accuracy的平方根 计算缩放比例
        // 等比率缩放宽高
        thumbWidth = Math.floor(thumbWidth * scaleRatio)
        thumbHeight = Math.floor(thumbHeight * scaleRatio)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = thumbWidth
        canvas.height = thumbHeight
        ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight)

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              if (blob.size <= THUMB_IMAGE_MAX) {
                const thumbFile = new File([blob], blob.name, {
                  type: blob.type
                })
                resolve({
                  thumbFile,
                  originWidth: width,
                  originHeight: height,
                  thumbWidth,
                  thumbHeight
                })
              } else {
                const result = await prehandleImage(blob, width, height)
                resolve(result)
              }
            } else {
              reject(new Error('生成缩略图遇到了问题'))
            }
          },
          blob.type,
          accuracy
        )
      }
      img.onerror = () => {
        reject(new Error('加载图片失败'))
      }
    }
    reader.onerror = () => {
      reject(new Error('读取图片失败'))
    }
  })
}

// 自动调节精度(经验数值)
function getAccuracy(size) {
  let accuracy
  if (size < 1024 * 1024) {
    accuracy = 0.6
  } else if (size < 2047 * 1024) {
    accuracy = 0.5
  } else if (size < 3275 * 1024) {
    accuracy = 0.45
  } else {
    accuracy = 0.4
  }
  return accuracy
}
