// 引入必要的模块
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'bedroom-styler-secret-key';

// 验证 JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    // 从 cookie 中获取 token
    const token = req.cookies.token;
    
    if (!token) {
      // 如果是 API 请求，返回 JSON 错误
      if (req.path.startsWith('/api') || req.xhr) {
        return res.status(401).json({ error: '未授权，请先登录' });
      }
      
      // 否则重定向到登录页面
      return res.redirect('/auth/login');
    }
    
    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从数据库中获取用户
    const user = await User.findById(decoded.id);
    
    if (!user) {
      res.clearCookie('token');
      
      if (req.path.startsWith('/api') || req.xhr) {
        return res.status(401).json({ error: '无效的用户，请重新登录' });
      }
      
      return res.redirect('/auth/login');
    }
    
    // 将用户信息保存到请求对象中
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Token 验证错误:', error);
    res.clearCookie('token');
    
    if (req.path.startsWith('/api') || req.xhr) {
      return res.status(401).json({ error: '未授权，请先登录' });
    }
    
    res.redirect('/auth/login');
  }
};

// 可选的验证 token，不会阻止未登录用户访问
exports.optionalAuth = async (req, res, next) => {
  try {
    // 从 cookie 中获取 token
    const token = req.cookies.token;
    
    if (!token) {
      return next();
    }
    
    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从数据库中获取用户
    const user = await User.findById(decoded.id);
    
    if (user) {
      // 将用户信息保存到请求对象中
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
    }
    
    next();
  } catch (error) {
    console.error('可选验证错误:', error);
    // 即使验证失败，也允许请求继续
    next();
  }
}; 