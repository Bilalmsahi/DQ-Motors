"""
Feature 30 – AuditLogMixin
==========================
Drop-in mixin for any ModelViewSet.  Automatically creates AuditLog
entries on create, update (partial or full), and destroy.

Usage
-----
    from core.mixins import AuditLogMixin

    class VehicleViewSet(AuditLogMixin, viewsets.ModelViewSet):
        ...

Place **AuditLogMixin** *before* the base ViewSet class in the MRO so its
perform_* hooks execute first.
"""

from decimal import Decimal
from datetime import date, datetime

from .models import AuditLog


def _get_client_ip(request):
    """Extract the client IP from the request (supports reverse-proxy headers)."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _serialisable(value):
    """Convert a value to something JSON-safe for the changes dict."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_serialisable(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialisable(v) for k, v in value.items()}
    # Fallback – must be JSON-primitive
    try:
        # If it's already a str/int/float/bool → fine
        if isinstance(value, (str, int, float, bool)):
            return value
        return str(value)
    except Exception:
        return str(value)


def _compute_changes(old_data, new_data):
    """
    Compare two dicts and return only the fields that changed.

    Returns:
        dict  –  { 'field': {'old': ..., 'new': ...}, ... }
    """
    changes = {}
    all_keys = set(list(old_data.keys()) + list(new_data.keys()))
    # Skip noisy / internal fields
    skip = {'updated_at', 'created_at', 'id', 'pk', 'slug'}
    for key in all_keys:
        if key in skip:
            continue
        old_val = _serialisable(old_data.get(key))
        new_val = _serialisable(new_data.get(key))
        if old_val != new_val:
            changes[key] = {'old': old_val, 'new': new_val}
    return changes


class AuditLogMixin:
    """
    ViewSet mixin that automatically writes AuditLog entries on
    perform_create, perform_update, and perform_destroy.

    The mixin determines the model name from the serializer's Meta.model.
    """

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    def _audit_model_name(self, instance=None):
        """Return a human-friendly model name (e.g. 'Vehicle')."""
        if instance is not None:
            return instance.__class__.__name__
        if hasattr(self, 'serializer_class') and self.serializer_class:
            meta = getattr(self.serializer_class, 'Meta', None)
            if meta and hasattr(meta, 'model'):
                return meta.model.__name__
        return 'Unknown'

    def _audit_object_repr(self, instance):
        """Return a short string representation of the instance."""
        return str(instance)[:500]

    def _snapshot(self, instance):
        """
        Return a plain-dict snapshot of an instance using the serializer.
        Falls back to __dict__ when the serializer isn't available.
        """
        try:
            serializer_class = self.get_serializer_class()
            return serializer_class(instance).data
        except Exception:
            data = {}
            for field in instance._meta.get_fields():
                if hasattr(field, 'attname'):
                    data[field.attname] = getattr(instance, field.attname, None)
            return {k: _serialisable(v) for k, v in data.items()}

    # ------------------------------------------------------------------
    # logging helpers (can be called from custom perform_create overrides)
    # ------------------------------------------------------------------

    def _log_create(self, serializer):
        """Log a CREATE action.  Call from a custom perform_create."""
        instance = serializer.instance
        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action=AuditLog.Action.CREATE,
            target_model=self._audit_model_name(instance),
            target_object_id=str(instance.pk),
            target_repr=self._audit_object_repr(instance),
            changes={'created': _serialisable(serializer.data)},
            ip_address=_get_client_ip(self.request),
        )

    # ------------------------------------------------------------------
    # hooks
    # ------------------------------------------------------------------

    def perform_create(self, serializer):
        """Save + log CREATE."""
        super().perform_create(serializer)
        self._log_create(serializer)

    def perform_update(self, serializer):
        """Snapshot before → save → diff → log UPDATE."""
        instance = serializer.instance
        old_data = self._snapshot(instance)

        super().perform_update(serializer)

        instance.refresh_from_db()
        new_data = self._snapshot(instance)
        changes = _compute_changes(old_data, new_data)

        # Only log when something actually changed
        if changes:
            AuditLog.objects.create(
                user=self.request.user if self.request.user.is_authenticated else None,
                action=AuditLog.Action.UPDATE,
                target_model=self._audit_model_name(instance),
                target_object_id=str(instance.pk),
                target_repr=self._audit_object_repr(instance),
                changes=changes,
                ip_address=_get_client_ip(self.request),
            )

    def perform_destroy(self, instance):
        """Snapshot before delete → delete → log DELETE."""
        obj_id = str(instance.pk)
        obj_repr = self._audit_object_repr(instance)
        model_name = self._audit_model_name(instance)
        deleted_data = self._snapshot(instance)

        super().perform_destroy(instance)

        AuditLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action=AuditLog.Action.DELETE,
            target_model=model_name,
            target_object_id=obj_id,
            target_repr=obj_repr,
            changes={'deleted': _serialisable(deleted_data)},
            ip_address=_get_client_ip(self.request),
        )
