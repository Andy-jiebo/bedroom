// 引入必要的模块
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// 配置环境变量
dotenv.config();

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));

// 引入路由
const authRoutes = require('./routes/auth');
const designRoutes = require('./routes/design');
const adminRoutes = require('./routes/admin');

// 使用路由
app.use('/auth', authRoutes);
app.use('/design', designRoutes);
app.use('/admin', adminRoutes);

// 首页路由
app.get('/', (req, res) => {
  res.render('index', { title: '卧室设计工具 - BedroomStyler' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，访问 http://localhost:${PORT}`);
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: '出错了', 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 处理 404 页面
app.use((req, res) => {
  res.status(404).render('error', { 
    title: '页面未找到', 
    message: '您访问的页面不存在',
    error: {}
  });
}); 