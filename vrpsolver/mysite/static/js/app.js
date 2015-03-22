Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

Array.prototype.remove = function (item) {
  index = this.indexOf(item)
  this.splice(index, 1);
};


( function(){
    app = angular.module('app', ['ui.grid', 'ui.grid.selection','angularFileUpload']);

    // Directives ///////////////////////////////////////////////////


    app.run(function($rootScope) {


    });

    // Controllers //////////////////////////////////////////////////

    app.controller('UploadController',
                   ['$scope', 'FileUploader','$rootScope',
                   function($scope, FileUploader,$rootScope) {

        datasetId = document.getElementById("datasetSelection").value;

        var uploader = $scope.uploader = new FileUploader({
            url: 'upload_orders',
            formData:[],
            autoUpload: true
        });

        // FILTERS

        // CALLBACKS

        uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
            console.info('onWhenAddingFileFailed', item, filter, options);
        };

        uploader.onAfterAddingFile = function(fileItem) {
            console.info('onAfterAddingFile', fileItem);
        };
        uploader.onAfterAddingAll = function(addedFileItems) {
            console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            console.info('onBeforeUploadItem', item);
            datasetId = document.getElementById("datasetSelection").value;
            item.formData.push({'dataset_id': datasetId});

        };
        uploader.onProgressItem = function(fileItem, progress) {
            console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            console.info('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            console.info('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            console.info('onCompleteItem', fileItem, response, status, headers);
            console.log(response);
            data = response.Data;
            $rootScope.orderData = JSON.parse(data);
            console.log(data)
        };
        uploader.onCompleteAll = function() {
            console.info('onCompleteAll');
        };

        console.info('uploader', uploader);
    }]);


    /**
     * TODO: COMMENT ME
     */
    app.controller('DatasetController',
                    ['$scope', '$rootScope',
                    function ($scope, $rootScope) {
        $scope.currentValue = '';
        $scope.selectionChanged = function() {
            $scope.currentValue = document.getElementById("datasetSelection").value;
            $rootScope.currentTab = 'one.tpl.html';
            $rootScope.refreshOrders();
        }
    }]);

    /**
     * TODO: COMMENT ME
     */
    app.controller('TabsControl',
                    ['$scope', '$rootScope',
                    function ($scope, $rootScope) {

        this.tabs = [ { title: 'Data',url: 'one.tpl.html' },
                      { title: 'Solver', url: 'three.tpl.html'},
                      { title: 'Solver Result', url: 'four.tpl.html' },
                      { title: 'PlanBoard', url:'five.tpl.html'} ];

        $rootScope.currentTab = 'one.tpl.html';

        this.onClickTab = function (tab) {
            $rootScope.currentTab = tab.url;
        }

        this.isActiveTab = function(tabUrl) {
            return tabUrl == $rootScope.currentTab;
        }
    }]);

    /**
     * TODO: COMMENT ME
     */
    app.controller('OrderListControl',
                    ['$http','$scope', '$rootScope',
                    function ($http,$scope, $rootScope) {
        $rootScope.orderData = [];

        $rootScope.refreshOrders = function() {
            var callback_obj = $rootScope
            datasetId = document.getElementById("datasetSelection").value
            $http.get('get_orders?dataset_id=' + datasetId).success(function(data) {
                    rows = JSON.parse(data)
                    callback_obj.orderData = rows
             });
         };

        $scope.gridOptions = {
            enableRowSelection: true,
            enableRowHeaderSelection: false,
            data: 'orderData',
            columnDefs: [
                  { name: 'Id', field: 'pk' },
                  { name: 'X', field: 'fields.x' },
                  { name: 'Y', field: 'fields.y' },
                  { name: 'Quantity', field: 'fields.quantity' }
            ],
        };

        $rootScope.refreshOrders();
    }]);

    /**
     * TODO: COMMENT ME
     */
    app.controller('SolverControl',
                    ['$scope','$interval','$http','$rootScope',
                    function($scope,$interval,$http,$rootScope) {
        // store the interval future in this variable
        var future;

        $scope.pending = false;
        $scope.failure = false;
        $scope.solver_running = false;
        $scope.progress = 0;
        $scope.gauge1 = initGauge("mygauge1","preview-textfield1",1500,1500);
        $scope.gauge2 = initGauge("mygauge2","preview-textfield2",20,20);
        drawNodesOnMap($rootScope.orderData, 'map');

        // starts the interval
        $scope.start = function() {
          // stops any running interval to avoid two intervals running at the same time
          $scope.stop();
          // store the interval promise
          future = $interval(refresh, 2000);
        };

        // stops the interval
        $scope.stop = function() {
          $interval.cancel(future);
        };

         // stops the interval when the scope is destroyed,
        // this usually happens when a route is changed and
        // the ItemsController $scope gets destroyed. The
        // destruction of the ItemsController scope does not
        // guarantee the stopping of any intervals, you must
        // be responsible of stopping it when the scope is
        // is destroyed.
        $scope.$on('$destroy', function() {
          $scope.stop();
        });

        $scope.startClicked = function() {
            $scope.solver_running = true;
            $scope.start();
            datasetId = document.getElementById("datasetSelection").value
            $http.get('start_solver?dataset_id=' + datasetId).success(function(data) {});
        };

        $scope.stopClicked = function() {
            datasetId = document.getElementById("datasetSelection").value
            $http.get('cancel_solver?dataset_id=' + datasetId).success(function(data) {
                $scope.solver_running = false;
                $scope.stop();
            });
        };

        /**
         * TODO: COMMENT ME
         */
        function refresh() {
              nodes =  $rootScope.orderData;

              nodes_lookup = new Object();
              nodes.forEach(function(node) {
                nodes_lookup[node.pk] = node
              });

              datasetId = document.getElementById("datasetSelection").value
              $http.get('get_solver_status?dataset_id=' + datasetId).success(function(data) {

                if (data['status'] == 'PENDING') {
                    // TODO: Display?
                    $scope.pending = true;
                    $scope.solver_running = false;
                    $scope.stop();
                    return;
                }
                else if (( data['status'] == 'FAILURE')) {
                    // TODO: Display?
                    $scope.failure = true;
                    $scope.solver_running = false;
                    $scope.stop();
                    return;
                }

                updateScoreChart(data['score_chart_data']);

                solution_text = data['solution']
                $scope.progress = data['progress']

                value= data['score']
                $scope.gauge1.set(parseInt(value)); // set actual value

                value = data['trucks']
                $scope.gauge2.set(parseInt(value));

                var canvas = document.getElementById("map"); // your canvas element
                context = canvas.getContext("2d");

                width = canvas.width
                height = canvas.height

                nodes = $rootScope.orderData
                min_x = d3.min(nodes, function(d) { return d.fields.x; });
                max_x = d3.max(nodes, function(d) { return d.fields.x; });
                min_y = d3.min(nodes, function(d) { return d.fields.y; });
                max_y = d3.max(nodes, function(d) { return d.fields.y; });

                relative_width = max_x - min_x
                relative_height = max_y - min_y

                ratio_x = Math.round(width / relative_width)
                ratio_y = Math.round(height / relative_height)

                context.clearRect(0, 0, canvas.width, canvas.height)

                drawNodesOnMap(nodes, 'map');

                context.lineWidth = 2;

                var lines = solution_text.split("\n");
                $.each(lines,function(index,line) {
                    colour = getFixedColor(index);
                    var prev
                     $.each(line.split(' '), function(index,node) {
                        if ( !prev ){
                            prev= nodes_lookup[nodes[0].pk];
                        }
                        else {
                            node_id = parseInt(node)
                            curr = nodes_lookup[node_id]
                            context.beginPath();
                            x1 = ((prev.fields.x * ratio_x) - ratio_x)
                            y1 = ((prev.fields.y * ratio_y) - ratio_y)
                            x2 = ((curr.fields.x * ratio_x) - ratio_x)
                            y2 = ((curr.fields.y * ratio_y) - ratio_y)
                            canvas_arrow(context,x1,y1,x2,y2)
                            context.strokeStyle = colour;
                            context.stroke();
                            prev=curr
                        }
                    });

                    // Draw return path
                    if (prev)
                    {
                        curr = nodes[0]
                        context.beginPath();
                        x1 = ((prev.fields.x * ratio_x) - ratio_x)
                        y1 = ((prev.fields.y * ratio_y) - ratio_y)
                        x2 = ((curr.fields.x * ratio_x) - ratio_x)
                        y2 = ((curr.fields.y * ratio_y) - ratio_y)
                        canvas_arrow(context,x1,y1,x2,y2)
                        context.strokeStyle = colour;
                        context.stroke();
                    }
                });

                if (data["status"] == "SUCCESS") {
                    $scope.solver_running = false;
                    $scope.stop();
                }
                else
                {
                    if (!$scope.solver_running) {
                        $scope.solver_running = true;
                        $scope.start();
                    }
                }
             })
             .error(function(data, status, headers, config) {
                $scope.solver_running = false;
                $scope.stop();
             });
        };

        refresh();

    }]);

    /**
     * TODO: COMMENT ME
     */
    app.controller('ResultListControl',
                   ['$scope','$http','$rootScope',
                    function ($scope,$http,$rootScope) {

        $scope.resultData = [];
        $scope.selection = null;

        $scope.deleteClicked = function() {
          $http.get('delete_result?result_id=' + $scope.selection.pk).success(function(data) {
                rows = JSON.parse(data);
                if (rows) {
                    rows.forEach( function(each) {
                        time = each.fields.date_time;
                        each.fields.date_time = moment(time).subtract('11','hours').fromNow();
                    })
                    callback_obj.resultData = rows;
                }
        })};

        var callback_obj = $scope
        datasetId = document.getElementById("datasetSelection").value
        $http.get('get_result?dataset_id=' + datasetId).success(function(data) {
                rows = JSON.parse(data);
                if (rows) {
                    rows.forEach( function(each) {
                        time = each.fields.date_time;
                        each.fields.date_time = moment(time).subtract('11','hours').fromNow();
                    })
                    callback_obj.resultData = rows;
                }
         });

        $scope.gridOptions = {
            enableRowSelection: true,
            enableRowHeaderSelection: false,
            multiSelect: false,
            noUnselect: true,
            data: 'resultData',

            columnDefs: [
                  { name: 'Id', field: 'pk' },
                  { name: 'DateTime', field: 'fields.date_time' },
                  { name: 'Score', field: 'fields.score' },
                  { name: 'TrucksPlanned', field: 'fields.trucks_planned' }
            ],
        };

         $scope.gridOptions.onRegisterApi = function(gridApi){
          //set gridApi on scope
          $scope.gridApi = gridApi;
          gridApi.selection.on.rowSelectionChanged($scope,function(row){
            var msg = 'row selected ' + row.isSelected;
            $scope.selection = row.entity;
          });
        };

        $scope.rollOut = function() {
            datasetId = document.getElementById("datasetSelection").value
            $http.get('rollout_solver_result?result_id=' + $scope.selection.pk + '&dataset_id=' + datasetId).success(function(data) {
                $rootScope.currentTab = 'five.tpl.html'
            });
        };

    }]);


    /**
     * TODO: COMMENT ME
     */
    app.controller('PlanBoardControl',
                    ['$scope','$interval','$http','$rootScope',
                    function($scope,$interval,$http,$rootScope) {

        $rootScope.data = {'totalRoutes': 0,'totalDistance': 0,'orders':[],'routes': [] };

        $scope.orderHashTable = new Object();
        $rootScope.data.orders.forEach(function(order) {
            $scope.orderHashTable[order.id] = order
        });

        $scope.orders_selection = []

        //$scope.orderData = $rootScope.orderData
        $scope.orderGridOptions = {
            enableRowSelection: true,
            multiSelect: true,
            enableRowHeaderSelection: false,
            data: 'data.orders',
            columnDefs: [
                  { name: 'id', field: 'id' },
                  { name: 'x', field: 'x' },
                  { name: 'y', field: 'y' },
                  { name: 'isPlanned', field: 'isPlanned'},
                  { name: 'routeId', field: 'routeId'},
            ],
        };

        $scope.orderGridOptions.onRegisterApi = function(gridApi) {
          $scope.orderGridApi = gridApi;
          gridApi.selection.on.rowSelectionChanged($scope,function(row){
            $scope.orders_selection.length = 0;
            rows = gridApi.selection.getSelectedRows();
            rows.forEach(function(each) {
                $scope.orders_selection.push(each);
            });
            $scope.updateMap();
          });

          gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
            $scope.orders_selection.length = 0;
            rows = gridApi.selection.getSelectedRows();
            rows.forEach(function(each) {
                $scope.orders_selection.push(each);
            });
            $scope.updateMap();
          });
        };

        $scope.route_selection = null
        $scope.actions = []
        $scope.action_selection = null

        $scope.routeGridOptions = {
            enableRowSelection: true,
            multiSelect: false,
            enableRowHeaderSelection: false,
            data: 'data.routes',
            columnDefs: [
                  { name: 'Name', field: 'name' },
                  { name: 'Distance', field: 'distance' }
            ],
        };


        $scope.actionGridOptions = {
            enableRowSelection: true,
            multiSelect: false,
            enableRowHeaderSelection: false,
            data: 'actions',
            columnDefs: [
                  { name: 'seq', field: 'seq' },
                  { name: 'type', field: 'type' },
                  { name: 'orderId', field: 'orderId' },
                  { name: 'distanceToNext', field: 'distanceToNext'}
             ]
        };


        $scope.gauge1 = initGauge("planBoardScoreGauge","preview_score",3000,0);
        maxOrdersSize = $rootScope.orderData.length;
        console.log(maxOrdersSize)
        $scope.gauge2 = initGauge("planBoardOrderGauge","preview_orders_planned",maxOrdersSize,0);

        $scope.calcData = function() {
            total_distance = 0;
            total_routes = 0;

            $rootScope.data.routes.forEach(function(route) {
                distance = 0.0
                prevAction = null
                route_distance = 0;
                seq = 0

                route.actions.forEach(function(action) {
                    action.seq = seq
                    // Update seq
                    seq = seq + 1
                    // Update distance
                    if ( prevAction ) {
                        try {
                            // Todo: CONVERT ORDER HASH TABLE INTO VECTOR
                            x1 = $scope.orderHashTable[prevAction.orderId].x;
                            y1 = $scope.orderHashTable[prevAction.orderId].y ;
                            x2 = $scope.orderHashTable[action.orderId].x;
                            y2 = $scope.orderHashTable[action.orderId].y;
                            distance = Math.round( Math.sqrt(Math.pow(x2 - x1,2) + Math.pow(y2 - y1,2)) );
                            route_distance = route_distance + distance;
                            prevAction.distanceToNext = distance;
                        }
                        catch(err) {
                        }
                    }
                    prevAction = action;
                });
                route.distance = route_distance;
                total_distance = total_distance + route_distance;
                total_routes += 1;

            });

            $rootScope.data.totalDistance = total_distance;

            $scope.gauge1.set(total_distance);
            numOrdersPlanned = d3.sum($rootScope.data.orders, function(o) { return o.isPlanned ? 1 : 0 });
            $scope.gauge2.set(numOrdersPlanned);
            $scope.updateMap();
        };

        $scope.save_graph = function() {
            $http.get('update_planboard_data?json_graph=' + JSON.stringify($scope.data) ).success(function(data) {
                console.log("JSON GRAPH EXPORTED")
            });
        }

        $scope.moveActionUp = function() {
            if ( $scope.action_selection ) {
                action = $scope.action_selection;
                route = $scope.route_selection;
                index = route.actions.indexOf(action);
                $scope.route_selection.actions.splice(index,1)
                $scope.route_selection.actions.insert(index-1, action)
                $scope.calcData();
                $scope.save_graph();
            }
        };

        $scope.moveActionDown = function() {
            if ( $scope.action_selection ) {
                action = $scope.action_selection;
                route = $scope.route_selection;
                index = route.actions.indexOf(action);
                $scope.route_selection.actions.splice(index,1)
                $scope.route_selection.actions.insert(index+1, action)
                $scope.calcData();
                $scope.save_graph();
            }
        };

        $scope.removeAction = function() {
            if ( $scope.action_selection ) {
                action = $scope.action_selection;
                route = $scope.route_selection;
                index = route.actions.indexOf(action);
                $scope.route_selection.actions.splice(index,1)
                orderNode = $scope.orderHashTable[action.orderId]
                orderNode.isPlanned = false
                orderNode.routeId = '';
                $scope.action_selection = null;

                $scope.calcData();
                $scope.save_graph();
            }
        };

        $scope.planOrderNodeOnSelectedRoute = function() {

            if ( $scope.route_selection && $scope.orders_selection ) {
                orders = $scope.orders_selection;
                route = $scope.route_selection;
                orders.forEach(function(each) {
                    if (each.routeId) {
                        $rootScope.data.routes.forEach(function(route) {
                            if (route.name == each.routeId) {
                                route.actions.forEach(function(action) {
                                    if (action.orderId == each.id) {
                                        route.actions.remove(action);
                                        each.routeId = '';
                                        each.isPlanned = false;
                                    }
                                });
                            }
                        });
                    }
                    route.actions.insert(route.actions.length-1,{seq:0, type:'Order', orderId: each.id, distanceToNext: 0})
                    each.isPlanned = true;
                    each.routeId = route.name;
                });
                $scope.orderGridApi.selection.clearSelectedRows();
                $scope.calcData();
                $scope.save_graph();
            }
        };

         // Route selection
        $scope.routeGridOptions.onRegisterApi = function(gridApi) {
          $scope.routeGridApi = gridApi;
          gridApi.selection.on.rowSelectionChanged($scope,function(row){
              $scope.route_selection = null;
              $scope.actions = [];
              rows = gridApi.selection.getSelectedRows();
              rows.forEach(function(each) {
                $scope.route_selection = row.entity;
                $scope.actions = row.entity.actions;
              });
             $scope.updateMap()
          });
        };


       $scope.actionGridOptions.onRegisterApi = function(gridApi) {
          $scope.actionGridApi = gridApi;
          gridApi.selection.on.rowSelectionChanged($scope,function(row){
              $scope.action_selection = null;
              rows = gridApi.selection.getSelectedRows();
              rows.forEach(function(each) {
                $scope.action_selection = row.entity;
              });
             $scope.updateMap()
          });
        };

        $scope.canMoveUpAction = function() {
            if ($scope.action_selection && $scope.route_selection)
                return $scope.action_selection.seq > 1  &&
                       $scope.action_selection.type != 'End' &&
                       $scope.action_selection.type != 'Start'
             return false;0
        }

        $scope.canMoveDownAction = function() {
            if ($scope.action_selection && $scope.route_selection)
                return $scope.action_selection.seq < $scope.route_selection.actions.length-2 &&
                       $scope.action_selection.type != 'End' &&
                       $scope.action_selection.type != 'Start'
             return false;0
        }

       $scope.canRemoveAction = function() {
            if ($scope.action_selection && $scope.route_selection)
                return $scope.action_selection.type != 'End' &&
                       $scope.action_selection.type != 'Start'
             return false;
        }

        $scope.removeRoute = function() {
            if( $scope.route_selection ) {
                route = $scope.route_selection;
                console.log(route)
                route.actions.forEach(function(action) {
                     if (action.type == "Order") {
                        order = $scope.orderHashTable[action.orderId];
                        order.routeId = '';
                        order.isPlanned = false;
                     }
                });
                route.actions.length=0;
                $scope.route_selection = null;
                $rootScope.data.routes.remove(route);
                $scope.actions = [];
                $scope.calcData();
            }
        }

        $scope.canRemoveRoute = function() {
            return $scope.route_selection
        }

        $scope.updateMap = function() {

                var canvas = document.getElementById("map2");
                context = canvas.getContext("2d");
                width = canvas.width
                height = canvas.height

                nodes = $rootScope.orderData
                min_x = d3.min(nodes, function(d) { return d.fields.x; });
                max_x = d3.max(nodes, function(d) { return d.fields.x; });
                min_y = d3.min(nodes, function(d) { return d.fields.y; });
                max_y = d3.max(nodes, function(d) { return d.fields.y; });

                relative_width = max_x - min_x
                relative_height = max_y - min_y

                ratio_x = Math.round(width / relative_width)
                ratio_y = Math.round(height / relative_height)

                context.clearRect(0, 0, canvas.width, canvas.height)

                drawNodesOnMap($rootScope.orderData, 'map2');

                context.lineWidth = 2;

                $rootScope.data.routes.forEach(function(route) {
                    prev = null;
                    route_colour = 'black';
                    if (route == $scope.route_selection) {
                        route_colour = 'blue';
                    }
                    route.actions.forEach(function(action) {
                        action_colour = route_colour;
                        if (prev) {
                           try {
                               // Todo: CONVERT ORDER HASH TABLE INTO VECTOR
                               x1 = $scope.orderHashTable[prev.orderId].x;
                               y1 = $scope.orderHashTable[prev.orderId].y ;
                               x2 = $scope.orderHashTable[action.orderId].x;
                               y2 = $scope.orderHashTable[action.orderId].y;
                               context.beginPath();
                               x1 = ((x1 * ratio_x) - ratio_x)
                               y1 = ((y1 * ratio_y) - ratio_y)
                               x2 = ((x2 * ratio_x) - ratio_x)
                               y2 = ((y2 * ratio_y) - ratio_y)
                               canvas_arrow(context,x1,y1,x2,y2)
                               if (action == $scope.action_selection ) {
                                 action_colour = 'red';
                               }
                               context.strokeStyle = action_colour;
                               context.stroke();
                           } catch(err) {
                           }
                        }
                        prev = action;
                    });
               });

               if ($scope.orders_selection.length > 0) {
                   drawNodesOnMap2($rootScope.data.orders, $scope.orders_selection,'map2');
               }

        };

        //if($scope.routeGridApi.selection.selectRow){
         //   $scope.routeGridApi.selection.selectRow($scope.routeGridOptions.data[0]);
        //}

        $scope.calcData();
        datasetId = document.getElementById("datasetSelection").value
        $http.get('get_planboard_data?dataset_id=' + datasetId).success(function(data) {
                $rootScope.data = data
                $rootScope.data.orders.forEach(function(order) {
                    $scope.orderHashTable[order.id] = order
                });
                $scope.calcData();
        });

    }]);


})()



/**
 * TODO: COMMENT ME
 */
function canvas_arrow(context,
                      fromx,
                      fromy,
                      tox,
                      toy){
    var headlen = 10;   // length of head in pixels
    var angle = Math.atan2(toy-fromy,tox-fromx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
    context.moveTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
}

/**
 * TODO: COMMENT ME
 */
var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

/**
 * TODO: COMMENT ME
 */
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(random() * 15)];
    }
    return color;
}

/**
 * TODO: COMMENT ME
 */
function getFixedColor(index) {
    colors = ['#000000','#FF0000','#00FF00','#0000FF','#00FFFF','#FF00FF','6666CC','#00CC99','#0000CC','#993300'];
    if ( index >= colors.length ) {
        index = colors.length-1;
    }
    return colors[index];
}

/**
 * TODO: COMMENT ME
 */
function drawNodesOnMap( nodes, mapID )
{
    var canvas = document.getElementById(mapID); // your canvas element
    context = canvas.getContext("2d");

    width = canvas.width
    height = canvas.height

    relative_width = 0
    relative_height = 0
    ratio_x = 0
    ratio_y = 0

    min_x = d3.min(nodes, function(d) { return d.fields.x; });
    max_x = d3.max(nodes, function(d) { return d.fields.x; });
    min_y = d3.min(nodes, function(d) { return d.fields.y; });
    max_y = d3.max(nodes, function(d) { return d.fields.y; });

    console.log(min_x,max_x,min_y,max_y)

    relative_width = (max_x - min_x)
    relative_height = (max_y - min_y)

    ratio_x = Math.round(width / relative_width)
    ratio_y = Math.round(height / relative_height)

    console.log(ratio_x, ratio_y)

    var isDepot = false;
    nodes.forEach(function(d) {
        context.beginPath();
        x = (d.fields.x * ratio_x) - ratio_x
        y = (d.fields.y * ratio_y) - ratio_y
        context.arc(x,y,3, 0, 3 * Math.PI, false);
        context.fillStyle = 'green';
        if ( !isDepot ) {
            isDepot = true;
            context.fillStyle = 'red';
        }
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#003300';
        context.stroke();
    });
}

function drawNodesOnMap2( nodes, selectednodes, mapID )
{
    var canvas = document.getElementById(mapID); // your canvas element
    context = canvas.getContext("2d");

    width = canvas.width
    height = canvas.height

    relative_width = 0
    relative_height = 0
    ratio_x = 0
    ratio_y = 0

    min_x = d3.min(nodes, function(d) { return d.x; });
    max_x = d3.max(nodes, function(d) { return d.x; });
    min_y = d3.min(nodes, function(d) { return d.y; });
    max_y = d3.max(nodes, function(d) { return d.y; });

    relative_width = max_x - min_x
    relative_height = max_y - min_y

    ratio_x = Math.round(width / relative_width)
    ratio_y = Math.round(height / relative_height)

    selectednodes.forEach(function(d) {
        context.beginPath();
        x = (d.x * ratio_x) - ratio_x
        y = (d.y * ratio_y) - ratio_y
        context.arc(x,y,6, 0, 6 * Math.PI, false);
        context.fillStyle = 'green';
        if ( d.id == 1 ) {
            context.fillStyle = 'red';
        }
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#003300';
        context.stroke();
    });
}


/**
 * TODO: COMMENT ME
 */
function updateScoreChart( text ) {

   if ( !text ) { return;}

   var parseDate = d3.time.format("%X").parse;

   var data = [];

   var lines = text.split(";");
   $.each(lines,function(index,line) {
      time = 0;
      score = 0;
      if (line) {
          var columns = line.split(',')
          $.each(columns, function(index,column) {
            if (index == 0){
                time = parseDate(column);
            }
            else if ( index == 1) {
                score = parseInt(column);
            }
          })
          data.push( { "time": time , "score" : score } );
      }
   })

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 400 - margin.left - margin.right,
    height = 140 - margin.top - margin.bottom;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var area = d3.svg.area()
        .x(function(d) { return x(d.time); })
        .y0(height)
        .y1(function(d) { return y(d.score) });

    var div = d3.select("#scoreChart")
    div.selectAll("*").remove();

    var svg = div.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data, function(d) { return d.time; }));
    y.domain([d3.min(data, function(d) { return d.score; })-50,
              d3.max(data, function(d) { return d.score; })]);

    svg.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Score");
}

/**
 * TODO: COMMENT ME
 */
function initGauge(gaugeName,gaugeText,maxvalue,initialvalue)
{
    var opts = {
      lines: 12, // The number of lines to draw
      angle: 0.15, // The length of each line
      lineWidth: 0.44, // The line thickness
      fontSize: 32.0,
      pointer: {
        length: 0.9, // The radius of the inner circle
        strokeWidth: 0.035, // The rotation offset
        color: '#000000' // Fill color
      },
      limitMax: 'false',   // If true, the pointer will not go past the end of the gauge
      colorStart: '#6FADCF',   // Colors
      colorStop: '#8FC0DA',    // just experiment with them
      strokeColor: '#E0E0E0',   // to see which ones work best for you
      generateGradient: true
   };

    var target = document.getElementById(gaugeName); // your canvas element
    var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
    gauge.maxValue = maxvalue; // set max gauge value
    gauge.animationSpeed = 32; // set animation speed (32 is default value)
    gauge.set(initialvalue); // set actual value
    gauge.setTextField(document.getElementById(gaugeText));
    return gauge;
}

