# Generated by Django 5.1.6 on 2025-02-17 16:05

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_building_coordinate_x_building_coordinate_y'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[('building_placed', 'Building Placed'), ('villager_assigned', 'Villager Assigned'), ('villager_hungry', 'Villager Hungry'), ('villager_dead', 'Villager Dead'), ('season_changed', 'Season Changed')], max_length=50)),
                ('description', models.TextField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('settlement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='core.settlement')),
            ],
        ),
    ]
