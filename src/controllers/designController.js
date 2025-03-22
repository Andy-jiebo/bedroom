// 引入必要的模块
const Design = require('../models/design');
const Furniture = require('../models/furniture');

// 显示设计页面
exports.showDesignPage = (req, res) => {
  res.render('design/editor', { 
    title: '卧室设计 - BedroomStyler', 
    user: req.user || null
  });
};

// 保存用户设计
exports.saveDesign = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, design, thumbnail } = req.body;

    // 验证必要的参数
    if (!name || !design) {
      return res.status(400).json({ error: '设计名称和设计数据不能为空' });
    }

    // 创建设计记录
    const designData = {
      user_id: userId,
      name,
      design: JSON.stringify(design),
      thumbnail,
      created_at: new Date(),
      updated_at: new Date()
    };

    const savedDesign = await Design.create(designData);

    res.status(201).json({ 
      success: true, 
      message: '设计已保存',
      design: savedDesign 
    });
  } catch (error) {
    console.error('保存设计错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
};

// 获取用户的设计列表
exports.getUserDesigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const designs = await Design.findByUserId(userId);

    res.json({ designs });
  } catch (error) {
    console.error('获取用户设计列表错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
};

// 加载一个设计方案
exports.loadDesign = async (req, res) => {
  try {
    const designId = req.params.id;
    const design = await Design.findById(designId);

    if (!design) {
      return res.status(404).json({ error: '设计不存在' });
    }

    // 如果设计是私有的，检查是否属于当前用户
    if (design.is_private && (!req.user || req.user.id !== design.user_id)) {
      return res.status(403).json({ error: '无权访问该设计' });
    }

    res.json({ design });
  } catch (error) {
    console.error('加载设计错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
};

// 获取家具列表
exports.getFurnitureList = async (req, res) => {
  try {
    const { category, search } = req.query;
    let furniture;

    if (category) {
      furniture = await Furniture.findByCategory(category);
    } else if (search) {
      furniture = await Furniture.search(search);
    } else {
      furniture = await Furniture.findAll();
    }

    res.json({ furniture });
  } catch (error) {
    console.error('获取家具列表错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
};

// 获取家具详情
exports.getFurnitureDetails = async (req, res) => {
  try {
    const furnitureId = req.params.id;
    const furniture = await Furniture.findById(furnitureId);

    if (!furniture) {
      return res.status(404).json({ error: '家具不存在' });
    }

    res.json({ furniture });
  } catch (error) {
    console.error('获取家具详情错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
};

// 生成卧室效果图
exports.renderBedroom = (req, res) => {
  try {
    const { design } = req.body;

    // 在实际项目中，这里可能会调用 Three.js 或其他渲染服务
    // 这里简化处理，假设直接返回一个生成的图像URL
    
    // 模拟渲染延迟
    setTimeout(() => {
      res.json({ 
        success: true, 
        message: '效果图已生成',
        // 实际项目中，这里会返回实际渲染的图像URL
        imageUrl: `/images/rendered/sample-${Math.floor(Math.random() * 5) + 1}.jpg`
      });
    }, 1000);
  } catch (error) {
    console.error('渲染卧室错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
}; 