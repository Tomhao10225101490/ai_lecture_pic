class VoiceInput {
    constructor() {
        this.titleSpeechBtn = document.getElementById('titleSpeechBtn');
        this.contentSpeechBtn = document.getElementById('contentSpeechBtn');
        this.titleInput = document.getElementById('title');
        this.contentInput = document.getElementById('content');

        // 检查浏览器是否支持语音识别
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.setupRecognition();
            this.initializeEventListeners();
        } else {
            this.disableVoiceInput();
        }
    }

    setupRecognition() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';

        this.recognition.onstart = () => {
            console.log('语音识别已启动');
        };

        this.recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            this.stopRecording();
        };

        this.recognition.onend = () => {
            console.log('语音识别已结束');
            this.stopRecording();
        };
    }

    initializeEventListeners() {
        this.titleSpeechBtn.addEventListener('click', () => {
            this.startRecording(this.titleInput, this.titleSpeechBtn);
        });

        this.contentSpeechBtn.addEventListener('click', () => {
            this.startRecording(this.contentInput, this.contentSpeechBtn);
        });

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.currentInput) {
                // 如果是标题输入框，只取第一句话
                if (this.currentInput === this.titleInput) {
                    const firstSentence = finalTranscript.split('。')[0];
                    this.currentInput.value = firstSentence;
                    if (finalTranscript.length > 0) {
                        this.stopRecording();
                    }
                } else {
                    // 如果是内容输入框，追加文本
                    const currentValue = this.currentInput.value;
                    const cursorPosition = this.currentInput.selectionStart;
                    const newValue = currentValue.slice(0, cursorPosition) + 
                                   finalTranscript + 
                                   currentValue.slice(cursorPosition);
                    this.currentInput.value = newValue;
                    this.currentInput.selectionStart = cursorPosition + finalTranscript.length;
                    this.currentInput.selectionEnd = cursorPosition + finalTranscript.length;
                }
            }
        };
    }

    startRecording(inputElement, button) {
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        this.currentInput = inputElement;
        this.currentButton = button;
        this.isRecording = true;

        // 更新按钮状态
        button.innerHTML = '<i class="fas fa-stop"></i>停止录音';
        button.classList.add('recording');

        try {
            this.recognition.start();
        } catch (error) {
            console.error('启动语音识别失败:', error);
            this.stopRecording();
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.recognition.stop();

        // 恢复按钮状态
        if (this.currentButton) {
            this.currentButton.innerHTML = '<i class="fas fa-microphone"></i>语音输入';
            this.currentButton.classList.remove('recording');
        }

        this.currentInput = null;
        this.currentButton = null;
    }

    disableVoiceInput() {
        // 如果浏览器不支持语音识别，禁用语音输入按钮
        [this.titleSpeechBtn, this.contentSpeechBtn].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.title = '您的浏览器不支持语音输入';
                btn.style.opacity = '0.5';
            }
        });
    }
}

// 初始化语音输入功能
document.addEventListener('DOMContentLoaded', () => {
    new VoiceInput();
});

// 保持原有的提交功能
document.getElementById('submitBtn').addEventListener('click', async function() {
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const grade = document.getElementById('gradeLevel').value;
    const type = document.getElementById('essayType').value || '记叙文';
    
    if (!title || !content) {
        alert('请填写完整的作文信息');
        return;
    }
    
    // 显示加载状态
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>评阅中...';
    
    try {
        const response = await fetch('/api/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content,
                grade: getGradeText(grade),
                type: type
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 将评阅结果存储到 sessionStorage
            sessionStorage.setItem('reviewResult', JSON.stringify({
                title,
                grade: getGradeText(grade),
                content,
                ...result.data
            }));
            
            // 跳转到结果页面
            window.location.href = '/result';
        } else {
            alert(result.message || '评阅失败，请稍后重试');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请稍后重试');
    } finally {
        // 恢复按钮状态
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-pen-fancy"></i>开始评阅';
    }
});

// 转换年级值为中文
function getGradeText(value) {
    const gradeMap = {
        'primary': '小学',
        'junior': '初中',
        'senior': '高中'
    };
    return gradeMap[value] || value;
}

// 添加录音按钮的样式
const style = document.createElement('style');
style.textContent = `
    .speech-btn.recording {
        background: #dc3545;
        border-color: #dc3545;
        color: white;
    }

    .speech-btn.recording i {
        color: white;
    }
`;
document.head.appendChild(style);

// 添加图片上传相关功能
class ImageUploader {
    constructor() {
        this.uploadArea = document.getElementById('imageUploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.contentInput = document.getElementById('content');
        this.ocrLoading = document.querySelector('.ocr-loading');
        this.uploadPlaceholder = document.querySelector('.upload-placeholder');
        
        this.initializeEventListeners();
        
        // 将实例添加到window对象，以便HTML中的onclick能够访问
        window.imageUploader = this;
    }

    initializeEventListeners() {
        // 点击上传区域触发文件选择
        this.uploadArea.addEventListener('click', (e) => {
            if (!this.imagePreview.contains(e.target)) {
                this.imageInput.click();
            }
        });

        // 文件选择处理
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImage(file);
            }
        });

        // 拖拽处理
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImage(file);
            }
        });
    }

    handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = this.imagePreview.querySelector('img');
            img.src = e.target.result;
            this.imagePreview.style.display = 'block';  // 使用style.display而不是hidden
            this.uploadPlaceholder.style.display = 'none';  // 隐藏上传占位符
        };
        reader.readAsDataURL(file);
    }

    async startOCR() {
        try {
            const file = this.imageInput.files[0];
            if (!file) return;

            this.ocrLoading.style.display = 'flex';  // 使用flex显示加载状态
            
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/ocr', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.contentInput.value = result.text;
                this.removeImage();  // 识别完成后清除图片
            } else {
                throw new Error(result.message || '文字识别失败');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            alert(error.message || '文字识别失败，请重试');
        } finally {
            this.ocrLoading.style.display = 'none';
        }
    }

    removeImage() {
        this.imageInput.value = '';
        this.imagePreview.style.display = 'none';
        this.uploadPlaceholder.style.display = 'block';
    }
}

// 初始化图片上传功能
document.addEventListener('DOMContentLoaded', () => {
    new ImageUploader();
}); 