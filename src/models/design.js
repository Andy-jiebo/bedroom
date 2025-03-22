// 引入数据库
const db = require('./db');

// 设计模型
class Design {
  // 根据 ID 查找设计
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM designs WHERE id = ?`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          // 将 JSON 字符串解析为对象
          if (row && row.design) {
            try {
              row.design = JSON.parse(row.design);
            } catch (e) {
              console.error('解析设计数据错误:', e);
            }
          }
          resolve(row);
        }
      });
    });
  }

  // 根据用户 ID 查找设计
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM designs WHERE user_id = ? ORDER BY updated_at DESC`;
      db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 将 JSON 字符串解析为对象
          rows.forEach(row => {
            if (row.design) {
              try {
                row.design = JSON.parse(row.design);
              } catch (e) {
                console.error('解析设计数据错误:', e);
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // 创建新设计
  static async create(design) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO designs (user_id, name, design, thumbnail, is_private, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        sql,
        [
          design.user_id,
          design.name,
          design.design,
          design.thumbnail,
          design.is_private || 0,
          design.created_at.toISOString(),
          design.updated_at.toISOString()
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // 获取新创建的设计
            Design.findById(this.lastID)
              .then(newDesign => resolve(newDesign))
              .catch(err => reject(err));
          }
        }
      );
    });
  }

  // 更新设计
  static async update(id, design) {
    return new Promise((resolve, reject) => {
      // 构建 SQL 和参数
      let sql = `UPDATE designs SET `;
      const params = [];
      
      // 添加需要更新的字段
      const fields = [];
      if (design.name) {
        fields.push(`name = ?`);
        params.push(design.name);
      }
      if (design.design) {
        fields.push(`design = ?`);
        params.push(design.design);
      }
      if (design.thumbnail) {
        fields.push(`thumbnail = ?`);
        params.push(design.thumbnail);
      }
      if (design.is_private !== undefined) {
        fields.push(`is_private = ?`);
        params.push(design.is_private);
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

  // 删除设计
  static async delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM designs WHERE id = ?`;
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // 获取所有设计（分页）
  static async findAll(limit = 10, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT d.*, u.username as creator
        FROM designs d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.is_private = 0
        ORDER BY d.updated_at DESC
        LIMIT ? OFFSET ?
      `;
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 将 JSON 字符串解析为对象
          rows.forEach(row => {
            if (row.design) {
              try {
                row.design = JSON.parse(row.design);
              } catch (e) {
                console.error('解析设计数据错误:', e);
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // 获取设计总数
  static async count(onlyPublic = true) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT COUNT(*) as count FROM designs`;
      if (onlyPublic) {
        sql += ` WHERE is_private = 0`;
      }
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // 获取最近的设计
  static async findRecent(limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT d.*, u.username as creator
        FROM designs d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.is_private = 0
        ORDER BY d.created_at DESC
        LIMIT ?
      `;
      db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 将 JSON 字符串解析为对象
          rows.forEach(row => {
            if (row.design) {
              try {
                row.design = JSON.parse(row.design);
              } catch (e) {
                console.error('解析设计数据错误:', e);
              }
            }
          });
          resolve(rows);
        }
      });
    });
  }

  // 按月统计设计创建数
  static async countByMonth() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as count
        FROM designs
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

module.exports = Design; 