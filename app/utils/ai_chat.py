import requests
import json
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

def chat_with_ai(message, max_retries=3):
    """与AI助手对话"""
    for attempt in range(max_retries):
        try:
            access_token = get_access_token()
            if not access_token:
                return "抱歉，无法连接到AI服务。"

            url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/yi_34b_chat"
            params = {"access_token": access_token}
            
            payload = json.dumps({
                "messages": [
                    {
                        "role": "user",
                        "content": message
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
                result = response_json.get("result", "抱歉，我现在无法回答这个问题。")
                return result
            else:
                print(f"API request failed with status code: {response.status_code}")
                if attempt < max_retries - 1:
                    time.sleep(1)  # 重试前等待1秒
                    continue
                return "抱歉，服务暂时不可用。"
                
        except requests.exceptions.Timeout:
            print("Request timed out")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            return "抱歉，请求超时，请稍后重试。"
            
        except requests.exceptions.SSLError as e:
            print(f"SSL Error: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            return "抱歉，连接出现问题，请稍后重试。"
            
        except Exception as e:
            print(f"Error in chat_with_ai: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            return "抱歉，发生了一些错误，请稍后重试。"
    
    return "抱歉，服务暂时不可用，请稍后重试。"