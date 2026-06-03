<script setup lang="ts">
defineProps<{
  title: string
  items: Array<{
    label: string
    value: string
  }>
}>()
</script>

<template>
  <view class="detail-info card">
    <text class="section-title">{{ title }}</text>
    <view v-for="item in items" :key="item.label" class="detail-info__item">
      <text class="field-label">{{ item.label }}</text>
      <text class="field-value">{{ item.value }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
}

.detail-info__item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 20rpx 22rpx;
  border-radius: 16rpx;
  background: var(--portal-surface-muted);
}

@media (min-width: 1024px) {
  .detail-info {
    gap: 10px;
    padding: 18px;
  }

  .detail-info__item {
    gap: 6px;
    padding: 14px 16px;
    border-radius: 10px;
  }
}
</style>
