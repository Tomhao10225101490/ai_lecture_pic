import requests
import base64
import os

API_KEY = "BmmUp2mLDM5EbjSBWh7BOK4s"
SECRET_KEY = "bSM8Fr3Wu0RRKlS9WWwcl3557jouprNT"


def main():
    # 获取access token
    url = "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=" + get_access_token()
    
    # 读取图片文件
    image_path = "/Users/tomzh/Desktop/py-demo/image_viewer/writing_pics/img.png"
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return
        
    with open(image_path, 'rb') as f:
        image = base64.b64encode(f.read())
    
    # 准备请求参数
    params = {
        "image": image
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }

    # 发送请求
    response = requests.post(url, headers=headers, data=params)
    result = response.json()
    
    # 处理识别结果，将所有words连接成完整文本
    if 'words_result' in result:
        text = '\n'.join(item['words'] for item in result['words_result'])
        print("识别的完整文本：")
        print(text)
    else:
        print("识别失败：", result)


def get_access_token():
    """
    使用 AK，SK 生成鉴权签名（Access Token）
    :return: access_token，或是None(如果错误)
    """
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {"grant_type": "client_credentials", "client_id": API_KEY, "client_secret": SECRET_KEY}
    return str(requests.post(url, params=params).json().get("access_token"))


if __name__ == '__main__':
    main()
