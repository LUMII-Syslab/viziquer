Interpreter.customMethods({
	ConnectClasses: function () {		
		$("#connect-length-form").modal("show");
	},
		
})

var linkRezult = [];
var elemInfo = [];
var maxLength;
var ids=[];

Template.ConnectLength.events({
	"click #ok-connect-length": function(){
		//Get length and elements		
		ids=[];
		maxLength = document.getElementById('max_length').value;
		if (isNaN(maxLength)){
			console.log("Length should be number");
			return;
		}

		if( (maxLength - Math.round(maxLength)) != 0 ) {
			console.log("Length should be integer");
			return;
		}

		var editor = Interpreter.editor;
		if (editor){
			var elem_ids = _.keys(editor.getSelectedElements());			
			if (!elem_ids) {
				return;
			} else {
				var elem;
				//console.log("ids from editor", elem_ids);
				//Leave only class-type elements in selection
				_.each(elem_ids, function(id){
					elem = new VQ_Element(id);
					if (elem.isClass()) {					
						ids.push({text: id});
					}
				})
				//console.log("CL ids", ids);
				//Check if there are directly 2 classes to link
				if (ids.length != 2) {
					console.log("Too many classes selected");
					return;
				}

				var usedClasses = [];
				_.each(ids, function(id){
					elem = new VQ_Element(id.text);
					usedClasses.push({name: elem.getName(), id: id.text});
				})
				Template.FirstConnect.elements.set(usedClasses);

				// //Create possible linking chains
				// var resultStringArray = GetChain(ids, maxLength);				
				// // console.log("resultStringArray: ", resultStringArray);											
				// Template.ConnectClasses.connections.set(resultStringArray);				
			}
		}
		$("#connect-first-form").modal("show");
		// console.log(Template.FirstConnect.elements);

	},
});

Template.ConnectClasses.connections = new ReactiveVar([{text: "No selected elements to proceed"}]);

Template.FirstConnect.events({
	"click #ok-first-length": function(){
		//Get length and elements
		// console.log(Template.FirstConnect.elements);
		var first = "";
		first = $('input[id=fc-radio]:checked').val();
		console.log(first);
		// console.log(ids);

		var newIds = [];
		_.each(ids, function(e){
			if (e.text == first){
				newIds[0] = e;
			} else {
				newIds[1] = e;
			}
		})
		// console.log(newIds);
		ids = newIds;

		// Create possible linking chains
		var resultStringArray = GetChain(ids, maxLength);				
		console.log("resultStringArray: ", resultStringArray);											
		Template.ConnectClasses.connections.set(resultStringArray);
		$('input[id=fc-radio]:checked').attr('checked', false);
		$("#connect-classes-form").modal("show");
	},
});
Template.FirstConnect.elements = new ReactiveVar([{name: "No class", id: 0}]);

Template.FirstConnect.helpers({
	elements: function(){
		return Template.FirstConnect.elements.get();
	}
});

Template.ConnectClasses.helpers({
	connections: function(){
		return Template.ConnectClasses.connections.get();
	}
});

Template.ConnectClasses.events({
	"click #ok-connect-classes": function(e) {
		//console.log("connection on ok", Template.ConnectClasses.connections.get());		
		//Get selected chain's index in linkRezult array
		var number = $('input[name=stack-radio]:checked').val();
		console.log(number);
		if (number < 0 || !number) {
			console.log("No chain selected"); 
			return;
		}
		console.log("connection on ok elemInfo", elemInfo);
		console.log("On ok: ", linkRezult[number]);
		var elemList = GetAllClassesID();

		//Draw chain elements
		var start_elem_id = elemInfo[0]["id"];
		var startElement;		

		_.each(linkRezult[number], function(c){
			startElement = new VQ_Element(start_elem_id);
			console.log("start ID: ", startElement);
			if (c["class"] == elemInfo[1]["class"])	{
				//drawAssocLine: function(name, end_elem_id, line_direct)
				startElement.drawAssocLine(c["name"], elemInfo[1]["id"], c["type"])
			} else{		
				startElement.drawLinkedClass(c["class"], c["name"], c["type"]);
				start_elem_id = GetNewClassID(elemList);
				elemList = GetAllClassesID();	
			}
		})
		$('input[name=stack-radio]:checked').attr('checked', false);
		return;
	},
});

//===========================
//FUNCTIONS
//===========================

//Based on AddLink
//Find all the associations for class with given ID
//Output: association name, class on the other side, link direction as [{name: "", class: "", type: "=>"}]
function GetChain(ids, maxLength){
	var schema = new VQ_Schema();
	var link_chain = [];
	linkRezult = [];
	elemInfo = [];	
	_.each(ids, function(id){
		elem = new VQ_Element(id["text"])
		elemInfo.push({id: id["text"], class: elem.getName()});
	})

	console.log(ids, maxLength, elemInfo);

	_.each(GetLinks(elemInfo[0]["id"]), function(e) {					
		if(CompareClasses(e["class"], elemInfo[1]["class"])){
			linkRezult.push([e]);
		} else{
			link_chain.push([e]);
		}
	})

	var actChain = link_chain;
	for (var i = 1; i <= maxLength; i++){
		if(actChain){
			link_chain = actChain;
			actChain = [];

			_.each(link_chain, function(e){
				var asoc = schema.findClassByName(e[i-1]["class"]).getAllAssociations();						
				var e_elem = [];
				_.each(asoc, function(el) {							
					e_elem = e.slice();
					//Check for loop (returning to already existing class)
					var classNew = true;
					_.each(e_elem, function(ee){
						if (CompareClasses(ee["class"], el["class"])){
							classNew = false;
						}
					})

					if (classNew && !CompareClasses(el["class"], elemInfo[0]["class"])){							
						e_elem.push(el);																		
						if(CompareClasses(el["class"], elemInfo[1]["class"])){
							linkRezult.push(e_elem);
						} else{								
							actChain.push(e_elem);
						}
					}
				})
			})					

			// console.log(i-1,". link_chain", link_chain);
			// console.log(i,". linkRezult", linkRezult);
		} else {
			i = maxLength +1;
		}
	}

	link_chain = [];
	actChain = [];								

	//Update information on chains
	var resultString = "";
	var resultStringArray=[]
	var i = 0;
	_.each(linkRezult, function(e){		
		resultString = elemInfo[0]["class"];
		_.each(e, function(ee){								
			resultString = resultString.concat(" ", ee["name"]," ", ee["class"]);
		})		
		resultStringArray.push({text: resultString, number: i});
		i++;
	})
	// console.log(resultStringArray);
	if(resultStringArray.length == 0) {
		resultStringArray.push({text: "No connection of given length is found", number: -1})
	};	

	return resultStringArray;
}

function GetLinks(start_elem_id){
	if (Elements.findOne({_id: start_elem_id})){ 
		var asc = [];
		var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: Elements.findOne({_id: start_elem_id})["elementTypeId"]});
		if (!compart_type) {
			return [{name: "", class: "", type: "=>"}];
		}

		var act_comp = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: start_elem_id});
		if (!act_comp) {
			return [{name: "", class: "", type: "=>"}];
		}

		var className = act_comp["input"];
		var schema = new VQ_Schema();
		if (!schema.classExist(className)) {
			return [{name: "", class: "", type: "=>"}];
		}

		asc = schema.findClassByName(className).getAllAssociations();

		return asc;			
	}
}


function CompareClasses(n1, n2){
	return n1==n2;
}

//Get ID of all classes in the diagram
function GetAllClassesID(){
	var elemList = [];
	Elements.find({type: "Box"}).forEach(function(el) {
			var elem = new VQ_Element(el["_id"]);
			if (elem.isClass()) {
				elemList.push(el["_id"]);
			}
	})
	return elemList;
}

//Get ID of a class not in elem_list array
function GetNewClassID(elem_list){
	if (!elem_list){ //no list - create one
		console.log("No new class")
		return;
	} else {
		//Create existing element list
		var elemList = GetAllClassesID();
		var newClassList = [];
		//Finc difference
		_.each(elemList, function(e){
			if (!elem_list.includes(e)){
				newClassList.push(e);
			}
		})

		if (newClassList.length != 1) {
			console.log("Too many/few new classes");
			return;
		}
		return newClassList[0]; 
	}	
}
