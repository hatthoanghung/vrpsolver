# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('vrpsolver', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='result',
            old_name='score_time',
            new_name='score_data',
        ),
    ]
