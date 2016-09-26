
Interpreter.methods({

	createDiagram: function(diagram_name, diagram_type_id) {

		var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
		if (!diagram_type) {
			return;
		}

		var list = {name: diagram_name};
		var res = Interpreter.executeExtensionPoint(diagram_type, "beforeCreateDiagram", list);

		if (res != false) {
			Interpreter.executeExtensionPoint(diagram_type, "createDiagram", list);

			Utilities.callMeteorMethod("insertDiagram", list, function(id) {

				list["diagramId"] = id;
				Interpreter.executeExtensionPoint(diagram_type, "afterCreateDiagram", list);

				if (id) {
					Router.go("diagram", {projectId: list["projectId"],
											_id: id,
											diagramTypeId: list["diagramTypeId"],
											versionId: list["versionId"],
										});
				}

			});
		}
	},

	delete_diagram: function(diagram_id) {

		if (!diagram_id) {
			diagram_id = Session.get("activeDiagram");
		}

		var diagram = Diagrams.findOne({_id: diagram_id});
		if (diagram) {
			var diagram_type_id = diagram["diagramTypeId"];
			var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
			if (!diagram_type) {
				diagram_type = DiagramTypes.findOne({});
				if (!diagram_type) {
					return;
				}
			}

			var list = {id: diagram_id};
			var res = Interpreter.executeExtensionPoint(diagram_type, "beforeDeleteDiagram", list);
			if (res != false) {
				Interpreter.executeExtensionPoint(diagram_type, "deleteDiagram", list);
				Interpreter.executeExtensionPoint(diagram_type, "afterDeleteDiagram", list);
			}
		}
	},

	CreateDiagram: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");
		list["style"] = obj_type["style"];
		list["diagramTypeId"] = obj_type["_id"];
		list["editorType"] = obj_type["editorType"];
	},

	DeleteDiagramObject: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] =	Session.get("versionId");

		Utilities.callMeteorMethod("removeDiagram", list);
		Router.go("diagrams", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")});
	},

	AddTargetDiagram: function() {

		var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		if (elem_type) {

			//vajag new diagram type
			var diagram_type = DiagramTypes.findOne({_id: elem_type["targetDiagramTypeId"]});
			if (!diagram_type) {
				return;
			}

			var elem_id = Session.get("activeElement");
			var compart = Compartments.findOne({elementId: elem_id, isObjectRepresentation: true});
			if (!compart) {
				compart = Compartments.findOne({elementId: elem_id});
			}

			var diagram = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							name: compart["value"] || "Diagram",
							diagramTypeId: diagram_type["_id"],
							style: diagram_type["style"],
						};

			var element = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							id: elem_id,
						};	

			var list = {parentDiagram: Session.get("activeDiagram"), diagram: diagram, element: element};

			Utilities.callMeteorMethod("addTargetDiagram", list);
		}
	},

	Navigate: function() {
		var elem = Elements.findOne({_id: Session.get("activeElement")});
		if (elem) {
			var target_id = elem["targetId"];
			if (target_id) {

				var stage = Interpreter.editor;
				stage["selection"] = [];
				stage["selected"] = {};

				Router.go("diagram", {projectId: Session.get("activeProject"),
										_id: target_id,
										diagramTypeId: Session.get("diagramType"),
										versionId: Session.get("versionId"),
										editMode: "edit",
									});
			}
		}
	},

	ChangeCollectionPosition: function(list) {
	    list["projectId"] = Session.get("activeProject");
	    list["versionId"] = Session.get("versionId");

	    Utilities.callMeteorMethod("changeCollectionPosition", list);
	},

});

