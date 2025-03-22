// 引入 SQLite3 模块
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '../../database.db');

// 检查数据库目录是否存在，如果不存在则创建
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库错误:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库');
    // 初始化数据库表
    initDatabase();
  }
});

// 初始化数据库
function initDatabase() {
  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON');

  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);

  // 创建设计表
  db.run(`
    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      design TEXT NOT NULL,
      thumbnail TEXT,
      is_private INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 创建家具表
  db.run(`
    CREATE TABLE IF NOT EXISTS furniture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      model_url TEXT NOT NULL,
      thumbnail_url TEXT,
      price REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 创建设计-家具关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS design_furniture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      design_id INTEGER NOT NULL,
      furniture_id INTEGER NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      position_z REAL NOT NULL,
      rotation_x REAL NOT NULL,
      rotation_y REAL NOT NULL,
      rotation_z REAL NOT NULL,
      scale_x REAL NOT NULL DEFAULT 1,
      scale_y REAL NOT NULL DEFAULT 1,
      scale_z REAL NOT NULL DEFAULT 1,
      color TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(design_id) REFERENCES designs(id) ON DELETE CASCADE,
      FOREIGN KEY(furniture_id) REFERENCES furniture(id) ON DELETE CASCADE
    )
  `);

  // 检查是否需要创建默认管理员用户
  db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('检查管理员错误:', err.message);
      return;
    }

    // 如果没有管理员用户，创建一个默认的
    if (row.count === 0) {
      const bcrypt = require('bcrypt');
      // 使用加密的密码 'admin123'
      bcrypt.hash('admin123', 10, (err, hash) => {
        if (err) {
          console.error('加密密码错误:', err.message);
          return;
        }

        db.run(
          'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
          ['管理员', 'admin@example.com', hash, 'admin', new Date().toISOString()],
          (err) => {
            if (err) {
              console.error('创建管理员用户错误:', err.message);
            } else {
              console.log('已创建默认管理员用户');
            }
          }
        );
      });
    }
  });

  // 检查是否需要添加示例家具数据
  db.get('SELECT COUNT(*) as count FROM furniture', [], (err, row) => {
    if (err) {
      console.error('检查家具数据错误:', err.message);
      return;
    }

    // 如果没有家具数据，添加一些示例数据
    if (row.count === 0) {
      const now = new Date().toISOString();
      const furnitureData = [
        {
          name: '简约双人床',
          category: '床',
          description: '时尚简约风格双人床，宽度1.8米',
          model_url: '/models/furniture/bed_double.glb',
          thumbnail_url: '/images/furniture/bed_double_thumb.jpg',
          price: 1999.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '北欧单人床',
          category: '床',
          description: '北欧风格的单人床，宽度1.2米',
          model_url: '/models/furniture/bed_single.glb',
          thumbnail_url: '/images/furniture/bed_single_thumb.jpg',
          price: 1299.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '现代衣柜',
          category: '柜子',
          description: '大容量现代风格衣柜',
          model_url: '/models/furniture/wardrobe.glb',
          thumbnail_url: '/images/furniture/wardrobe_thumb.jpg',
          price: 2499.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '书桌',
          category: '桌子',
          description: '简约书桌，带抽屉',
          model_url: '/models/furniture/desk.glb',
          thumbnail_url: '/images/furniture/desk_thumb.jpg',
          price: 899.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '电脑椅',
          category: '椅子',
          description: '人体工学电脑椅，舒适耐用',
          model_url: '/models/furniture/chair_computer.glb',
          thumbnail_url: '/images/furniture/chair_computer_thumb.jpg',
          price: 599.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '床头柜',
          category: '柜子',
          description: '简约床头柜，双层储物',
          model_url: '/models/furniture/nightstand.glb',
          thumbnail_url: '/images/furniture/nightstand_thumb.jpg',
          price: 399.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '落地灯',
          category: '灯具',
          description: '现代简约风格落地灯',
          model_url: '/models/furniture/floor_lamp.glb',
          thumbnail_url: '/images/furniture/floor_lamp_thumb.jpg',
          price: 299.99,
          created_at: now,
          updated_at: now
        },
        {
          name: '书架',
          category: '架子',
          description: '多层开放式书架',
          model_url: '/models/furniture/bookshelf.glb',
          thumbnail_url: '/images/furniture/bookshelf_thumb.jpg',
          price: 799.99,
          created_at: now,
          updated_at: now
        }
      ];

      // 准备批量插入的 SQL 语句
      const stmt = db.prepare(`
        INSERT INTO furniture (name, category, description, model_url, thumbnail_url, price, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 插入示例数据
      furnitureData.forEach(item => {
        stmt.run(
          item.name,
          item.category,
          item.description,
          item.model_url,
          item.thumbnail_url,
          item.price,
          item.created_at,
          item.updated_at
        );
      });

      stmt.finalize();
      console.log('已添加示例家具数据');
    }
  });
}

// 导出数据库连接
module.exports = db; 