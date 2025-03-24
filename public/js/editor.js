// 卧室设计编辑器核心JavaScript
let THREE, OrbitControls, GLTFLoader;

// 全局变量
let scene, camera, renderer, controls;
let room = {
  floor: null,
  walls: []
};
let furnitureList = [];
let selectedObject = null;
let transformMode = 'move'; // 'move', 'rotate', 'delete'
let mouseDown = false;
let mousePosition;
let raycaster;
let history = [];
let historyIndex = -1;
let isDragging = false;

// 获取URL参数
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 动态加载THREE.js库
async function loadThreeJS() {
  try {
    // 动态导入模块
    THREE = await import('three');
    const OrbitControlsModule = await import('https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js');
    const GLTFLoaderModule = await import('https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
    
    OrbitControls = OrbitControlsModule.OrbitControls;
    GLTFLoader = GLTFLoaderModule.GLTFLoader;
    
    console.log('Three.js及相关模块加载完成');
    
    // 在THREE加载完成后初始化Vector2
    mousePosition = new THREE.Vector2();
    
    // 初始化编辑器
    initDomElements();
    initEditor();
    
    // 检查URL参数，如果是draw模式则显示尺寸设置模态窗口
    const mode = getUrlParameter('mode');
    if (mode === 'draw') {
      showRoomSizeModal();
    }
  } catch (error) {
    console.error('加载Three.js模块失败:', error);
  }
}

// 显示卧室尺寸设置模态窗口
function showRoomSizeModal() {
  const modal = document.getElementById('room-size-modal');
  
  // 获取URL参数
  const mode = getUrlParameter('mode');
  
  // 设置初始值
  if (mode === 'draw') {
    // 如果是绘制模式，使用默认值
    document.getElementById('room-length').value = 4;
    document.getElementById('room-width').value = 3;
    document.getElementById('room-height').value = 2.8;
    document.getElementById('room-shape').value = 'rectangle';
  } else {
    // 非绘制模式，尝试从当前房间尺寸设置值加载
    const savedRoomSettings = localStorage.getItem('roomSettings');
    if (savedRoomSettings) {
      try {
        const settings = JSON.parse(savedRoomSettings);
        document.getElementById('room-length').value = settings.length || 4;
        document.getElementById('room-width').value = settings.width || 3;
        document.getElementById('room-height').value = settings.height || 2.8;
        
        const shapeSelect = document.getElementById('room-shape');
        if (settings.shape && (settings.shape === 'rectangle' || settings.shape === 'l-shape')) {
          shapeSelect.value = settings.shape;
        } else {
          shapeSelect.value = 'rectangle';
        }
      } catch (e) {
        console.error('解析房间设置失败:', e);
        // 解析失败时使用默认值
        document.getElementById('room-length').value = 4;
        document.getElementById('room-width').value = 3;
        document.getElementById('room-height').value = 2.8;
        document.getElementById('room-shape').value = 'rectangle';
      }
    } else {
      // 没有保存的设置时使用默认值
      document.getElementById('room-length').value = 4;
      document.getElementById('room-width').value = 3;
      document.getElementById('room-height').value = 2.8;
      document.getElementById('room-shape').value = 'rectangle';
    }
  }
  
  modal.style.display = 'flex';
  
  // 移除旧的事件监听器，避免多次绑定
  const cancelBtn = document.getElementById('cancel-room-size');
  const confirmBtn = document.getElementById('confirm-room-size');
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // 取消按钮事件
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    
    // 如果是绘制模式且取消了设置，返回上一页
    if (mode === 'draw') {
      window.history.back();
    }
  });
  
  // 确认按钮事件
  newConfirmBtn.addEventListener('click', () => {
    const length = parseFloat(document.getElementById('room-length').value);
    const width = parseFloat(document.getElementById('room-width').value);
    const height = parseFloat(document.getElementById('room-height').value);
    const shape = document.getElementById('room-shape').value;
    
    // 保存房间设置到本地存储
    const roomSettings = {
      length: length,
      width: width,
      height: height,
      shape: shape
    };
    localStorage.setItem('roomSettings', JSON.stringify(roomSettings));
    
    // 显示加载中提示
    document.querySelector('.loading-overlay').style.display = 'flex';
    
    // 稍微延迟重建房间，以便加载提示能够显示
    setTimeout(() => {
      // 清除当前房间结构
      clearRoom();
      
      // 创建新房间
      createRoomFromSettings(roomSettings);
      
      // 重建踢脚线以确保所有墙壁有正确的踢脚线
      createSkirting();
      
      // 隐藏加载提示
      document.querySelector('.loading-overlay').style.display = 'none';
      
      // 隐藏模态窗口
      modal.style.display = 'none';
      
      // 如果是绘制模式，更新URL去掉mode参数
      if (mode === 'draw') {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        window.history.replaceState({}, document.title, url.toString());
      }
      
      // 添加到历史记录
      addToHistory();
    }, 300);
  });
}

// 清除当前房间结构
function clearRoom() {
  // 移除地板
  if (room.floor) {
    scene.remove(room.floor);
  }
  
  // 移除墙壁
  room.walls.forEach(wall => {
    scene.remove(wall);
  });
  
  // 重置房间对象
  room = {
    floor: null,
    walls: []
  };
}

// 初始化DOM元素
function initDomElements() {
  // 添加调试信息
  console.log('开始初始化DOM元素');
  const canvas = document.getElementById('design-canvas');
  console.log('画布元素:', canvas);
  const canvasContainer = document.querySelector('.canvas-container');
  console.log('画布容器:', canvasContainer);
  
  if (canvasContainer) {
    console.log('画布容器尺寸:', {
      width: canvasContainer.clientWidth,
      height: canvasContainer.clientHeight,
      offsetWidth: canvasContainer.offsetWidth,
      offsetHeight: canvasContainer.offsetHeight,
      style: canvasContainer.style.cssText
    });
  }
  
  // 显示加载中
  const loadingOverlay = document.querySelector('.loading-overlay');
  console.log('加载覆盖层:', loadingOverlay);
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  } else {
    console.error('找不到加载覆盖层元素');
  }
  
  console.log('编辑器脚本加载完成');
}

// 初始化Three.js场景
function initEditor() {
  console.log('开始初始化编辑器');
  
  try {
    // 检查画布元素
    const canvas = document.getElementById('design-canvas');
    if (!canvas) {
      throw new Error('找不到画布元素 #design-canvas');
    }
    console.log('画布尺寸:', {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      style: canvas.style.cssText
    });
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 3);
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    
    // 获取画布容器尺寸
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    console.log('渲染器设置尺寸:', {
      containerWidth: containerWidth,
      containerHeight: containerHeight
    });
    
    renderer.setSize(containerWidth, containerHeight);
    renderer.shadowMap.enabled = true;
    
    // 初始化射线拾取器
    raycaster = new THREE.Raycaster();
    
    // 添加轨道控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 添加辅助网格
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // 尝试加载保存的房间设置
    const savedRoomSettings = localStorage.getItem('roomSettings');
    if (savedRoomSettings) {
      try {
        const roomConfig = JSON.parse(savedRoomSettings);
        console.log('加载保存的房间配置:', roomConfig);
        
        // 根据保存的设置创建房间
        createRoomFromSettings(roomConfig);
      } catch (e) {
        console.error('解析房间设置失败:', e);
        // 使用默认设置创建房间
        createRoom();
      }
    } else {
      // 如果没有保存的设置，使用默认设置创建房间
      createRoom();
    }
    
    // 初始化历史记录
    addToHistory();
    
    // 隐藏加载中
    document.querySelector('.loading-overlay').style.display = 'none';
    
    // 加载家具数据
    loadFurnitureData();
    
    // 添加事件监听
    initEventListeners();
    
    // 开始动画循环
    animate();
    
    console.log('编辑器初始化完成');
  } catch (error) {
    console.error('编辑器初始化错误:', error);
    alert('初始化编辑器失败: ' + error.message);
  }
}

// 根据设置创建房间
function createRoomFromSettings(config) {
  const length = config.length || 4;
  const width = config.width || 3;
  const height = config.height || 2.8;
  const shape = config.shape || 'rectangle';
  
  console.log(`根据设置创建房间: 形状=${shape}, 长=${length}, 宽=${width}, 高=${height}`);
  
  // 创建地板
  const floorGeometry = new THREE.PlaneGeometry(length, width);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    side: THREE.DoubleSide,
    roughness: 0.8
  });
  room.floor = new THREE.Mesh(floorGeometry, floorMaterial);
  room.floor.rotation.x = -Math.PI / 2;
  room.floor.position.y = 0;
  room.floor.receiveShadow = true;
  room.floor.userData.isFloor = true;
  scene.add(room.floor);
  
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.6
  });
  
  if (shape === 'rectangle') {
    // 创建标准矩形房间
    
    // 后墙
    const backWallGeometry = new THREE.PlaneGeometry(length, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, -width/2);
    backWall.receiveShadow = true;
    backWall.userData.isWall = true;
    backWall.userData.wallType = 'back';
    scene.add(backWall);
    room.walls.push(backWall);
    
    // 左墙
    const leftWallGeometry = new THREE.PlaneGeometry(width, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-length/2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.userData.isWall = true;
    leftWall.userData.wallType = 'left';
    scene.add(leftWall);
    room.walls.push(leftWall);
    
    // 右墙
    const rightWallGeometry = new THREE.PlaneGeometry(width, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(length/2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.userData.isWall = true;
    rightWall.userData.wallType = 'right';
    scene.add(rightWall);
    room.walls.push(rightWall);
    
    // 前墙 (添加一个前墙以使房间完整)
    const frontWallGeometry = new THREE.PlaneGeometry(length, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, height / 2, width/2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.userData.isWall = true;
    frontWall.userData.wallType = 'front';
    scene.add(frontWall);
    room.walls.push(frontWall);
    
  } else if (shape === 'l-shape') {
    // 创建L形房间
    const mainLength = length * 0.7;
    const mainWidth = width;
    const extWidth = width * 0.6;
    
    // 主区域后墙
    const backWallGeometry = new THREE.PlaneGeometry(length, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, -width/2);
    backWall.receiveShadow = true;
    backWall.userData.isWall = true;
    backWall.userData.wallType = 'back';
    scene.add(backWall);
    room.walls.push(backWall);
    
    // 主区域左墙
    const leftWallGeometry = new THREE.PlaneGeometry(width, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-length/2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.userData.isWall = true;
    leftWall.userData.wallType = 'left';
    scene.add(leftWall);
    room.walls.push(leftWall);
    
    // 扩展区域右墙
    const rightWallGeometry = new THREE.PlaneGeometry(extWidth, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(length/2, height / 2, -width * 0.2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.userData.isWall = true;
    rightWall.userData.wallType = 'right';
    scene.add(rightWall);
    room.walls.push(rightWall);
    
    // 连接墙
    const connectWallGeometry = new THREE.PlaneGeometry(width - extWidth, height);
    const connectWall = new THREE.Mesh(connectWallGeometry, wallMaterial);
    connectWall.position.set(mainLength - length/2, height / 2, extWidth - width/2);
    connectWall.rotation.y = -Math.PI / 2;
    connectWall.receiveShadow = true;
    connectWall.userData.isWall = true;
    connectWall.userData.wallType = 'connect';
    scene.add(connectWall);
    room.walls.push(connectWall);
    
    // 扩展区域前墙
    const frontWallGeometry = new THREE.PlaneGeometry(length * 0.3, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(length * 0.35, height / 2, extWidth - width/2);
    frontWall.receiveShadow = true;
    frontWall.userData.isWall = true;
    frontWall.userData.wallType = 'front';
    scene.add(frontWall);
    room.walls.push(frontWall);
    
    // 主区域前墙
    const frontWall1Geometry = new THREE.PlaneGeometry(mainLength, height);
    const frontWall1 = new THREE.Mesh(frontWall1Geometry, wallMaterial);
    frontWall1.position.set(-length * 0.15, height / 2, width/2);
    frontWall1.receiveShadow = true;
    frontWall1.userData.isWall = true;
    frontWall1.userData.wallType = 'front';
    scene.add(frontWall1);
    room.walls.push(frontWall1);
    
    // 修改地板形状为L形
    scene.remove(room.floor);
    
    const floorShape = new THREE.Shape();
    floorShape.moveTo(-length/2, -width/2);
    floorShape.lineTo(length/2, -width/2);
    floorShape.lineTo(length/2, -width/2 + extWidth);
    floorShape.lineTo(mainLength - length/2, -width/2 + extWidth);
    floorShape.lineTo(mainLength - length/2, width/2);
    floorShape.lineTo(-length/2, width/2);
    floorShape.lineTo(-length/2, -width/2);
    
    const lFloorGeometry = new THREE.ShapeGeometry(floorShape);
    room.floor = new THREE.Mesh(lFloorGeometry, floorMaterial);
    room.floor.rotation.x = -Math.PI / 2;
    room.floor.receiveShadow = true;
    room.floor.userData.isFloor = true;
    scene.add(room.floor);
  }
  
  // 创建踢脚线
  createSkirting();
}

// 创建房间结构
function createRoom() {
  // 创建地板
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    side: THREE.DoubleSide,
    roughness: 0.8
  });
  room.floor = new THREE.Mesh(floorGeometry, floorMaterial);
  room.floor.rotation.x = -Math.PI / 2;
  room.floor.position.y = 0;
  room.floor.receiveShadow = true;
  room.floor.userData.isFloor = true;
  scene.add(room.floor);
  
  // 创建墙壁
  const wallHeight = 3;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.6
  });
  
  // 后墙
  const backWallGeometry = new THREE.PlaneGeometry(10, wallHeight);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.set(0, wallHeight / 2, -5);
  backWall.receiveShadow = true;
  backWall.userData.isWall = true;
  backWall.userData.wallType = 'back';
  scene.add(backWall);
  room.walls.push(backWall);
  
  // 左墙
  const leftWallGeometry = new THREE.PlaneGeometry(10, wallHeight);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWall.position.set(-5, wallHeight / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  leftWall.userData.isWall = true;
  leftWall.userData.wallType = 'left';
  scene.add(leftWall);
  room.walls.push(leftWall);
  
  // 踢脚线
  createSkirting();
}

// 创建踢脚线
function createSkirting() {
  const skirtingHeight = 0.1;
  const skirtingDepth = 0.05;
  const skirtingMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7d6b,
    roughness: 0.5
  });
  
  // 移除旧的踢脚线
  scene.children.forEach(child => {
    if (child.userData.isSkirting) {
      scene.remove(child);
    }
  });
  
  // 为每个墙壁创建踢脚线
  room.walls.forEach(wall => {
    // 获取墙壁尺寸和位置
    const wallWidth = (wall.geometry.parameters.width || 1);
    
    // 创建踢脚线几何体
    const skirtingGeometry = new THREE.BoxGeometry(wallWidth, skirtingHeight, skirtingDepth);
    const skirting = new THREE.Mesh(skirtingGeometry, skirtingMaterial);
    
    // 设置位置和旋转，与墙壁对齐
    skirting.position.copy(wall.position);
    skirting.position.y = skirtingHeight / 2; // 底部对齐
    skirting.rotation.copy(wall.rotation);
    
    // 根据墙壁方向微调位置
    if (Math.abs(wall.rotation.y) < 0.1 || Math.abs(wall.rotation.y - Math.PI) < 0.1) {
      // 前后墙
      skirting.position.z += (wall.rotation.y < 0.1) ? skirtingDepth/2 : -skirtingDepth/2;
    } else {
      // 左右墙
      skirting.position.x += (wall.rotation.y > 0) ? skirtingDepth/2 : -skirtingDepth/2;
    }
    
    // 设置踢脚线属性
    skirting.userData.isSkirting = true;
    skirting.userData.wallId = wall.uuid;
    skirting.userData.wallType = wall.userData.wallType;
    
    // 添加到场景
    scene.add(skirting);
    
    console.log(`已为墙壁 ${wall.userData.wallType} 创建踢脚线`);
  });
}

// 窗口大小改变时调整
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    document.querySelector('.canvas-container').clientWidth,
    document.querySelector('.canvas-container').clientHeight
  );
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  
  try {
    // 更新控制器
    if (controls) controls.update();
    
    // 渲染场景
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  } catch (error) {
    console.error('动画循环错误:', error);
  }
}

// 加载家具数据
function loadFurnitureData(category = 'all', search = '') {
  const furnitureList = document.getElementById('furniture-list');
  
  // 清空家具列表
  while (furnitureList.firstChild) {
    furnitureList.removeChild(furnitureList.firstChild);
  }
  
  // 显示加载中
  const loadingItem = document.createElement('div');
  loadingItem.className = 'loading';
  loadingItem.textContent = '加载中...';
  furnitureList.appendChild(loadingItem);
  
  console.log(`开始加载家具数据, 分类: ${category} 搜索: ${search}`);
  
  // 构建API请求URL
  const apiUrl = `/api/furniture?category=${category}&search=${search}`;
  console.log(`API请求URL: ${apiUrl}`);
  
  // 从API获取家具数据
  fetch(apiUrl)
    .then(response => {
      console.log(`API响应状态: ${response.status}`);
      if (!response.ok) {
        throw new Error('加载家具数据失败');
      }
      return response.json();
    })
    .then(data => {
      console.log('成功获取家具数据:', data);
      
      // 移除加载提示
      furnitureList.removeChild(loadingItem);
      
      if (data.furniture && data.furniture.length > 0) {
        // 添加家具项
        data.furniture.forEach(item => {
          const furnitureItem = document.createElement('div');
          furnitureItem.className = 'furniture-item';
          furnitureItem.dataset.id = item.id;
          furnitureItem.dataset.model = item.model_url;
          
          const thumbnail = document.createElement('img');
          thumbnail.src = item.thumbnail_url;
          thumbnail.alt = item.name;
          
          const name = document.createElement('div');
          name.className = 'item-name';
          name.textContent = item.name;
          
          furnitureItem.appendChild(thumbnail);
          furnitureItem.appendChild(name);
          furnitureList.appendChild(furnitureItem);
          
          // 添加点击事件
          furnitureItem.addEventListener('click', () => {
            addFurnitureToScene(item);
          });
        });
      } else {
        // 无结果提示
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = '没有找到家具，请尝试其他搜索条件';
        furnitureList.appendChild(noResults);
      }
    })
    .catch(error => {
      console.error('加载家具数据错误:', error);
      
      // 移除加载提示，显示错误
      furnitureList.removeChild(loadingItem);
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = '加载失败，请稍后重试';
      furnitureList.appendChild(errorMessage);
    });
}

// 获取分类名称
function getCategoryName(category) {
  const categoryMap = {
    'all': '全部',
    'bed': '床',
    'cabinet': '柜子',
    'table': '桌子',
    'chair': '椅子',
    'lamp': '灯具',
    'decoration': '装饰'
  };
  
  return categoryMap[category] || category;
}

// 添加家具到场景
function addFurnitureToScene(furnitureData) {
  const loadingOverlay = document.querySelector('.loading-overlay');
  loadingOverlay.style.display = 'flex';
  
  // 加载3D模型
  const loader = new GLTFLoader();
  
  loader.load(
    furnitureData.model_url,
    function(gltf) {
      const model = gltf.scene;
      
      // 设置模型属性
      model.userData.id = furnitureData.id;
      model.userData.name = furnitureData.name;
      model.userData.type = 'furniture';
      model.userData.category = furnitureData.category;
      
      // 添加阴影
      model.traverse(function(object) {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      
      // 设置模型位置和旋转
      model.position.set(0, 0, 0);
      
      // 设置默认尺寸
      model.scale.set(1, 1, 1);
      
      // 添加到场景
      scene.add(model);
      
      // 添加到家具列表
      furnitureList.push(model);
      
      // 自动选择新添加的家具
      selectObject(model);
      
      // 添加到历史记录
      addToHistory();
      
      // 隐藏加载中
      loadingOverlay.style.display = 'none';
    },
    function(xhr) {
      // 加载进度
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log(furnitureData.name + ' 模型加载进度: ' + Math.round(percentComplete) + '%');
    },
    function(error) {
      console.error('加载模型出错:', error);
      loadingOverlay.style.display = 'none';
      
      // 显示错误提示
      alert('加载模型失败: ' + furnitureData.name);
    }
  );
}

// 处理鼠标按下事件
function onMouseDown(event) {
  event.preventDefault();
  
  // 计算鼠标位置
  const canvasRect = renderer.domElement.getBoundingClientRect();
  mousePosition.x = ((event.clientX - canvasRect.left) / renderer.domElement.clientWidth) * 2 - 1;
  mousePosition.y = -((event.clientY - canvasRect.top) / renderer.domElement.clientHeight) * 2 + 1;
  
  // 射线检测
  raycaster.setFromCamera(mousePosition, camera);
  
  // 检测物体
  let intersects = raycaster.intersectObjects(scene.children, true);
  
  // 过滤出可选择的物体
  intersects = intersects.filter(intersect => {
    // 获取根物体
    let object = intersect.object;
    while(object.parent && object.parent !== scene) {
      object = object.parent;
    }
    
    // 如果是地板则不可选择
    if (object.userData.isFloor) {
      return false;
    }
    
    return true;
  });
  
  if (intersects.length > 0) {
    // 获取根物体
    let selectedMesh = intersects[0].object;
    while(selectedMesh.parent && selectedMesh.parent !== scene) {
      selectedMesh = selectedMesh.parent;
    }
    
    // 根据当前模式执行不同操作
    if (transformMode === 'delete') {
      // 如果是墙壁，不允许删除
      if (isWall(selectedMesh)) {
        alert("墙壁不能被删除，但可以移动位置");
        return;
      }
      
      // 选择物体
      selectObject(selectedMesh);
      // 执行删除
      deleteSelectedObject();
    } else {
      // 选择物体
      selectObject(selectedMesh);
      
      // 设置拖动状态
      if (transformMode === 'move') {
        isDragging = true;
      }
    }
  } else {
    // 取消选择
    deselectObject();
  }
  
  mouseDown = true;
}

// 处理鼠标移动事件
function onMouseMove(event) {
  if (!mouseDown || !isDragging || !selectedObject) return;
  
  // 计算鼠标位置
  const canvasRect = renderer.domElement.getBoundingClientRect();
  mousePosition.x = ((event.clientX - canvasRect.left) / renderer.domElement.clientWidth) * 2 - 1;
  mousePosition.y = -((event.clientY - canvasRect.top) / renderer.domElement.clientHeight) * 2 + 1;
  
  // 射线检测地板
  raycaster.setFromCamera(mousePosition, camera);
  
  if (isWall(selectedObject)) {
    // 如果是墙壁，需要特殊处理移动
    moveWall(selectedObject);
  } else {
    // 普通家具移动
    const intersects = raycaster.intersectObject(room.floor);
    
    if (intersects.length > 0) {
      // 设置物体位置到射线与地板相交点
      const intersectionPoint = intersects[0].point;
      selectedObject.position.x = intersectionPoint.x;
      selectedObject.position.z = intersectionPoint.z;
      
      // 更新属性面板
      updatePropertyPanel();
    }
  }
}

// 判断对象是否为墙壁
function isWall(object) {
  return room.walls.includes(object);
}

// 移动墙壁
function moveWall(wall) {
  // 射线检测地板
  const intersects = raycaster.intersectObject(room.floor);
  if (intersects.length === 0) return;
  
  const intersectionPoint = intersects[0].point;
  
  // 根据墙壁的方向约束移动
  // 判断这是哪面墙（通过旋转判断）
  if (Math.abs(wall.rotation.y) < 0.1 || Math.abs(wall.rotation.y - Math.PI) < 0.1) {
    // 这是前后墙（z轴方向的墙）
    wall.position.z = intersectionPoint.z;
    
    // 更新房间设置
    const roomSettings = JSON.parse(localStorage.getItem('roomSettings') || '{}');
    const width = Math.abs(intersectionPoint.z * 2);
    roomSettings.width = width;
    localStorage.setItem('roomSettings', JSON.stringify(roomSettings));
  } else if (Math.abs(wall.rotation.y - Math.PI/2) < 0.1 || Math.abs(wall.rotation.y + Math.PI/2) < 0.1) {
    // 这是左右墙（x轴方向的墙）
    wall.position.x = intersectionPoint.x;
    
    // 更新房间设置
    const roomSettings = JSON.parse(localStorage.getItem('roomSettings') || '{}');
    const length = Math.abs(intersectionPoint.x * 2);
    roomSettings.length = length;
    localStorage.setItem('roomSettings', JSON.stringify(roomSettings));
  }
  
  // 更新踢脚线位置
  updateSkirtingPositions();
  
  // 更新属性面板
  updatePropertyPanel();
}

// 更新所有踢脚线位置
function updateSkirtingPositions() {
  // 找到所有墙壁和对应的踢脚线
  room.walls.forEach(wall => {
    scene.children.forEach(child => {
      if (child.userData.isSkirting && child.userData.wallId === wall.uuid) {
        // 更新踢脚线位置和旋转
        child.position.copy(wall.position);
        child.position.y = 0.05; // 踢脚线高度的一半
        child.rotation.copy(wall.rotation);
        
        // 根据墙壁方向微调位置
        if (Math.abs(wall.rotation.y) < 0.1 || Math.abs(wall.rotation.y - Math.PI) < 0.1) {
          // 前后墙
          child.position.z += (wall.rotation.y < 0.1) ? 0.025 : -0.025;
        } else {
          // 左右墙
          child.position.x += (wall.rotation.y > 0) ? 0.025 : -0.025;
        }
      }
    });
  });
}

// 选择物体
function selectObject(object) {
  // 先取消之前的选择
  deselectObject();
  
  // 添加选中效果
  selectedObject = object;
  
  // 为墙壁添加视觉提示（可选的高亮效果）
  if (isWall(selectedObject)) {
    // 保存原始材质
    selectedObject.userData.originalMaterial = selectedObject.material.clone();
    
    // 应用高亮材质
    const highlightMaterial = selectedObject.material.clone();
    highlightMaterial.color.set(0xe3f2fd); // 浅蓝色高亮
    highlightMaterial.emissive.set(0x2196f3);
    highlightMaterial.emissiveIntensity = 0.2;
    selectedObject.material = highlightMaterial;
  }
  
  // 更新属性面板
  updatePropertyPanel();
}

// 取消选择物体
function deselectObject() {
  if (selectedObject) {
    // 如果之前选中的是墙壁，恢复原始材质
    if (isWall(selectedObject) && selectedObject.userData.originalMaterial) {
      selectedObject.material = selectedObject.userData.originalMaterial;
      delete selectedObject.userData.originalMaterial;
    }
  }
  
  selectedObject = null;
  
  // 清空属性面板
  document.getElementById('selected-name').textContent = '未选中';
  document.getElementById('position-x').value = '';
  document.getElementById('position-y').value = '';
  document.getElementById('position-z').value = '';
  document.getElementById('rotation-x').value = '';
  document.getElementById('rotation-y').value = '';
  document.getElementById('rotation-z').value = '';
  document.getElementById('scale-x').value = '';
  document.getElementById('scale-y').value = '';
  document.getElementById('scale-z').value = '';
}

// 选择对象时更新属性面板
function updatePropertyPanel() {
  const panel = document.getElementById('property-panel');
  const nameElement = document.getElementById('selected-name');
  
  if (selectedObject) {
    // 根据选中的对象类型设置属性面板内容
    if (isWall(selectedObject)) {
      nameElement.textContent = `墙壁 (${selectedObject.userData.wallType || '未知'})`;
    } else {
      nameElement.textContent = selectedObject.userData.name || '未命名物体';
    }
    
    // 更新位置数值
    document.getElementById('position-x').value = selectedObject.position.x.toFixed(2);
    document.getElementById('position-y').value = selectedObject.position.y.toFixed(2);
    document.getElementById('position-z').value = selectedObject.position.z.toFixed(2);
    
    // 更新旋转数值 (转换为度数)
    document.getElementById('rotation-x').value = (selectedObject.rotation.x * 180 / Math.PI).toFixed(0);
    document.getElementById('rotation-y').value = (selectedObject.rotation.y * 180 / Math.PI).toFixed(0);
    document.getElementById('rotation-z').value = (selectedObject.rotation.z * 180 / Math.PI).toFixed(0);
    
    // 更新缩放数值
    document.getElementById('scale-x').value = selectedObject.scale.x.toFixed(2);
    document.getElementById('scale-y').value = selectedObject.scale.y.toFixed(2);
    document.getElementById('scale-z').value = selectedObject.scale.z.toFixed(2);
    
    // 如果是墙壁，禁用一些不应该编辑的属性
    const isWallSelected = isWall(selectedObject);
    document.getElementById('position-y').disabled = isWallSelected;
    document.getElementById('rotation-x').disabled = isWallSelected;
    document.getElementById('rotation-y').disabled = isWallSelected;
    document.getElementById('rotation-z').disabled = isWallSelected;
    document.getElementById('scale-x').disabled = isWallSelected;
    document.getElementById('scale-y').disabled = isWallSelected;
    document.getElementById('scale-z').disabled = isWallSelected;
  } else {
    // 清空属性但保持面板可见
    nameElement.textContent = '未选中';
    
    // 清空所有输入框的值
    document.getElementById('position-x').value = '';
    document.getElementById('position-y').value = '';
    document.getElementById('position-z').value = '';
    document.getElementById('rotation-x').value = '';
    document.getElementById('rotation-y').value = '';
    document.getElementById('rotation-z').value = '';
    document.getElementById('scale-x').value = '';
    document.getElementById('scale-y').value = '';
    document.getElementById('scale-z').value = '';
  }
}

// 添加到历史记录
function addToHistory() {
  try {
    // 创建场景快照
    const snapshot = {
      furniture: furnitureList.map(obj => {
        if (!obj.userData) return null;
        return {
          id: obj.userData.id,
          name: obj.userData.name,
          position: { 
            x: obj.position.x, 
            y: obj.position.y, 
            z: obj.position.z 
          },
          rotation: { 
            x: obj.rotation.x, 
            y: obj.rotation.y, 
            z: obj.rotation.z 
          },
          scale: { 
            x: obj.scale.x, 
            y: obj.scale.y, 
            z: obj.scale.z 
          }
        };
      }).filter(item => item !== null),
      walls: room.walls.map(wall => {
        if (!wall.userData) return null;
        return {
          type: wall.userData.wallType,
          position: { 
            x: wall.position.x, 
            y: wall.position.y, 
            z: wall.position.z 
          },
          rotation: { 
            x: wall.rotation.x, 
            y: wall.rotation.y, 
            z: wall.rotation.z 
          }
        };
      }).filter(item => item !== null),
      roomSettings: JSON.parse(localStorage.getItem('roomSettings') || '{}'),
      timestamp: new Date().getTime()
    };
    
    // 如果当前不是最新历史，移除后面的历史
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    
    // 添加新历史
    history.push(snapshot);
    historyIndex = history.length - 1;
    
    // 更新历史按钮状态
    updateHistoryButtons();
    
    console.log(`添加历史记录: 索引=${historyIndex}, 总数=${history.length}`);
  } catch (error) {
    console.error('添加历史记录失败:', error);
  }
}

// 更新历史按钮状态
function updateHistoryButtons() {
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
  
  console.log(`更新历史按钮状态: 撤销=${!undoBtn.disabled}, 重做=${!redoBtn.disabled}, 索引=${historyIndex}, 总数=${history.length}`);
}

// 设置变换模式
function setTransformMode(mode) {
  transformMode = mode;
  
  // 更新按钮状态
  document.getElementById('move-mode').classList.toggle('active', mode === 'move');
  document.getElementById('rotate-mode').classList.toggle('active', mode === 'rotate');
  document.getElementById('delete-mode').classList.toggle('active', mode === 'delete');
  
  // 如果是删除模式，改变鼠标样式
  if (mode === 'delete') {
    renderer.domElement.style.cursor = 'crosshair';
  } else {
    renderer.domElement.style.cursor = 'default';
  }
}

// 删除选中的物体
function deleteSelectedObject() {
  if (!selectedObject) return;
  
  // 从场景中移除
  scene.remove(selectedObject);
  
  // 从家具列表中移除
  const index = furnitureList.indexOf(selectedObject);
  if (index > -1) {
    furnitureList.splice(index, 1);
  }
  
  // 添加到历史记录
  addToHistory();
  
  // 取消选择
  deselectObject();
}

// 更新物体位置
function updateObjectPosition() {
  if (!selectedObject) return;
  
  // 获取输入值
  const x = parseFloat(document.getElementById('position-x').value);
  const y = parseFloat(document.getElementById('position-y').value);
  const z = parseFloat(document.getElementById('position-z').value);
  
  // 设置位置
  selectedObject.position.set(x, y, z);
}

// 更新物体旋转
function updateObjectRotation() {
  if (!selectedObject) return;
  
  // 获取输入值 (转换为弧度)
  const x = parseFloat(document.getElementById('rotation-x').value) * Math.PI / 180;
  const y = parseFloat(document.getElementById('rotation-y').value) * Math.PI / 180;
  const z = parseFloat(document.getElementById('rotation-z').value) * Math.PI / 180;
  
  // 设置旋转
  selectedObject.rotation.set(x, y, z);
}

// 更新物体缩放
function updateObjectScale() {
  if (!selectedObject) return;
  
  // 获取输入值
  const x = parseFloat(document.getElementById('scale-x').value);
  const y = parseFloat(document.getElementById('scale-y').value);
  const z = parseFloat(document.getElementById('scale-z').value);
  
  // 设置缩放
  selectedObject.scale.set(x, y, z);
}

// 撤销操作
function undo() {
  if (historyIndex <= 0) return;
  
  console.log(`执行撤销操作: 当前索引=${historyIndex}, 历史长度=${history.length}`);
  historyIndex--;
  restoreHistory();
}

// 重做操作
function redo() {
  if (historyIndex >= history.length - 1) return;
  
  console.log(`执行重做操作: 当前索引=${historyIndex}, 历史长度=${history.length}`);
  historyIndex++;
  restoreHistory();
}

// 恢复历史状态
function restoreHistory() {
  try {
    const snapshot = history[historyIndex];
    console.log(`正在恢复历史状态: 索引=${historyIndex}`, snapshot);
    
    // 如果没有快照数据，退出
    if (!snapshot) {
      console.error('无法恢复历史状态：快照为空');
      document.querySelector('.loading-overlay').style.display = 'none';
      updateHistoryButtons();
      return;
    }
    
    // 显示加载提示
    document.querySelector('.loading-overlay').style.display = 'flex';
    
    // 取消选择当前物体
    deselectObject();
    
    // 清除当前所有家具
    furnitureList.forEach(obj => {
      scene.remove(obj);
    });
    furnitureList = [];
    
    // 先还原房间设置，从快照中直接获取
    if (snapshot.roomSettings) {
      localStorage.setItem('roomSettings', JSON.stringify(snapshot.roomSettings));
      
      // 重建房间
      clearRoom();
      createRoomFromSettings(snapshot.roomSettings);
    }
    // 向后兼容，如果没有直接存储roomSettings
    else if (snapshot.walls && snapshot.walls.length > 0) {
      // 记录房间设置
      const roomSettings = JSON.parse(localStorage.getItem('roomSettings') || '{}');
      
      // 从第一个墙壁推断房间尺寸
      let updatedLength = 0;
      let updatedWidth = 0;
      let foundLength = false;
      let foundWidth = false;
      
      // 遍历墙壁，找出长宽
      snapshot.walls.forEach(wall => {
        // 根据墙壁类型判断
        if (wall.type === 'left' || wall.type === 'right') {
          // 左右墙，确定长度
          if (!foundLength) {
            updatedLength = Math.abs(wall.position.x * 2);
            foundLength = true;
          }
        } else if (wall.type === 'back' || wall.type === 'front') {
          // 前后墙，确定宽度
          if (!foundWidth) {
            updatedWidth = Math.abs(wall.position.z * 2);
            foundWidth = true;
          }
        }
      });
      
      // 更新房间设置
      if (foundLength) roomSettings.length = updatedLength;
      if (foundWidth) roomSettings.width = updatedWidth;
      localStorage.setItem('roomSettings', JSON.stringify(roomSettings));
      
      // 重建房间
      clearRoom();
      createRoomFromSettings(roomSettings);
    }
    
    // 恢复每个墙的精确位置
    if (snapshot.walls && snapshot.walls.length > 0) {
      snapshot.walls.forEach(wallData => {
        const matchingWall = room.walls.find(w => w.userData && w.userData.wallType === wallData.type);
        if (matchingWall) {
          // 更新位置
          matchingWall.position.set(wallData.position.x, wallData.position.y, wallData.position.z);
        }
      });
    }
    
    // 重建踢脚线以确保与墙壁位置匹配
    createSkirting();
    
    // 恢复家具
    let furnitureCount = 0; // 计数需要加载多少家具
    let loadedCount = 0; // 已加载完成的家具计数
    
    if (snapshot.furniture && snapshot.furniture.length > 0) {
      furnitureCount = snapshot.furniture.length;
      
      // 防止在没有家具时卡住加载提示
      if (furnitureCount === 0) {
        document.querySelector('.loading-overlay').style.display = 'none';
        return;
      }
      
      snapshot.furniture.forEach(item => {
        if (!item || !item.id) {
          loadedCount++;
          checkIfAllLoaded();
          return; // 跳过无效项
        }
        
        // 从API获取家具数据
        fetch(`/api/furniture/${item.id}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('获取家具数据失败');
            }
            return response.json();
          })
          .then(data => {
            if (data && data.furniture) {
              const furnitureData = data.furniture;
              
              // 加载3D模型
              const loader = new GLTFLoader();
              loader.load(
                furnitureData.model_url,
                function(gltf) {
                  const model = gltf.scene;
                  
                  // 设置模型属性
                  model.userData.id = furnitureData.id;
                  model.userData.name = furnitureData.name;
                  model.userData.type = 'furniture';
                  model.userData.category = furnitureData.category;
                  
                  // 添加阴影
                  model.traverse(function(object) {
                    if (object.isMesh) {
                      object.castShadow = true;
                      object.receiveShadow = true;
                    }
                  });
                  
                  // 恢复位置、旋转和缩放
                  model.position.set(item.position.x, item.position.y, item.position.z);
                  model.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
                  model.scale.set(item.scale.x, item.scale.y, item.scale.z);
                  
                  // 添加到场景
                  scene.add(model);
                  
                  // 添加到家具列表
                  furnitureList.push(model);
                  
                  // 更新加载计数
                  loadedCount++;
                  checkIfAllLoaded();
                },
                null,
                function(error) {
                  console.error('恢复模型出错:', error);
                  loadedCount++;
                  checkIfAllLoaded();
                }
              );
            } else {
              loadedCount++;
              checkIfAllLoaded();
            }
          })
          .catch(error => {
            console.error('恢复家具时出错:', error);
            loadedCount++;
            checkIfAllLoaded();
          });
      });
    } else {
      // 没有家具数据，隐藏加载提示
      document.querySelector('.loading-overlay').style.display = 'none';
    }
    
    // 检查是否所有家具都已加载完成
    function checkIfAllLoaded() {
      if (loadedCount >= furnitureCount) {
        document.querySelector('.loading-overlay').style.display = 'none';
      }
    }
  } catch (error) {
    console.error('恢复历史状态失败:', error);
    document.querySelector('.loading-overlay').style.display = 'none';
  } finally {
    // 无论成功失败，最后都要更新按钮状态
    updateHistoryButtons();
  }
}

// 初始化事件监听器
function initEventListeners() {
  console.log('初始化事件监听');
  
  // 窗口大小改变
  window.addEventListener('resize', onWindowResize);
  
  // 鼠标事件
  const canvas = renderer.domElement;
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  
  canvas.addEventListener('mouseup', function() {
    if (isDragging && selectedObject) {
      // 拖动结束，添加到历史记录
      addToHistory();
    }
    
    mouseDown = false;
    isDragging = false;
  });
  
  // 修改房间尺寸按钮
  document.getElementById('edit-room-size').addEventListener('click', function() {
    showRoomSizeModal();
  });
  
  // 工具栏按钮事件
  document.getElementById('move-mode').addEventListener('click', function() {
    setTransformMode('move');
  });
  
  document.getElementById('rotate-mode').addEventListener('click', function() {
    setTransformMode('rotate');
  });
  
  document.getElementById('delete-mode').addEventListener('click', function() {
    setTransformMode('delete');
  });
  
  // 初始化时添加一个起始历史记录
  if (history.length === 0) {
    addToHistory();
  }
  
  // 撤销和重做按钮
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  
  undoBtn.addEventListener('click', function() {
    console.log('点击撤销按钮');
    if (!this.disabled) {
      undo();
    }
  });
  
  redoBtn.addEventListener('click', function() {
    console.log('点击重做按钮');
    if (!this.disabled) {
      redo();
    }
  });
  
  // 属性面板输入事件
  document.getElementById('position-x').addEventListener('change', function() {
    updateObjectPosition();
    addToHistory();
  });
  document.getElementById('position-y').addEventListener('change', function() {
    updateObjectPosition();
    addToHistory();
  });
  document.getElementById('position-z').addEventListener('change', function() {
    updateObjectPosition();
    addToHistory();
  });
  
  document.getElementById('rotation-x').addEventListener('change', function() {
    updateObjectRotation();
    addToHistory();
  });
  document.getElementById('rotation-y').addEventListener('change', function() {
    updateObjectRotation();
    addToHistory();
  });
  document.getElementById('rotation-z').addEventListener('change', function() {
    updateObjectRotation();
    addToHistory();
  });
  
  document.getElementById('scale-x').addEventListener('change', function() {
    updateObjectScale();
    addToHistory();
  });
  document.getElementById('scale-y').addEventListener('change', function() {
    updateObjectScale();
    addToHistory();
  });
  document.getElementById('scale-z').addEventListener('change', function() {
    updateObjectScale();
    addToHistory();
  });
  
  // 分类标签切换
  const categoryTabs = document.querySelectorAll('.category-tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有活动状态
      categoryTabs.forEach(t => t.classList.remove('active'));
      
      // 添加当前活动状态
      this.classList.add('active');
      
      // 加载对应分类的家具
      const category = this.dataset.category;
      const search = document.getElementById('furniture-search').value;
      loadFurnitureData(category, search);
    });
  });
  
  // 搜索事件
  document.getElementById('search-btn').addEventListener('click', function() {
    const search = document.getElementById('furniture-search').value;
    const category = document.querySelector('.category-tab.active').dataset.category;
    loadFurnitureData(category, search);
  });
  
  document.getElementById('furniture-search').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      const search = this.value;
      const category = document.querySelector('.category-tab.active').dataset.category;
      loadFurnitureData(category, search);
    }
  });
  
  // 更新历史按钮状态
  updateHistoryButtons();
}

// 添加测试立方体
function addTestCube() {
  /* 
  console.log('添加测试立方体');
  
  try {
    // 创建一个简单的立方体
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    
    // 设置位置
    cube.position.set(0, 0.5, 0);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    // 添加到场景
    scene.add(cube);
    
    console.log('测试立方体添加成功');
    
    // 添加动画
    function animateCube() {
      requestAnimationFrame(animateCube);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
    }
    
    animateCube();
  } catch (error) {
    console.error('添加测试立方体失败:', error);
  }
  */
}

// 当DOM内容加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  loadThreeJS();
}); 