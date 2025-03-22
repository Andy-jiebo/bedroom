// BedroomStyler 网站主要JavaScript文件

document.addEventListener('DOMContentLoaded', function() {
  // 移动端菜单切换
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('nav');
  
  if (mobileMenuToggle && nav) {
    mobileMenuToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
    });
  }
  
  // 移动端下拉菜单
  const dropdowns = document.querySelectorAll('.dropdown');
  
  if (window.innerWidth <= 768) {
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      if (toggle) {
        toggle.addEventListener('click', function(e) {
          e.preventDefault();
          dropdown.classList.toggle('active');
        });
      }
    });
  }
  
  // 表单验证
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const passwordInput = form.querySelector('input[type="password"]');
    const confirmInput = form.querySelector('input[name="confirmPassword"]');
    
    if (passwordInput && confirmInput) {
      // 密码强度检测
      passwordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value);
      });
      
      // 确认密码验证
      form.addEventListener('submit', function(e) {
        if (passwordInput.value !== confirmInput.value) {
          e.preventDefault();
          alert('两次输入的密码不匹配');
        }
      });
    }
  });
  
  // 密码强度检测
  function updatePasswordStrength(password) {
    const meter = document.querySelector('.password-strength-meter .meter');
    if (!meter) return;
    
    // 简单的密码强度评估
    let strength = 0;
    
    // 长度检查
    if (password.length >= 8) strength += 1;
    
    // 字符多样性检查
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    // 更新强度条
    const percentage = (strength / 5) * 100;
    meter.style.width = `${percentage}%`;
    
    // 根据强度设置颜色
    if (percentage <= 20) {
      meter.style.backgroundColor = '#ef4444';
    } else if (percentage <= 60) {
      meter.style.backgroundColor = '#f59e0b';
    } else {
      meter.style.backgroundColor = '#10b981';
    }
  }
  
  // 模态框功能
  const modalTriggers = document.querySelectorAll('[data-modal]');
  
  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      const modalId = this.dataset.modal;
      const modal = document.getElementById(modalId);
      
      if (modal) {
        modal.classList.add('visible');
        
        // 关闭按钮
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
          button.addEventListener('click', function() {
            modal.classList.remove('visible');
          });
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', function(e) {
          if (e.target === modal) {
            modal.classList.remove('visible');
          }
        });
      }
    });
  });
  
  // 自动隐藏提醒框
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
  
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => {
        alert.style.display = 'none';
      }, 500);
    }, 5000);
  });
  
  // 平滑滚动
  const scrollLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
  
  scrollLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });
}); 