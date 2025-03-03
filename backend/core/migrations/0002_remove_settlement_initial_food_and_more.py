# Generated by Django 5.1.6 on 2025-02-08 09:56

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='settlement',
            name='initial_food',
        ),
        migrations.RemoveField(
            model_name='settlement',
            name='initial_stone',
        ),
        migrations.RemoveField(
            model_name='settlement',
            name='initial_wood',
        ),
        migrations.AddField(
            model_name='settlement',
            name='food',
            field=models.IntegerField(default=50),
        ),
        migrations.AddField(
            model_name='settlement',
            name='stone',
            field=models.IntegerField(default=50),
        ),
        migrations.AddField(
            model_name='settlement',
            name='wood',
            field=models.IntegerField(default=50),
        ),
        migrations.AlterField(
            model_name='building',
            name='construction_progress',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='loreentry',
            name='event_date',
            field=models.DateField(),
        ),
        migrations.AlterField(
            model_name='resource',
            name='quantity',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='resource',
            name='resource_type',
            field=models.CharField(choices=[('wood', 'Wood'), ('stone', 'Stone'), ('food', 'Food')], max_length=10),
        ),
        migrations.AlterField(
            model_name='settlement',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='settler',
            name='mood',
            field=models.CharField(choices=[('content', 'Content'), ('hungry', 'Hungry')], default='content', max_length=10),
        ),
        migrations.AlterField(
            model_name='settler',
            name='status',
            field=models.CharField(choices=[('idle', 'Idle'), ('working', 'Working')], default='idle', max_length=10),
        ),
    ]
