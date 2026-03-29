from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db
from ..security import get_current_admin
from ..config import get_settings
import os

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def _delete_post_cascade(db: Session, post: models.Post):
    """Delete a post and all its comments, likes, and .md files."""
    # Delete comments (replies) recursively
    comments = db.query(models.Post).filter(models.Post.parent == post.id).all()
    for comment in comments:
        db.query(models.PostLike).filter(models.PostLike.post_id == comment.id).delete()
        comment_path = os.path.join(settings.posts_dir, comment.path)
        if os.path.exists(comment_path):
            os.remove(comment_path)
        db.delete(comment)
    # Delete likes for the post itself
    db.query(models.PostLike).filter(models.PostLike.post_id == post.id).delete()
    # Delete .md file
    path = os.path.join(settings.posts_dir, post.path)
    if os.path.exists(path):
        os.remove(path)
    db.delete(post)


@router.get("/stats", response_model=schemas.AdminStats)
def get_stats(
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(models.Student.id)).scalar()
    total_posts = db.query(func.count(models.Post.id)).filter(models.Post.parent == None).scalar()
    total_comments = db.query(func.count(models.Post.id)).filter(models.Post.parent != None).scalar()
    return schemas.AdminStats(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
    )


@router.delete("/posts/{post_id}", status_code=204)
def admin_delete_post(
    post_id: int,
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _delete_post_cascade(db, post)
    db.commit()


@router.delete("/users/{username}", status_code=204)
def admin_delete_user(
    username: str,
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    student = db.query(models.Student).filter(models.Student.userName == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    # Delete all top-level posts by this user (cascade handles comments + likes)
    user_posts = db.query(models.Post).filter(
        models.Post.author == student.id, models.Post.parent == None
    ).all()
    for post in user_posts:
        _delete_post_cascade(db, post)
    # Delete any remaining likes by this user on other posts
    db.query(models.PostLike).filter(models.PostLike.student_id == student.id).delete()
    # Delete canvas state
    db.query(models.CanvasState).filter(models.CanvasState.student_id == student.id).delete()
    db.delete(student)
    db.commit()


@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 50,
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.Student).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "userName": u.userName,
            "name": u.name,
            "isAdmin": u.isAdmin,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.put("/users/{username}/promote", status_code=200)
def promote_user(
    username: str,
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    student = db.query(models.Student).filter(models.Student.userName == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    student.isAdmin = True
    db.commit()
    return {"message": f"{username} is now an admin"}


@router.get("/posts")
def list_all_posts(
    skip: int = 0,
    limit: int = 50,
    _: models.Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    posts = (
        db.query(models.Post)
        .filter(models.Post.parent == None)
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for p in posts:
        student = db.query(models.Student).filter(models.Student.id == p.author).first()
        result.append({
            "id": p.id,
            "author_username": student.userName if student else "deleted",
            "isAnonymous": p.isAnonymous,
            "likes": p.likes,
            "created_at": p.created_at,
        })
    return result
