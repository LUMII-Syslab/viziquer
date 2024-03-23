import { generate_id } from '/imports/libs/platform/lib'

function build_initial_diagram_type(list, editor_type) {

	list["extensionPoints"] = [
		{extensionPoint: "beforeCreateDiagram", procedure: ""},
		{extensionPoint: "afterCreateDiagram", procedure: ""},
		{extensionPoint: "createDiagram", procedure: "CreateDiagram"},

		{extensionPoint: "beforeDeleteCollection", procedure: ""},
		{extensionPoint: "afterDeleteCollection", procedure: ""},
		{extensionPoint: "deleteCollection", procedure: "DeleteElementsCollection"},

		{extensionPoint: "beforeCopyCollection", procedure: ""},
		{extensionPoint: "afterCopyCollection", procedure: ""},
		{extensionPoint: "copyCollection", procedure: "CopyCollection"},

		{extensionPoint: "dynamicCollectionContextMenu", procedure: ""},
		{extensionPoint: "dynamicReadModeCollectionContextMenu", procedure: ""},

		{extensionPoint: "dynamicNoCollectionContextMenu", procedure: ""},
		{extensionPoint: "dynamicReadModeNoCollectionContextMenu", procedure: ""},

		{extensionPoint: "cutCollection", procedure: "CutCollection"},
		{extensionPoint: "pasteCollection", procedure: "PasteCollection"},

		{extensionPoint: "beforeDeleteDiagram", procedure: ""},
		{extensionPoint: "afterDeleteDiagram", procedure: ""},		
		{extensionPoint: "deleteDiagram", procedure: "DeleteDiagramObject"},
						
		{extensionPoint: "updateDiagram", procedure: "UpdateDiagram"},
		{extensionPoint: "changeCollectionPosition", procedure: "ChangeCollectionPosition"},
		{extensionPoint: "canvasToImage", procedure: "CanvasToImage"},
	];

	list["toolbar"] = [
		{id: generate_id(), name: "Toggle Grid", procedure: "ToggleGrid", icon: "fa-th"},

		{id: generate_id(), name: "Zoom out", procedure: "ZoomingOut", icon: "fa-minus"},	
		{id: generate_id(), name: "Zoom in", procedure: "ZoomingIn", icon: "fa-plus"},

		{id: generate_id(), name: "Action history", procedure: "ShowDiagramLog", icon: "fa-history"},

		{id: generate_id(), name: "Diagram settings", procedure: "ShowDiagramSettings", icon: "fa-gear"},			
		{id: generate_id(), name: "Permissions", procedure: "Permissions", icon: "fa-lock"},

		{id: generate_id(), name: "Delete", procedure: "DeleteDiagram", icon: "fa-trash-o"},	
	];

	list["readModeToolbar"] = [		
		
		{id: generate_id(), name: "Zoom out", procedure: "ZoomingOut",
		icon: "fa-minus", isInEditableVersion: false, isForAdminOnly: false},	
		
		{id: generate_id(), name: "Zoom in", procedure: "ZoomingIn",
		icon: "fa-plus", isInEditableVersion: false, isForAdminOnly: false},

		{id: generate_id(), name: "Action history", procedure: "ShowDiagramLog",
		icon: "fa-history", isInEditableVersion: false, isForAdminOnly: false},

		{id: generate_id(), name: "Diagram settings", procedure: "ShowDiagramSettings",
		icon: "fa-gear", isInEditableVersion: false, isForAdminOnly: false},

		{id: generate_id(), name: "Permissions", procedure: "Permissions",
		icon: "fa-lock", isInEditableVersion: false, isForAdminOnly: true},
	];

	list["newLineStyle"] = {
					stroke: "black",
					strokeWidth: 1.5,
					opacity: 1,
				};


	list["globalKeyStrokes"] = [{keyStroke: "Ctrl A", procedure: "SelectAll"}];

	list["noCollectionKeyStrokes"] = [
		{keyStroke: "Ctrl V",
			procedure: "Paste"},
		];

	list["readModeNoCollectionKeyStrokes"] = [];

	list["collectionKeyStrokes"] = [
		{keyStroke: "Ctrl X",
			procedure: "Cut"},

		{keyStroke: "Ctrl C",
			procedure: "Copy"},

		{keyStroke: "Delete",
			procedure: "DeleteCollection"},
		];

	list["readModeCollectionKeyStrokes"] = [];										

	list["noCollectionContextMenu"] = [
		{item: "Paste",
			procedure: "Paste"},
		];

	list["readModeNoCollectionContextMenu"] = [];						

	list["collectionContextMenu"] = [
		{item: "Cut",
			procedure: "Cut"},

		{item: "Copy",
			procedure: "Copy"},

		{item: "Delete",
			procedure: "DeleteCollection"},
		];

	list["readModeCollectionContextMenu"] = [];

	list["selectionStyle"] = {
					    fill: 'grey',
					    opacity: 0.4,
					    stroke: 'black',
					    strokeWidth: 0.6,
					};

	list["size"] = {diagramSize: 8, dialogSize: 4};

	list["layoutSettings"] = {"layout": "UNIVERSAL",
														"arrangeMethod": "arrangeFromScratch",
													};
}

function diagram_default_style() {
	return	{fillPriority: "color",
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
		};
}



export {
  diagram_default_style, 
  build_initial_diagram_type
}
