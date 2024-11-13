document.addEventListener('DOMContentLoaded', function() {
    // 平滑滚动功能
    document.querySelectorAll('.guide-nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 监听滚动，高亮当前章节
    const sections = document.querySelectorAll('.guide-section');
    const navLinks = document.querySelectorAll('.guide-nav a');

    function highlightNavigation() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = '#' + section.id;
            }
        });

        navLinks.forEach(link => {
            link.style.fontWeight = link.getAttribute('href') === currentSectionId ? 'bold' : 'normal';
            if (link.getAttribute('href') === currentSectionId) {
                link.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
            } else {
                link.style.backgroundColor = 'transparent';
            }
        });
    }

    window.addEventListener('scroll', highlightNavigation);
    highlightNavigation(); // 初始化高亮
}); 