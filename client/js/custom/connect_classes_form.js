Interpreter.customMethods({
	ConnectClasses: function () {
		Interpreter.destroyErrorMsg();
	//check fo only 2 classes
		var editor = Interpreter.editor;
		if (editor){
			var elem_ids = _.keys(editor.getSelectedElements());			
			if (!elem_ids) {
				return;
			} else {
				var elem;
				var ids = [];

				//Leave only class-type elements in selection
				_.each(elem_ids, function(id){
					elem = new VQ_Element(id);
					if (elem.isClass()) {					
						ids.push({text: id});
					}
				})
				
				//Check if there are directly 2 classes to link
				if (ids.length != 2) {
					console.log("Too many classes selected");
					Interpreter.showErrorMsg("Too many classes selected, only 2 classes can be connected.", -3);
					return;
				}

				var usedClasses = [];
				_.each(ids, function(id){
					elem = new VQ_Element(id.text);
					usedClasses.push({name: elem.getName(), id: id.text});
				})
				Template.ConnectClasses.IDS.set(ids);
				Template.ConnectClasses.elements.set(usedClasses);
				Template.ConnectClasses.linkList.set([{array: [{class: "Please choose direction to connect classes"}], number: -1}]);
				Template.ConnectClasses.shortLinkList.set([{array: [{class: "Please choose direction to connect classes"}], number: -1}]);
				$("#connect-classes-form").modal("show");			
			}
		}		
		
	},
		
})

Template.ConnectClasses.IDS= new ReactiveVar([{name: "no class", id:"0"}]);
Template.ConnectClasses.linkList = new ReactiveVar([{array: [{class: "No connection of given length is found"}], number: -1}]);
Template.ConnectClasses.shortLinkList = new ReactiveVar([{array: [{class: "No connection of given length is found"}], number: -1}]);
Template.ConnectClasses.elements = new ReactiveVar([{name: "No class", id: 0}]);

Template.ConnectClasses.helpers({

	IDS: function(){
		return Template.ConnectClasses.linkList.get();
	},

	linkList: function(){
		return Template.ConnectClasses.linkList.get();
	},

	shortLinkList: function(){
		return Template.ConnectClasses.shortLinkList.get();
	},

	elements: function(){
		return Template.ConnectClasses.elements.get();
	},

});

Template.ConnectClasses.events({
	"click #show-settings": function(){
		var button = $("#show-settings");
		var elem = $("#settings");
		if (button.text() == "Hide settings"){
			button.text("Show settings");
			elem[0].style.display = "none";
		} else {
			button.text("Hide settings");
			elem[0].style.display = "block";
		}
	},

	"click #apply-settings": function(){
		//check if starting element is selected
		var first = "";
		first = $('input[name=fc-radio]:checked').val();
		var fullList;
		if (!first || first == "" || first == undefined) {
			$('#direction_text')[0].style.color = "red";
			fullList = [{array: [{class: "Please choose direction to connect classes"}], number: -1}]
		} else {
			var maxLength = $("#max_length")[0].value;			
			if (maxLength) {
				$('#direction_text')[0].style.color = "";
				$('#max_length_text')[0].style.color = "";
			//check if length is integer
				if( (maxLength - Math.round(maxLength)) != 0 ) { 
					Template.ConnectClasses.linkList.set([{array: [{class: "Please choose correct maximum length"}], number: -1}]);
					$('#max_length_text')[0].style.color = "red";
					return; 
				}				
				var ids = Template.ConnectClasses.IDS.curValue;
				//sort IDs in the right order top pass to GetChains
				//from-class at position 0, to-class at possition 1
				var newIds = [];
				_.each(ids, function(e){
					if (e.text == first){
						newIds[0] = e; 
					} else {
						newIds[1] = e;
					}
				})
				ids = newIds;

				// Create possible linking chains
				fullList = GetChains(ids, maxLength);				
			}
		}
		Template.ConnectClasses.linkList.set(fullList);
		var value = $("#searchList").val().toLowerCase();
		if (value == "" || value.indexOf(' ') > -1) {
			Template.ConnectClasses.shortLinkList.set(fullList);
		} else {
			Template.ConnectClasses.shortLinkList.set(applySearch(fullList, value));
		}
		
	},

	"keyup #searchList": function(){
		var value = $("#searchList").val().toLowerCase(); 
		//console.log("mySearch: ", value);
		if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
			Template.ConnectClasses.shortLinkList.set(Template.ConnectClasses.linkList.curValue);
		} else {
			var ascList = Template.ConnectClasses.linkList.curValue;
			ascList = applySearch(ascList, value);
			//console.log(ascList);
			Template.ConnectClasses.shortLinkList.set(ascList);
		}
	},


	"click #ok-connect": function(){
		//test selected chain
		var number = $('input[name=stack-radio]:checked').val();
		if (number < 0 || !number) {
			$('#chain_text')[0].style.color = "red";
			$("#connect-classes-form").modal("show");
			//console.log("No chain selected"); 
			return;
		}
		var chain = Template.ConnectClasses.linkList.curValue.filter(a => a.number == number)[0]["array"];
		chain = _.rest(chain); console.log(chain);
		var firstId = $('input[name=fc-radio]:checked').val();
		var currentVQElment = new VQ_Element(firstId);
		var lastElement = Template.ConnectClasses.elements.curValue.filter(e => e.id != firstId)[0]; console.log(170, lastElement);
		AddNextLink(currentVQElment, chain, lastElement);		
		$("#connect-classes-form").modal("hide");
		clearConnectClassesInput();
		return;
	},

	"click #cancel-connect": function(){
		clearConnectClassesInput();
	},
});

//===========================
//FUNCTIONS
//===========================
function clearConnectClassesInput(){
	$("#show-settings").text("Hide settings");
	$("#settings")[0].style.display = "block";
	$("#max_length")[0].value = "1";
	$('input[name=fc-radio]:checked').attr('checked', false);
	$('input[name=stack-radio]:checked').attr('checked', false);
	$("#searchList")[0].value = "";
	$('#chain_text')[0].style.color = "";
	Interpreter.destroyErrorMsg();
}

//Based on AddLink
//Find all the associations for class with given ID
//Output: association name, class on the other side, link direction as [{name: "", class: "", type: "(inv)", direction: "=>"}]
function GetChains(ids, maxLength){
	var schema = new VQ_Schema();
	var link_chain = [];
	linkRezult = [];
	elemInfo = [];	
	_.each(ids, function(id){
		elem = new VQ_Element(id["text"])
		elemInfo.push({id: id["text"], class: elem.getName()});
	})

	_.each(GetLinks(elemInfo[0]["id"]), function(e) {		
		if(e["class"] == elemInfo[1]["class"]){
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
						if (ee["class"] == el["class"]){
							classNew = false;
						}
					})

					if (classNew && !(el["class"] == elemInfo[0]["class"])){							
						e_elem.push(el);																		
						if(el["class"] == elemInfo[1]["class"]){
							linkRezult.push(e_elem);
						} else{								
							actChain.push(e_elem);
						}
					}
				})
			})
		} else {
			i = maxLength +1;
		}
	}

	link_chain = [];
	actChain = [];								

	//Update information on chains
	var resultChain = [];
	var resultStringArray=[]
	var i = 0;
	_.each(linkRezult, function(e){
		resultChain = [{link: "", class: elemInfo[0]["class"], type: ""}];
		_.each(e, function(ee){
			if (ee["type"] == "=>") {
				resultChain.push({link: ee["name"], class: ee["class"], type: "", direction: ee["type"]});
			} else {
				resultChain.push({link: ee["name"], class: ee["class"], type: "(inv)", direction: ee["type"]});
			}
		})
		resultStringArray.push({number: i, array:resultChain});
		i++;
	})

	
	if(resultStringArray.length == 0) {
		resultStringArray.push({array:[{class: "No connection of given length is found"}], number: -1});
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

function AddNextLink(currentElement, chain, lastElement){
	if (chain.length == 0)  {
		//console.log("end AddNextLink");
		return;
	}

	if (currentElement == null) {
		console.log("Unknown error - starting element does not exist.");
		return;
	}

	if (chain[0].link == null || chain[0].class == null || chain[0].direction == null) {
		console.log("Unknown error - link data doesn't exist.");
		return;
	}

    var oldPosition = currentElement.getCoordinates(); //Old class coordinates and size
    var locLink = [];
	console.log(370, chain[0].class, lastElement.name);
	if (chain[0].class == lastElement.name) {
		console.log(370, "last chain", chain);		
		var proj = Projects.findOne({_id: Session.get("activeProject")});		
		var lastVQElement = new VQ_Element(lastElement.id);
		var newPosition = lastVQElement.getCoordinates(); 
		var coordinates = GetLinkCoordinates(oldPosition, newPosition);
		lastVQElement.setClassStyle("condition");		
		if (chain[0].direction == "=>") {
        	if (coordinates.bind) {
        		locLink = [coordinates.x1, coordinates.y1, coordinates.x2, coordinates.y1, coordinates.x2, coordinates.y2];
        	} else {
        		locLink = [coordinates.x1, coordinates.y1, coordinates.x2, coordinates.y2]; 
        	}  
            Create_VQ_Element(function(lnk) {
                lnk.setName(chain[0].link);
                lnk.setLinkType("REQUIRED");
                lnk.setNestingType("PLAIN");
				if (proj && proj.autoHideDefaultPropertyName=="true") { 
					lnk.hideDefaultLinkName(true);
					lnk.setHideDefaultLinkName("true");
				}
            }, locLink, true, currentElement, lastVQElement);
        } else {
        	if (coordinates.bind) {
        		locLink = [coordinates.x2, coordinates.y2, coordinates.x2, coordinates.y1, coordinates.x1, coordinates.y1];
        	} else {
	        	locLink = [coordinates.x2, coordinates.y2, coordinates.x1, coordinates.y1];  
	        }
        	Create_VQ_Element(function(lnk) {
                lnk.setName(chain[0].link);
                lnk.setLinkType("REQUIRED");
                lnk.setNestingType("PLAIN");
				if (proj && proj.autoHideDefaultPropertyName=="true") {
					lnk.hideDefaultLinkName(true);
					lnk.setHideDefaultLinkName("true");
				}
            }, locLink, true, lastVQElement, currentElement);
        }
	} else { console.log(409, "chain", chain);
		var d = 30; //distance between boxes
	    var newPosition = currentElement.getNewLocation(d); //New class coordinates and size
	    //Link Coordinates
	    var coordX = newPosition.x + Math.round(newPosition.width/2);
	    var coordY = oldPosition.y + oldPosition.height;		
		//link_name, class_name, line_direct
	    Create_VQ_Element(function(cl){
	        cl.setName(chain[0].class);
	        var proj = Projects.findOne({_id: Session.get("activeProject")});
	        cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
	        cl.setClassStyle("condition");
	        if (chain[0].direction == "=>") {
	        	locLink = [coordX, coordY, coordX, newPosition.y];                 
	            Create_VQ_Element(function(lnk) {
	                lnk.setName(chain[0].link);
	                lnk.setLinkType("REQUIRED");
	                lnk.setNestingType("PLAIN");
					if (proj && proj.autoHideDefaultPropertyName=="true") { 
						lnk.hideDefaultLinkName(true);
						lnk.setHideDefaultLinkName("true");
					}
	            }, locLink, true, currentElement, cl);
	        } else {
	        	locLink = [coordX, newPosition.y, coordX, coordY];
	        	Create_VQ_Element(function(lnk) {
	                lnk.setName(chain[0].link);
	                lnk.setLinkType("REQUIRED");
	                lnk.setNestingType("PLAIN");
					if (proj && proj.autoHideDefaultPropertyName=="true") {
						lnk.hideDefaultLinkName(true);
						lnk.setHideDefaultLinkName("true");
					}
	            }, locLink, true, cl, currentElement);
	        }
	        var newChain = _.rest(chain);
	        AddNextLink(cl, newChain, lastElement);
	    }, newPosition);
	}

    console.log(446);
}

function GetLinkCoordinates(startElem, endElem){ //{x: x, y: y, width: w, height: h}
	var x1 = 0; var y1 = 0; var x2 = 0; var y2 = 0; var bX = true; var bY = true;
	//X axis
	if ((startElem.x + startElem.width) < endElem.x){
		x1 = startElem.x + startElem.width;
		x2 = endElem.x + Math.round(endElem.width/2);		
	} else if (startElem.x > (endElem.x + endElem.width)) {
		x1 = startElem.x;
		x2 = endElem.x + Math.round(endElem.width/2);
	} else {
		x1 = Math.round((Math.max(startElem.x, endElem.x) + Math.min(startElem.x + startElem.width, endElem.x + endElem.width))/2);
		x2 = x1;
		bX = false;
	}
	//Y axis
	if ((startElem.y + startElem.height) < endElem.y){
		y1 = startElem.y + Math.round(startElem.height/2);
		y2 = endElem.y;
	} else if (startElem.y > (endElem.y + endElem.height)) {
		y1 = startElem.y + Math.round(startElem.height/2);
		y2 = endElem.y + endElem.height;
	} else {
		y1 = Math.round((Math.max(startElem.y, endElem.y) + Math.min(startElem.y + startElem.height, endElem.y + endElem.height))/2);
		y2 = y1;
		bY = false;
	} console.log({x1: x1, y1: y1, x2: x2, y2: y2, bind: (bX && bY)});

	if (!bX) { console.log(485);
		if ((startElem.y + startElem.height) < endElem.y){ console.log(486);
			y1 = y1 + Math.round(startElem.height/2);
		} else if (startElem.y > (endElem.y + endElem.height)) { console.log(488);
			y1 = y1 - Math.round(startElem.height/2);
		}				
	}

	if (!bY) {console.log(493);
		if ((startElem.x + startElem.width) < endElem.x){
			x2 = x2 - Math.round(endElem.width/2);		
		} else if (startElem.x > (endElem.x + endElem.width)) {
			x2 = x2 + Math.round(endElem.width/2);
		}
	}//console.log({x1: x1, y1: y1, x2: x2, y2: y2, bind: (bX && bY)});
	return {x1: x1, y1: y1, x2: x2, y2: y2, bind: (bX && bY)};
}

function applySearch(list, value){
	var newList = list.filter(function(e){				
		var found = false;
		_.every(e.array, function(a){
			var sLink = a.link;
			var sClass = a.class;
			if (!sLink) {
				sLink = "";
			}
			if (!sClass){
				sClass = "";
			}
			if (sLink.toLowerCase().indexOf(value) > -1 || sClass.toLowerCase().indexOf(value) > -1) {
				found = true;
				return false;
			}
			return true;
		})			
		return found;				
	});
	return newList;
}