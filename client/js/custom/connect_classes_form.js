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
				var position = -1;
				_.each(ids, function(id){
					elem = new VQ_Element(id.text);
					if (position == -1) {
						position = elem.getCoordinates().x + elem.getCoordinates().y;
						usedClasses.push({id: id.text});
					} else {
						if (position > (elem.getCoordinates().x + elem.getCoordinates().y)) {
							var newUsed = [{id: id.text}];
							newUsed.push(usedClasses[0]);
							usedClasses = newUsed;
						} else {
							usedClasses.push({id: id.text});
						}
					}
				})

				var startClass = new VQ_Element(usedClasses[0]["id"]);
				var endClass = new VQ_Element(usedClasses[1]["id"]);

				ids = [{text: startClass.obj["_id"]}, {text: endClass.obj["_id"]}];
				usedClasses = [{name: startClass.getName(), id: startClass.obj["_id"]}, {name: endClass.getName(), id: endClass.obj["_id"]}];
				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue.data);
				
				Template.ConnectClasses.IDS.set(ids);
				Template.ConnectClasses.elements.set(usedClasses);
				Template.ConnectClasses.linkList.set(list);
				// Template.ConnectClasses.shortLinkList.set([{array: [{class: "Please choose direction to connect classes"}], number: -1}]);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: false});
				// Template.ConnectClasses.test.set({data: false});
				Template.ConnectClasses.linkID.set({data: "no link"});

				Template.ConnectClassesSettings.fromToClass.set({fromName: startClass.getName(), fromID: startClass.obj["_id"], toName: endClass.getName(), toID: endClass.obj["_id"]});


				$("#show-as-property-path")[0].checked = false;
				$("#connect-classes-form").modal("show");			
			}
		}		
		
	},

	linkConnectClasses: function () {		
		var link = new VQ_Element(Session.get("activeElement"));
		if (link && link.isLink()) {
			var startClass = link.getStartElement();
			var endClass = link.getEndElement();
			if (startClass && endClass) {
				var ids = [{text: startClass.obj["_id"]}, {text: endClass.obj["_id"]}];
				var usedClasses = [{name: startClass.getName(), id: startClass.obj["_id"]}, {name: endClass.getName(), id: endClass.obj["_id"]}];
				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue.data);
				
				Template.ConnectClasses.IDS.set(ids);
				Template.ConnectClasses.elements.set(usedClasses);
				Template.ConnectClasses.linkList.set(list);
				// Template.ConnectClasses.shortLinkList.set([{array: [{class: "Please choose direction to connect classes"}], number: -1}]);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: true});
				// Template.ConnectClasses.test.set({data: false});
				Template.ConnectClasses.linkID.set({data: link.obj["_id"]});

				Template.ConnectClassesSettings.fromToClass.set({fromName: startClass.getName(), fromID: startClass.obj["_id"], toName: endClass.getName(), toID: endClass.obj["_id"]});

				$("#show-as-property-path")[0].checked = true;			
				$("#connect-classes-form").modal("show");
				console.log("link with classes");
			}
		}
	},

	test_linkConnectClasses: function () {
		var link = new VQ_Element(Session.get("activeElement"));
		if (link && link.isLink()) {
			var startClass = link.getStartElement();
			var endClass = link.getEndElement();
			if (startClass && endClass) {
				var ids = [{text: startClass.obj["_id"]}, {text: endClass.obj["_id"]}];
				var usedClasses = [{name: startClass.getName(), id: startClass.obj["_id"]}, {name: endClass.getName(), id: endClass.obj["_id"]}];
				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue.data);
				Template.ConnectClasses.IDS.set(ids);				
				Template.ConnectClasses.elements.set(usedClasses);							
				Template.ConnectClasses.linkList.set(list);
				// Template.ConnectClasses.shortLinkList.set(list);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: true});
				// Template.ConnectClasses.test.set({data: true});
				Template.ConnectClasses.linkID.set({data: link.obj["_id"]});

				Template.ConnectClassesSettings.fromToClass.set({fromName: startClass.getName(), fromID: startClass.obj["_id"], toName: endClass.getName(), toID: endClass.obj["_id"]});

				$("#show-as-property-path")[0].checked = true;			
				$("#connect-classes-form").modal("show");
				console.log("TEST");
			}
		}
	},		
})

Template.ConnectClasses.IDS= new ReactiveVar([{name: "no class", id:"0"}]);
Template.ConnectClasses.linkList = new ReactiveVar([{array: [{class: "No connection of given length is found"}], show: true, countInverseLinks: 0, number: -1}]);
Template.ConnectClasses.shortLinkList = new ReactiveVar([{array: [{class: "No connection of given length is found"}], number: -1}]);
Template.ConnectClasses.elements = new ReactiveVar([{name: "No class", id: 0}]);
Template.ConnectClasses.addLongLink = new ReactiveVar({data: false});
Template.ConnectClasses.linkMenu = new ReactiveVar({data: false});
Template.ConnectClasses.linkID = new ReactiveVar({data: "no link"});
// Template.ConnectClasses.test = new ReactiveVar({data: false});

Template.ConnectClasses.helpers({

	IDS: function(){
		return Template.ConnectClasses.IDS.get();
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

	addLongLink: function(){
		return Template.ConnectClasses.addLongLink.get();
	},

	linkID: function(){
		return Template.ConnectClasses.linkID.get();
	},

	// test: function(){
	// 	return Template.ConnectClasses.test.get();
	// },

});

Template.ConnectClasses.events({
//O L D   V E R S I O N (no settings window)
	// "click #show-settings": function(){
	// 	var button = $("#show-settings");
	// 	var elem = $("#settings");
	// 	if (button.text() == "Hide settings"){
	// 		button.text("Show settings");
	// 		elem[0].style.display = "none";
	// 	} else {
	// 		button.text("Hide settings");
	// 		elem[0].style.display = "block";
	// 	}
	// },

	// "click #apply-settings": function(){
	// 	var first = "";
	// 	var fullList;
	// 	var isTest = Template.ConnectClasses.test.get().data;
	// 	var defaultLength = $("#default-max-length").is(':checked'); 
	// 	var inverseLinks = $('input[name=inverse-links]:checked').val(); 
	// 	if (!inverseLinks || inverseLinks == "undefined") {inverseLinks = "one"} console.log(isTest, defaultLength, inverseLinks);
	// 	if (!Template.ConnectClasses.addLongLink.get().data){
	// 		//check if starting element is selected			
	// 		first = $('input[name=fc-radio]:checked').val();			
	// 		if (!first || first == "" || first == undefined) {
	// 			$('#direction_text')[0].style.color = "red";
	// 			fullList = [{array: [{class: "Please choose direction to connect classes"}], number: -1}]
	// 		} else {
	// 			var maxLength = $("#max_length")[0].value;
	// 			if (isTest && defaultLength){					
	// 				$("#max_length")[0].value = "1";
	// 				maxLength = 1;
	// 			}			
	// 			if (maxLength) {
	// 				$('#direction_text')[0].style.color = "";
	// 				$('#max_length_text')[0].style.color = "";
	// 			//check if length is integer
	// 				if( (maxLength - Math.round(maxLength)) != 0 ) { 
	// 					Template.ConnectClasses.linkList.set([{array: [{class: "Please choose correct maximum length"}], number: -1}]);
	// 					$('#max_length_text')[0].style.color = "red";
	// 					return; 
	// 				}				
	// 				var ids = Template.ConnectClasses.IDS.curValue;
	// 				//sort IDs in the right order top pass to GetChains
	// 				//from-class at position 0, to-class at possition 1
	// 				var newIds = [];
	// 				_.each(ids, function(e){
	// 					if (e.text == first){
	// 						newIds[0] = e; 
	// 					} else {
	// 						newIds[1] = e;
	// 					}
	// 				})
	// 				ids = newIds; //console.log("ids: ", newIds);

	// 				// Create possible linking chains
	// 				//{number: i, array:[{link: ee["name"], class: ee["class"], type: " <= ", direction: ee["type"]}]}
	// 				fullList = GetChains(ids, maxLength); 				
	// 			}
	// 		}
	// 		Template.ConnectClasses.linkList.set(fullList);
	// 		var value = $("#searchList").val().toLowerCase();
	// 		console.log(fullList);
	// 		if (isTest) {
	// 			fullList = fullList.filter(function(e){
	// 					var hasInv = 0;
	// 					_.each(e.array, function(a){
	// 						if (a["type"] && (a["type"] != "" && a["type"].indexOf("<=") > -1)) hasInv++;
	// 					})
	// 					console.log(inverseLinks, hasInv);
	// 					if (inverseLinks == "none" && hasInv == 0) return true;
	// 					if (inverseLinks == "one" && hasInv < 2) return true;
	// 					if (inverseLinks == "more") return true;
	// 					return false;
	// 				});				
	// 		}
	// 		console.log(fullList);
	// 		if (value == "" || value.indexOf(' ') > -1) {
	// 			Template.ConnectClasses.shortLinkList.set(fullList);
	// 		} else {
	// 			Template.ConnectClasses.shortLinkList.set(applySearch(fullList, value));
	// 		} console.log(Template.ConnectClasses.shortLinkList.curValue);
	// 	} else {
	// 		// console.log("159 - from add link");
	// 		first = Session.get("activeElement");			
	// 		if (!first || first == "" || first == undefined) {
	// 			$('#direction_text')[0].style.color = "red";
	// 			fullList = [{array: [{class: "Please choose class to connect from"}], number: -1}]
	// 		} else {				
	// 			var endClassName = $('#classList').val();
	// 			if (!endClassName || endClassName == "") {
	// 				$('#direction_text')[0].style.color = "red";
	// 				fullList = [{array: [{class: "Please choose class to connect to"}], number: -1}]
	// 			} else {
	// 				var maxLength = $("#max_length")[0].value;			
	// 				if (maxLength) {
	// 					$('#direction_text')[0].style.color = "";
	// 					$('#max_length_text')[0].style.color = "";
	// 				//check if length is integer
	// 					if( (maxLength - Math.round(maxLength)) != 0 ) { 
	// 						Template.ConnectClasses.linkList.set([{array: [{class: "Please choose correct maximum length"}], number: -1}]);
	// 						$('#max_length_text')[0].style.color = "red";
	// 						return; 
	// 					}				
	// 					var newIds = [];
	// 					newIds[0] = {text: first};
	// 					newIds[1] = {text: "no_class_exists", name: endClassName}					

	// 					// Create possible linking chains
	// 					fullList = GetChains(newIds, maxLength);									
	// 				}
	// 			}
	// 		}
	// 		Template.ConnectClasses.linkList.set(fullList);
	// 		var value = $("#searchList").val().toLowerCase();
	// 		if (value == "" || value.indexOf(' ') > -1) {
	// 			Template.ConnectClasses.shortLinkList.set(fullList);
	// 		} else {
	// 			Template.ConnectClasses.shortLinkList.set(applySearch(fullList, value));
	// 		}			
	// 	}		
	// },

	"keyup #searchList": function(){
		var value = $("#searchList").val().toLowerCase(); 
		//console.log("mySearch: ", value);
		var data = Template.ConnectClasses.linkList.curValue;
		var inverseCount = Template.ConnectClassesSettings.inverseValue.curValue.data; //"none", "one", "more"
		if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
			_.each(data, function(e){
				if (inverseCount == "more" || (inverseCount == "one" && e.countInverseLinks < 2) || (inverseCount == "none" && e.countInverseLinks < 1)) {
					e.show = true;
				}
			})			
		} else {
			_.each(data, function(e){
			//if number of inverse link is ok - check for value				
				if (inverseCount == "more" || (inverseCount == "one" && e.countInverseLinks < 2) || (inverseCount == "none" && e.countInverseLinks < 1)) {
					var found = false;

					_.each(e.array, function(a){
						if (e.array.length == 0) { 
						// do nothing - the first class is not checked
						// given classes are not searched for value
						} else if (e.array.indexOf(a) > 0 && e.array.indexOf(a) != e.array.length - 1){ 
						//except last element - check both class and link
							if (a.link.toLowerCase().indexOf(value) > -1 || a.class.toLowerCase().indexOf(value) > -1) {
								found = true;
							}
						} else if (e.array.indexOf(a) == e.array.length - 1) {
						//last element - check only link
							if (a.link.toLowerCase().indexOf(value) > -1) {
								found = true;
							}
						}
					});
					
					if (found) {
						e.show = true;
					} else {
						e.show = false;
					}
				} else {
					e.show = false;
				}
			})
		}

		Template.ConnectClasses.linkList.set(data);

//O L D   V E R S I O N
		// if (Template.ConnectClasses.test.curValue.data) {
		// 	if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
		// 		var data = Template.ConnectClasses.linkList.curValue;			
		// 	} else {
		// 		var ascList = Template.ConnectClasses.linkList.curValue;
		// 		ascList = applySearch(ascList, value);
		// 		//console.log(ascList);
		// 		Template.ConnectClasses.shortLinkList.set(ascList);
		// 	}
		// } else {
		// 	if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
		// 		Template.ConnectClasses.shortLinkList.set(Template.ConnectClasses.linkList.curValue);			
		// 	} else {
		// 		var ascList = Template.ConnectClasses.linkList.curValue;
		// 		ascList = applySearch(ascList, value);
		// 		//console.log(ascList);
		// 		Template.ConnectClasses.shortLinkList.set(ascList);
		// 	}
		// }
	},


	"click #ok-connect": function(){
		var firstId = "";
		//test selected chain
		var number = $('input[name=stack-radio]:checked').val();
		var propertyPath = $("#show-as-property-path").is(':checked'); console.log(propertyPath);
		if (number < 0 || !number) {
			$('#chain_text')[0].style.color = "red";
			$("#connect-classes-form").modal("show");
			//console.log("No chain selected"); 
			return;
		}
		var chain = Template.ConnectClasses.linkList.curValue.filter(a => a.number == number)[0]["array"];
		chain = _.rest(chain); //console.log(chain);
		if (!Template.ConnectClasses.addLongLink.get().data){			
			firstId = Template.ConnectClasses.elements.curValue[0].id;
		} else {
			firstId = Session.get("activeElement");
		} console.log(firstId); console.log(Template.ConnectClasses.elements.curValue);
		var currentVQElment = new VQ_Element(firstId);
		var lastElement = Template.ConnectClasses.elements.curValue.filter(e => e.id != firstId)[0]; //console.log(170, lastElement);
		if (propertyPath) {
			console.log("TODO property path");
			var class_name = lastElement.name;
			var name = ""; //link name
			_.each(chain, function(e){ //{link: ee["name"], class: ee["class"], type: " <= ", direction: ee["type"]}
				if (e.type.indexOf("<=") > -1) {
					name = name.concat("inv(",e.link, ").");
				} else {
					name = name.concat(e.link, ".");
				}
			});
			name = name.slice(0,-1);
			console.log(class_name, name);

			if (Template.ConnectClasses.addLongLink.get().data){			
				var d = 30; //distance between boxes
	            var oldPosition = currentVQElment.getCoordinates(); //Old class coordinates and size
	            var newPosition = currentVQElment.getNewLocation(d); //New class coordinates and size
	            //Link Coordinates
	            var coordX = newPosition.x + Math.round(newPosition.width/2);
	            var coordY = oldPosition.y + oldPosition.height;
	            var locLink = [];
	            
	            Create_VQ_Element(function(cl){
	                cl.setName(class_name);
	                var proj = Projects.findOne({_id: Session.get("activeProject")});
	                cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
	                cl.setClassStyle("condition");	                
                	locLink = [coordX, coordY, coordX, newPosition.y];                 
	                Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");
	                    lnk.setNestingType("PLAIN");						
						if (proj && proj.autoHideDefaultPropertyName=="true") { 
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, currentVQElment, cl);
	            }, newPosition);
			} else if (Template.ConnectClasses.linkMenu.get().data) {
				var lnk = new VQ_Element(Template.ConnectClasses.linkID.get().data);
				lnk.setName(name);				
			} else {				
				var nextVQElement = new VQ_Element(lastElement.id);
				
				var oldPosition = currentVQElment.getCoordinates(); //Old class coordinates and size
	            var newPosition = nextVQElement.getCoordinates(); //New class coordinates and size
	            //Link Coordinates	            
	            var locLink = [oldPosition.x + Math.round(oldPosition.width/2), oldPosition.y + oldPosition.height, 
	            				oldPosition.x + Math.round(oldPosition.width/2), Math.max(oldPosition.y + oldPosition.height, newPosition.y + newPosition.height) + 60,
	            				newPosition.x + Math.round(newPosition.width/2), Math.max(oldPosition.y + oldPosition.height, newPosition.y + newPosition.height) + 60,
	            				newPosition.x + Math.round(newPosition.width/2), newPosition.y + newPosition.height]; 
	            console.log(oldPosition, newPosition, locLink);

				Create_VQ_Element(function(lnk) {
					var proj = Projects.findOne({_id: Session.get("activeProject")});
                    lnk.setName(name);
                    lnk.setLinkType("REQUIRED");
                    lnk.setNestingType("PLAIN");						
					if (proj && proj.autoHideDefaultPropertyName=="true") { 
						lnk.hideDefaultLinkName(true);
						lnk.setHideDefaultLinkName("true");
					}
                }, locLink, true, currentVQElment, nextVQElement);
			}
		} else {
			AddNextLink(currentVQElment, chain, lastElement);		
			if (Template.ConnectClasses.linkMenu.get().data) {
				var currentLink = new VQ_Element(Template.ConnectClasses.linkID.curValue.data);
				currentLink.deleteElement();
			}
		}	
		$("#connect-classes-form").modal("hide");
		clearConnectClassesInput();
		return;
	},

	"click #cancel-connect": function(){
		clearConnectClassesInput();
	},

	"click #option-button": function(){
		if (Template.ConnectClasses.addLongLink.curValue.data) {
			console.log("options from AddLink");
			Template.ConnectClassesSettings.fromFunction.set({data: "add"});			
		} else if(Template.ConnectClasses.linkMenu.curValue.data) {
			console.log("options from Link");
			Template.ConnectClassesSettings.fromFunction.set({data: "link"});
		} else {
			console.log("options from collection");
			Template.ConnectClassesSettings.fromFunction.set({data: "coll"});
		}
		// Template.ConnectClasses.addLongLink.set({data: false});
		// Template.ConnectClasses.linkMenu.set({data: false});
		if (Template.ConnectClasses.addLongLink.get().data) {
			Template.ConnectClassesSettings.addLongLinkS.set({data: true});
		}
		$("#connect-classes-form").modal("hide");
		$("#connect-classes-settings").modal("show");
		$("#searchList")[0].value = "";
	},

	"click #choose-second-class-button": function(){
		var nextClassName = $('#classList2').val();
		var ids = [{text: Template.ConnectClasses.IDS.curValue["id"]}, {text: "no_class_exists", name: nextClassName}];
		var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue.data);

		var inverseCount = Template.ConnectClassesSettings.inverseValue.curValue.data;
		_.each(list, function(a){					
			if (inverseCount == "more" || (inverseCount == "none" && a.countInverseLinks < 1) || (inverseCount == "one" && a.countInverseLinks < 2)) {
				a.show = true;
			} else {
				a.show = false;
			}			
		});

		Template.ConnectClassesSettings.fromToClass.set({fromName: Template.ConnectClasses.IDS.curValue["name"], fromID: Template.ConnectClasses.IDS.curValue["id"], toName: nextClassName, toID:"no_class_exists"});
		Template.ConnectClasses.linkList.set(list);		
	},
});

//===========================
//SETTINGS
//===========================
Template.ConnectClassesSettings.fromFunction = new ReactiveVar({data: "coll"}); //"coll"(ection), "link", "add"(Link)
Template.ConnectClassesSettings.fromToClass = new ReactiveVar({fromName: "", fromID: "", toName: "", toID:""});
Template.ConnectClassesSettings.directionValue = new ReactiveVar({data: 0});
Template.ConnectClassesSettings.inverseValue = new ReactiveVar({data: "more"}); //"none", "one", "more"
Template.ConnectClassesSettings.pathLength = new ReactiveVar({data: 3});
Template.ConnectClassesSettings.addLongLinkS = new ReactiveVar({data: false});

Template.ConnectClassesSettings.helpers({

	fromFunction: function(){
		return Template.ConnectClassesSettings.fromFunction.get();
	},

	fromToClass: function(){
		return Template.ConnectClassesSettings.fromToClass.get();
	},

	directionValue: function(){
		return Template.ConnectClassesSettings.directionValue.get();
	},

	inverseValue: function(){
		return Template.ConnectClassesSettings.inverseValue.get();
	},

	pathLength: function(){
		return Template.ConnectClassesSettings.pathLength.get();
	},

	addLongLinkS: function(){
		return Template.ConnectClassesSettings.addLongLinkS.get();
	},
})

Template.ConnectClassesSettings.events({
	"click #ok-connect-settings": function(){
		//console.log("Settings - OK");
		//Path's length		
		if (document.getElementById("default-max-length").checked) {
			Template.ConnectClassesSettings.pathLength.set({data: 3});
			$('#max_length').val("3");
		} else {
			var maxLength = $('#max_length').val();
			if (!document.getElementById("great-max-length").checked && maxLength > 5) {
				Template.ConnectClassesSettings.pathLength.set({data: 5});
			} else {				
				Template.ConnectClassesSettings.pathLength.set({data: maxLength});
			}
		} 

		if (!Template.ConnectClassesSettings.addLongLinkS.get().data) {
			//Direction
			var startElemID = $('input[name=path-radio]:checked').val();
			var elementList = Template.ConnectClassesSettings.fromToClass.curValue; console.log("inside direction", elementList.fromID, startElemID);
			if (elementList.fromID == startElemID){
				//console.log("original order");
				Template.ConnectClasses.elements.set([{name: elementList.fromName, id: elementList.fromID}, {name: elementList.toName, id: elementList.toID}]);
				Template.ConnectClasses.linkList.set(GetChains([{text: elementList.fromID}, {text: elementList.toID}], Template.ConnectClassesSettings.pathLength.curValue.data))
			} else if (elementList.toID == startElemID) {
				//console.log("oposite order");
				Template.ConnectClasses.elements.set([{name: elementList.toName, id: elementList.toID}, {name: elementList.fromName, id: elementList.fromID}]);
				Template.ConnectClasses.linkList.set(GetChains([{text: elementList.toID}, {text: elementList.fromID}], Template.ConnectClassesSettings.pathLength.curValue.data))		
			} else {
				//console.log("unknown order");
			}
			Template.ConnectClassesSettings.directionValue.set({data: $('input[name=path-radio]:checked').val()});
		}
		console.log("Settings - inverse");
		//Inverse
		var inverseCount = $('input[name=inverse-links]:checked').val();
		Template.ConnectClassesSettings.inverseValue.set({data: inverseCount});
		var data = Template.ConnectClasses.linkList.curValue;
		_.each(data, function(a){
			//console.log(a.show, inverseCount, a.countInverseLinks);							
			if (inverseCount == "more" || (inverseCount == "none" && a.countInverseLinks < 1) || (inverseCount == "one" && a.countInverseLinks < 2)) {
				a.show = true;
			} else {
				a.show = false;
			}			
		});
		Template.ConnectClasses.linkList.set(data);
		data = [];
		$("#connect-classes-form").modal("show");
		$("#connect-classes-settings").modal("hide");
		clearConnectClassesSettingsInput();
	},

	"click #cancel-connect-settings": function(){
		$("#connect-classes-form").modal("show");
		clearConnectClassesSettingsInput();
	},

	"click #default-max-length": function() {		
        if (document.getElementById("default-max-length").checked) {
        	$('#max_length').val("3");
            $('#max_length').attr('disabled',"disabled");
        } else {
            $('#max_length').removeAttr("disabled");
        } 
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
	$("#show-as-property-path")[0].checked = false;
	$("#searchList")[0].value = "";
	$('#chain_text')[0].style.color = "";
	Template.ConnectClasses.IDS.set([{name: "no class", id:"0"}]);
	Template.ConnectClasses.linkList.set([{array: [{class: "No connection of given length is found"}], number: -1}]);
	Template.ConnectClasses.shortLinkList.set([{array: [{class: "No connection of given length is found"}], number: -1}]);
	Template.ConnectClasses.elements.set([{name: "No class", id: 0}]);
	Template.ConnectClasses.addLongLink.set({data: false});
	// Template.ConnectClasses.test.set({data: false});

	Template.ConnectClassesSettings.fromFunction.set({data: "coll"}); //"coll"(ection), "link", "add"(Link)
	Template.ConnectClassesSettings.fromToClass.set({fromName: "", fromID: "", toName: "", toID:""});
	Template.ConnectClassesSettings.directionValue.set({data: 0});
	Template.ConnectClassesSettings.inverseValue.set({data: "more"}); //"none", "one", "more"
	Template.ConnectClassesSettings.pathLength.set({data: 3});
	Template.ConnectClassesSettings.addLongLinkS.set({data: false});

	Interpreter.destroyErrorMsg();
}

function clearConnectClassesSettingsInput(){
	_.each($('input[name=path-radio]'), function(e){
			if (e.value == Template.ConnectClassesSettings.directionValue.curValue.data) e.checked = true;
		});
	_.each($('input[name=inverse-links]'), function(e){
		if (e.value == Template.ConnectClassesSettings.inverseValue.curValue.data) e.checked = true;
	});
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
		if (id["text"] == "no_class_exists") {
			elemInfo.push({id: id["text"], class: id["name"]});
		}else {
			elem = new VQ_Element(id["text"]);
			elemInfo.push({id: id["text"], class: elem.getName()});
		}
	})
//Direct links
	_.each(GetLinks(elemInfo[0]["id"]), function(e) {		
		if(e["class"] == elemInfo[1]["class"]){
			linkRezult.push([e]);
		} else{
			link_chain.push([e]);
		}
	})
//Inverse direct links
	_.each(GetLinks(elemInfo[1]["id"]), function(e) {		
		if(e["class"] == elemInfo[0]["class"]){
			linkRezult.push([e]);
		}
	})

	var actChain = link_chain;
	var asocNew = [];	
	for (var i = 1; i < maxLength; i++){
		if(actChain){ 
			link_chain = actChain;
			actChain = [];
			asocNew = [];

			_.each(link_chain, function(e){ 
				asocNew = [];
				var className = e[i-1]["class"];
				var allAsoc = schema.findClassByName(className).getAllAssociations();
				/*[{
					name: a.localName, 
					isUnique:a.isUnique, 
					prefix:a.ontology.prefix, 
					isDefOnt:a.ontology.isDefault, 
					class: a.sourceClass.localName , 
					type: "<=" || "=>", 
					maxCard: a.maxCardinality, 
					short_name:a.getElementShortName(), 
					short_class_name:a.sourceClass.getElementShortName() || a.targetClass.getElementShortName()
				}]*/
				
				_.each(allAsoc, function(a){//console.log(592, "allAsoc element = ", a);
					var index = -1;
					var isNew = true;
					_.each(asocNew, function(as){//console.log(596, "asocNew element = ", as.class, a.class, as.name, a.name, as.type, a.type);
						//if association connects same classes AND the same link name (!= (as.type != a.type) => XOR different directions)
						if (as.class == a.class && as.name == a.name) { 
							isNew = false;
							// if (as.type != a.type) index = asocNew.indexOf(as);
						}
					}); //console.log(602, index, index2, isNew);
					
					if (isNew) { //console.log(604, "new element");
						asocNew.push(a); //console.log(605, asoc);
					} 
					// else if (a.class != className && a.type == "=>" && index > -1) { console.log(604, "need to change",className, a, index);
					// 	asocNew[index] = a;
					// 	console.log(612, asocNew[index]);
					// }
				}); //console.log(611, asocNew);

				allAsoc = [];

				var e_elem = [];
				_.each(asocNew, function(el) {							
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
			i = maxLength; //stop for cycle
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
				resultChain.push({link: ee["name"], class: ee["class"], type: " <= ", direction: ee["type"]});
			}
		})
		resultStringArray.push({number: i, show: true, countInverseLinks: countInverse(resultChain), array: resultChain});
		i++;
	})

	
	if(resultStringArray.length == 0) {
		resultStringArray.push({array:[{class: "No connection of given length is found"}], show: true, countInverseLinks: 0, number: -1});
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
	if (chain[0].class == lastElement.name && !Template.ConnectClasses.addLongLink.get().data) {
		// console.log(400, "last chain", chain);
		var lastVQElement = new VQ_Element(lastElement.id);
		var proj = Projects.findOne({_id: Session.get("activeProject")});			
		var newPosition = lastVQElement.getCoordinates(); 
		var coordinates = GetLinkCoordinates(oldPosition, newPosition);
		lastVQElement.setClassStyle("condition");
		// console.log(406, currentElement, lastVQElement);		
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
	} else { //console.log(454, "chain", chain);
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
	        // console.log(490, newChain);
	        AddNextLink(cl, newChain, lastElement);
	    }, newPosition);
	}

    // console.log(492, "end");
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
	} //console.log({x1: x1, y1: y1, x2: x2, y2: y2, bind: (bX && bY)});

	if (!bX) { //console.log(485);
		if ((startElem.y + startElem.height) < endElem.y){ console.log(486);
			y1 = y1 + Math.round(startElem.height/2);
		} else if (startElem.y > (endElem.y + endElem.height)) { console.log(488);
			y1 = y1 - Math.round(startElem.height/2);
		}				
	}

	if (!bY) {//console.log(493);
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

function countInverse(list) {			
	var count = 0;
	_.each(list, function(a){//console.log(a);
		var aDirection = a.direction;
		if (aDirection && aDirection == "<=") {
			count++;
		}
	})						
	return count;
}