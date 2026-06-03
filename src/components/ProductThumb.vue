<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(defineProps<{
  src?: string | false
  alt?: string
  previewUrls?: string[]
  previewEnabled?: boolean
  fit?: "aspectFill" | "aspectFit"
}>(), {
  src: false,
  alt: "",
  previewUrls: () => [],
  previewEnabled: true,
  fit: "aspectFill",
})

const placeholderSrc = "/static/product-placeholder.svg"

const hasImage = computed(() => Boolean(props.src))
const displaySrc = computed(() => props.src || placeholderSrc)
const previewList = computed(() => {
  const urls = props.previewUrls.length ? props.previewUrls : props.src ? [props.src] : []
  return Array.from(new Set(urls.filter((item): item is string => Boolean(item))))
})
const canPreview = computed(() => props.previewEnabled && previewList.value.length > 0)

function handlePreview() {
  if (!canPreview.value) {
    return
  }
  uni.previewImage({
    current: props.src || previewList.value[0],
    urls: previewList.value,
  })
}
</script>

<template>
  <view
    class="product-thumb"
    :class="{
      'product-thumb--clickable': canPreview,
      'product-thumb--placeholder': !hasImage,
    }"
    @tap.stop="handlePreview"
  >
    <image
      class="product-thumb__image"
      :class="{ 'product-thumb__image--placeholder': !hasImage }"
      :src="displaySrc"
      :mode="hasImage ? fit : 'aspectFit'"
      :lazy-load="hasImage"
      :show-menu-by-longpress="hasImage"
    />
  </view>
</template>

<style scoped lang="scss">
.product-thumb {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(180deg, #f7f9fc 0%, #edf2f8 100%);
}

.product-thumb--clickable {
  cursor: pointer;
}

.product-thumb--placeholder {
  border: 1px solid rgba(190, 202, 219, 0.7);
}

.product-thumb__image {
  width: 100%;
  height: 100%;
  display: block;
}

.product-thumb__image--placeholder {
  opacity: 0.95;
}
</style>
