# Generated by Django 5.1.6 on 2025-02-23 15:54

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_settler_housing_assigned'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResourceNode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('resource_type', models.CharField(choices=[('food', 'Food'), ('wood', 'Wood'), ('stone', 'Stone'), ('magic', 'Magic')], max_length=10)),
                ('quantity', models.IntegerField(default=100)),
                ('max_quantity', models.IntegerField(default=100)),
                ('regen_rate', models.IntegerField(default=5)),
                ('lore', models.TextField(blank=True)),
                ('map_tile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='resource_nodes', to='core.maptile')),
            ],
        ),
    ]
