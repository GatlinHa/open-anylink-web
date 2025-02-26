import { ElMessage } from 'element-plus'

/**
 * 流控：在duration时间内只允许task任务被执行countLimit次
 * @param {*} task 待执行的任务Promise，可以是请求或者其他
 * @param {*} countLimit 控制数量
 * @param {*} duration 控制周期 ms
 * @returns
 */
export const flowLimiteWrapper = (task, countLimit, duration) => {
  let count = 0
  return async () => {
    if (count >= countLimit) {
      ElMessage.warning('请求太过频繁，请稍后再试')
      return Promise.reject(new Error('REQUEST_LIMITED')) // 返回一个拒绝的 Promise
    }

    count++
    setTimeout(() => {
      count--
    }, duration)

    // 执行任务并确保返回 Promise
    try {
      const result = await task()
      return Promise.resolve(result) // 原始任务可能是同步或异步的
    } catch (error) {
      return Promise.reject(error) // 捕获同步错误并转为 Promise 拒绝
    }
  }
}
