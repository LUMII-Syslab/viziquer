

Meteor.methods({

	insertView: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			
			var view_id = Views.insert(list);

			var meta_data = DataMetaData.findOne({projectId: list.projectId, versionId: list.versionId});
			var actual_dimension;
			var actual_dimension_index;
			if (meta_data) {
				var settings = meta_data.settings;
				actual_dimension = settings.actualDimension;
				actual_dimension_index = settings.actualDimensionIndex;
			}

			var filter = {
						projectId: list.projectId,
						versionId: list.versionId,
						viewId: view_id,
						userId: user_id,
						filter: {timeChartFilter: {},
								pieChartFilter: {},
								netChartFilter: {},
								searchFilter: {},
								transactionsFilter: {transactions: {},
														objects: {},
													},
							},
						history: [],
						currentFilter: 0,
						maxFilter: 0,
						actualDimension: actual_dimension,
						actualDimensionIndex: actual_dimension_index,
					};

			ViewFilter.insert(filter);
			ViewUser.insert({userId: user_id, viewId: view_id, mode: "viewMode"});
		}
	},

	removeView: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			Views.remove({_id: list.viewId, projectId: list.projectId, versionId: list.versionId});
			ViewFilter.remove({viewId: list.viewId, userId: user_id});
		}
	},

	updateViewName: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			Views.update({_id: list.viewId, projectId: list.projectId, versionId: list.versionId},
						{$set: {name: list.name}});
		}
	},

	changeViewMode: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {
			ViewUser.update({userId: user_id, viewId: list.viewId},
							{$set: {mode: list.mode}});
		}
	},

	changeActualKey: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {

			//TODO: This will change actual key for all the diagrams

			DataMetaData.update({projectId: list.projectId, versionId: list.versionId},
								{$set: {actualDimension: list.actualKey}});
		}
	},


});
