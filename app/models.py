from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class EssayHistory(db.Model):
    __tablename__ = 'essay_history'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(100, collation='utf8mb4_unicode_ci'), nullable=False)
    content = db.Column(db.Text(collation='utf8mb4_unicode_ci'), nullable=False)
    grade = db.Column(db.String(20, collation='utf8mb4_unicode_ci'), nullable=False)
    total_score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # 存储详细评阅结果（JSON格式）
    review_result = db.Column(db.JSON, nullable=False)
    
    # 添加是否为优秀范文的标记（分数>=88分自动标记为优秀范文）
    is_example = db.Column(db.Boolean, default=False)
    essay_type = db.Column(db.String(20, collation='utf8mb4_unicode_ci'))  # 记叙文、议论文等
    
    # 添加索引
    __table_args__ = (
        db.Index('idx_grade_created', 'grade', 'created_at'),
        db.Index('idx_score_example', 'total_score', 'is_example'),
    )
    
    # 添加与评论的关系，设置级联删除
    comments = db.relationship('Comment', 
                             backref='essay', 
                             cascade='all, delete-orphan',
                             primaryjoin="and_(EssayHistory.id==Comment.essay_id, Comment.parent_id==None)")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'grade': self.grade,
            'total_score': self.total_score,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'review_result': self.review_result,
            'is_example': self.is_example,
            'essay_type': self.essay_type
        } 

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password) 

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text(collation='utf8mb4_unicode_ci'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 外键关联
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    essay_id = db.Column(db.Integer, db.ForeignKey('essay_history.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)  # 回复的评论ID
    
    # 关系
    user = db.relationship('User', backref='comments')
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]))
    likes = db.relationship('CommentLike', backref='comment', cascade='all, delete-orphan')

class CommentLike(db.Model):
    __tablename__ = 'comment_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'comment_id', name='unique_user_comment_like'),
    )