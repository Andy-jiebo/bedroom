// 引入必要的模块
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// 显示登录页面
router.get('/login', authController.showLoginPage);

// 处理登录请求
router.post('/login', authController.login);

// 显示注册页面
router.get('/register', authController.showRegisterPage);

// 处理注册请求
router.post('/register', authController.register);

// 退出登录
router.get('/logout', authMiddleware.verifyToken, authController.logout);

// 获取当前用户信息
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);

module.exports = router; 