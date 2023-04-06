import { Interpreter } from '/client/lib/interpreter'
import { Elements, ElementTypes, CompartmentTypes, Compartments } from '/libs/platform/collections'

var symbolTable = {};
var grammarType = "class";
var time;

Interpreter.customMethods({

	conditionAutoCompletion: async function(e, compart) {
		grammarType = "class"
		const d = new Date();
		time = d.getTime();
		if(typeof symbolTable === "undefined" || symbolTable == null)symbolTable = await generateSymbolTableAC();
		await autoCompletion(e);
	},

	attributeAutoCompletion: async function(e, compart) {
		grammarType = "attribute"
		const d = new Date();
		time = d.getTime();
		if(typeof symbolTable === "undefined" || symbolTable == null)symbolTable = await generateSymbolTableAC();
		await autoCompletion(e);
	},
	
	attributeConditionAutoCompletion: async function(e, compart) {
		grammarType = "attributeCondition"
	},

	linkAutoCompletion: async function(e, compart) {
		grammarType = "link"
		const d = new Date();
		time = d.getTime();
		await autoCompletion(e);
	},
	
	classAutoCompletion: async function(e, compart) {
		grammarType = "className"
		await autoCompletion(e);
	},
	
	orderAutoCompletion: async function(e, compart) {
		grammarType = "order"
		await autoCompletion(e);
	},
	
	groupAutoCompletion: async function(e, compart) {
		grammarType = "group"
		await autoCompletion(e);
	},
	languageAutoCompletion: async function(e, compart) {
		grammarType = "language"
		await autoCompletion(e);
	},
	
	instanceAutoCompletion: async function(e, compart) {
		grammarType = "instance"
		let ev = e.originalEvent;
		if ((ev.ctrlKey || ev.metaKey) && ev.code === 'Space') {
			await autoCompletion(e);
		}	
	},

});

var currentFocus = 0;


generateSymbolTableAC = async function() {
 
	var tempSymbolTable = await generateSymbolTable();
	var st = tempSymbolTable["symbolTable"];
	
	return st;
  }

autoCompletionAddCondition = async function(e) {
	grammarType = "class"
	const d = new Date();
	time = d.getTime();
	if(typeof symbolTable === "undefined" || symbolTable == null)symbolTable = await generateSymbolTableAC();
	await autoCompletion(e);
},

autoCompletionClass = async function(e) {
	grammarType = "className"
	await autoCompletion(e);
},

autoCompletionAddAttribute = async function(e) {
	grammarType = "attribute"
	const d = new Date();
	time = d.getTime();
	if(typeof symbolTable === "undefined" || symbolTable == null)symbolTable = await generateSymbolTableAC();
	await autoCompletion(e);
},

autoCompletionAddLink = async function(e) {
	grammarType = "linkPath"
	const d = new Date();
	time = d.getTime();
	if(typeof symbolTable === "undefined" || symbolTable == null)symbolTable = await generateSymbolTableAC();
	await autoCompletion(e);
},

autoCompletionInstance = async function(e) {
	grammarType = "instance"
	let ev = e.originalEvent;
	if ((ev.ctrlKey || ev.metaKey) && ev.code === 'Space') {
		await autoCompletion(e);
	}	
},

autoCompletion = async function(e) {
	
	removeMessage();
	// if ((e.ctrlKey || e.metaKey) && (e.keyCode === 32 || e.keyCode === 0)) {
	// if (!isAutocompletionActive() && e.keyCode !== 27 && e.keyCode !== 9) {
	if (isAutocompletionKey(e) && !isAutocompletionActive()) {
		await delay(1);
		var elem = document.activeElement;

		var text = e.originalEvent.target.value;
		var textBefore = text.substring(0, elem.selectionStart);
		var continuations = await runCompletionNew(textBefore, text, textBefore.length, symbolTable);

		if(typeof continuations == "string" && continuations.startsWith("ERROR")){
			errorMessage(continuations, elem);
			elem.addEventListener("keyup", keyUpHandler);
			elem.addEventListener("click", clickHandler);
			//autocomplete(elem, continuations);
		} else if(typeof continuations == "string" &&  continuations == "leaveOldRessult"){
			
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
	symbolTable = null;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

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

async function requestAndProcessContinuations(textBefore, text, cursorPosition, symbolTable) {
	var continuations = await runCompletionNew(textBefore, text, textBefore.length, symbolTable);

	if (typeof continuations == "string" && continuations.startsWith("ERROR")){
		errorMessage(continuations,  document.activeElement);
		closeAllLists();
	}else{
		autocomplete(document.activeElement, continuations);
	}
}

var requestAndProcessContinuationsDebounced = _.debounce(requestAndProcessContinuations, 300);

async function keyUpHandler(e){
	if (e.keyCode === 8){
		var m = document.getElementById("message");
		if(m != null) {
			removeMessage();
			var text = e.target.value;
			var textBefore = text.substring(0, e.target.selectionStart);
			requestAndProcessContinuationsDebounced(textBefore, text, textBefore.length, symbolTable);
		}
	}

	if (e.keyCode !== 40 && e.keyCode !== 38 && e.keyCode !== 13 && e.keyCode !== 9 && e.keyCode !== 27){
		if(document.getElementsByClassName("autocomplete-items").length > 0){
			removeMessage();
			var text = e.target.value;
			var textBefore = text.substring(0, e.target.selectionStart);
			requestAndProcessContinuationsDebounced(textBefore, text, textBefore.length, symbolTable);
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
		var text = e.target.value;
		var textBefore = text.substring(0, e.target.selectionStart);
		var sug = listItems[currentFocus].querySelector('input[name="prefix"]').value + listItems[currentFocus].querySelector('input[name="suggestion"]').value;
		if(sug.startsWith(textBefore)){
			e.preventDefault();
			e.stopPropagation();
			if (currentFocus === -1) currentFocus = 0;
			if (currentFocus > -1) {
				if (listItems) listItems[currentFocus].click();
			}
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
	if (typeof continuations.suggestions === "undefined" || continuations.suggestions.length === 0) {
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

	if(inp.parentNode.id.length > 0 && inp.parentNode.nodeName == "DIV"){
		
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
	for(let i = 0; i < x.length; i++) {
		x[i].style.backgroundColor = '#efefef';
	}
}

function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document, except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
	
    for(let i = 0; i < x.length; i++) {
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
		console.log(compart_type_id )
		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		var compartAll = Compartments.find({ elementId: act_elem});
		Compartments.find({elementId: act_elem}).forEach(function (cc) {
			console.log(cc)
		 })

		var compart = Compartments.findOne({compartmentTypeId: compart_type_id, elementId: act_elem});
		if(typeof compart !== "undefined"){
			var elem = new VQ_Element(act_elem);
            if (elem.isIndirectClassMembership()) {
				Dialog.updateCompartmentValue(compart_type, newValue, ".. "+newValue, compart["_id"]);
			} else {
				Dialog.updateCompartmentValue(compart_type, newValue, newValue, compart["_id"]);
			};
		}
	}
}

function isURI(text) {
  if(text.indexOf("://") != -1)
    return 3;
  else
    if(text.indexOf(":") != -1) return 4;
  return 0;
};

runCompletionNew = async function (text, fullText, cursorPosition, symbolTable){

	if(grammarType == "className"){
						
			var c = {};
			c["prefix"] = "";
			c["suggestions"] = [];
			var cls;
			
			var params = {};
			var vq_obj;
			if(fullText != "") params.filter = fullText;
			
			var selected_elem_id = Session.get("activeElement");			
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

				vq_obj = new VQ_Element(selected_elem_id);
				var individual =  vq_obj.getInstanceAlias();
				if (individual !== null && individual !== undefined && isURI(individual) != 0) 
					params.uriIndividual = dataShapes.getIndividualName(individual);
				//params.onlyPropsInSchema =  true;  // Šis dod tikai galvenās klases un strādā ātrāk.
			}			
			
			cls = await dataShapes.getClasses(params, vq_obj);
			
			cls = cls["data"];
			
			
			// var proj = Projects.findOne({_id: Session.get("activeProject")});
			var schemaName = dataShapes.schema.schemaType;
			// if (proj) {
				// if (proj.schema) {
					// schemaName = proj.schema;
				// };
			// }
			for(let cl = 0; cl < cls.length; cl++){
				var prefix;
				if((cls[cl]["is_local"] == true && await dataShapes.schema.showPrefixes === "false") || 
				(schemaName.toLowerCase() == "wikidata" && cls[cl]["prefix"] == "wd"))prefix = "";
							
				else prefix = cls[cl]["prefix"]+":";
	
				var type = 3;
				if (cls[cl].principal_class === 0)
					type = 0;
				c["suggestions"].push({name: prefix+cls[cl]["display_name"], priority:100, type:type})
			}
			return c;
	}
	else if(grammarType == "order"){
		var c = {};
			c["prefix"] = "";
			c["suggestions"] = [];
		
		var act_elem = Session.get("activeElement");
		//Active element does not exist OR has no Name OR is of an unpropriate type
		if (!act_elem) {
			return [];
		}
		var act_comp = Compartments.findOne({elementId: act_elem})
		if (!act_comp) {
			return [];
		}

		var elem_type = ElementTypes.findOne({name: "Class"});
		if (elem_type && act_comp["elementTypeId"] != elem_type._id) {
			return [];
		}
		
		var compart_type = CompartmentTypes.findOne({name: "ClassType", elementTypeId: act_comp["elementTypeId"]});
 		var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
		
		
		if(compart.input == "query"){
			var tempSymbolTable = await generateSymbolTable();
			var symbolTable = tempSymbolTable["symbolTable"];
			var rootSymbolTable = tempSymbolTable["rootSymbolTable"];
			
			for(let key in rootSymbolTable) {
				for(let k = 0; k < rootSymbolTable[key].length; k++){
					if(rootSymbolTable[key][k]["kind"] == "AGGREGATE_ALIAS") c["suggestions"].push({name: key , priority:100, type:3});
				}
			}
			
			for(let key in symbolTable) {
				for(let k = 0; k < symbolTable[key].length; k++){
					if(symbolTable[key][k]["kind"] == "AGGREGATE_ALIAS" || symbolTable[key][k]["kind"] == "BIND_ALIAS" || symbolTable[key][k]["kind"] == "PROPERTY_ALIAS" || symbolTable[key][k]["kind"] == "PROPERTY_NAME" || (symbolTable[key][k]["kind"] == "CLASS_ALIAS" && isURI(key) == 0)) c["suggestions"].push({name: key, priority:100, type:3});
				}
			}
						
			
		} else {
			var tempSymbolTable = await generateSymbolTable();
			var abstractQueryTable = tempSymbolTable["abstractQueryTable"];
			
			if(findClassInAbstractQueryTable(act_elem, abstractQueryTable).isGlobalSubQuery == true){
				var symbolTable = tempSymbolTable["symbolTable"];
	
				for(let key in symbolTable) {
					for(let k = 0; k < symbolTable[key].length; k++){
						if(symbolTable[key][k]["kind"] == "AGGREGATE_ALIAS" || symbolTable[key][k]["kind"] == "BIND_ALIAS" || symbolTable[key][k]["kind"] == "PROPERTY_ALIAS" || symbolTable[key][k]["kind"] == "PROPERTY_NAME" || (symbolTable[key][k]["kind"] == "CLASS_ALIAS" && isURI(key) == 0)) c["suggestions"].push({name: key, priority:100, type:3});
					}
				}
			}
		
		}
		
		c["suggestions"] = c["suggestions"].filter(function(obj, index, self) { 
			return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
		});
		
		return c;
	}
	else if(grammarType == "group"){
		var c = {};
			c["prefix"] = "";
			c["suggestions"] = [];
			
		var act_elem = Session.get("activeElement");
		//Active element does not exist OR has no Name OR is of an unpropriate type
		if (!act_elem) {
			return [];
		}
		var act_comp = Compartments.findOne({elementId: act_elem})
		if (!act_comp) {
			return [];
		}

		var elem_type = ElementTypes.findOne({name: "Class"});
		if (elem_type && act_comp["elementTypeId"] != elem_type._id) {
			return [];
		}
		
		var group_by_list = [];
		var group_by_list_vissible = [];
		
		var group_by_list_sub = [];
		var group_by_list_vissible_sub = [];

		var selected_elem_id = Session.get("activeElement");
		
		var tempSymbolTable = await generateSymbolTable();
		// console.log("group by", tempSymbolTable);
		var symbolTable = tempSymbolTable["symbolTable"];


		
		for(let  key in symbolTable) {
			for(let k = 0; k < symbolTable[key].length; k++){
				var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][k]["context"], tempSymbolTable["abstractQueryTable"], key);
					
				if(symbolTable[key][k]["context"] == selected_elem_id){
					
					if(symbolTable[key][k]["kind"] == "AGGREGATE_ALIAS" || symbolTable[key][k]["kind"] == "PROPERTY_NAME" || symbolTable[key][k]["kind"] == "PROPERTY_ALIAS" || symbolTable[key][k]["kind"] == "BIND_ALIAS") {
						if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true) group_by_list.push({name: key , priority:100, type:3});
						else group_by_list_vissible.push({name: key , priority:100, type:3});
					}
					if(symbolTable[key][k]["kind"] == "CLASS_ALIAS") group_by_list.unshift({name: key , priority:100, type:3});
				}
				if (symbolTable[key][k]["upBySubQuery"] == 1) {
					if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true) group_by_list_sub.push({name: key , priority:100, type:3});
					else group_by_list_vissible_sub.push({name: key , priority:100, type:3});
				}
			}
		}

		group_by_list = _.union(group_by_list, group_by_list_vissible);
		group_by_list = _.union(group_by_list, group_by_list_sub);
		group_by_list = _.union(group_by_list, group_by_list_vissible_sub);
		
		group_by_list = _.uniq(group_by_list, false, function(item) {
	 		return item["name"];
	 	});
		
		c["suggestions"] = group_by_list;
		
		return c;
	}
	else if(grammarType == "instance"){
		var c = {};
		c["prefix"] = "";
		c["suggestions"] = [];
		var params = {limit: dataShapes.schema.tree.countI};
		if (fullText != "") params.filter = fullText;
		
		var selected_elem_id = Session.get("activeElement");
		var act_el;
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			act_el = new VQ_Element(selected_elem_id);
		}
		
		var inst = await dataShapes.getIndividuals(params, act_el);
		//if (dataShapes.schema.schemaType == 'wikidata' && fullText != "")
		//	inst = await dataShapes.getIndividualsWD(fullText); 
		//else
		//	inst = await dataShapes.getIndividuals(params, act_el);

		if (fullText != "" ){
			if ( inst.length === 0 && dataShapes.schema.schemaType == 'dbpedia' || inst.length > 0 && inst[0] !== "dbr:"+fullText && dataShapes.schema.schemaType == 'dbpedia')
				c["suggestions"].push({name: "dbr:"+fullText, priority:100, type:0})
		}
			
		for(let i = 0; i < inst.length; i++){
			c["suggestions"].push({name: inst[i], priority:100, type:0})
		}
	
		return c;
	}
	else {
		var act_elem = Session.get("activeElement");
		
		
		
		try {
			// var schema = new VQ_Schema();
			
			if(grammarType == "link"){
				var name_list = [];

				if (act_elem) {
					var vq_link = new VQ_Element(act_elem);
					if (vq_link.isLink()) {
						// console.log("PPPPPPPPP", fullText, text)
						// var parsed_exp = await vq_property_path_grammar_completion.parse(text, {schema:null, symbol_table:symbolTable, context:vq_link.getStartElement(), link:vq_link});
						var parsed_exp = await vq_property_path_grammar_completion_parser.parse(text, {time:time, text:text, schema:null, symbol_table:symbolTable, context:vq_link.getStartElement(), link:vq_link});
						
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
					var parsed_exp = await vq_property_path_grammar_completion_parser.parse(text, {time:time, text:text, schema:null, symbol_table:symbolTable, context:act_elem, className:className});
				};
			}else if(grammarType == "language"){
				var name_list = [];
				//var act_elem = Session.get("activeElement");
				if (act_elem) {
					var parsed_exp = vq_language_grammar_completion.parse(text, {time:time});
				};
			} else {

				var className = "";

				var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
				if(typeof act_el !== 'undefined'){
					var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
					var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
					if(typeof compart !== 'undefined') className = compart["input"];
				}

				if(typeof symbolTable === 'undefined'){
					var tempSymbolTable = await generateSymbolTable();
					symbolTable = tempSymbolTable["symbolTable"];
				}
				// var parsed_exp = vq_grammar_completion.parse(text, {schema:schema, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
				var parsed_exp = await vq_grammar_completion_parser.parse(text, {time:time, text:text, schema:null, symbol_table:symbolTable, className:className, type:grammarType, context:act_el});
			}
		} catch (com) {
			// console.log(com);
			// console.log(JSON.stringify(com["message"], null, 2));
			// console.log(JSON.parse(com["message"]));
			var cont = JSON.parse(com["message"]);
			if(time == cont.time){
				var c = getContinuationsNew(text, text.length, cont);			
				return c;
			} else {return "leaveOldRessult"}
		}
	}
	return [];
}

function getCompletionTableNew(continuations_to_report, text) {
	var sortable = [];
	for(let key in continuations_to_report) {
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
function getContinuationsNew(text, length, continuations) {

	var allSuggestions = []
	var farthest_pos = -1 //farthest position in continuation table
	var farthest_pos_prev = -1 // previous farthest position (is used only some nonterminal symbol is started)
	var continuations_to_report;

	var prefix = text;

	//find farthest position in continuation table
	//find  previous farthest position
	
	
	
	for(let pos in continuations) {
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

				for(let pos in continuations[i]) {
					if(varrible.toLowerCase() == pos.toLowerCase()) wholeWordMatch = true;
				}

				for(let pos in continuations[i]) {
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
		for(let pos in continuations_to_report) {
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

			for(let pos in uniqueMessages) {
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
	if(elem.parentNode.id.length > 0 && elem.parentNode.nodeName == "DIV"){
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
}

function removeMessage(){
	var m = document.getElementById("message");
	if(m != null) m.parentNode.removeChild(m);
}

function findClassInAbstractQueryTable(elemId, abstractQueryTable){
	var clazz;
	if(abstractQueryTable["identification"]["_id"] == elemId) clazz = abstractQueryTable;
	else{
		for(child in abstractQueryTable["children"]){
			clazz = findClassInAbstractQueryTable(elemId, abstractQueryTable["children"][child])
		}
	}
	return clazz;
}