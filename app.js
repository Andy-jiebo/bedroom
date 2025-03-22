const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 设置静态文件目录
app.use(express.static('public', {
  setHeaders: function (res, path) {
    // 为JavaScript模块设置正确的MIME类型
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
    // 为GLTF模型设置正确的MIME类型
    else if (path.endsWith('.gltf')) {
      res.set('Content-Type', 'model/gltf+json');
    }
    // 为GLB二进制模型设置MIME类型
    else if (path.endsWith('.glb')) {
      res.set('Content-Type', 'model/gltf-binary');
    }
  }
}));

// 解析请求体
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true }));

// 示例数据
const demoFurniture = [
  {
    id: 1,
    name: '简约单人床',
    category: 'bed',
    thumbnail_url: '/images/furniture/bed1_thumb.jpg',
    model_url: '/models/bed1.gltf'
  },
  {
    id: 2,
    name: '北欧风衣柜',
    category: 'cabinet',
    thumbnail_url: '/images/furniture/cabinet1_thumb.jpg',
    model_url: '/models/cabinet1.gltf'
  },
  {
    id: 3,
    name: '现代书桌',
    category: 'table',
    thumbnail_url: '/images/furniture/desk1_thumb.jpg',
    model_url: '/models/desk1.gltf'
  },
  {
    id: 4,
    name: '人体工学椅',
    category: 'chair',
    thumbnail_url: '/images/furniture/chair1_thumb.jpg',
    model_url: '/models/chair1.gltf'
  }
];

// 路由
app.get('/', (req, res) => {
  res.render('index', {
    title: 'BedroomStyler - 卧室设计工具',
    user: null
  });
});

app.get('/design', (req, res) => {
  res.render('design/editor', {
    title: '设计卧室 - BedroomStyler',
    user: null,
    styles: ['/css/editor.css']
  });
});

app.get('/gallery', (req, res) => {
  res.render('gallery', {
    title: '设计展示 - BedroomStyler',
    user: null
  });
});

// 认证相关路由
app.get('/auth/login', (req, res) => {
  res.render(path.join(__dirname, 'views', 'auth', 'login.ejs'), {
    title: '登录 - BedroomStyler',
    user: null,
    error: null
  });
});

app.get('/auth/register', (req, res) => {
  res.render(path.join(__dirname, 'views', 'auth', 'register.ejs'), {
    title: '注册 - BedroomStyler',
    user: null,
    error: null
  });
});

app.post('/auth/login', (req, res) => {
  // 简单的模拟登录
  const { email, password } = req.body;
  if (email === 'demo@example.com' && password === 'password') {
    // 登录成功，重定向到首页
    return res.redirect('/');
  }
  
  // 登录失败
  res.render('auth/login', {
    title: '登录 - BedroomStyler',
    user: null,
    error: '邮箱或密码错误'
  });
});

app.post('/auth/register', (req, res) => {
  // 简单的模拟注册
  const { username, email, password, confirmPassword } = req.body;
  
  // 简单验证
  if (!username || !email || !password) {
    return res.render('auth/register', {
      title: '注册 - BedroomStyler',
      user: null,
      error: '所有字段都是必填的'
    });
  }
  
  if (password !== confirmPassword) {
    return res.render('auth/register', {
      title: '注册 - BedroomStyler',
      user: null,
      error: '两次输入的密码不匹配'
    });
  }
  
  // 模拟注册成功
  res.redirect('/auth/login?registered=true');
});

app.get('/auth/logout', (req, res) => {
  // 简单的模拟登出
  res.redirect('/');
});

// 测试路由
app.get('/auth/test', (req, res) => {
  res.render('auth/test', {
    title: '测试页面'
  });
});

// API 路由
app.get('/api/furniture', (req, res) => {
  const { category, search } = req.query;
  let filteredFurniture = [...demoFurniture];
  
  if (category && category !== 'all') {
    filteredFurniture = filteredFurniture.filter(item => item.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredFurniture = filteredFurniture.filter(item => 
      item.name.toLowerCase().includes(searchLower) || 
      item.category.toLowerCase().includes(searchLower)
    );
  }
  
  res.json({ furniture: filteredFurniture });
});

app.post('/api/design/save', (req, res) => {
  // 简单的模拟保存成功
  res.json({ success: true, id: Math.floor(Math.random() * 1000) });
});

app.post('/api/design/render', (req, res) => {
  // 简单的模拟渲染成功，返回一个假的图片URL
  // 实际应用中，这里应该调用渲染引擎生成效果图
  setTimeout(() => {
    res.json({
      success: true,
      imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1157&q=80'
    });
  }, 1500); // 模拟渲染需要一些时间
});

// 直接发送HTML响应
app.get('/auth/direct', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>直接HTML响应</title>
    </head>
    <body>
      <h1>直接HTML响应</h1>
      <p>这是直接从Express路由发送的HTML响应，无需使用视图引擎。</p>
    </body>
    </html>
  `);
});

// 启动服务器
app.listen(port, () => {
  console.log(`BedroomStyler 应用正在 http://localhost:${port} 上运行`);
}); 