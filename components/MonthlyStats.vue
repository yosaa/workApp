<template>
  <view class="stats-container" v-if="showStats">
    <view class="stats-card">
      <view class="stats-header">
        <view class="stats-title">本月统计</view>
        <view class="close-btn" @click="closeStats">×</view>
      </view>
      
      <view class="stats-grid">
        <view class="stat-item">
          <view class="stat-label">工作天数</view>
          <view class="stat-value">{{workDays}}</view>
        </view>
        
        <view class="stat-item">
          <view class="stat-label">日均收入</view>
          <view class="stat-value">¥{{dailyAverage}}</view>
        </view>
        
        <view class="stat-item">
          <view class="stat-label">最高日收入</view>
          <view class="stat-value">¥{{maxDaily}}</view>
        </view>
        
        <view class="stat-item">
          <view class="stat-label">总记录数</view>
          <view class="stat-value">{{totalRecords}}</view>
        </view>
      </view>
		  <view class="stat-item">
			<view class="stat-label2">本月1号到10号收入总和</view>
			<view class="stat-value">¥{{total_1_10}}</view>
		  </view>
		  
		  <view class="stat-item">
			<view class="stat-label2">本月11号到21号收入总和</view>
			<view class="stat-value">¥{{total_11_20}}</view>
		  </view>
		  
		  <view class="stat-item">
			<view class="stat-label2">本月21号到月底收入总和</view>
			<view class="stat-value">¥{{total_21_max}}</view>
		  </view>
    </view>
  </view>
</template>

<script>
import { initDatabase, dbManager } from '@/utils/database.js'

export default {
  props: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true
    },
    showStats: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      workDays: 0,
      dailyAverage: 0,
      maxDaily: 0,
      totalRecords: 0,
      total_1_10: 0,
      total_11_20: 0,
      total_21_max: 0,
      dbReady: false
    };
  },
  async mounted() {
    try {
      await initDatabase();
      this.dbReady = true;
    } catch (error) {
      console.warn('数据库初始化失败');
      this.dbReady = true;
    }
  },
  watch: {
    year() {
      this.calculateStats();
    },
    month() {
      this.calculateStats();
    },
    showStats(newVal) {
      if (newVal) {
        this.calculateStats();
      }
    }
  },
  methods: {
    formatAmount(amount) {
      const num = parseFloat(amount);
      if (Number.isInteger(num)) {
        return num.toString();
      }
      return num.toFixed(3).replace(/\.?0+$/, '');
    },
    async calculateStats() {
      console.log('=== 计算本月统计 ===');
      console.log('年份:', this.year, '月份:', this.month);

      try {
        let monthRecords = [];
        
        if (this.dbReady === true) {
          console.log('使用数据库查询');
          const startDate = `${this.year}-${String(this.month).padStart(2, '0')}-01`;
          const lastDay = new Date(this.year, this.month, 0).getDate();
          const endDate = `${this.year}-${String(this.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          
          monthRecords = await dbManager.getWorkRecordsByDateRange(startDate, endDate);
        } else {
          console.log('数据库不可用');
          monthRecords = [];
        }
        
        console.log('本月记录数:', monthRecords.length);

        // 按日期分组
        const dailyGroups = {};
        monthRecords.forEach(record => {
          const date = record.date;
          if (!dailyGroups[date]) {
            dailyGroups[date] = [];
          }
          dailyGroups[date].push(record);
        });
        
        this.workDays = Object.keys(dailyGroups).length;
        this.totalRecords = monthRecords.length;
        
        // 计算每日收入
        const dailyIncomes = Object.values(dailyGroups).map(records => 
          records.reduce((sum, record) => sum + parseFloat(record.total || 0), 0)
        );
        
        if (dailyIncomes.length > 0) {
          const totalIncome = dailyIncomes.reduce((sum, income) => sum + income, 0);
          this.dailyAverage = this.formatAmount(totalIncome / dailyIncomes.length);
          this.maxDaily = this.formatAmount(Math.max(...dailyIncomes));
        } else {
          this.dailyAverage = '0';
          this.maxDaily = '0';
        }
        
        // 计算1-10号、11-20号、21-max号的收入总和
        const dailyIncomesByDate = {};
        Object.entries(dailyGroups).forEach(([date, records]) => {
          const day = parseInt(date.split('-')[2]);
          const dailyTotal = records.reduce((sum, record) => sum + parseFloat(record.total || 0), 0);
          dailyIncomesByDate[day] = dailyTotal;
        });
        
        this.total_1_10 = 0;
        this.total_11_20 = 0;
        this.total_21_max = 0;
        
        Object.entries(dailyIncomesByDate).forEach(([day, income]) => {
          const dayNum = parseInt(day);
          if (dayNum >= 1 && dayNum <= 10) {
            this.total_1_10 += income;
          } else if (dayNum >= 11 && dayNum <= 20) {
            this.total_11_20 += income;
          } else if (dayNum >= 21) {
            this.total_21_max += income;
          }
        });
        
        this.total_1_10 = this.formatAmount(this.total_1_10);
        this.total_11_20 = this.formatAmount(this.total_11_20);
        this.total_21_max = this.formatAmount(this.total_21_max);
        
        console.log('统计结果:', {
          workDays: this.workDays,
          totalRecords: this.totalRecords,
          dailyAverage: this.dailyAverage,
          maxDaily: this.maxDaily,
          total_1_10: this.total_1_10,
          total_11_20: this.total_11_20,
          total_21_max: this.total_21_max
        });
        
      } catch (error) {
        console.error('计算统计失败:', error);
        // 重置为0
        this.workDays = 0;
        this.dailyAverage = '0';
        this.maxDaily = '0';
        this.totalRecords = 0;
        this.total_1_10 = '0';
        this.total_11_20 = '0';
        this.total_21_max = '0';
      }
    },
    closeStats() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.stats-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.stats-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 25rpx;
  padding: 40rpx;
  width: 90%;
  max-width: 600rpx;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
}

.stats-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #2c3e50;
}

.close-btn {
  font-size: 48rpx;
  color: #7f8c8d;
  cursor: pointer;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.9);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30rpx;
}

.stat-item {
  background: rgba(255, 255, 255, 0.5);
  padding: 30rpx;
  border-radius: 15rpx;
  text-align: center;
}

.stat-label {
  font-size: 24rpx;
  color: #7f8c8d;
  margin-bottom: 10rpx;
}

.stat-label2 {
  font-size: 35rpx;
  color: #7f8c8d;
  margin-bottom: 10rpx;
}
.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #27ae60;
}
</style>