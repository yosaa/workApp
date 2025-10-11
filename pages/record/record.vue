<template>
  <view class="container">
    <view class="safe-area">
      <view class="header-section">
        <button class="back-btn" @click="goBack">←</button>
        <view class="title">记录工作</view>
      </view>

      <view class="form-container">
        <view class="form-group">
          <label class="form-label">日期</label>
          <picker mode="date" :value="date" @change="onDateChange" class="date-picker">
            <view class="picker-display">{{formatDisplayDate(date)}}</view>
          </picker>
        </view>

        <view class="form-group">
          <label class="form-label">工作数量</label>
          <input 
            type="number" 
            :value="quantity" 
            @input="handleQuantityInput"
            placeholder="请输入数量"
            class="modern-input"
            confirm-type="done"
            cursor-spacing="20"
            adjust-position="true"
            hold-keyboard="true"
          />
        </view>

        <view class="form-group">
          <label class="form-label">单价（元）</label>
          <input 
            type="digit" 
            :value="unitPrice" 
            @input="handlePriceInput"
            placeholder="请输入单价"
            class="modern-input"
            confirm-type="done"
            cursor-spacing="20"
            adjust-position="true"
            hold-keyboard="true"
          />
          <view class="quick-price-chips">
            <view 
              v-for="price in quickPrices" 
              :key="price"
              class="price-chip"
              @click="selectQuickPrice(price)"
            >
              <text class="price-chip-text">{{price}}</text>
            </view>
          </view>
        </view>

        <view class="summary-card">
          <view class="summary-label">预计收入</view>
          <view class="summary-amount">¥{{totalAmount}}</view>
        </view>

        <view class="action-section">
          <button 
            class="save-btn" 
            @click="saveRecord" 
            :disabled="!canSave || isSaving"
            :class="{disabled: !canSave || isSaving}"
          >
            <view class="btn-text">保存记录</view>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import { dbManager, initDatabase } from '@/utils/database.js'

export default {
  data() {
    return {
      date: this.getTodayDate(),
      quantity: '',
      unitPrice: '',
      quickPrices: [0.65, 0.7, 0.8, 0.85, 0.9, 1, 1.5],
      dbReady: false,
      isSaving: false
    }
  },
  
  onLoad() {
    // 初始化数据库
    initDatabase().then(() => {
      this.dbReady = true ;
    }).catch(error => {
      console.error('Database initialization failed:', error);
      // 如果数据库初始化失败，仍然允许手动输入，但提示用户
      uni.showToast({
        title: '数据库初始化失败',
        icon: 'none',
        duration: 2000
      });
    });
  },
  computed: {
    totalAmount() {
      if (this.quantity && this.unitPrice && !isNaN(this.quantity) && !isNaN(this.unitPrice)) {
        return (parseFloat(this.quantity) * parseFloat(this.unitPrice)).toFixed(2);
      }
      return '0.00';
    },
    canSave() {
      return this.quantity && this.unitPrice && parseFloat(this.quantity) > 0 && parseFloat(this.unitPrice) > 0;
    }
  },
  methods: {
    getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatDisplayDate(dateStr) {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    },
    onDateChange(e) {
      this.date = e.detail.value;
    },
    handleQuantityInput(e) {
      this.quantity = e.detail.value;
    },
    handlePriceInput(e) {
      this.unitPrice = e.detail.value;
    },
    saveRecord() {
	if (this.dbReady !== true || this.isSaving) {
	  return;
	}

      // 防抖：如果正在保存中，直接返回
      if (this.isSaving) {
        return;
      }

      this.isSaving = true;

      const record = {
        date: this.date,
        quantity: parseFloat(this.quantity),
        unitPrice: parseFloat(this.unitPrice),
        total: parseFloat(this.totalAmount)
      };

      // 使用SQLite保存记录
      dbManager.insertWorkRecord(record).then(() => {
        uni.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }).catch(error => {
        console.error('保存记录失败:', error);
        uni.showToast({
          title: '保存失败',
          icon: 'none',
          duration: 2000
        });
        this.isSaving = false;
      });
    },
    goBack() {
      uni.navigateBack();
    },
    selectQuickPrice(price) {
      this.unitPrice = price.toString();
    }
  }
}
</script>
<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
  padding: calc(env(safe-area-inset-top) + 60rpx) 0 calc(env(safe-area-inset-bottom) + 40rpx);
  display: flex;
  flex-direction: column;
}

.safe-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 40rpx;
}

.header-section {
  display: flex;
  align-items: center;
  padding: 40rpx 0;
  border-bottom: 1rpx solid rgba(45, 90, 45, 0.1);
  margin-bottom: 40rpx;
}

.back-btn {
  background: none;
  border: none;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  font-size: 48rpx;
  color: #2d5a2d;
  padding: 0;
  margin-right: 30rpx;
  line-height: 1;
  box-shadow: none;
}

.title {
  font-size: 40rpx;
  font-weight: 500;
  color: #2d5a2d;
  letter-spacing: 1rpx;
}

.form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 60rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #5a7a5a;
  margin-bottom: 20rpx;
  font-weight: 500;
  letter-spacing: 0.5rpx;
}

.date-picker {
  width: 100%;
}

.picker-display {
  padding: 30rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  font-size: 32rpx;
  color: #2d5a2d;
  border: 1rpx solid rgba(168, 230, 207, 0.3);
  text-align: center;
  transition: background 0.3s ease, border 0.3s ease;
}

.picker-display:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.95);
}

.modern-input {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  padding: 0 30rpx;
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid rgba(168, 230, 207, 0.3);
  border-radius: 20rpx;
  font-size: 36rpx;
  color: #2d5a2d;
  box-sizing: border-box;
  transition: background 0.3s ease, border 0.3s ease;
  text-align: center;
  -webkit-appearance: none;
  appearance: none;
}

.modern-input:focus {
  border-color: #a8e6cf;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3rpx rgba(168, 230, 207, 0.2);
}

.modern-input::placeholder {
  color: #9ab89a;
  font-weight: 300;
}

.summary-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24rpx;
  padding: 40rpx;
  text-align: center;
  margin-top: auto;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(45, 90, 45, 0.08);
  border: 1rpx solid rgba(168, 230, 207, 0.2);
}

.summary-label {
  font-size: 28rpx;
  color: #7a9c7a;
  margin-bottom: 12rpx;
  font-weight: 400;
}

.summary-amount {
  font-size: 56rpx;
  font-weight: 600;
  color: #2d5a2d;
  letter-spacing: -1rpx;
}

.action-section {
  margin-bottom: 40rpx;
}

.save-btn {
  width: 100%;
  padding: 32rpx;
  background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%);
  border: none;
  border-radius: 24rpx;
  color: white;
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 8rpx 24rpx rgba(168, 230, 207, 0.3);
  opacity: 1;
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(168, 230, 207, 0.2);
}

.save-btn.disabled {
  background: rgba(168, 230, 207, 0.4);
  box-shadow: none;
  transform: none;
  opacity: 0.6;
}

.save-btn .btn-text {
  letter-spacing: 1rpx;
}

.quick-price-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 20rpx;
  justify-content: center;
}

.price-chip {
  background: linear-gradient(135deg, rgba(168, 230, 207, 0.2) 0%, rgba(127, 205, 205, 0.2) 100%);
  border: 1rpx solid rgba(168, 230, 207, 0.4);
  border-radius: 50rpx;
  padding: 16rpx 32rpx;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 12rpx rgba(45, 90, 45, 0.1);
}

.price-chip:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, rgba(168, 230, 207, 0.3) 0%, rgba(127, 205, 205, 0.3) 100%);
  box-shadow: 0 2rpx 8rpx rgba(45, 90, 45, 0.15);
}

.price-chip-text {
  font-size: 28rpx;
  color: #2d5a2d;
  font-weight: 500;
}
</style>