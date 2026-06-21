from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0013_tradein_estimate_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='tradein',
            name='valuation_method',
            field=models.CharField(
                blank=True, max_length=32,
                help_text='Source that produced the estimate: "marketcheck" or "heuristic-v1".',
            ),
        ),
    ]
