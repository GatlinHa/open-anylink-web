import CryptoJS from 'crypto-js'

export const getMd5 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = (e) => {
      const arrayBuffer = e.target.result
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
      const md5 = CryptoJS.MD5(wordArray).toString()
      resolve(md5)
    }
    reader.onerror = () => {
      reject(new Error('Failed to get md5 of file.'))
    }
  })
}
