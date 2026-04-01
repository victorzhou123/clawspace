<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";
import { useInstanceStore } from "@/stores/instance";
import { usePaywallStore } from "@/stores/paywall";
import { wsManager } from "@/utils/websocket-manager";
import { logger } from "@/utils/logger";
import { waitForNetwork } from "@/utils/network";

const TAG = 'App';
let isFirstLaunch = true;

onLaunch(async () => {
  const userStore = useUserStore();
  const instanceStore = useInstanceStore();
  const paywallStore = usePaywallStore();

  // 迁移旧的登录数据到实例管理系统
  instanceStore.initFromLegacyStorage();

  // 如果本地没有任何实例，则将登录页作为首个页面
  if (instanceStore.instances.length === 0) {
    uni.reLaunch({ url: "/pages/auth/login" });
  }

  const checkAuth = (_options: { url: string }) => {
    return true;
  };
  uni.addInterceptor("navigateTo", { invoke: checkAuth });
  uni.addInterceptor("redirectTo", { invoke: checkAuth });
  uni.addInterceptor("reLaunch", { invoke: checkAuth });

  await userStore.autoLogin().catch(() => {});

  // 检查购买状态：如果本地不是高级用户，尝试恢复购买
  if (!paywallStore.isPremium) {
    // 先等待网络可用
    waitForNetwork(6, 1000).then(hasNetwork => {
      if (hasNetwork) {
        // 网络可用，静默恢复购买
        paywallStore.restorePurchase(true).catch(() => {
          // 静默失败，不提示用户
        });
      } else {
        // 网络不可用，放弃本次恢复（不影响 app 启动）
        console.log('网络不可用，跳过自动恢复购买');
      }
    });
  } else {
    // 如果本地已是高级用户，验证云端状态
    paywallStore.checkPurchaseStatus().catch(() => {
      logger.info(TAG, '检查购买状态失败，使用本地缓存');
    });
  }
});

onShow(() => {
  if (isFirstLaunch) {
    isFirstLaunch = false;
    return;
  }

  const userStore = useUserStore();
  if (userStore.isAuthenticated && wsManager.status !== 'connected') {
    logger.info(TAG, 'app resumed, reconnecting...');
    userStore.autoLogin().catch(() => {});
  }
});

onHide(() => {});
</script>
<style lang="scss">
@import '@/styles/theme.scss';

page,
body,
html {
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary, #111111);
  font-family: "SF Pro Text", "SF Pro Display", "PingFang SC", -apple-system, sans-serif;
}

page {
  overscroll-behavior: none;
}
</style>
