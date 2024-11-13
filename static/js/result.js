class ResultDisplay {
    constructor() {
        this.loadResult();
        this.initializeExport();
    }

    loadResult() {
        const resultData = sessionStorage.getItem('reviewResult');
        if (!resultData) {
            console.error('未找到评阅结果');
            alert('未找到评阅结果，请重新评阅。');
            window.location.href = '/';
            return;
        }

        const result = JSON.parse(resultData);

        // 显示作文信息
        document.getElementById('essayTitle').textContent = result.title;
        document.getElementById('essayGrade').textContent = result.grade;
        document.getElementById('essayDate').textContent = new Date().toLocaleDateString();
        document.getElementById('wordCount').textContent = result.content.length;

        // 显示总分
        document.getElementById('totalScore').textContent = result.total_score;

        // 显示各维度得分
        const dimensionScoresContainer = document.getElementById('dimensionScores');
        result.dimensions.forEach(dimension => {
            const card = document.createElement('div');
            card.className = 'dimension-card';
            card.innerHTML = `
                <div class="dimension-score">${dimension.score}</div>
                <div class="dimension-label">${dimension.name}</div>
                <div class="dimension-comment">${dimension.comment}</div>
            `;
            dimensionScoresContainer.appendChild(card);
        });

        // 渲染精彩句子
        const sentencesList = document.getElementById('sentencesList');
        if (result.excellent_sentences) {
            sentencesList.innerHTML = result.excellent_sentences.map(item => `
                <div class="sentence-item">
                    <div class="sentence-text">${item.sentence}</div>
                    <div class="sentence-analysis">${item.analysis}</div>
                </div>
            `).join('');
        }

        // 修改亮点和建议的渲染方式，使其更详细
        const highlightList = document.getElementById('highlightList');
        if (result.highlights) {
            highlightList.innerHTML = result.highlights.map(item => `
                <li class="highlight-item">
                    <i class="fas fa-star"></i>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">${item.point}</div>
                        <div>${item.detail}</div>
                    </div>
                </li>
            `).join('');
        }

        const suggestionList = document.getElementById('suggestionList');
        if (result.suggestions) {
            suggestionList.innerHTML = result.suggestions.map(item => `
                <li class="suggestion-item">
                    <i class="fas fa-lightbulb"></i>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">${item.issue}</div>
                        <div>${item.solution}</div>
                    </div>
                </li>
            `).join('');
        }

        // 添加总体评价
        if (result.overall_review) {
            const overallSection = document.createElement('div');
            overallSection.className = 'analysis-section';
            overallSection.innerHTML = `
                <h3 class="analysis-title">总体评价</h3>
                <div class="overall-review">${result.overall_review}</div>
            `;
            document.querySelector('.result-container').insertBefore(
                overallSection,
                document.querySelector('.action-buttons')
            );
        }
    }

    initializeExport() {
        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToPDF());
        }
    }

    async exportToPDF() {
        const resultData = JSON.parse(sessionStorage.getItem('reviewResult'));
        if (!resultData) return;

        // 创建一个新的div用于PDF导出
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.style.padding = '40px';
        exportContainer.style.background = 'white';
        exportContainer.style.fontSize = '14px';
        exportContainer.style.lineHeight = '1.6';
        exportContainer.style.color = '#333';

        // 添加报告内容
        exportContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #2c3e50; margin-bottom: 15px; font-size: 24px;">作文评阅报告</h1>
                <div style="color: #666; font-size: 14px;">
                    <p>评阅时间：${new Date().toLocaleString()}</p>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">作文信息</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px; width: 100px;"><strong>标题：</strong></td>
                        <td style="padding: 8px;">${resultData.title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>年级：</strong></td>
                        <td style="padding: 8px;">${resultData.grade}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>字数：</strong></td>
                        <td style="padding: 8px;">${resultData.content.length}字</td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">总体评分</h2>
                <div style="text-align: center; font-size: 36px; color: #e74c3c; margin: 20px 0;">
                    ${resultData.total_score}分
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">维度评分</h2>
                ${resultData.dimensions.map(dim => `
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #34495e; margin-bottom: 10px; font-size: 16px;">
                            ${dim.name}：${dim.score}分
                        </h3>
                        <p style="color: #666; margin: 0; white-space: pre-wrap;">${dim.comment}</p>
                    </div>
                `).join('')}
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">精彩句子赏析</h2>
                ${resultData.excellent_sentences.map(sentence => `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <p style="color: #2c3e50; margin-bottom: 10px; font-style: italic; border-left: 3px solid #3498db; padding-left: 10px;">
                            "${sentence.sentence}"
                        </p>
                        <p style="color: #666; margin: 0; white-space: pre-wrap;">${sentence.analysis}</p>
                    </div>
                `).join('')}
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">作文亮点</h2>
                ${resultData.highlights.map(highlight => `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #34495e; margin-bottom: 10px; font-size: 16px;">${highlight.point}</h3>
                        <p style="color: #666; margin: 0; white-space: pre-wrap;">${highlight.detail}</p>
                    </div>
                `).join('')}
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">改进建议</h2>
                ${resultData.suggestions.map(suggestion => `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="color: #34495e; margin-bottom: 10px; font-size: 16px;">${suggestion.issue}</h3>
                        <p style="color: #666; margin: 0; white-space: pre-wrap;">${suggestion.solution}</p>
                    </div>
                `).join('')}
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">总体评价</h2>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <p style="color: #666; margin: 0; white-space: pre-wrap;">${resultData.overall_review}</p>
                </div>
            </div>
        `;

        // 配置PDF导出选项
        const opt = {
            margin: [15, 15],
            filename: `作文评阅报告_${resultData.title}_${new Date().toLocaleDateString()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            },
            pagebreak: { mode: 'avoid-all' }
        };

        try {
            // 显示加载状态
            const exportBtn = document.querySelector('.export-btn');
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>导出中...';
            exportBtn.disabled = true;

            // 临时将导出容器添加到文档中
            document.body.appendChild(exportContainer);
            
            // 生成PDF
            await html2pdf().set(opt).from(exportContainer).save();
            
            // 移除临时容器
            document.body.removeChild(exportContainer);

            // 恢复按钮状态
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('导出PDF时发生错误，请稍后重试');
            
            // 确保清理临时元素和恢复按钮状态
            if (document.body.contains(exportContainer)) {
                document.body.removeChild(exportContainer);
            }
            const exportBtn = document.querySelector('.export-btn');
            exportBtn.innerHTML = '<i class="fas fa-download"></i>导出报告';
            exportBtn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResultDisplay();
}); 