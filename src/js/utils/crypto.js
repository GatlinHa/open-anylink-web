import CryptoJS from 'crypto-js'
import { userNonceService } from '@/api/user'

const FIXED_KEY = import.meta.env.VITE_FIXED_KEY

export const generateSign = (key, content) => {
  try {
    const hash = CryptoJS.HmacSHA256(content, key)
    return CryptoJS.enc.Base64.stringify(hash)
  } catch (e) {
    return null
  }
}

export const encryptPasswordObj = async (account, password) => {
  // 1. 获取随机字符串
  const res = await userNonceService({ account: account })
  const nonce = res.data.data.nonce

  // 2. 派生动态密钥
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(FIXED_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const dynamicKey = await crypto.subtle.sign('HMAC', baseKey, new TextEncoder().encode(nonce))

  // 3. 生成加密密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    dynamicKey.slice(0, 32), // 取前32字节作为AES-256密钥
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // 4. 生成随机IV（12字节）
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 5. 执行加密
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    cryptoKey,
    new TextEncoder().encode(password)
  )

  // 6. 分离密文和认证标签
  const ciphertext = encrypted.slice(0, encrypted.byteLength - 16)
  const authTag = encrypted.slice(encrypted.byteLength - 16)

  return {
    iv: arrayBufferToHex(iv),
    ciphertext: arrayBufferToHex(ciphertext),
    authTag: arrayBufferToHex(authTag)
  }
}

export const encryptDoublePasswordObj = async (account, oldPassword, newPassword) => {
  // 1. 获取随机字符串
  const res = await userNonceService({ account: account })
  const nonce = res.data.data.nonce

  // 2. 派生动态密钥
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(FIXED_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const dynamicKey = await crypto.subtle.sign('HMAC', baseKey, new TextEncoder().encode(nonce))

  // 3. 生成加密密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    dynamicKey.slice(0, 32), // 取前32字节作为AES-256密钥
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // 4. 生成随机IV（12字节）
  const oldIv = crypto.getRandomValues(new Uint8Array(12))
  const newIv = crypto.getRandomValues(new Uint8Array(12))

  // 5. 执行加密
  const oldEncrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: oldIv,
      tagLength: 128
    },
    cryptoKey,
    new TextEncoder().encode(oldPassword)
  )

  const newEncrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: newIv,
      tagLength: 128
    },
    cryptoKey,
    new TextEncoder().encode(newPassword)
  )

  // 6. 分离密文和认证标签
  const oldCiphertext = oldEncrypted.slice(0, oldEncrypted.byteLength - 16)
  const oldAuthTag = oldEncrypted.slice(oldEncrypted.byteLength - 16)

  const newCiphertext = newEncrypted.slice(0, newEncrypted.byteLength - 16)
  const newAuthTag = newEncrypted.slice(newEncrypted.byteLength - 16)

  return {
    oldPassword: {
      iv: arrayBufferToHex(oldIv),
      ciphertext: arrayBufferToHex(oldCiphertext),
      authTag: arrayBufferToHex(oldAuthTag)
    },
    newPassword: {
      iv: arrayBufferToHex(newIv),
      ciphertext: arrayBufferToHex(newCiphertext),
      authTag: arrayBufferToHex(newAuthTag)
    }
  }
}

const arrayBufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
