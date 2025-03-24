document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const importOption = document.getElementById('import-option');
  const drawOption = document.getElementById('draw-option');
  const templateOption = document.getElementById('template-option');
  
  const importModal = document.getElementById('import-modal');
  const templateModal = document.getElementById('template-modal');
  
  const imageUpload = document.getElementById('image-upload');
  const uploadArea = document.querySelector('.upload-area');
  const confirmImport = document.getElementById('confirm-import');
  const cancelImport = document.getElementById('cancel-import');
  
  const templateItems = document.querySelectorAll('.template-item');
  const confirmTemplate = document.getElementById('confirm-template');
  const cancelTemplate = document.getElementById('cancel-template');
  
  let selectedImage = null;
  let selectedTemplate = null;
  
  // 导入图片选项点击事件
  importOption.querySelector('.option-btn').addEventListener('click', () => {
    importModal.classList.add('active');
  });
  
  // 自由绘制选项点击事件
  drawOption.querySelector('.option-btn').addEventListener('click', () => {
    // 直接跳转到设计页面，使用自由绘制模式
    window.location.href = '/design?mode=draw';
  });
  
  // 模板选项点击事件
  templateOption.querySelector('.option-btn').addEventListener('click', () => {
    templateModal.classList.add('active');
  });
  
  // 上传区域点击事件
  uploadArea.addEventListener('click', () => {
    imageUpload.click();
  });
  
  // 文件选择事件
  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelection(file);
    }
  });
  
  // 拖拽事件
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#2196f3';
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#e0e0e0';
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#e0e0e0';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelection(file);
    }
  });
  
  // 处理图片选择
  function handleImageSelection(file) {
    selectedImage = file;
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      // 清除之前的预览
      const existingPreview = uploadArea.querySelector('.image-preview');
      if (existingPreview) {
        existingPreview.remove();
      }
      
      // 创建新的预览
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.style.marginTop = '1rem';
      
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '200px';
      img.style.borderRadius = '4px';
      img.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
      
      preview.appendChild(img);
      uploadArea.appendChild(preview);
      
      // 启用确认按钮
      confirmImport.disabled = false;
    };
    reader.readAsDataURL(file);
  }
  
  // 模板项点击事件
  templateItems.forEach(item => {
    item.addEventListener('click', () => {
      // 移除之前的选择
      templateItems.forEach(i => i.classList.remove('selected'));
      
      // 添加当前选择
      item.classList.add('selected');
      selectedTemplate = item.querySelector('span').textContent;
      
      // 启用确认按钮
      confirmTemplate.disabled = false;
    });
  });
  
  // 取消导入按钮
  cancelImport.addEventListener('click', () => {
    importModal.classList.remove('active');
    // 重置状态
    selectedImage = null;
    confirmImport.disabled = true;
    const existingPreview = uploadArea.querySelector('.image-preview');
    if (existingPreview) {
      existingPreview.remove();
    }
  });
  
  // 确认导入按钮
  confirmImport.addEventListener('click', () => {
    if (selectedImage) {
      // 创建FormData对象，将来用于上传
      const formData = new FormData();
      formData.append('floorplan', selectedImage);
      
      // 在实际应用中，这里应该进行图片上传，然后跳转到设计页面
      // 现在先模拟直接跳转
      localStorage.setItem('setupMode', 'import');
      window.location.href = '/design?mode=import';
    }
  });
  
  // 取消模板按钮
  cancelTemplate.addEventListener('click', () => {
    templateModal.classList.remove('active');
    // 重置状态
    selectedTemplate = null;
    confirmTemplate.disabled = true;
    templateItems.forEach(i => i.classList.remove('selected'));
  });
  
  // 确认模板按钮
  confirmTemplate.addEventListener('click', () => {
    if (selectedTemplate) {
      localStorage.setItem('setupMode', 'template');
      localStorage.setItem('selectedTemplate', selectedTemplate);
      window.location.href = '/design?mode=template&template=' + encodeURIComponent(selectedTemplate);
    }
  });
}); 