from flask import Flask
from flask_cors import CORS
from app.routes import register_routes
from app.models import db
import os
import pymysql
import sys

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # 添加 session 密钥
    app.config['SECRET_KEY'] = 'your-secret-key'  # 请更改为随机的密钥
    
    # 配置MySQL数据库
    try:
        # 测试数据库连接
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='12345678',
            database='AI_lecture',
            charset='utf8mb4'
        )
        
        # 检查表是否存在
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'AI_lecture'
                AND table_name = 'essay_history'
            """)
            table_exists = cursor.fetchone()[0] > 0
            
            # 只有在表不存在时才创建表
            if not table_exists:
                print("Table does not exist, creating...")
                cursor.execute("DROP TABLE IF EXISTS essay_history")
                conn.commit()
            else:
                print("Table already exists, skipping creation...")
                
        conn.close()
        print("Database connection successful!")
    except Exception as e:
        print(f"Database connection failed: {e}")
        print("Please make sure MySQL is running and the database is created.")
        sys.exit(1)
    
    # 数据库配置
    app.config.update(
        SQLALCHEMY_DATABASE_URI='mysql+pymysql://root:12345678@localhost/AI_lecture?charset=utf8mb4',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_POOL_SIZE=10,
        SQLALCHEMY_POOL_TIMEOUT=30,
        SQLALCHEMY_ENGINE_OPTIONS={
            'pool_pre_ping': True,
            'pool_recycle': 3600,
        }
    )
    
    try:
        # 初始化数据库
        db.init_app(app)
        
        # 创建数据库表（如果不存在）
        with app.app_context():
            db.create_all()
            print("Database tables checked/created successfully!")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        sys.exit(1)
    
    # 注册路由
    register_routes(app)
    
    return app

if __name__ == '__main__':
    try:
        app = create_app()
        app.run(debug=True)
    except Exception as e:
        print(f"Application startup failed: {e}")
        sys.exit(1)