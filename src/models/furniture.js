// 引入数据库
const db = require('./db');

// 家具模型
class Furniture {
  // 根据 ID 查找家具
  static async findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM furniture WHERE id = ?`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 根据类别查找家具
  static async findByCategory(category) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM furniture WHERE category = ? ORDER BY name`;
      db.all(sql, [category], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 创建新家具
  static async create(furniture) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO furniture (name, category, description, model_url, thumbnail_url, price, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        sql,
        [
          furniture.name,
          furniture.category,
          furniture.description,
          furniture.model_url,
          furniture.thumbnail_url,
          furniture.price,
          furniture.created_at.toISOString(),
          furniture.updated_at.toISOString()
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // 获取新创建的家具
            Furniture.findById(this.lastID)
              .then(newFurniture => resolve(newFurniture))
              .catch(err => reject(err));
          }
        }
      );
    });
  }

  // 更新家具
  static async update(id, furniture) {
    return new Promise((resolve, reject) => {
      // 构建 SQL 和参数
      let sql = `UPDATE furniture SET `;
      const params = [];
      
      // 添加需要更新的字段
      const fields = [];
      if (furniture.name) {
        fields.push(`name = ?`);
        params.push(furniture.name);
      }
      if (furniture.category) {
        fields.push(`category = ?`);
        params.push(furniture.category);
      }
      if (furniture.description) {
        fields.push(`description = ?`);
        params.push(furniture.description);
      }
      if (furniture.model_url) {
        fields.push(`model_url = ?`);
        params.push(furniture.model_url);
      }
      if (furniture.thumbnail_url) {
        fields.push(`thumbnail_url = ?`);
        params.push(furniture.thumbnail_url);
      }
      if (furniture.price !== undefined) {
        fields.push(`price = ?`);
        params.push(furniture.price);
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

  // 删除家具
  static async delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM furniture WHERE id = ?`;
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  // 获取所有家具（分页）
  static async findAll(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM furniture ORDER BY category, name LIMIT ? OFFSET ?`;
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 搜索家具
  static async search(query) {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      const sql = `
        SELECT * FROM furniture 
        WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
        ORDER BY category, name
      `;
      db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 获取家具总数
  static async count() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM furniture`;
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // 获取所有类别
  static async getAllCategories() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT DISTINCT category FROM furniture ORDER BY category`;
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 提取类别名称
          const categories = rows.map(row => row.category);
          resolve(categories);
        }
      });
    });
  }

  // 获取最常使用的家具
  static async getTopUsed(limit = 10) {
    return new Promise((resolve, reject) => {
      // 此查询需要一个额外的表来跟踪家具使用情况
      // 这里假设我们有一个设计_家具关联表 (design_furniture)
      const sql = `
        SELECT f.*, COUNT(df.furniture_id) as usage_count
        FROM furniture f
        LEFT JOIN design_furniture df ON f.id = df.furniture_id
        GROUP BY f.id
        ORDER BY usage_count DESC
        LIMIT ?
      `;
      db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = Furniture; 