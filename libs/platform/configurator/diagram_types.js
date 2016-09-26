
DiagramTypes.after.update(function (user_id, doc, fields, modifier, options) {

	if (!modifier || !modifier.$set)
		return false;
	
	//if updated the configurator diagram type's name, then updating the diagram's name as well
	if (fields && fields.length == 1 && fields[0] == "name")
		Diagrams.update({_id: doc["diagramId"]}, modifier);
});

DiagramTypes.after.remove(function (user_id, doc) {
	if (!doc)
		return false;

	ElementTypes.remove({diagramTypeId: doc["_id"]});
	Diagrams.remove({diagramTypeId: doc["_id"]});
	ImportedTranslets.remove({diagramTypeId: doc["_id"]});

});


Meteor.methods({

	insertDiagramType: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			var time = new Date();
			var style = diagram_default_style();

			var dgr_list = {};
			dgr_list["name"] = list["name"];
			dgr_list["diagramTypeId"] = list["diagramTypeId"];
			dgr_list["toolId"] = list["toolId"];
			dgr_list["versionId"] = list["versionId"];
			dgr_list["style"] = style;		

			dgr_list["createdAt"] = time;
			dgr_list["createdBy"] = user_id;
			dgr_list["editorType"] = list["editorType"];

			dgr_list["imageUrl"] = "http://placehold.it/770x347";
			//dgr_list["edit"] = {action: "new", time: time, userId: user_id};
			dgr_list["parentDiagrams"] = [];
			dgr_list["allowedGroups"] = [];
			dgr_list["editing"] = {userId: user_id, startedAt: new Date()};
			dgr_list["seenCount"] = 0;

			var diagram_id = Diagrams.insert(dgr_list);

			var type_list = {};
			build_initial_diagram_type(type_list, list["editorType"]);
			type_list["versionId"] = list["versionId"];
			type_list["toolId"] = list["toolId"];
			type_list["createdAt"] = time;
			type_list["createdBy"] = user_id;
			type_list["diagramId"] = diagram_id;
			type_list["style"] = style;
			type_list["name"] = list["name"];
			type_list["editorType"] = list["editorType"];
			type_list["size"] = {diagramSize: 9, dialogSize: 3};

			if (list["editorType"] == "ZoomChart") {
				type_list["layout"] = {mode: "dynamic",
										nodeSpacing: 16,
										layoutFreezeTimeout: 1500,
										globalLayoutOnChanges: true,
									};

				type_list["size"] = {diagramSize: 10, dialogSize: 2};					
			}

			var dgr_type_id = DiagramTypes.insert(type_list);

			//adding the default dialog tab
			DialogTabs.insert({toolId: list["toolId"],
								versionId: list["versionId"],
								diagramTypeId: dgr_type_id,
								diagramId: diagram_id,
								name: "Diagram",
								index: 1,
							});


			return {diagramId: diagram_id, diagramTypeId: dgr_type_id};
		}
	},

	updateConfiguratorExtension: function(list) {

		var system_id = Meteor.userId();
		if (is_system_admin(system_id, list) && list && list["update"]) {

			//attribute pair storing attribute name and its value
			var attr_name = list["update"]["_attr"];
			var attr_value = list["update"]["_value"];

			//query for object
			var query = {};
			query["toolId"] = list["toolId"];
			query["extensionPoints.extensionPoint"] = attr_name;			

			//update for extension point
			var update = {};
			update['extensionPoints.$.procedure'] = attr_value;

			//updating the object type
			if (list["compartmentTypeId"]) {
				query["_id"] = list["compartmentTypeId"];
				CompartmentTypes.update(query, {$set: update}, function(err, res) {

					if (err) {
						console.error("Error in update compartmentType");
					}

					else if (res == 0) {

						var query2 = {toolId: list["toolId"], _id: list["compartmentTypeId"]};						
						var extension_point = {extensionPoint: attr_name, procedure: attr_value};

						CompartmentTypes.update(query2, {$push: {extensionPoints: extension_point}});
					}

				});	
			}
			else if (list["elementId"]) {
				query["elementId"] = list["elementId"];
				ElementTypes.update(query, {$set: update}, function(err, res) {

					if (err) {
						console.error("Error in update elementType");
					}

					else if (res == 0) {

						var query2 = {toolId: list["toolId"], elementId: list["elementId"]};						
						var extension_point = {extensionPoint: attr_name, procedure: attr_value};

						ElementTypes.update(query2, {$push: {extensionPoints: extension_point}});
					}
				});

			}
			else if (list["diagramId"]) {
				query["diagramId"] = list["diagramId"];

				DiagramTypes.update(query, {$set: update}, function(err, res) {

					if (err) {
						console.log("Error in update diagramType");
					}

					else if (res == 0) {

						var query2 = {toolId: list["toolId"], diagramId: list["diagramId"]};						
						var extension_point = {extensionPoint: attr_name, procedure: attr_value};

						DiagramTypes.update(query2, {$push: {extensionPoints: extension_point}});
					}

				});					
			}
		}
		else
			error_msg();
	},

	reorderTabIndexes: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];
			var tab_id = list["dialogTabId"];
			var query = {toolId: list["toolId"], diagramTypeId: list["diagramTypeId"]};

			if (list["elementTypeId"])
				query["elementTypeId"] = list["elementTypeId"];
			else
				query["elementTypeId"] = {$exists: false};

        	if (prev_index < current_index) {
	       		DialogTabs.update({$and: [{index: {$gt: prev_index}},
    										{_id: {$ne: tab_id}}, query]},
    								{$inc: {index: current_index}}, {multi: true});
        	}
        	else {
        		DialogTabs.update({$and: [query,
    										{$or: [{index: {$gt: prev_index}},
    												{_id: tab_id}]}
    										]},
    								{$inc: {index: prev_index}},
    								{multi: true});
        	}
        }
    },

	reorderPaletteButtonIndexes: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];
			var button_id = list["buttonId"];
			var query = {toolId: list["toolId"], diagramTypeId: list["diagramTypeId"]};

        	if (prev_index < current_index) {

	       		PaletteButtons.update({$and: [{index: {$gt: prev_index}},
    										{_id: {$ne: button_id}}, query]},
    								{$inc: {index: current_index}}, {multi: true});
        	}
        	else {

        		PaletteButtons.update({$and: [query,
    										{$or: [{index: {$gt: prev_index}},
    												{_id: button_id}]}
    										]},
    								{$inc: {index: prev_index}},
    								{multi: true});
        	}
        }
    },

    addDiagramTypeKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {
			DiagramTypes.update({_id: list["id"]}, {$push: list["push"]});
    	}
    },

    deleteDiagramTypeKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list.array] = list.data;

			DiagramTypes.update({_id: list["id"]}, {$set: update});
    	}
    },
			
    updateDiagramTypeKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {
			DiagramTypes.update({_id: list["id"]}, {$set: list["field"]});
    	}
    },

    updateDiagramSize: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var dialog_size, diagram_size;
			if (list["attrName"] == "size.dialogSize") {
				dialog_size = list["attrValue"];
				diagram_size = 12 - dialog_size;
			}

			else {
				diagram_size = list["attrValue"];
				dialog_size = 12 - diagram_size;
			}

			var update = {};
			update["size.diagramSize"] = diagram_size;
			update["size.dialogSize"] = dialog_size;

			DiagramTypes.update({_id: list["id"]}, {$set: update});
		}
	},

    updateDiagramType: function(list) {
		var user_id = Meteor.userId();

		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list["attrName"]] = list["attrValue"];

			DiagramTypes.update({_id: list["id"]}, {$set: update});
		}
	},

    updateDiagramTypeStyle: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update['style.' + list["attrName"]] = list["attrValue"];

			DiagramTypes.update({_id: list["id"]}, {$set: update});

			Diagrams.update({$or: [{_id: list["diagramId"]}, {diagramTypeId: list["id"]}]},
								{$set: update}, {multi: true});
		}
	},

    addToolbarItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list["attrName"]] = list["push"];

			DiagramTypes.update({_id: list["id"]}, {$push: update});
		}
	},

    removeToolbarItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list["attrName"]] = list["pull"];

			DiagramTypes.update({_id: list["id"]}, {$pull: update});
		}
	},

});