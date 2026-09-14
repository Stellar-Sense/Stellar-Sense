"""使用 backend/.env 的配置启动小遇，不解密或覆盖模型密钥。"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001)
