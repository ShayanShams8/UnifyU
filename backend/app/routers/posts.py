from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..security import get_current_student, get_optional_student
from ..config import get_settings
import os, uuid, httpx

router = APIRouter(prefix="/posts", tags=["posts"])
settings = get_settings()


def _ensure_posts_dir():
    os.makedirs(settings.posts_dir, exist_ok=True)


def _save_content(content: str) -> str:
    _ensure_posts_dir()
    filename = f"{uuid.uuid4()}.md"
    path = os.path.join(settings.posts_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return filename


def _load_content(filename: str) -> str:
    path = os.path.join(settings.posts_dir, filename)
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _enrich_post(post: models.Post, db: Session, current_id: Optional[int] = None) -> dict:
    student = db.query(models.Student).filter(models.Student.id == post.author).first()
    content = _load_content(post.path)

    if post.parent is not None:
        # Comments: entire file content is the message body
        title = ""
        body = content
    else:
        lines = content.strip().split("\n")
        title = lines[0].lstrip("# ").strip() if lines else ""
        body = "\n".join(lines[1:]).strip() if len(lines) > 1 else content

    comment_count = db.query(func.count(models.Post.id)).filter(
        models.Post.parent == post.id
    ).scalar()

    liked_by_me = False
    if current_id:
        liked_by_me = (
            db.query(models.PostLike)
            .filter(models.PostLike.post_id == post.id, models.PostLike.student_id == current_id)
            .first()
        ) is not None

    show_author = not post.isAnonymous
    return {
        "id": post.id,
        "author": post.author,
        "path": post.path,
        "parent": post.parent,
        "likes": post.likes,
        "isAnonymous": post.isAnonymous,
        "created_at": post.created_at,
        # Posts never show real name — only username (real name is on profile page only)
        "author_name": None,
        "author_username": student.userName if student and show_author else None,
        "author_pfp": student.pfp if student and show_author else None,
        "content": body,
        "title": title,
        "comment_count": comment_count,
        "liked_by_me": liked_by_me,
    }


async def _send_push_notification(token: str, title: str, body: str) -> None:
    """Send a push notification via Expo Push API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={"to": token, "title": title, "body": body},
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
    except Exception:
        pass  # Never fail a request because of a notification error


@router.get("", response_model=List[schemas.PostOut])
def list_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current: Optional[models.Student] = Depends(get_optional_student),
):
    posts = (
        db.query(models.Post)
        .filter(models.Post.parent == None)
        .order_by(models.Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_enrich_post(p, db, current.id if current else None) for p in posts]


@router.post("", response_model=schemas.PostOut, status_code=201)
def create_post(
    data: schemas.PostCreate,
    background_tasks: BackgroundTasks,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    # Validate parent exists
    parent_post = None
    if data.parent is not None:
        parent_post = db.query(models.Post).filter(models.Post.id == data.parent).first()
        if not parent_post:
            raise HTTPException(status_code=404, detail="Parent post not found")

    content_with_title = f"# {data.title}\n\n{data.content}" if data.title else data.content
    filename = _save_content(content_with_title)

    post = models.Post(
        author=current.id,
        path=filename,
        parent=data.parent,
        isAnonymous=data.isAnonymous,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Notify the parent post's author if they have a push token (and it's not self-comment)
    if parent_post and parent_post.author != current.id:
        author = db.query(models.Student).filter(models.Student.id == parent_post.author).first()
        if author and author.push_token:
            background_tasks.add_task(
                _send_push_notification,
                author.push_token,
                "New comment on your post",
                f"@{current.userName} commented: {data.content[:80]}",
            )

    return _enrich_post(post, db, current.id)


@router.get("/{post_id}", response_model=schemas.PostDetail)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current: Optional[models.Student] = Depends(get_optional_student),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    current_id = current.id if current else None
    enriched = _enrich_post(post, db, current_id)

    # 2-level comment tree: level-1 comments + their replies
    level1 = (
        db.query(models.Post)
        .filter(models.Post.parent == post_id)
        .order_by(models.Post.created_at.asc())
        .all()
    )

    comments_with_replies = []
    for c in level1:
        enriched_c = _enrich_post(c, db, current_id)
        replies = (
            db.query(models.Post)
            .filter(models.Post.parent == c.id)
            .order_by(models.Post.created_at.asc())
            .all()
        )
        enriched_c["replies"] = [_enrich_post(r, db, current_id) for r in replies]
        comments_with_replies.append(enriched_c)

    enriched["comments"] = comments_with_replies
    return enriched


@router.post("/{post_id}/like", response_model=schemas.PostOut)
async def toggle_like(
    post_id: int,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (
        db.query(models.PostLike)
        .filter(models.PostLike.post_id == post_id, models.PostLike.student_id == current.id)
        .first()
    )
    if existing:
        db.delete(existing)
        post.likes = max(0, post.likes - 1)
    else:
        db.add(models.PostLike(post_id=post_id, student_id=current.id))
        post.likes += 1

        # Notify post author of new like (if it's not a self-like)
        if post.author != current.id:
            author = db.query(models.Student).filter(models.Student.id == post.author).first()
            if author and author.push_token:
                await _send_push_notification(
                    author.push_token,
                    "Someone liked your post",
                    f"@{current.userName} liked your post",
                )

    db.commit()
    db.refresh(post)
    return _enrich_post(post, db, current.id)


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author != current.id and not current.isAdmin:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Delete associated .md file
    path = os.path.join(settings.posts_dir, post.path)
    if os.path.exists(path):
        os.remove(path)
    db.delete(post)
    db.commit()
