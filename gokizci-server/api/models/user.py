"""api/models/user.py"""

from datetime import datetime
from mongoengine import Document, StringField, DateTimeField, IntField, BooleanField, ValidationError
import bcrypt

class User(Document):
    username = StringField(required=True, unique=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(default="user", choices=["admin", "user"])

    # Yeni tekil alanlar — varsayılan ikisi de False
    sms_notification    = BooleanField(default=False)
    email_notification  = BooleanField(default=False)

    # Diğer alanlar...
    created_at = DateTimeField(default=datetime.utcnow)
    last_password_change   = DateTimeField(default=datetime.utcnow)
    last_username_change   = DateTimeField(default=datetime.utcnow)
    last_email_change      = DateTimeField(default=datetime.utcnow)
    profile_completion     = IntField(default=100)

    meta = {
        'collection': 'users',
        'indexes': ['username', 'email']
    }

    def clean(self):
        if self.role not in ["admin", "user"]:
            raise ValidationError("Role must be either 'admin' or 'user'")
        if not (0 <= self.profile_completion <= 100):
            raise ValidationError("profile_completion must be between 0 and 100")

    def save(self, *args, **kwargs):
        existing = User.find_by_id(self.id) if self.pk else None
        now = datetime.utcnow()

        # Şifre hashlenmiş mi kontrol et
        if not self.password.startswith("$2b$"):
            self.password = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            self.last_password_change = now

        # Kullanıcı adı değiştiyse zamanı güncelle
        if existing and self.username != existing.username:
            self.last_username_change = now

        # Email değiştiyse zamanı güncelle
        if existing and self.email != existing.email:
            self.last_email_change = now

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
            "sms_notification": self.sms_notification,
            "email_notification": self.email_notification,
            "last_password_change":   self.last_password_change.isoformat(),
            "last_username_change":   self.last_username_change.isoformat(),
            "last_email_change":      self.last_email_change.isoformat(),
            "profile_completion":     self.profile_completion,
            "created_at":             self.created_at.isoformat()
        }
