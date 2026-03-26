<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";
import { useInstanceStore } from "@/stores/instance";
import { usePaywallStore } from "@/stores/paywall";
import { WHITE_LIST } from "@/utils/guard";
import { wsManager } from "@/utils/websocket-manager";
import { logger } from "@/utils/logger";

const TAG = 'App';
let isFirstLaunch = true;

onLaunch(async () => {
  const userStore = useUserStore();
  const instanceStore = useInstanceStore();
  const paywallStore = usePaywallStore();

  // 迁移旧的登录数据到实例管理系统
  instanceStore.initFromLegacyStorage();

  const checkAuth = (options: { url: string }) => {
    const path = options.url.split("?")[0];
    if (WHITE_LIST.includes(path)) return true;
    if (userStore.isAuthenticated) return true;
    uni.reLaunch({ url: "/pages/auth/login" });
    return false;
  };
  uni.addInterceptor("navigateTo", { invoke: checkAuth });
  uni.addInterceptor("redirectTo", { invoke: checkAuth });
  uni.addInterceptor("reLaunch", { invoke: checkAuth });

  await userStore.autoLogin().catch(() => {});

  // 检查购买状态
  paywallStore.checkPurchaseStatus().catch(() => {
    logger.info(TAG, '检查购买状态失败，使用本地缓存');
  });
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
