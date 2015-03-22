from django.db import models
from django.db.models.signals import post_init
import jsonfield

# Create your models here.

class Dataset(models.Model):
    """
    """
    name = models.CharField(max_length=50)

class Order(models.Model):
    """
    """
    dataset = models.ForeignKey(Dataset)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    quantity = models.IntegerField(default=0)

    @property
    def name(self):
        return 'Orders' + str(self.id)

    def __str__(self):
        return str(self.id)

class Result(models.Model):
    """
    """
    dataset = models.ForeignKey(Dataset)
    date_time = models.DateTimeField()
    score = models.DecimalField(decimal_places=2, max_digits=10000000)
    trucks_planned = models.IntegerField(default=0)
    score_data = models.TextField(blank=True)
    solution = models.TextField(blank=True)

    def __str__(self):
        return str(self.id)

class SolverSession(models.Model):
    """
    """
    dataset = models.ForeignKey(Dataset)
    task_id = models.CharField(max_length=50)
    time_started = models.DateTimeField()

class Planboard(models.Model):
    """
    """
    dataset = models.ForeignKey(Dataset)
    json_graph = jsonfield.JSONField()