"""
Feature 27 – Role-Based Access Control (RBAC) permission classes.

Usage
-----
from core.permissions import IsAdmin, IsSales, IsTechnician, IsAdminOrSales

Combine with DRF's IsAuthenticated (or use `get_permissions` per-action):

    permission_classes = [IsAuthenticated, IsAdmin]
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ═══════════════════════════════════════════════════════════════
# Single-role checks
# ═══════════════════════════════════════════════════════════════

class IsAdmin(BasePermission):
    """Allow only users whose role is ADMIN."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsSales(BasePermission):
    """Allow only users whose role is SALES."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'SALES'
        )


class IsTechnician(BasePermission):
    """Allow only users whose role is TECHNICIAN."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'TECHNICIAN'
        )


# ═══════════════════════════════════════════════════════════════
# Composite helpers  (use with  |  operator  →  IsAdmin | IsSales)
# These also work as standalone classes so older Django REST
# versions (< 3.14) that lack the  |  operator can use them.
# ═══════════════════════════════════════════════════════════════

class IsAdminOrSales(BasePermission):
    """Allow ADMIN or SALES roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'SALES')
        )


class IsAdminOrSalesOrTechnician(BasePermission):
    """Allow ADMIN, SALES, or TECHNICIAN roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ADMIN', 'SALES', 'TECHNICIAN')
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Full access for ADMIN users.
    Read-only (GET, HEAD, OPTIONS) for everyone else who is authenticated.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'ADMIN'
