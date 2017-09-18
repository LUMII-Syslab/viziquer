
Interpreter.methods({

	SwimlaneContextMenu: function() {

		return [
				{item: "Add Row Above", procedure: "AddSwimlaneRowAbove"},
				{item: "Add Row Below", procedure: "AddSwimlaneRowBelow"},

				{item: "Add Column on Left", procedure: "AddSwimlaneColumnLeft"},
				{item: "Add Column on Right", procedure: "AddSwimlaneColumnRight"},

				{item: "Remove Row Above", procedure: "RemoveSwimlaneRowAbove"},
				{item: "Remove Row Below", procedure: "RemoveSwimlaneRowBelow"},

				{item: "Remove Column on Left", procedure: "RemoveSwimlaneColumnLeft"},
				{item: "Remove Column on Right", procedure: "RemoveSwimlaneColumnRight"},

				{item: "Delete Swimlane", procedure: "DeleteSwimlane"},			
			];
	},

	DeleteSwimlane: function() {

		var editor = Interpreter.editor;
		var swimlane = editor.getSwimlane();

		var elements = [swimlane._id];

		//selecting element names for diagram history logging
		var element_names = build_element_names_array(elements);

		var list = {elements: elements,
					elementNames: element_names,
					diagramId: Session.get("activeDiagram"),
				};

		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});

		Interpreter.executeExtensionPoint(diagram_type, "deleteCollection", list);
	},


	//adding
	AddSwimlaneRowBelow: function() {
		var index = get_index();
		AddSwimlaneRow(index);
	},

	AddSwimlaneRowAbove: function() {
		var index = get_index();
		AddSwimlaneRow(index-1);
	},

	AddSwimlaneColumnLeft: function() {
		var index = get_index();
		AddSwimlaneColumn(index-1);
	},

	AddSwimlaneColumnRight: function() {
		var index = get_index();
		AddSwimlaneColumn(index);
	},

	//removing
	RemoveSwimlaneRowBelow: function() {
		var index = get_index();
		RemoveSwimlaneRow(index);
	},

	RemoveSwimlaneRowAbove: function() {
		var index = get_index();
		RemoveSwimlaneRow(index-1);
	},

	RemoveSwimlaneColumnLeft: function() {
		var index = get_index();
		RemoveSwimlaneColumn(index-1);
	},

	RemoveSwimlaneColumnRight: function() {
		var index = get_index();
		RemoveSwimlaneColumn(index);
	},

	AddSwimlaneColumn: function(line_index) {

		var lines_group1 = "VerticalLines";
		var lines_group2 = "HorizontalLines";	

		var index = 0;

		add_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
	},

	AddSwimlaneRow: function(line_index) {

		var lines_group1 = "HorizontalLines";
		var lines_group2 = "VerticalLines";

		var index = 1;

		add_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
	},

	RemoveSwimlaneColumn: function(line_index) {

		var lines_group1 = "VerticalLines";
		var lines_group2 = "HorizontalLines";	

		var index = 0;

		delete_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
	},

	RemoveSwimlaneRow: function(line_index) {

		var lines_group1 = "HorizontalLines";
		var lines_group2 = "VerticalLines";

		var index = 1;

		delete_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
	},

});


function add_swimlane_row_or_column(line_index, index, lines_group1, lines_group2) {
	add_remove_swimlane_row_or_column(line_index, index,
												lines_group1, lines_group2,
												"add");
}


function delete_swimlane_row_or_column(line_index, index, lines_group1, lines_group2) {
	add_remove_swimlane_row_or_column(line_index, index,
										lines_group1, lines_group2,
										"remove");
}

function add_remove_swimlane_row_or_column(line_index, index, lines_group1, lines_group2, remove_or_add) {
	
	var editor = Interpreter.editor;
	var swimlane = editor.getSwimlane();
	
	var list = {diagramId: Session.get("activeDiagram"),
				elementId: swimlane._id,
			};

	line_index = Math.max(line_index, 0);

	//recomputing swimlane lines
	var res;
	if (remove_or_add == "add") {
		swimlane.add_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
		list["increment"] = 1;
	}

	else if (remove_or_add == "remove") {
		res = swimlane.remove_swimlane_row_or_column(line_index, index, lines_group1, lines_group2);
		list["increment"] = -1; 
	}

	//swimlane = editor.getSwimlane();
	var swimlane_presentation = swimlane.presentation;
	var h_lines_group = find_child(swimlane_presentation, "HorizontalLines");
	var v_lines_group = find_child(swimlane_presentation, "VerticalLines");


	list["horizontalLines"] = swimlane.select_lines_position(h_lines_group);
	list["verticalLines"] = swimlane.select_lines_position(v_lines_group);

	if (lines_group1 == "HorizontalLines") {
		list["horizontalIndex"] = line_index;
	}

	else if (lines_group1 == "VerticalLines") {
		list["verticalIndex"] = line_index;
	}

	Utilities.addingProjectOrToolParams(list);

	Utilities.callMeteorMethod("updateSwimlaneLines", list);
}

function get_index() {
	var editor = Interpreter.editor;
	if (editor.data.line) {
		var line = editor.data.line;
		editor.data = {};

		return Number(line.index);
	}
}