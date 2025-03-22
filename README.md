# BedroomStyler - 卧室设计工具

这是一个简单易用的卧室设计工具，让用户能够轻松设计自己理想的卧室，并生成漂亮的3D效果图。

## 功能特点

- 直观的拖放设计界面
- 丰富的家具库
- 3D实时预览
- 高质量渲染效果图
- 保存和分享设计

## 技术栈

- 前端：HTML, CSS, JavaScript, Three.js
- 后端：Node.js, Express
- 模板引擎：EJS

## 安装与运行

1. 克隆项目
   ```
   git clone <项目地址>
   cd bedroom-styler
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 运行项目
   ```
   npm start
   ```
   
   或者开发模式运行（自动重启）
   ```
   npm run dev
   ```

4. 打开浏览器访问
   ```
   http://localhost:3000
   ```

## 文件结构

- `/public` - 静态资源文件夹
  - `/css` - 样式表
  - `/js` - JavaScript文件
  - `/images` - 图片资源
  - `/models` - 3D模型文件
- `/views` - EJS模板文件
  - `/partials` - 页面部分组件
  - `/design` - 设计相关页面
- `app.js` - 主服务器文件

## 使用说明

1. 进入设计页面
2. 从侧边栏选择家具添加到卧室
3. 调整家具的位置、旋转和大小
4. 点击渲染按钮生成效果图
5. 保存或分享你的设计

## 创建者

BedroomStyler 项目由 [作者] 创建

## 许可证

[MIT](LICENSE) 