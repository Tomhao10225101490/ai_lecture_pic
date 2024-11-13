class AnalysisDashboard {
    constructor() {
        this.loadStats();
        this.initializeCharts();
    }

    async loadStats() {
        try {
            const response = await fetch('/api/analysis/stats');
            const result = await response.json();
            
            if (result.success) {
                const stats = result.data;
                document.querySelectorAll('.stat-card').forEach(card => {
                    const value = card.querySelector('.stat-value');
                    if (value) {
                        const key = value.dataset.stat;
                        if (key in stats) {
                            value.textContent = stats[key];
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async initializeCharts() {
        await this.initializeScoreChart();
        await this.initializeDimensionChart();
    }

    async initializeScoreChart() {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        this.scoreChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '作文分数',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 60,
                        max: 100
                    }
                }
            }
        });

        // 加载初始数据
        await this.updateScoreChart('week');

        // 添加时间范围选择器事件监听
        const chartSelect = document.querySelector('.chart-select');
        if (chartSelect) {
            chartSelect.addEventListener('change', (e) => {
                this.updateScoreChart(e.target.value);
            });
        }
    }

    async updateScoreChart(timeRange) {
        try {
            const response = await fetch(`/api/analysis/trend?range=${timeRange}`);
            const result = await response.json();
            
            if (result.success) {
                const data = result.data;
                this.scoreChart.data.labels = data.map(item => item.date);
                this.scoreChart.data.datasets[0].data = data.map(item => item.score);
                this.scoreChart.update();
            }
        } catch (error) {
            console.error('Error updating score chart:', error);
        }
    }

    async initializeDimensionChart() {
        try {
            const response = await fetch('/api/analysis/dimensions');
            const result = await response.json();
            
            if (!result.success) return;
            
            const data = result.data;
            const ctx = document.getElementById('dimensionChart').getContext('2d');
            
            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: data.dimensions,
                    datasets: [{
                        label: '当前水平',
                        data: data.current_scores,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        pointBackgroundColor: '#3498db',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#3498db'
                    }, {
                        label: '平均水平',
                        data: data.avg_scores,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        pointBackgroundColor: '#e74c3c',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#e74c3c'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            beginAtZero: true,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing dimension chart:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnalysisDashboard();
}); 