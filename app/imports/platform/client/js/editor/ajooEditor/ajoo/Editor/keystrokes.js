
//executes editor's keydowns that are hard-coded like (Ctrl+arrow to move shape),
//and those which are specified in the configurator
var editor_keydowns = function(e) {

	//if Ctrl pressed or editing the dialog
	if (e.keyCode == 17 || Session.get("editingDialog"))
		return false;

	//if ctrl + arrow up, arrowd down, arrow left, arrow right
	if (e.ctrlKey == true && (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40)) {
		console.log("arrow up, down, ...")

	}
	else {
		//collects selected elements
		var editor = get_editor();
		var selected = editor.getSelectedElements();

		var is_procedure_executed = false;
		var diagram_type = get_active_diagram_type_obj();

		if (!diagram_type)
			return;

		//if selection size is 0, then executes function from noCollectionKeyStrokes array
		if (editor.isSelectionEmpty()) {
			if (is_editor_in_edit_mode())
				is_procedure_executed = process_keystroke(e, diagram_type["noCollectionKeyStrokes"]);
			else
				is_procedure_executed = process_keystroke(e, diagram_type["readModeNoCollectionKeyStrokes"]);
		}
		else {

			//if selection size is equal to 1, then executes function from element keyStrokes array
			if (editor.selection.isSingleElementSelection()) {
				var elem_type = get_active_element_type_obj();
				if (is_editor_in_edit_mode())
					is_procedure_executed = process_keystroke(e, elem_type["keyStrokes"]);
				else
					is_procedure_executed = process_keystroke(e, elem_type["readModeKeyStrokes"]);
			}

			//if selection size is greater than 1, then executes function from collectionKeyStrokes array		
			else {
				if (is_editor_in_edit_mode())
					is_procedure_executed = process_keystroke(e, diagram_type["collectionKeyStrokes"]);
				else
					is_procedure_executed = process_keystroke(e, diagram_type["readModeCollectionKeyStrokes"]);
			}
		}

		//if a keystroke was not executed, then tries executing global keystrokes that are
		//not related to the collections, for example, Ctrl A (selects all diagram elements)
		if (!is_procedure_executed) {
			is_procedure_executed = process_keystroke(e, diagram_type["globalKeyStrokes"]);
		}

		//if procedure was executed, then stops default browser behaviour
		if (is_procedure_executed) {
			e.preventDefault();
			return false;
		}
	}
}

//processes the pressed keystroke
function process_keystroke(e, key_strokes) {

	if (!key_strokes)
		return;

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
				
			execute_procedure_by_name(keyStroke["procedure"]) 
			return "procedureExecuted";
		}
	}
}

//encods the keystrokes specified in the configurator.
//They are specified as strings in the form - "key1 key2 key3" and returns key codes
function encode_keystrokes(key_strokes) {
	var encoded_keystrokes = [];

	//each keystroke string is splited and each key is stored in the array
	$.each(key_strokes, function(index, key_stroke) {
		var item = {};
		item["procedure"]= key_stroke["procedure"];

		//the specified key stroke combination has to be in the form - "key1 key2 key3"
		var keys = key_stroke["keyStroke"].split(" ");

		if (keys[0] == 'Ctrl')
			item["keys"] = {ctrl: true, keyCode: keys[1].charCodeAt(0)};
		else
			//delete has a special key code
			if (keys[0] == 'Delete')
				item["keys"] = {ctrl: false, keyCode: 46};
			
			//"standart" key stroke
			else
				item["keys"] = {ctrl: false, keyCode: keys[0].charCodeAt(0)};

		encoded_keystrokes.push(item);
	});
	
	return encoded_keystrokes;
}


export default {kkk: 444555}