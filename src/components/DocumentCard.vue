<script setup lang="ts">
import StatusTag from "./StatusTag.vue"

defineProps<{
  title: string
  subtitle?: string
  helper?: string
  meta?: string
  amount?: string
  status?: string
}>()

const emit = defineEmits<{
  (event: "click"): void
}>()
</script>

<template>
  <view class="document-card card" @tap="emit('click')">
    <view class="document-card__header">
      <view class="document-card__title-block">
        <text class="document-card__title">{{ title }}</text>
        <text v-if="subtitle" class="document-card__subtitle">{{ subtitle }}</text>
      </view>
      <StatusTag v-if="status" :label="status" />
    </view>
    <text v-if="helper" class="document-card__helper">{{ helper }}</text>
    <view v-if="meta || amount" class="document-card__footer">
      <text v-if="meta" class="document-card__meta">{{ meta }}</text>
      <text v-if="amount" class="document-card__amount">{{ amount }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.document-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 26rpx 24rpx;
}

.document-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.document-card__title-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8rpx;
}

.document-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.document-card__subtitle,
.document-card__helper,
.document-card__meta {
  font-size: 23rpx;
  line-height: 1.5;
  color: var(--portal-text-muted);
}

.document-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.document-card__amount {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--portal-text);
}

@media (min-width: 1024px) {
  .document-card {
    gap: 12px;
    padding: 18px 18px 16px;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease;
  }

  .document-card:hover {
    border-color: var(--portal-border-strong);
    background: var(--portal-primary-tint);
  }

  .document-card__header {
    gap: 12px;
  }

  .document-card__title {
    font-size: 17px;
  }

  .document-card__subtitle,
  .document-card__helper,
  .document-card__meta {
    font-size: 12px;
  }

  .document-card__amount {
    font-size: 14px;
  }
}
</style>
