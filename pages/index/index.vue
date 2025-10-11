<template>
	<view class="container">
		<view class="safe-area">
			<view class="header-section">
				<view class="title">工作记录</view>
				<view class="subtitle">{{currentYear}}年 {{currentMonth}}月</view>
			</view>

			<view class="main-card">
				<view class="amount-display">
					<view class="label">本月收入</view>
					<view class="amount">¥{{totalIncome}}</view>
				</view>
			</view>

			<view class="action-grid">
				<view class="action-item primary" @click="goToRecord">
					<view class="icon">✏️</view>
					<view class="text">记录</view>
				</view>
				
				<view class="action-item secondary" @click="goToHistory">
					<view class="icon">📊</view>
					<view class="text">历史</view>
				</view>
				
				<view class="action-item accent" @click="showStats = true">
					<view class="icon">📈</view>
					<view class="text">统计</view>
				</view>
				<view class="action-item accent" @click="testDemo">
					<view class="text">其他说明</view>
				</view>
			</view>
		</view>

		<MonthlyStats 
			:year="currentYear" 
			:month="currentMonth" 
			:show-stats="showStats"
			@close="showStats = false"
		/>
	</view>
</template>
<script> 
  import MonthlyStats from '@/components/MonthlyStats.vue'
  import { dbManager, initDatabase } from '@/utils/database.js'
  
  export default {
    components: {
      MonthlyStats
    },
    data() {
      return {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1,
        totalIncome: 0,
        showStats: false,
        dbReady: false
      }
    },
    onLoad() {
      // 初始化数据库
      initDatabase().then(() => {
        this.dbReady = true;
        this.loadData(); // 在数据库初始化完成后立刻加载数据
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
    onShow() {
      console.log('=== 主页显示 ===');
      this.calculateTotalIncome(); // 确保每次显示时都重新计算收入
    },
    methods: {
      formatAmount(amount) {
        const num = parseFloat(amount);
        if (Number.isInteger(num)) {
          return num.toString();
        }
        return num.toFixed(3).replace(/\.?0+$/, '');
      },
      async loadData() {
        if (!this.dbReady) {
          console.log('数据库未就绪');
          this.totalIncome = '0';
          return;
        }

        try {
		  // 获取当前年月
			const startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`.trim();
			const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
			const endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`.trim();

			// 确保 endDate 不包含时间部分
			console.log("startDate:", startDate);  // 应为 2025-10-01
			console.log("endDate:", endDate);      // 应为 2025-10-31

			// 执行查询
			const records = await dbManager.getWorkRecordsByDateRange(startDate, endDate);

		  console.log("查询到的记录是：", JSON.stringify(records));

		  const total = records.reduce((sum, record) => {
			return sum + parseFloat(record.total || 0);
		  }, 0);

		  this.totalIncome = this.formatAmount(total);
          console.log('本月总收入:', this.totalIncome);

        } catch (error) {
          console.error('计算本月收入失败:', error);
          this.totalIncome = '0';
        }
      },
      calculateTotalIncome() {
        // 重新计算总收入
        this.loadData(); 
      },
      goToRecord() { 
        uni.navigateTo({
          url: '/pages/record/record'
        });
      },
      goToHistory() { 
        uni.navigateTo({
          url: '/pages/history/history'
        });
      },
	  async testDemo(){
		  // const res = await dbManager.test()
		  // console.log("测试返回原始结果" , res)
		  // console.log("测试返回结果" ,  JSON.stringify(res))
		  // 触发弹出气泡提示
		  uni.showToast({
		    title: '本产品仅作为测试供内部使用\n\n如需新增功能请联系 金兰芝女士',
		    icon: 'none',    // 图标类型，可以是 'success', 'loading', 'none'
		    duration: 4000   // 持续时间，单位是毫秒，默认为 1500ms
		  });

	  }
    }
  }
</script>


<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
		padding: calc(env(safe-area-inset-top) + 60rpx) 40rpx calc(env(safe-area-inset-bottom) + 40rpx);
		display: flex;
		flex-direction: column;
	}

	.safe-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding-top: 60rpx;
	}

	.header-section {
		text-align: center;
		margin-bottom: 80rpx;
	}

	.title {
		font-size: 60rpx;
		font-weight: 300;
		color: #2d5a2d;
		margin-bottom: 16rpx;
		letter-spacing: 2rpx;
	}

	.subtitle {
		font-size: 32rpx;
		color: #7a9c7a;
		font-weight: 300;
	}

	.main-card {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 32rpx;
		padding: 60rpx 40rpx;
		margin-bottom: 60rpx;
		box-shadow: 0 20rpx 60rpx rgba(45, 90, 45, 0.08);
		border: 1rpx solid rgba(255, 255, 255, 0.8);
	}

	.amount-display {
		text-align: center;
	}

	.amount-display .label {
		font-size: 28rpx;
		color: #7a9c7a;
		margin-bottom: 16rpx;
		font-weight: 300;
	}

	.amount-display .amount {
		font-size: 80rpx;
		font-weight: 600;
		color: #2d5a2d;
		letter-spacing: -2rpx;
	}

	.action-grid {
		display: flex;
		flex-direction: column;
		gap: 40rpx;
		/* margin-top: auto; */
		padding-bottom: 40rpx;
		width: 100%;
		max-width: 600rpx;
		align-self: center;
	}

	.action-item {
		background: rgba(255, 255, 255, 0.9);
		border-radius: 24rpx;
		padding: 40rpx 20rpx;
		text-align: center;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
		border: 1rpx solid rgba(255, 255, 255, 0.6);
	}

	.action-item.primary {
		background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%);
	}

	.action-item.secondary {
		background: linear-gradient(135deg, #b0e0e6 0%, #87ceeb 100%);
	}

	.action-item.accent {
		background: linear-gradient(135deg, #fdf5e6 0%, #f5e6d3 100%);
	}

	.action-item:active {
		transform: scale(0.95);
	}

	.action-item .icon {
		font-size: 48rpx;
		margin-bottom: 16rpx;
		display: block;
	}

	.action-item .text {
		font-size: 38rpx;
		font-weight: 500;
		color: #2d5a2d;
	}

	.action-item.secondary .text {
		color: #4682b4;
	}

	.action-item.accent .text {
		color: #8b7355;
	}
</style>
