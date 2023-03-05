import { Tools, ToolVersions, DiagramTypes, ElementTypes, CompartmentTypes, PaletteButtons,} from '/libs/platform/collections';
import { generate_id } from '/libs/platform/lib'
import { build_initial_box_style, build_initial_line_style } from '/server/platform/methods/configurator/initialTypes/element_types'
import { build_initial_compartment_type, get_default_compartment_style, build_box_compartment_style, build_line_compartment_style } from '/server/platform/methods/configurator/initialTypes/compartment_types'



load_configurator = function (user_id) {
	
	if (!user_id) {
		return;
	}

	Tools.remove({});

	//Diagram types
	var diagram_type_id;

	var tool_id = Tools.insert({name: "_Configurator",
								createdAt: get_current_time(),
								createdBy: user_id,
								archive: false,
								users: true,
								analytics: false,
								isConfigurator: true,
                				forum: false,
							});

	var version_id = ToolVersions.insert({toolId: tool_id,
											status: "New",
											createdAt: get_current_time(),
											createdBy: user_id,
										});

	var tool_version = ToolVersions.findOne({_id: version_id});
	if (!tool_version) {
		console.log("Error in load configurator, no tool version");
		return;
	}

	var diagram_type_obj = build_ajoo_configurator_diagram_type(user_id, tool_id, version_id);
	var diagram_type_id = DiagramTypes.insert(diagram_type_obj);

//Element types
	var elem_type_list = {};
	if (ElementTypes.find({toolId: tool_id}).count() === 0) {
		var super_box_id = build_super_box(tool_id, version_id, diagram_type_id);
		
		build_box_type(tool_id, version_id, diagram_type_id, super_box_id);
		build_line_type(tool_id, version_id, diagram_type_id, super_box_id);
		build_specialization(tool_id, version_id, diagram_type_id, super_box_id);

		build_swimlane(tool_id, version_id, diagram_type_id, super_box_id);
	}

}

function build_ajoo_configurator_diagram_type(user_id, tool_id, version_id) {

	return {
			toolId: tool_id,
			versionId: version_id,
			name: "_ConfiguratorDiagramType",

			createdAt: get_current_time(),
			createdBy: user_id,
			editorType: "ajooEditor",

		    size: {
		    	diagramSize: 8,
		    	dialogSize: 4,
		    },

			style: {

				fillPriority: "color",
				fill: "#fff",

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
			},

			selectionStyle: {
			    fill: 'grey',
			    opacity: 0.4,
			    stroke: 'black',
			    strokeWidth: 0.6,
			},

			newLineStyle: {
				stroke: "black",
				strokeWidth: 1.5,
				opacity: 1,
			},

			toolbar: [

					{id: generate_id(),
					name: "Grid",
					procedure: "ToggleGrid",
					icon: "fa-th"},

					{id: generate_id(),
					name: "Diagram settings",
					procedure: "ShowDiagramSettings",
					icon: "fa-gear"},

					{id: generate_id(),
					name: "Zoom out",
					procedure: "ZoomingOut",
					icon: "fa-minus"},

					{id: generate_id(),
					name: "Zoom in",
					procedure: "ZoomingIn",
					icon: "fa-plus"},

					{id: generate_id(),
					name: "Delete",
					procedure: "DeleteDiagram",
					icon: "fa-trash-o"},
			],

			readModeToolbar: [
					{id: generate_id(),
					name: "Diagram settings",
					procedure: "ShowDiagramSettings",
					isInEditableVersion: false,
					isForAdminOnly: false,
					icon: "fa-gear"},

					{id: generate_id(),
					name: "Zoom out",
					procedure: "ZoomingOut",
					isInEditableVersion: false,
					isForAdminOnly: false,
					icon: "fa-minus"},

					{id: generate_id(),
					name: "Zoom in",
					procedure: "ZoomingIn",
					isInEditableVersion: false,
					isForAdminOnly: false,
					icon: "fa-plus"},
			],

			readModeNoCollectionKeyStrokes: [],
			readModeCollectionKeyStrokes: [],
			readModeNoCollectionContextMenu: [],
			readModeCollectionContextMenu: [],

		//key strokes
			collectionKeyStrokes: [
				{keyStroke: "Ctrl C", procedure: "Copy"},
				{keyStroke: "Ctrl X", procedure: "Cut"},
				{keyStroke: "Delete", procedure: "DeleteCollection"},
			],

			noCollectionKeyStrokes: [
				{keyStroke: "Ctrl V", procedure: "Paste"},
			],

			globalKeyStrokes: [
				{keyStroke: "Ctrl A", procedure: "SelectAll"},
			],

		//context menus
			collectionContextMenu: [
				{item: "Cut", procedure: "Cut"},
				{item: "Copy", procedure: "Copy"},
				{item: "Delete", procedure: "DeleteCollection"},
			],

			noCollectionContextMenu: [
				{item: "Paste", procedure: "Paste"},
				{item: "Add Swimlane", procedure: "NewSwimlane"},
			],

		//extension points
			extensionPoints: [
				//{extensionPoint: "beforeDeleteCollection",
				//	procedure: "delete_configurator_collection"},

				{extensionPoint: "changeCollectionPosition",
					procedure: "ChangeConfiguratorCollectionPosition"},

				{extensionPoint: "deleteCollection",
					procedure: "DeleteConfiguratorElementsCollection"},

				{extensionPoint: "copyCollection",
					procedure: "CopyConfiguratorCollection"},

				{extensionPoint: "cutCollection",
					procedure: "CutConfiguratorCollection"},

				{extensionPoint: "pasteCollection",
					procedure: "PasteConfiguratorCollection"},

				{extensionPoint: "deleteDiagram",
					procedure: "DeleteConfiguratorDiagram"},

				{extensionPoint: "createDiagram",
					procedure: "CreateConfiguratorDiagram"},
			],
		};
}

function build_box_type(tool_id, version_id, diagram_type_id, super_box_id) {
	
	//Box specification
	var box_type_obj = build_box_type_obj(tool_id, version_id, diagram_type_id, super_box_id, "ajooEditor");
	var box_id = ElementTypes.insert(box_type_obj);

	var box_name = box_type_obj["name"];

	PaletteButtons.insert({
						toolId: tool_id,
						versionId: version_id,
						diagramTypeId: diagram_type_id,
						elementTypeIds: [box_id],
						name: box_name,
						type: "Box",
						index: 1,
					});

	var compart_type_obj = build_box_compart_type_obj(tool_id, version_id, diagram_type_id, box_id, "ajooEditor");
	CompartmentTypes.insert(compart_type_obj, {removeEmptyStrings: false});
}

function build_box_compart_type_obj(tool_id, version_id, diagram_type_id, elem_type_id, editor_type) {

	return {	
			toolId: tool_id,
			versionId: version_id,
			diagramTypeId: diagram_type_id,
			elementTypeId: elem_type_id,
			index: 1,
			tabIndex: 1,
			name: "Name",
			defaultValue: "Box",
			description: "",
			prefix: "",
			suffix: "",
			styles: [{
					id: generate_id(),
					name: "Default",
					style: build_box_compartment_style(editor_type),
				}],

			inputType: {
				type: "no input",
			},

			isObjectRepresentation: true,
			noRepresentation: false,

			extensionPoints: [],
		};
}

function build_line_type(tool_id, version_id, diagram_type_id, super_box_id) {

	//Line specification
	var edge_type_obj = build_line_type_obj(tool_id, version_id, diagram_type_id, super_box_id, "ajooEditor");
	var edge_id = ElementTypes.insert(edge_type_obj);

	var edge_name = edge_type_obj["name"];

	PaletteButtons.insert({
						toolId: tool_id,
						versionId: version_id,
						diagramTypeId: diagram_type_id,
						elementTypeIds: [edge_id],
						name: edge_name,
						type: "Line",
						index: 2,
					});
}

function build_specialization(tool_id, version_id, diagram_type_id, super_box_id) {

	//Specialization specification
	var specification_name = "Specialization";
	var specialization_id = ElementTypes.insert({
										toolId: tool_id,
										versionId: version_id,
										name: specification_name,
										isAbstract: false,
										type: "Line",
										diagramTypeId: diagram_type_id,
										startElementTypeId: super_box_id,
										endElementTypeId: super_box_id,
										direction: "BiDirectional",
										lineType: "Orthogonal",

									//box style
										styles: [{
											id: generate_id(),
											name: "Default",

										//style
											elementStyle: {
												stroke: "rgb(92,71,118)",
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
												fill: "rgb(92,71,118)",
												fillPriority: "color",

												stroke: "rgb(92,71,118)",
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
												fill: "rgb(92,71,118)",
												fillPriority: "color",

												stroke: "rgb(92,71,118)",
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

										}],

										//key strokes
										keyStrokes: [
											{keyStroke: "Delete", procedure: "Delete"},
										],

										//context menu
										contextMenu: [
											{item: "Delete", procedure: "Delete"},
										],

										readModeContextMenu: [],

										//extension points
										extensionPoints: [

											{extensionPoint: "createElement",
												procedure: "MakeSpecialization"},

											// {extensionPoint: "beforeCreateElement",
											// 	procedure: "check_specialization_constraints"},
											

											{extensionPoint: "afterCreateElement",
												procedure: ""},
										],

										superTypeIds: [super_box_id],
									});

	PaletteButtons.insert({
				toolId: tool_id,
				versionId: version_id,
				diagramTypeId: diagram_type_id,
				elementTypeIds: [specialization_id],
				name: specification_name,
				type: "Line",
				index: 3,
			});
}

function build_super_box(tool_id, version_id, diagram_type_id) {

	//SuperBox specification
	var super_box_name = "SuperBox";
	var super_box_id = ElementTypes.insert({
									toolId: tool_id,
									versionId: version_id,
									name: super_box_name, 
									diagramTypeId: diagram_type_id,
									superTypeIds: [],
									contextMenu: [],
									readModeContextMenu: [],
									keyStrokes: [],
									readModeKeyStrokes: [],
									extensionPoints: [],
									styles: [{
											id: generate_id(),
											name: "Default",
											elementStyle: build_initial_box_style()}],
									type: "Box",
									isAbstract: true,
								});	
	return super_box_id;
}

function build_swimlane(tool_id, version_id, diagram_type_id) {
	
	var box_type_obj = {
					name: "Swimlane",
					isAbstract: false,
					diagramTypeId: diagram_type_id,
					toolId: tool_id,
					versionId: version_id,
					type: "Box",

					swimlane: {	horizontalLines: [
									[0, 0, 885, 0],
									[0, 40, 885, 40],
									[0, 210, 885, 210],
									[0, 380, 885, 380],
									[0, 550, 885, 550],
								],
								verticalLines: [
									[0, 0, 0, 550],
									[40, 0, 40, 550],
									[321.67, 0, 321.67, 550],
									[603.33, 0, 603.33, 550],
									[885, 0, 885, 550],
								]
							},
					
					//box style
					styles: [{
						id: generate_id(),
						name: "Default",
						elementStyle: {shape: "Swimlane",
										stroke: "black",
									},
					}],

					//key strokes
					keyStrokes: [],

					readModeKeyStrokes: [],
					
					//context menu
					contextMenu: [
						{item: "Remove Swimlane", procedure: "RemoveSwimlane"},
					],
					// contextMenu: [
					// 	{item: "Cut", procedure: "Cut"},
					// 	{item: "Copy", procedure: "Copy"},
					// 	{item: "Delete", procedure: "Delete"},
					// ],

					readModeContextMenu: [],

					//extension points
					extensionPoints: [
						{extensionPoint: "createElement",
							procedure: "MakeElementType"},
					],

					superTypeIds: [],
				};


	var box_id = ElementTypes.insert(box_type_obj);

	//top row copartment
	var compart_type_obj1 = build_swimlane_compart_type_obj("TopLine", tool_id, version_id, diagram_type_id, box_id);
	CompartmentTypes.insert(compart_type_obj1, {removeEmptyStrings: false});

	//left column compartment
	var compart_type_obj2 = build_swimlane_compart_type_obj("LeftLine", tool_id, version_id, diagram_type_id, box_id);
	compart_type_obj2["styles"][0]["style"]["rotation"] = 270;

	CompartmentTypes.insert(compart_type_obj2, {removeEmptyStrings: false});

	//middle compartment
	var compart_type_obj3 = build_swimlane_compart_type_obj("Middle", tool_id, version_id, diagram_type_id, box_id);
	CompartmentTypes.insert(compart_type_obj3, {removeEmptyStrings: false});
}

function build_box_type_obj(tool_id, version_id, diagram_type_id, super_box_id, editor_type) {
	
	return {
			name: "Box",
			isAbstract: false,
			diagramTypeId: diagram_type_id,
			toolId: tool_id,
			versionId: version_id,
			type: "Box",
			
			//box style
			styles: [{
				id: generate_id(),
				name: "Default",
				elementStyle: build_initial_box_style(editor_type),
			}],

			//key strokes
			keyStrokes: [
				{keyStroke: "Ctrl C", procedure: "Copy"},
				{keyStroke: "Ctrl X", procedure: "Cut"},
				{keyStroke: "Delete", procedure: "DeleteZoomChartBox"},
			],

			readModeKeyStrokes: [],
			
			//context menu
			contextMenu: [
				{item: "Cut", procedure: "Cut"},
				{item: "Copy", procedure: "Copy"},
				{item: "Delete", procedure: "Delete"},
			],

			readModeContextMenu: [],

			//extension points
			extensionPoints: [
				{extensionPoint: "createElement",
					procedure: "MakeElementType"},

				{extensionPoint: "beforeCreateElement",
					procedure: ""},

				{extensionPoint: "afterCreateElement",
					procedure: ""},

				{extensionPoint: "resizeElement",
					procedure: "ResizeConfiguratorElement"},
			],

			superTypeIds: [super_box_id],
		};
}

function build_line_type_obj(tool_id, version_id, diagram_type_id, super_box_id, editor_type) {

	var style = {id: generate_id(), name: "Default"};
	
	var edge_style = build_initial_line_style(editor_type);
	if (is_ajoo_editor(editor_type)) {
		style["elementStyle"] = edge_style["elementStyle"];
		style["startShapeStyle"] = edge_style["startShapeStyle"];		
		style["endShapeStyle"] = edge_style["endShapeStyle"];
	}

	else if (is_zoom_chart_editor(editor_type)) {
		style["elementStyle"] = edge_style;
	}

	var styles = [style];

	return	{ 
			name: "Line",
			isAbstract: false,
			type: "Line",
			diagramTypeId: diagram_type_id,
			toolId: tool_id,
			versionId: version_id,
			startElementTypeId: super_box_id,
			endElementTypeId: super_box_id,
			direction: "BiDirectional",
			lineType: "Orthogonal",

			//line style
			styles: styles,

			//key strokes
			keyStrokes: [
				{keyStroke: "Delete", procedure: "Delete"},
			],

			readModeKeyStrokes: [],
			
			//context menu
			contextMenu: [
				{item: "Delete", procedure: "Delete"},
			],

			readModeContextMenu: [],

			//extension points
			extensionPoints: [
				{extensionPoint: "createElement",
					procedure: "MakeElementType"},

				{extensionPoint: "beforeCreateElement",
					procedure: ""},

				{extensionPoint: "afterCreateElement",
					procedure: ""},
			],

			superTypeIds: [super_box_id],
		};
}

function build_swimlane_compart_type_obj(name, tool_id, version_id, diagram_type_id, elem_type_id) {

	var compart_style = build_box_compartment_style("ajooEditor");
	compart_style["fill"] = "black";
	compart_style["fontSize"] = 17; 

	return {	
			toolId: tool_id,
			versionId: version_id,
			diagramTypeId: diagram_type_id,
			elementTypeId: elem_type_id,
			index: 1,
			tabIndex: 1,
			name: name,
			defaultValue: "",
			description: "",
			prefix: "",
			suffix: "",
			styles: [{
					id: generate_id(),
					name: "Default",
					style: compart_style,
				}],

			inputType: {
				type: "custom",
				templateName: "swimlane_" + name,
			},

			isObjectRepresentation: false,
			noRepresentation: false,

			extensionPoints: [],
		};
}



export {load_configurator}