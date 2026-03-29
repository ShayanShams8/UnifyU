"""Run this inside the app container to create the admin account:
   docker exec unifyu-app-1 python3 /app/create_admin.py
"""
import hashlib
import sys
import os

sys.path.insert(0, "/app")
os.chdir("/app")

from passlib.context import CryptContext
from app.database import SessionLocal
from app import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Client sends SHA-256 of plaintext; server stores bcrypt of that hash
sha256_hash = hashlib.sha256("UnifyUadmin2026".encode()).hexdigest()
bcrypt_hash = pwd_context.hash(sha256_hash)

db = SessionLocal()
try:
    existing = db.query(models.Student).filter(models.Student.userName == "ADMIN").first()
    if existing:
        print("Admin account already exists.")
    else:
        admin = models.Student(
            name="admin",
            userName="ADMIN",
            password=bcrypt_hash,
            isAdmin=True,
            isShowName=False,
            timezone="UTC",
        )
        db.add(admin)
        db.commit()
        print("Admin account created: username=ADMIN, password=UnifyUadmin2026")
finally:
    db.close()
