// 引入必要的模块
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Design = require('../models/design');
const Furniture = require('../models/furniture');

// JWT 密钥和有效期
const JWT_SECRET = process.env.JWT_SECRET || 'bedroom-styler-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7天

// 显示管理员登录页面
exports.showLoginPage = (req, res) => {
  res.render('admin/login', { title: '管理员登录 - BedroomStyler', error: null });
};

// 管理员登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findByEmail(email);
    if (!user || user.role !== 'admin') {
      return res.render('admin/login', { 
        title: '管理员登录 - BedroomStyler', 
        error: '邮箱或密码不正确，或者您不是管理员' 
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('admin/login', { 
        title: '管理员登录 - BedroomStyler', 
        error: '邮箱或密码不正确' 
      });
    }

    // 创建 JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 设置 cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    // 重定向到管理员首页
    res.redirect('/admin');
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.render('admin/login', { 
      title: '管理员登录 - BedroomStyler', 
      error: '服务器错误，请稍后再试' 
    });
  }
};

// 显示管理员首页/控制台
exports.showDashboard = async (req, res) => {
  try {
    // 获取统计数据
    const userCount = await User.count();
    const designCount = await Design.count();
    const furnitureCount = await Furniture.count();
    
    // 获取最近注册的用户
    const recentUsers = await User.findRecent(5);
    
    // 获取最近的设计
    const recentDesigns = await Design.findRecent(5);

    res.render('admin/dashboard', {
      title: '管理控制台 - BedroomStyler',
      user: req.user,
      stats: {
        userCount,
        designCount,
        furnitureCount
      },
      recentUsers,
      recentDesigns
    });
  } catch (error) {
    console.error('显示控制台错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// 用户管理 - 列出所有用户
exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // 获取用户列表和总数
    const users = await User.findAll(limit, offset);
    const total = await User.count();
    
    const totalPages = Math.ceil(total / limit);

    res.render('admin/users/list', {
      title: '用户管理 - BedroomStyler',
      user: req.user,
      users,
      pagination: {
        current: page,
        total: totalPages,
        limit
      }
    });
  } catch (error) {
    console.error('列出用户错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// 用户管理 - 获取用户详情
exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).render('error', { 
        title: '错误', 
        message: '用户不存在',
        error: {}
      });
    }
    
    // 获取用户的设计
    const designs = await Design.findByUserId(userId);

    res.render('admin/users/details', {
      title: `用户详情: ${user.username} - BedroomStyler`,
      user: req.user,
      targetUser: user,
      designs
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// 用户管理 - 更新用户
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, role } = req.body;
    
    // 更新用户
    await User.update(userId, { username, email, role });
    
    req.flash('success', '用户已更新');
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('更新用户错误:', error);
    req.flash('error', '更新用户失败');
    res.redirect(`/admin/users/${req.params.id}`);
  }
};

// 用户管理 - 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // 删除用户
    await User.delete(userId);
    
    req.flash('success', '用户已删除');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('删除用户错误:', error);
    req.flash('error', '删除用户失败');
    res.redirect('/admin/users');
  }
};

// 家具管理 - 列出所有家具
exports.listFurniture = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // 获取家具列表和总数
    const furniture = await Furniture.findAll(limit, offset);
    const total = await Furniture.count();
    
    const totalPages = Math.ceil(total / limit);

    res.render('admin/furniture/list', {
      title: '家具管理 - BedroomStyler',
      user: req.user,
      furniture,
      pagination: {
        current: page,
        total: totalPages,
        limit
      }
    });
  } catch (error) {
    console.error('列出家具错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// 家具管理 - 显示添加新家具的表单
exports.showNewFurnitureForm = (req, res) => {
  res.render('admin/furniture/new', {
    title: '添加家具 - BedroomStyler',
    user: req.user,
    furniture: null,
    error: null
  });
};

// 家具管理 - 创建新家具
exports.createFurniture = async (req, res) => {
  try {
    const { name, category, description, model_url, thumbnail_url, price } = req.body;
    
    // 创建家具
    const furniture = {
      name,
      category,
      description,
      model_url,
      thumbnail_url,
      price: parseFloat(price),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await Furniture.create(furniture);
    
    req.flash('success', '家具已添加');
    res.redirect('/admin/furniture');
  } catch (error) {
    console.error('创建家具错误:', error);
    res.render('admin/furniture/new', {
      title: '添加家具 - BedroomStyler',
      user: req.user,
      furniture: req.body,
      error: '创建家具失败'
    });
  }
};

// 家具管理 - 获取家具详情
exports.getFurnitureDetails = async (req, res) => {
  try {
    const furnitureId = req.params.id;
    const furniture = await Furniture.findById(furnitureId);
    
    if (!furniture) {
      return res.status(404).render('error', { 
        title: '错误', 
        message: '家具不存在',
        error: {}
      });
    }

    res.render('admin/furniture/edit', {
      title: `编辑家具: ${furniture.name} - BedroomStyler`,
      user: req.user,
      furniture,
      error: null
    });
  } catch (error) {
    console.error('获取家具详情错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// 家具管理 - 更新家具
exports.updateFurniture = async (req, res) => {
  try {
    const furnitureId = req.params.id;
    const { name, category, description, model_url, thumbnail_url, price } = req.body;
    
    // 更新家具
    const furniture = {
      name,
      category,
      description,
      model_url,
      thumbnail_url,
      price: parseFloat(price),
      updated_at: new Date()
    };
    
    await Furniture.update(furnitureId, furniture);
    
    req.flash('success', '家具已更新');
    res.redirect(`/admin/furniture/${furnitureId}`);
  } catch (error) {
    console.error('更新家具错误:', error);
    req.flash('error', '更新家具失败');
    res.redirect(`/admin/furniture/${req.params.id}`);
  }
};

// 家具管理 - 删除家具
exports.deleteFurniture = async (req, res) => {
  try {
    const furnitureId = req.params.id;
    
    // 删除家具
    await Furniture.delete(furnitureId);
    
    req.flash('success', '家具已删除');
    res.redirect('/admin/furniture');
  } catch (error) {
    console.error('删除家具错误:', error);
    req.flash('error', '删除家具失败');
    res.redirect('/admin/furniture');
  }
};

// 显示统计数据
exports.showStatistics = async (req, res) => {
  try {
    // 用户统计
    const userCount = await User.count();
    const usersByMonth = await User.countByMonth();
    
    // 设计统计
    const designCount = await Design.count();
    const designsByMonth = await Design.countByMonth();
    
    // 家具使用统计
    const topFurniture = await Furniture.getTopUsed(10);

    res.render('admin/statistics', {
      title: '统计数据 - BedroomStyler',
      user: req.user,
      stats: {
        userCount,
        usersByMonth,
        designCount,
        designsByMonth,
        topFurniture
      }
    });
  } catch (error) {
    console.error('显示统计数据错误:', error);
    res.status(500).render('error', { 
      title: '错误', 
      message: '服务器错误，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
}; 