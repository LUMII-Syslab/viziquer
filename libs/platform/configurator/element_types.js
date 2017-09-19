
ElementTypes.after.update(function (user_id, doc, fields, modifier, options) {

	if (!doc || !modifier || !modifier.$set) {
		return false;	
	}

	if (fields && fields.length == 1 && fields[0] == "name") {

		var name = doc["name"];
		Compartments.update({elementId: doc["elementId"]}, {$set: {value: name, input: name}});
		PaletteButtons.update({elementTypeIds: doc["_id"]}, {$set: {name: name}});
	}

	if (modifier.$set["isAbstract"] === false) {
		PaletteButtons.insert({toolId: doc["toolId"],
							versionId: doc["versionId"],
							diagramTypeId: doc["diagramTypeId"],
							diagramId: doc["diagramId"],
							elementTypeIds: [doc["_id"]],
							name: doc["name"],
							type: doc["type"],
							index: 1,
						});
	}
	
	else if (modifier.$set["isAbstract"] === true) {
		PaletteButtons.remove({elementTypeIds: doc["_id"]});
	}
});


ElementTypes.after.remove(function (user_id, doc) {
	if (!doc)
		return false;

	CompartmentTypes.remove({elementTypeId: doc["_id"]});
	PaletteButtons.remove({elementTypeIds: doc["_id"]});
	DialogTabs.remove({elementTypeId: doc["_id"]});

	ElementTypes.update({superTypeIds: doc["_id"]},
						{$pull: {superTypeIds: doc["_id"]}},
						{multi: true});

	Elements.remove({elementTypeId: doc["_id"]});
});


Meteor.methods({

	makeSpecialization: function(list) {
		var system_id = Meteor.userId();

		if (is_system_admin(system_id) && is_version_not_published(list)) {

			var element_list = get_element_list(list);
			element_list["data"] = {elementType: "Specialization"};

			var elem_id = Elements.insert(element_list);
			ElementTypes.update({_id: list["subTypeId"],
								toolId: list["toolId"], versionId: list["versionId"]},
								{$push: {superTypeIds: list["superTypeId"]}});
		}
		else
			error_msg();
	},

    addKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {
			ElementTypes.update({_id: list["id"]}, {$push: list["push"]});
    	}
    },

    deleteKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list.array] = list.data;

			ElementTypes.update({_id: list["id"]}, {$set: update});
    	}
    },
			
    updateKeystrokeOrItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {
			ElementTypes.update({_id: list["id"]}, {$set: list["field"]});
    	}
    },

	addElementTypeStyle: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var styles;
			if (list["type"] == "Box") {
				styles = {
							id: generate_id(),
							name: list["name"],
							elementStyle: build_initial_box_style(list["editorType"]),
						};
			}

			else {
				var style = build_initial_line_style(list["editorType"])
				if (is_ajoo_editor(list["editorType"])) {

					styles = {
								id: generate_id(),
								name: list["name"],
								elementStyle: style["elementStyle"],
								startShapeStyle: style["startShapeStyle"],
								endShapeStyle: style["endShapeStyle"],
							};
				}
				else if (is_zoom_chart_editor(list["editorType"])) {

					styles = {
								id: generate_id(),
								name: list["name"],
								elementStyle: style,
							};
				}
			}

			ElementTypes.update({_id: list["id"]}, {$push: {styles: styles}});
		}
	},

	updateElementType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var update = {};
			update[list["attrName"]] = list["attrValue"];

			//element type name is required
			if (update["name"] == "") {
				return;
			}

			ElementTypes.update({_id: list["id"], toolId: list["toolId"]}, {$set: update});
		}
	},

	updateElementTypeStyle: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var attr_value = list["attrValue"];
			if (attr_value == "true") {
				attr_value = true
			}

			else if (attr_value == "false") {
				attr_value = false;
			}

			var update = {};
			update["styles." + list["styleIndex"] +"." + list["attrName"]] = attr_value;

			if (list["attrName"] == "radius") {
				update["styles." + list["styleIndex"] +"." + "width"] = attr_value;
				update["styles." + list["styleIndex"] +"." + "height"] = attr_value;
			}

			ElementTypes.update({_id: list["id"]}, {$set: update});

			//if changing the styles attribute, then changing compartments as well
			if (list["attrName"] != "name") {

				var style_update = {};
				style_update["style." + list["attrName"]] = attr_value;

				var query = {$or: [{elementTypeId: list["id"], styleId: list["styleId"]},
									{_id: list["elementId"]}]};
				
				//updating only elements with styleId or configurator element
				Elements.update(query, {$set: style_update}, {multi: true});
			}
		}
	},

	addNodeWithLink: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			//box
			var box = list["box"];
			var node_id = Elements.insert(box);

			box["id"] = node_id;
			add_compartments(box);

			//line
			var edge = list["line"];
			edge["endElement"] = node_id;

			var edge_id = Elements.insert(edge);

			// //box type
			// var node_type_list = list["boxType"];
			// var node_type = build_initial_element_type(node_type_list, "ZoomChart");
			// node_type["elementId"] = node_id;

			// var node_type_id = ElementTypes.insert(node_type);

			// DialogTabs.insert({toolId: node_type["toolId"],
			// 					versionId: node_type["versionId"],
			// 					diagramTypeId: node_type["diagramTypeId"],
			// 					diagramId: node_type["diagramId"],
			// 					elementTypeId: node_type_id,
			// 					name: "Main",
			// 					index: 1,
			// 				});

			//line type
			var edge_type_list = list["lineType"];
			var edge_type = build_initial_element_type(edge_type_list, "ZoomChart");

			edge_type["endElementTypeId"] = box["elementTypeId"];
			edge_type["elementId"] = edge_id;		

			var edge_type_id = ElementTypes.insert(edge_type);
		}
	},

});

