from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db.models import F

from crm.models import Lead, Appointment


@receiver(post_save, sender=Lead)
def link_lead_to_campaign(sender, instance, created, **kwargs):
    """
    When a new Lead is created, check if it can be linked to an active campaign.

    Strategy:
    1. If the lead already has a source_campaign set, skip.
    2. Look for vehicles matching desired_make / desired_model that belong
       to an active campaign. If found, link the lead and bump leads_generated.
    """
    if not created:
        return

    if instance.source_campaign_id:
        return

    # Only try matching for leads that specify a desired vehicle
    if not instance.desired_make:
        return

    from marketing.models import Campaign
    now = timezone.now()

    # Find an active campaign that contains a vehicle matching the lead's request
    campaign = Campaign.objects.filter(
        is_active=True,
        start_date__lte=now,
        end_date__gte=now,
        vehicles__make__iexact=instance.desired_make,
    )
    if instance.desired_model:
        campaign = campaign.filter(vehicles__model__iexact=instance.desired_model)

    campaign = campaign.first()

    if campaign:
        Lead.objects.filter(pk=instance.pk).update(source_campaign=campaign)
        Campaign.objects.filter(pk=campaign.pk).update(
            leads_generated=F('leads_generated') + 1
        )
        print(f"📣 Lead #{instance.id} linked to campaign '{campaign.title}'")


@receiver(post_save, sender=Appointment)
def link_appointment_lead_to_campaign(sender, instance, created, **kwargs):
    """
    When a new Appointment is created for a vehicle that belongs to an
    active campaign, find the customer's latest lead and link it.
    """
    if not created:
        return

    vehicle = instance.vehicle
    if not vehicle:
        return

    from marketing.models import Campaign
    now = timezone.now()

    campaign = Campaign.objects.filter(
        is_active=True,
        start_date__lte=now,
        end_date__gte=now,
        vehicles=vehicle,
    ).first()

    if not campaign:
        return

    # Find the customer's latest unlinked lead
    lead = Lead.objects.filter(
        customer=instance.customer,
        source_campaign__isnull=True,
    ).order_by('-created_at').first()

    if lead:
        Lead.objects.filter(pk=lead.pk).update(source_campaign=campaign)
        Campaign.objects.filter(pk=campaign.pk).update(
            leads_generated=F('leads_generated') + 1
        )
        print(f"📣 Appointment #{instance.id} → Lead #{lead.id} linked to campaign '{campaign.title}'")
