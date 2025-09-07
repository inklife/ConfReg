/**
 * 数据库适配器 - 使用跨平台 SQLite3 加载器
 */

const { loadSQLite3 } = require('./cross-platform-sqlite3');
const path = require('path');

class DatabaseAdapter {
    constructor() {
        this.sqlite3 = null;
        this.db = null;
        this.isConnected = false;
    }

    /**
     * 初始化数据库连接
     */
    async initialize(dbPath = null) {
        try {
            // 加载跨平台 SQLite3
            this.sqlite3 = await loadSQLite3();
            
            // 设置数据库路径 - 优先使用传入参数，然后环境变量，最后默认路径
            const getDbPath = () => {
                if (dbPath) return dbPath;
                
                const envDbPath = process.env.CONFREG_DB_PATH;
                if (envDbPath) {
                    // 如果是绝对路径，直接使用
                    if (path.isAbsolute(envDbPath)) {
                        return envDbPath;
                    }
                    // 如果是相对路径，相对于项目根目录（server的父目录）
                    return path.resolve(__dirname, '../../../', envDbPath);
                }
                
                // 默认路径
                return path.join(__dirname, '../../database/icpads2025.sqlite');
            };
            
            const databasePath = getDbPath();
            console.log(`🗄️ Database adapter path: ${databasePath}`);
            
            // 创建数据库连接
            this.db = new this.sqlite3.Database(databasePath, (err) => {
                if (err) {
                    throw new Error(`Failed to connect to database: ${err.message}`);
                }
                this.isConnected = true;
                console.log(`📁 Connected to SQLite database: ${databasePath}`);
            });

            return this.db;
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * 执行查询
     */
    async query(sql, params = []) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * 执行单个查询
     */
    async get(sql, params = []) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * 执行更新/插入/删除
     */
    async run(sql, params = []) {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('📁 Database connection closed');
                }
            });
            this.isConnected = false;
        }
    }
}

// 创建单例实例
const dbAdapter = new DatabaseAdapter();

module.exports = {
    DatabaseAdapter,
    dbAdapter
};
