# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import jsonfield.fields


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, help_text='', auto_created=True)),
                ('name', models.CharField(max_length=50, help_text='')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, help_text='', auto_created=True)),
                ('x', models.IntegerField(default=0, help_text='')),
                ('y', models.IntegerField(default=0, help_text='')),
                ('quantity', models.IntegerField(default=0, help_text='')),
                ('dataset', models.ForeignKey(help_text='', to='vrpsolver.Dataset')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Planboard',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, help_text='', auto_created=True)),
                ('json_graph', jsonfield.fields.JSONField(default=dict, help_text='')),
                ('dataset', models.ForeignKey(help_text='', to='vrpsolver.Dataset')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Result',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, help_text='', auto_created=True)),
                ('date_time', models.DateTimeField(help_text='')),
                ('score', models.DecimalField(help_text='', max_digits=10000000, decimal_places=2)),
                ('trucks_planned', models.IntegerField(default=0, help_text='')),
                ('score_time', models.TextField(blank=True, help_text='')),
                ('solution', models.TextField(blank=True, help_text='')),
                ('dataset', models.ForeignKey(help_text='', to='vrpsolver.Dataset')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='SolverSession',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, help_text='', auto_created=True)),
                ('task_id', models.CharField(max_length=50, help_text='')),
                ('time_started', models.DateTimeField(help_text='')),
                ('dataset', models.ForeignKey(help_text='', to='vrpsolver.Dataset')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
