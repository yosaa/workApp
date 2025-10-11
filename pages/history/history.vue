<template>
	<view class="container">
		<view class="glass-card">
			<view class="header">
				<view class="title">历史记录</view>
			</view>
			
			<view class="filter-section">
				<view class="filter-mode">
					<view class="mode-btn" :class="{active: filterMode === 'year'}" @click="setFilterMode('year')">
						年度查看
					</view>
					<view class="mode-btn" :class="{active: filterMode === 'month'}" @click="setFilterMode('month')">
						月度查看
					</view>
				</view>
				
				<view class="filter-row">
					<picker v-if="filterMode === 'year'" mode="date" fields="year" :value="selectedYear.toString()" @change="onYearChange">
						<view class="picker-btn">{{selectedYear}}年</view>
					</picker>
					<template v-else>
						<picker mode="date" fields="year" :value="selectedYear.toString()" @change="onYearChange">
							<view class="picker-btn">{{selectedYear}}年</view>
						</picker>
						<picker mode="date" fields="month" :value="selectedMonth.toString()" @change="onMonthChange">
							<view class="picker-btn">{{selectedMonth}}月</view>
						</picker>
					</template>
				</view>
				<view class="total-display">{{filterMode === 'year' ? selectedYear + '年' : selectedYear + '年' + selectedMonth + '月'}}总收入：¥{{currentTotal}}</view>
			</view>
			
			<scroll-view class="records-list" scroll-y="true">
				<view v-for="(group, date) in groupedRecords" :key="date" class="record-group">
					<view class="date-header">
						<view class="date">{{formatDate(date)}}</view>
						<view class="day-total">当日总金额：¥{{getDayTotal(group)}}</view>
					</view>
					
					<view v-for="record in group" :key="record.id" class="record-item-container">
						<view class="record-item">
							<view class="record-content">
								<view class="record-header">
									<view class="header-item">数量</view>
									<view class="header-item">单价</view>
									<view class="header-item">总和</view>
								</view>
								<view class="record-data">
									<view class="data-item">{{record.quantity}}</view>
									<view class="data-item">¥{{formatAmount(record.unitPrice)}}</view>
									<view class="data-item">¥{{formatAmount(record.total)}}</view>
								</view>
							</view>
							<button class="delete-btn" @click="confirmDelete(record.id)">删除</button>
						</view>
					</view>
					<view class="divider"></view>
				</view>
				
				<view v-if="Object.keys(groupedRecords).length === 0" class="empty-state">
					<view class="empty-text">{{loading ? '加载中...' : '暂无记录'}}</view>
				</view>
			</scroll-view>
			
			<view class="header">
				<button class="back-btn" @click="goBack">←</button>
				<view class="title">历史记录</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { dbManager, initDatabase } from '@/utils/database.js'
	
	export default {
		data() {
			return {
				filterMode: 'month', // 'year' 或 'month'
				selectedYear: new Date().getFullYear(),
				selectedMonth: new Date().getMonth() + 1,
				allRecords: [],
				currentTotal: 0,
				dbReady: false,
				loading: false
			}
		},
		computed: {
			groupedRecords() {
				const groups = {};
				this.allRecords.forEach(record => {
					const date = record.date;
					if (!groups[date]) {
						groups[date] = [];
					}
					groups[date].push(record);
				});
				
				// 按日期降序排序
				const sortedGroups = {};
				Object.keys(groups)
					.sort((a, b) => new Date(b) - new Date(a))
					.forEach(date => {
						sortedGroups[date] = groups[date];
					});
				
				return sortedGroups;
			}
		},
		watch: {
			selectedYear() {
				this.loadRecords();
			},
			selectedMonth() {
				this.loadRecords();
			},
			filterMode() {
				this.loadRecords();
			}
		},
		onLoad() {
			initDatabase().then(() => {
				this.dbReady = true;
				this.loadRecords();
			}).catch(error => {
				console.error('Database initialization failed:', error);
				// 数据库初始化失败，显示空数据
				this.allRecords = [];
			});
		},
		onShow() {
			this.loadRecords();
		},
		methods: {
			formatAmount(amount) {
				const num = parseFloat(amount);
				if (Number.isInteger(num)) {
					return num.toString();
				}
				return num.toFixed(3).replace(/\.?0+$/, '');
			},
			async loadRecords() {
				console.log('=== 加载历史记录 ===');
				
				if (!this.dbReady) {
					console.log('数据库未就绪');
					this.allRecords = [];
					this.currentTotal = 0;
					return;
				}

				try {
					this.loading = true;
					
					// 根据当前筛选模式获取日期范围
					let startDate, endDate;
					if (this.filterMode === 'year') {
						startDate = `${this.selectedYear}-01-01`;
						endDate = `${this.selectedYear}-12-31`;
					} else {
						// 获取月份的天数
						const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
						startDate = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-01`;
						endDate = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-${daysInMonth}`;
					}
					
					console.log('查询日期范围:', startDate, '至', endDate);
					
					// 使用数据库的日期范围查询
					const records = await dbManager.getWorkRecordsByDateRange(startDate, endDate);
					console.log('查询完成，记录数量:', records.length);
					
					this.allRecords = records;
					this.calculateCurrentTotal();
					this.loading = false;
				} catch (error) {
					console.error('Error loading records:', error);
					this.allRecords = [];
					this.currentTotal = 0;
					this.loading = false;
				}
			},
			calculateCurrentTotal() {
				console.log('=== 计算当前总计 ===');
				console.log('当前记录数量:', this.allRecords.length, '条');
				
				const total = this.allRecords.reduce((sum, record) => {
					return sum + parseFloat(record.total);
				}, 0);
				
				this.currentTotal = this.formatAmount(total);
				console.log('计算出的总计:', this.currentTotal);
			},
			onYearChange(e) {
				this.selectedYear = parseInt(e.detail.value);
			},
			onMonthChange(e) {
				this.selectedMonth = parseInt(e.detail.value.split('-')[1]);
			},
			formatDate(dateStr) {
				const date = new Date(dateStr);
				const month = date.getMonth() + 1;
				const day = date.getDate();
				return `${month}月${day}日`;
			},
			getDayTotal(records) {
				return this.formatAmount(records.reduce((sum, record) => sum + parseFloat(record.total), 0));
			},
			confirmDelete(recordId) {
				uni.showModal({
					title: '确认删除',
					content: '确定要删除这条记录吗？',
					success: (res) => {
						if (res.confirm) {
							this.deleteRecord(recordId);
						}
					}
				});
			},
			async deleteRecord(recordId) {
				console.log('=== 删除记录 ===');

				try {
					console.log('调用数据库删除...');
					await dbManager.deleteWorkRecord(recordId);
					console.log('数据库删除成功，重新加载记录...');
					await this.loadRecords();
					
					uni.showToast({
						title: '删除成功',
						icon: 'success',
						duration: 1500
					});
				} catch (error) {
					console.error('删除记录失败:', error);
					console.error('错误详情:', error.message);
					
					uni.showToast({
						title: '删除失败',
						icon: 'none',
						duration: 2000
					});
				}
			},
			setFilterMode(mode) {
				this.filterMode = mode;
			},
			goBack() {
				uni.navigateBack();
			}
		}
	}
</script>

<style>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
		padding: calc(env(safe-area-inset-top) + 60rpx) 0 calc(env(safe-area-inset-bottom) + 40rpx);
		display: flex;
		flex-direction: column;
	}

	.glass-card {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 0;
		padding: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		box-shadow: none;
		border: none;
	}

	.header {
		padding: 30rpx 40rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1rpx solid rgba(45, 90, 45, 0.1);
		background: rgba(255, 255, 255, 0.6);
	}

	.title {
		font-size: 40rpx;
		font-weight: 500;
		color: #2d5a2d;
		letter-spacing: 1rpx;
	}

	.filter-section {
		padding: 40rpx;
		background: rgba(255, 255, 255, 0.6);
		border-bottom: 1rpx solid rgba(45, 90, 45, 0.1);
	}

	.filter-mode {
		display: flex;
		justify-content: center;
		gap: 20rpx;
		margin-bottom: 30rpx;
	}

	.mode-btn {
		padding: 20rpx 40rpx;
		background: rgba(255, 255, 255, 0.7);
		border-radius: 25rpx;
		font-size: 28rpx;
		color: #2d5a2d;
		border: 2rpx solid rgba(168, 230, 207, 0.3);
		transition: all 0.3s ease;
		cursor: pointer;
	}

	.mode-btn.active {
		background: linear-gradient(135deg, #2d5a2d 0%, #4a7c4a 100%);
		color: white;
		border-color: #2d5a2d;
		box-shadow: 0 4rpx 12rpx rgba(45, 90, 45, 0.2);
	}

	.mode-btn:active {
		transform: scale(0.95);
	}

	.filter-row {
		display: flex;
		justify-content: center;
		gap: 30rpx;
		margin-bottom: 30rpx;
	}

	.picker-btn {
		padding: 20rpx 40rpx;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 20rpx;
		font-size: 28rpx;
		color: #2d5a2d;
		border: 1rpx solid rgba(168, 230, 207, 0.3);
		transition: all 0.3s ease;
	}

	.picker-btn:active {
		transform: scale(0.98);
		background: rgba(255, 255, 255, 0.95);
	}

	.total-display {
		text-align: center;
		font-size: 36rpx;
		font-weight: 600;
		color: #2d5a2d;
		margin-top: 20rpx;
	}

	.records-list {
		flex: 1;
		overflow-y: auto;
		padding: 20rpx;
	}

	.record-group {
		margin-bottom: 30rpx;
		width: 100%;
		box-sizing: border-box;
	}

	.date-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.4);
		padding: 20rpx;
		border-radius: 15rpx;
		margin-bottom: 20rpx;
		gap: 20rpx;
		overflow: hidden;
		width: 90%;
		box-sizing: border-box;
	}

	.date {
		font-size: 30rpx;
		font-weight: bold;
		color: #2c3e50;
	}

	.day-total {
		font-size: 26rpx;
		color: #27ae60;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 50%;
	}

	.record-item-container {
		position: relative;
		overflow: hidden;
		margin-bottom: 20rpx;
		width: 100%;
		box-sizing: border-box;
	}
 
	.record-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 255, 255, 0.9);
		padding: 20rpx;
		border-radius: 16rpx;
		box-shadow: 0 3rpx 12rpx rgba(45, 90, 45, 0.08);
		border: 1rpx solid rgba(168, 230, 207, 0.2);
		transition: transform 0.3s ease;
		width: 90%;
		box-sizing: border-box;
	}

	.record-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		min-width: 0;
		overflow: hidden;
	}

	.record-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-item {
		font-size: 22rpx;
		color: #7f8c8d;
		font-weight: 500;
		flex: 1;
		text-align: center;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.record-data {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 4rpx;
	}

	.data-item {
		font-size: 28rpx;
		font-weight: 600;
		color: #2c3e50;
		flex: 1;
		text-align: center;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.data-item:last-child {
		font-weight: bold;
		color: #27ae60;
	}

	.delete-btn {
		background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
		color: white;
		border: none;
		border-radius: 16rpx;
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		font-weight: 500;
		transition: all 0.3s ease;
		box-shadow: 0 2rpx 8rpx rgba(255, 154, 158, 0.3);
		margin-left: 16rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-btn:active {
		transform: scale(0.95);
	}

	.divider {
		height: 1rpx;
		background: rgba(255, 255, 255, 0.3);
		margin: 15rpx 0;
	}

	.empty-state {
		text-align: center;
		padding: 100rpx 0;
	}

	.empty-text {
		font-size: 32rpx;
		color: #7f8c8d;
	}

	.back-btn {
		background: none;
		border: none;
		font-size: 48rpx;
		color: #2d5a2d;
		padding: 0;
		margin-right: 30rpx;
		line-height: 1;
	}
</style>