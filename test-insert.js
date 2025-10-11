// Test hardcoded insert to isolate the issue
import { dbManager } from './utils/database.js';

async function testHardcodedInsert() {
    console.log('=== 测试硬编码插入 ===');
    
    const testRecord = {
        date: '2024-10-11',
        quantity: 100,
        unitPrice: 0.75,
        total: 75.00
    };
    
    console.log('测试记录:', JSON.stringify(testRecord));
    
    try {
        const result = await dbManager.insertWorkRecord(testRecord);
        console.log('✅ 硬编码测试插入成功:', result);
    } catch (error) {
        console.error('❌ 硬编码测试失败:', error);
    }
}

// Run the test
testHardcodedInsert();