# Generated by Django 5.1.6 on 2025-02-22 19:08

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_alter_building_building_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='settler',
            name='housing_assigned',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='housed_settlers', to='core.building'),
        ),
    ]
