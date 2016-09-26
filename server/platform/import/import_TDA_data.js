
Meteor.methods({	

	loadData: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id)) {
			ImportTDAData.loadData(list, user_id);
			ImportTDAData.reset();
		}
		else {
			error_msg();
		}
	},

});


ImportTDAData = {

	elementMappings: {},

	loadData: function(list, user_id) {

		var refs = {};
		var target_refs = {};
		var old_new_dgr_map = {};
	
		var diagrams = JSON.parse(list.data);
		Projects.find({_id: {$in: list["projectIds"]}}).forEach(function(project) {

			var project_id = project["_id"];
			var tool_id = project["toolId"];

			var version = Versions.findOne({projectId: project["_id"]}, {sort: {startDate: -1}});
			var version_id = version["_id"];

			console.log("Starting importing diagrams...");
			_.each(diagrams.diagrams, function(diagram) {

				//selects diagram type
				var diagram_list = {
									name: diagram["caption"] || "noName",
									projectId: project["_id"],
									//edit: {action: "new",
									//		userId: system_id,
									//		time: get_current_time(),
									//},
									versionId: version_id,
									createdBy: user_id,
									editorType: "ajooEditor",
									createdAt: new Date(),
									imageUrl: "http://placehold.it/770x347",
									allowedGroups: [],
									//editing: {},
									seenCount: 0,
								};
				
				//var diagram_type = DiagramTypes.findOne({toolId: tool_id});

				var diagram_type_id;

				var diagram_type = DiagramTypes.findOne({toolId: tool_id, name: diagram["type"]}) ||  DiagramTypes.findOne({toolId: tool_id});				
				if (diagram_type) {

					diagram_type_id = diagram_type["_id"];

					var diagram_style = diagram_type["style"];
					diagram_style["fill"] = diagram["background_color"];

					_.extend(diagram_list, {//fill: diagram_style["background_color"],
											diagramTypeId: diagram_type_id,
											style: diagram_style,
											diagramTypeId: diagram_type["_id"],
										});
				}

				//make diagram	
				var diagram_id = Diagrams.insert(diagram_list);

				old_new_dgr_map[diagram["id"]] = diagram_id;
				
				//stores mappings from the old rep id to the new mongo id
				var element_mappings = {};

				//load nodes
				ImportTDAData.loadNodes(diagram["nodes"], diagram_id, diagram_type_id, version_id, project_id, refs, target_refs);

				ImportTDAData.loadNodes(diagram["freeBoxes"], diagram_id, diagram_type_id, version_id, project_id, refs, target_refs);

				//load edges
				ImportTDAData.loadEdges(diagram["edges"], diagram_id, diagram_type_id, version_id, project_id);
			});
			

			for (var old_dgr_id in refs) {		
				var parent_id = refs[old_dgr_id];
				var new_dgr_id = old_new_dgr_map[old_dgr_id];

				if (parent_id) {
					Diagrams.update({_id: new_dgr_id}, {$push: {parentDiagrams: parent_id}});				
				}
			}

			console.log("target refs ", target_refs)

			for (var elem_id in target_refs) {
				var target_old_id = target_refs[elem_id];
				var target_id = old_new_dgr_map[target_old_id];

				console.log("target id ", target_id)

				if (target_id) {
					Elements.update({_id: elem_id}, {$set: {targetId: target_id}});				
				}
			}

			console.log("End of importing diagrams");	
		});
	},

	loadNodes: function(nodes, diagram_id, diagram_type_id, version_id, project_id, refs, target_refs) {

		console.log("Starting importing boxes...");

		var element_mappings = ImportTDAData.elementMappings;
		_.each(nodes, function(node) {

			var element_list = {
					projectId: project_id,
					versionId: version_id,
					diagramId: diagram_id,
				};

			ImportTDAData.loadNode(node, element_list, element_mappings, diagram_type_id, refs, target_refs);

			if (node["referencing_diagram_id"]) {
				refs[node["referencing_diagram_id"]] = diagram_id;
				target_refs[element_list["_id"]] = node["referencing_diagram_id"];
			}

		});

		console.log("Ending importing boxes...");
	},

	loadEdges: function(edges, diagram_id, diagram_type_id, version_id, project_id) {

		var element_mappings = ImportTDAData.elementMappings;

		_.each(edges, function(edge) {

			var element_list = {
					projectId: project_id,
					versionId: version_id,
					diagramId: diagram_id,
				};

			ImportTDAData.loadEdge(edge, element_list, element_mappings, diagram_type_id);
		});

	},

	loadNode: function(node, element_list, element_mappings, diagram_type_id, refs, target_refs) {

		var name = _.last(node.type.split("."));		
		var element_type = ElementTypes.findOne({diagramTypeId: diagram_type_id, type: "Box", name: name}) || 
							ElementTypes.findOne({diagramTypeId: diagram_type_id, type: "Box"});
		if (!element_type) {
			return;
		}

		var type_name = node["type"].split(".")[1];
		//var element_type = ElementTypes.findOne({_id: elem_type_id});

		var node_location = node["location"];
		var location = ImportTDAData.transformNodeLocation(node_location);

		element_list["type"] = "Box";
		element_list["location"] = location;
		element_list["styleId"] = element_type["styles"][0]["id"];
						
		//var element_type_id;
		if (element_type) {
		//	element_type_id = element_type["_id"];
		//	element_list["elementTypeId"] = element_type_id;

			element_list["elementTypeId"] = element_type._id;

			var style_in = node["style"];
			var style_out = element_type["styles"][0];
			ImportTDAData.transformBoxStyle(style_in, style_out);

			element_list["style"] = style_out;
		}

		if (diagram_type_id)
			element_list["diagramTypeId"] = diagram_type_id;

		var id = Elements.insert(element_list);
		element_list["_id"] = id;

		element_mappings[node["id"]] = id;

		ImportTDAData.loadCompartments(node, element_type._id, element_mappings, element_list, diagram_type_id);

		return element_list;

	},

	loadEdge: function(edge, element_list, element_mappings, diagram_type_id) {

		var name = _.last(edge.type.split("."));

		var element_type = ElementTypes.findOne({diagramTypeId: diagram_type_id, type: "Line", name: name}) ||
							ElementTypes.findOne({diagramTypeId: diagram_type_id, type: "Line"});
		if (!element_type) {
			return;
		}

		//var element_type = ElementTypes.findOne({_id: elem_type_id, type: "Line"});

		var points_in = edge["location"];
		var points = [];
		_.each(points_in, function(point) {
			var x = Number(point["xPos"]);
			var y = Number(point["yPos"]);

			if (x && y) {
				points.push(x);
				points.push(y);
			}
		});

		element_list["type"] = "Line";
		element_list["points"] = points;
		element_list["startElement"] = element_mappings[edge["start_elem_id"]];		
		element_list["endElement"] = element_mappings[edge["end_elem_id"]];
		element_list["styleId"] = element_type["styles"][0]["id"];

		if (element_type) {
			element_list["elementTypeId"] = element_type._id;

			var style_in = edge["style"];
			var style_obj = element_type["styles"][0];
			var style_out = {elementStyle: style_obj["elementStyle"],
								startShapeStyle: style_obj["startShapeStyle"],
								endShapeStyle: style_obj["endShapeStyle"],
							};

			ImportTDAData.transformLineStyle(style_in, style_out);
			element_list["style"] = style_out;
		}

		if (diagram_type_id) {
			element_list["diagramTypeId"] = diagram_type_id;
		}

		var id = Elements.insert(element_list);
		element_list["_id"] = id;
		element_mappings[edge["id"]] = id;

		var is_edge = true;
		ImportTDAData.loadCompartments(edge, element_type._id, element_mappings, element_list, diagram_type_id, is_edge);

		return element_list;
	},

	loadCompartments: function(elem, element_type_id, element_mappings, element_list, diagram_type_id, is_edge) {

		var elem_id = element_mappings[elem["id"]];
		_.each(elem["compartments"], function(compart, i) {

			if (!compart.value) {
				return;
			}

			var compart_type_name = _.last(compart.type.split("."));

			var compartment_type = CompartmentTypes.findOne({diagramTypeId: diagram_type_id, elementTypeId: element_type_id, name: compart_type_name}) ||
								   CompartmentTypes.findOne({diagramTypeId: diagram_type_id, elementTypeId: element_type_id});
			if (!compartment_type) {
				console.error("No compartment type ", compart_type_name);
				return;
			}

			var style = compart["style"];

			//align options: left, center, or right
			var align = "left";
			if (Number(style["alignment"]) == 0) {
				align = "left";
			}
			else if (Number(style["alignment"]) == 1) {
				align = "center";
			}
			else if (Number(style["alignment"]) == 2) {
				align = "right";		
			}

			var is_visible = style["isVisible"];
			var visible = true;
			if (Number(is_visible) == 0) {
				visible = false;
			}

			//normal: 0
			//bold: 1
			//italic: 2
			var font_style = "normal";
			var font_style_in = Number(style["alignment"]);
			if (font_style_in == 0) {
				font_style = "normal";
			}

			else if (font_style_in == 1) {
				font_style = "bold";
			}

			else if (font_style_in == 2) {
				font_style = "italic";
			}

			var attr_list = {
					fontFamily: style["fontTypeFace"],
					fontSize: Math.abs(Number(style["fontSize"]) || 9),
					fontStyle: font_style, //options: "normal", "bold", or "italic"
					fontVariant: "normal",
					fill: style["fontColor"],
					align: align,
					visible: visible,
				};


			//	 lc_Start = 1, 
			//   lc_End = 2, 

			//   lc_Left = 4, 
			//   lc_Right = 8, 

			//   lc_Middle = 16,
			//   lc_Inside = 32 
			//   lc_Any =
			
			var adjustment = style["adjustment"];
			if (is_edge && adjustment) {

				var placement = "start-left";
				switch (adjustment) {
				    case 5:
				        placement = "start-left";
				        break;

				    case 9:
				        placement = "start-right";
				        break;

				    case 6:
				        placement = "end-left";
				        break;

				    case 10:
				        placement = "end-right";
				        break;

				    case 20:
				        placement = "middle-left";
				        break;

				    case 24:
				        placement = "middle-right";
				        break;
				}

				attr_list["placement"] = placement;
			}

			if (style["lineWidth"]) {
				attr_list["strokeWidth"] = style["lineWidth"];
			}

			var value = compart["value"] || "";

			var compart_list = {
							projectId: element_list["projectId"],
							versionId: element_list["versionId"],
							diagramId: element_list["diagramId"],
							elementId: element_list["_id"],
							diagramTypeId: element_list["diagramTypeId"],
							elementTypeId: element_list["elementTypeId"], 
							value: value,
							valueLC: value.toLowerCase(),
							input: value,
							index: i,
							style: attr_list,
							styleId: compartment_type["styles"][0]["id"],
							isObjectRepresentation: compartment_type["isObjectRepresentation"],
						};

			if (compartment_type) {
				compart_list["compartmentTypeId"] = compartment_type["_id"];
			}

			var id = Compartments.insert(compart_list);
		});
	},

	// get_shape_mapping = function(shape_in) {
	getShapeMapping: function(shape_in) {

		var shape_mapping = {
							box_RoundRectangle: "RoundRectangle",
							box_Rectangle: "Rectangle",
							box_Package: "Package",
							box_Note: "Note",
							box_Ellipse: "Circle", 
							le_PureArrow: "Triangle",

							box_BlackLine: "HorizontalLine",
							//box_BlackLine: "Triangle",						
						};

		var shape_out = shape_mapping[shape_in];
		if (shape_out) {
			return shape_out;
		}
		else {
			return "Rectangle";
		}
	},

	// transform_node_location = function(node_location) {
	transformNodeLocation: function(node_location) {
		return {x: Number(node_location["xPos"]),
				y: Number(node_location["yPos"]),
				width: Number(node_location["width"]),
				height: Number(node_location["height"]),
			};
	},

	//get_line_end_shape = function(shape_in) {
	getLineEndShape: function(shape_in) {
		var line_end_shapes = {
								"le_None": "None",
								"le_Arrow": "Triangle",					
								"le_Diamond": "Diamond",
								"le_Triangle": "Triangle",
								"le_PureArrow": "Arrow",
							};

		var shape_out = line_end_shapes[shape_in];
		if (_.isUndefined(shape_out)) {
			return "None";
		}
		else {
			return shape_out;
		}
	},

	//transform_element_style = function(style_in, style_out) {
	transformElementStyle: function(style_in, style_out) {

		//if the element is line
		if (style_out["startShapeStyle"]) {
			ImportTDAData.transformLineStyle(style_in, style_out);
		}

		//if the element is box
		else {
			ImportTDAData.transformBoxStyle(style_in, style_out);
		}
	},

	//transform_line_style = function(style_in, style_out) {
	transformLineStyle: function(style_in, style_out) {

		var get_radius = function(width, height) {
			var radius = Math.max(Number(width), Number(height)) / 2;

			return radius || 8;
		}

		//setting line data
		var elem_style = {
						stroke: style_in["lineColor"],
						strokeWidth: style_in["lineWidth"],
						dash: [style_in["breakLength"], style_in["dashLength"]],
					};

		_.extend(style_out["elementStyle"], elem_style);

		//setting start shape data
		var start_shape = {
						shape: ImportTDAData.getLineEndShape(style_in["startShapeCode"]),
						stroke: style_in["startLineColor"],
						strokeWidth: style_in["startLineWidth"],
						radius: get_radius(style_in["startLineWidth"], style_in["startLineHeight"]),
						fill: style_in["startBkgColor"],
					};

		_.extend(style_out["startShapeStyle"], start_shape);

		//setting end shape data
		var end_shape = {
						shape: ImportTDAData.getLineEndShape(style_in["endShapeCode"]),
						stroke: style_in["endLineColor"],
						strokeWidth: style_in["endLineWidth"],
						radius: get_radius(style_in["endLineWidth"], style_in["endLineHeight"]),
						fill: style_in["endBkgColor"],
					};

		_.extend(style_out["endShapeStyle"], end_shape);

		//sestting line type
		if (style_in["lineType"] == 2) {
			style_out["lineType"] = "Direct";
		}
		else {
			style_out["lineType"] = "Orthogonal";
		}

	},

	//transform_box_style = function(style_in, style_out) {
	transformBoxStyle: function(style_in, style_out) {

		var elem_style = {
						fill: style_in["bkgColor"],
						stroke: style_in["lineColor"],

						strokeWidth: style_in["lineWidth"],
						dash: [style_in["breakLength"], style_in["dashLength"]],

						shape: ImportTDAData.getShapeMapping(style_in["shapeCode"]),
					};

		_.extend(style_out.elementStyle, elem_style);
	},

	reset: function() {
		ImportTDAData.elementMappings = {};
	},


	// getElementList: function(list) {

	// 	var res = {};

	// 	res["toolId"] = list["toolId"];
	// 	res["diagramTypeId"] = list["diagramTypeId"];
	// 	res["elementTypeId"] = list["elementTypeId"];
	// 	res["versionId"] = list["versionId"];
	// 	res["diagramId"] = list["diagramId"];
	// 	res["type"] = list["type"];
	// 	res["style"] = list["style"];
		
	// 	if (list["type"] == "Box")
	// 		res["location"] = list["location"];
	// 	else if (list["type"] == "Line") {
	// 		res["points"] = list["points"];
	// 		res["startElement"] = list["startElement"];
	// 		res["endElement"] = list["endElement"];

	// 		if (list["subTypeId"] && list["superTypeId"]) {
	// 			res["superTypeId"] = list["superTypeId"];
	// 		}
	// 	}

	// 	return res;
	// },



}





