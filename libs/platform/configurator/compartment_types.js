
CompartmentTypes.before.insert(function (user_id, doc) {
	if (!doc) {
		console.log("No CompartmentTypes document");
		return false;
	}

	//if (!doc["dialogTabId"] && doc["toolId"] != get_configurator_tool_id()) {
	//	console.log("There is no dialogTabId or toolId is equal to configurator's id.");
	//	return false;
	//}
});

CompartmentTypes.after.update(function (user_id, doc, fields, modifier, options) {

	if (!doc || !modifier)
		return false;

	//there can be only one representation per element
	if (modifier && modifier.$set && modifier.$set["isObjectRepresentation"] == true) {

		//selecting compartment type ids
		var ids = CompartmentTypes.find({elementTypeId: doc["elementTypeId"], _id: {$ne: doc["_id"]}}).map(
			function(compart_type) {
				return compart_type["_id"];
			});

		//unsetting the property from any compartment type 
		CompartmentTypes.update({_id: {$in: ids}},
								{$set: {isObjectRepresentation: false}}, {multi: true});

		//unsetting the property from any compartment
		Compartments.update({compartmentTypeId: {$in: ids}},
								{$set: {isObjectRepresentation: false}}, {multi: true});

		//setting the property for the compartments that correspond to the compart type
		Compartments.update({compartmentTypeId: doc["_id"]},
								{$set: {isObjectRepresentation: true}}, {multi: true});
	}

	if (modifier && modifier.$inc && modifier.$inc["index"]) {
		var index = doc["index"];
		Compartments.update({compartmentTypeId: doc["_id"]}, {$set: {index: index}}, {multi: true});
	}

});


Meteor.methods({
	
   	insertCompartmentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var compart_type_obj = list["compartmentType"];
			var type = list["type"];
			var editor_type = list["editorType"];

			build_initial_compartment_type(compart_type_obj, type, editor_type);
			var id = CompartmentTypes.insert(compart_type_obj);

			return id;
		}
	},

	removeCompartmentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			if (!list["id"])
				return;

			CompartmentTypes.remove({_id: list["id"]});
			Compartments.remove({compartmentTypeId: list["id"]});
		}
	},

	addCompartmentTypeStyle: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var style = get_default_compartment_style(list["elementType"], list["editorType"]);
			CompartmentTypes.update({_id: list["id"]},
									{$push: 
										{styles: {
												id: generate_id(),
												name: list["attrValue"],
												style: style,
											}
										}
									});
		}
	},

	updateCompartmentTypeStyle: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) { 

			var update = {};
			update["styles." + list["styleIndex"] +"." + list["attrName"]] = list["attrValue"];

			CompartmentTypes.update({_id: list["id"]}, {$set: update});

			//if changing the styles attribute, then changing compartments as well
			if (list["attrName"] != "name") {

				var compart_update = {};
				compart_update[list["attrName"]] = list["attrValue"];

				//updating only compartments with styleId
				Compartments.update({compartmentTypeId: list["id"], styleId: list["styleId"]},
									{$set: compart_update}, {multi: true});
			}
		}
	},

	updateCompartmentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update[list["attrName"]] = list["attrValue"];

			CompartmentTypes.update({_id: list["id"]}, {$set: update}, {trimStrings: false});
		}
	},

	updateInputType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};

			update[list["attrName"]] = list["attrValue"];

			CompartmentTypes.update({_id: list["id"]}, {$set: update});
		}
	},

	insertTabWIthCompartmentType: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var tab_id = DialogTabs.insert(list["tab"]);
			CompartmentTypes.update({_id: list["compartmentTypeId"]},
										{$set: {dialogTabId: tab_id}});
		}
	},

	reorderCompartmentTypeTabIndexes: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];
			var compart_type_id = list["compartmentTypeId"];
			var tab_id = list["newTabId"];
			var tool_id = list["toolId"];
			
			//if tabs changed
			if (tab_id != list["oldTabId"]) {
				CompartmentTypes.update({_id: compart_type_id, toolId: tool_id},
										{$set: {dialogTabId: tab_id}});
			}

			var query = {toolId: tool_id, dialogTabId: tab_id};        	
        	if (prev_index < current_index) {
	       		CompartmentTypes.update({$and: [{tabIndex: {$gt: prev_index}},
        										{_id: {$ne: compart_type_id}}, query]},
        								{$inc: {tabIndex: current_index}}, {multi: true});
        	}
        	else {
        		CompartmentTypes.update({$and: [query,
        										{$or: [{tabIndex: {$gt: prev_index}},
        												{_id: compart_type_id}]}
        										]},
        								{$inc: {tabIndex: prev_index}},
        								{multi: true});
        	}

        	//if the index is gettting too big, then reseting
        	//if (prev_index > 1000) {
        	//	var compart_type = CompartmentTypes.findOne({toolId: tool_id, dialogTabId: tab_id},
        	//							{sort: {tabIndex: 1}});
        	//	if (compart_type) {
        	//		var min_tab_index = compart_type["tabIndex"];
        	//		CompartmentTypes.update({toolId: tool_id, dialogTabId: tab_id},
        	//								{$inc: {tabIndex: 1-min_tab_index}},
        	//								{multi: true});
        	//	}
        	//}
        }
    },

    addSelectionItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var push = {};
			push[list["attrName"]] = list["attrValue"];

			CompartmentTypes.update({_id: list["id"]}, {$push: push});
		}
	},

    updateSelectionItem: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var update = {};
			update["inputType.values." + list["index"] + "." + list["attrName"]] = list["attrValue"];

			CompartmentTypes.update({_id: list["id"]}, {$set: update});

			if (list["attrName"] == "elementStyle") {

				var style_id = list["attrValue"];
				if (style_id === "NoStyle")
					return;

				//getting the base style
				var elem_type = ElementTypes.findOne({elementId: list["elementId"]});
				if (!elem_type || !elem_type["styles"])
					return;

				//setting the new style id
				var style_update = {};
				style_update["styleId"] = style_id;

				//new style
				build_element_style_update(style_update, elem_type["styles"], style_id);

				//selecting element ids that need update
				var query = {input: list["input"], compartmentTypeId: list["id"]};

				var elem_ids = Compartments.find(query).map(
					function(compart) {
						return compart["elementId"];
				});	

				//updating elements
				Elements.update({_id: {$in: elem_ids}, styleId: {$ne: "custom"}},
								{$set: style_update}, {multi: true});

			}

			else if (list["attrName"] == "compartmentStyle") {

				var style_id = list["attrValue"];
				if (style_id === "NoStyle")
					return false;

				//setting the base style
				var compart_type = CompartmentTypes.findOne({_id: list["id"]});
				if (!compart_type || !compart_type["styles"])
					return;

				var style_update = {};
				style_update["styleId"] = style_id;

				var styles = compart_type["styles"];
				if (!styles)
					return false;

				build_compartment_style_update(style_update, styles, style_id);

				var query = {input: list["input"], compartmentTypeId: list["id"]};

				//updating only compartments with styleId
				Compartments.update(query, {$set: style_update}, {multi: true});
			}

			//updating compartment values or inputs
			else if (list["attrName"] == "value" || list["attrName"] == "input") {

				var query = {input: list["input"], compartmentTypeId: list["id"]};

				var compart_update = {};
				compart_update[list["attrName"]] = list["attrValue"];

				//updating compartments
				Compartments.update(query, {$set: compart_update}, {multi: true});
			}
		}
	},

	reorderCompartmentTypeIndexes: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id, list)) {

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];
			var compart_type_id = list["compartmentTypeId"];
			var query = {toolId: list["toolId"], diagramTypeId: list["diagramTypeId"]};
			if (list["elementTypeId"])
				query["elementTypeId"] = list["elementTypeId"];
			else
				query["elementTypeId"] = {$exists: false};

			var index;
        	if (prev_index < current_index) {
	       		CompartmentTypes.update({$and: [{index: {$gt: prev_index}},
        										{_id: {$ne: compart_type_id}}, query]},
        								{$inc: {index: current_index}}, {multi: true});
	       		index = current_index;
        	}
        	else {
        		CompartmentTypes.update({$and: [query,
        										{$or: [{index: {$gt: prev_index}},
        												{_id: compart_type_id}]}
        										]},
        								{$inc: {index: prev_index}},
        								{multi: true});
        		index = prev_index;
        	}

        	//updating compartments
			//Compartments.update({compartmentTypeId: compart_type_id},
			//						{$inc: {index: index}}, {multi: true});

        }
    },
    
});

function get_compartment_style_by_id(styles, id) {

	if (id === "NoStyle") {
		return;
	}

	for (var i=0;i<styles.length;i++) {
		var tmp_style = styles[i];
		if (tmp_style["id"] === id) {
			return tmp_style;
		}
	}
}

function build_compartment_style_update(update, styles, style_id) {

	var base_style_obj = styles[0];
	if (base_style_obj && base_style_obj["style"])
		for (var key in base_style_obj["style"])
			update["style." + key] = base_style_obj["style"][key];

	//selecting the new style
	var new_style_obj = get_compartment_style_by_id(styles, style_id);

	var new_style = new_style_obj["style"];

	//overraiding the base style
	for (var key in new_style)
		update["style." + key] = new_style[key];

}

function build_element_style_update(update, styles, style_id) {

	var base_style_obj = styles[0];
	if (base_style_obj && base_style_obj["style"]) {

		for (var key in base_style_obj["style"]["elementStyle"])
			update["style.elementStyle." + key] = base_style_obj["style"]["elementStyle"][key];

		for (var key in base_style_obj["style"]["startShapeStyle"])
			update["style.startShapeStyle." + key] = base_style_obj["style"]["startShapeStyle"][key];

		for (var key in base_style_obj["style"]["endShapeStyle"])
			update["style.endShapeStyle." + key] = base_style_obj["style"]["endShapeStyle"][key];
	}

	//selecting the new style
	var new_style_obj = get_element_style_by_id(styles, style_id);

	//overraiding the base style
	for (var key in new_style_obj["elementStyle"])
		update["style.elementStyle." + key] = new_style_obj["elementStyle"][key];

	for (var key in new_style_obj["startShapeStyle"])
		update["style.startShapeStyle." + key] = new_style_obj["startShapeStyle"][key];

	for (var key in new_style_obj["endShapeStyle"])
		update["style.endShapeStyle." + key] = new_style_obj["endShapeStyle"][key];
}

function get_element_style_by_id(styles, id) {

	if (id === "NoStyle")
		return;

	for (var i=0;i<styles.length;i++) {
		var tmp_style = styles[i];
		if (tmp_style["id"] === id) {
			return tmp_style;
		}
	}

}
