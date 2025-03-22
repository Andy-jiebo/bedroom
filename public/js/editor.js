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
  } catch (error) {
    console.error('加载Three.js模块失败:', error);
  }
}

// 初始化DOM元素
function initDomElements() {
  // 显示加载中
  document.querySelector('.loading-overlay').style.display = 'flex';
  
  // 隐藏属性面板
  document.getElementById('property-panel').classList.remove('visible');
  
  console.log('编辑器脚本加载完成');
}

// 初始化Three.js场景
function initEditor() {
  console.log('开始初始化编辑器');
  
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
    canvas: document.getElementById('design-canvas'),
    antialias: true
  });
  renderer.setSize(
    document.querySelector('.canvas-container').clientWidth,
    document.querySelector('.canvas-container').clientHeight
  );
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
  
  // 创建房间结构
  createRoom();
  
  // 隐藏加载中
  document.querySelector('.loading-overlay').style.display = 'none';
  
  // 加载家具数据
  loadFurnitureData();
  
  // 添加事件监听
  initEventListeners();
  
  // 开始动画循环
  animate();
  
  console.log('编辑器初始化完成');
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
  scene.add(backWall);
  room.walls.push(backWall);
  
  // 左墙
  const leftWallGeometry = new THREE.PlaneGeometry(10, wallHeight);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWall.position.set(-5, wallHeight / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
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
  
  // 后墙踢脚线
  const backSkirtingGeometry = new THREE.BoxGeometry(10, skirtingHeight, skirtingDepth);
  const backSkirting = new THREE.Mesh(backSkirtingGeometry, skirtingMaterial);
  backSkirting.position.set(0, skirtingHeight / 2, -5 + skirtingDepth / 2);
  scene.add(backSkirting);
  
  // 左墙踢脚线
  const leftSkirtingGeometry = new THREE.BoxGeometry(10, skirtingHeight, skirtingDepth);
  const leftSkirting = new THREE.Mesh(leftSkirtingGeometry, skirtingMaterial);
  leftSkirting.position.set(-5 + skirtingDepth / 2, skirtingHeight / 2, 0);
  leftSkirting.rotation.y = Math.PI / 2;
  scene.add(leftSkirting);
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
  controls.update();
  renderer.render(scene, camera);
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
    
    // 检查是否是地板或墙壁
    if (object.userData.isFloor || object.userData.isWall) {
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

// 选择物体
function selectObject(object) {
  // 先取消之前的选择
  deselectObject();
  
  selectedObject = object;
  
  // 显示属性面板
  showPropertyPanel();
}

// 取消选择物体
function deselectObject() {
  selectedObject = null;
  
  // 隐藏属性面板
  hidePropertyPanel();
}

// 显示属性面板
function showPropertyPanel() {
  const panel = document.getElementById('property-panel');
  panel.classList.add('visible');
  
  // 更新属性面板信息
  updatePropertyPanel();
}

// 隐藏属性面板
function hidePropertyPanel() {
  const panel = document.getElementById('property-panel');
  panel.classList.remove('visible');
}

// 更新属性面板信息
function updatePropertyPanel() {
  if (!selectedObject) return;
  
  // 更新名称
  document.getElementById('selected-name').textContent = selectedObject.userData.name || '未命名物体';
  
  // 更新位置
  document.getElementById('position-x').value = selectedObject.position.x.toFixed(2);
  document.getElementById('position-y').value = selectedObject.position.y.toFixed(2);
  document.getElementById('position-z').value = selectedObject.position.z.toFixed(2);
  
  // 更新旋转 (转换为度数)
  document.getElementById('rotation-x').value = (selectedObject.rotation.x * 180 / Math.PI).toFixed(0);
  document.getElementById('rotation-y').value = (selectedObject.rotation.y * 180 / Math.PI).toFixed(0);
  document.getElementById('rotation-z').value = (selectedObject.rotation.z * 180 / Math.PI).toFixed(0);
  
  // 更新缩放
  document.getElementById('scale-x').value = selectedObject.scale.x.toFixed(2);
  document.getElementById('scale-y').value = selectedObject.scale.y.toFixed(2);
  document.getElementById('scale-z').value = selectedObject.scale.z.toFixed(2);
}

// 添加到历史记录
function addToHistory() {
  // 创建场景快照
  const snapshot = {
    furniture: furnitureList.map(obj => ({
      id: obj.userData.id,
      name: obj.userData.name,
      position: obj.position.clone(),
      rotation: obj.rotation.clone(),
      scale: obj.scale.clone()
    }))
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
}

// 更新历史按钮状态
function updateHistoryButtons() {
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= history.length - 1;
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
  
  historyIndex--;
  restoreHistory();
}

// 重做操作
function redo() {
  if (historyIndex >= history.length - 1) return;
  
  historyIndex++;
  restoreHistory();
}

// 恢复历史状态
function restoreHistory() {
  const snapshot = history[historyIndex];
  
  // 清除当前所有家具
  furnitureList.forEach(obj => {
    scene.remove(obj);
  });
  furnitureList = [];
  
  // 恢复家具
  // 注意: 这里应该加载模型，但为简化演示，我们只恢复位置和旋转
  // 实际应用需要存储更多信息或重新加载模型
  
  // 更新历史按钮状态
  updateHistoryButtons();
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
  
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  
  // 属性面板输入事件
  document.getElementById('position-x').addEventListener('change', updateObjectPosition);
  document.getElementById('position-y').addEventListener('change', updateObjectPosition);
  document.getElementById('position-z').addEventListener('change', updateObjectPosition);
  
  document.getElementById('rotation-x').addEventListener('change', updateObjectRotation);
  document.getElementById('rotation-y').addEventListener('change', updateObjectRotation);
  document.getElementById('rotation-z').addEventListener('change', updateObjectRotation);
  
  document.getElementById('scale-x').addEventListener('change', updateObjectScale);
  document.getElementById('scale-y').addEventListener('change', updateObjectScale);
  document.getElementById('scale-z').addEventListener('change', updateObjectScale);
  
  // 关闭属性面板
  document.querySelector('.close-panel').addEventListener('click', hidePropertyPanel);
  
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
}

// 当DOM内容加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  loadThreeJS();
}); 