// 使用 uni-app 官方 SQLite API 实现
class DatabaseManager {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async initDatabase() {
    return new Promise((resolve, reject) => {
      if (typeof plus === 'undefined' || !plus.sqlite || !plus.sqlite.openDatabase) {
        this.isReady = false;
        resolve();
        return;
      }

      plus.sqlite.closeDatabase({
        name: 'workApp',
        success: () => this.openDatabase(resolve, reject),
        fail: () => this.openDatabase(resolve, reject)
      });
    });
  }

  openDatabase(resolve, reject) {
    plus.sqlite.openDatabase({
      name: 'workApp',
      path: '_doc/workApp.db',
      success: () => {
        this.db = plus.sqlite;
        this.isReady = true;
        this.createTables().then(resolve).catch(() => {
          this.isReady = false;
          resolve();
        });
      },
      fail: (error) => {
        if (error.code === -1402) {
          this.db = plus.sqlite;
          this.isReady = true;
          this.createTables().then(resolve).catch(() => {
            this.isReady = false;
            resolve();
          });
          return;
        }
        this.isReady = false;
        resolve();
      }
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('数据库未连接'));
        return;
      }

      const checkTableSQL = `SELECT name FROM sqlite_master WHERE type='table' AND name='work_records'`;

      plus.sqlite.selectSql({
        name: 'workApp',
        sql: checkTableSQL,
        success: (result) => {
          if (result.length > 0) {
            resolve();
            return;
          }

          const createTableSQL = `
            CREATE TABLE work_records (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL,
              quantity REAL NOT NULL,
              unit_price REAL NOT NULL,
              total REAL NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `;

          plus.sqlite.executeSql({
            name: 'workApp',
            sql: createTableSQL,
            success: resolve,
            fail: reject
          });
        },
        fail: reject
      });
    });
  }

async insertWorkRecord(record) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('数据库未初始化，无法保存记录'));
        return;
      }

      // 验证数据
      console.log('=== DEBUG: database.js insertWorkRecord ===');
      
      if (!record.date || record.date === null || record.date === undefined || record.date === '') {
        reject(new Error('日期不能为空'));
        return;
      }
      
      // 验证日期格式
      const dateStr = record.date.toString();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        reject(new Error('日期格式必须为YYYY-MM-DD'));
        return;
      }
      
      if (record.quantity === undefined || record.quantity === null || isNaN(record.quantity)) {
        reject(new Error('数量不能为空且必须为数字'));
        return;
      }
      
      if (record.unitPrice === undefined || record.unitPrice === null || isNaN(record.unitPrice)) {
        reject(new Error('单价不能为空且必须为数字'));
        return;
      }
      
      if (record.total === undefined || record.total === null || isNaN(record.total)) {
        reject(new Error('总金额不能为空且必须为数字'));
        return;
      }

      
      // 确保日期不为空且格式正确
      const safeDate = dateStr && dateStr.trim() !== '' ? dateStr : '2024-01-01';
      const safeQuantity = parseFloat(record.quantity);
      const safeUnitPrice = parseFloat(record.unitPrice);
      const safeTotal = parseFloat(record.total);
      
      console.log('安全值:', {safeDate, safeQuantity, safeUnitPrice, safeTotal});
      
      // 绝对安全检查
      if (isNaN(safeQuantity) || safeQuantity <= 0) {
        reject(new Error('数量必须为正数'));
        return;
      }
      
      if (isNaN(safeUnitPrice) || safeUnitPrice <= 0) {
        reject(new Error('单价必须为正数'));
        return;
      }
      
      if (isNaN(safeTotal) || safeTotal <= 0) {
        reject(new Error('总金额必须为正数'));
        return;
      }

      // 使用直接字符串拼接测试，排除参数绑定问题
      const directSQL = `INSERT INTO work_records (date, quantity, unit_price, total) VALUES ('${safeDate}', ${safeQuantity}, ${safeUnitPrice}, ${safeTotal})`;
      console.log('直接SQL:', directSQL);
      
      plus.sqlite.executeSql({
        name: 'workApp',
        sql: directSQL,
        success: (result) => {
          console.log('✓ 记录保存成功，ID:', result.insertId);
          resolve(result.insertId);
        },
        fail: (error) => {
          console.error('✗ 保存记录失败:', error);
          console.error('错误详情:', error.code, error.message);
          console.error('失败SQL:', directSQL);
          
          // 如果直接SQL也失败，检查表状态
          this.debugTableState().then(() => {
            reject(error);
          }).catch(() => {
            reject(error);
          });
        }
      });
    });
  }

async getAllWorkRecords() {
  return new Promise((resolve, reject) => {
    console.log('=== 查询所有记录 ===');
    const cachedRecords = uni.getStorageSync('workRecords') || [];

    const sql = `SELECT * FROM work_records ORDER BY date DESC, created_at DESC`;
    console.log('执行 SQL:', sql);
    plus.sqlite.selectSql({
      name: 'workApp',
      sql: sql,
      success: (result) => {
        // console.log('数据库查询结果:', JSON.stringify(result));
        const records = result.map(row => ({
          id: row.id,
          date: row.date,
          quantity: row.quantity,
          unitPrice: row.unit_price,
          total: row.total,
          createdAt: row.created_at
        }));
        console.log('转换后的记录:', JSON.stringify(records));
        resolve(records);
      },
      fail: (error) => {
        console.error('查询记录失败:', error);
        resolve(cachedRecords);
      }
    });
  });
}

  async getWorkRecordsByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('数据库未初始化'));
        return;
      }

const sql = `SELECT * FROM work_records WHERE date BETWEEN '${startDate}' AND '${endDate}' ORDER BY date DESC`;


		plus.sqlite.selectSql({
		  name: 'workApp',
		  sql: sql,
		  values: [startDate, endDate],
		  success: (result) => {
			console.log("查询结果:", result);  // 打印查询结果
			const records = result.map(row => ({
			  id: row.id,
			  date: row.date,
			  quantity: row.quantity,
			  unitPrice: row.unit_price,
			  total: row.total
			}));
			resolve(records);
		  },
		  fail: reject
		});

    });
  }

  async getStatistics() {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const sql = `
        SELECT 
          COUNT(*) as total_records,
          SUM(quantity) as total_quantity,
          SUM(total) as total_amount,
          AVG(unit_price) as avg_price
        FROM work_records
      `;

      plus.sqlite.selectSql({
        name: 'workApp',
        sql: sql,
        success: (result) => {
          if (result.length > 0) {
            const row = result[0];
            resolve({
              totalRecords: row.total_records || 0,
              totalQuantity: row.total_quantity || 0,
              totalAmount: row.total_amount || 0,
              avgPrice: row.avg_price || 0
            });
          } else {
            resolve({
              totalRecords: 0,
              totalQuantity: 0,
              totalAmount: 0,
              avgPrice: 0
            });
          }
        },
        fail: reject
      });
    });
  }

async deleteWorkRecord(id) {
  return new Promise(async (resolve, reject) => {
    console.log('=== 开始删除记录 ID:', id, '类型:', typeof id);
    if (!this.isReady) {
      console.error('数据库未初始化');
      reject(new Error('数据库未初始化'));
      return;
    }
    const safeId = Number(id);
    if (!Number.isInteger(safeId) || safeId <= 0) {
      console.error('无效的 ID:', id);
      reject(new Error(`无效的 ID: ${id}`));
      return;
    }
    try {
      await this.debugTableData();
      console.log('数据库路径:', plus.io.convertLocalFileSystemURL('_doc/workApp.db'));
      plus.sqlite.transaction({
        name: 'workApp',
        operation: 'begin',
        success: () => {
          console.log('事务开始');
          const checkSql = `SELECT id FROM work_records WHERE id = ${safeId}`; // 硬编码
          console.log('检查 SQL:', checkSql);
          plus.sqlite.selectSql({
            name: 'workApp',
            sql: checkSql,
            success: (result) => {
              console.log('检查结果:', JSON.stringify(result));
              if (result.length === 0) {
                console.log(`记录 ID ${safeId} 不存在`);
                plus.sqlite.transaction({
                  name: 'workApp',
                  operation: 'commit',
                  success: () => {
                    console.log('事务提交：记录不存在');
                    resolve(0);
                  },
                  fail: (error) => {
                    console.error('提交事务失败:', error);
                    reject(error);
                  }
                });
                return;
              }
              const sql = `DELETE FROM work_records WHERE id = ${safeId}`; // 硬编码
              console.log('删除 SQL:', sql);
              plus.sqlite.executeSql({
                name: 'workApp',
                sql: sql,
                success: (result) => {
                  console.log('删除结果:', JSON.stringify(result));
                  const rowsAffected = result.rowsAffected || 0;
                  console.log('✓ 记录删除成功，影响行数:', rowsAffected);
                  plus.sqlite.selectSql({
                    name: 'workApp',
                    sql: `SELECT id FROM work_records WHERE id = ${safeId}`,
                    success: (checkResult) => {
                      console.log('删除后检查:', JSON.stringify(checkResult));
                      plus.sqlite.transaction({
                        name: 'workApp',
                        operation: 'commit',
                        success: () => {
                          console.log('事务提交：删除完成');
                          if (rowsAffected > 0) {
                            const cachedRecords = uni.getStorageSync('workRecords') || [];
                            const updatedRecords = cachedRecords.filter(record => record.id !== safeId);
                            uni.setStorageSync('workRecords', updatedRecords);
                            console.log('缓存已更新:', JSON.stringify(updatedRecords));
                          }
                          resolve(rowsAffected);
                        },
                        fail: (error) => {
                          console.error('提交事务失败:', error);
                          reject(error);
                        }
                      });
                    },
                    fail: (error) => {
                      console.error('删除后检查失败:', error);
                      reject(error);
                    }
                  });
                },
                fail: (error) => {
                  console.error('✗ 删除记录失败:', error);
                  plus.sqlite.transaction({
                    name: 'workApp',
                    operation: 'rollback',
                    success: () => {
                      console.log('事务回滚');
                      reject(error);
                    },
                    fail: (rollbackError) => {
                      console.error('回滚事务失败:', rollbackError);
                      reject(rollbackError);
                    }
                  });
                }
              });
            },
            fail: (error) => {
              console.error('检查记录失败:', error);
              plus.sqlite.transaction({
                name: 'workApp',
                operation: 'rollback',
                success: () => {
                  console.log('事务回滚');
                  reject(error);
                },
                fail: (rollbackError) => {
                  console.error('回滚事务失败:', rollbackError);
                  reject(rollbackError);
                }
              });
            }
          });
        },
        fail: (error) => {
          console.error('开启事务失败:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('删除操作异常:', error);
      reject(error);
    }
  });
}
  
  async debugTableData() {
    return new Promise((resolve, reject) => {
      console.log('=== 调试数据库内容 ===');
      const sql = `SELECT * FROM work_records`;
      plus.sqlite.selectSql({
        name: 'workApp',
        sql: sql,
        success: (result) => {
          console.log('数据库中所有记录:', JSON.stringify(result));
          resolve(result);
        },
        fail: (error) => {
          console.error('查询所有记录失败:', error);
          reject(error);
        }
      });
    });
  }

  async updateWorkRecord(id, record) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const sql = `UPDATE work_records SET date = ?, quantity = ?, unit_price = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const values = [record.date, record.quantity, record.unitPrice, record.total, id];

      plus.sqlite.executeSql({
        name: 'workApp',
        sql: sql,
        values: values,
        success: () => resolve(),
        fail: reject
      });
    });
  }

  isInitialized() {
    return this.isReady;
  }

  async migrateFromCache() {
    return new Promise(async (resolve, reject) => {
      if (!this.isInitialized()) {
        resolve(0);
        return;
      }

      try {
        const oldRecords = uni.getStorageSync('workRecords') || [];
        if (oldRecords.length === 0) {
          resolve(0);
          return;
        }

        let migratedCount = 0;
        for (const record of oldRecords) {
          try {
            await this.insertWorkRecord({
              date: record.date,
              quantity: record.quantity,
              unitPrice: record.unitPrice,
              total: record.total
            });
            migratedCount++;
          } catch {}
        }
        resolve(migratedCount);
      } catch (error) {
        reject(error);
      }
    });
  }

  clearCache() {
    uni.removeStorageSync('workRecords');
  }
  
  async test(){
	  return new Promise((resolve, reject) => {
	    if (!this.isReady) {
	      reject(new Error('数据库未初始化'));
	      return;
	    }
	  
	    const sql = `SELECT * FROM work_records WHERE date >= '2025-10-01' AND date <= '2025-10-31';`;
	  
	    plus.sqlite.selectSql({ 
	      name: 'workApp',
	      sql: sql,
	      success: (result) => {
	        const records = result.map(row => ({
	          id: row.id,
	          date: row.date,
	          quantity: row.quantity,
	          unitPrice: row.unit_price,
	          total: row.total
	        }));
	        resolve(records);
	      },
	      fail: reject
	    });
	  });
  }
}



const dbManager = new DatabaseManager();

async function initDatabase() {
  return new Promise((resolve) => {
    if (typeof plus === 'undefined' || !plus.sqlite) {
      resolve();
      return;
    }

    dbManager.initDatabase().then(() => {
      dbManager.migrateFromCache().then((count) => {
        if (count > 0) {
          dbManager.clearCache();
        }
        resolve();
      }).catch(resolve);
    }).catch(resolve);
  });
}

export { dbManager, initDatabase };