# Generated by Django 5.1.6 on 2025-02-22 11:42

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_settlement_last_updated'),
    ]

    operations = [
        migrations.CreateModel(
            name='MapTile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('coordinate_x', models.IntegerField()),
                ('coordinate_y', models.IntegerField()),
                ('terrain_type', models.CharField(choices=[('grass', 'Grass'), ('forest', 'Forest'), ('bush', 'Bush'), ('stone_deposit', 'Stone Deposit'), ('mountain', 'Mountain'), ('lake', 'Lake'), ('ley_line', 'Magical Ley Line')], max_length=20)),
                ('settlement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='map_tiles', to='core.settlement')),
            ],
        ),
    ]
