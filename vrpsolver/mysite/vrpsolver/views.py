from idlelib.SearchEngine import get
from django.shortcuts import render
from django.core import serializers
from celery.result import AsyncResult
from celery.task.control import revoke
from tasks import *

# Create your views here.

from django.shortcuts import render, HttpResponse
from models import *
import json
from django.views.decorators.csrf import csrf_exempt, csrf_protect

def app(request):
    datasets = Dataset.objects.all()
    context = { 'datasets' : datasets }
    return render(request, 'vrpsolver/app.html', context )

@csrf_exempt
def upload_orders(request):
    if request.method == 'POST':
        file = request.FILES['file']
        dataset_id = int( request.POST.get('dataset_id') )

        if file:
            ds = Dataset.objects.get(pk=dataset_id)
            Order.objects.all().filter(dataset=ds).delete()
            reader = csv.reader(file, delimiter="\t")
            skip_column = False
            for row in reader:
                if len(row) >= 2:
                    if not skip_column:
                        skip_column = True
                    else:
                         order = Order()
                         order.dataset = ds
                         order.x = int(row[1])
                         order.y = int(row[2])
                         order.quantity = int(row[3])
                         order.save()

    response = {'Status': 'OK',
                'Data': serializers.serialize('json',  Order.objects.filter(dataset=ds)) }
    # TODO: Handle application error
    return HttpResponse(json.dumps(response),
                        content_type='application/json')



def start_solver(request):
    dataset_id = int(request.GET.get('dataset_id'))
    ds = Dataset.objects.get(pk=dataset_id)

    orders = Order.objects.filter(dataset=ds)

    #TODO: JSONIFY
    #TODO: Cache
    str_buffer = []
    for order in orders:
        str_buffer.append(str(order.pk) + '\t' +
                          str(order.x) + '\t' +
                          str(order.y) + '\t' +
                          str(order.quantity))

    params = {}
    input_definition = '\n'.join(str_buffer)
    
    params['input_definition'] = input_definition
    params['dataset_id'] = dataset_id
    task = SolverTask.delay(params)
    
    # Store the async task id
    request.session['solver_task_id' + '_' + str(dataset_id)] = task.id

    # Delete all existing solver session associated to this user
    result_list = SolverSession.objects.all()
    if result_list:
        for each in result_list:
            each.delete()

    # Store the async task id into database
    solver_session = SolverSession(task_id=task.id,
                                   time_started=datetime.datetime.now(),
                                   dataset=ds)
    solver_session.save()
    # TODO: Handle application error
    return HttpResponse(json.dumps({'Status': 'OK'}),
                        content_type='application/json')

def get_solver_status(request):

    dataset_id = int(request.GET.get('dataset_id'))
    ds = Dataset.objects.get(pk=dataset_id)

    status = {}

    key = 'solver_task_id' + '_' + str(dataset_id)
    # If session does not cotain the async task id
    if not request.session.has_key(key):
        # Check the database
        solver_sessions = SolverSession.objects.filter(dataset=ds)
        if solver_sessions:
            solverSession = solver_sessions[0]
            # Store the async task id into the session
            task_id = solverSession.task_id
            request.session[key] = task_id
        else:
            # Read the status result from last run
            status = get_status_from_db(ds)
    else:
        try:
            task_id = request.session[key]
            status = get_task_solver_status(task_id)
            # In case the status is success, it won't contain the progress data anymore, so
            # fetch it from the database..
            if status['status'] == 'SUCCESS' or \
               status['status'] == 'REVOKED':
                # Read the status result from last run
                status = get_status_from_db(ds)
        except:
            status = get_status_from_db(ds)
    # TODO: Handle application error
    return HttpResponse(json.dumps(status), content_type='application/json')

def get_status_from_db(ds):
    result = Result.objects.filter(dataset=ds).order_by('-date_time')[0]
    status = {'status': 'SUCCESS',
              'progress': 100,
              'score': int(result.score),
              'trucks': result.trucks_planned,
              'score_chart_data': result.score_data,
              'solution': result.solution}
    # TODO: Handle application error
    return status

def cancel_solver(request):
    """
    revoke not completed task and return revoking result
    """

    dataset_id = int(request.GET.get('dataset_id'))
    ds = Dataset.objects.get(pk=dataset_id)

    result = ''
    key = 'solver_task_id' + '_' + str(dataset_id)
    if request.session.has_key(key):
        SolverSession.objects.all().delete()
        task_id = request.session[key]
        task = SolverTask.AsyncResult(task_id)
        if not task.ready():
            revoke(task_id, terminate=True)
            result = Result()
            result.dataset = ds
            result.date_time = datetime.datetime.now()
            result.score = task.info['score']
            result.trucks_planned =  task.info['trucks']
            result.solution =  task.info['solution']
            result.score_data =  task.info['score_chart_data']
            result.save()
            result = 'Task %s revoked' % task_id
        else:
            result = 'Can not revoke. Task %s is completed' % task_id
        del request.session['solver_task_id']

    # TODO: Handle application error
    data = {'result': result }
    return HttpResponse(json.dumps(data), content_type='application/json')

def get_orders(request):
    dataset_id = int(request.GET.get('dataset_id'))
    ds = Dataset.objects.get(pk=dataset_id)
    data = serializers.serialize('json',  Order.objects.filter(dataset=ds))

    # TODO: Handle application error
    return HttpResponse(json.dumps(data), content_type='application/json')

def get_result(request):
    dataset_id = request.GET.get('dataset_id')
    ds = Dataset.objects.get(pk=dataset_id)
    data = serializers.serialize('json', Result.objects.filter(dataset=ds).order_by("-id"))

    # TODO: Handle application error
    return HttpResponse(json.dumps(data), content_type='application/json')

def delete_result(request):
    result_id = request.GET.get('result_id')
    Result.objects.get(pk=int(result_id)).delete()
    data = serializers.serialize('json', Result.objects.filter(dataset=ds).order_by("-id"))
    # TODO: Handle application error
    return HttpResponse(json.dumps(data), content_type='application/json')

def rollout_solver_result(request):

    result_id = request.GET.get('result_id')
    result = Result.objects.get(pk=int(result_id))

    dataset_id = request.GET.get('dataset_id')
    ds = Dataset.objects.get(pk=dataset_id)

    json_graph = {
        'totalRoutes': 0,
        'totalDistance': 0,
        'orders': [],
        'routes': []
    }

    orders = Order.objects.filter(dataset=ds)

    orders_map = {}
    for order in orders:
        order_json = { 'id': order.pk,
                       'x': order.x,
                       'y': order.y,
                       'isPlanned': 'false',
                       'routeId':''}

        orders_map[order.pk] = order_json
        json_graph['orders'].append(order_json)

    depot = orders[0]

    trucks_planned = result.trucks_planned
    for i in range(0,trucks_planned):
        route_json = {'name': 'Route_' + str(i),
                      'distance': 0,
                      'actions': [{'seq':0,
                                   'type':'Start',
                                   'orderId': depot.pk,
                                   'distanceToNext': 0},
                                  {'seq':0,
                                   'type':'End',
                                   'orderId': depot.pk,
                                   'distanceToNext': 0}]}
        json_graph['routes'].append(route_json)

    solution_text = result.solution
    lines = solution_text.split('\n')
    line_no = 0
    for line in lines:
        if line:
            columns = line.split(' ')
            json_route = json_graph['routes'][line_no]
            print columns
            del columns[0]
            for column in columns:
                order_id = int(column)
                action = {'seq':0, 'type':'Order', 'orderId': column, 'distanceToNext': 0}
                order_json = orders_map[order_id]
                order_json['isPlanned'] = 'true'
                order_json['routeId'] = json_route['name']
                pos = len(json_route['actions'])
                json_route['actions'].insert(pos-1,action)
            line_no += 1

    Planboard.objects.filter(dataset=ds).delete()

    pb = Planboard()
    pb.dataset = ds
    pb.json_graph = json_graph
    pb.save()

    # TODO: Handle application error
    return HttpResponse(json.dumps({}),
                        content_type='application/json')

def get_planboard_data(request):
    dataset_id = request.GET.get('dataset_id')
    ds = Dataset.objects.get(pk=dataset_id)

    json_graph = {}
    result = Planboard.objects.filter(dataset=ds)
    if result:
        json_graph = result[0].json_graph

    # TODO: Handle application error
    return HttpResponse(json.dumps(json_graph), content_type='application/json')

def update_planboard_data(request):
    data = request.GET.get('json_graph')
    json_graph = json.loads(data)

    result = Planboard.objects.all()
    if result:
        row = result[0]
        row.json_graph = json_graph
        row.save()

    # TODO: Handle application error
    return HttpResponse(json.dumps({}), content_type='application/json')

