

Interpreter.methods({

	//simulating loop
	AddNodeWithLink: function() {

		var newObj = function() {
			this.diagramId = Session.get("activeDiagram");
			this.diagramTypeId = Session.get("diagramType");
			this.toolId = Session.get("toolId");
			this.versionId = Session.get("toolVersionId");
		}

		var target_diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
		if (!target_diagram_type) {
			return;
		}

		//base element
		var target_elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (!target_elem_type) {
			return;
		}

		//loop box
		var box_type = ElementTypes.findOne({name: "LoopBox", diagramTypeId: Session.get("diagramType")});
		if (!box_type) {
			return;
		}

		//loop line
		var line_type = ElementTypes.findOne({name: "LoopLine", diagramTypeId: Session.get("diagramType")});
		if (!line_type) {
			return;
		}

		//box
		var box = new newObj();

		box["type"] = "Box";
		box["elementTypeId"] = box_type["_id"];
		box["style"] = {};
		box["style"]["elementStyle"] = box_type["styles"][0]["elementStyle"];
		box["styleId"] = box_type["styles"][0]["id"];

		//line
		var line = new newObj();
		line["type"] = "Line";
		line["elementTypeId"] = line_type["_id"];
		line["startElement"] = Session.get("activeElement");
		line["style"] = {};
		line["style"]["elementStyle"] = line_type["styles"][0]["elementStyle"];
		line["style"]["startShapeStyle"] = line_type["styles"][0]["startShapeStyle"];
		line["style"]["endShapeStyle"] = line_type["styles"][0]["endShapeStyle"];
		//list["style"]["lineType"] = line_type["lineType"];	
		line["styleId"] = line_type["styles"][0]["id"];


		//box type
		var new_box_type = new newObj();
		new_box_type["type"] = "Box";	
		new_box_type["diagramTypeId"] = target_diagram_type["_id"];

		//line type
		var new_line_type = new newObj();
		new_line_type["type"] = "Line";
		new_line_type["diagramTypeId"] = target_diagram_type["_id"];
		new_line_type["startElementTypeId"] = target_elem_type["_id"];

		var list = {
				box: box,
				line: line,
				boxType: new_box_type,
				lineType: new_line_type,
			};

		Utilities.callMeteorMethod("addNodeWithLink", list);
	},

	ZoomChartDiagramTypeContextMenu: function() {

		var menu = [];

		var chart = Interpreter.editor;
		var selection = chart.selection();

		if (selection.length == 2) {

			//selecting element1
			var elem1 = selection[0];
			var elem1_id = elem1["id"];

			//selecting element2
			var elem2 = selection[1];
			var elem2_id = elem2["id"];

			//selecting element types
			var elem1_obj = ElementTypes.findOne({elementId: elem1_id});
			var elem2_obj = ElementTypes.findOne({elementId: elem2_id});

			//if both elements are boxes
			if (elem1_obj["name"] == "Box" && elem2_obj["name"] == "Box") {
				menu.push({item: "Add link", procedure: "AddZoomChartLink"});
			}
		}

		menu.push({item: "Delete", procedure: "DeleteZoomChartCollectionConfigurator"});

		return menu;
	},

	AddZoomChartLink: function() {

		var elem_type = ElementTypes.findOne({diagramTypeId: Session.get("diagramType"), name: "Line"});
		if (!elem_type)
			return;

		var chart = Interpreter.editor;
		var selected = chart.selection();

		var start_elem_id = selected[0]["id"];
		var end_elem_id = selected[1]["id"];

		NewLine(undefined, elem_type["_id"], undefined, start_elem_id, end_elem_id);
	},


	DeleteZoomChartCollectionConfigurator: function() {

		var chart = Interpreter.editor;
		var selection = chart.selection();

		var elem_ids = [];
		 _.each(selection, function(elem) {

			var elem_id = elem["id"];
			elem_ids.push(elem["id"]);

			var tmp_elem = Elements.findOne({_id: elem_id});
			var elem_type = ElementTypes.findOne({_id: tmp_elem["elementTypeId"]});
			if (!elem_type) {
				console.log("Error: No element type");
				return;
			}

			if (elem_type["name"] == "Box") {

				//deleting linked lines
				Elements.find({$or: [{startElement: elem_id}, {endElement: elem_id}]}).forEach(
					function(line) {

						elem_ids.push(line["_id"]);

						var line_type = ElementTypes.findOne({_id: line["elementTypeId"]});
						if (!line_type) {
							console.log("Error: no line type");
							return;
						}

						//if loop line, then deleting loop box element as well
						if (line_type["name"] == "LoopLine") {
							var loop_box_id = line["endElement"];
							elem_ids.push(loop_box_id);
						}

					});
			}

			else if (elem_type["name"] == "LoopLine") {

				var to = elem["to"];
				var to_id = to["id"];

				elem_ids.push(to_id);
			}

			else if (elem_type["name"] == "LoopBox") {

				//selecting the liked loop line
				var loop_line = Elements.findOne({endElement: elem_id});
				if (loop_line)
					elem_ids.push(loop_line["_id"]);
			}

			//if Line, then no action		
		});

		//deleting elements
		var list = {elements: elem_ids, diagramId: Session.get("activeDiagram")};
		DeleteConfiguratorElementsCollection(undefined, list);
	},

});
