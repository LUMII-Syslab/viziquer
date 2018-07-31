
runCompletion = function (text){
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
		var c = getContinuations(text, text.length, JSON.parse(com["message"]));
		console.log(JSON.stringify(c, 0, 2));
	}

	return str;
}

function getCompletionTable(continuations_to_report) {
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