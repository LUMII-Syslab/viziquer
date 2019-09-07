
Meteor.methods({

	importConfiguration: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			if (list.data && list.data.diagramTypes) {

				ImportTDAConfiguration.init(list, user_id);
				var ids = ImportTDAConfiguration.importDiagramTypes(user_id);

				ImportTDAConfiguration.addVQProperties(ids);
			}

			else if (list.data && list.data.types) {
				Meteor.call("importAjooConfiguration", list);
			}
			else { 
                var user_id = Meteor.userId();
                if (is_project_version_admin(user_id, list)) {
				    console.log("Liekam iekšā")
					console.log(Services.find({toolId: list.toolId }).count())
					console.log(list.toolId)
					Services.remove({toolId: list.toolId});
					console.log(Services.find({toolId: list.toolId }).count())
					var data = list.data;
					var services = _.extend(data, {toolId: list.toolId});
					Services.batchInsert([services]); 
					console.log(Services.find({toolId: list.toolId }).count())
				}
				
			}

		}
	},

});

var ImportTDAConfiguration = {

	init: function(list, user_id) {

		var self = this;

		self.toolData = {toolId: list.toolId, versionId: list.versionId};
		self.data = list.data;

		self.userId = user_id;
		self.time = new Date();


		self.mappings = {};


		//selecting configurator diagram type
		var config_dgr_type = DiagramTypes.findOne({name: "_ConfiguratorDiagramType"});
		if (!config_dgr_type) {
			return;
		}

		self.configuratorDiagramType = config_dgr_type;
		var config_dgr_type_id = config_dgr_type._id;

		//configurator types
		var line_type = ElementTypes.findOne({diagramTypeId: config_dgr_type_id, name: "Line"});	
		var box_type = ElementTypes.findOne({diagramTypeId: config_dgr_type_id, name: "Box"});

		if (!box_type || !line_type) {
			return;
		}

		self.configuratorLineType = line_type;
		self.configuratorBoxType = box_type;

		var box_compart_type_name = CompartmentTypes.findOne({name: "Name", elementTypeId: box_type._id});
		self.configuratorBoxCompartmetmentType = box_compart_type_name;
	},

	importDiagramTypes: function() {

		var self = this;

		return _.map(this.data.diagramTypes, function(diagram_type_in) {
						var target_diagram = self.buildDiagramPresentation(diagram_type_in);
						var _id = self.buildDiagramType(diagram_type_in, target_diagram);
						return _id;
					});
	},

	buildDiagramPresentation: function(diagram_type_in) {

		var self = this;

		//building diagram style
		var target_diagram_style = self.buildDiagramDefaultStyle();	
		var style_overriding = {fill: diagram_type_in["style"]["bkgColor"]};

		_.extend(target_diagram_style, style_overriding);

		//adding diagram
		var target_diagram = {
								name: diagram_type_in.attributes["id"],
								diagramTypeId: self.configuratorDiagramType._id,
								style: target_diagram_style,

								createdAt: self.time,
								createdBy: self.userId,
								editorType: "ajooEditor",

								imageUrl: "http://placehold.it/770x347",
								parentDiagrams: [],
								allowedGroups: [],
								editing: {},
								seenCount: 0,
							};

		_.extend(target_diagram, self.toolData);

		self.newDiagramId = Diagrams.insert(target_diagram);

		return target_diagram;
	},

	buildDiagramType: function(diagram_type_in, target_diagram) {

		var self = this;

		//adding diagram type
		var target_diagram_type = {};
		build_initial_diagram_type(target_diagram_type);

		var diagram_type_override = {
								createdAt: self.time,
								createdBy: self.userId,
								diagramId: self.newDiagramId,
								name: diagram_type_in.attributes["id"],
								editorType: "ajooEditor",
								style: target_diagram.style,
							};

		_.extend(target_diagram_type, diagram_type_override);
		_.extend(target_diagram_type, self.toolData);

		//context menus
		self.addContextMenu(target_diagram_type, diagram_type_in, "noCollectionContextMenu");
		self.addContextMenu(target_diagram_type, diagram_type_in, "collectionContextMenu");

		//keystrokes
		self.addKeystrokes(diagram_type_in, target_diagram_type, "noCollectionKeyStrokes");
		self.addKeystrokes(diagram_type_in, target_diagram_type, "collectionKeyStrokes");

		//toolbar
		self.addToolbar(diagram_type_in, target_diagram_type);

		//extension points
		var translet_collection = [];
		self.addTranslets(diagram_type_in, target_diagram_type, translet_collection);

		self.newDiagramTypeId = DiagramTypes.insert(target_diagram_type);
		
		self.insertTranslets(translet_collection, target_diagram_type, self.newDiagramTypeId);

		//adding elements and element types
		self.addElementTypes(diagram_type_in["elementTypes"]);
		self.addSpecializations(diagram_type_in["specializations"]);

		return self.newDiagramTypeId;
	},


	buildDiagramDefaultStyle: function() {
		return diagram_default_style();
	},

	addContextMenu: function(obj_type_obj, obj_type, name) {

		var self = this;

		var not_needed_items = self.getNotNeededItems();
		var transformed_items = self.getTransformedItems();

		var items = [];
		_.each(obj_type[name], function(menu) {

		 	var procedure_name = menu["procedureName"];

		 	if (not_needed_items[procedure_name]) {
		 		return;
		 	}

		 	else if (transformed_items[procedure_name]) {
		 		procedure_name = transformed_items[procedure_name];
		 	}

	 		var procedure_name = procedure_name || "";
			var new_proc_name = _.last(procedure_name.split("."));

		 	//context_menu_list.push({item: menu["caption"], procedure: procedure_name});
		 	items.push({item: menu["caption"], procedure: new_proc_name});
		});

		obj_type_obj[name] = items;
	},

	addElementTypes: function(elem_types_in) {

		var self = this


		var refs = {};
		var target_refs = {};

		_.each(elem_types_in, function(elem_type_in, i) {

			var target_element = self.buildingElementPresentation(elem_type_in);
			var target_type = self.buildingElementType(elem_type_in, target_element);

			//dialog
			self.addDialog(target_type, elem_type_in);

			if (!target_type["isAbstract"]) {

				//palette button
				var palette_button = {
										diagramTypeId: self.newDiagramTypeId,
										diagramId: self.newDiagramId,
										elementTypeIds: [self.newElementTypeId],
										name: elem_type_in["attributes"]["caption"],
										type: target_type.type,
										index: i,
									};

				_.extend(palette_button, self.toolData);

				PaletteButtons.insert(palette_button);
			}

			//compartment types			
			self.addCompartmentTypes(target_type, elem_type_in);

		});

		//PaletteButtons.batchInsert(palette_buttons);
	},

	buildingElementPresentation: function(elem_type_in) {

		var self = this;

		var target_element = {};

		if (elem_type_in["className"] == "NodeType" || elem_type_in["className"] == "FreeBoxType") {			
			target_element = self.loadNode(elem_type_in.presentation);
			self.addBoxCompartment(elem_type_in, target_element);
		}

		else if (elem_type_in["className"] == "EdgeType") {
		 	//load_edge(elem, elem_type_id, element_mappings, element_list, config_dgr_type_id, refs, target_refs);
		 	target_element = self.loadEdge(elem_type_in.presentation);
		}
		
		else {
			console.error("Not supported className: ", elem_type_in["className"]);
			return;	
		}

		return target_element;
	},

	buildingElementType: function(elem_type_in, target_element) {

		var self = this;

		var target_type = build_initial_element_type(target_element, "ajooEditor");

		var attrs = elem_type_in.attributes;

		//overriding the intitial values
		var overriding = {diagramTypeId: self.newDiagramTypeId,
							name: attrs.caption,
							isAbstract: elem_type_in.isAbstract,
							elementId: self.newElementId,
						};

		_.extend(target_type, overriding);
		_.extend(target_type, self.toolData);

		if (target_element.type == "Line") {

			//by default line is directional and orthogonal
			var direction_list = {UniDirectional: "Directional",
									BiDirectional: "BiDirectional",
									ReverseBiDirectional: "ReverseDirectional",
								};

			var element_type_mapping = self.mappings;

			var line_overriding = {direction: direction_list[elem_type_in.attributes["direction"]],
									lineType: "Orthogonal",
									startElementTypeId: element_type_mapping[elem_type_in["startElementTypeId"]],
									endElementTypeId: element_type_mapping[elem_type_in["endElementTypeId"]],
								};

			_.extend(target_type, line_overriding);
		}

		//styles
		self.addElementStyle(target_type, elem_type_in);

		//keystrokes
		self.addKeystrokes(elem_type_in, target_type, "keyStrokes");

		//context menu
		self.addContextMenu(elem_type_in, target_type, "contextMenu");

		//extension points
		var translet_collection = [];
		self.addTranslets(elem_type_in, target_type, translet_collection);

		//adding element type
		var new_elem_type_id = ElementTypes.insert(target_type);

		self.insertTranslets(translet_collection, target_type, new_elem_type_id);

		self.mappings[elem_type_in.repId] = new_elem_type_id;
		self.newElementTypeId = new_elem_type_id;

		return target_type;
	},

	addSpecializations: function(specializations, element_type_mapping, element_mappings, diagram_id, diagram_type_id, config_dgr_type_id) {

		var self = this;

		var elem_type = ElementTypes.findOne({diagramTypeId: config_dgr_type_id, name: "Specialization"});
		if (!elem_type) {
			return;
		}

		var specialization_id = elem_type["_id"];
		var list = {};
		_.each(specializations, function(specialization) {

			var sub_type_id_in = specialization["subTypeId"];
			var super_type_id_in = specialization["superTypeId"];

			var sub_type_id = element_type_mapping[sub_type_id_in];
			var super_type_id = element_type_mapping[super_type_id_in];

			if (list[sub_type_id]) {
				list[sub_type_id].push(super_type_id);
			}

			else {
				list[sub_type_id] = [super_type_id]
			}

			var edge = specialization["edge"];

			edge["style"] = undefined;

			var element_list = {diagramId: diagram_id,};

			_.extend(element_list, self.toolData);

		  	self.loadEdge(edge);
		});

		_.each(list, function(item, key) {
			ElementTypes.update({_id: key}, {$set: {superTypeIds: item}});
		});
	},	

	addDialog: function(target_type, elem_type_in) {

		var self = this;

		var prop_diagram = elem_type_in["propertyDiagram"];

		var tabs = prop_diagram["propertyTabs"];
		var rows = prop_diagram["rows"];

		//if there is no tabs or there are rows on the main tab
		if (!tabs || rows) {
			if (!tabs) {
				tabs = {};
			}

			tabs["noTab"] = {id: "Main"};
		}

		var i = 0;
		_.each(tabs, function(tab) {

			//setting tab properties
		 	var dialog_tab = {
		 					diagramId: self.newDiagramId,
		 					diagramTypeId: self.newDiagramTypeId,
		 					elementTypeId: self.newElementTypeId,
		 					name: tab["id"],
		 					index: i++,
		 				};

		 	_.extend(dialog_tab, self.toolData);

		 	//inserting the tab
		 	var tab_id = DialogTabs.insert(dialog_tab);

		 	//mapping the old tab id to the new one
		 	self.mappings[tab.repId] = tab_id;
		});
	},

	addToolbar: function(type_in, target_type) {

		var toolbar_list = _.map(type_in["toolbar"], function(item) {

								var proc_name = item["procedureName"] || "";
								var new_proc_name = _.last(proc_name.split("."));

							 	return {name: item["caption"],
										id: generate_id(),
										icon: item.icon || "fa-gear",
										procedure: new_proc_name,
										template: item["template"],
									};
							});

		_.each(target_type["toolbar"], function(item) {
			toolbar_list.push(item);
		});

		target_type["toolbar"] = toolbar_list;
	},

	addKeystrokes: function(target_type, type_in, name) {

		var self = this;

		var not_needed_items = self.getNotNeededItems();
		var transformed_items = self.getTransformedItems();

		var key_strokes_list = [];
		_.each(type_in[name], function(key_stroke, key) {

		 	var procedure_name = key_stroke["procedureName"];

		 	if (not_needed_items[procedure_name]) {
		 		return;
		 	}

		 	else if (transformed_items[procedure_name]) {
		 		procedure_name = transformed_items[procedure_name];
		 	}

		 	var procedure_name = procedure_name || "";
			var new_proc_name = _.last(procedure_name.split("."));

			key_strokes_list.push({keyStroke: key_stroke["key"],
									procedure: new_proc_name});
			
		});

		target_type[name] = key_strokes_list;
	},


	getNotNeededItems: function() {
		return {
				"interpreter.Properties.Properties": true,
				"utilities.symbol_style": true,
				"utilities.Reroute": true,
			};
	},

	getTransformedItems: function() {
		return  {
				"interpreter.Delete.Delete": "Delete",
				"interpreter.CutCopyPaste.Cut": "Cut",
				"interpreter.CutCopyPaste.Copy": "Copy",
				"interpreter.CutCopyPaste.Paste": "Paste",
			};
	},

	addCompartmentTypes: function(target_type, elem_type_in) {

		var self = this;

		var rows2 = {};

		var prop_diagram = elem_type_in["propertyDiagram"];
		self.collectPropTabsAndRows(prop_diagram);

		var old_new_rows_map = self.getOldNewRowsMap();

		var dialog_tab_id;

		var is_edge;
		if (target_type["type"] == "Line") {
			is_edge = true;
		}

		_.each(elem_type_in["compartmentTypes"], function(compart_type_in, i) {

			//selecting the compartment type properties
			var translets_collection = [];

			//building the initial compart type
			var target_compart_type = {elementTypeId: self.newElementTypeId,
										diagramTypeId: self.newDiagramTypeId,
										diagramId: self.newDiagramId,
										elementId: self.newElementId,
										tabIndex: i,
										index: i,
									};
			_.extend(target_compart_type, self.toolData);

			build_initial_compartment_type(target_compart_type, target_type["type"], "ajooEditor");

			//overriding the initial compart type
			var attributes_json = compart_type_in["attributes"];
			target_compart_type["name"] = attributes_json["caption"];

			if (attributes_json["startValue"]) {
				target_compart_type["defaultValue"] = attributes_json["startValue"];
			}

			if (attributes_json["adornmentPrefix"]) {
				target_compart_type["prefix"] = attributes_json["adornmentPrefix"];
			}

			if (attributes_json["adornmentSuffix"]) {
				target_compart_type["suffix"] = attributes_json["adornmentSuffix"];
			}

			if (attributes_json["concatStyle"]) {
				target_compart_type["concatStyle"] = attributes_json["concatStyle"];
			}

			//styles
			self.addCompartmentTypeStyles(target_compart_type, compart_type_in, is_edge);

			//row
			var old_row_id = compart_type_in["rowId"];
			var old_tab_id = compart_type_in["tabId"];

			//if the compartment was linked with a row
			if (old_row_id) {

				var row = self.mappings[old_row_id];

				//if there is such a row (should be always true)
				if (row) {

					var row_type = row["rowType"];
					var new_row_type;
					if (row_type == "ComboBox" && row.isEditable == "true" ) {
						new_row_type = "combobox";
					}

					else {
						var old_new_rows_map = self.getOldNewRowsMap();
						new_row_type = old_new_rows_map[row_type];

					}


					//if there is no row type, then the default is input (this should never happen)
					if (!new_row_type) {
						new_row_type = "custom";
					}

					//if there is inputType and type (this should always be true)
					if (target_compart_type["inputType"] && target_compart_type["inputType"]["type"]) {

						target_compart_type["inputType"]["type"] = new_row_type;

						//if textarea, then setting the area size
						if (new_row_type == "textarea")
							target_compart_type["inputType"]["rows"] = 3;

						if (new_row_type == "selection" || new_row_type == "checkbox" || new_row_type === "combobox" || new_row_type === "radio") {

							var values = self.transformChoiceItems(compart_type_in, target_compart_type);
							target_compart_type["inputType"]["values"] = values;
						}

						if (row_type == "TextArea+Button") {
							target_compart_type["inputType"]["templateName"] = "multiField";

							dialog_tab_id = self.addSubCompartmentTypes(target_compart_type, compart_type_in, translets_collection);
						}

					}
				}

				else {
					console.error("ERROR: No new row id");
				}
			}

			else {
				target_compart_type["inputType"]["type"] = "custom";
				target_compart_type["inputType"]["templateName"] = "value_from_subcompartments";

				target_compart_type["data"] = {subCompartmentTypes: compart_type_in["subCompartments"]};
				
				dialog_tab_id = self.addSubCompartmentTypes(target_compart_type, compart_type_in, translets_collection);
			}

			//adding dialog tab
			var old_tab_id = compart_type_in["tabId"];
			if (old_tab_id || dialog_tab_id) {

				var new_tab_id = self.mappings[old_tab_id];
				if (!new_tab_id) {
					target_compart_type["dialogTabId"] = dialog_tab_id;
				}

				else if (new_tab_id) {
					target_compart_type["dialogTabId"] = new_tab_id; //tab["_id"];
				}
			}

			//if there is no row, but the compartment type was linked to a row
			else {
				if (old_row_id) {

					var tab = DialogTabs.findOne({toolId: target_compart_type["toolId"],
												elementTypeId: target_compart_type["elementTypeId"]},
												{sort: {index: -1}});

					target_compart_type["dialogTabId"] = tab["_id"];
				}

			}

			//translets
			var translet_collection = [];
			self.addTranslets(compart_type_in, target_compart_type, translet_collection);

			//adding the compart type
			var new_compart_type_id = CompartmentTypes.insert(target_compart_type, {removeEmptyStrings: false});

			//compartment transelets
			self.insertTranslets(translet_collection, target_compart_type, new_compart_type_id);

			//subcompartment translets
			_.each(translets_collection, function(item) {
				self.insertTranslets(item["translets"], target_compart_type, new_compart_type_id, item["id"]);
			});

		});

	},

	addElementStyle: function(target_type, elem_type_in) {

		var self = this;

		_.each(elem_type_in["styles"], function(style_in, i) {

			//if there is a style obj, overriding the default properties
			if (i == 0) {

				var style_out = target_type["styles"][0];

				var new_style_obj = target_type["styles"][i];

				self.mappings[style_in.repId] = new_style_obj.id;

				ImportTDAData.transformElementStyle(style_in, style_out);
			}

			//creating a new style obj
			else {

				var style_name = style_in["id"];

				var new_style_obj = {id: generate_id(), name: style_name, };

				self.mappings[style_in.repId] = new_style_obj.id;

				if (target_type["type"] == "Box") {
					new_style_obj.elementStyle = {}
					_.extend(new_style_obj.elementStyle, build_initial_box_style("ajooEditor"))
				}

				else if (target_type["type"] == "Line") {
					_.extend(new_style_obj, build_initial_line_style("ajooEditor"));
				}

				ImportTDAData.transformElementStyle(style_in, new_style_obj);

				target_type["styles"].push(new_style_obj);
			}

		});

	},

	addCompartmentTypeStyles: function(target_compart_type, compart_type_in, is_edge) {

		var self = this;

		_.each(compart_type_in["styles"], function(style_in, i) {

			//selecting the style object
			if (i == 0) {

				var style_out = target_compart_type["styles"][0].style;

				var new_style_obj = target_compart_type["styles"][i];
				self.mappings[style_in.repId] = new_style_obj.id;

				self.transformCompartmentStyle(style_in, style_out, is_edge);
			}

			//creating a new style obj
			else {

				var style_name = style_in["id"];		

				var new_style_obj = {id: generate_id(), name: style_name, style: {}};

				self.mappings[style_in.repId] = new_style_obj.id;

				var type = "Box";
				if (is_edge) {
					type = "Line";
				}

				_.extend(new_style_obj.style, get_default_compartment_style(type, "ajooEditor"));

				self.transformCompartmentStyle(style_in, new_style_obj.style, is_edge);

				target_compart_type["styles"].push(new_style_obj);
			}

		});
	},

	loadNode: function(presentation) {

		var self = this;
		var elem_type = self.configuratorBoxType;

		var style_out = elem_type["styles"][0];
		ImportTDAData.transformBoxStyle(presentation["style"], style_out);

		var target_element = {
							diagramId: self.newDiagramId,

							type: "Box",
							location: ImportTDAData.transformNodeLocation(presentation.location),
							styleId: elem_type["styles"][0]["id"],

							elementTypeId: elem_type._id,
							diagramTypeId: self.configuratorDiagramType._id,

							style: style_out,
						};

		_.extend(target_element, self.toolData);
					
		var id = Elements.insert(target_element);

		self.mappings[presentation["id"]] = id;
		self.newElementId = id;

		return target_element;
	},

	addBoxCompartment: function(elem_type_in, target_element) {

		var self = this;

		var compart = build_compartment(self.configuratorBoxCompartmetmentType, target_element);

		//overriding the defaults
		var overriding = {value: elem_type_in["attributes"]["caption"],
							valueLC: compart["value"].toLowerCase(),
							input: compart["value"],

							elementId: self.newElementId,
						};

		_.extend(compart, overriding);

		Compartments.insert(compart);
	},


	loadEdge: function(edge) {

		var self = this;
		var elem_type = self.configuratorLineType;

		//transforming points
		var points = [];
		_.each(edge["location"], function(point) {
			var x = Number(point["xPos"]);
			var y = Number(point["yPos"]);

			if (x && y) {
				points.push(x);
				points.push(y);
			}
		});

		//selecting style
		var style_in = edge["style"];
		var style_obj = elem_type["styles"][0];
		var style_out = {elementStyle: style_obj["elementStyle"] || {},
							startShapeStyle: style_obj["startShapeStyle"] || {},
							endShapeStyle: style_obj["endShapeStyle"] || {},
						};

		ImportTDAData.transformLineStyle(style_in, style_out);

		var element_mappings = self.mappings;

		var target_element = {
						diagramId: self.newDiagramId,

						type: "Line",
						//location: transform_node_location(presentation.location),
						points: points,
						startElement: element_mappings[edge["start_elem_id"]],
						endElement: element_mappings[edge["end_elem_id"]],

						styleId: elem_type["styles"][0]["id"],

						elementTypeId: elem_type._id,
						diagramTypeId: self.configuratorDiagramType._id,

						style: style_out,
					};

		_.extend(target_element, self.toolData);
					
		var id = Elements.insert(target_element);

		self.mappings[edge["id"]] = id;
		self.newElementId = id;

		return target_element;
	},

	addTranslets: function(obj_type_in, obj_type_type, translet_collection) {

		var remove_translets = {
							l2ClickEvent: true,
							procProperties: true,
							//procDeleteElement: true, //This is ????
							//procCopied: true,
						};

		var transform_translet = {
							procCreateElementDomain: "afterCreateElement",
							procNewElement: "afterCreateElement",

							procGenerateItemsClickBox: "dynamicDropDown",
							procDynamicPopUpE: "dynamicNoCollectionContextMenu",
							procDynamicPopUpC: "dynamicCollectionContextMenu",
							procFieldEntered: "afterUpdate",

							procGetPrefix: "dynamicPrefix",
							procGetSuffix: "dynamicSuffix",

							procGenerateInputValue: "dynamicDefaultValue",
						};

		var transformed_proc_names = {	
									"OWL_specific.annotation_types": "annotation_types",
									"OWL_specific.language_values": "language_values",
									"OWL_specific.get_object_ns": "get_object_ns",
									"OWL_specific.get_class_names_for_object": "get_class_names_for_object",
									"OWL_specific.default_types": "default_types",
									"OWL_specific.get_namespaces": "get_namespaces",
									"OWL_specific.get_properties": "get_properties",
									"OWL_specific.get_attribute_ns": "get_attribute_ns",
									"OWL_specific.default_types": "default_types",
									"OWL_specific.default_multiplicity": "default_multiplicity",
									"OWL_specific.class_name_from_ns": "class_name_from_ns",
									"OWL_specific.get_generalization_ns": "get_generalization_ns",
									"OWL_specific.role_name_from_ns": "role_name_from_ns",
									"OWL_specific.get_link_ns": "get_link_ns",


									"transformations.setClassTypeValue": "",
									"transformations.setEnabledFieldsFromClassTypeChange": "",

									"transformations.getClassNames": "",
									"transformations.setInstance": "",
									"transformations.setShowInstanceName": "",
									"transformations.attributeGrammar": "",									

									"transformations.setIsNegationAttribute": "",
									"transformations.setIsOptionalAttribute": "",			
									"transformations.getAttributeNames": "",
								

									//setIsGroup
									//setIsCondition
									//setIsOptional
									//setIsNegation
									//getAssociationIsInverse
									//setSubQueryInverseLink
									//getAssociationName
									//setIsInverse
									//getAssociationNames
									//setSubQueryNameSuffix
									//getAttributeNames
									//setIsOptionalAttribute
									//setIsNegationAttribute
									//attributeGrammar
									//setShowInstanceName
									//setInstance
									//getClassNames
									//setEnabledFieldsFromClassTypeChange
									//setClassTypeValue
								};

		var translets_list = obj_type_type["extensionPoints"];

		_.each(obj_type_in["translets"], function(translet) {

		 	var extension_point = translet["extensionPoint"];
		 	if (remove_translets[extension_point]) {
		 		return;
		 	}

		 	if (transform_translet[extension_point]) {
		 		extension_point = transform_translet[extension_point];
		 	}


			var proc_name = translet["procedureName"];
		 	var tmp_proc_name = transformed_proc_names[translet["procedureName"]];
		 	if (!_.isUndefined(tmp_proc_name)) {
		 		proc_name = tmp_proc_name;
		 	}

		 	var found_translet = _.find(translets_list, function(tmp_translet) {
		 		if (tmp_translet["extensionPoint"] == extension_point) {
		 			return true;
		 		}
		 	});


		 	if (found_translet) {
		 		found_translet.procedure = proc_name;
		 	}
		 	else {
		 		translets_list.push({extensionPoint: extension_point, procedure: proc_name,});
		 	}

	 		if (translet["procedureName"] !== proc_name) {

				var proc_name = translet["procedureName"] || "";
				var new_proc_name = _.last(proc_name.split("."));

	 			translet_collection.push({extensionPoint: extension_point,
	 										procedureName: new_proc_name});
	 		}

		});

		obj_type_type["extensionPoints"] = translets_list;
	},

	//add_sub_compartment_types
	addSubCompartmentTypes: function(target_compart_type, compart_type_in, translets_collection) {

		var self = this;

		var dialog_tab_id;

		target_compart_type["subCompartmentTypes"] = _.map(compart_type_in["subCompartments"], function(sub_compart_in) {

			var attrs_in = sub_compart_in["attributes"];
			var sub_compart_type = {_id: generate_id(),
									name: attrs_in["caption"],
									extensionPoints: [],
									prefix: attrs_in["adornmentPrefix"],
									suffix: attrs_in["adornmentSuffix"],
									defaultValue: attrs_in["startValue"],
								};

			var translet_collection = [];
			self.addTranslets(sub_compart_in, sub_compart_type, translet_collection);

			if (translet_collection.length > 0) {
				translets_collection.push({id: sub_compart_type["_id"], translets: translet_collection});
			}

			//insert_translets(translet_collection, base_compart_type, base_compart_type["_id"], sub_compart_type["_id"]);

			if (sub_compart_in["rowId"]) {

				var row = self.mappings[sub_compart_in["rowId"]];
				if (row) {
					sub_compart_type["inputType"] = {};

					var old_new_rows_map = self.getOldNewRowsMap();
					var new_row_type = old_new_rows_map[row["rowType"]];

					if (row["rowType"] == "ComboBox" && row.isEditable == "true" ) {
						new_row_type = "combobox";
					}

					sub_compart_type["inputType"]["type"] = new_row_type;

					if (new_row_type == "textarea") {
						sub_compart_type["inputType"]["rows"] = 3;
					}

					if (new_row_type == "checkbox") {

						var values = self.transformChoiceItems(sub_compart_in, target_compart_type);
						sub_compart_type["inputType"]["values"] = values;
					}

					if (row["rowType"] == "TextArea+Button") {
						sub_compart_type["inputType"]["type"] = "custom";
						sub_compart_type["inputType"]["templateName"] = "multiField";
					}


					//adding dialog tab
					var old_tab_id = sub_compart_in["tabId"];
					if (old_tab_id) {

						var new_tab_id = self.mappings[old_tab_id];
						if (new_tab_id) {
							sub_compart_type["dialogTabId"] = new_tab_id;
							dialog_tab_id = new_tab_id;
						}
					}
				}

				else {

					sub_compart_type["inputType"] = {};
					sub_compart_type["inputType"]["type"] = "input";
				}
			}

			var tmp_tab_id = self.addSubCompartmentTypes(sub_compart_type, sub_compart_in, translets_collection);
			dialog_tab_id = tmp_tab_id || dialog_tab_id;
	
			return sub_compart_type;
		});

		return dialog_tab_id; 
	},

	transformCompartmentStyle: function(style, style_out, is_edge) {

		//overriding style properties
		style_out["fontFamily"] = style["fontTypeFace"];
		style_out["fill"] = style["fontColor"];

		if (Math.abs(Number(style["fontSize"]))) {
			style_out["fontSize"] = Math.abs(Number(style["fontSize"])) + 3;
		}

		var aligns = {	"0": "left",
						"1": "center",
						"2": "right",
					};

		style_out["align"] = aligns[style["alignment"]] || "left";

		//visibility
		style_out["visible"] = Number(style["isVisible"]) == 1 ? true : false;

		//fonts
		var font_styles = {	"0": "normal",
							"1": "bold",
							"2": "italic",
						};

		style_out["fontStyle"] = font_styles[style["alignment"]] || "normal";

		//	 lc_Start = 1, 
		//   lc_End = 2, 

		//   lc_Left = 4, 
		//   lc_Right = 8, 

		//   lc_Middle = 16,
		//   lc_Inside = 32 
		//   lc_Any =

		if (is_edge) {

			var placements = {
							"5": "start-left",
							"9": "start-right",
							"6": "end-left",
							"10": "end-right",
							"20": "middle-left",
							"24": "middle-right",
						};

			style_out["placement"] = placements[style["adjustment"]] || "start-left";			
		}
		
		style_out["strokeWidth"] = style["lineWidth"] || style_out["strokeWidth"];

		return style_out;
	},


	//function insert_translets(translet_collection, obj_type, obj_type_id, sub_compart_type_id) {
	insertTranslets: function(translet_collection, obj_type, obj_type_id, sub_compart_type_id) {

		var translets_out = _.map(translet_collection, function(translet) {

			var item = {extensionPoint: translet["extensionPoint"],
						procedureName: translet["procedureName"],
						toolId: obj_type["toolId"],
						versionId: obj_type["versionId"],
					};

			//if compartment type
			if (obj_type["diagramTypeId"] && obj_type["elementTypeId"]) {

				var tmp = {
							diagramTypeId: obj_type["diagramTypeId"],
							elementTypeId: obj_type["elementTypeId"],
							compartmentTypeId: obj_type_id,
						};

				if (sub_compart_type_id) {
					tmp["subCompartmentTypeId"] = sub_compart_type_id;
				}

				_.extend(item, tmp);	
			}

			//if element type
			else if (obj_type["diagramTypeId"]) {
				var tmp = {diagramTypeId: obj_type["diagramTypeId"],
							elementTypeId: obj_type_id,
						};

				_.extend(item, tmp);
			}

			//if compartment type
			else {
				var tmp = {diagramTypeId: obj_type_id};
				_.extend(item, tmp);
			}

			return item;
		});

		if (translets_out.length > 0) {
			//ImportedTranslets.batchInsert(translets_out);
		}
	},
	
	findCompartmentStyleByName: function(styles, style_name) {

		var style = _.find(styles, function(style_obj) {
			return style_obj.repId === style_name;
		});

		if (style) {
			return style.style;
		}
	},

	findElementStyleByName: function(styles, style_name) {		
		return _.find(styles, function(style_obj) {
			return style_obj.repId === style_name;
		});
	},

	transformChoiceItems: function(compart_type_in, target_compart_type) {

		var self = this;
		var elem_type_id = self.newElementTypeId;

		return _.map(compart_type_in["choiceItems"], function(item_obj) {

			var compart_style = "NoStyle";
			if (item_obj["compartmentStyle"]) {
				var compart_style_name = item_obj["compartmentStyle"];

				compart_style = self.mappings[compart_style_name];
			}

			var elem_style = "NoStyle";
			if (item_obj["elementStyle"]) {
				var elem_style_name = item_obj["elementStyle"];

				var tmp_elem_type = ElementTypes.findOne({_id: elem_type_id});
				if (tmp_elem_type) {
					var elem_styles = tmp_elem_type["styles"];

					elem_style = self.mappings[elem_style_name];
				}
			}

			var val = "";
			if (item_obj["notation"]) {
				val = item_obj["notation"];
			}

			return {compartmentStyle: compart_style,
					elementStyle: elem_style,
					input: item_obj["value"],
					value: val,
				};
		});

	},

	collectPropTabsAndRows: function(prop_diagram) {

		var self = this;

		if (!prop_diagram) {
			return;
		}

		//collecting rows that are on the diagram
		var rows = prop_diagram["rows"];
		self.collectRows(rows);

		//collecting tabs and its rows
		var tabs = prop_diagram["propertyTabs"];
		if (tabs) {

			_.each(tabs, function(tab) {
				var tab_rows = tab["rows"];
				self.collectRows(tab_rows);
			});
		}
	},

	collectRows: function(rows) {

		var self = this;

		_.each(rows, function(row) {
		
			self.mappings[row.repId] = row;

			var prop_dgr = row["propertyDiagram"];
			self.collectPropTabsAndRows(prop_dgr)
		});
	},

	getOldNewRowsMap: function() {

		return {
				InputField: "input",
				TextArea: "textarea",
				ComboBox: "selection",
				CheckBox: "checkbox",
				Radio: "radio",
				//"TextArea+Button": "multiField",
			};
	},

	addVQProperties: function(ids) {

		var id = ids[0];
		var diagram_type = DiagramTypes.findOne({_id: id,});
		if (!diagram_type) {
			console.error("No diagram type inserted");
			return;
		}

		var diagram_type_id = diagram_type._id;

		var no_collection_menu = diagram_type.noCollectionContextMenu;
		var no_menu_item = _.find(no_collection_menu, function(menu) {
			return menu.item == "Generate SPARQL";
		});

		if (no_menu_item) {
			no_menu_item.procedure = "GenerateSPARQL";
		}


		var collection_menu = diagram_type.collectionContextMenu;
		var menu_item = _.find(collection_menu, function(menu) {
			return menu.item == "Generate SPARQL from selection";
		});

		if (menu_item) {
			menu_item.procedure = "GenerateSPARQL";
		}

		var execute_sparql = {item: "ExecuteSPARQL", procedure: "ExecuteSPARQL",};
		collection_menu.push(execute_sparql);
		no_collection_menu.push(execute_sparql);

		DiagramTypes.update({_id: diagram_type_id,}, {$set: {noCollectionContextMenu: no_collection_menu, collectionContextMenu: collection_menu}});


		ElementTypes.find({diagramTypeId: diagram_type_id, }).forEach(function(elem_type) {

			var name = elem_type.name;

			if (name == "Class") {

				var class_type_id = elem_type._id;

				var menu = elem_type.contextMenu;
				menu = _.union([{item: "AddLink", procedure: "AddLink", }], menu);
				ElementTypes.update({_id: elem_type._id}, {$set: {contextMenu: menu},});

				if (menu_item) {
					menu_item.procedure = "GenerateSPARQL";
					DiagramTypes.update({_id: diagram_type_id,}, {$set: {noCollectionContextMenu: no_collection_menu}});
				}


				CompartmentTypes.find({elementTypeId: class_type_id,}).forEach(function(compart_type) {

					if (compart_type.name == "ClassType") {
						CompartmentTypes.update({_id: compart_type._id}, {$set: {defaultValue: "",}});
					}

					if (compart_type.name == "Distinct") {
						CompartmentTypes.update({_id: compart_type._id}, {$set: {defaultValue: "",}});
					}

					if (compart_type,name == "OrderBy") {
						CompartmentTypes.update({_id: compart_type._id}, {$set: {defaultValue: "",}});
					}

					if (compart_type.name == "Name") {

						var extension_points = compart_type.extensionPoints;
						var item = _.find(extension_points, function(extension_point) {
							return extension_point.extensionPoint == "dynamicDropDown";
						});

						if (item) {
							item.procedure = "VQgetClassNames";
							CompartmentTypes.update({_id: compart_type._id}, {$set: {extensionPoints: extension_points,}});
						}

					}


					if (compart_type.name == "Attributes") {

						var sub_compart_types = compart_type.subCompartmentTypes

						var attr_sub_compart_type_first = _.find(sub_compart_types, function(sub_compart_type) {
							return sub_compart_type.name == "Attributes";
						});

						if (attr_sub_compart_type_first) {

							var attr_sub_compart_type = _.find(attr_sub_compart_type_first.subCompartmentTypes, function(sub_compart_type) {
								return sub_compart_type.name == "Name";
							});

							var extension_points = attr_sub_compart_type.extensionPoints;
							var item = _.find(extension_points, function(extension_point) {
								return extension_point.extensionPoint == "dynamicDropDown";
							});	


							if (item) {
								item.procedure = "VQgetAttributeNames";
							}

							else {
								extension_points.push({extensionPoint: "dynamicDropDown", procedure: "VQgetAttributeNames"})
							}

							var item = _.find(extension_points, function(extension_point) {
								return extension_point.extensionPoint == "dynamicDropDown";
							});	


							CompartmentTypes.update({_id: compart_type._id}, {$set: {subCompartmentTypes: sub_compart_types,}});
						}

					}
				});
			}


			if (name == "Link") {

				CompartmentTypes.find({elementTypeId: elem_type._id,}).forEach(function(compart_type) {

					if (compart_type.name == "Name") {

						var extension_points = compart_type.extensionPoints;
						var item = _.find(extension_points, function(extension_point) {
							return extension_point.extensionPoint == "dynamicDropDown";
						});

						if (item) {
							item.procedure = "VQgetAssociationNames";
							CompartmentTypes.update({_id: compart_type._id}, {$set: {extensionPoints: extension_points,}});
						}

					}


					if (compart_type.name == "Subquery Link") {

						var extension_points = compart_type.extensionPoints;
						var item = _.find(extension_points, function(extension_point) {
							return extension_point.extensionPoint == "afterUpdate";
						});

						if (item) {
							item.procedure = "VQsetSubQueryInverseLink";
							CompartmentTypes.update({_id: compart_type._id}, {$set: {extensionPoints: extension_points,}});
						}

					}


				});

			}

		});


	},

};





