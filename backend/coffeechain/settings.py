import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "replace-me-in-production")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"

ALLOWED_HOSTS = [host.strip() for host in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_extensions",
    "supply_chain",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "coffeechain.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "coffeechain.wsgi.application"
ASGI_APPLICATION = "coffeechain.asgi.application"


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    import dj_database_url

    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Dar_es_Salaam"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "true").lower() == "true"
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# Farmer OTP — Briq Karibu only (https://docs.briq.tz/)
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "briq").lower()
OTP_CODE_LENGTH = int(os.getenv("OTP_CODE_LENGTH", "6"))
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))

IPFS_GATEWAY_URL = os.getenv("IPFS_GATEWAY_URL", "https://ipfs.io/ipfs/")
STORACHA_UPLOAD_URL = os.getenv("STORACHA_UPLOAD_URL", "http://localhost:3001/upload")
POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL", "")
POLYGON_CONTRACT_ADDRESS = os.getenv("POLYGON_CONTRACT_ADDRESS", "")
POLYGON_PRIVATE_KEY = os.getenv("POLYGON_PRIVATE_KEY", "")

BRIQ_API_KEY = os.getenv("BRIQ_API_KEY", "")
BRIQ_APP_KEY = os.getenv("BRIQ_APP_KEY", "")
BRIQ_BASE_URL = os.getenv("BRIQ_BASE_URL", "https://karibu.briq.tz")
BRIQ_OTP_SENDER_ID = os.getenv("BRIQ_OTP_SENDER_ID", "")
BRIQ_OTP_LANGUAGE = os.getenv("BRIQ_OTP_LANGUAGE", "en")
BRIQ_OTP_MESSAGE_TEMPLATE = os.getenv("BRIQ_OTP_MESSAGE_TEMPLATE", "")
BRIQ_OTP_PRIMARY_METHOD = os.getenv("BRIQ_OTP_PRIMARY_METHOD", "sms")  # sms | call | whatsapp
BRIQ_OTP_RESEND_METHOD = os.getenv("BRIQ_OTP_RESEND_METHOD", "call")  # alternate channel on resend
BRIQ_OTP_LOCAL_FALLBACK = os.getenv("BRIQ_OTP_LOCAL_FALLBACK", "false").lower() == "true"
BRIQ_REQUEST_TIMEOUT = int(os.getenv("BRIQ_REQUEST_TIMEOUT", "45"))

# Retailer POS: discount for buyers verified against the Ministry registry
RETAILER_MINISTRY_DISCOUNT_PERCENT = int(os.getenv("RETAILER_MINISTRY_DISCOUNT_PERCENT", "10"))
