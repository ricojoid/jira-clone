import sys
import os

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_super_admin():
    db = SessionLocal()
    try:
        # Check if super_admin user already exists by username or email
        admin = db.query(User).filter((User.username == "admin") | (User.email == "admin@projira.com")).first()
        
        if admin:
            admin.role = "super_admin"
            admin.hashed_password = get_password_hash("admin123")
            admin.is_active = True
            db.commit()
            print(f"Super Admin account updated successfully! ID: {admin.id}, Username: admin, Password: admin123")
        else:
            new_admin = User(
                email="admin@projira.com",
                username="admin",
                full_name="System Super Admin",
                role="super_admin",
                hashed_password=get_password_hash("admin123"),
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"Super Admin account created successfully! ID: {new_admin.id}, Username: admin, Password: admin123")
    except Exception as e:
        print("Error creating super admin:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
