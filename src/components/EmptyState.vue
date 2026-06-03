<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <view class="empty-state card">
    <text class="empty-state__title">{{ title }}</text>
    <text v-if="description" class="empty-state__description">{{ description }}</text>
  </view>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 32rpx 28rpx;
  text-align: center;
}

.empty-state__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.empty-state__description {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

@media (min-width: 1024px) {
  .empty-state {
    gap: 10px;
    padding: 28px 24px;
  }

  .empty-state__title {
    font-size: 18px;
  }

  .empty-state__description {
    font-size: 13px;
  }
}
</style>
