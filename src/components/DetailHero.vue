<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  pdfUrl?: string | false
  backLabel?: string
}>()

const emit = defineEmits<{
  (event: "back"): void
  (event: "pdf"): void
}>()
</script>

<template>
  <view class="detail-hero card">
    <view class="detail-hero__head">
      <button v-if="backLabel" class="secondary-button detail-hero__back" @tap="emit('back')">
        {{ backLabel || "返回" }}
      </button>
      <button v-if="pdfUrl" class="secondary-button detail-hero__pdf" @tap="emit('pdf')">
        PDF
      </button>
    </view>

    <view class="detail-hero__body page-heading">
      <text class="page-title">{{ title }}</text>
      <text v-if="subtitle" class="page-subtitle">{{ subtitle }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-hero {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 28rpx 24rpx;
}

.detail-hero__head {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.detail-hero__back,
.detail-hero__pdf {
  margin: 0;
  min-width: 140rpx;
}

.detail-hero__body {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .detail-hero {
    gap: 16px;
    padding: 22px 22px 20px;
  }

  .detail-hero__head {
    gap: 12px;
  }

  .detail-hero__back,
  .detail-hero__pdf {
    min-width: 108px;
  }

  .detail-hero__body {
    gap: 0;
  }

  .detail-hero :deep(.page-title) {
    font-size: 30px;
  }

  .detail-hero :deep(.page-subtitle) {
    margin-top: 0;
    font-size: 13px;
  }
}
</style>
