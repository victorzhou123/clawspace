import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 特殊的存储 key，不会被 clearStorage 清除
const STORAGE_KEY_MESSAGE_COUNT = '__message_count__'
const STORAGE_KEY_PREMIUM_STATUS = '__premium_status__'
const STORAGE_KEY_TRANSACTION_ID = '__transaction_id__'

// 免费用户限制
const FREE_MESSAGE_LIMIT = 6
const FREE_SESSION_LIMIT = 3

export const usePaywallStore = defineStore('paywall', () => {
  // 是否为高级用户
  const isPremium = ref<boolean>(uni.getStorageSync(STORAGE_KEY_PREMIUM_STATUS) || false)

  // 消息计数
  const messageCount = ref<number>(uni.getStorageSync(STORAGE_KEY_MESSAGE_COUNT) || 0)

  // 交易ID（原始订单号）
  const transactionId = ref<string>(uni.getStorageSync(STORAGE_KEY_TRANSACTION_ID) || '')

  // 是否正在购买
  const isPurchasing = ref(false)

  // 是否正在恢复购买
  const isRestoring = ref(false)

  // 计算属性：是否达到消息限制
  const isMessageLimitReached = computed(() => {
    return !isPremium.value && messageCount.value >= FREE_MESSAGE_LIMIT
  })

  // 计算属性：剩余消息数
  const remainingMessages = computed(() => {
    if (isPremium.value) return Infinity
    return Math.max(0, FREE_MESSAGE_LIMIT - messageCount.value)
  })

  // 增加消息计数
  function incrementMessageCount() {
    if (isPremium.value) return

    messageCount.value++
    uni.setStorageSync(STORAGE_KEY_MESSAGE_COUNT, messageCount.value)
  }

  // 检查是否可以发送消息（第7条时返回 false）
  function canSendMessage(): boolean {
    if (isPremium.value) return true
    return messageCount.value < FREE_MESSAGE_LIMIT
  }

  // 设置高级用户状态
  function setPremiumStatus(status: boolean, txId?: string) {
    isPremium.value = status
    uni.setStorageSync(STORAGE_KEY_PREMIUM_STATUS, status)

    if (txId) {
      transactionId.value = txId
      uni.setStorageSync(STORAGE_KEY_TRANSACTION_ID, txId)
    }
  }

  // 购买产品
  async function purchase(): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      isPurchasing.value = true

      // #ifdef APP-PLUS
      // @ts-ignore
      plus.payment.getChannels((channels: any[]) => {
        const iapChannel = channels.find((c: any) => c.id === 'appleiap')

        if (!iapChannel) {
          isPurchasing.value = false
          uni.showToast({ title: '不支持 IAP 支付', icon: 'none' })
          resolve({ success: false, message: '不支持 IAP 支付' })
          return
        }

        // @ts-ignore
        plus.payment.request(iapChannel, {
          productid: 'clawspace.fulltime.access'
        }, async (result: any) => {
          console.log('购买成功', result)

          const receipt = result.receipt || ''
          const txId = result.transactionIdentifier || ''

          // 调用云函数验证收据
          try {
            const cloudResult = await uniCloud.callFunction({
              name: 'verify-receipt',
              data: {
                receipt,
                transactionId: txId,
                productId: 'clawspace.fulltime.access'
              }
            })

            const data = cloudResult.result as any

            if (data.success) {
              setPremiumStatus(true, data.originalTransactionId)
              isPurchasing.value = false
              uni.showToast({ title: '购买成功', icon: 'success' })
              resolve({ success: true })
            } else {
              isPurchasing.value = false
              uni.showToast({ title: data.message || '验证失败', icon: 'none' })
              resolve({ success: false, message: data.message })
            }
          } catch (error: any) {
            console.error('云函数调用失败', error)
            isPurchasing.value = false
            uni.showToast({ title: '验证失败，请稍后重试', icon: 'none' })
            resolve({ success: false, message: error.message })
          }
        }, (err: any) => {
          console.error('购买失败', err)
          isPurchasing.value = false

          if (err.code === -2) {
            uni.showToast({ title: '已取消', icon: 'none' })
            resolve({ success: false, message: '已取消' })
          } else {
            uni.showToast({ title: err.message || '购买失败', icon: 'none' })
            resolve({ success: false, message: err.message })
          }
        })
      }, (err: any) => {
        console.error('获取支付通道失败', err)
        isPurchasing.value = false
        uni.showToast({ title: '获取支付通道失败', icon: 'none' })
        resolve({ success: false, message: '获取支付通道失败' })
      })
      // #endif

      // #ifndef APP-PLUS
      isPurchasing.value = false
      uni.showToast({ title: '仅支持 APP 环境', icon: 'none' })
      resolve({ success: false, message: '仅支持 APP 环境' })
      // #endif
    })
  }

  // 恢复购买
  async function restorePurchase(silent = false): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      console.log('=== restorePurchase 函数开始 ===')
      isRestoring.value = true

      // #ifdef APP-PLUS
      console.log('APP-PLUS 环境，开始获取支付通道')
      // @ts-ignore
      plus.payment.getChannels((channels: any[]) => {
        console.log('获取到支付通道:', channels)
        const iapChannel = channels.find((c: any) => c.id === 'appleiap')

        if (!iapChannel) {
          console.log('未找到 IAP 支付通道')
          isRestoring.value = false
          if (!silent) uni.showToast({ title: '不支持 IAP 支付', icon: 'none' })
          resolve({ success: false, message: '不支持 IAP 支付' })
          return
        }

        console.log('找到 IAP 通道，开始恢复购买')

        // 添加超时处理
        let timeoutId: any = null
        let isResolved = false

        const handleTimeout = () => {
          if (!isResolved) {
            console.log('恢复购买超时（10秒无响应）')
            isResolved = true
            isRestoring.value = false
            if (!silent) uni.showToast({ title: '恢复购买超时，请重试', icon: 'none' })
            resolve({ success: false, message: '超时' })
          }
        }

        timeoutId = setTimeout(handleTimeout, 10000)

        // 使用正确的 API：restoreComplateRequest
        iapChannel.restoreComplateRequest({
          manualFinishTransaction: true
        }, async (results: any) => {
          if (isResolved) return
          isResolved = true
          clearTimeout(timeoutId)

          console.log('恢复购买成功，结果:', results)
          console.log('结果类型:', typeof results, '是否为数组:', Array.isArray(results))
          console.log('结果长度:', results?.length)

          // 定义交易对象结构
          interface IAPTransaction {
            payment: {
              productid: string
              quantity: string
            }
            transactionDate: string
            transactionIdentifier: string
            transactionReceipt: string
            transactionState: string
          }

          const transactions = results as IAPTransaction[]

          // transactionState: 1=Purchased, 3=Restored 都是有效购买
          const targetProduct = transactions.find((item) => {
            const isTargetProduct = item.payment.productid === 'clawspace.fulltime.access'
            const isValidState = item.transactionState === '1' || item.transactionState === '3'
            console.log(`检查产品: ${item.payment.productid}, state: ${item.transactionState}, 是否匹配: ${isTargetProduct}, 状态有效: ${isValidState}`)
            return isTargetProduct && isValidState
          })

          console.log('查找目标产品:', targetProduct)

          if (targetProduct) {
            const receipt = targetProduct.transactionReceipt || ''
            console.log('找到目标产品，收据长度:', receipt.length)
            console.log('交易ID:', targetProduct.transactionIdentifier)

            // 调用云函数验证并恢复
            try {
              console.log('开始调用云函数 restore-purchase')
              const cloudResult = await uniCloud.callFunction({
                name: 'restore-purchase',
                data: { receipt }
              })

              console.log('云函数返回结果:', cloudResult)
              const data = cloudResult.result as any

              if (data.success && data.isPremium) {
                console.log('验证成功，设置高级用户状态')
                setPremiumStatus(true, data.originalTransactionId)

                // 关闭订单（因为设置了 manualFinishTransaction: true）
                console.log('关闭订单:', targetProduct.transactionIdentifier)
                iapChannel.finishTransaction({ transactionIdentifier: targetProduct.transactionIdentifier })

                isRestoring.value = false
                if (!silent) uni.showToast({ title: '恢复成功', icon: 'success' })
                resolve({ success: true })
              } else {
                console.log('验证失败:', data.message)
                isRestoring.value = false
                if (!silent) uni.showToast({ title: data.message || '恢复失败', icon: 'none' })
                resolve({ success: false, message: data.message })
              }
            } catch (error: any) {
              console.error('云函数调用失败', error)
              isRestoring.value = false
              if (!silent) uni.showToast({ title: '恢复失败，请稍后重试', icon: 'none' })
              resolve({ success: false, message: error.message })
            }
          } else {
            console.log('未找到目标产品')
            isRestoring.value = false
            if (!silent) uni.showToast({ title: '未找到购买记录', icon: 'none' })
            resolve({ success: false, message: '未找到购买记录' })
          }
        }, (err: any) => {
          if (isResolved) return
          isResolved = true
          clearTimeout(timeoutId)

          console.error('恢复购买失败', err)
          console.log('错误详情 - code:', err.code, 'message:', err.message)
          isRestoring.value = false
          if (!silent) uni.showToast({ title: err.message || '恢复失败', icon: 'none' })
          resolve({ success: false, message: err.message })
        })
      }, (err: any) => {
        console.error('获取支付通道失败', err)
        isRestoring.value = false
        if (!silent) uni.showToast({ title: '获取支付通道失败', icon: 'none' })
        resolve({ success: false, message: '获取支付通道失败' })
      })
      // #endif

      // #ifndef APP-PLUS
      console.log('非 APP-PLUS 环境')
      isRestoring.value = false
      uni.showToast({ title: '仅支持 APP 环境', icon: 'none' })
      resolve({ success: false, message: '仅支持 APP 环境' })
      // #endif
    })
  }

  // 获取产品信息（价格等）
  async function getProductInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      // @ts-ignore
      if (plus.payment) {
        // @ts-ignore
        plus.payment.getChannels((channels: any[]) => {
          const iapChannel = channels.find((c: any) => c.id === 'appleiap')

          if (!iapChannel) {
            reject(new Error('未找到 Apple IAP 支付通道'))
            return
          }

          // 使用 requestOrder 获取商品信息
          // @ts-ignore
          iapChannel.requestOrder(['clawspace.fulltime.access'], (orderList: any[]) => {
            console.log('商品信息', orderList)
            if (orderList && orderList.length > 0) {
              resolve(orderList[0])
            } else {
              reject(new Error('未找到商品信息'))
            }
          }, (err: any) => {
            console.error('获取商品信息失败', err)
            reject(err)
          })
        }, (err: any) => {
          console.error('获取支付通道失败', err)
          reject(err)
        })
      } else {
        reject(new Error('不支持支付功能'))
      }
      // #endif
      // #ifndef APP-PLUS
      // 非 APP 环境，返回默认价格
      resolve({ price: '¥8' })
      // #endif
    })
  }

  // 检查购买状态（App 启动时调用）
  async function checkPurchaseStatus(): Promise<void> {
    const txId = transactionId.value
    if (!txId) return

    try {
      const result = await uniCloud.callFunction({
        name: 'check-purchase-status',
        data: { transactionId: txId }
      })

      const data = result.result as any

      if (data.success && data.isPremium) {
        setPremiumStatus(true, data.transactionId)
      } else {
        // 云端没有记录，清除本地状态
        setPremiumStatus(false)
      }
    } catch (error) {
      console.error('检查购买状态失败', error)
      // 网络错误时保持本地状态不变
    }
  }

  return {
    // 状态
    isPremium,
    messageCount,
    transactionId,
    isPurchasing,
    isRestoring,

    // 计算属性
    isMessageLimitReached,
    remainingMessages,

    // 常量
    FREE_MESSAGE_LIMIT,
    FREE_SESSION_LIMIT,

    // 方法
    incrementMessageCount,
    canSendMessage,
    setPremiumStatus,
    purchase,
    restorePurchase,
    getProductInfo,
    checkPurchaseStatus
  }
})
