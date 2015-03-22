

from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.app, name='app'),
    url('app', views.app, name='app'),
    url('get_orders', views.get_orders, name='get_orders'),
    url('get_result', views.get_result, name='get_result'),
    url('get_solver_status', views.get_solver_status, name='get_solver_status'),
    url('start_solver', views.start_solver, name='start_solver'),
    url('cancel_solver', views.cancel_solver, name='cancel_solver'),
    url(r'^upload_orders$', views.upload_orders, name='upload_orders'),
    url(r'^delete_result$', views.delete_result, name='delete_result'),
    url(r'^rollout_solver_result$', views.rollout_solver_result, name='rollout_solver_result'),
    url('get_planboard_data', views.get_planboard_data, name='get_planboard_data'),
    url('update_planboard_data', views.update_planboard_data, name='update_planboard_data')
)