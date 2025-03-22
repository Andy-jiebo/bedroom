// 引入必要的模块
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// 验证是否是管理员
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).render('error', { 
      title: '权限不足', 
      message: '您无权访问该页面',
      error: {}
    });
  }
};

// 管理员登录
router.get('/login', adminController.showLoginPage);
router.post('/login', adminController.login);

// 需要管理员权限的路由
router.use(authMiddleware.verifyToken, isAdmin);

// 管理员首页
router.get('/', adminController.showDashboard);

// 用户管理
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id', adminController.updateUser);
router.post('/users/:id/delete', adminController.deleteUser);

// 家具管理
router.get('/furniture', adminController.listFurniture);
router.get('/furniture/new', adminController.showNewFurnitureForm);
router.post('/furniture/new', adminController.createFurniture);
router.get('/furniture/:id', adminController.getFurnitureDetails);
router.post('/furniture/:id', adminController.updateFurniture);
router.post('/furniture/:id/delete', adminController.deleteFurniture);

// 统计数据
router.get('/statistics', adminController.showStatistics);

module.exports = router; 