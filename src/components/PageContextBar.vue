<script setup lang="ts">
defineProps<{
  currentLabel: string
  parentLabel?: string
  backLabel?: string
}>()

const emit = defineEmits<{
  (event: "back"): void
}>()
</script>

<template>
  <view class="page-context">
    <view v-if="backLabel" class="page-context__back" hover-class="page-context__back--active" @tap="emit('back')">
      <text class="page-context__back-icon">←</text>
      <text class="page-context__back-label">{{ backLabel }}</text>
    </view>
    <view class="page-context__trail">
      <text class="page-context__caption">当前位置</text>
      <text class="page-context__divider">/</text>
      <text class="page-context__path">{{ parentLabel ? `${parentLabel} / ${currentLabel}` : currentLabel }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.page-context__back {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 74rpx;
  padding: 0 24rpx;
  border: 1px solid var(--portal-border);
  border-radius: 999rpx;
  background: var(--portal-surface);
  box-shadow: var(--portal-shadow);
  transition: var(--portal-transition);
}

.page-context__back--active {
  background: var(--portal-primary-tint);
  transform: translateY(2rpx);
}

.page-context__back-icon {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--portal-primary);
}

.page-context__back-label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.page-context__trail {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 68rpx;
  padding: 0 20rpx;
  border: 1px solid var(--portal-border);
  border-radius: 999rpx;
  background: var(--portal-primary-tint);
}

.page-context__caption,
.page-context__divider {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--portal-text-muted);
}

.page-context__divider {
  opacity: 0.7;
}

.page-context__path {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text);
}

@media (min-width: 1024px) {
  .page-context {
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-context__back {
    gap: 8px;
    min-height: 40px;
    padding: 0 14px;
    cursor: pointer;
  }

  .page-context__back:hover {
    border-color: var(--portal-border-strong);
    background: var(--portal-primary-tint);
  }

  .page-context__back-icon,
  .page-context__back-label,
  .page-context__path {
    font-size: 12px;
  }

  .page-context__trail {
    gap: 8px;
    min-height: 38px;
    padding: 0 14px;
  }

  .page-context__caption,
  .page-context__divider {
    font-size: 11px;
  }
}
</style>
