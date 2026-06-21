from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from .models import Lead, Appointment, Customer, Deal, TradeIn
from .utils import get_available_sales_rep
from core.utils import send_html_email
from core.models import Notification, User
import json
import io
import qrcode
from django.core.files.base import ContentFile


# Track status changes for appointments
_appointment_status_cache = {}

# Track assigned_to changes for leads
_lead_assigned_cache = {}


@receiver(pre_save, sender=Appointment)
def cache_appointment_status(sender, instance, **kwargs):
    """
    Cache the old status before save to detect status changes.
    """
    if instance.pk:
        try:
            old_instance = Appointment.objects.get(pk=instance.pk)
            _appointment_status_cache[instance.pk] = old_instance.status
        except Appointment.DoesNotExist:
            _appointment_status_cache[instance.pk] = None
    else:
        _appointment_status_cache[instance.pk] = None


@receiver(post_save, sender=Appointment)
def generate_qr_code_on_confirm(sender, instance, created, **kwargs):
    """
    Generate a QR Code when appointment status changes to CONFIRMED.
    
    QR Code contains JSON data:
    - appointment_id
    - customer_name
    - vehicle_vin
    - vehicle_name
    """
    old_status = _appointment_status_cache.get(instance.pk)
    
    # Only generate QR if status just changed to CONFIRMED
    if instance.status != 'CONFIRMED':
        return
    
    # Skip if status didn't change (already was CONFIRMED)
    if old_status == 'CONFIRMED':
        return
    
    # Skip if QR already exists
    if instance.qr_code:
        return
    
    # Build QR payload
    vehicle = instance.vehicle
    qr_data = {
        'appointment_id': instance.id,
        'customer_name': instance.customer.name,
        'vehicle_vin': vehicle.vin if vehicle else None,
        'vehicle_name': f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else None,
        'date': str(instance.date),
        'time_slot': instance.time_slot,
        'appointment_type': instance.appointment_type,
    }
    
    # Generate QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to bytes buffer
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    # Save to model field (avoid triggering signal again)
    filename = f"qr_appointment_{instance.id}.png"
    instance.qr_code.save(filename, ContentFile(buffer.read()), save=False)
    
    # Update only the qr_code field to avoid recursion
    Appointment.objects.filter(pk=instance.pk).update(qr_code=instance.qr_code)
    
    print(f"✅ QR Code generated for Appointment #{instance.id}")


# ===================================================================
# Notification helpers
# ===================================================================

def _notify_for_lead(lead, title, message, link):
    """
    If the lead is assigned, notify that user.
    Otherwise notify all ADMIN users.
    """
    if lead.assigned_to_id:
        Notification.objects.create(
            user_id=lead.assigned_to_id,
            title=title,
            message=message,
            link=link,
        )
    else:
        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
        Notification.objects.bulk_create([
            Notification(user=admin, title=title, message=message, link=link)
            for admin in admins
        ])


def _notify_admins(title, message, link):
    """Send a notification to every active ADMIN user."""
    admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
    Notification.objects.bulk_create([
        Notification(user=admin, title=title, message=message, link=link)
        for admin in admins
    ])


# ===================================================================
# Lead ➜ pre_save: cache old assigned_to for change detection
# ===================================================================

@receiver(pre_save, sender=Lead)
def cache_lead_assigned_to(sender, instance, **kwargs):
    if instance.pk:
        try:
            _lead_assigned_cache[instance.pk] = Lead.objects.get(pk=instance.pk).assigned_to_id
        except Lead.DoesNotExist:
            _lead_assigned_cache[instance.pk] = None
    else:
        _lead_assigned_cache[instance.pk] = None


# ===================================================================
# Lead ➜ post_save: new-lead notification + assignment notification
# ===================================================================

@receiver(post_save, sender=Lead)
def notify_on_new_lead(sender, instance, created, **kwargs):
    """Bell notification when a new lead is created."""
    if not created:
        return
    customer_name = instance.customer.name if instance.customer else 'Unknown'
    lead_type_display = instance.get_lead_type_display()
    _notify_for_lead(
        lead=instance,
        title='New Lead',
        message=f'{customer_name} submitted a {lead_type_display}.',
        link=f'/admin/leads',
    )


@receiver(post_save, sender=Lead)
def notify_on_lead_assigned(sender, instance, created, **kwargs):
    """Bell notification when a lead is (re)assigned to a sales rep."""
    if created:
        return  # handled by notify_on_new_lead
    old_assigned = _lead_assigned_cache.get(instance.pk)
    new_assigned = instance.assigned_to_id
    if new_assigned and new_assigned != old_assigned:
        customer_name = instance.customer.name if instance.customer else 'Unknown'
        Notification.objects.create(
            user_id=new_assigned,
            title='Lead Assigned',
            message=f'You have been assigned a new lead: {customer_name}.',
            link=f'/admin/leads',
        )


# ===================================================================
# Appointment ➜ post_save: new appointment notification
# ===================================================================

@receiver(post_save, sender=Appointment)
def notify_on_new_appointment(sender, instance, created, **kwargs):
    """Bell notification when a new appointment is booked."""
    if not created:
        return
    customer_name = instance.customer.name if instance.customer else 'Unknown'
    _notify_admins(
        title='New Appointment',
        message=f'New Test Drive booked by {customer_name}.',
        link='/admin/calendar',
    )


# ===================================================================
# TradeIn ➜ post_save: new trade-in notification
# ===================================================================

@receiver(post_save, sender=TradeIn)
def notify_on_new_trade_in(sender, instance, created, **kwargs):
    """Bell notification when a new trade-in appraisal is submitted."""
    if not created:
        return
    _notify_admins(
        title='New Trade-In',
        message=f'New Trade-In Appraisal requested for {instance.make} {instance.model}.',
        link='/admin/trade-ins',
    )


@receiver(post_save, sender=Lead)
def notify_admin_on_new_lead(sender, instance, created, **kwargs):
    """
    Send a branded HTML email to the admin when a new lead is created.

    - VEHICLE_REQUEST leads  → admin_find_my_car.html
    - All other lead types   → admin_new_lead.html (general inquiry)
    """
    if not created:
        return

    admin_email = getattr(settings, 'ADMIN_EMAIL', 'admin@example.com')
    customer = instance.customer

    try:
        if instance.lead_type == Lead.LeadType.VEHICLE_REQUEST:
            desired_make = instance.desired_make or 'Any'
            desired_model = instance.desired_model or 'Any'
            budget = f"${instance.max_budget:,.0f}" if instance.max_budget else 'Not specified'

            send_html_email(
                subject=f"🚗 New Vehicle Request: {desired_make} {desired_model}",
                template_name='emails/admin_find_my_car.html',
                context={
                    'name': customer.name,
                    'email': customer.email,
                    'phone': customer.phone or 'Not provided',
                    'desired_make': desired_make,
                    'desired_model': desired_model,
                    'budget': budget,
                    'notes': instance.notes or '',
                },
                recipient_list=[admin_email],
            )
        else:
            send_html_email(
                subject=f"📩 New Lead: {customer.name} ({instance.get_lead_type_display()})",
                template_name='emails/admin_new_lead.html',
                context={
                    'name': customer.name,
                    'email': customer.email,
                    'phone': customer.phone or 'Not provided',
                    'message': instance.notes or 'No message provided.',
                },
                recipient_list=[admin_email],
            )
    except Exception as e:
        print(f"⚠️ Failed to send admin notification email for Lead #{instance.id}: {e}")

    print(f"✅ Admin notified about new lead #{instance.id} ({instance.get_lead_type_display()})")


@receiver(post_save, sender=Lead)
def auto_assign_lead(sender, instance, created, **kwargs):
    """
    Auto-assign a new Lead to a Sales Rep using load-balancing logic
    when assigned_to is not already set.
    
    Fires on create AND update — so if a lead is later un-assigned it gets
    re-assigned automatically.
    """
    if instance.assigned_to is not None:
        return

    rep = get_available_sales_rep()
    if rep is None:
        print(f"⚠️ No sales reps available to assign Lead #{instance.id} ({instance.customer.name})")
        return

    # Use update() to avoid triggering this signal again (no recursion)
    Lead.objects.filter(pk=instance.pk).update(assigned_to=rep)

    # Keep the in-memory instance consistent
    instance.assigned_to = rep

    print(f"📋 Lead \"{instance.customer.name}\" (#{instance.id}) auto-assigned to {rep.username}")


@receiver(post_save, sender=Appointment)
def create_lead_on_appointment(sender, instance, created, **kwargs):
    """
    Safety net: if an Appointment was created without a linked Lead
    (e.g. via admin panel, management command), auto-create one.
    The primary path is AppointmentViewSet.perform_create.
    """
    if not created:
        return

    # If perform_create already linked a lead, nothing to do
    if instance.lead_id:
        return

    customer = instance.customer
    existing_lead = Lead.objects.filter(
        customer=customer
    ).exclude(status='CLOSED').order_by('-created_at').first()

    if existing_lead:
        lead = existing_lead
    else:
        vehicle = instance.vehicle
        notes = f"Auto-created from {instance.get_appointment_type_display()} appointment"
        if vehicle:
            notes += f" for {vehicle.year} {vehicle.make} {vehicle.model}"

        lead = Lead.objects.create(
            customer=customer,
            source=Lead.Source.WEBSITE,
            lead_type=Lead.LeadType.TEST_DRIVE,
            notes=notes,
            desired_make=vehicle.make if vehicle else '',
            desired_model=vehicle.model if vehicle else '',
        )
        print(f"✅ Auto-created Lead #{lead.id} for Appointment #{instance.id} (Customer: {customer.name})")

    # Link the lead to the appointment
    Appointment.objects.filter(pk=instance.pk).update(lead=lead)

# ---------------------------------------------------------------------------
# Deal → Post-sale feedback email
# ---------------------------------------------------------------------------

_deal_status_cache = {}


@receiver(pre_save, sender=Deal)
def cache_deal_status(sender, instance, **kwargs):
    """Cache the old deal status so we can detect ACCEPTED transitions."""
    if instance.pk:
        try:
            _deal_status_cache[instance.pk] = Deal.objects.get(pk=instance.pk).status
        except Deal.DoesNotExist:
            _deal_status_cache[instance.pk] = None
    else:
        _deal_status_cache[instance.pk] = None


@receiver(post_save, sender=Deal)
def close_deal_automation(sender, instance, created, **kwargs):
    """
    When a Deal transitions to ACCEPTED:
    1. Mark the vehicle as SOLD and record sold_price.
    2. Close the linked lead (status → CLOSED).
    3. Send a post-sale feedback email to the customer.
    """
    old_status = _deal_status_cache.get(instance.pk)

    # Only fire when status just changed to ACCEPTED
    if instance.status != Deal.Status.ACCEPTED:
        return
    if old_status == Deal.Status.ACCEPTED:
        return

    # ── 1. Mark vehicle SOLD & record the final sale price ──
    vehicle = instance.vehicle
    if vehicle and vehicle.status != 'SOLD':
        vehicle.sold_price = instance.agreed_price
        vehicle.status = 'SOLD'
        # .save() triggers Vehicle.save() which auto-sets sold_date
        vehicle.save()
        print(f"✅ Vehicle #{vehicle.id} marked SOLD (${instance.agreed_price:,.2f})")

    # ── 2. Close the lead ──
    lead = instance.lead
    if lead and lead.status != Lead.Status.CLOSED:
        Lead.objects.filter(pk=lead.pk).update(status=Lead.Status.CLOSED)
        print(f"✅ Lead #{lead.id} closed for Deal #{instance.id}")

    # ── 3. Send feedback email ──
    customer = lead.customer
    vehicle_name = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "your new vehicle"
    feedback_url = f"{getattr(settings, 'SITE_URL', 'https://dqmotors.ca')}/feedback/{instance.id}"

    send_html_email(
        subject='Congratulations on Your New Vehicle! – DQ Motors',
        template_name='emails/post_sale_feedback.html',
        context={
            'name': customer.name,
            'vehicle_name': vehicle_name,
            'feedback_url': feedback_url,
        },
        recipient_list=[customer.email],
    )

    print(f"✅ Post-sale feedback email sent to {customer.email} for Deal #{instance.id}")
