import { generate_id, is_ajoo_editor } from '/libs/platform/lib'

build_initial_element_type = function(list, editor_type) {
		
	if (!editor_type)
		editor_type = "ajooEditor";

	var res = {};
	res["toolId"] = list["toolId"];
	res["versionId"] = list["versionId"];
	res["diagramTypeId"] = list["diagramTypeId"];
	res["diagramId"] = list["diagramId"];
	res["elementId"] = list["_id"];
	res["superTypeIds"] = [];
	res["type"] = list["type"];

	res["extensionPoints"] = [{extensionPoint: "createElement", procedure: "MakeElement"},
								{extensionPoint: "resizeElement", procedure: "ResizeElement"},
								//{extensionPoint: "beforeCreateElement", procedure: ""},
								//{extensionPoint: "afterCreateElement", procedure: ""},
								//{extensionPoint: "dynamicContextMenu", procedure: ""},
								//{extensionPoint: "dynamicReadModeContextMenu", procedure: ""},
							];

	//adds keystrokes and context menu depending on element type
	if (res["type"] == "Box") {

		if (is_ajoo_editor(editor_type)) {

			var keyStrokes = [{keyStroke: "Ctrl C", procedure: "Copy"},
							{keyStroke: "Ctrl X", procedure: "Cut"},
							{keyStroke: "Delete", procedure: "Delete"}];
			res["keyStrokes"] = keyStrokes;

			res["readModeKeyStrokes"] = [];

			var contextMenu = [	{item: "Cut", procedure: "Cut"},
							{item: "Copy", procedure: "Copy"},
							{item: "Delete", procedure: "Delete"}];

			res["contextMenu"] = contextMenu;

			res["readModeContextMenu"] = [];
		}


		res["styles"] = [{id: generate_id(),
							name: "Default",
							elementStyle: build_initial_box_style(editor_type),
						}];

		res["name"] = "Box";						
	}

	//line
	else {
		var keyStrokes = [{keyStroke: "Delete", procedure: "Delete"}];
		res["keyStrokes"] = keyStrokes;

		res["readModeKeyStrokes"] = [];

		var contextMenu = [{item: "Delete", procedure: "Delete"}];
		res["contextMenu"] = contextMenu;

		res["readModeContextMenu"] = [];

		res["name"] = "Line";

		res["startElementTypeId"] = list["startElementTypeId"];
		res["endElementTypeId"] = list["endElementTypeId"];


		var style = build_initial_line_style(editor_type);
		if (is_ajoo_editor(editor_type)) {

			res["styles"] = [{id: generate_id(),
								name: "Default",
								elementStyle: style["elementStyle"],
								startShapeStyle: style["startShapeStyle"],
								endShapeStyle: style["endShapeStyle"],
							}];
		}


		//by default line is directional
		res["direction"] = "Directional";
	}

	res["isAbstract"] = false;					

	return res;
}

build_initial_line_style = function(editor_type) {

	if (is_ajoo_editor(editor_type)) {

		return {
				elementStyle: {
					stroke: "rgb(65,113,156)",
					strokeWidth: 1,

					shadowColor: "red",
					shadowBlur: 0,
					shadowOpacity: 1,
					shadowOffsetX: 0,
					shadowOffsetY: 0,

					tension: 0,
					opacity: 1,

					dash: [],
				},

				startShapeStyle: {
					fill: "rgb(65,113,156)",
					fillPriority: "color",

					stroke: "rgb(65,113,156)",
					strokeWidth: 1,

					shadowColor: "red",
					shadowBlur: 0,
					shadowOpacity: 1,
					shadowOffsetX: 0,
					shadowOffsetY: 0,

					tension: 0,
					opacity: 1,

					dash: [],

					radius: 7,
					shape: "None",
				},

				endShapeStyle: {
					fill: "rgb(65,113,156)",
					fillPriority: "color",

					stroke: "rgb(65,113,156)",
					strokeWidth: 1,

					shadowColor: "red",
					shadowBlur: 0,
					shadowOpacity: 1,
					shadowOffsetX: 0,
					shadowOffsetY: 0,

					tension: 0,
					opacity: 1,

					dash: [],

					radius: 12,
					shape: "Triangle",
				},
			};
	}

}

build_initial_box_style = function(editor_type) {

	if (!editor_type)
		editor_type = "ajooEditor";

	if (is_ajoo_editor(editor_type)) {

		return {
			fill: "rgb(91,155,213)",
			fillPriority: "color",

			//linear gradient
			fillLinearGradientStartPointX: 0.5,
			fillLinearGradientStartPointY: 0,			
			fillLinearGradientEndPointX: 0.5,
			fillLinearGradientEndPointY: 1,
			fillLinearGradientColorStops: [0, 'white', 1, 'black'],

			//radial gradient
			fillRadialGradientStartPointX: 0.5,
			fillRadialGradientStartPointY: 0.5,
			fillRadialGradientEndPointX: 0.5,
			fillRadialGradientEndPointY: 0.5,
			fillRadialGradientStartRadius: 0,
			fillRadialGradientEndRadius: 1,
			fillRadialGradientColorStops: [0, 'white', 1, 'black'],

			stroke: "rgb(65,113,156)",
			strokeWidth: 1,

			shadowColor: "red",
			shadowBlur: 0,
			shadowOpacity: 1,
			shadowOffsetX: 0,
			shadowOffsetY: 0,

			tension: 0,
			opacity: 1,

			dash: [],
			shape: "RoundRectangle",

			// dynamicTooltip: "0",
			// lineColor: ,
			// lineWidth: "1",
			// shapeCode: "RoundRectangle",
			// shapeStyle: "0",
		};
	}
}


export { build_initial_element_type, build_initial_line_style, build_initial_box_style }