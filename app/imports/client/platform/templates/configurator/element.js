import { Interpreter } from '/imports/client/lib/interpreter'
import { ElementTypes } from '/imports/db/platform/collections'


//functions makes element type
Interpreter.methods({

	MakeElementType: function(list) {

		var elem_type = this;

		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");

		if (list["type"] == "Line") {

			//selects start element type
			var start_elem_type = ElementTypes.findOne({elementId: list["startElement"]});
			var start_type_id;
			if (start_elem_type) {
				start_type_id = start_elem_type["_id"];
			}

			//selects end element type
			var end_elem_type = ElementTypes.findOne({elementId: list["endElement"]});
			var end_type_id;
			if (end_elem_type) {
				end_type_id = end_elem_type["_id"];
			}

			list["data"] = {type: "NewLine",
							editorType: Interpreter.getEditorType(),
							index: ElementTypes.find().count() + 1,
							data: {	startElementTypeId: start_type_id,
									endElementTypeId: end_type_id,
									diagramTypeId: Session.get("targetDiagramType")}};
		}

		else {
			list["data"] = {type: "NewBox",
							editorType: Interpreter.getEditorType(),
							index: ElementTypes.find().count() + 1,
							data: {diagramTypeId: Session.get("targetDiagramType")}};
		}
	},

	MakeSpecialization: function(list) {

		//selects start element type
		var start_elem_type = ElementTypes.findOne({elementId: list["startElement"]});
		var sub_type_id;
		if (start_elem_type) {
			sub_type_id = start_elem_type["_id"];
		}

		//selects end element type
		var end_elem_type = ElementTypes.findOne({elementId: list["endElement"]});
		var super_type_id;
		if (end_elem_type) {
			super_type_id = end_elem_type["_id"];
		}

		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");
		list["data"] = {type: "Specialization",
						data: {endElementTypeId: super_type_id,
								startElementTypeId: sub_type_id,
								diagramTypeId: Session.get("targetDiagramType")}};
	},

});


