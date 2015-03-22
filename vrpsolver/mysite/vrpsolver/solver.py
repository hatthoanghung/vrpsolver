__author__ = 'Kenny'

# TODO: MAJOR REFACTORING... The code is starting to annoy..
# TODO: CREATE SOLVER INTERFACE
# TODO: USE JSON PARAMETER AND RESULT

import math
import copy
import csv
import time
import random
from bisect import bisect

UNPLANNED_NODE_COST = 1000000
OVERCAPACITY_PENALTY = 1000

def load_benchmark(filename):
    nodes = []
    with open(filename, 'r') as f:
        reader = csv.reader(f, delimiter="\t")
        skip_column = False
        for row in reader:
            if not skip_column:
                skip_column = True
            else:
                nodes.append(Node(int(row[0]), int(row[1]), int(row[2]), int(row[3])))
        DIMA.fill(nodes)
        #Wnodes = nodes[0:20]
    return nodes

class DistanceMatrix(object):
    def __init__(self):
        self._data = None

    def fill(self, nodes):
        size = len(nodes) + 1
        self._data = [[0 for x in range(size)] for x in range(size)]
        for a in nodes:
            for b in nodes:
                self._data[a.index][b.index] = math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)

    def get_distance(self, a, b):
        return self._data[a][b]


DIMA = DistanceMatrix()

class Solution(object):
    def __init__(self, id, nodes=[], paths=[]):
        self.id = id
        self.nodes = nodes
        self.paths = paths

    @property
    def score(self):
        return sum([p.score for p in self.paths]) + self.unplanned_nodes_cost

    @property
    def planned_nodes(self):
        return [node for node in self.nodes if node.path]

    @property
    def unplanned_nodes(self):
        return [node for node in self.nodes if not node.path]

    @property
    def total_distance(self):
        return sum(p.distance for p in self.paths)

    @property
    def planned_paths(self):
        return [p for p in self.paths if p.distance > 0]

    @property
    def constraints_score(self):
        return sum([p.constraints_score for p in self.paths])

    @property
    def unplanned_nodes_cost(self):
        return len(self.unplanned_nodes) * UNPLANNED_NODE_COST

    def randomize(self):
        paths = self.paths[:]
        nodes = self.nodes[:]
        while nodes:
            node = nodes.pop(0)
            random_path = random.choice(paths)
            if random_path.capacity <= 0:
                random_path = random.choice(paths)
            random_path.optimal_insert(node)
            #random_path.random_insert(node)

    def clone(self):

        # optimized copy
        copy_nodes = [Node(node.index, node.id,node.x,node.y,node.demand) for node in self.nodes]
        copy_paths = [Path(path.id,path.depot) for path in self.paths]

        copy_nodes_lookup = {}
        for node in copy_nodes:
            copy_nodes_lookup[node.id] = node

        copy_paths_lookup = {}
        for path in copy_paths:
            copy_paths_lookup[path.id] = path

        for path in self.paths:
            copy_path=copy_paths_lookup[path.id]
            for node in path:
                copy_node=copy_nodes_lookup[node.id]
                copy_path.append(copy_node)

        return Solution(self.id, copy_nodes, copy_paths)

    def write_solutions_to_file(self, filename):
        with open(filename, 'w') as f:
            filtered_paths = [ p for p in self.paths if p.distance > 0]
            for p in filtered_paths:
                f.write(" ".join([str(node.id) for node in p.nodes]) + '\n')

    def write_string(self):
        string_list = []
        filtered_paths = [ p for p in self.paths if p.distance > 0]
        for p in filtered_paths:
            string_list.append(" ".join([str(node.id) for node in p.nodes]) + '\n')
        return ''.join(string_list)

    def read_solutions_from_file(self, filename):
        nodes_lookup = {}
        for node in self.nodes:
            nodes_lookup[node.id] = node

        del self.paths[:]
        id = 0
        with open(filename, 'r') as f:
            lines = f.readlines()
            for line in lines:
                columns = line.split(' ')
                nodes = columns[1:]
                path = Path(id, self.depot)
                for node in nodes:
                    path.append(nodes_lookup[int(node)])
                self.paths.append(path)
                id+=1

class Node(object):

    def __init__(self, index, id, x, y, demand):
        self.index = index
        self.id = id
        self.x = x
        self.y = y
        self.demand = demand
        self.path = None

    def unplan(self):
        if self.path:
            if self in self.path:
                self.path.remove(self)
            else:
                self.path = None

    def __repr__(self):
        return 'Node_' + str(self.id)


class Path(list):
    def __init__(self, id, depot):
        self.id = id
        self.depot = depot

    @property
    def nodes(self):
        return [self.depot] + self[:]

    @property
    def score(self):
        return self.distance + self.constraints_score

    @property
    def constraints_score(self):
        return self.capacity_overloaded * OVERCAPACITY_PENALTY

    @property
    def distance(self):
        #print 'DISTANCE'
        value = 0
        if self:
            value = DIMA.get_distance(self.depot.index, self[0].index)
            for i in range(0, len(self) - 1):
                pre, post = self[i], self[i + 1]
                value = value + DIMA.get_distance(pre.index, post.index)
            last = self[-1]
            value = value + DIMA.get_distance(last.index, self.depot.index)
        return value

    @property
    def planned_paths(self):
        return [tour for tour in self.tours if tour.distance > 0]

    @property
    def capacity(self):
        return 200 - self.utilization

    @property
    def capacity_overloaded(self):
        value = 0
        if self.capacity < 0:
            value = -self.capacity
        return value

    @property
    def utilization(self):
        return sum(node.demand for node in self)

    def random_insert(self, node):
        count = len(self)
        position = random.randint(0, count)
        self.insert(position, node)

    def _calculate_delta(self, pre, post, curr):
        return DIMA.get_distance(pre.index,curr.index) + \
               DIMA.get_distance(curr.index, post.index)

    def optimal_insert(self, node):
        if self:
            total_distance = self.distance
            scores = []
            prev_distance = DIMA.get_distance(self.depot.index,self[0].index)
            remaining_distance = total_distance - prev_distance
            delta = self._calculate_delta(self.depot, self[0], node)
            score = delta + remaining_distance
            scores.append(score)
            for i in range(0, len(self)-1):
                pre = self[i]
                post = self[i + 1]
                remaining_distance = total_distance - prev_distance
                curr_distance = DIMA.get_distance(pre.index,post.index)
                delta = self._calculate_delta(pre, post, node)
                score = delta + prev_distance + remaining_distance - curr_distance
                scores.append(score)
                prev_distance = prev_distance + curr_distance

            delta = self._calculate_delta(self[-1], self.depot, node)
            score = delta + prev_distance
            scores.append(score)

            min_scores = min(scores)
            index = scores.index(min_scores)

            self.insert(index, node)

        else:
            self.append(node)


    def insert(self, i, node):
        node.unplan()
        node.path = self
        super(Path, self).insert(i, node)

    def __setitem__(self, i, node):
        node.unplan()
        node.path = self
        super(Path, self).__setitem__(i, node)

    def append(self, node):
        node.path = self
        super(Path, self).append(node)

    def remove(self, node):
        node.path = None
        super(Path, self).remove(node)

    def remove_all(self):
        for node in self:
            node.path = None
        del self[:]

    def __delitem__(self, node):
        node.path = None
        super(Path, self).__delitem__(node)

    def __repr__(self):
        return 'Path_' + str(self.id) + ' [' + ', '.join([str(node) for node in self]) + ']'

