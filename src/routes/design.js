// 引入必要的模块
const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const authMiddleware = require('../middlewares/authMiddleware');

// 显示设计页面
router.get('/', designController.showDesignPage);

// 保存设计
router.post('/save', authMiddleware.verifyToken, designController.saveDesign);

// 获取用户的设计列表
router.get('/my-designs', authMiddleware.verifyToken, designController.getUserDesigns);

// 加载一个设计方案
router.get('/load/:id', designController.loadDesign);

// 获取家具列表
router.get('/furniture', designController.getFurnitureList);

// 获取家具详情
router.get('/furniture/:id', designController.getFurnitureDetails);

// 生成卧室效果图
router.post('/render', designController.renderBedroom);

module.exports = router; 