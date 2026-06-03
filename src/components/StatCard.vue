<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  value: string | number
  helper?: string
  clickable?: boolean
}>(), {
  clickable: false
})

const emit = defineEmits<{
  (event: "click"): void
}>()
</script>

<template>
  <view class="stat-card card" :class="{ 'stat-card--interactive': clickable }" @tap="emit('click')">
    <text class="stat-card__title">{{ title }}</text>
    <text class="stat-card__value">{{ value }}</text>
    <text v-if="helper" class="stat-card__helper">{{ helper }}</text>
  </view>
</template>

<style scoped lang="scss">
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
}

.stat-card--interactive:active {
  transform: translateY(2rpx);
}

.stat-card__title {
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.stat-card__value {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stat-card__helper {
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

@media (min-width: 1024px) {
  .stat-card {
    gap: 8px;
    padding: 22px 24px;
  }

  .stat-card--interactive {
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .stat-card--interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--portal-shadow-hover);
    border-color: var(--portal-border-strong);
  }

  .stat-card__title,
  .stat-card__helper {
    font-size: 13px;
  }

  .stat-card__value {
    font-size: 30px;
    transition: transform 0.18s ease, color 0.18s ease;
    transform-origin: left center;
  }

  .stat-card--interactive:hover .stat-card__value {
    transform: scale(1.08);
    color: var(--portal-primary);
  }
}
</style>
