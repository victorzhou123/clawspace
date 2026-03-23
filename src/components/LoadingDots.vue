<template>
  <view class="loading-dots">
    <view class="dot" />
    <view class="dot" />
    <view class="dot" />
  </view>
</template>

<style scoped lang="scss">
.loading-dots {
  display: flex;
  gap: 8rpx;
  align-items: center;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;

  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
