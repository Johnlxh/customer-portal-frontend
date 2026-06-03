<script setup lang="ts">
import ProductThumb from "./ProductThumb.vue"

defineProps<{
  title: string
  items: Array<{
    id: number
    title: string
    meta?: string
    amount?: string
    imageSrc?: string | false
    previewUrls?: string[]
  }>
  totalLabel?: string
  totalValue?: string
  showImages?: boolean
}>()
</script>

<template>
  <view class="section">
    <text class="section-title">{{ title }}</text>
    <view class="card detail-lines">
      <view class="detail-lines__head">
        <text>产品 / 描述</text>
        <text>数量 / 金额</text>
      </view>
      <view v-for="item in items" :key="item.id" class="detail-lines__row">
        <view class="detail-lines__main">
          <view v-if="showImages" class="detail-lines__media">
            <ProductThumb :src="item.imageSrc" :preview-urls="item.previewUrls || []" />
          </view>
          <view class="detail-lines__copy">
            <text class="detail-lines__title">{{ item.title }}</text>
            <text v-if="item.meta" class="detail-lines__meta">{{ item.meta }}</text>
          </view>
        </view>
        <text v-if="item.amount" class="detail-lines__amount">{{ item.amount }}</text>
      </view>
      <view v-if="totalLabel && totalValue" class="detail-lines__total">
        <text>{{ totalLabel }}</text>
        <text>{{ totalValue }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.section {
  margin-top: 28rpx;
}

.detail-lines {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
}

.detail-lines__head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 16rpx;
  background: var(--portal-surface-muted);
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.detail-lines__row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  background: var(--portal-primary-tint);
}

.detail-lines__main {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 14rpx;
}

.detail-lines__media {
  flex: 0 0 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
}

.detail-lines__copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8rpx;
}

.detail-lines__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--portal-text);
}

.detail-lines__meta {
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.detail-lines__amount,
.detail-lines__total {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.detail-lines__total {
  display: flex;
  justify-content: space-between;
  padding-top: 8rpx;
}

@media (min-width: 1024px) {
  .section {
    margin-top: 0;
  }

  .detail-lines {
    gap: 10px;
    padding: 18px;
  }

  .detail-lines__head {
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 11px;
  }

  .detail-lines__row {
    gap: 16px;
    padding: 14px;
    border-radius: 10px;
  }

  .detail-lines__main {
    gap: 12px;
  }

  .detail-lines__media {
    flex: 0 0 60px;
    height: 60px;
    border-radius: 14px;
  }

  .detail-lines__copy {
    gap: 6px;
  }

  .detail-lines__title,
  .detail-lines__amount,
  .detail-lines__total {
    font-size: 14px;
  }

  .detail-lines__meta {
    font-size: 12px;
  }

  .detail-lines__total {
    padding-top: 6px;
  }
}
</style>
