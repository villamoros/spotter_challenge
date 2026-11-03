#!/usr/bin/env python
"""Command-line entry point for Django administrative tasks.

English: Sets the default settings module and delegates to Django's
management command runner (runserver, migrate, test, check).

Español: Punto de entrada de línea de comandos para las tareas
administrativas de Django. Fija el módulo de configuración y delega en
el ejecutor de comandos (runserver, migrate, test, check).
"""

import os
import sys


def main():
    """Run Django's command-line utility.

    English: Reads the command from sys.argv and executes it with the
    project settings.

    Español: Lee el comando de sys.argv y lo ejecuta con la configuración del proyecto.
    """
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
