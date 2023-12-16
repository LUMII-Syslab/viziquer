import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { DiagramTypes, ElementTypes, CompartmentTypes, Elements } from '/imports/db/platform/collections'
import { fill_priorities } from '/imports/libs/platform/helpers';

var Configurator = {

	selectSelectionValue: function(e) {
		var src = $(e.target).closest(".dialog-selection");
		var id = src.attr("id");

		var value = src.find(" option:selected").text();
		if (src.attr("dataType") == "boolean") {
			if (value == "true") {
				value = true;
			}
			else {
				value = false;
			}
		}

		return {_attr: id, _value: value};
	},

	selectItem: function(items, value) {
		return _.map(items, function(item) {
			if (item["option"] == value) {
				item["selected"] = "selected";
			}
			return item;
		});
	},

	getInputFieldValue: function(e) {
		var src = $(e.target).closest(".dialog-input");

		var attr_name = src.attr("id");
		var val = src.val();

		var seperator = src.attr("seperator");
		if (seperator) {
			splitted_val = val.split(seperator);
			if (val == splitted_val) {
				splitted_val = val.split(",");
			}

			val = _.map(splitted_val, function(item) {
				return Number(item);
				// return convert_to_number(item);
			});
		}
		else {
			val = Number(val) || val;
		}

		return {_attr: attr_name, _value: val};
	},

	getDiagramTypeProperty: function(property) {
		var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
		if (diagram_type) {
			return diagram_type[property];
		}
	},

	getActiveElementExtension: function(extension_point_name) {
		var element_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (element_type) {

			var extension_point = _.find(element_type["extensionPoints"], function(extensionPoint) {
				return extensionPoint["extensionPoint"] === extension_point_name;
			});
				
			if (extension_point) {
				return extension_point.procedure;
			}
		}
	},


//Updates
	updateCompartmentType: function(list) {
		list["id"] = Session.get("compartmentTargetTypeId");

		Utilities.callMeteorMethod("updateCompartmentType", list);
	},

	updateDiagramFromInput: function(e, function_name) {
		return Configurator.updateElementFromInput(e, function_name);
	},

	updateObjectTypeObj: function(attr_name, attr_value) {

		var list = {
					toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),		
					attrName: attr_name,
					attrValue: attr_value
				};

	 	if (Session.get("activeElement")) {
	 	
	 		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
	 		if (elem_type) {
				_.extend(list, {diagramTypeId: Session.get("targetDiagramType"),
								id: elem_type["_id"],
							});
							
				Utilities.callMeteorMethod("updateElementType", list);
	 		}
		}

		else {
			_.extend(list, {id: Session.get("targetDiagramType")});
			Utilities.callMeteorMethod("updateDiagramType", list);
		}
	},

	updateElementFromInput: function(e, function_name) {
		var update = Configurator.getInputFieldValue(e);

		var list = {diagramId: Session.get("activeDiagram"),
					projectId: Session.get("activeProject"),
					toolId: Session.get("toolId"),
					update: update};

		//if there is an active element
		if (Session.get("activeElement")) {
			list["elementId"] = Session.get("activeElement");
		}

		//sets the proper version id
		if (Session.get("toolVersionId")) {
			list["versionId"] = Session.get("toolVersionId");
		}

		else if (Session.get("versionId")) {
			list["versionId"] = Session.get("versionId");
		}

		//updates element and target element type data
		Utilities.callMeteorMethod(function_name, list);

		return update;
	},

	updateObjectType: function(e) {
		var pair = Configurator.getInputFieldValue(e);
		var attr_name = pair["_attr"];
		var attr_value = pair["_value"];

		Configurator.updateObjectTypeObj(attr_name, attr_value);
	},

//Style
	updateElementStyleFromInput: function(e, style_type) {
		var pair = Configurator.getInputFieldValue(e);

		var attr_name = pair["_attr"];
		var attr_value = pair["_value"];

		//the default style
		style_type = style_type || "elementStyle";

		update_element_style_object(attr_name, attr_value, style_type);
	},

	updateElementStyleFromSelection: function(e, style_type) {
		var pair = Configurator.selectSelectionValue(e);
		var id = pair["_attr"];
		var value = pair["_value"];

		update_element_style_object(id, value, style_type);
	},

	getActiveElementStyleIndex: function() {
		var index = Session.get("activeStyleIndex");
		if (!index) {
			index = 0;
			Session.set("activeStyleIndex", index);
		}

		return index;
	},

	computeFillPriority: function(fill_priority) {

		//fill options
		var items = fill_priorities();
		Configurator.selectItem(items, fill_priority);

		return items;
	},

	getActiveElementStyleProperties: function() {
		var elem_id = Session.get("activeElement");

		//if element
		if (elem_id) {
			var elem_type = ElementTypes.findOne({elementId: elem_id});

			//if configurator's element
			if (elem_type) {
				var styles = elem_type["styles"];
				if (styles) {
					var index = Configurator.getActiveElementStyleIndex();
					var style = styles[index];
					if (style) {
						return style["elementStyle"];
					}
				}
			}

			//if diagram's element
			else {
				var obj = Elements.findOne({_id: elem_id});
				if (obj && obj["style"]) {
					return obj["style"]["elementStyle"];
				}
			}	
		}
	},

	getActiveCompartmentType: function() {
		return CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
	},

//keystrokes and conetext menues
	deleteKeystrokeOrItem: function(e, procedure_name, collection) {

		var pull = {};
		pull[collection["array"]] = {};

		//selecting attribute values
		var target_cell = $(e.target)
		var target_row_index = $(target_cell).closest("tr").attr("index");

		var table_rows = _.filter(target_cell.closest(".table-body").children(), function(row) {
							return $(row).attr("index") !== target_row_index;
						});

		//assigning for each attribute its value
		var table_data = _.map(table_rows, function(table_row, i) {

							var obj = {};

							_.each($(table_row).find("div"), function(cell_obj) {
								obj[$(cell_obj).attr("attribute")] = $(cell_obj).text();
							});

							return obj;
						});

		//element types
		if (collection["collection"] == "ElementTypes") {
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (elem_type) {
				var list = {id: elem_type["_id"],
							array: collection["array"],
							data: table_data,
						};
				Utilities.callMeteorMethod("deleteKeystrokeOrItem", list);
			}
		}

		//diagram types	
		else {
			var list = {id: Session.get("targetDiagramType"),
						array: collection["array"],
						data: table_data,
					};
			Utilities.callMeteorMethod("deleteDiagramTypeKeystrokeOrItem", list);
		}
	},

	getKeystrokesOrItems: function(collection_type) {

		var items;
		if (Session.get("activeElement")) {
			var target_elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (target_elem_type) {
				items = target_elem_type[collection_type];
			}
		}

		else {
			var taget_diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
			if (taget_diagram_type) {
				items = taget_diagram_type[collection_type];
			}
		}

		return _.map(items, function(item, i) {
			if (item) {
				item.index = i;
			}
			return item;
		});

	},

	addKeystrokeOrItem: function(e, procedure_name, collection) {
		var data = {};
		data[collection["array"]] = {};

		_.each(collection["fields"], function(field) {
			data[collection["array"]][field] = field.toLowerCase();
		});

		//element types
		if (collection["collection"] === "ElementTypes") {
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (elem_type) {
				var list = {id: elem_type["_id"], push: data};
				Utilities.callMeteorMethod("addKeystrokeOrItem", list);
			}
		}

		//diagram types
		else {
			var list = {id: Session.get("targetDiagramType"), push: data};
			Utilities.callMeteorMethod("addDiagramTypeKeystrokeOrItem", list);
		}
	},

	updateKeystrokeOrItem: function(e, procedure_name, collection) {
		var index = $(e.target).closest("tr").attr("index");
		var new_value = $(e.target).text();

		var field_update = {};
		field_update[collection["array"] + "." + index + "." + collection["field"]] = new_value;

		//element types
		if (collection["collection"] == "ElementTypes") {
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (elem_type) {
				var list = {id: elem_type["_id"], field: field_update};
				Utilities.callMeteorMethod("updateKeystrokeOrItem", list);
			}
		}

		//diagram types	
		else {
			var list = {id: Session.get("targetDiagramType"), field: field_update};
			Utilities.callMeteorMethod("updateDiagramTypeKeystrokeOrItem", list);
		}
	},

};


function update_element_style_object(attr_name, attr_value, style_type) {

	var list = {attrName: style_type + "." + attr_name,
				attrValue: attr_value,
			};

	//checking if the element is in the configurator
	var target_elem_type = ElementTypes.findOne({elementId: Session.get("activeElement"),});
	if (Session.get("activeElement") && target_elem_type) {
		list["id"] = target_elem_type["_id"];
		list["styleIndex"] = Configurator.getActiveElementStyleIndex();
		list["type"] = target_elem_type["type"];
		list["toolId"] = Session.get("toolId");
		list["styleId"] = target_elem_type["styles"][list["styleIndex"]]["id"];
		list["elementId"] = Session.get("activeElement");		

		Utilities.callMeteorMethod("updateElementTypeStyle", list);
	}

	//updating the presentation element
	else {
		list["elementId"] = Session.get("activeElement");
		list["diagramId"] = Session.get("activeDiagram");
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");		
		list["styleId"] = "custom";	

		Utilities.callMeteorMethod("updateElementStyle", list);
	}
}


export {Configurator}
