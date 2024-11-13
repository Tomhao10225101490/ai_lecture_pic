from flask import render_template, request, jsonify, session, redirect, url_for, flash
from app.utils.ai_review import analyze_essay
from app.utils.ai_chat import chat_with_ai
from app.models import db, EssayHistory, User, Comment, CommentLike
from datetime import datetime, timedelta
from sqlalchemy import func
from functools import wraps
import base64
import requests
from werkzeug.utils import secure_filename
import os

# 登录验证装饰器
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def register_routes(app):
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                session['user_id'] = user.id
                session['username'] = user.username
                session['email'] = user.email
                return redirect(url_for('index'))
            
            flash('用户名或密码错误', 'error')
            return redirect(url_for('login'))
            
        return render_template('login.html')

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if request.method == 'POST':
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            
            if password != confirm_password:
                flash('两次输入的密码不一致', 'error')
                return redirect(url_for('register'))
                
            if User.query.filter_by(username=username).first():
                flash('用户名已存在', 'error')
                return redirect(url_for('register'))
                
            if User.query.filter_by(email=email).first():
                flash('邮箱已被注册', 'error')
                return redirect(url_for('register'))
            
            user = User(username=username, email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            
            flash('注册成功，请登录', 'success')
            return redirect(url_for('login'))
            
        return render_template('register.html')

    @app.route('/logout')
    def logout():
        session.pop('user_id', None)
        return redirect(url_for('login'))

    # 为需要登录的路由添加装饰器
    @app.route('/')
    @login_required
    def index():
        return render_template('index.html')

    @app.route('/history')
    @login_required
    def history():
        return render_template('history.html')

    @app.route('/examples')
    @login_required
    def examples():
        return render_template('examples.html')

    @app.route('/analysis')
    @login_required
    def analysis():
        return render_template('analysis.html')

    @app.route('/guide')
    @login_required
    def guide():
        return render_template('guide.html')

    @app.route('/result')
    @login_required
    def result():
        return render_template('result.html')
        
    @app.route('/api/review', methods=['POST'])
    @login_required
    def review_essay():
        try:
            data = request.get_json()
            title = data.get('title', '')
            content = data.get('content', '')
            grade = data.get('grade', '')
            essay_type = data.get('type', '记叙文')  # 从请求中获取文章类型
            
            if not all([title, content, grade]):
                return jsonify({
                    'success': False,
                    'message': '请填写完整的作文信息'
                }), 400
                
            result = analyze_essay(title, content, grade)
            
            if result is None:
                return jsonify({
                    'success': False,
                    'message': '评阅失败，请稍后重试'
                }), 500
            
            # 保存评阅历史
            history = EssayHistory(
                title=title,
                content=content,
                grade=grade,
                total_score=result['total_score'],
                review_result=result,
                essay_type=essay_type,  # 确保设置文章类型
                is_example=result['total_score'] >= 88  # 88分以上自动标记为优秀范文
            )
            db.session.add(history)
            db.session.commit()
                
            return jsonify({
                'success': True,
                'data': result
            })
            
        except Exception as e:
            print(f"Error in review_essay: {e}")
            return jsonify({
                'success': False,
                'message': '服务器错误'
            }), 500

    @app.route('/api/chat', methods=['POST'])
    @login_required
    def chat():
        try:
            data = request.get_json()
            message = data.get('message', '')
            
            if not message:
                return jsonify({
                    'success': False,
                    'message': '请输入消息'
                }), 400
                
            response = chat_with_ai(message)
            
            return jsonify({
                'success': True,
                'data': response
            })
            
        except Exception as e:
            print(f"Error in chat: {e}")
            return jsonify({
                'success': False,
                'message': '服务器错误'
            }), 500 

    @app.route('/example/<int:example_id>')
    @login_required
    def example_detail(example_id):
        try:
            example = EssayHistory.query.get_or_404(example_id)
            
            # 确保只能查看88分以上的作文
            if example.total_score < 88:
                return "范文不存在", 404
                
            return render_template('example_detail.html', example={
                'id': example.id,
                'title': example.title,
                'grade': example.grade,
                'type': example.essay_type,
                'content': example.content,
                'analysis': example.review_result.get('overall_review', '')
            })
            
        except Exception as e:
            print(f"Error in example_detail: {e}")
            return "范文加载失败", 500

    @app.route('/api/history')
    @login_required
    def get_history():
        try:
            # 获取筛选参数
            grade = request.args.get('grade', 'all')
            time_range = request.args.get('time_range', 'all')
            
            # 构建查询
            query = EssayHistory.query
            
            if grade != 'all':
                query = query.filter_by(grade=grade)
                
            if time_range != 'all':
                if time_range == 'week':
                    days = 7
                elif time_range == 'month':
                    days = 30
                elif time_range == 'year':
                    days = 365
                    
                from datetime import timedelta
                cutoff = datetime.utcnow() - timedelta(days=days)
                query = query.filter(EssayHistory.created_at >= cutoff)
            
            # 按时间倒序排序
            histories = query.order_by(EssayHistory.created_at.desc()).all()
            
            return jsonify({
                'success': True,
                'data': [history.to_dict() for history in histories]
            })
            
        except Exception as e:
            print(f"Error in get_history: {e}")
            return jsonify({
                'success': False,
                'message': '获取历史记录失败'
            }), 500

    @app.route('/api/history/<int:history_id>', methods=['GET'])
    @login_required
    def get_history_detail(history_id):
        try:
            history = EssayHistory.query.get_or_404(history_id)
            
            # 构建返回数据
            data = {
                'title': history.title,
                'content': history.content,
                'grade': history.grade,
                'total_score': history.total_score,
                'created_at': history.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                **history.review_result  # 展开评阅结果
            }
            
            return jsonify({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            print(f"Error in get_history_detail: {e}")
            return jsonify({
                'success': False,
                'message': '获评阅结果失败'
            }), 500

    @app.route('/api/history/<int:history_id>', methods=['DELETE'])
    @login_required
    def delete_history(history_id):
        try:
            history = EssayHistory.query.get_or_404(history_id)
            
            # 开始事务
            db.session.begin_nested()
            try:
                # 1. 首先删除所有点赞
                CommentLike.query.filter(
                    CommentLike.comment_id.in_(
                        db.session.query(Comment.id).filter_by(essay_id=history_id)
                    )
                ).delete(synchronize_session=False)
                
                # 2. 删除所有回复评论（parent_id 不为 None 的评论）
                Comment.query.filter(
                    Comment.essay_id == history_id,
                    Comment.parent_id.isnot(None)
                ).delete(synchronize_session=False)
                
                # 3. 删除所有主评论（parent_id 为 None 的评论）
                Comment.query.filter(
                    Comment.essay_id == history_id,
                    Comment.parent_id.is_(None)
                ).delete(synchronize_session=False)
                
                # 4. 最后删除历史记录
                db.session.delete(history)
                
                # 提交事务
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': '删除成功'
                })
                
            except Exception as e:
                # 如果出错，回滚事务
                db.session.rollback()
                raise e
                
        except Exception as e:
            print(f"Error in delete_history: {e}")
            return jsonify({
                'success': False,
                'message': '删除失败'
            }), 500

    @app.route('/api/examples')
    @login_required
    def get_examples():
        try:
            # 获取筛选参数
            grade = request.args.get('grade', 'all')
            essay_type = request.args.get('type', 'all')
            
            # 构建查询
            query = EssayHistory.query.filter(
                EssayHistory.total_score >= 88  # 88分以上的作文
            )
            
            if grade != 'all':
                query = query.filter_by(grade=grade)
                
            if essay_type != 'all':
                query = query.filter_by(essay_type=essay_type)
            
            # 按分数降序排序
            examples = query.order_by(EssayHistory.total_score.desc()).all()
            
            return jsonify({
                'success': True,
                'data': [example.to_dict() for example in examples]
            })
            
        except Exception as e:
            print(f"Error in get_examples: {e}")
            return jsonify({
                'success': False,
                'message': '获取范文失败'
            }), 500

    @app.route('/api/analysis/stats')
    @login_required
    def get_analysis_stats():
        try:
            # 获取当前月份的开始日期
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # 计算各项统计数据
            monthly_count = EssayHistory.query.filter(
                EssayHistory.created_at >= month_start
            ).count()
            
            avg_score = db.session.query(
                func.avg(EssayHistory.total_score)
            ).scalar() or 0
            
            max_score = db.session.query(
                func.max(EssayHistory.total_score)
            ).scalar() or 0
            
            excellent_count = EssayHistory.query.filter(
                EssayHistory.total_score >= 88
            ).count()
            
            return jsonify({
                'success': True,
                'data': {
                    'monthly_count': monthly_count,
                    'avg_score': round(float(avg_score), 1),
                    'max_score': int(max_score),
                    'excellent_count': excellent_count
                }
            })
        except Exception as e:
            print(f"Error in get_analysis_stats: {e}")
            return jsonify({
                'success': False,
                'message': '获取统计数据失败'
            }), 500

    @app.route('/api/analysis/trend')
    @login_required
    def get_score_trend():
        try:
            time_range = request.args.get('range', 'week')
            
            # 确定时间范围
            now = datetime.utcnow()
            if time_range == 'week':
                start_date = now - timedelta(days=7)
                group_by = func.date(EssayHistory.created_at)
                date_format = '%Y-%m-%d'
            elif time_range == 'month':
                start_date = now - timedelta(days=30)
                group_by = func.date(EssayHistory.created_at)
                date_format = '%Y-%m-%d'
            else:  # year
                start_date = now - timedelta(days=365)
                group_by = func.date_format(EssayHistory.created_at, '%Y-%m')
                date_format = '%Y-%m'
            
            # 查询每天的平均分数
            scores = db.session.query(
                group_by.label('date'),
                func.avg(EssayHistory.total_score).label('score')
            ).filter(
                EssayHistory.created_at >= start_date
            ).group_by('date').all()
            
            # 格式化结果
            result = [
                {
                    'date': date.strftime(date_format) if isinstance(date, datetime) else date,
                    'score': round(float(score), 1)
                }
                for date, score in scores
            ]
            
            return jsonify({
                'success': True,
                'data': result
            })
        except Exception as e:
            print(f"Error in get_score_trend: {e}")
            return jsonify({
                'success': False,
                'message': '获取趋势数据失败'
            }), 500

    @app.route('/api/analysis/dimensions')
    @login_required
    def get_dimension_analysis():
        try:
            # 计算各维度的平均分数
            dimensions = ['内容立意', '结构布局', '语言表达', '书写规范']
            current_scores = []
            avg_scores = []
            
            for dimension in dimensions:
                # 获取最近一次评阅的分数
                latest = EssayHistory.query.order_by(
                    EssayHistory.created_at.desc()
                ).first()
                
                if latest:
                    for dim in latest.review_result['dimensions']:
                        if dim['name'] == dimension:
                            current_scores.append(dim['score'])
                            break
                else:
                    current_scores.append(0)
                
                # 计算历史平均分
                total = 0
                count = 0
                histories = EssayHistory.query.all()
                for history in histories:
                    for dim in history.review_result['dimensions']:
                        if dim['name'] == dimension:
                            total += dim['score']
                            count += 1
                            break
                
                avg_scores.append(round(total / count if count > 0 else 0, 1))
            
            return jsonify({
                'success': True,
                'data': {
                    'dimensions': dimensions,
                    'current_scores': current_scores,
                    'avg_scores': avg_scores
                }
            })
        except Exception as e:
            print(f"Error in get_dimension_analysis: {e}")
            return jsonify({
                'success': False,
                'message': '获取维度分析失败'
            }), 500

    @app.route('/api/comments/<int:essay_id>', methods=['GET'])
    @login_required
    def get_comments(essay_id):
        try:
            comments = Comment.query.filter_by(
                essay_id=essay_id,
                parent_id=None
            ).order_by(Comment.created_at.desc()).all()
            
            comments_data = []
            for comment in comments:
                comment_dict = {
                    'id': comment.id,
                    'content': comment.content,
                    'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'user': {
                        'id': comment.user.id,
                        'username': comment.user.username
                    },
                    'likes_count': len(comment.likes),
                    'liked': any(like.user_id == session['user_id'] for like in comment.likes),
                    'replies': [{
                        'id': reply.id,
                        'content': reply.content,
                        'created_at': reply.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                        'user': {
                            'id': reply.user.id,
                            'username': reply.user.username
                        },
                        'likes_count': len(reply.likes),
                        'liked': any(like.user_id == session['user_id'] for like in reply.likes)
                    } for reply in comment.replies]
                }
                comments_data.append(comment_dict)
                
            return jsonify({
                'success': True,
                'data': comments_data
            })
        except Exception as e:
            print(f"Error in get_comments: {e}")
            return jsonify({
                'success': False,
                'message': '获取评论失败'
            }), 500

    @app.route('/api/comments', methods=['POST'])
    @login_required
    def add_comment():
        try:
            data = request.get_json()
            content = data.get('content')
            essay_id = data.get('essay_id')
            parent_id = data.get('parent_id')
            
            if not content or not essay_id:
                return jsonify({
                    'success': False,
                    'message': '评论内容不能为空'
                }), 400
                
            comment = Comment(
                content=content,
                user_id=session['user_id'],
                essay_id=essay_id,
                parent_id=parent_id
            )
            db.session.add(comment)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'data': {
                    'id': comment.id,
                    'content': comment.content,
                    'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'user': {
                        'id': comment.user.id,
                        'username': comment.user.username
                    },
                    'likes_count': 0,
                    'liked': False,
                    'replies': []
                }
            })
        except Exception as e:
            print(f"Error in add_comment: {e}")
            return jsonify({
                'success': False,
                'message': '发表评论失败'
            }), 500

    @app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
    @login_required
    def toggle_like(comment_id):
        try:
            like = CommentLike.query.filter_by(
                user_id=session['user_id'],
                comment_id=comment_id
            ).first()
            
            if like:
                db.session.delete(like)
                action = 'unliked'
            else:
                like = CommentLike(
                    user_id=session['user_id'],
                    comment_id=comment_id
                )
                db.session.add(like)
                action = 'liked'
                
            db.session.commit()
            
            comment = Comment.query.get_or_404(comment_id)
            return jsonify({
                'success': True,
                'data': {
                    'action': action,
                    'likes_count': len(comment.likes)
                }
            })
        except Exception as e:
            print(f"Error in toggle_like: {e}")
            return jsonify({
                'success': False,
                'message': '操作失败'
            }), 500

    @app.route('/api/ocr', methods=['POST'])
    @login_required
    def ocr():
        try:
            if 'image' not in request.files:
                return jsonify({
                    'success': False,
                    'message': '未找到图片文件'
                }), 400
            
            image_file = request.files['image']
            if not image_file.filename:
                return jsonify({
                    'success': False,
                    'message': '未选择图片文件'
                }), 400
            
            # 读取图片文件并转换为base64
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            # 获取access token
            token_url = "https://aip.baidubce.com/oauth/2.0/token"
            params = {
                "grant_type": "client_credentials",
                "client_id": "BmmUp2mLDM5EbjSBWh7BOK4s",
                "client_secret": "bSM8Fr3Wu0RRKlS9WWwcl3557jouprNT"
            }
            
            token_response = requests.post(token_url, params=params)
            access_token = token_response.json().get('access_token')
            
            if not access_token:
                return jsonify({
                    'success': False,
                    'message': '获取访问令牌失败'
                }), 500
            
            # 调用OCR API
            ocr_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={access_token}"
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            
            data = {
                "image": image_data
            }
            
            response = requests.post(ocr_url, headers=headers, data=data)
            result = response.json()
            
            if 'words_result' in result:
                text = '\n'.join(item['words'] for item in result['words_result'])
                return jsonify({
                    'success': True,
                    'text': text
                })
            else:
                return jsonify({
                    'success': False,
                    'message': '文字识别失败'
                }), 500
            
        except Exception as e:
            print(f"Error in OCR: {e}")
            return jsonify({
                'success': False,
                'message': '服务器错误'
            }), 500