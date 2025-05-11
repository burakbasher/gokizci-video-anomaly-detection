from datetime import datetime
from mongoengine import Document, StringField, BooleanField, DateTimeField, ValidationError
import bcrypt

class User(Document):
    username = StringField(required=True, unique=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)  # bcrypt hash stored here
    role = StringField(default="user", choices=["admin", "user"])
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'users',
        'indexes': ['username', 'email']
    }

    def clean(self):
        if self.role not in ["admin", "user"]:
            raise ValidationError("Role must be either 'admin' or 'user'")

    def save(self, *args, **kwargs):
        # Şifre hashlenmemişse hashle
        if not self.password.startswith("$2b$"):
            self.password = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        return super(User, self).save(*args, **kwargs)

    def check_password(self, raw_password):
        return bcrypt.checkpw(raw_password.encode('utf-8'), self.password.encode('utf-8'))

    @staticmethod
    def find_by_email(email):
        return User.objects(email=email).first()

    @staticmethod
    def find_by_id(user_id):
        return User.objects(id=user_id).first()

    def to_dict(self):
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
        }
