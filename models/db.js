const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库文件
const dbPath = path.join(dataDir, 'database.sqlite');
const isNewDb = !fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

// 初始化数据库
const initDb = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 只创建一个用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          github_token TEXT,
          github_owner TEXT,
          github_repo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 检查是否已存在管理员账号
      db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
        if (err) {
          console.error('Error checking admin user:', err);
          reject(err);
          return;
        }

        // 如果不存在管理员账号，创建一个
        if (!row) {
          db.run(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            ["admin", "admin123", "admin"],
            (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
                reject(err);
              } else {
                console.log('Default admin user created successfully');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
};

// 初始化数据库
initDb().then(() => {
  console.log('Database initialized successfully');
  // 检查管理员账号
  db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
    } else {
      console.log('Admin user check:', row);
    }
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// 处理进程退出时关闭数据库连接
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit();
});

module.exports = db; 