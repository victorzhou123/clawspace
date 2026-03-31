<template>
  <view class="paywall-page" :class="[themeClass, { dark: isDark }]">
    <!-- 返回按钮（浮动） -->
    <view class="back-button" @click="handleClose">
      <text class="icon-close">✕</text>
    </view>

    <!-- 主内容区（全屏滚动） -->
    <scroll-view class="main-content" scroll-y :show-scrollbar="false">
      <!-- Hero 区域 -->
      <view class="hero-section">
        <view class="limited-offer-badge">
          <text class="badge-text">限时优惠</text>
        </view>
        <text class="hero-title">解锁高级功能</text>
        <text class="hero-subtitle">所有功能，永久使用，无需订阅</text>
      </view>

      <!-- 功能卡片网格 -->
      <view class="features-grid">
        <view class="feature-card">
          <text class="feature-icon">📜</text>
          <view class="feature-content">
            <text class="feature-title">解锁所有历史会话列表</text>
            <text class="feature-desc">访问您的完整对话历史记录</text>
          </view>
        </view>
        <view class="feature-card">
          <text class="feature-icon">💬</text>
          <view class="feature-content">
            <text class="feature-title">解锁不限量对话次数</text>
            <text class="feature-desc">进行无限次 AI 对话</text>
          </view>
        </view>
      </view>

      <!-- 价格卡片 -->
      <view class="price-card">
        <view class="price-card-inner">
          <view class="price-glow"></view>
          <text class="price-label">一次性付费</text>
          <view class="price-amount">
            <text class="price-value">{{ currencySymbol }} {{ productPrice }}</text>
          </view>
          <text class="price-desc">一次付费，永久拥有高级体验</text>
        </view>
      </view>

      <!-- 页脚 -->
      <view class="footer">
        <view class="footer-links">
          <text class="footer-link" :class="{ disabled: isRestoring }" @click="handleRestore">恢复购买</text>
          <text class="footer-link" @click="openExternal('https://docs.vic0.com/docs/clawspace/service-terms-zh')">服务条款</text>
          <text class="footer-link" @click="openExternal('https://docs.vic0.com/docs/clawspace/privacy-zh')">隐私政策</text>
          <text class="footer-link" @click="openExternal('https://docs.vic0.com/docs/clawspace/support-zh')">技术支持</text>
        </view>
        <text class="footer-copyright">© 2026 Clawspace</text>
      </view>

    </scroll-view>

    <!-- 底部按钮区域（固定，毛玻璃效果） -->
    <view class="floating-actions">
      <button
        class="btn-primary"
        :class="{ loading: isPurchasing, unlocked: isPremium }"
        :disabled="isPurchasing || isPremium"
        @click="handlePurchase"
      >
        <text v-if="isPremium">已解锁所有功能</text>
        <text v-else-if="!isPurchasing">获取终身访问权限</text>
        <text v-else>购买中...</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePaywallStore } from '@/stores/paywall'
import { useThemeStore } from '@/stores/theme'
import { useTheme } from '@/composables/useTheme'
import { onVibrate } from '@/utils/haptic'

const paywallStore = usePaywallStore()
const themeStore = useThemeStore()
const { themeClass } = useTheme()

const isDark = computed(() => themeStore.theme === 'dark')
const isPurchasing = computed(() => paywallStore.isPurchasing)
const isRestoring = computed(() => paywallStore.isRestoring)
const isPremium = computed(() => paywallStore.isPremium)

// 产品价格
const productPrice = ref('8')
const currencySymbol = ref('¥')

const currencySymbolMap: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
}

function parseCurrencyFromPriceLocal(priceLocal?: string): string | null {
  if (!priceLocal) return null
  const match = priceLocal.match(/currency=([A-Z]{3})/i)
  return match ? match[1].toUpperCase() : null
}

function resolveCurrencySymbol(priceLocal?: string): string {
  const code = parseCurrencyFromPriceLocal(priceLocal)
  if (!code) return '¥'
  return currencySymbolMap[code] ?? code
}

// 获取产品信息
onMounted(async () => {
  try {
    const product = await paywallStore.getProductInfo()
    if (product && product.price) {
      productPrice.value = String(product.price)
    }
    currencySymbol.value = resolveCurrencySymbol(product?.pricelocal)
  } catch (error) {
    console.error('获取产品信息失败', error)
    // 使用默认价格
    productPrice.value = '8'
    currencySymbol.value = '¥'
  }
})

// 打开外部链接
function openExternal(url: string) {
  onVibrate()
  // #ifdef H5
  window.open(url)
  // #endif

  // #ifdef APP-PLUS
  plus.runtime.openURL(url)
  // #endif

  // #ifndef H5
  // #ifndef APP-PLUS
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'none' })
    },
  })
  // #endif
  // #endif
}

// 关闭付费墙
function handleClose() {
  onVibrate()
  uni.navigateBack()
}

// 购买
async function handlePurchase() {
  onVibrate()

  const result = await paywallStore.purchase()

  if (result.success) {
    onVibrate()
    // 购买成功，返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  }
}

// 恢复购买
async function handleRestore() {
  if (isRestoring.value) return

  console.log('=== 恢复购买开始 ===')
  onVibrate()
  uni.showLoading({ title: '正在恢复购买...' })

  try {
    console.log('调用 paywallStore.restorePurchase()')
    const result = await paywallStore.restorePurchase()
    console.log('恢复购买结果:', result)

    if (result.success) {
      console.log('恢复购买成功，准备返回')
      onVibrate()
      // 恢复成功，返回上一页
      setTimeout(() => {
        uni.navigateBack()
      }, 500)
    } else {
      console.log('恢复购买失败:', result.message)
    }
  } finally {
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.paywall-page {
  width: 100%;
  height: 100vh;
  background: #f9f9ff;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.dark {
    background: var(--bg-primary);
  }
}

// 返回按钮（浮动，毛玻璃效果）
.back-button {
  position: fixed;
  top: env(safe-area-inset-top);
  left: 24px;
  z-index: 200;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;

  .dark & {
    background: rgba(24, 28, 35, 0.7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }

  .icon-close {
    font-size: 24px;
    color: #0058bc;

    .dark & {
      color: #adc6ff;
    }
  }
}

// 主内容区（全屏滚动）
.main-content {
  flex: 1;
  margin-top: env(safe-area-inset-top);
  padding: 0 40rpx;
  height: 100%;
  box-sizing: border-box;
}

// Hero 区域
.hero-section {
  margin-top: 78rpx;
  margin-bottom: 48px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.limited-offer-badge {
  display: inline-block;
  padding: 6px 12px;
  margin-bottom: 24px;
  border-radius: 100px;
  background: rgba(0, 88, 188, 0.1);
  border: 1px solid rgba(0, 88, 188, 0.2);

  .dark & {
    background: rgba(0, 112, 235, 0.15);
    border-color: rgba(0, 112, 235, 0.3);
  }
}

.badge-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #0058bc;

  .dark & {
    color: #adc6ff;
  }
}

.hero-title {
  display: block;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #181c23;
  margin-bottom: 16px;

  .dark & {
    color: #eef0fc;
  }
}

.hero-subtitle {
  display: block;
  font-size: 18px;
  line-height: 1.5;
  font-weight: 300;
  color: #414755;
  max-width: 320px;

  .dark & {
    color: #c1c6d7;
  }
}

// 功能卡片网格
.features-grid {
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 48px;
}

.feature-card {
  padding: 24px;
  border-radius: 12px;
  background: #f1f3fe;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-height: 50px;

  .dark & {
    background: #1d212a;
  }
}

.feature-icon {
  font-size: 32px;
  line-height: 1;
}

.feature-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #181c23;
  line-height: 1.3;

  .dark & {
    color: #eef0fc;
  }
}

.feature-desc {
  font-size: 14px;
  color: #414755;
  line-height: 1.4;

  .dark & {
    color: #c1c6d7;
  }
}

// 价格卡片
.price-card {
  padding: 4px;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(0, 88, 188, 0.3) 0%, transparent 100%);
  margin-bottom: 45px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;

  .dark & {
    background: linear-gradient(180deg, rgba(0, 112, 235, 0.3) 0%, transparent 100%);
  }
}

.price-card-inner {
  background: #ffffff;
  padding: 32px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(24, 28, 35, 0.04);

  .dark & {
    background: #1f232c;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  }
}

.price-glow {
  position: absolute;
  top: -96px;
  right: -96px;
  width: 192px;
  height: 192px;
  background: rgba(0, 88, 188, 0.2);
  border-radius: 50%;
  filter: blur(60px);

  .dark & {
    background: rgba(0, 112, 235, 0.2);
  }
}

.price-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #0058bc;
  margin-bottom: 16px;
  z-index: 1;

  .dark & {
    color: #adc6ff;
  }
}

.price-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  z-index: 1;
}

.price-value {
  font-size: 40px;
  font-weight: 800;
  color: #181c23;

  .dark & {
    color: #eef0fc;
  }
}

.price-desc {
  font-size: 14px;
  color: #414755;
  max-width: 280px;
  line-height: 1.5;
  z-index: 1;

  .dark & {
    color: #c1c6d7;
  }
}

// 页脚
.footer {
  padding: 32px 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  padding-bottom: 400rpx;
}

.footer-links {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #717786;
  opacity: 0.8;
  transition: opacity 0.2s;

  .dark & {
    color: #c1c6d7;
  }

  &:active {
    opacity: 0.6;
  }

  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}

.footer-copyright {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #717786;
  opacity: 0.6;

  .dark & {
    color: #c1c6d7;
  }
}

// // 底部占位
// .bottom-spacer {
//   height: 40px;
// }

// 底部按钮区域（固定）
.floating-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px calc(32px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  z-index: 100;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.btn-primary {
  width: 100%;
  height: 56px;
  border-radius: 100px;
  background: linear-gradient(135deg, #0058bc 0%, #0070eb 100%);
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  border: none;
  box-shadow: 0 8px 24px rgba(0, 88, 188, 0.3);
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.6;
  }

  &.loading {
    opacity: 0.8;
  }

  &.unlocked {
    background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
    box-shadow: 0 8px 24px rgba(107, 114, 128, 0.3);
    opacity: 0.7;
  }
}
</style>
