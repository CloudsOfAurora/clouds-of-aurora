# Generated by Django 5.1.6 on 2025-02-09 15:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_gamestate'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='settlement',
            name='last_updated',
        ),
        migrations.AddField(
            model_name='building',
            name='villagers_generated',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='settlement',
            name='owner',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='settlements', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='building',
            name='building_type',
            field=models.CharField(choices=[('lumber_mill', 'Lumber Mill'), ('quarry', 'Quarry'), ('farmhouse', 'Farmhouse'), ('house', 'House')], max_length=20),
        ),
        migrations.AlterField(
            model_name='settlement',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.DeleteModel(
            name='Resource',
        ),
    ]
