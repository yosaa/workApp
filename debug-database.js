// 独立的数据库调试脚本
import { dbManager, initDatabase } from './utils/database.js';

async function debugDatabase() {
    console.log('=== 数据库调试开始 ===');
    
    try {
        // 初始化数据库
        await initDatabase();
        console.log('数据库初始化完成');
        
        // 检查数据库状态
        console.log('数据库就绪状态:', dbManager.isInitialized());
        
        // 调试表状态
        await dbManager.debugTableState();
        
        // 尝试插入测试数据
        const testRecord = {
            date: '2025-10-11',
            quantity: 100,
            unitPrice: 0.85,
            total: 85
        };
        
        console.log('准备插入测试数据:', testRecord);
        const result = await dbManager.insertWorkRecord(testRecord);
        console.log('测试插入成功，ID:', result);
        
        // 查询所有记录
        const records = await dbManager.getAllWorkRecords();
        console.log('所有记录:', records);
        
        console.log('=== 数据库调试完成 ===');
        
    } catch (error) {
        console.error('数据库调试失败:', error);
        console.error('错误详情:', error.message);
    }
}

// 运行调试
debugDatabase();