import request from '@/js/utils/request'

export const mtsUploadServiceForImage = async (requestBody, { originFile, thumbFile }) => {
  const res = await request.postForm('/mts/getUploadUrl', requestBody)
  const scope = res.data.data.scope
  const objectId = res.data.data.objectId
  const originUrl = res.data.data.originUrl
  const thumbUrl = res.data.data.thumbUrl
  if (scope === 1 && originUrl && thumbUrl) {
    // 如果文件之前已经上传过，直接获取下载地址
    return res
  } else {
    const uploadOriginUrl = res.data.data.uploadOriginUrl
    const uploadThumbUrl = res.data.data.uploadThumbUrl
    // 2 上传原图
    const originResponse = await fetch(uploadOriginUrl, {
      method: 'PUT',
      body: originFile,
      headers: {
        'Content-Type': originFile.type || 'application/octet-stream' // 设置 Content-Type
      }
    })

    if (!originResponse.ok) {
      throw new Error('原图上传失败')
    }

    // 3 上传缩略图，如果原图和缩略图一样，就不上传
    if (uploadThumbUrl !== uploadOriginUrl) {
      const thumbResponse = await fetch(uploadThumbUrl, {
        method: 'PUT',
        body: thumbFile,
        headers: {
          'Content-Type': thumbFile.type || 'application/octet-stream' // 设置 Content-Type
        }
      })

      if (!thumbResponse.ok) {
        throw new Error('缩略图上传失败')
      }
    }

    // 4 上报服务端上传成功，服务端返回预签名下载URL
    const reportResponse = await request.postForm('/mts/reportUploaded', { objectId })
    return reportResponse
  }
}

export const mtsUploadService = async (requestBody, { originFile }) => {
  // 1 获取上传的预签名URL
  const res = await request.postForm('/mts/getUploadUrl', requestBody)
  const scope = res.data.data.scope
  const objectId = res.data.data.objectId
  const downloadUrl = res.data.data.downloadUrl
  if (scope === 1 && downloadUrl) {
    // 如果文件之前已经上传过，直接过的下载地址
    return res
  } else {
    const uploadUrl = res.data.data.uploadUrl
    // 2 上传文件
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: originFile,
      headers: {
        'Content-Type': originFile.type || 'application/octet-stream' // 设置 Content-Type
      }
    })

    if (!uploadResponse.ok) {
      throw new Error('文件上传失败')
    }

    // 3 上报服务端上传成功，服务端返回预签名下载URL
    const reportResponse = await request.postForm('/mts/reportUploaded', { objectId })
    return reportResponse
  }
}

export const mtsImageService = (obj) => {
  return request.get('/mts/image', { params: obj })
}

export const mtsAudioService = (obj) => {
  return request.get('/mts/audio', { params: obj })
}

export const mtsVideoService = (obj) => {
  return request.get('/mts/video', { params: obj })
}

export const mtsDocumentService = (obj) => {
  return request.get('/mts/document', { params: obj })
}
