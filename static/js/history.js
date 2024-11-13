class HistoryManager {
    constructor() {
        this.filterGrade = document.querySelector('.filter-select[data-type="grade"]');
        this.filterTime = document.querySelector('.filter-select[data-type="time"]');
        this.historyList = document.querySelector('.history-list');

        this.initializeEventListeners();
        this.loadHistoryData();
    }

    initializeEventListeners() {
        if (this.filterGrade) {
            this.filterGrade.addEventListener('change', () => this.loadHistoryData());
        }
        if (this.filterTime) {
            this.filterTime.addEventListener('change', () => this.loadHistoryData());
        }

        if (this.historyList) {
            this.historyList.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.delete-btn');
                const viewBtn = e.target.closest('.view-btn');
                
                if (deleteBtn) {
                    const historyItem = deleteBtn.closest('.history-item');
                    if (historyItem) {
                        const id = historyItem.dataset.id;
                        await this.deleteHistory(id);
                    }
                }
                
                if (viewBtn) {
                    const historyItem = viewBtn.closest('.history-item');
                    if (historyItem) {
                        const id = historyItem.dataset.id;
                        this.viewHistory(id);
                    }
                }
            });
        }
    }

    async loadHistoryData() {
        try {
            let grade = 'all';
            if (this.filterGrade) {
                const gradeMap = {
                    'primary': '小学',
                    'junior': '初中',
                    'senior': '高中'
                };
                grade = gradeMap[this.filterGrade.value] || 'all';
            }
            
            const time_range = this.filterTime ? this.filterTime.value : 'all';
            
            const response = await fetch(`/api/history?grade=${grade}&time_range=${time_range}`);
            const result = await response.json();
            
            if (result.success) {
                this.renderHistoryList(result.data);
            } else {
                this.showError('加载历史记录失败');
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.showError('加载历史记录失败，请稍后重试');
        }
    }

    renderHistoryList(data) {
        if (!this.historyList) return;

        if (data.length === 0) {
            this.historyList.innerHTML = `
                <div class="no-results">
                    <p>暂无评阅历史</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = data.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-info">
                    <h3>${item.title}</h3>
                    <div class="history-meta">
                        <span><i class="fas fa-graduation-cap"></i> ${item.grade}</span>
                        <span><i class="fas fa-calendar"></i> ${item.created_at}</span>
                    </div>
                </div>
                <div class="history-score">${item.total_score}分</div>
                <div class="history-actions">
                    <button class="action-btn view-btn">
                        <i class="fas fa-eye"></i>查看
                    </button>
                    <button class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    async deleteHistory(id) {
        if (!confirm('确定要删除这条记录吗？')) return;

        try {
            const response = await fetch(`/api/history/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                await this.loadHistoryData();
            } else {
                this.showError('删除失败，请稍后重试');
            }
        } catch (error) {
            console.error('Error deleting history:', error);
            this.showError('删除失败，请稍后重试');
        }
    }

    viewHistory(id) {
        // 获取历史记录详情并跳转到结果页面
        fetch(`/api/history/${id}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    sessionStorage.setItem('reviewResult', JSON.stringify(result.data));
                    window.location.href = '/result';
                } else {
                    this.showError('获取评阅结果失败');
                }
            })
            .catch(error => {
                console.error('Error viewing history:', error);
                this.showError('获取评阅结果失败，请稍后重试');
            });
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HistoryManager();
}); 