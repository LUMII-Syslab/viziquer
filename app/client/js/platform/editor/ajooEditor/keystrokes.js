import { Interpreter } from '/client/lib/interpreter'
import { DiagramTypes, ElementTypes } from '/libs/platform/collections'

 _.extend(Interpreter, {

		//executes editor's keydowns that are hard-coded like (Ctrl+arrow to move shape),
		//and those which are specified in the configurator
		processKeyDown: function(e) {
			var modal_path = ".modal.in";

			// if modal is open, than closing it
			if (e.keyCode == 13 && _.size($(modal_path)) > 0) {
				$(modal_path).find(".btn.btn-primary").trigger("click");
				return;
			}

			//if Ctrl pressed or editing the dialog

			if (e.keyCode == 17 || Session.get("editingDialog") || $(".modal.in").length > 0 || Session.get("isYasqeActive") || e.target.id.includes('filter_text'))  {
				return false;
			}

			//if ctrl + arrow up, arrowd down, arrow left, arrow right
			if (e.ctrlKey == true && (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40)) {
				console.log("arrow up, down, ...")
			}

			else {
				//collects selected elements
				var editor = Interpreter.editor;
				var selected = editor.getSelectedElements();

				var is_procedure_executed = false;
				var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
				if (!diagram_type) {
					return;
				}

				//if selection size is 0, then executes function from noCollectionKeyStrokes array
				if (editor.isSelectionEmpty()) {
					if (editor.isEditMode()) {
						is_procedure_executed = processKeyPress(e, diagram_type["noCollectionKeyStrokes"]);
					}
					else {
						is_procedure_executed = processKeyPress(e, diagram_type["readModeNoCollectionKeyStrokes"]);
					}
				}

				else {

					//if selection size is equal to 1, then executes function from element keyStrokes array
					if (editor.selection.isSingleElementSelection()) {
						var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
						if (editor.isEditMode()) {
							is_procedure_executed = processKeyPress(e, elem_type["keyStrokes"]);
						}
						else {
							is_procedure_executed = processKeyPress(e, elem_type["readModeKeyStrokes"]);
						}
					}

					//if selection size is greater than 1, then executes function from collectionKeyStrokes array		
					else {
						if (editor.isEditMode()) {
							is_procedure_executed = processKeyPress(e, diagram_type["collectionKeyStrokes"]);
						}
						else {
							is_procedure_executed = processKeyPress(e, diagram_type["readModeCollectionKeyStrokes"]);
						}
					}
				}

				//if a keystroke was not executed, then tries executing global keystrokes that are
				//not related to the collections, for example, Ctrl A (selects all diagram elements)
				if (!is_procedure_executed) {
					is_procedure_executed = processKeyPress(e, diagram_type["globalKeyStrokes"]);
				}

				//if procedure was executed, then stops default browser behaviour
				if (is_procedure_executed) {
					// e.preventDefault();
					return false;
				}
			}
		},

});

function processKeyPress(e, key_strokes) {

	if (!key_strokes) {
		return;
	}

	//encodes key stoke table
	var encoded_key_strokes = encode_keystrokes(key_strokes);

	//collects pressed keys
	var ctrl_key = e.ctrlKey;
	var key_code = e.keyCode;

	//searching if pressed key is specified in the key strokes table
	//if it is, executes the corressponding procedure
	for (var i=0;i<encoded_key_strokes.length;i++) {
		var keyStroke = encoded_key_strokes[i];
		if (keyStroke && keyStroke["keys"] &&
			(keyStroke["keys"]["ctrl"] == ctrl_key && 
			(keyStroke["keys"]["keyCode"] == key_code || keyStroke["keys"]["keyCode"] == key_code+32))) {

			Interpreter.execute(keyStroke["procedure"]);
			return "procedureExecuted";
		}
	}
}


//encods the keystrokes specified in the configurator.
//They are specified as strings in the form - "key1 key2 key3" and returns key codes
function encode_keystrokes(key_strokes) {

	//each keystroke string is splited and each key is stored in the array
	return _.map(key_strokes, function(key_stroke) {
				var item = {};
				item["procedure"] = key_stroke["procedure"];

				//the specified key stroke combination has to be in the form - "key1 key2 key3"
				var keys = key_stroke["keyStroke"].split(" ");
				if (keys[0] == 'Ctrl') {
					item["keys"] = {ctrl: true, keyCode: keys[1].charCodeAt(0)};
				}
				else {
					//delete has a special key code
					if (keys[0] == 'Delete') {
						item["keys"] = {ctrl: false, keyCode: 46};
					}
					
					//"standart" key stroke
					else {
						item["keys"] = {ctrl: false, keyCode: keys[0].charCodeAt(0)};
					}
				}

				return item;
			});
}