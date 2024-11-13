class ExamplesManager {
    constructor() {
        this.gradeFilter = document.querySelector('.filter-select[data-type="grade"]');
        this.typeFilter = document.querySelector('.filter-select[data-type="type"]');
        this.examplesGrid = document.querySelector('.examples-grid');

        this.initializeEventListeners();
        this.loadExamples();
    }

    initializeEventListeners() {
        if (this.gradeFilter) {
            this.gradeFilter.addEventListener('change', () => this.loadExamples());
        }
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.loadExamples());
        }
    }

    async loadExamples() {
        try {
            let grade = 'all';
            if (this.gradeFilter) {
                const gradeMap = {
                    'primary': '小学',
                    'junior': '初中',
                    'senior': '高中'
                };
                grade = gradeMap[this.gradeFilter.value] || 'all';
            }

            let type = 'all';
            if (this.typeFilter) {
                const typeMap = {
                    'narrative': '记叙文',
                    'argumentative': '议论文',
                    'descriptive': '说明文',
                    'practical': '应用文'
                };
                type = typeMap[this.typeFilter.value] || 'all';
            }
            
            const response = await fetch(`/api/examples?grade=${grade}&type=${type}`);
            const result = await response.json();
            
            if (result.success) {
                this.renderExamples(result.data);
            } else {
                this.showError('加载范文失败');
            }
        } catch (error) {
            console.error('Error loading examples:', error);
            this.showError('加载范文失败，请稍后重试');
        }
    }

    renderExamples(data) {
        if (!this.examplesGrid) return;

        if (data.length === 0) {
            this.examplesGrid.innerHTML = `
                <div class="no-results">
                    <p>暂无优秀范文</p>
                </div>
            `;
            return;
        }

        this.examplesGrid.innerHTML = data.map(example => `
            <div class="example-card" data-id="${example.id}">
                <img src="/static/images/tutorial.jpg" alt="${example.title}配图" class="example-image">
                <div class="example-content">
                    <h3 class="example-title">${example.title}</h3>
                    <div class="example-meta">
                        <span><i class="fas fa-graduation-cap"></i> ${example.grade}</span>
                        <span><i class="fas fa-tag"></i> ${example.essay_type}</span>
                        <span><i class="fas fa-star"></i> ${example.total_score}分</span>
                    </div>
                    <p class="example-preview">${example.content.substring(0, 100)}...</p>
                    <a href="/example/${example.id}" class="read-more">阅读全文</a>
                </div>
            </div>
        `).join('');
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ExamplesManager();
}); 