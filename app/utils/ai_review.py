import requests
import json
import re
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import time

def create_session():
    """创建带有重试机制的会话"""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,  # 总共重试3次
        backoff_factor=1,  # 重试间隔
        status_forcelist=[500, 502, 503, 504],  # 需要重试的HTTP状态码
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def get_access_token():
    """获取百度AI接口的access_token"""
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": "r5B0INu5jWFYSH1U15ZvwwsI",
        "client_secret": "f4jHr6EpE1DbsX0vjuNGGEuMxdVX3pSn"
    }
    
    session = create_session()
    
    try:
        response = session.post(url, params=params, timeout=10)
        return response.json().get("access_token")
    except requests.exceptions.RequestException as e:
        print(f"Error getting access token: {e}")
        return None

def analyze_essay(title, content, grade, max_retries=3):
    """分析作文内容"""
    for attempt in range(max_retries):
        try:
            access_token = get_access_token()
            if not access_token:
                return None

            url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/yi_34b_chat"
            params = {"access_token": access_token}
            
            # 修改评阅提示词
            prompt = f"""你现在是一个严格的作文评阅老师，请根据以下作文内容进行客观、公正的评分和详细点评。请仔细阅读作文内容，根据实际水平给出合理的分数。

作文信息：
标题：{title}
年级：{grade}
内容：{content}

评分标准：
1. 内容立意（20分）：主题突出，思想深刻，见解独到
2. 结构布局（20分）：结构严谨，层次分明，过渡自然
3. 语言表达（30分）：语言生动，修辞恰当，句式丰富
4. 书写规范（30分）：标点正确，几乎无错别字，格式规范

请严格按照以下JSON格式返回评阅结果：
{{
    "total_score": 总分（各维度得分之和）,
    "dimensions": [
        {{
            "name": "内容立意",
            "score": 分数（0-20）,
            "comment": "详细评语"
        }},
        {{
            "name": "结构布局",
            "score": 分数（0-20）,
            "comment": "详细评语"
        }},
        {{
            "name": "语言表达",
            "score": 分数（0-30）,
            "comment": "详细评语"
        }},
        {{
            "name": "书写规范",
            "score": 分数（0-30）,
            "comment": "详细评语"
        }}
    ],
    "excellent_sentences": [
        {{
            "sentence": "精彩句子",
            "analysis": "分析点评"
        }}
    ],
    "highlights": [
        {{
            "point": "亮点",
            "detail": "详细说明"
        }}
    ],
    "suggestions": [
        {{
            "issue": "问题",
            "solution": "改进建议"
        }}
    ],
    "overall_review": "总体评价"
}}"""
            
            payload = json.dumps({
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
            
            headers = {
                'Content-Type': 'application/json'
            }

            session = create_session()
            response = session.post(url, params=params, headers=headers, data=payload, timeout=30)
            
            if response.status_code == 200:
                response_json = response.json()
                result = response_json.get("result", "")
                
                if not result:
                    print("Empty result from API")
                    if attempt < max_retries - 1:
                        time.sleep(1)
                        continue
                    return None
                
                review_result = extract_json_from_text(result)
                if review_result:
                    # 验证结果格式
                    required_fields = ['total_score', 'dimensions', 'excellent_sentences', 
                                    'highlights', 'suggestions', 'overall_review']
                    if all(field in review_result for field in required_fields):
                        return review_result
                
                print("Invalid result format")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                    
            print(f"API request failed with status code: {response.status_code}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
                
        except requests.exceptions.Timeout:
            print("Request timed out")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
                
        except requests.exceptions.SSLError as e:
            print(f"SSL Error: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
                
        except Exception as e:
            print(f"Error in analyze_essay: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
                
    return None

def extract_json_from_text(text):
    """从文本中提取JSON字符串"""
    try:
        # 首先尝试直接解析
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            # 使用正则表达式查找 { 和 } 之间的内容，并确保 JSON 格式正确
            json_match = re.search(r'\{.*?\}', text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                # 检查并修复常见的 JSON 格式问题
                json_str = json_str.strip()
                # 确保字符串正确结束
                if not json_str.endswith('}'):
                    json_str += '}'
                # 修复缺少引号的问题
                json_str = re.sub(r'([{,]\s*)(\w+)(:)', r'\1"\2"\3', json_str)
                # 修复多余的逗号
                json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                # 修复未闭合的字符串
                json_str = re.sub(r'([^"])"([^"]*?)$', r'\1"\2"', json_str)
                
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    print(f"Error parsing fixed JSON: {e}")
                    print("Fixed JSON string:", json_str)
                    
                    # 如果还是失败，尝试更激进的修复
                    try:
                        # 移除所有换行符和多余的空格
                        json_str = ' '.join(json_str.split())
                        # 确保所有字段都有引号
                        json_str = re.sub(r'([{,]\s*)([^"\s]+)(\s*:)', r'\1"\2"\3', json_str)
                        # 确保所有值都有引号（除了数字和布尔值）
                        json_str = re.sub(r':\s*([^"{}\[\],\s][^,}\]]*?)([,}\]])', r': "\1"\2', json_str)
                        return json.loads(json_str)
                    except json.JSONDecodeError as e:
                        print(f"Error parsing aggressively fixed JSON: {e}")
                        return None
        except Exception as e:
            print(f"Error extracting JSON: {e}")
    return None