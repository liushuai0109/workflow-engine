<template>
  <div class="product-config-form">
    <div class="form-header">
      <h4 class="form-title">🛒 商品推荐配置</h4>
      <a-badge v-if="confirmed" status="success" text="已确认" class="confirmed-badge" />
    </div>

    <div class="form-content">
      <!-- Products Section -->
      <div class="config-section">
        <div class="section-header">
          <span class="section-icon">📦</span>
          <span class="section-title">推荐商品</span>
        </div>
        <div class="checkbox-list">
          <div
            v-for="product in localData.products"
            :key="product.id"
            class="checkbox-item"
            :class="{ selected: product.selected, disabled: disabled || confirmed }"
            @click="toggleProduct(product.id)"
          >
            <a-checkbox
              :checked="product.selected"
              :disabled="disabled || confirmed"
            />
            <div class="item-content">
              <div class="item-name">{{ product.name }}</div>
              <div class="item-meta">
                <span class="item-category">{{ product.category }}</span>
                <span class="item-price">¥{{ product.price }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Coupons Section -->
      <div class="config-section">
        <div class="section-header">
          <span class="section-icon">🎫</span>
          <span class="section-title">优惠券</span>
        </div>
        <div class="checkbox-list">
          <div
            v-for="coupon in localData.coupons"
            :key="coupon.id"
            class="checkbox-item"
            :class="{ selected: coupon.selected, disabled: disabled || confirmed }"
            @click="toggleCoupon(coupon.id)"
          >
            <a-checkbox
              :checked="coupon.selected"
              :disabled="disabled || confirmed"
            />
            <div class="item-content">
              <div class="item-name">{{ coupon.name }}</div>
              <div class="item-meta">
                <span class="coupon-discount">{{ coupon.discount }}</span>
                <span class="coupon-conditions">{{ coupon.conditions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Benefits Section -->
      <div class="config-section">
        <div class="section-header">
          <span class="section-icon">🎁</span>
          <span class="section-title">权益配置</span>
        </div>
        <div class="checkbox-list">
          <div
            v-for="benefit in localData.benefits"
            :key="benefit.id"
            class="checkbox-item"
            :class="{ selected: benefit.selected, disabled: disabled || confirmed }"
            @click="toggleBenefit(benefit.id)"
          >
            <a-checkbox
              :checked="benefit.selected"
              :disabled="disabled || confirmed"
            />
            <div class="item-content">
              <div class="item-name">{{ benefit.name }}</div>
              <div class="item-description">{{ benefit.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <a-button
          v-if="!confirmed && !disabled"
          type="primary"
          @click="handleConfirm"
          :loading="confirming"
          :disabled="!hasSelection"
        >
          确定
        </a-button>
        <span v-if="confirmed" class="confirmed-text">
          ✓ 商品配置已确认
        </span>
        <span v-if="!confirmed && !hasSelection" class="hint-text">
          请至少选择一项
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface ProductItem {
  id: string
  name: string
  category: string
  price: number
  selected: boolean
}

export interface CouponItem {
  id: string
  name: string
  discount: string
  conditions: string
  selected: boolean
}

export interface BenefitItem {
  id: string
  name: string
  description: string
  selected: boolean
}

export interface ProductConfigData {
  products: ProductItem[]
  coupons: CouponItem[]
  benefits: BenefitItem[]
  confirmed: boolean
}

interface Props {
  messageId: string
  data: ProductConfigData
  disabled?: boolean
}

interface Emits {
  (e: 'confirm', data: ProductConfigData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local copy of data for editing
const localData = ref<ProductConfigData>({ ...props.data })
const confirming = ref(false)

// Watch for prop changes
watch(() => props.data, (newData) => {
  localData.value = { ...newData }
}, { deep: true })

const confirmed = computed(() => props.data?.confirmed || false)

const hasSelection = computed(() => {
  return (
    localData.value.products.some(p => p.selected) ||
    localData.value.coupons.some(c => c.selected) ||
    localData.value.benefits.some(b => b.selected)
  )
})

const toggleProduct = (id: string) => {
  if (props.disabled || confirmed.value) return
  const product = localData.value.products.find(p => p.id === id)
  if (product) {
    product.selected = !product.selected
  }
}

const toggleCoupon = (id: string) => {
  if (props.disabled || confirmed.value) return
  const coupon = localData.value.coupons.find(c => c.id === id)
  if (coupon) {
    coupon.selected = !coupon.selected
  }
}

const toggleBenefit = (id: string) => {
  if (props.disabled || confirmed.value) return
  const benefit = localData.value.benefits.find(b => b.id === id)
  if (benefit) {
    benefit.selected = !benefit.selected
  }
}

const handleConfirm = async () => {
  if (props.disabled || confirmed.value || !hasSelection.value) return

  confirming.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 300))

    const updatedData: ProductConfigData = {
      ...localData.value,
      confirmed: true
    }
    emit('confirm', updatedData)
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped>
.product-config-form {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.form-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.confirmed-badge {
  margin-left: auto;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-section {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background-color: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.checkbox-item:hover:not(.disabled) {
  background-color: #f0f0f0;
}

.checkbox-item.selected {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.checkbox-item.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #8c8c8c;
}

.item-category {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}

.item-price {
  color: #f5222d;
  font-weight: 500;
}

.coupon-discount {
  color: #fa8c16;
  font-weight: 500;
}

.coupon-conditions {
  color: #8c8c8c;
}

.item-description {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.confirmed-text {
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
}

.hint-text {
  color: #8c8c8c;
  font-size: 12px;
}
</style>
