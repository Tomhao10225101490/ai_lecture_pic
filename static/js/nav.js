document.addEventListener('DOMContentLoaded', function() {
    // 获取当前页面路径
    const currentPath = window.location.pathname;
    
    // 获取所有导航项
    const navItems = document.querySelectorAll('.nav-item');
    
    // 为当前页面对应的导航项添加活跃样式
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
}); 