from django.contrib import admin

# Register your models here.
from django.contrib import admin
from models import *

class OrderAdmin(admin.ModelAdmin):
    #...
    list_display = ('id','x','y')

admin.site.register(Order, OrderAdmin)
admin.site.register(Dataset)


