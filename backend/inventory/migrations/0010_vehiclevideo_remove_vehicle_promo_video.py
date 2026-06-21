from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0009_add_sold_price_to_vehicle'),
    ]

    operations = [
        migrations.CreateModel(
            name='VehicleVideo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('video', models.FileField(upload_to='vehicle_videos/')),
                ('title', models.CharField(blank=True, default='', max_length=200)),
                ('vehicle', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='videos',
                    to='inventory.vehicle',
                )),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.RemoveField(
            model_name='vehicle',
            name='promo_video',
        ),
    ]
