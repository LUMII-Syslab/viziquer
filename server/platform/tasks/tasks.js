

Meteor.methods({

	insertTask: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			var current_time = get_current_time();
			var performer_id = user_id;
			var extra = {createdBy: user_id, createdAt: current_time,
						currentStepCreatedAt: current_time, currentOwner: performer_id,
					};

			_.extend(list, extra);

			//start element type id
			var elem_type = ElementTypes.findOne({diagramTypeId: list.diagramTypeId, name: "Start"});
			if (!elem_type) {
				console.error("No start element type");
				return;
			}

			//start element id
			var element = Elements.findOne({diagramId: list.processId,
											projectId: list.projectId,
											versionId: list.versionId,
											elementTypeId: elem_type._id,
										});

			var title = get_task_step_name(element);
			var template_name = get_task_step_template(element);

			var task_step = {
							projectId: list.projectId,
							versionId: list.versionId,
							performerId: performer_id,
							createdAt: list.createdAt,
							createdBy: list.createdBy,
							elementId: element._id,
							template: template_name,
							title: title, 
							data: {},
						};

			var task_id = Tasks.insert(list);

			task_step.taskId = task_id;

			TaskSteps.insert(task_step);
		}

	},

	completeTaskStep: function(list) {
      
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			var last_task_step = TaskSteps.findOne({projectId: list.projectId,
													versionId: list.versionId,
													taskId: list.taskId,
													finishedAt: {$exists: false},
												});

			if (!last_task_step)
				return;

			var step_id = last_task_step._id;
			var last_step_elem_id = last_task_step.elementId;
			var current_time = get_current_time();
			

			console.log('data ', list)

			TaskSteps.update({_id: step_id, projectId: list.projectId,
											versionId: list.versionId, performerId: user_id},
											{$set: {finishedAt: current_time, data: list.data,}}, 

				function(err, res) {

					//if update failed, or where update no elements
					if (err || res === 0) {
						console.error("Error in TaskSteps update");
					}

					else {

						//checking, if there is a next step
						if (list.nextStepElementId ) {

							var performer_id = user_id;
							var element = Elements.findOne({_id: list.nextStepElementId});

							var title = get_task_step_name(element);
							var template_name = get_task_step_template(element);

							var new_step_id = TaskSteps.insert({taskId: list.taskId,
															projectId: list.projectId,
															versionId: list.versionId,
															createdBy: user_id, 
															createdAt: current_time,
															elementId: list.nextStepElementId,
															performerId: performer_id,
															template: template_name,
															title: title,
															data: {},
														});

							Tasks.update({taskId: list.taskId, projectId: list.projectId, versionId: list.versionId},
										{$set: {currentStepCreatedAt: current_time,
												currentOwner: performer_id,
												currentStep: new_step_id,
											}});
						}

						//finishing the task
						else {
							Tasks.update({_id: list.taskId, projectId: list.projectId, versionId: list.versionId},
										{$set: {finishedAt: current_time}});
						}
					}
			});
		}

	},

	//TODO: need removing 
	revmoeAllTasks: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id)) {
			Tasks.remove({projectId: list.projectId});
			TaskSteps.remove({projectId: list.projectId});
		}
	},

});

function get_task_step_template(element) {

	var compart_type = CompartmentTypes.findOne({name: "Template", elementTypeId: element.elementTypeId});
	if (!compart_type) {
		console.error("Error: No compartment type for template");
		return;
	}

	var compart = Compartments.findOne({elementId: element._id, compartmentTypeId: compart_type._id});
	if (!compart) {
		console.error("Error: No compartment for template");
		return;
	}	

	return compart.value; 
}

function get_task_step_name(element) {

	var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: element.elementTypeId});
	if (!compart_type) {
		console.error("Error: No compartment type for name");
		return;
	}

	var compart = Compartments.findOne({elementId: element._id, compartmentTypeId: compart_type._id});
	if (!compart) {
		console.error("Error: No compartment for name");
		return;
	}	

	return compart.value; 
}
