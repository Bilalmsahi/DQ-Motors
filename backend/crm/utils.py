from django.db.models import Count, Q
from core.models import User


def get_available_sales_rep():
    """
    Load-balance new leads across Sales staff.

    Logic:
    1. Query all Users with role='SALES'.
    2. Annotate each with their count of active (NEW or HOT) leads.
    3. Return the one with the lowest count.

    Fallback: If no SALES users exist, return the first ADMIN user, or None.
    """
    sales_reps = (
        User.objects
        .filter(role=User.Role.SALES, is_active=True)
        .annotate(
            active_lead_count=Count(
                'lead_assignments',
                filter=Q(lead_assignments__status__in=['NEW', 'HOT'])
            )
        )
        .order_by('active_lead_count')
    )

    if sales_reps.exists():
        return sales_reps.first()

    # Fallback: return first active admin
    admin = User.objects.filter(role=User.Role.ADMIN, is_active=True).first()
    return admin
