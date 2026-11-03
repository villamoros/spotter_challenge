"""WSGI entry point for production servers.

English: Exposes the WSGI application object that servers such as
gunicorn or waitress load.

Español: Expone el objeto de aplicación WSGI que cargan servidores como
gunicorn o waitress.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
