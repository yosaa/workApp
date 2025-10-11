if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  class DatabaseManager {
    constructor() {
      this.db = null;
      this.isReady = false;
    }
    async initDatabase() {
      return new Promise((resolve, reject) => {
        if (typeof plus === "undefined" || !plus.sqlite || !plus.sqlite.openDatabase) {
          this.isReady = false;
          resolve();
          return;
        }
        plus.sqlite.closeDatabase({
          name: "workApp",
          success: () => this.openDatabase(resolve, reject),
          fail: () => this.openDatabase(resolve, reject)
        });
      });
    }
    openDatabase(resolve, reject) {
      plus.sqlite.openDatabase({
        name: "workApp",
        path: "_doc/workApp.db",
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
          reject(new Error("数据库未连接"));
          return;
        }
        const checkTableSQL = `SELECT name FROM sqlite_master WHERE type='table' AND name='work_records'`;
        plus.sqlite.selectSql({
          name: "workApp",
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
              name: "workApp",
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
          reject(new Error("数据库未初始化，无法保存记录"));
          return;
        }
        formatAppLog("log", "at utils/database.js:102", "=== DEBUG: database.js insertWorkRecord ===");
        if (!record.date || record.date === null || record.date === void 0 || record.date === "") {
          reject(new Error("日期不能为空"));
          return;
        }
        const dateStr = record.date.toString();
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
          reject(new Error("日期格式必须为YYYY-MM-DD"));
          return;
        }
        if (record.quantity === void 0 || record.quantity === null || isNaN(record.quantity)) {
          reject(new Error("数量不能为空且必须为数字"));
          return;
        }
        if (record.unitPrice === void 0 || record.unitPrice === null || isNaN(record.unitPrice)) {
          reject(new Error("单价不能为空且必须为数字"));
          return;
        }
        if (record.total === void 0 || record.total === null || isNaN(record.total)) {
          reject(new Error("总金额不能为空且必须为数字"));
          return;
        }
        const safeDate = dateStr && dateStr.trim() !== "" ? dateStr : "2024-01-01";
        const safeQuantity = parseFloat(record.quantity);
        const safeUnitPrice = parseFloat(record.unitPrice);
        const safeTotal = parseFloat(record.total);
        formatAppLog("log", "at utils/database.js:139", "安全值:", { safeDate, safeQuantity, safeUnitPrice, safeTotal });
        if (isNaN(safeQuantity) || safeQuantity <= 0) {
          reject(new Error("数量必须为正数"));
          return;
        }
        if (isNaN(safeUnitPrice) || safeUnitPrice <= 0) {
          reject(new Error("单价必须为正数"));
          return;
        }
        if (isNaN(safeTotal) || safeTotal <= 0) {
          reject(new Error("总金额必须为正数"));
          return;
        }
        const directSQL = `INSERT INTO work_records (date, quantity, unit_price, total) VALUES ('${safeDate}', ${safeQuantity}, ${safeUnitPrice}, ${safeTotal})`;
        formatAppLog("log", "at utils/database.js:159", "直接SQL:", directSQL);
        plus.sqlite.executeSql({
          name: "workApp",
          sql: directSQL,
          success: (result) => {
            formatAppLog("log", "at utils/database.js:165", "✓ 记录保存成功，ID:", result.insertId);
            resolve(result.insertId);
          },
          fail: (error) => {
            formatAppLog("error", "at utils/database.js:169", "✗ 保存记录失败:", error);
            formatAppLog("error", "at utils/database.js:170", "错误详情:", error.code, error.message);
            formatAppLog("error", "at utils/database.js:171", "失败SQL:", directSQL);
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
        formatAppLog("log", "at utils/database.js:186", "=== 查询所有记录 ===");
        const cachedRecords = uni.getStorageSync("workRecords") || [];
        const sql = `SELECT * FROM work_records ORDER BY date DESC, created_at DESC`;
        formatAppLog("log", "at utils/database.js:190", "执行 SQL:", sql);
        plus.sqlite.selectSql({
          name: "workApp",
          sql,
          success: (result) => {
            const records = result.map((row) => ({
              id: row.id,
              date: row.date,
              quantity: row.quantity,
              unitPrice: row.unit_price,
              total: row.total,
              createdAt: row.created_at
            }));
            formatAppLog("log", "at utils/database.js:204", "转换后的记录:", JSON.stringify(records));
            resolve(records);
          },
          fail: (error) => {
            formatAppLog("error", "at utils/database.js:208", "查询记录失败:", error);
            resolve(cachedRecords);
          }
        });
      });
    }
    async getWorkRecordsByDateRange(startDate, endDate) {
      return new Promise((resolve, reject) => {
        if (!this.isReady) {
          reject(new Error("数据库未初始化"));
          return;
        }
        const sql = `SELECT * FROM work_records WHERE date BETWEEN '${startDate}' AND '${endDate}' ORDER BY date DESC`;
        plus.sqlite.selectSql({
          name: "workApp",
          sql,
          values: [startDate, endDate],
          success: (result) => {
            formatAppLog("log", "at utils/database.js:230", "查询结果:", result);
            const records = result.map((row) => ({
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
          reject(new Error("数据库未初始化"));
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
          name: "workApp",
          sql,
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
        formatAppLog("log", "at utils/database.js:290", "=== 开始删除记录 ID:", id, "类型:", typeof id);
        if (!this.isReady) {
          formatAppLog("error", "at utils/database.js:292", "数据库未初始化");
          reject(new Error("数据库未初始化"));
          return;
        }
        const safeId = Number(id);
        if (!Number.isInteger(safeId) || safeId <= 0) {
          formatAppLog("error", "at utils/database.js:298", "无效的 ID:", id);
          reject(new Error(`无效的 ID: ${id}`));
          return;
        }
        try {
          await this.debugTableData();
          formatAppLog("log", "at utils/database.js:304", "数据库路径:", plus.io.convertLocalFileSystemURL("_doc/workApp.db"));
          plus.sqlite.transaction({
            name: "workApp",
            operation: "begin",
            success: () => {
              formatAppLog("log", "at utils/database.js:309", "事务开始");
              const checkSql = `SELECT id FROM work_records WHERE id = ${safeId}`;
              formatAppLog("log", "at utils/database.js:311", "检查 SQL:", checkSql);
              plus.sqlite.selectSql({
                name: "workApp",
                sql: checkSql,
                success: (result) => {
                  formatAppLog("log", "at utils/database.js:316", "检查结果:", JSON.stringify(result));
                  if (result.length === 0) {
                    formatAppLog("log", "at utils/database.js:318", `记录 ID ${safeId} 不存在`);
                    plus.sqlite.transaction({
                      name: "workApp",
                      operation: "commit",
                      success: () => {
                        formatAppLog("log", "at utils/database.js:323", "事务提交：记录不存在");
                        resolve(0);
                      },
                      fail: (error) => {
                        formatAppLog("error", "at utils/database.js:327", "提交事务失败:", error);
                        reject(error);
                      }
                    });
                    return;
                  }
                  const sql = `DELETE FROM work_records WHERE id = ${safeId}`;
                  formatAppLog("log", "at utils/database.js:334", "删除 SQL:", sql);
                  plus.sqlite.executeSql({
                    name: "workApp",
                    sql,
                    success: (result2) => {
                      formatAppLog("log", "at utils/database.js:339", "删除结果:", JSON.stringify(result2));
                      const rowsAffected = result2.rowsAffected || 0;
                      formatAppLog("log", "at utils/database.js:341", "✓ 记录删除成功，影响行数:", rowsAffected);
                      plus.sqlite.selectSql({
                        name: "workApp",
                        sql: `SELECT id FROM work_records WHERE id = ${safeId}`,
                        success: (checkResult) => {
                          formatAppLog("log", "at utils/database.js:346", "删除后检查:", JSON.stringify(checkResult));
                          plus.sqlite.transaction({
                            name: "workApp",
                            operation: "commit",
                            success: () => {
                              formatAppLog("log", "at utils/database.js:351", "事务提交：删除完成");
                              if (rowsAffected > 0) {
                                const cachedRecords = uni.getStorageSync("workRecords") || [];
                                const updatedRecords = cachedRecords.filter((record) => record.id !== safeId);
                                uni.setStorageSync("workRecords", updatedRecords);
                                formatAppLog("log", "at utils/database.js:356", "缓存已更新:", JSON.stringify(updatedRecords));
                              }
                              resolve(rowsAffected);
                            },
                            fail: (error) => {
                              formatAppLog("error", "at utils/database.js:361", "提交事务失败:", error);
                              reject(error);
                            }
                          });
                        },
                        fail: (error) => {
                          formatAppLog("error", "at utils/database.js:367", "删除后检查失败:", error);
                          reject(error);
                        }
                      });
                    },
                    fail: (error) => {
                      formatAppLog("error", "at utils/database.js:373", "✗ 删除记录失败:", error);
                      plus.sqlite.transaction({
                        name: "workApp",
                        operation: "rollback",
                        success: () => {
                          formatAppLog("log", "at utils/database.js:378", "事务回滚");
                          reject(error);
                        },
                        fail: (rollbackError) => {
                          formatAppLog("error", "at utils/database.js:382", "回滚事务失败:", rollbackError);
                          reject(rollbackError);
                        }
                      });
                    }
                  });
                },
                fail: (error) => {
                  formatAppLog("error", "at utils/database.js:390", "检查记录失败:", error);
                  plus.sqlite.transaction({
                    name: "workApp",
                    operation: "rollback",
                    success: () => {
                      formatAppLog("log", "at utils/database.js:395", "事务回滚");
                      reject(error);
                    },
                    fail: (rollbackError) => {
                      formatAppLog("error", "at utils/database.js:399", "回滚事务失败:", rollbackError);
                      reject(rollbackError);
                    }
                  });
                }
              });
            },
            fail: (error) => {
              formatAppLog("error", "at utils/database.js:407", "开启事务失败:", error);
              reject(error);
            }
          });
        } catch (error) {
          formatAppLog("error", "at utils/database.js:412", "删除操作异常:", error);
          reject(error);
        }
      });
    }
    async debugTableData() {
      return new Promise((resolve, reject) => {
        formatAppLog("log", "at utils/database.js:420", "=== 调试数据库内容 ===");
        const sql = `SELECT * FROM work_records`;
        plus.sqlite.selectSql({
          name: "workApp",
          sql,
          success: (result) => {
            formatAppLog("log", "at utils/database.js:426", "数据库中所有记录:", JSON.stringify(result));
            resolve(result);
          },
          fail: (error) => {
            formatAppLog("error", "at utils/database.js:430", "查询所有记录失败:", error);
            reject(error);
          }
        });
      });
    }
    async updateWorkRecord(id, record) {
      return new Promise((resolve, reject) => {
        if (!this.isReady) {
          reject(new Error("数据库未初始化"));
          return;
        }
        const sql = `UPDATE work_records SET date = ?, quantity = ?, unit_price = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const values = [record.date, record.quantity, record.unitPrice, record.total, id];
        plus.sqlite.executeSql({
          name: "workApp",
          sql,
          values,
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
          const oldRecords = uni.getStorageSync("workRecords") || [];
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
            } catch {
            }
          }
          resolve(migratedCount);
        } catch (error) {
          reject(error);
        }
      });
    }
    clearCache() {
      uni.removeStorageSync("workRecords");
    }
    async test() {
      return new Promise((resolve, reject) => {
        if (!this.isReady) {
          reject(new Error("数据库未初始化"));
          return;
        }
        const sql = `SELECT * FROM work_records WHERE date >= '2025-10-01' AND date <= '2025-10-31';`;
        plus.sqlite.selectSql({
          name: "workApp",
          sql,
          success: (result) => {
            const records = result.map((row) => ({
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
      if (typeof plus === "undefined" || !plus.sqlite) {
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
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$4 = {
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
        formatAppLog("warn", "at components/MonthlyStats.vue:83", "数据库初始化失败");
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
        return num.toFixed(3).replace(/\.?0+$/, "");
      },
      async calculateStats() {
        formatAppLog("log", "at components/MonthlyStats.vue:109", "=== 计算本月统计 ===");
        formatAppLog("log", "at components/MonthlyStats.vue:110", "年份:", this.year, "月份:", this.month);
        try {
          let monthRecords = [];
          if (this.dbReady === true) {
            formatAppLog("log", "at components/MonthlyStats.vue:116", "使用数据库查询");
            const startDate = `${this.year}-${String(this.month).padStart(2, "0")}-01`;
            const lastDay = new Date(this.year, this.month, 0).getDate();
            const endDate = `${this.year}-${String(this.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
            monthRecords = await dbManager.getWorkRecordsByDateRange(startDate, endDate);
          } else {
            formatAppLog("log", "at components/MonthlyStats.vue:123", "数据库不可用");
            monthRecords = [];
          }
          formatAppLog("log", "at components/MonthlyStats.vue:127", "本月记录数:", monthRecords.length);
          const dailyGroups = {};
          monthRecords.forEach((record) => {
            const date = record.date;
            if (!dailyGroups[date]) {
              dailyGroups[date] = [];
            }
            dailyGroups[date].push(record);
          });
          this.workDays = Object.keys(dailyGroups).length;
          this.totalRecords = monthRecords.length;
          const dailyIncomes = Object.values(dailyGroups).map(
            (records) => records.reduce((sum, record) => sum + parseFloat(record.total || 0), 0)
          );
          if (dailyIncomes.length > 0) {
            const totalIncome = dailyIncomes.reduce((sum, income) => sum + income, 0);
            this.dailyAverage = this.formatAmount(totalIncome / dailyIncomes.length);
            this.maxDaily = this.formatAmount(Math.max(...dailyIncomes));
          } else {
            this.dailyAverage = "0";
            this.maxDaily = "0";
          }
          const dailyIncomesByDate = {};
          Object.entries(dailyGroups).forEach(([date, records]) => {
            const day = parseInt(date.split("-")[2]);
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
          formatAppLog("log", "at components/MonthlyStats.vue:183", "统计结果:", {
            workDays: this.workDays,
            totalRecords: this.totalRecords,
            dailyAverage: this.dailyAverage,
            maxDaily: this.maxDaily,
            total_1_10: this.total_1_10,
            total_11_20: this.total_11_20,
            total_21_max: this.total_21_max
          });
        } catch (error) {
          formatAppLog("error", "at components/MonthlyStats.vue:194", "计算统计失败:", error);
          this.workDays = 0;
          this.dailyAverage = "0";
          this.maxDaily = "0";
          this.totalRecords = 0;
          this.total_1_10 = "0";
          this.total_11_20 = "0";
          this.total_21_max = "0";
        }
      },
      closeStats() {
        this.$emit("close");
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return $props.showStats ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "stats-container"
    }, [
      vue.createElementVNode("view", { class: "stats-card" }, [
        vue.createElementVNode("view", { class: "stats-header" }, [
          vue.createElementVNode("view", { class: "stats-title" }, "本月统计"),
          vue.createElementVNode("view", {
            class: "close-btn",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.closeStats && $options.closeStats(...args))
          }, "×")
        ]),
        vue.createElementVNode("view", { class: "stats-grid" }, [
          vue.createElementVNode("view", { class: "stat-item" }, [
            vue.createElementVNode("view", { class: "stat-label" }, "工作天数"),
            vue.createElementVNode(
              "view",
              { class: "stat-value" },
              vue.toDisplayString($data.workDays),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "stat-item" }, [
            vue.createElementVNode("view", { class: "stat-label" }, "日均收入"),
            vue.createElementVNode(
              "view",
              { class: "stat-value" },
              "¥" + vue.toDisplayString($data.dailyAverage),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "stat-item" }, [
            vue.createElementVNode("view", { class: "stat-label" }, "最高日收入"),
            vue.createElementVNode(
              "view",
              { class: "stat-value" },
              "¥" + vue.toDisplayString($data.maxDaily),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "stat-item" }, [
            vue.createElementVNode("view", { class: "stat-label" }, "总记录数"),
            vue.createElementVNode(
              "view",
              { class: "stat-value" },
              vue.toDisplayString($data.totalRecords),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode("view", { class: "stat-item" }, [
          vue.createElementVNode("view", { class: "stat-label2" }, "本月1号到10号收入总和"),
          vue.createElementVNode(
            "view",
            { class: "stat-value" },
            "¥" + vue.toDisplayString($data.total_1_10),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "stat-item" }, [
          vue.createElementVNode("view", { class: "stat-label2" }, "本月11号到21号收入总和"),
          vue.createElementVNode(
            "view",
            { class: "stat-value" },
            "¥" + vue.toDisplayString($data.total_11_20),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "stat-item" }, [
          vue.createElementVNode("view", { class: "stat-label2" }, "本月21号到月底收入总和"),
          vue.createElementVNode(
            "view",
            { class: "stat-value" },
            "¥" + vue.toDisplayString($data.total_21_max),
            1
            /* TEXT */
          )
        ])
      ])
    ])) : vue.createCommentVNode("v-if", true);
  }
  const MonthlyStats = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-f4c139bd"], ["__file", "D:/Project-android/workApp/components/MonthlyStats.vue"]]);
  const _sfc_main$3 = {
    components: {
      MonthlyStats
    },
    data() {
      return {
        currentYear: (/* @__PURE__ */ new Date()).getFullYear(),
        currentMonth: (/* @__PURE__ */ new Date()).getMonth() + 1,
        totalIncome: 0,
        showStats: false,
        dbReady: false
      };
    },
    onLoad() {
      initDatabase().then(() => {
        this.dbReady = true;
        this.loadData();
      }).catch((error) => {
        formatAppLog("error", "at pages/index/index.vue:68", "Database initialization failed:", error);
        uni.showToast({
          title: "数据库初始化失败",
          icon: "none",
          duration: 2e3
        });
      });
    },
    onShow() {
      formatAppLog("log", "at pages/index/index.vue:78", "=== 主页显示 ===");
      this.calculateTotalIncome();
    },
    methods: {
      formatAmount(amount) {
        const num = parseFloat(amount);
        if (Number.isInteger(num)) {
          return num.toString();
        }
        return num.toFixed(3).replace(/\.?0+$/, "");
      },
      async loadData() {
        if (!this.dbReady) {
          formatAppLog("log", "at pages/index/index.vue:91", "数据库未就绪");
          this.totalIncome = "0";
          return;
        }
        try {
          const startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, "0")}-01`.trim();
          const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
          const endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`.trim();
          formatAppLog("log", "at pages/index/index.vue:103", "startDate:", startDate);
          formatAppLog("log", "at pages/index/index.vue:104", "endDate:", endDate);
          const records = await dbManager.getWorkRecordsByDateRange(startDate, endDate);
          formatAppLog("log", "at pages/index/index.vue:109", "查询到的记录是：", JSON.stringify(records));
          const total = records.reduce((sum, record) => {
            return sum + parseFloat(record.total || 0);
          }, 0);
          this.totalIncome = this.formatAmount(total);
          formatAppLog("log", "at pages/index/index.vue:116", "本月总收入:", this.totalIncome);
        } catch (error) {
          formatAppLog("error", "at pages/index/index.vue:119", "计算本月收入失败:", error);
          this.totalIncome = "0";
        }
      },
      calculateTotalIncome() {
        this.loadData();
      },
      goToRecord() {
        uni.navigateTo({
          url: "/pages/record/record"
        });
      },
      goToHistory() {
        uni.navigateTo({
          url: "/pages/history/history"
        });
      },
      async testDemo() {
        uni.showToast({
          title: "本产品仅作为测试供内部使用\n\n如需新增功能请联系 金兰芝女士",
          icon: "none",
          // 图标类型，可以是 'success', 'loading', 'none'
          duration: 4e3
          // 持续时间，单位是毫秒，默认为 1500ms
        });
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_MonthlyStats = vue.resolveComponent("MonthlyStats");
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "safe-area" }, [
        vue.createElementVNode("view", { class: "header-section" }, [
          vue.createElementVNode("view", { class: "title" }, "工作记录"),
          vue.createElementVNode(
            "view",
            { class: "subtitle" },
            vue.toDisplayString($data.currentYear) + "年 " + vue.toDisplayString($data.currentMonth) + "月",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "main-card" }, [
          vue.createElementVNode("view", { class: "amount-display" }, [
            vue.createElementVNode("view", { class: "label" }, "本月收入"),
            vue.createElementVNode(
              "view",
              { class: "amount" },
              "¥" + vue.toDisplayString($data.totalIncome),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode("view", { class: "action-grid" }, [
          vue.createElementVNode("view", {
            class: "action-item primary",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.goToRecord && $options.goToRecord(...args))
          }, [
            vue.createElementVNode("view", { class: "icon" }, "✏️"),
            vue.createElementVNode("view", { class: "text" }, "记录")
          ]),
          vue.createElementVNode("view", {
            class: "action-item secondary",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.goToHistory && $options.goToHistory(...args))
          }, [
            vue.createElementVNode("view", { class: "icon" }, "📊"),
            vue.createElementVNode("view", { class: "text" }, "历史")
          ]),
          vue.createElementVNode("view", {
            class: "action-item accent",
            onClick: _cache[2] || (_cache[2] = ($event) => $data.showStats = true)
          }, [
            vue.createElementVNode("view", { class: "icon" }, "📈"),
            vue.createElementVNode("view", { class: "text" }, "统计")
          ]),
          vue.createElementVNode("view", {
            class: "action-item accent",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.testDemo && $options.testDemo(...args))
          }, [
            vue.createElementVNode("view", { class: "text" }, "其他说明")
          ])
        ])
      ]),
      vue.createVNode(_component_MonthlyStats, {
        year: $data.currentYear,
        month: $data.currentMonth,
        "show-stats": $data.showStats,
        onClose: _cache[4] || (_cache[4] = ($event) => $data.showStats = false)
      }, null, 8, ["year", "month", "show-stats"])
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-1cf27b2a"], ["__file", "D:/Project-android/workApp/pages/index/index.vue"]]);
  const _sfc_main$2 = {
    data() {
      return {
        date: this.getTodayDate(),
        quantity: "",
        unitPrice: "",
        quickPrices: [0.65, 0.7, 0.8, 0.85, 0.9, 1, 1.5],
        dbReady: false,
        isSaving: false
      };
    },
    onLoad() {
      initDatabase().then(() => {
        this.dbReady = true;
      }).catch((error) => {
        formatAppLog("error", "at pages/record/record.vue:96", "Database initialization failed:", error);
        uni.showToast({
          title: "数据库初始化失败",
          icon: "none",
          duration: 2e3
        });
      });
    },
    computed: {
      totalAmount() {
        if (this.quantity && this.unitPrice && !isNaN(this.quantity) && !isNaN(this.unitPrice)) {
          return (parseFloat(this.quantity) * parseFloat(this.unitPrice)).toFixed(2);
        }
        return "0.00";
      },
      canSave() {
        return this.quantity && this.unitPrice && parseFloat(this.quantity) > 0 && parseFloat(this.unitPrice) > 0;
      }
    },
    methods: {
      getTodayDate() {
        const today = /* @__PURE__ */ new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
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
        dbManager.insertWorkRecord(record).then(() => {
          uni.showToast({
            title: "保存成功",
            icon: "success",
            duration: 1500
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }).catch((error) => {
          formatAppLog("error", "at pages/record/record.vue:170", "保存记录失败:", error);
          uni.showToast({
            title: "保存失败",
            icon: "none",
            duration: 2e3
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
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "safe-area" }, [
        vue.createElementVNode("view", { class: "header-section" }, [
          vue.createElementVNode("button", {
            class: "back-btn",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
          }, "←"),
          vue.createElementVNode("view", { class: "title" }, "记录工作")
        ]),
        vue.createElementVNode("view", { class: "form-container" }, [
          vue.createElementVNode("view", { class: "form-group" }, [
            vue.createElementVNode("label", { class: "form-label" }, "日期"),
            vue.createElementVNode("picker", {
              mode: "date",
              value: $data.date,
              onChange: _cache[1] || (_cache[1] = (...args) => $options.onDateChange && $options.onDateChange(...args)),
              class: "date-picker"
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-display" },
                vue.toDisplayString($options.formatDisplayDate($data.date)),
                1
                /* TEXT */
              )
            ], 40, ["value"])
          ]),
          vue.createElementVNode("view", { class: "form-group" }, [
            vue.createElementVNode("label", { class: "form-label" }, "工作数量"),
            vue.createElementVNode("input", {
              type: "number",
              value: $data.quantity,
              onInput: _cache[2] || (_cache[2] = (...args) => $options.handleQuantityInput && $options.handleQuantityInput(...args)),
              placeholder: "请输入数量",
              class: "modern-input",
              "confirm-type": "done",
              "cursor-spacing": "20",
              "adjust-position": "true",
              "hold-keyboard": "true"
            }, null, 40, ["value"])
          ]),
          vue.createElementVNode("view", { class: "form-group" }, [
            vue.createElementVNode("label", { class: "form-label" }, "单价（元）"),
            vue.createElementVNode("input", {
              type: "digit",
              value: $data.unitPrice,
              onInput: _cache[3] || (_cache[3] = (...args) => $options.handlePriceInput && $options.handlePriceInput(...args)),
              placeholder: "请输入单价",
              class: "modern-input",
              "confirm-type": "done",
              "cursor-spacing": "20",
              "adjust-position": "true",
              "hold-keyboard": "true"
            }, null, 40, ["value"]),
            vue.createElementVNode("view", { class: "quick-price-chips" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.quickPrices, (price) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: price,
                    class: "price-chip",
                    onClick: ($event) => $options.selectQuickPrice(price)
                  }, [
                    vue.createElementVNode(
                      "text",
                      { class: "price-chip-text" },
                      vue.toDisplayString(price),
                      1
                      /* TEXT */
                    )
                  ], 8, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "summary-card" }, [
            vue.createElementVNode("view", { class: "summary-label" }, "预计收入"),
            vue.createElementVNode(
              "view",
              { class: "summary-amount" },
              "¥" + vue.toDisplayString($options.totalAmount),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "action-section" }, [
            vue.createElementVNode("button", {
              class: vue.normalizeClass(["save-btn", { disabled: !$options.canSave || $data.isSaving }]),
              onClick: _cache[4] || (_cache[4] = (...args) => $options.saveRecord && $options.saveRecord(...args)),
              disabled: !$options.canSave || $data.isSaving
            }, [
              vue.createElementVNode("view", { class: "btn-text" }, "保存记录")
            ], 10, ["disabled"])
          ])
        ])
      ])
    ]);
  }
  const PagesRecordRecord = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-ef6850c5"], ["__file", "D:/Project-android/workApp/pages/record/record.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        filterMode: "month",
        // 'year' 或 'month'
        selectedYear: (/* @__PURE__ */ new Date()).getFullYear(),
        selectedMonth: (/* @__PURE__ */ new Date()).getMonth() + 1,
        allRecords: [],
        currentTotal: 0,
        dbReady: false,
        loading: false
      };
    },
    computed: {
      groupedRecords() {
        const groups = {};
        this.allRecords.forEach((record) => {
          const date = record.date;
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(record);
        });
        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach((date) => {
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
      }).catch((error) => {
        formatAppLog("error", "at pages/history/history.vue:127", "Database initialization failed:", error);
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
        return num.toFixed(3).replace(/\.?0+$/, "");
      },
      async loadRecords() {
        formatAppLog("log", "at pages/history/history.vue:144", "=== 加载历史记录 ===");
        if (!this.dbReady) {
          formatAppLog("log", "at pages/history/history.vue:147", "数据库未就绪");
          this.allRecords = [];
          this.currentTotal = 0;
          return;
        }
        try {
          this.loading = true;
          let startDate, endDate;
          if (this.filterMode === "year") {
            startDate = `${this.selectedYear}-01-01`;
            endDate = `${this.selectedYear}-12-31`;
          } else {
            const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
            startDate = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, "0")}-01`;
            endDate = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, "0")}-${daysInMonth}`;
          }
          formatAppLog("log", "at pages/history/history.vue:168", "查询日期范围:", startDate, "至", endDate);
          const records = await dbManager.getWorkRecordsByDateRange(startDate, endDate);
          formatAppLog("log", "at pages/history/history.vue:172", "查询完成，记录数量:", records.length);
          this.allRecords = records;
          this.calculateCurrentTotal();
          this.loading = false;
        } catch (error) {
          formatAppLog("error", "at pages/history/history.vue:178", "Error loading records:", error);
          this.allRecords = [];
          this.currentTotal = 0;
          this.loading = false;
        }
      },
      calculateCurrentTotal() {
        formatAppLog("log", "at pages/history/history.vue:185", "=== 计算当前总计 ===");
        formatAppLog("log", "at pages/history/history.vue:186", "当前记录数量:", this.allRecords.length, "条");
        const total = this.allRecords.reduce((sum, record) => {
          return sum + parseFloat(record.total);
        }, 0);
        this.currentTotal = this.formatAmount(total);
        formatAppLog("log", "at pages/history/history.vue:193", "计算出的总计:", this.currentTotal);
      },
      onYearChange(e) {
        this.selectedYear = parseInt(e.detail.value);
      },
      onMonthChange(e) {
        this.selectedMonth = parseInt(e.detail.value.split("-")[1]);
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
          title: "确认删除",
          content: "确定要删除这条记录吗？",
          success: (res) => {
            if (res.confirm) {
              this.deleteRecord(recordId);
            }
          }
        });
      },
      async deleteRecord(recordId) {
        formatAppLog("log", "at pages/history/history.vue:222", "=== 删除记录 ===");
        try {
          formatAppLog("log", "at pages/history/history.vue:225", "调用数据库删除...");
          await dbManager.deleteWorkRecord(recordId);
          formatAppLog("log", "at pages/history/history.vue:227", "数据库删除成功，重新加载记录...");
          await this.loadRecords();
          uni.showToast({
            title: "删除成功",
            icon: "success",
            duration: 1500
          });
        } catch (error) {
          formatAppLog("error", "at pages/history/history.vue:236", "删除记录失败:", error);
          formatAppLog("error", "at pages/history/history.vue:237", "错误详情:", error.message);
          uni.showToast({
            title: "删除失败",
            icon: "none",
            duration: 2e3
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
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "glass-card" }, [
        vue.createElementVNode("view", { class: "header" }, [
          vue.createElementVNode("view", { class: "title" }, "历史记录")
        ]),
        vue.createElementVNode("view", { class: "filter-section" }, [
          vue.createElementVNode("view", { class: "filter-mode" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["mode-btn", { active: $data.filterMode === "year" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.setFilterMode("year"))
              },
              " 年度查看 ",
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["mode-btn", { active: $data.filterMode === "month" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.setFilterMode("month"))
              },
              " 月度查看 ",
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "filter-row" }, [
            $data.filterMode === "year" ? (vue.openBlock(), vue.createElementBlock("picker", {
              key: 0,
              mode: "date",
              fields: "year",
              value: $data.selectedYear.toString(),
              onChange: _cache[2] || (_cache[2] = (...args) => $options.onYearChange && $options.onYearChange(...args))
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-btn" },
                vue.toDisplayString($data.selectedYear) + "年",
                1
                /* TEXT */
              )
            ], 40, ["value"])) : (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 1 },
              [
                vue.createElementVNode("picker", {
                  mode: "date",
                  fields: "year",
                  value: $data.selectedYear.toString(),
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.onYearChange && $options.onYearChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-btn" },
                    vue.toDisplayString($data.selectedYear) + "年",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"]),
                vue.createElementVNode("picker", {
                  mode: "date",
                  fields: "month",
                  value: $data.selectedMonth.toString(),
                  onChange: _cache[4] || (_cache[4] = (...args) => $options.onMonthChange && $options.onMonthChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-btn" },
                    vue.toDisplayString($data.selectedMonth) + "月",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ],
              64
              /* STABLE_FRAGMENT */
            ))
          ]),
          vue.createElementVNode(
            "view",
            { class: "total-display" },
            vue.toDisplayString($data.filterMode === "year" ? $data.selectedYear + "年" : $data.selectedYear + "年" + $data.selectedMonth + "月") + "总收入：¥" + vue.toDisplayString($data.currentTotal),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("scroll-view", {
          class: "records-list",
          "scroll-y": "true"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($options.groupedRecords, (group, date) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: date,
                class: "record-group"
              }, [
                vue.createElementVNode("view", { class: "date-header" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "date" },
                    vue.toDisplayString($options.formatDate(date)),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "day-total" },
                    "当日总金额：¥" + vue.toDisplayString($options.getDayTotal(group)),
                    1
                    /* TEXT */
                  )
                ]),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(group, (record) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: record.id,
                      class: "record-item-container"
                    }, [
                      vue.createElementVNode("view", { class: "record-item" }, [
                        vue.createElementVNode("view", { class: "record-content" }, [
                          vue.createElementVNode("view", { class: "record-header" }, [
                            vue.createElementVNode("view", { class: "header-item" }, "数量"),
                            vue.createElementVNode("view", { class: "header-item" }, "单价"),
                            vue.createElementVNode("view", { class: "header-item" }, "总和")
                          ]),
                          vue.createElementVNode("view", { class: "record-data" }, [
                            vue.createElementVNode(
                              "view",
                              { class: "data-item" },
                              vue.toDisplayString(record.quantity),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "view",
                              { class: "data-item" },
                              "¥" + vue.toDisplayString($options.formatAmount(record.unitPrice)),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "view",
                              { class: "data-item" },
                              "¥" + vue.toDisplayString($options.formatAmount(record.total)),
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createElementVNode("button", {
                          class: "delete-btn",
                          onClick: ($event) => $options.confirmDelete(record.id)
                        }, "删除", 8, ["onClick"])
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                vue.createElementVNode("view", { class: "divider" })
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          Object.keys($options.groupedRecords).length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "empty-state"
          }, [
            vue.createElementVNode(
              "view",
              { class: "empty-text" },
              vue.toDisplayString($data.loading ? "加载中..." : "暂无记录"),
              1
              /* TEXT */
            )
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createElementVNode("view", { class: "header" }, [
          vue.createElementVNode("button", {
            class: "back-btn",
            onClick: _cache[5] || (_cache[5] = (...args) => $options.goBack && $options.goBack(...args))
          }, "←"),
          vue.createElementVNode("view", { class: "title" }, "历史记录")
        ])
      ])
    ]);
  }
  const PagesHistoryHistory = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/Project-android/workApp/pages/history/history.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/record/record", PagesRecordRecord);
  __definePage("pages/history/history", PagesHistoryHistory);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/Project-android/workApp/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
