<script setup lang="ts">
import { onHide, onLaunch, onShow } from "@dcloudio/uni-app"

import { useAuthStore } from "./stores/auth"

const authStore = useAuthStore()

onLaunch(() => {
  authStore.initialize()
})

onShow(() => {
  authStore.initialize()
})

onHide(() => {
  // no-op
})
</script>

<style lang="scss">
@use "./styles/portal-global.scss";
</style>
