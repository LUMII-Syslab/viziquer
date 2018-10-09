
Interpreter.customMethods({

	handleKeyStroke: function(e, compart) {
		// console.log("event", e);
		// console.log("value",elem.value);

		if (e.ctrlKey && e.keyCode == 32) {
			var elem = document.activeElement;
			var text = e.originalEvent.target.value;
			var continuations = runCompletion(text, Session.get("activeElement"));		
			
			elem.addEventListener("keyup", ketUpHandler);
			elem.addEventListener("click", clickHandler);
			
			autocomplete(elem, continuations);
		}
	},


	// handleKeyStroke: function(e) {
	// 	console.log("event", e);
	// 	// console.log("value",elem.value);

	// 	if (e.ctrlKey && e.keyCode == 32) {
	// 		var elem = document.activeElement;
	// 		var act_elem = Session.get("activeElement");
	// 		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
	// 		var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
	// 		var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});


	// 		// Interpreter.executeExtensionPoint(compart_type, "processKeyStroke", [e]);



	// 		var text = e.originalEvent.target.value;
	// 		var continuations = runCompletion(text, Session.get("activeElement"));		
			
	// 		elem.addEventListener("keyup", ketUpHandler);
	// 		elem.addEventListener("click", clickHandler);
			
	// 		autocomplete(elem, continuations);
	// 	}
	// },

});

function ketUpHandler(e){
	if(document.getElementsByClassName("autocomplete-items").length > 0){
		var text = e.target.value;
		var continuations = runCompletion(text, Session.get("activeElement"));
		autocomplete(document.activeElement, continuations);
	}
}

function clickHandler(e){
	closeAllLists();
	var elem = document.activeElement;
	elem.removeEventListener("keyup", ketUpHandler);
}

function autocomplete(inp, arr) {
	var currentFocus;
    var a, b, i, val = inp.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
	 
   	a.style.display = 'block';
	a.style.position = 'auto';
	a.style.width = '120px';
	a.style.maxHeight = '200px';
	a.style.overflow = 'hidden';
	a.style.overflowY = 'auto';
	a.style.listStyle = 'none';
	a.style.padding = 0;
	a.style.margin = 0;
	a.style.border = '1px solid #bbb';
	a.style.backgroundColor = '#efefef';
	a.style.boxShadow = '0px 0px 6px 1px rgba(128,128,128,0.3)';
	  
    a.setAttribute("id", inp.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    inp.parentNode.appendChild(a);

    for (i = 0; i < arr.length; i++) {
        /*create a DIV element for each matching element:*/
		b = document.createElement("DIV");
        b.innerHTML = arr[i];
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function(e) {
			/*insert the value for the autocomplete text field:*/
			var inputValue = generateInputValue(inp.value, this.getElementsByTagName("input")[0].value);
			inp.value = inputValue;
			/*close the list of autocompleted values,(or any other open lists of autocompleted values:*/
			closeAllLists();
			inp.focus();
		});
        a.appendChild(b);
	}
  //});
  /*execute a function presses a key on the keyboard:*/
  // inp.addEventListener("keydown", function(e) {
      // var x = document.getElementById(this.id + "autocomplete-list");
      // if (x) x = x.getElementsByTagName("div");
      // if (e.keyCode == 40) {
        // /*If the arrow DOWN key is pressed,
        // increase the currentFocus variable:*/
        // currentFocus++;
        // /*and and make the current item more visible:*/
        // addActive(x);
      // } else if (e.keyCode == 38) { //up
        // /*If the arrow UP key is pressed,
        // decrease the currentFocus variable:*/
        // currentFocus--;
        // /*and and make the current item more visible:*/
        // addActive(x);
      // } else if (e.keyCode == 13) {
        // /*If the ENTER key is pressed, prevent the form from being submitted,*/
        // e.preventDefault();
        // if (currentFocus > -1) {
          // /*and simulate a click on the "active" item:*/
          // if (x) x[currentFocus].click();
        // }
      // }
  // });
  //function addActive(x) {
    /*a function to classify an item as "active":*/
  //  if (!x) return false;
    /*start by removing the "active" class on all items:*/
  //  removeActive(x);
  //  if (currentFocus >= x.length) currentFocus = 0;
  // if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
  //  x[currentFocus].classList.add("autocomplete-active");
  //}
  //function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
  //  for (var i = 0; i < x.length; i++) {
   //   x[i].classList.remove("autocomplete-active");
   // }
  //}
  
/*execute a function when someone clicks in the document:*/
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
}

function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document, except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != document.activeElement) {
        x[i].parentNode.removeChild(x[i]);
	  }
	}
}

function generateInputValue(fi, con){

	var fullInput = fi.toLowerCase();
	var continuation = con.toLowerCase();

	var inputValue = fi + con;
	var inputSet = false;
	var counter = 1;
	while(inputSet == false){
		var subSt = fullInput.lastIndexOf(continuation.substring(0, counter));
		if(subSt == -1) inputSet = true;
		else {
			if(continuation.startsWith(fullInput.substring(subSt)) == true){
				inputSet = true;
				inputValue = fi.substring(0, subSt) + con;
			} else {
				counter++;
			}
		}
	}

	return inputValue;
}

runCompletion = function (text, act_elem){
	var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
	var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
	var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
	var className = compart["input"];
	try {
		// var parsed_exp = vq_arithmetic.parse(str, {completions});
		var schema = new VQ_Schema();
		var parsed_exp = vq_grammar_completion.parse(text, {schema:schema, symbol_table:{}, className:className});
		var obj = JSON.parse(parsed_exp);
		//console.log("parsed_exp", parsed_exp, obj);
	} catch (com) {
		// console.log(com["message"], JSON.parse(com["message"]));
		console.log(com);
		var c = getContinuations(text, text.length, JSON.parse(com["message"]));
		console.log(JSON.stringify(c, 0, 2));
		// var elem = document.activeElement;
		// autocomplete(elem, c);
		return c;
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