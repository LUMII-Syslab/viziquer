
 _.extend(Interpreter, {

		//executes editor's keydowns that are hard-coded like (Ctrl+arrow to move shape),
		//and those which are specified in the configurator
		processKeyDown: function(e) {
			//console.log(e.originalEvent.target.value + e.key);
			// console.log(e);
			
			// console.log("in process key down")
	
			var text = e.originalEvent.target.value + e.key;
			try {
				// var parsed_exp = vq_arithmetic.parse(str, {completions});
				var schema = new VQ_Schema();
				var parsed_exp = vq_grammar_completion.parse(text, {schema:schema, symbol_table:{}});
				var obj = JSON.parse(parsed_exp);
				//console.log("parsed_exp", parsed_exp, obj);
			} catch (com) {
				// TODO: error handling
				// console.log(com["message"], JSON.parse(com["message"]));
				// console.log(com);
				// var c = getContinuations(text, text.length, JSON.parse(com["message"]));
				// console.log(JSON.stringify(c, 0, 2));
			}

			//if Ctrl pressed or editing the dialog
			if (e.keyCode == 17 || Session.get("editingDialog") || $(".modal.in").length > 0 || Session.get("isYasqeActive")) {
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
					e.preventDefault();
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


		function getCompletionTable(continuations_to_report) {
			console.log("continuations_to_report", continuations_to_report);
			var sortable = [];
			for (var  key in continuations_to_report) {
				sortable.push(continuations_to_report[key]);
			}

			sortable.sort(function(a, b) {
				return  a.priority-b.priority;
			});
			
			var uniqueMessages = []
			
			for (var key in sortable) {
				//remove empty continuations
				if (sortable[key]["name"] != "") {
					uniqueMessages.push(sortable[key]["name"]);
				}
			}
			
			return uniqueMessages
		}
		
		//text - input string
		//length - input string length
		function getContinuations(text, length, continuations) {
			var farthest_pos = -1 //farthest position in continuation table
			var farthest_pos_prev = -1 // previous farthest position (is used only some nonterminal symbol is started)
			var continuations_to_report;
			
			//find farthest position in continuation table
			//find  previous farthest position
			for (var pos in continuations) {
				if (farthest_pos != -1) {
					farthest_pos_prev = farthest_pos
				}
				if (parseInt(pos) > farthest_pos) {
					farthest_pos = parseInt(pos)
					continuations_to_report = continuations[pos]
				}
			}

			
			if (farthest_pos_prev != -1) {
				for (i = farthest_pos; i >=0; i--) {	
					if (continuations[i] != null) {
						for (var pos in continuations[i]) {	
							//ja sakumi sakrit un nesarkit viss vards
							var varrible = text.substring(i, farthest_pos)
							if (pos.substring(0, varrible.length) == varrible && varrible != pos) {
								//console.log("YYYYYYYYYYYYYYYYYYYYYYY", continuations[i][pos], pos, pos.substring(0, varrible.length), varrible);
								continuations_to_report[pos] = continuations[i][pos];
							}
						}
					}
				}
			}
			
			var TermMessages=[];
			
			if (length>=farthest_pos) { 
				//nemam mainigo no kludas vietas lidz beigam
				var er = text.substring(farthest_pos, length)
				var er_lenght = er.length
	
				//parbaudam, vai ir saderibas iespejamo turpinajumu tabulaa
				for (var pos in continuations_to_report) {
					if (pos.substring(0, er_lenght) == er) {
						TermMessages[pos]=continuations_to_report[pos]; 
					}
				}
				TermMessages = getCompletionTable(TermMessages) 
				if (TermMessages[0] != null) {
					return TermMessages
					//ja nebija sakritibu iespejamo turpinajumu tabulaa, tad ir kluda
				} else {
					var uniqueMessages = getCompletionTable(continuations_to_report)
					var messages = [];
					
					messages.push("ERROR: in a possotion " + farthest_pos + ", possible follows are:");
					
					for (var pos in uniqueMessages) {
						messages.push( "     " + uniqueMessages[pos]);
					}
					return messages
				}
			}
			
			var uniqueMessages = getCompletionTable(continuations_to_report)
			return uniqueMessages
		}