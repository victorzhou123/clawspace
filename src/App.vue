<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";
import { WHITE_LIST } from "@/utils/guard";

onLaunch(async () => {
  const userStore = useUserStore();

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
});
onShow(() => {});
onHide(() => {});
</script>
<style lang="scss">
@import '@/styles/theme.scss';

page {
  background-color: var(--bg-primary, #111111);
}
</style>
