class SpeechRecognition {
    constructor() {
        this.appId = config.xunfei.appId;
        this.apiKey = config.xunfei.apiKey;
        this.apiSecret = config.xunfei.apiSecret;
        this.wsUrl = 'wss://iat.xf-yun.com/v1';
    }

    // 生成RFC1123格式的时间戳
    getDate() {
        let date = new Date();
        let weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${weekday[date.getUTCDay()]}, ${date.getUTCDate()} ${month[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} GMT`;
    }

    // 生成鉴权签名
    async getSignature(date) {
        const signatureOrigin = `host: iat.xf-yun.com\ndate: ${date}\nGET /v1 HTTP/1.1`;
        const signatureSha = await this.hmacSha256(signatureOrigin, this.apiSecret);
        return btoa(signatureSha);
    }

    // HMAC-SHA256加密
    async hmacSha256(message, secret) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyData, { name: 'HMAC', hash: 'SHA-256' },
            false, ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC', cryptoKey, messageData
        );
        
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // 开始录音并识别
    async startRecognition(onResult) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            
            // 获取鉴权参数
            const date = this.getDate();
            const signature = await this.getSignature(date);
            const authorization = btoa(
                `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
            );

            // 建立WebSocket连接
            const url = `${this.wsUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=iat.xf-yun.com`;
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('WebSocket连接已建立');
                mediaRecorder.start(40); // 每40ms发送一次数据
            };

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
                // 将音频数据发送给讯飞服务器
                this.sendAudioData(ws, event.data, audioChunks.length);
            };

            ws.onmessage = (event) => {
                const result = JSON.parse(event.data);
                if (result.payload && result.payload.result) {
                    const text = atob(result.payload.result.text);
                    onResult(text);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket错误:', error);
            };

            return {
                stop: () => {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                    ws.close();
                }
            };
        } catch (error) {
            console.error('录音失败:', error);
            throw error;
        }
    }

    // 发送音频数据
    async sendAudioData(ws, audioData, seq) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(audioData);
        
        reader.onload = () => {
            const buffer = reader.result;
            const audio = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            
            const data = {
                header: {
                    app_id: this.appId,
                    status: seq === 1 ? 0 : 2
                },
                parameter: {
                    iat: {
                        domain: "slm",
                        language: "zh_cn",
                        accent: "mandarin",
                        vinfo: 1,
                        dwa: "wpgs"
                    }
                },
                payload: {
                    audio: {
                        encoding: "raw",
                        sample_rate: 16000,
                        channels: 1,
                        bit_depth: 16,
                        seq,
                        status: seq === 1 ? 0 : 2,
                        audio
                    }
                }
            };
            
            ws.send(JSON.stringify(data));
        };
    }
} 