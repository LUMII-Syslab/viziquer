
Elements.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	//adding the diagram notification
	var edit = {userId: user_id, action: "added", time: new Date(),
				actionData: {elementTypeId: doc["elementTypeId"]}};

	var action = build_diagram_notification(user_id, doc, edit);

	DiagramLogs.insert(action);
});
Elements.hookOptions.after.insert = {fetchPrevious: false};

Elements.after.remove(function (user_id, doc) {

	if (!doc)
		return false;

	///removing compartments
	Compartments.remove({elementId: doc["_id"]});

	//removing linked lines
	Elements.remove({$or: [{startElement: doc["_id"]}, {endElement: doc["_id"]}]});

	//removing mappings to selections
	ElementsSections.remove({elementId: doc["_id"]});

	//remove mappings to files
	DiagramFiles.remove({elementId: doc["_id"]});

	//removing target element type
	ElementTypes.remove({elementId: doc["_id"]});

	//if specialization line was deleted
	if (doc["data"] && doc["data"]["type"] == "Specialization" && doc["data"]["data"]) {

		var data = doc["data"]["data"];
		ElementTypes.update({superTypeIds: data["endElementTypeId"]},
							{$pull: {superTypeIds: data["endElementTypeId"]}},
							{multi: true});
	}
});
Elements.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertElement: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			var id = Elements.insert(list);

			var domain = list["data"];

			list["id"] = id;
			add_compartments(list);

			//inserting element target type, if neccesary
			if (domain) {

				var data = domain["data"];

				//inserting specialization
				if (domain["type"] == "Specialization") {
					var sub_type_id = data["startElementTypeId"];
					var super_type_id = data["endElementTypeId"];

					ElementTypes.update({_id: sub_type_id},
										{$addToSet: {superTypeIds: super_type_id}});
				}

				//inserting box or line target type
				else {

					var editor_type = domain["editorType"];

					var new_list = build_initial_element_type(list, editor_type);
					new_list["elementId"] = id;
					new_list["diagramTypeId"] = data["diagramTypeId"];

					//This is a hack to add id while there is no UI for this
					new_list["targetDiagramTypeId"] = data["diagramTypeId"];

					if (domain["type"] == "NewLine") {
						new_list["startElementTypeId"] = data["startElementTypeId"];
						new_list["endElementTypeId"] = data["endElementTypeId"];
						new_list["styles"][0]["startShapeStyle"] = list["style"]["startShapeStyle"];
						new_list["styles"][0]["endShapeStyle"] = list["style"]["endShapeStyle"];				

						//by default line is directional and otrhogonal
						new_list["direction"] = "Directional";
						new_list["lineType"] = "Orthogonal";
					}

					if (list["swimlane"]) {
						new_list["swimlane"] = list["swimlane"];
						new_list["name"] = "Swimlane";
						new_list["styles"][0]["elementStyle"] = list["style"]["elementStyle"];

						var extension_point = {extensionPoint: "dynamicContextMenu",
												procedure: "SwimlaneContextMenu"};

						new_list["extensionPoints"].push(extension_point);
					}

					var elem_type_id = ElementTypes.insert(new_list);

					var tab_id = DialogTabs.insert({toolId: new_list["toolId"],
													versionId: new_list["versionId"],
													diagramTypeId: new_list["diagramTypeId"],
													diagramId: new_list["diagramId"],
													elementTypeId: elem_type_id,
													name: "Main",
													index: 1,
												});

					if (!(list["isAbstract"] || list["swimlane"])) {
						
						PaletteButtons.insert({toolId: new_list["toolId"],
												versionId: new_list["versionId"],
												diagramTypeId: new_list["diagramTypeId"],
												diagramId: new_list["diagramId"],
												elementTypeIds: [elem_type_id],
												name: new_list["name"],
												type: new_list["type"],
												index: domain["index"],
											});
					}

					if (list["swimlane"]) {

						CompartmentTypes.find({elementTypeId: list["elementTypeId"]}).forEach(
							function(compart_type) {

								delete compart_type["_id"];

								compart_type["elementTypeId"] = elem_type_id;
								compart_type["diagramTypeId"] = new_list["diagramTypeId"];
								compart_type["versionId"] = new_list["versionId"];
								compart_type["toolId"] = new_list["toolId"];

								compart_type["elementId"] = id;
								compart_type["diagramId"] = list["diagramId"];

								compart_type["dialogTabId"] = tab_id;
					
								CompartmentTypes.insert(compart_type);
							});
					}
				}
			}

			return id;
		}
	},

	resizeElement: function(list) {

		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {
				var query = {projectId: list["projectId"],
							versionId: list["versionId"],
							diagramId: list["diagramId"],
						};

				resize_element(list, query, user_id);
			}
		}
		else if (is_system_admin(user_id, list)) {
			var query = {toolId: list["toolId"],
						versionId: list["versionId"],
						diagramId: list["diagramId"],
					};

			resize_element(list, query, user_id);
		}
	},

	updateElementStyle: function(list) {
		var user_id = Meteor.userId();

		if (is_project_version_admin(user_id, list)) {

			//update for element
			var update_element = {};
			update_element['style.' + list["attrName"]] = list["attrValue"];

			Elements.update({_id: list["elementId"], diagramId: list["diagramId"],
								projectId: list["projectId"]}, {$set: update_element});

			var edit = {userId: user_id,
						action: "edit",
						time: new Date(),
						actionData: {elementId: elementId},
					};

			var notification = build_diagram_notification(user_id, list, edit);
			DiagramNotifications.insert(notification);
		}
		else
			error_msg(rights);
	},

	copyElements: function(list) {

		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {
 
				if (list["elements"]) {
					Clipboard.update({userId: user_id,
									projectId: list["projectId"],
									versionId: list["versionId"],
									diagramId: list["diagramId"]},

									{$set: {elements: list["elements"],
											//elements: elements.fetch(),
											//compartments: compartments.fetch(),
											//elementsSections: elements_sections.fetch(),
											leftPoint: list["leftPoint"] || 0,
											count: 1,
											}},
									{upsert: true}
								);
				}
			}
		}
		else if (is_system_admin(system_id) && is_version_not_published(list)) {
			console.log("copying configurator elmeents")
		}
	},

	pasteElements: function(list) {

		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {

				var clipboard = Clipboard.findOne({userId: user_id,
													projectId: list["projectId"],
													versionId: list["versionId"],
													diagramId: list["diagramId"],
												});

				if (clipboard) {
					
					var x = list["x"];
					var y = list["y"];

					var offset_x, offset_y;
					if (x && y) {

						var left_most = clipboard["leftPoint"];

						offset_x = x - (left_most["x"] || 0);
						offset_y = y - (left_most["y"] || 0);
					}

					else {
						var count = clipboard["count"];
						var offset = count * 10;
						offset_x = offset;
						offset_y = offset;	
					}

					var element_ids = clipboard["elements"];

					var elements = Elements.find({_id: {$in: element_ids}}).fetch();
					var compartments = Compartments.find({elementId: {$in: element_ids}}).fetch();
					var elements_sections = ElementsSections.find({elementId: {$in: element_ids}}).fetch();

					//var elements = clipboard["elements"];
					//var compartments = clipboard["compartments"];
					//var elements_sections = clipboard["elementsSections"];

					//mappings from old ids to new ids
					var old_new_id_list = {};

					var boxes = [];
					var lines = [];

					//iterates over boxes
					_.each(elements, function(element) {
						if (element["type"] == "Box") {
							var old_id = element["_id"];

							//removes element id to have new one
							delete element["_id"];

							var location = element["location"];
							location["x"] = location["x"] + offset_x;
							location["y"] = location["y"] + offset_y;

							var new_id = Elements.insert(element);

							boxes.push(new_id);

							//strores old_id -> new_id
							old_new_id_list[old_id] = new_id;
						}
					});

					//iterates over lines
					_.each(elements, function(element) {
						if (element["type"] == "Line") {
							var old_id = element["_id"];

							delete element["_id"];

							//sets a new start element id for line
							var start_elem_id = element["startElement"];
							var new_start_elem_id = old_new_id_list[start_elem_id];
							element["startElement"] = new_start_elem_id;

							//sets a new end element id for line
							var end_elem_id = element["endElement"];
							var new_end_elem_id = old_new_id_list[end_elem_id];
							element["endElement"] = new_end_elem_id;

							if (new_start_elem_id && new_end_elem_id) {

								var points = element["points"];
								var new_points = _.map(points, function(point, i) {
									if (i % 2 == 0)
										return point + offset_x;
									else
										return point + offset_y;
								});

								element["points"] = new_points;
								var new_id = Elements.insert(element);

								lines.push(new_id);

								//strores old_id -> new_id
								old_new_id_list[old_id] = new_id;
							}
						}
					});

					_.each(compartments, function(compartment) {
						delete compartment["_id"];
						compartment["elementId"] = old_new_id_list[compartment["elementId"]];
						Compartments.insert(compartment);
					});

					_.each(elements_sections, function(element_section) {
						delete element_section["_id"];
						element_section["elementId"] = old_new_id_list[element_section["elementId"]];
						ElementsSections.insert(element_section);
					});

					if (!x && !y)
						Clipboard.update({_id: clipboard["_id"]}, {$inc: {count: 1}});

					//var edit = {userId: user_id, action: "pasted", time: new Date()};			
					//Diagrams.update({_id: list["diagramId"]}, {$set: {edit: edit}});

					return {boxes: boxes, lines: lines};
				}
			}
		}
		else if (is_system_admin(user_id) && is_version_not_published(list)) {
			console.log("pasting configurator elmeents")

		}
	},

	changeCollectionPosition: function(list) {
		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {
				var query = {projectId: list["projectId"],
								versionId: list["versionId"],
								diagramId: list["diagramId"],
							};
							
				change_position(list, query, user_id);
			}
		}
		else if (is_system_admin(user_id, list)) {
			var query = {toolId: list["toolId"],
						versionId: list["versionId"],
						diagramId: list["diagramId"],
					};

			change_position(list, query, user_id);
		}
	},

	deleteElements: function(list) {
		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {
				delete_elements(user_id, list);
			}
		}
		else if (is_system_admin(user_id, list)) {
			delete_elements(user_id, list);
		}
	},

	updateSwimlaneLines: function(list) {

		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {


				var query = {_id: list["elementId"], projectId: list["projectId"],
							versionId: list["versionId"], diagramId: list["diagramId"]};

				var update = {$set: {"swimlane.horizontalLines": list["horizontalLines"],
									"swimlane.verticalLines": list["verticalLines"],}
							};

				Elements.update(query, update);

				var compart_update = {};
				var query2 = {elementId: list["elementId"], projectId: list["projectId"],
								versionId: list["versionId"], diagramId: list["diagramId"]};

				var query3 = {elementId: list["elementId"], projectId: list["projectId"],
								versionId: list["versionId"], diagramId: list["diagramId"]};


				var inc = list["increment"];
				if (list["horizontalIndex"] || list["horizontalIndex"] === 0) {
					
					query2["swimlane.row"] = {$gte: list["horizontalIndex"]};
					compart_update = {$inc: {"swimlane.row": inc}};

					query3["swimlane.row"] = list["horizontalIndex"];	
				}

				else if (list["verticalIndex"] || list["verticalIndex"] === 0) {

					query2["swimlane.column"] = {$gte: list["verticalIndex"]};
					compart_update = {$inc: {"swimlane.column": inc}};

					query3["swimlane.column"] = list["verticalIndex"];	
				}

				else
					return;

				//if removing
				if (inc < 0) {
					Compartments.remove(query3);
				}

				Compartments.update(query2, compart_update, {multi: true});
			}
		}

		else if (is_system_admin(user_id, list)) {

			var update = {$set: {"swimlane.horizontalLines": list["horizontalLines"],
								"swimlane.verticalLines": list["verticalLines"],}
						};

			Elements.update({_id: list["elementId"], toolId: list["toolId"],
							versionId: list["versionId"], diagramId: list["diagramId"]},
							update);

			ElementTypes.update({elementId: list["elementId"], toolId: list["toolId"],
								versionId: list["versionId"], diagramId: list["diagramId"]},
								update);
		}

	},

});


function resize_element(list, query, system_id) {

	var element_list = convert_assoc_array_to_array(list["elements"]);

//a transaction is needed
	var elem_query = {_id: list["elementId"]};
	_.extend(elem_query, query);

	var edit = {userId: system_id, action: "resized", time: new Date(), 
				actionData: {elementId: list["elementId"]}};
	var notification = build_diagram_notification(system_id, list, edit);
	DiagramLogs.insert(notification);

	var elem_update = {"location.x": list["x"],
						"location.y": list["y"],
						"location.width": list["width"],
						"location.height": list["height"]};

	Elements.update(elem_query, {$set: elem_update});

	_.each(list["lines"], function(line) {
		var line_query = {_id: line["_id"],};
		_.extend(line_query, query);
		Elements.update(line_query, {$set: {points: line["points"]}});
	});
}

function change_position(list, query, system_id) {

	//selecting edges
	var edge_points = {};

	var edge_list = _.map(list["lines"], function(line) {
						edge_points[line["id"]] = line["points"];
						return line["id"];
					});

//a transaction is needed
	var lines_query = {_id: {$in: edge_list}, type: "Line"};
	_.extend(lines_query, query);

	var edit = {userId: system_id,
				action: "moved",
				time: new Date(),
				actionData: {boxes: list["boxes"], lines: edge_list},
			};

	var notification = build_diagram_notification(system_id, list, edit);
	DiagramLogs.insert(notification);

	//updating edges
	Elements.find(lines_query).forEach(
		function(edge) {
			var id = edge["_id"];
			Elements.update({_id: id}, {$set: {points: edge_points[id]}});
		});

	//updating boxes

	if (list["boxes"]) {

		var box_query = {_id: {$in: list["boxes"]}, type: "Box"};
		_.extend(box_query, query);

		Elements.update(box_query,
						{$inc: {"location.x": list["deltaX"], "location.y": list["deltaY"]}}, {multi: true});

	}

	if (list["movedBoxes"]) {

		_.each(list["movedBoxes"], function(box) {
			var box_query = {_id: box.id, type: "Box"};
			_.extend(box_query, query);
			Elements.update(box_query, {$set: {"location.x": box.position.x, "location.y": box.position.y}});
		});

	}

}

function delete_elements(system_id, list) {

	var element_list = list["elements"];
	
	//a transaction is needed
	var edit = {userId: system_id,
				action: "deleted",
				time: new Date(),
				actionData: {elementNames: list["elementNames"]},
			};

	var notification = build_diagram_notification(system_id, list, edit);
	DiagramLogs.insert(notification);

	var query = {$or: [{_id: {$in: element_list}},
						{endElement: {$in: element_list}},
						{startElement: {$in: element_list}},
					]};

	if (list["projectId"])
		_.each(query["$or"], function(or_query) {or_query["projectId"] = list["projectId"];});
	else if (list["toolId"])
		_.each(query["$or"], function(or_query) {or_query["toolId"] = list["toolId"];});
	else
		return;

	Elements.remove(query);
}

build_diagram_notification = function(system_id, list, edit) {

	var notification = {
						authorId: system_id,
						diagramId: list["diagramId"],
						createdAt: edit["time"],
						action: edit["action"],
						actionData: edit["actionData"],
					};

	if (list["projectId"]) {
		notification["projectId"] = list["projectId"];
		notification["versionId"] = list["versionId"];	
	}

	else if (list["toolId"]) {
		notification["toolId"] = list["toolId"];
		notification["versionId"] = list["versionId"];	
	}

	return notification;
}


