from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..security import hash_password, verify_password, create_access_token, get_current_student
from ..config import get_settings
import os, shutil, uuid

# NOTE: Passwords received from the client are pre-hashed with SHA-256.
# We bcrypt the SHA-256 hash for storage: bcrypt(sha256(plaintext)).
# This ensures the plaintext password never reaches the server.

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=schemas.StudentOut, status_code=201)
def register(data: schemas.StudentCreate, db: Session = Depends(get_db)):
    if db.query(models.Student).filter(models.Student.userName == data.userName).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    student = models.Student(
        name=data.name,
        userName=data.userName,
        password=hash_password(data.password),
        isShowName=data.isShowName,
        timezone=data.timezone,
        linkedin=data.linkedin or None,
        email=data.email or None,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.StudentLogin, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.userName == data.userName).first()
    if not student or not verify_password(data.password, student.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
        )
    token = create_access_token({"sub": student.userName})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.StudentOut)
def me(current: models.Student = Depends(get_current_student)):
    return current


@router.put("/me", response_model=schemas.StudentOut)
def update_me(
    data: schemas.StudentUpdate,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if data.name is not None:
        current.name = data.name
    if data.isShowName is not None:
        current.isShowName = data.isShowName
    if data.timezone is not None:
        current.timezone = data.timezone
    if data.linkedin is not None:
        current.linkedin = data.linkedin or None
    if data.email is not None:
        current.email = data.email or None
    if data.push_token is not None:
        current.push_token = data.push_token or None
    db.commit()
    db.refresh(current)
    return current


@router.put("/me/password", status_code=204)
def change_password(
    data: schemas.PasswordChangeRequest,
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current.password = hash_password(data.new_password)
    db.commit()
    return Response(status_code=204)


@router.post("/me/avatar", response_model=schemas.StudentOut)
def upload_avatar(
    file: UploadFile = File(...),
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format")
    avatar_dir = os.path.join(settings.posts_dir, "..", "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(avatar_dir, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    current.pfp = f"/avatars/{filename}"
    db.commit()
    db.refresh(current)
    return current


@router.get("/users/{username}", response_model=schemas.PublicProfileOut)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.userName == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    return schemas.PublicProfileOut(
        userName=student.userName,
        name=student.name if student.isShowName else None,
        pfp=student.pfp,
        linkedin=student.linkedin,
        email=student.email,
    )


@router.delete("/me", status_code=204)
def delete_account(
    current: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    student_id = current.id

    # Get all post IDs authored by this student
    post_ids = [row.id for row in db.query(models.Post.id).filter(models.Post.author == student_id).all()]

    if post_ids:
        # Delete replies to this student's posts (authored by others)
        child_posts = db.query(models.Post).filter(models.Post.parent.in_(post_ids)).all()
        for cp in child_posts:
            db.query(models.PostLike).filter(models.PostLike.post_id == cp.id).delete()
            md_path = os.path.join(settings.posts_dir, cp.path)
            if os.path.exists(md_path):
                os.remove(md_path)
            db.delete(cp)
        db.flush()

        # Delete likes on the student's own posts
        db.query(models.PostLike).filter(models.PostLike.post_id.in_(post_ids)).delete()

        # Delete student's own posts and their .md files
        for post in db.query(models.Post).filter(models.Post.author == student_id).all():
            md_path = os.path.join(settings.posts_dir, post.path)
            if os.path.exists(md_path):
                os.remove(md_path)
            db.delete(post)
        db.flush()

    # Delete any remaining likes by this student on other posts
    db.query(models.PostLike).filter(models.PostLike.student_id == student_id).delete()

    # Delete canvas state
    db.query(models.CanvasState).filter(models.CanvasState.student_id == student_id).delete()

    # Delete the student record
    db.delete(current)
    db.commit()
