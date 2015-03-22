
from solver import *
from models import *
from mysite import celery_app;

import os
import cStringIO
import datetime
import signal

def parseNodes(input_definition):
    nodes = []
    sio = cStringIO.StringIO(input_definition)
    reader = csv.reader(sio, delimiter="\t")
    index = 0
    for row in reader:
        nodes.append(Node(index,int(row[0]),int(row[1]), int(row[2]),int(row[3])))
        index += 1
    DIMA.fill(nodes)
    sio.close()
    return nodes

@celery_app.task()
def SolverTask(params):
    dataset_id = params['dataset_id']
    input_definition = params['input_definition']

    # Update the state. The meta data is available in task.info dicttionary
    # The meta data is useful to store relevant information to the task
    # Here we are storing the upload progress in the meta.
    SolverTask.update_state(state='PROGRESS',
                            meta={'progress': 0, 'solution': '', 'score': 0, 'trucks': 0, 'score_chart_data' : ''})

    task_id = SolverTask.request.id

    path_destruction_chance = 0.01
    max_paths_destruction = 10
    initial_paths = 15
    iterations = 100000
    size_of_node_populations = 2
    size_of_path_populations = 9

    nodes = parseNodes(input_definition)
    depot = nodes.pop(0)
    paths = [Path(i, depot) for i in range(0, initial_paths)]

    copy_nodes = copy.deepcopy(nodes)
    copy_paths = copy.deepcopy(paths)

    initial_solution = Solution('Initial', copy_nodes, copy_paths )
    initial_solution.randomize()


    print 'INITIAL SCORE:', initial_solution.score
    print 'INITIAL SOLUTION:', initial_solution.paths

    print "Executing iterations"

    scores = []
    node_populations = []
    path_populations = []
    best_solution = initial_solution

    score_data = ''

    index = 0
    while index < iterations:

        solutions = [best_solution.clone() for x in range(0, 10)]

        del scores[:]
        for solution in solutions:
            nodes = solution.nodes[:]
            paths = solution.paths[:]
            del path_populations[:]

            # Random node destruction
            for x in range(0, size_of_node_populations):
                if not nodes:
                    break
                node = random.choice(nodes)
                nodes.remove(node)
                if not node in node_populations:
                    node_populations.append(node)

            # Random path destruction
            if random.uniform(0.0, 1.0) <= path_destruction_chance:
                nr_paths = random.randrange(0,max_paths_destruction)
                paths_with_nodes = [path for path in solution.planned_paths]
                if paths_with_nodes:
                    for i in range(0, nr_paths):
                        random_path = random.choice(paths_with_nodes)
                        random_path.remove_all()


            # Fill paths
            for x in range(0, size_of_path_populations):
                if not paths:
                    break
                path = random.choice(paths)
                paths.remove(path)
                if not path in path_populations:
                    path_populations.append(path)

            # Plan random nodes on weighted random path using greedy algorithm
            while node_populations:
                node = random.choice(node_populations)
                node_populations.remove(node)
                random_path = random.choice(path_populations)
                random_path.optimal_insert(node)

            scores.append(solution.score)

        best_score = min(scores)
        if best_score < best_solution.score:
            best_index = scores.index(best_score)
            best_solution = solutions[best_index]

        # REPORTING
        if index > 0 and index % 100 == 0:
            score = best_solution.score
            solution = best_solution.write_string()
            prog = (index * 1.0 / iterations * 1.0) *100.0
            print 'SCORE:', score,'PROGRESS', prog
            trucks = len( best_solution.planned_paths )
            str_time = time.strftime("%H:%M:%S", time.gmtime())
            score_data = score_data + str_time + ',' + str(score) + ';'
            SolverTask.update_state(state='PROGRESS',
                                    meta={'progress': prog, 'solution': solution, 'score': score, 'trucks': trucks, 'score_chart_data': score_data })

        index += 1

    print 'SCORE:', best_solution.score
    #print 'PATHS:', best_solution.paths

    solution = best_solution.write_string()
    score = best_solution.score
    trucks = len( best_solution.planned_paths )
    str_time = time.strftime("%H:%M:%S", time.gmtime())
    score_data = score_data + str_time + ',' + str(score) + ';'
    SolverTask.update_state(state='PROGRESS',
                            meta={'progress': 100, 'solution': solution, 'score': score, 'trucks': trucks, 'score_chart_data': score_data })

    result = Result()
    result.date_time = datetime.datetime.now()
    result.dataset_id = dataset_id
    result.score = score
    result.trucks_planned = trucks
    result.solution = solution
    result.score_data = score_data
    result.save()

    SolverSession.objects.filter(task_id=task_id ).delete()

    return solution

def get_task_solver_status(task_id):

    task = SolverTask.AsyncResult(task_id)
    status = task.status
    progress = 0

    if status == 'SUCCESS':
        progress = 100
    elif status == 'FAILURE':
        progress = 0
    elif status == 'PROGRESS':
        progress = task.info['progress']

    if status == 'PROGRESS':
        return {'status': status,
                'progress': progress,
                'score': task.info['score'],
                'trucks': task.info['trucks'],
                'solution': task.info['solution'],
                'score_chart_data': task.info['score_chart_data'] }

    return { 'status' : status }

