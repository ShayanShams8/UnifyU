from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from .database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    userName = Column(String, unique=True, nullable=False, index=True)
    pfp = Column(String, nullable=True)
    isShowName = Column(Boolean, default=False, nullable=False)
    password = Column(String, nullable=False)
    isAdmin = Column(Boolean, default=False, nullable=False)
    timezone = Column(String, default="UTC", nullable=False)
    linkedin = Column(String, nullable=True)
    email = Column(String, nullable=True)
    push_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    posts = relationship("Post", back_populates="student", foreign_keys="Post.author")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author = Column(Integer, ForeignKey("students.id"), nullable=False)
    path = Column(String, nullable=False)
    parent = Column(Integer, ForeignKey("posts.id"), nullable=True)
    likes = Column(Integer, default=0, nullable=False)
    isAnonymous = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="posts", foreign_keys=[author])
    comments = relationship("Post", foreign_keys=[parent], backref=backref("parent_post", remote_side="Post.id"))


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CanvasState(Base):
    __tablename__ = "canvas_states"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)
    nodes_json = Column(Text, default="[]", nullable=False)
    connections_json = Column(Text, default="[]", nullable=False)
    has_saved = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student")
