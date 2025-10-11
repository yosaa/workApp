// Test database functionality
const { dbManager, initDatabase } = require('./utils/database.js');

async function testDatabase() {
    console.log('🧪 Starting database tests...');
    
    try {
        // Test 1: Database initialization
        console.log('📋 Test 1: Database initialization');
        await initDatabase();
        console.log('✅ Database initialized successfully');
        
        // Test 2: Insert valid record
        console.log('📋 Test 2: Insert valid record');
        const testRecord = {
            date: '2024-10-11',
            quantity: 100,
            unitPrice: 0.75,
            total: 75.00
        };
        
        const insertedId = await dbManager.insertWorkRecord(testRecord);
        console.log('✅ Record inserted with ID:', insertedId);
        
        // Test 3: Query all records
        console.log('📋 Test 3: Query all records');
        const allRecords = await dbManager.getAllWorkRecords();
        console.log('✅ Found', allRecords.length, 'records');
        
        // Test 4: Query by date range
        console.log('📋 Test 4: Query by date range');
        const dateRangeRecords = await dbManager.getWorkRecordsByDateRange('2024-10-01', '2024-10-31');
        console.log('✅ Found', dateRangeRecords.length, 'records in October 2024');
        
        // Test 5: Get statistics
        console.log('📋 Test 5: Get statistics');
        const stats = await dbManager.getStatistics();
        console.log('✅ Statistics:', stats);
        
        // Test 6: Update record
        console.log('📋 Test 6: Update record');
        const updatedRecord = {
            date: '2024-10-11',
            quantity: 150,
            unitPrice: 0.80,
            total: 120.00
        };
        await dbManager.updateWorkRecord(insertedId, updatedRecord);
        console.log('✅ Record updated successfully');
        
        // Test 7: Delete record
        console.log('📋 Test 7: Delete record');
        await dbManager.deleteWorkRecord(insertedId);
        console.log('✅ Record deleted successfully');
        
        console.log('🎉 All database tests passed!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        throw error;
    }
}

// Run tests if called directly
if (require.main === module) {
    testDatabase().catch(console.error);
}

module.exports = { testDatabase };