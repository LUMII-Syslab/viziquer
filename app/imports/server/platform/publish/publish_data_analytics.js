import { Meteor } from 'meteor/meteor';
import { Views, ViewFilter, ViewUser, FileUploads, DataMetaData, DataLinks, DataNodes} from '/imports/db/platform/collections'
import { is_project_member } from '/imports/libs/platform/user_rights'

Meteor.publish("Views", function(list) {

	if (!list || list["noQuery"]) {
		return this.stop();
	}

	//gets user's id
	var user_id = this.userId;
	if (is_project_member(user_id, list)) {
		return [Views.find({projectId: list.projectId, versionId: list.versionId}, {sort: {createdAt: -1}}),
				FileUploads.find({projectId: list.projectId}, {sort: {createdAt: -1}}),
				DataMetaData.find({projectId: list.projectId, versionId: list.versionId}),				
			];
	}
	else {
		return this.stop();
	}
});


Meteor.publish("View", function(list) {

	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		return [

			Views.find({_id: list.viewId, projectId: list.projectId, versionId: list.versionId}),
			//ViewFilter.find({viewId: list.viewId, userId: user_id, projectId: list.projectId, versionId: list.versionId},
			//				{fields: {history: 0, action: 0, actionType: 0}}),

			ViewFilter.find({viewId: list.viewId, projectId: list.projectId, versionId: list.versionId},
							{fields: {history: 0, action: 0, actionType: 0}}),

			//ViewUser.find({viewId: list.viewId, userId: user_id}),
			ViewUser.find({viewId: list.viewId}),
			DataMetaData.find({projectId: list.projectId, versionId: list.versionId}),
		];
	}

});

Meteor.publish("ViewData", function(list) {

	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		var self = this;
		var initializing = true;

		var view_filter = ViewFilter.findOne({viewId: list.viewId, projectId: list.projectId, versionId: list.versionId});

//	    var handle = ViewFilter.find({userId: user_id, viewId: list.viewId, projectId: list.projectId, versionId: list.versionId}).observeChanges({
	    var handle = ViewFilter.find({viewId: list.viewId, projectId: list.projectId, versionId: list.versionId}).observeChanges({

	    	added: function(id, fields) {
	    		var data = collect_data(id, fields, list, view_filter);

	    		self.added("TimeChartData", list.viewId, data.timeChartData);
	    		self.added("NetChartData", list.viewId, data.netChartData);
	    		self.added("PieChartData", list.viewId, data.pieChartData);
	    		self.added("DataTableData", list.viewId, data.transactionsTable);
			},

	    	changed: function(id, fields) {

	    		var change = true;
	    		var data = collect_data(id, fields, list, view_filter, change);

	    		if (data.timeChartData) {
	    			self.changed("TimeChartData", list.viewId, data.timeChartData);
	    		}

	    		if (data.netChartData) {
	    			self.changed("NetChartData", list.viewId, data.netChartData);
	    		}

	    		if (data.pieChartData) {
	    			self.changed("PieChartData", list.viewId, data.pieChartData);
	    		}

	    		if (data.transactionsTable) {
	    			self.changed("DataTableData", list.viewId, data.transactionsTable);
	    		} 

			},
		});

		self.ready();

		self.onStop(function () {
			handle.stop();
		});
	}

});

function collect_data(id, fields, list, view_filter, change) {

	var filter_type;
	if (fields.action && fields.action.filterType) {
		filter_type = fields.action.filterType;
	}

	if (filter_type === "styleFilter") {
		return;
	}

	//selecting links
	var node_ids = [];

	var actual_key_index = view_filter.actualDimensionIndex;

	var edges = [];
	if (build_search_query(fields)) {

    	var start_time1 = new Date();

    	var edge_query = build_edge_query(fields, list);


		edges = DataLinks.find(edge_query).map(function(data_elem) {

			var data_obj = {_id: data_elem._id,
							to: data_elem.to,
							from: data_elem.from,
							startDate: data_elem.startDate,
							endDate: data_elem.endDate,
							data: {},
						};

			_.each(data_elem.data, function(data) {
				data_obj.data[data.key] = data.value;
			});

			node_ids.push(data_elem.to);
			node_ids.push(data_elem.from);

			return data_obj;
		});
	}

	var end_time1 = new Date();
	console.log("Select Netchart data: ", end_time1 - start_time1, "(ms)"); 

	//data filter by time
	var time_filter = build_time_chart_query(fields);
	var time_query = {projectId: list.projectId, versionId: list.versionId};

	_.extend(time_query, time_filter);

	var data_links = DataLinks.find(time_query);

	var start_time2 = new Date();

	//selecting nodes
	var box_query = build_box_query(fields, node_ids, list);

	var nodes = DataNodes.find(box_query).map(function(data_elem) {

		var data_obj = {_id: data_elem._id,
						representation: data_elem.representation,
						data: {},
					};

		_.each(data_elem.data, function(data) {
			data_obj.data[data.key] = data.value;
		});

		return data_obj;
	});

	var end_time2 = new Date();
	console.log("Select netchart data2 in1: ", end_time2 - start_time2, "(ms)"); 

	var history = view_filter.history;
	var history_item = history[view_filter.currentFilter];

	//if filter was changed
	if (change) {

		if (fields.action && fields.action.actionType === "new" && filter_type === "searchFilter") {
			return {netChartData: {nodes: nodes, edges: edges}};
		}

		else if (filter_type === "pieChartFilter") {
			var pie_chart_data = collect_pie_chart_data(data_links);

			return {netChartData: {nodes: nodes, edges: edges,},
					pieChartData: pie_chart_data,
				};
		}

		else if (filter_type === "transactionsFilter") {

			var transactions_res = collect_transactions_table(list, fields)
			return {
					transactionsTable: transactions_res,
				};
		}

		else {

			var time_chart_data = collect_time_chart_data(data_links, actual_key_index);

			var pie_chart_data = collect_pie_chart_data(data_links);

			return {netChartData: {nodes: nodes, edges: edges,},

					timeChartData: time_chart_data,
					pieChartData: pie_chart_data,

					transactionsTable: collect_transactions_table(list, fields),
					//objectsTable: collect_objects_table(list),
				};
		}
	}

	//if filter was loaded
	else {

		var time_chart_data = collect_time_chart_data(data_links, actual_key_index);

		var pie_chart_data = collect_pie_chart_data(data_links);
		var table_data = collect_transactions_table(list, fields);

		return {netChartData: {nodes: nodes, edges: edges,},

				timeChartData: time_chart_data,
				pieChartData: pie_chart_data,

				transactionsTable: table_data,

			};
	}
}

function collect_time_chart_data(data_links, actual_key_index) {

    var start_time1 = new Date();

	var count = 1000;

	var countMap = {};
	var timeInterval = [Infinity, -Infinity];

    var start_time12 = new Date();

	var link_ids = [];
	data_links.forEach(function(data_elem) {

		link_ids.push(data_elem.to);
		link_ids.push(data_elem.from);

		var data = data_elem.data[actual_key_index];

        var startS = Math.floor(data_elem.startDate.getTime() / count);
        var endS = Math.floor(data_elem.endDate.getTime() / count);

       	timeInterval = [Math.min(timeInterval[0], startS - 1), Math.max(timeInterval[1], endS + 1)];

        var val = Math.abs(data.value / ((endS - startS) + 1));

        while (startS <= endS) {

            if (!countMap[startS]) {
                countMap[startS] = 0;
            }

            countMap[startS] += val;
            startS++;
        }
	});

	var values = _.pairs(countMap);

	var end_time1 = new Date();
	console.log("Collect TimeChartData: ", end_time1 - start_time1, "(ms)");      

	var data_nodes = DataNodes.find({_id: {$in: link_ids}});


	return {data: {values: values, interval: timeInterval},
			transactionsCount: data_links.count(),
			objectsCount: data_nodes.count()
		};
}

function collect_pie_chart_data(data_links) {
    var start_time1 = new Date();

	// console.log("in collect pie chart data ")

	var keySet = {"sum": 1, "fromCompanyName": 2, "fromAccountCode": 3, "toCompanyName":4, "toAccountCode": 5}
	var valKey = [, , , , , , ];
	var accountIds = {};
	var v;
	data_links.forEach(function(data_elem, i) {
		_.each(data_elem.data, function(d) {
			if (keySet[d.key]) {
				valKey[keySet[d.key]] = d.value;	
			}
		});

		v = Math.abs(valKey[1]);
		if (accountIds[valKey[3]] === undefined) {
        	accountIds[valKey[3]] = 0;
		}
		accountIds[valKey[3]] += v
        
        if (accountIds[valKey[5]] === undefined) {
        	accountIds[valKey[5]] = 0; 
        }

		accountIds[valKey[5]] += v
	});
	// console.log("accountIds ", accountIds)
	
	var pieData = {"subvalues": []};
    pieData.subvalues = _.map(accountIds, function(s, name) {
    	return {"value": s, "name": name};
    });

    pieData.subvalues = _.sortBy(pieData.subvalues, 'value').reverse();
	// console.log("get pie data ", pieData);

	var end_time1 = new Date();
	console.log("Collect PieChartData: ", end_time1 - start_time1, "(ms)");      
	console.log("###############################\n ");      

	return pieData;;
}


function build_box_query(fields, node_ids, list) {

	var search_box = [];
	if (fields.filter && fields.filter.searchFilter) {

		var searchFilter = fields.filter.searchFilter;
		if (searchFilter.value) {

			var val = searchFilter.value;
			search_box = _.map(searchFilter.nodes, function(key) {

				var index = "data.value";

	 			var item = {};
	        	item[index] = val;

				return item;
			});
		}
	}

	var nin_query;

	if (fields.filter && fields.filter.netChartFilter) {
		var net_chart_filter = fields.filter.netChartFilter;
		if (net_chart_filter && net_chart_filter.nodes) {

			var net_chart_nodes = net_chart_filter.nodes;
	    	if (net_chart_nodes.nin.length > 0) {
				nin_query = {_id: {$nin: net_chart_nodes.nin}};
	    	}      

	    	if (net_chart_nodes.in.length > 0) {
	    		node_ids = _.union(node_ids, net_chart_nodes.in); 
	    	} 
		}
	}

	search_box.push({_id: {$in: node_ids}});

	//building the query
	var box_query = {};
	if (nin_query) {
		_.extend(box_query, nin_query);
	}

	if (search_box.length > 0) {
		_.extend(box_query, {$or: search_box});
	}

	box_query = {$and: [{projectId: list.projectId, versionId: list.versionId}, box_query]};

	return box_query;
}

function collect_transactions_table(list, fields) {

	var query = {projectId: list.projectId, versionId: list.versionId};

	if (fields.filter && fields.filter.transactionsFilter && fields.filter.transactionsFilter.transactions && fields.filter.transactionsFilter.transactions.value) {
		query["data.value"] = {$regex: fields.filter.transactionsFilter.transactions.value, $options: 'i'};		
	}
	
	if (fields.filter && fields.filter.timeChartFilter) {
		var time_filter = build_time_chart_query({filter: {timeChartFilter: fields.filter.timeChartFilter}});
		_.extend(query, time_filter);
	}

	var step = 10;
	var links_page = 1;

	if (fields.filter && fields.filter.transactionsFilter && fields.filter.transactionsFilter.transactions && fields.filter.transactionsFilter.transactions.page) {
		links_page = fields.filter.transactionsFilter.transactions.page;
	}
	
	var skip = (links_page - 1) * step;

	//data links
	var data_links = DataLinks.find(query, {limit: step, skip: skip});

	// var link_ids = [];
	// _.each(data_links, function(data_link) {
	// 	link_ids.push(data_link.to);
	// 	link_ids.push(data_link.from);
	// });

	
	// var links_page = fields.filter.transactionsFilter.transactions.page || 1;
	// var res_links = _.last(_.first(data_links, step * links_page), step);

	// //data nodes
	// var box_query = {projectId: list.projectId, versionId: list.versionId, _id: {$in: link_ids}};
	// if (fields.filter && fields.filter.transactionsFilter && fields.filter.transactionsFilter.objects && fields.filter.transactionsFilter.objects.value) {
	// 	box_query["data.value"] = {$regex: fields.filter.transactionsFilter.objects.value, $options: 'i'};		
	// }

	// var objects_page = fields.filter.transactionsFilter.objects.page || 1;
	// var skip = (objects_page - 1) * step;

	// var objects = DataNodes.find(box_query, {limit: step, skip: skip});

	return {transactions: data_links.fetch(), transactionsCount: data_links.count(),
			//objects: objects.fetch(), objectsCount: objects.count(),
		};
}
	
function collect_objects_table(list) {

	var query = {projectId: list.projectId, versionId: list.versionId};
	if (list.phrase) {
		query["data.value"] = {$regex: list.phrase, $options: 'i'};		
	}

	var data = DataNodes.find(query).fetch();

	var limited_data = _.first(data, 10);

	return {data: limited_data, count: data.length};
}

function build_edge_query(fields, list) {

	var pie_chart_query = build_pie_chart_query(fields);
	var time_chart_query = build_time_chart_query(fields);
	var search_link_query = build_search_query(fields);

	var net_chart_query = build_netchart_nin_query(fields);
	var net_chart_in_query = build_netchart_in_query(fields);
  	var net_chart_nin_query = build_netchart_query(fields);
  	
	var edge_intersection_list = [];

	//building intersection
	if (pie_chart_query) {
		edge_intersection_list.push(pie_chart_query);
	}

	if (time_chart_query) {
		edge_intersection_list.push(time_chart_query);
	}

	if (search_link_query) {
		edge_intersection_list.push(search_link_query);
	}

	if (net_chart_nin_query) {
		edge_intersection_list.push(net_chart_nin_query);
	}

	if (net_chart_query) {
		edge_intersection_list.push(net_chart_query);
	}

	var edge_intersection;
	if (edge_intersection_list.length > 0) {
		edge_intersection = {$and: edge_intersection_list};
	}


	//var edge_query = {projectId: list.projectId, versionId: list.versionId, "data.value": {$regex: list.phrase, $options: 'i'}};

	var edge_query = {projectId: list.projectId, versionId: list.versionId};

	var edge_union_list = [];
	if (net_chart_in_query) {
		edge_union_list.push(net_chart_in_query);

		if (edge_intersection) {
			edge_union_list.push(edge_intersection);
		}

		edge_query = {$or: edge_union_list};
	}

	else {

		if (edge_intersection) {
			edge_query = edge_intersection;
		}
	}

	return edge_query;
}

function build_pie_chart_query(fields) {

	if (fields.filter.pieChartFilter) {

		var pie_chart_filter = fields.filter.pieChartFilter;
		if (pie_chart_filter.edges) {

			var pie_filters = _.map(pie_chart_filter.edges, function(item_in) {

								var item = {};

								var val = item_in.value;
								
								item["data.key"] = item_in.key;
								if (item_in.ne) {
									item["data.value"] = {$ne: val};
								}

								else {
									item["data.value"] = val;
								}

								return item;
							});

			return {$and: pie_filters};
		}
	}
}

function build_time_chart_query(fields) {

	if (fields.filter && fields.filter.timeChartFilter) {

		var time_chart_filter = fields.filter.timeChartFilter;
		if (time_chart_filter.edges) {

			var time_filters = time_chart_filter.edges;
			return {startDate: {$gte: new Date(time_filters.startDate)},
					endDate: {$lte: new Date(time_filters.endDate)}
				};
		}
	}
}

function build_search_query(fields) {

	if (fields.filter && fields.filter.searchFilter) {

		var searchFilter = fields.filter.searchFilter;
		if (searchFilter.values) {
			//return {"data.value": {$in: searchFilter.values}};

			//var values = [];
			var query = {};
			var values = []
			var sub_queries = [];

			_.each(searchFilter.values, function(search_item) {

				//if query
				if (search_item.type === "query") {
					console.log("this is query item ", search_item)

					//_.extend(query, JSON.parse(search_item.value));
					var sub_query = JSON.parse(search_item.value);
					sub_queries.push(sub_query);
				}

				else {

					values.push(search_item.value);
				}
				
			});

			if (sub_queries.length > 0) {

				if (values.length > 0) {
					query["$or"] = _.union(sub_queries, {_values: {$in: values}});
				}

				else {
					query["$or"] = sub_queries;
				}
			}

			else {
				//if (values.length > 0) {
					query["_values"] = {$in: values};
				//}
			}


			//query["_values"] = {$in: values};

			console.log("query ", query)

			return query;
		}
	}
}

function build_netchart_nin_query(fields) {

	if (fields.filter) {
		var net_chart_filter = fields.filter.netChartFilter;
		if (net_chart_filter && net_chart_filter.edges) {

			var net_chart_filter = fields.filter.netChartFilter;
			if (net_chart_filter && net_chart_filter.edges) {
		    	if (net_chart_filter.edges.nin.length > 0) {
					return {_id: {$nin: net_chart_filter.edges.nin}};
		    	}      
			}
		}
	}
}

function build_netchart_in_query(fields) {

	var net_chart_filter = fields.filter.netChartFilter;
	if (net_chart_filter && net_chart_filter.edges) {

    	if (net_chart_filter.edges.in.length > 0) {
    		return {$or: [{_id: {$in: net_chart_filter.edges.in}}]};
    	}
	}
}

function build_netchart_query(fields) {

	var net_chart_filter = fields.filter.netChartFilter;
	if (net_chart_filter && net_chart_filter.nodes) {

		var net_chart_nodes = net_chart_filter.nodes;
    	if (net_chart_nodes.nin.length > 0) {
    		var nin = {$nin: net_chart_nodes.nin};
			return {to: nin, from: nin};
    	}      
	}

}
