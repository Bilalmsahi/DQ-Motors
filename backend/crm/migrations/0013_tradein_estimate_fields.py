from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0012_add_credit_check_consent_to_lead'),
    ]

    operations = [
        migrations.AddField(
            model_name='tradein',
            name='estimated_value',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Auto-generated estimate at submission time. Internal reference; not the final offer.',
            ),
        ),
        migrations.AddField(
            model_name='tradein',
            name='estimated_value_low',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Lower bound of the estimate range.',
            ),
        ),
        migrations.AddField(
            model_name='tradein',
            name='estimated_value_high',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Upper bound of the estimate range.',
            ),
        ),
    ]
