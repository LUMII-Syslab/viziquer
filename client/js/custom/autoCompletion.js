var symbolTable = {};
var grammarType = "class";

/*'
"

%
.
,
/
+
-
=
!
<
>
{
[
(
}
)
]
?
|
*
@
`
&
*/

Interpreter.customMethods({

	conditionAutoCompletion: function(e, compart) {
		grammarType = "class"
		symbolTable = generateSymbolTableAC();
		autoCompletion(e);
	},

	attributeAutoCompletion: function(e, compart) {
		grammarType = "attribute"
		symbolTable = generateSymbolTableAC();
		autoCompletion(e);
	},

	linkAutoCompletion: async function(e, compart) {
		grammarType = "link"
		await autoCompletion(e);
	},
	
	classAutoCompletion: async function(e, compart) {
		grammarType = "className"
		await autoCompletion(e);
	},

});

var currentFocus = 0;


generateSymbolTableAC = function() {
	if(isAutocompletionActive()==false){
		
		var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());
		var abstractQueryTable = {}

		// now we should find the connected classes ...
		if (elem) {
		   var selected_elem = new VQ_Element(elem[0]);
		   var visited_elems = {};

		   function GetComponentIds(vq_elem) {
			   visited_elems[vq_elem._id()]=true;
			   _.each(vq_elem.getLinks(),function(link) {
				   if (!visited_elems[link.link._id()]) {
					 visited_elems[link.link._id()]=true;
					 var next_el = null;
					 if (link.start) {
					   next_el=link.link.getStartElement();
					 } else {
					   next_el=link.link.getEndElement();
					 };
					 if (!visited_elems[next_el._id()]) {
						GetComponentIds(next_el);
					 };
				   };
			   });
		   };

		   GetComponentIds(selected_elem);

		   var elem_ids = _.keys(visited_elems);
		   var queries = genAbstractQueryForElementList(elem_ids, null);
			_.each(queries,function(q) {
			abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		   })
		} else {
		  // nothing selected
		}
		// console.log("SymbolTable", abstractQueryTable["symbolTable"][Session.get("activeElement")]);
		
		return abstractQueryTable["symbolTable"][Session.get("activeElement")];
	} else {
		return symbolTable;
	}
  }

autoCompletionAddCondition = async function(e) {
	grammarType = "class"
	symbolTable = generateSymbolTableAC();
	await autoCompletion(e);
}

autoCompletionAddAttribute = async function(e) {
	grammarType = "attribute"
	symbolTable = generateSymbolTableAC();
	await autoCompletion(e);
},

autoCompletionAddLink = async function(e) {
	grammarType = "linkPath"
	symbolTable = generateSymbolTableAC();
	await autoCompletion(e);
},

autoCompletion = async function(e) {
	removeMessage();
	// if ((e.ctrlKey || e.metaKey) && (e.keyCode === 32 || e.keyCode === 0)) {
	// if (!isAutocompletionActive() && e.keyCode !== 27 && e.keyCode !== 9) {
	if (isAutocompletionKey(e) && !isAutocompletionActive()) {
		var elem = document.activeElement;
		var text = e.originalEvent.target.value;
		var textBefore = text.substring(0, elem.selectionStart);

		var continuations = await runCompletionNew(textBefore, text, textBefore.length);

		if(typeof continuations == "string" && continuations.startsWith("ERROR")){
			errorMessage(continuations, elem);
			elem.addEventListener("keyup", keyUpHandler);
			elem.addEventListener("click", clickHandler);
			//autocomplete(elem, continuations);
		}else{
			elem.addEventListener("keyup", keyUpHandler);
			elem.addEventListener("click", clickHandler);
			autocomplete(elem, continuations);
		}
	}
}

autoCompletionCleanup = function() {
	// console.log('auto completion cleanup');
	removeMessage();
	closeAllLists();
}

const isAutocompletionActive = function() {
	const aList = document.getElementById('autocomplete-list');
	const active = !!aList;
	// console.log('AC active:', active)
	return active;
}

const AUTOCOMPLETE_EXCLUSIONS = [
	'Escape',
	'Tab',
	'Delete',
	'Backspace',
	'CapsLock',
];

const isAutocompletionKey = function(e) {
	let ev = e.originalEvent;

	if ((ev.ctrlKey || ev.metaKey) && ev.code === 'Space') return true;
	if (ev.ctrlKey || ev.metaKey) return false;
	return ev.location === 0 && !AUTOCOMPLETE_EXCLUSIONS.includes(ev.key);
}

async function keyUpHandler(e){

	if(e.keyCode === 8){
		var m = document.getElementById("message");
		if(m != null) {
			removeMessage();
			var text = e.target.value;
			// var continuations = runCompletion(text, Session.get("activeElement"));
			var textBefore = text.substring(0, e.target.selectionStart);
			var continuations = await runCompletionNew(textBefore, text, textBefore.length);

			if(typeof continuations == "string" && continuations.startsWith("ERROR")){
				errorMessage(continuations,  document.activeElement);
				closeAllLists();
			}else{
				autocomplete(document.activeElement, continuations);
			}
		}
	}

	if(e.keyCode !== 40 && e.keyCode !== 38 && e.keyCode !== 13 && e.keyCode !== 9 && e.keyCode !== 27){
		if(document.getElementsByClassName("autocomplete-items").length > 0){

			removeMessage();
			var text = e.target.value;
			// var continuations = runCompletion(text, Session.get("activeElement"));
			var textBefore = text.substring(0, e.target.selectionStart);
			var continuations = await runCompletionNew(textBefore, text, textBefore.length);

			if(typeof continuations == "string" && continuations.startsWith("ERROR")){
				errorMessage(continuations,  document.activeElement);
				closeAllLists();
			}else{
				autocomplete(document.activeElement, continuations);
			}
		}
	}
}

function keyDownHandler(e){

	if (!isAutocompletionActive()) return;
	const aList = document.getElementById("autocomplete-list");
	const listItems = aList.getElementsByTagName("div");

	if (e.keyCode === 40) {//arrow down
		e.preventDefault();
		currentFocus++;
		addActive(listItems);
	} else if (e.keyCode === 38) { //arrow up
		e.preventDefault();
		currentFocus--;
		addActive(listItems);
	} else if (e.keyCode === 13) { //ENTER
		e.preventDefault();
		e.stopPropagation();
		if (currentFocus === -1) currentFocus = 0;
		if (currentFocus > -1) {
			if (listItems) listItems[currentFocus].click();
		}
	} else if (e.keyCode === 9) { //TAB
		e.preventDefault();
		if (currentFocus === -1) currentFocus = 0;
		if (currentFocus > -1) {
			if (listItems) listItems[currentFocus].click();
		}
	} else if (e.keyCode === 27) { //ESC
		e.preventDefault();
		closeAllLists();
		return false;
	}
}

function clickHandler(e){
	closeAllLists();
	//var elem = document.activeElement;
	//elem.removeEventListener("keyup", keyUpHandler);
}

function autocomplete(inp, continuations) {

	const colorForType = (type) => {
		switch (type) {
			case 1: return '#800000';
			case 2: return '#008000';
			case 3: return '#000080';
			case 4: return '#008080';
			default: return '#404040';
		}
	};

	const descriptionForType = (type) => {
		switch (type) {
			case 1: return 'data property';
			case 2: return 'object property';
			case 3: return 'schema element';
			case 4: return 'language construct';
			default: return 'other';
		}
	};

	removeMessage();
	var cursorPosition = inp.selectionStart;

	var a, b, i, val = inp.value;

    /*close any already open lists of autocompleted values*/
    closeAllLists();

	if (typeof continuations === 'string') { // should not happen
		// continuations = { prefix: '', suggestions: []}
		return;
	}
	if (continuations.suggestions.length === 0) {
		// continuations.suggestions.push({type: 0, name: '-- no suggestions found --'});
		// continuations.suggestions.push({type: 0, name: ''});
		return;
	}

	let ss = continuations.suggestions;
	let nonLanguageConstruct = ss.find(s => s.type < 4);
	if (!nonLanguageConstruct) {
		ss.push({type: 0, name: '', priority: Number.MAX_SAFE_INTEGER});
	}

	ss.sort((a, b) => b.priority - a.priority);

	/*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");

	a.style.display = 'block';
	a.style.position = 'auto';
	a.style.width = '100%';
	a.style.maxHeight = '200px';
	a.style.overflow = 'hidden';
	a.style.overflowY = 'auto';
	a.style.listStyle = 'none';
	a.style.padding = '2px';
	a.style.margin = 0;
	a.style.border = '1px solid #bbb';
	a.style.backgroundColor = '#efefef';
	a.style.boxShadow = '0px 0px 6px 1px rgba(128,128,128,0.3)';
	a.style.borderRadius = '4px';

    a.setAttribute("id", "autocomplete-list");
	a.setAttribute("class", "autocomplete-items");

    /*append the DIV element as a child of the autocomplete container:*/
    inp.parentNode.appendChild(a);

	for (let [i, sugg] of ss.entries()) {
        /*create a DIV element for each matching element:*/
		b = document.createElement("DIV");

        b.innerHTML = `<span style='color: #808080'>${continuations.prefix}</span><span style='font-weight: 900; color: ${colorForType(sugg.type)}'>${sugg.name}</span>`;
        b.innerHTML += ` <span style='color: #c0c0c0; float: right'>(${descriptionForType(sugg.type)})</span>`;
        /*insert a input field that will hold the current array item's value:*/
		b.innerHTML += `<input type='hidden' value='${sugg.name}' name='suggestion'>`;
		b.innerHTML += `<input type='hidden' value='${continuations.prefix}' name='prefix'>`;

        /*execute a function when someone clicks on the item value (DIV element):*/
		b.addEventListener("click", function(e) {
			/*insert the value for the autocomplete text field:*/
			// var inputValue = generateInputValue(inp.value, this.getElementsByTagName("input")[0].value, cursorPosition);
			// inp.value = inputValue;
			updateInputValue(inp, continuations.prefix, sugg.name);
			/*close the list of autocompleted values,(or any other open lists of autocompleted values:*/
			closeAllLists();
			inp.focus();
		});

		if (i === currentFocus) b.style.backgroundColor = '#f8c26c';
        a.appendChild(b);
	}

	inp.removeEventListener("keydown", keyDownHandler);
	inp.addEventListener("keydown", keyDownHandler);

}

//function to classify an item as selected
function addActive(x) {
	if (!x) return false;
	removeActive(x);
	if (currentFocus >= x.length) currentFocus = 0;
	if (currentFocus < 0) currentFocus = (x.length - 1);
	x[currentFocus].style.backgroundColor = '#f8c26c';
	x[currentFocus].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

//function to remove selected item
function removeActive(x) {
	for (var i = 0; i < x.length; i++) {
		x[i].style.backgroundColor = '#efefef';
	}
}

function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document, except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != document.activeElement) {
        x[i].parentNode.removeChild(x[i]);
	  }
	}
	currentFocus = 0;
}

function updateInputValue(input, prefix, suggestion) {
	let selStart = input.selectionStart;
	let selEnd = input.selectionEnd;
	let tail = input.value.slice(selEnd);
	let newValue = prefix + suggestion + tail;
	let cursorPos = prefix.length + suggestion.length;
	input.value = newValue;
	input.selectionStart = cursorPos;
	input.selectionEnd = cursorPos;

	input.blur();
	input.focus();

	var act_elem = Session.get("activeElement");
	var act_el = Elements.findOne({_id: act_elem});
	if(typeof act_el !== 'undefined'){
		var compart_type_id = $(input).closest(".compart-type").attr("id");
		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		var compart = Compartments.findOne({compartmentTypeId: compart_type_id, elementId: act_elem});
		if(typeof compart !== "undefined"){
			Dialog.updateCompartmentValue(compart_type, newValue, newValue, compart["_id"]);
		}
	}
}

/*
function generateInputValue(fi, con, cursorPosition){

	var fullInput = fi.substring(0, cursorPosition).toLowerCase();
	var continuation = con.toLowerCase();

	var fullTillCursor = fi.substring(0, cursorPosition);

	var inputValue = fullTillCursor + con;
	var inputSet = false;
	var counter = 1;

	while(inputSet == false && continuation.length > counter){
		var subSt = fullInput.lastIndexOf(continuation.substring(0, counter));
		if(subSt == -1) inputSet = true;
		else {
			if(continuation.startsWith(fullInput.substring(subSt)) == true){
				inputSet = true;
				inputValue = fullTillCursor.substring(0, subSt) + con;
			} else {
				counter++;
			}
		}
	}

	inputValue = inputValue + fi.substring(cursorPosition);

	return inputValue;
}
*/

runCompletion = function (text, act_elem2){
	var act_elem = Session.get("activeElement");
	try {
		var schema = new VQ_Schema();

		if(grammarType == "link"){
			var name_list = [];
			//var act_elem = Session.get("activeElement");
			if (act_elem) {
				var vq_link = new VQ_Element(act_elem);
				if (vq_link.isLink()) {
					var parsed_exp = vq_property_path_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, context:vq_link.getStartElement(), link:vq_link});
				};
			};
		} else if(grammarType == "linkPath"){
			var name_list = [];
			//var act_elem = Session.get("activeElement");
			if (act_elem) {
				var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
				var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
				var className = compart["input"];
				var parsed_exp = vq_property_path_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, context:vq_link.getStartElement(), className:className});
			};
		} else {
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
			var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
			var className = compart["input"];

			// var parsed_exp = vq_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
			var parsed_exp = vq_grammar_completion_parser.parse(text, {schema:schema, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
			// var obj = JSON.parse(parsed_exp);
		}
		//console.log("parsed_exp", parsed_exp, obj);
	} catch (com) {
		// console.log(Session.get("activeElement"),  com["message"]);
		// console.log(com["message"], JSON.parse(com["message"]));
		// console.log(com);
		var c = getContinuations(text, text.length, JSON.parse(com["message"]));
		// console.log(JSON.stringify(c, 0, 2));
		return c;
	}

	return [];
}

runCompletionNew = async function  (text, fullText, cursorPosition){
		
	if(grammarType == "className"){
			
			/*try {
			// var parsed_exp = testGramma_completion.parse(text, {schema:"", symbol_table:"", className:"", type:grammarType, context:""});
			var parsed_exp = await testGrammar_completion_parser.parse(text, {schema:"", symbol_table:"", className:"", type:grammarType, context:""});
			}catch (com) {
				// console.log("uuuuuuuuuuuuuuuuuu", text, com);
				console.log("uuuuuuuuuuuuuuuuuu", JSON.parse(com["message"]));
				// var c = getContinuationsNew(text, text.length, JSON.parse(com["message"]));			
				// return c;
			}*/
			
			var c = {};
			c["prefix"] = "";
			c["suggestions"] = [];
			var cls;
			
			var params = {}
			if(fullText != "") params.filter = fullText;
			
			var selected_elem_id = Session.get("activeElement");			
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
				
				var vq_obj = new VQ_Element(selected_elem_id);
				
				var individual =  vq_obj.getInstanceAlias();
				if (individual !== null && individual !== undefined) params.uriIndividual = individual;
				
				var pList = {in: [], out: []};
				var field_list = vq_obj.getFields().map(function(f) { return {name:f.exp, type: 'out'}});
				if ( field_list.length > 0) pList.out = field_list;
			
				var link_list =  vq_obj.getLinks();
				_.each(link_list.map(function(l) { var type = (l.start ? 'in': 'out'); return {name:l.link.getName(), type: type}}),function(link) {
					if (link.type === 'in')
						pList.in.push(link);
					else
						pList.out.push(link);
				});
				
				if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
				//params.onlyPropsInSchema =  true;  // Šis dod tikai galvenās klases un strādā ātrāk.
			}			
			
			cls = await dataShapes.getClasses(params);
			//if(fullText != ""){
			//	cls = await dataShapes.getClasses({filter:fullText});
			//}else{
			//	cls = await dataShapes.getClasses();
			//}
			
			cls = cls["data"];

			for(var cl in cls){
				var prefix;
				if(cls[cl]["is_local"] == true)prefix = "";
				else prefix = cls[cl]["prefix"]+":";
				c["suggestions"].push({name: prefix+cls[cl]["display_name"], priority:100, type:3})
			}
			return c;
	} else {
	
		var act_elem = Session.get("activeElement");
		try {
			var schema = new VQ_Schema();
			
			if(grammarType == "link"){
				var name_list = [];

				if (act_elem) {
					var vq_link = new VQ_Element(act_elem);
					if (vq_link.isLink()) {
						var parsed_exp = vq_property_path_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, context:vq_link.getStartElement(), link:vq_link});
					};
				};
			} else if(grammarType == "linkPath"){
				var name_list = [];
				//var act_elem = Session.get("activeElement");
				if (act_elem) {
					var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
					var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
					var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
					var className = compart["input"];
					var parsed_exp = vq_property_path_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, context:act_elem, className:className});
				};
			} else {

				var className = "";

				var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
				if(typeof act_el !== 'undefined'){
					var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
					var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
					if(typeof compart !== 'undefined') className = compart["input"];
				}

				// var parsed_exp = vq_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
				var parsed_exp = vq_grammar_completion_parser.parse(text, {schema:schema, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
			}
		} catch (com) {
			// console.log(com);
			var c = getContinuationsNew(text, text.length, JSON.parse(com["message"]));			
			return c;
		}
	}
	return [];
}

function getCompletionTable(continuations_to_report) {
	var sortable = [];
	for (var  key in continuations_to_report) {
		sortable.push(continuations_to_report[key]);
	}

	sortable.sort(function(a, b) {
		// return  a.priority-b.priority;
		return  b.priority-a.priority;
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


function getCompletionTableNew(continuations_to_report, text) {

	var sortable = [];
	for (var  key in continuations_to_report) {
		if(continuations_to_report[key]["name"] != "" && continuations_to_report[key]["name"] != " "){
			if(continuations_to_report[key]["spaceBefore"] == true && text.length != 0 && text.substring(text.length-1) != " ") sortable.push({"name":" "+continuations_to_report[key]["name"], "priority":continuations_to_report[key]["priority"], "type":continuations_to_report[key]["type"]});
			else sortable.push({"name":continuations_to_report[key]["name"], "priority":continuations_to_report[key]["priority"], "type":continuations_to_report[key]["type"]});
		}// sortable.push(continuations_to_report[key]);
	}

	sortable = sortable.sort(function (a, b) {
		if (a.type < b.type) return -1;
		if (a.type > b.type) return 1;

		if (a.priority < b.priority) return 1;
		if (a.priority > b.priority) return -1;

	});

	return sortable
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
				var varrible = text.substring(i, farthest_pos);
				var startedContinuations = [];
				var wholeWordMatch = false;
				for (var pos in continuations[i]) {
					//ja sakumi sakrit un nesarkit viss vards
					if (pos.substring(0, varrible.length).toLowerCase() == varrible.toLowerCase() && varrible.toLowerCase() != pos.toLowerCase() && varrible != "") {
						continuations_to_report[pos] = continuations[i][pos];
						startedContinuations[pos] = continuations[i][pos];
					} else if(varrible == pos) wholeWordMatch = true;
				}
				if(Object.keys(startedContinuations).length > 0 && wholeWordMatch != true) continuations_to_report = startedContinuations;
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
			//console.log("pospospos", er, pos);
			if (pos.substring(0, er_lenght).toLowerCase() == er.toLowerCase()) {
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

			var messages = "ERROR: in a position " + farthest_pos + ", possible continuations are:";

			for (var pos in uniqueMessages) {
				messages = messages+ "\n" + uniqueMessages[pos] + ",";
			}
			return messages
		}
	}

	var uniqueMessages = getCompletionTable(continuations_to_report);

	return uniqueMessages
}

//text - input string
//length - input string length
function getContinuationsNew(text, length, continuations) {

	var allSuggestions = []
	var farthest_pos = -1 //farthest position in continuation table
	var farthest_pos_prev = -1 // previous farthest position (is used only some nonterminal symbol is started)
	var continuations_to_report;

	var prefix = text;

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
				var varrible = text.substring(i, farthest_pos);

				var startedContinuations = [];
				var wholeWordMatch = false;

				for (var pos in continuations[i]) {
					if(varrible.toLowerCase() == pos.toLowerCase()) wholeWordMatch = true;
				}

				for (var pos in continuations[i]) {
					//if contuniation contains sub string
					if (isNaN(varrible.substring(0, 1)) != false && wholeWordMatch!= true && pos.toLowerCase().includes(varrible.toLowerCase()) && varrible.toLowerCase() != pos.toLowerCase() && varrible != "") {
						prefix = text.substring(0, i);
						continuations_to_report[pos] = continuations[i][pos];
						startedContinuations["'"+pos+"'"] = continuations[i][pos];
					} 
					else {
						//if starts with
						if (pos.substring(0, varrible.length).toLowerCase() == varrible.toLowerCase() && varrible.toLowerCase() != pos.toLowerCase() && varrible != "") {
							var suggestions = pos.substring(varrible.length);
							continuations_to_report[pos] = {"name":suggestions, "priority":100, "type":continuations[i][pos]["type"], "spaceBefore":false}
							startedContinuations[pos] = {"name":suggestions, "priority":100, "type":continuations[i][pos]["type"], "spaceBefore":false}

						}
					}
				}

				if(Object.keys(startedContinuations).length > 0 && wholeWordMatch != true) continuations_to_report = startedContinuations;
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
			if (pos.substring(0, er_lenght).toLowerCase() == er.toLowerCase()) {
				TermMessages["'"+pos+"'"]=continuations_to_report[pos];
				if(length>farthest_pos) prefix = text.substring(0, farthest_pos);
			}
		}

		if (Object.keys(TermMessages).length > 0) {
			TermMessages = getCompletionTableNew(TermMessages, text)
			return {prefix:prefix, suggestions:TermMessages}
		//ja nebija sakritibu iespejamo turpinajumu tabulaa, tad ir kluda
		} else {
			var uniqueMessages = getCompletionTableNew(continuations_to_report, text)
			var messages = [];

			var messages = "ERROR: in a position " + farthest_pos + ", possible continuations are:";

			for (var pos in uniqueMessages) {
				if(uniqueMessages.length-1 > pos)messages = messages+ "\n" + uniqueMessages[pos]["name"] + ",";
				else messages = messages+ "\n" + uniqueMessages[pos]["name"];
			}
			return messages
		}
	}
	var uniqueMessages = getCompletionTableNew(continuations_to_report, text);
	return {prefix:prefix, suggestions:uniqueMessages}
}

function errorMessage(message, elem){
	m = document.createElement("DIV");

	m.style.color = '#691715';
    m.style.background= '#feded9';
    m.style.border= '1px solid #fc8675';
   	m.style.display = 'block';
	m.style.position = 'auto';


    m.setAttribute("id", "message");
    m.setAttribute("class", "message");
    m.innerHTML += "<label>" + message + "</label>";
    elem.parentNode.insertBefore(m, elem);

}

function removeMessage(){
	var m = document.getElementById("message");
	if(m != null) m.parentNode.removeChild(m);
}

function chechCompartmentChange(){
	var input = document.activeElement;
	var act_elem = Session.get("activeElement");
	var act_el = Elements.findOne({_id: act_elem});
	if(typeof act_el !== 'undefined'){
		var compart_type_id = $(input).closest(".compart-type").attr("id");
		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		var compart = Compartments.findOne({compartmentTypeId: compart_type_id, elementId: act_elem});
		if(typeof compart !== "undefined"){
			console.log("compart", compart)
		}
	}
}