"""Django settings for the Spotter backend.

English: Reads secrets and switches from environment variables and from
backend/.env. Real providers are used unless SPOTTER_DEMO=1.

Español: Lee secretos y opciones desde variables de entorno y desde
backend/.env. Se usan proveedores reales salvo que SPOTTER_DEMO=1.
"""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Variables locales (clave de ORS, etc.). Lo que ya esté en el entorno tiene prioridad.
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "risk",
]

# Orígenes del frontend autorizados a llamar a la API (Vite en desarrollo por defecto).
CORS_ALLOWED_ORIGINS = [o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o]

MIDDLEWARE = [
    "risk.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# PostgreSQL is the only supported database, locally and in deployment.
# Format: postgresql://USER:PASSWORD@HOST:PORT/NAME (add ?sslmode=require when the host needs TLS).
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    raise ImproperlyConfigured(
        "DATABASE_URL is not set. Example: postgresql://spotter:change-me@localhost:5432/spotter"
    )
DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "spotter-forecasts",
    }
}

# Clave de OpenRouteService. Nunca va en el código: se lee del entorno.
ORS_API_KEY = os.environ.get("ORS_API_KEY", "")
# Datos sintéticos para desarrollo sin claves. Nunca activar en producción.
SPOTTER_DEMO = os.environ.get("SPOTTER_DEMO", "0") == "1"
# Nominatim exige identificar la aplicación en el User-Agent.
NOMINATIM_USER_AGENT = os.environ.get("NOMINATIM_USER_AGENT", "SpotterRiskLab/1.0 (contacto por definir)")

LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_TZ = True
