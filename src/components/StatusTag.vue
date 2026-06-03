<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  label: string
}>()

const tone = computed(() => {
  const label = props.label || ""
  if (label.includes("取消")) {
    return "danger"
  }
  if (label.includes("确认") || label.includes("完成") || label.includes("发货") || label.includes("收回")) {
    return "success"
  }
  return "warning"
})
</script>

<template>
  <view class="status-tag" :class="`is-${tone}`">
    {{ label }}
  </view>
</template>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.is-success {
  background: rgba(31, 122, 98, 0.12);
  color: var(--portal-success);
}

.is-warning {
  background: rgba(183, 121, 31, 0.12);
  color: var(--portal-warning);
}

.is-danger {
  background: rgba(194, 65, 65, 0.12);
  color: var(--portal-danger);
}

@media (min-width: 1024px) {
  .status-tag {
    min-height: 28px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 11px;
  }
}
</style>
