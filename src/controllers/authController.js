// 引入必要的模块
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// 密码加密的盐值轮数
const SALT_ROUNDS = 10;

// JWT 密钥和有效期
const JWT_SECRET = process.env.JWT_SECRET || 'bedroom-styler-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7天

// 显示登录页面
exports.showLoginPage = (req, res) => {
  res.render('auth/login', { title: '登录 - BedroomStyler', error: null });
};

// 处理登录请求
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 检查用户是否存在
    const user = await User.findByEmail(email);
    if (!user) {
      return res.render('auth/login', { 
        title: '登录 - BedroomStyler', 
        error: '邮箱或密码不正确' 
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('auth/login', { 
        title: '登录 - BedroomStyler', 
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

    // 根据用户角色重定向
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.render('auth/login', { 
      title: '登录 - BedroomStyler', 
      error: '服务器错误，请稍后再试' 
    });
  }
};

// 显示注册页面
exports.showRegisterPage = (req, res) => {
  res.render('auth/register', { title: '注册 - BedroomStyler', error: null });
};

// 处理注册请求
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 验证密码是否匹配
    if (password !== confirmPassword) {
      return res.render('auth/register', { 
        title: '注册 - BedroomStyler', 
        error: '两次输入的密码不一致' 
      });
    }

    // 检查邮箱是否已被使用
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render('auth/register', { 
        title: '注册 - BedroomStyler', 
        error: '该邮箱已被注册' 
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const user = {
      username,
      email,
      password: hashedPassword,
      role: 'user',
      created_at: new Date()
    };

    // 保存用户
    const newUser = await User.create(user);

    // 创建 JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 设置 cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    // 重定向到首页
    res.redirect('/');
  } catch (error) {
    console.error('注册错误:', error);
    res.render('auth/register', { 
      title: '注册 - BedroomStyler', 
      error: '服务器错误，请稍后再试' 
    });
  }
};

// 退出登录
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

// 获取当前用户信息
exports.getCurrentUser = (req, res) => {
  res.json({ user: req.user });
}; 