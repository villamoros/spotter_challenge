"""Database model for planned trips.

English: A trip stores its inputs and the latest evaluation as JSON.

Español: Un viaje guarda sus datos de entrada y la última evaluación en JSON.
"""

from datetime import timedelta, timezone

from django.db import models


class Trip(models.Model):
    """A planned trip with its latest evaluation.

    English: The departure is stored in UTC; departure_offset_minutes keeps
    the origin's offset so the wall-clock time can be shown again.

    Español: La salida se guarda en UTC; departure_offset_minutes conserva
    el desfase del origen para poder mostrar otra vez la hora de reloj.
    """

    origin = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    # Django guarda la hora en UTC; el desfase del origen se guarda aparte para devolver la hora de reloj.
    departure = models.DateTimeField()
    departure_offset_minutes = models.IntegerField(default=0)
    load_lb = models.FloatField()
    tolerance_miles = models.FloatField(default=1.0)
    sample_every_miles = models.FloatField(default=10.0)
    recommended_route_id = models.CharField(max_length=32, null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Default ordering: newest trips first.

        English: Ordering is applied to every query.

        Español: El orden se aplica a todas las consultas.
        """
        ordering = ["-created_at"]

    def departure_local(self):
        """Return the departure time in the origin's time zone.

        English: Uses the stored offset, so the value matches what the user entered.

        Español: Usa el desfase guardado, así el valor coincide con lo que escribió el usuario.

        Returns:
            A timezone-aware datetime with a fixed offset.
        """
        return self.departure.astimezone(timezone(timedelta(minutes=self.departure_offset_minutes)))

    def __str__(self) -> str:
        """Return a readable label such as 'Dallas, TX → Denver, CO'.

        English: Used by the Django admin and in logs.

        Español: Lo usa el admin de Django y los registros.
        """
        return f"{self.origin} → {self.destination}"
