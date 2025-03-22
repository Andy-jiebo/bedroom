// 引入数据库
const db = require('./db');

// 用户模型
class User {
  // 根据 ID 查找用户
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE id = ?`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 根据邮箱查找用户
  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE email = ?`;
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 创建新用户
  static async create(user) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (username, email, password, role, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.run(
        sql,
        [user.username, user.email, user.password, user.role, user.created_at.toISOString()],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // 获取新创建的用户
            User.findById(this.lastID)
              .then(newUser => resolve(newUser))
              .catch(err => reject(err));
          }
        }
      );
    });
  }

  // 更新用户
  static async update(id, user) {
    return new Promise((resolve, reject) => {
      // 构建 SQL 和参数
      let sql = `UPDATE users SET `;
      const params = [];
      
      // 添加需要更新的字段
      const fields = [];
      if (user.username) {
        fields.push(`username = ?`);
        params.push(user.username);
      }
      if (user.email) {
        fields.push(`email = ?`);
        params.push(user.email);
      }
      if (user.password) {
        fields.push(`password = ?`);
        params.push(user.password);
      }
      if (user.role) {
        fields.push(`role = ?`);
        params.push(user.role);
      }
      
      // 添加 updated_at 字段
      fields.push(`updated_at = ?`);
      params.push(new Date().toISOString());
      
      // 添加 WHERE 条件
      sql += fields.join(', ') + ` WHERE id = ?`;
      params.push(id);
      
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // 删除用户
  static async delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM users WHERE id = ?`;
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // 获取所有用户（分页）
  static async findAll(limit = 10, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 获取用户总数
  static async count() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM users`;
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // 获取最近注册的用户
  static async findRecent(limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ?`;
      db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 按月统计用户注册数
  static async countByMonth() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as count
        FROM users
        GROUP BY month
        ORDER BY month
      `;
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = User; 