<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";

onLaunch(async () => {
  const userStore = useUserStore();
  await userStore.autoLogin();
});
onShow(() => {});
onHide(() => {});
</script>
<style></style>
