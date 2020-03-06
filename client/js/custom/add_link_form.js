Interpreter.customMethods({
	AddLink: function () {
		Interpreter.destroyErrorMsg();
		Template.AddLink.fullList.set(getAllAssociations());
		Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);		
		$("#add-link-form").modal("show");
	},

	AddLinkTest: function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		_.each(getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);		
		Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: true});		
		$("#add-link-form").modal("show");
	},

	AddSubquery: function () {
		Interpreter.destroyErrorMsg();
		Template.AddLink.fullList.set(getAllAssociations());
		Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('input[id=goto-wizard]').attr('checked', false);
		$('#goto-wizard').removeAttr("disabled");
		$("#add-link-form").modal("show");
	},
})

Template.AddLink.fullList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: "", show: true}]);
Template.AddLink.shortList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
Template.AddLink.testAddLink = new ReactiveVar({data: false});

Template.AddLink.helpers({

	fullList: function(){
		return Template.AddLink.fullList.get();
	},

	shortList: function(){
		return Template.AddLink.shortList.get();
	},

	testAddLink: function(){
		return Template.AddLink.testAddLink.get();
	},
});

Template.AddLink.events({
//Buttons
	"click #ok-add-link": function() {

		//Read user's choise
		var obj = $('input[name=link-list-radio]:checked').closest(".association");
		var linkType = $('input[name=type-radio]:checked').val();

		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");

		$("div[id=errorField]").remove();

        if (!name || name == "") {
        	var value = $("#mySearch").val();
        	if (!value){
	            console.log("Choose valid link");
	            $(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link</div>");
	        } else {
	        	Template.AddLink.fullList.set(getAllAssociations());
	        	$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link. <br> Path deffinition will be added later</div>");
	        }
        } else {
			//start_elem
			var start_elem_id = Session.get("activeElement");			
			Template.AggregateWizard.startClassId.set(start_elem_id);
			// var elem_start = Elements.findOne({_id: start_elem_id});

			var currentElement = new VQ_Element(start_elem_id);
			if (currentElement == null) {
				console.log("Unknown error - active element does not exist.");
				return;
			}

            var d = 30; //distance between boxes
            var oldPosition = currentElement.getCoordinates(); //Old class coordinates and size
            var newPosition = currentElement.getNewLocation(d); //New class coordinates and size
            //Link Coordinates
            var coordX = newPosition.x + Math.round(newPosition.width/2);
            var coordY = oldPosition.y + oldPosition.height;
            var locLink = [];
            
            Create_VQ_Element(function(cl){
                cl.setName(class_name);
                var proj = Projects.findOne({_id: Session.get("activeProject")});
                cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
                cl.setClassStyle("condition");
                if (line_direct == "=>") {
                	locLink = [coordX, coordY, coordX, newPosition.y];                 
	                Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");
	                    if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName=="true") { 
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, currentElement, cl);
	            } else {
	            	locLink = [coordX, newPosition.y, coordX, coordY];
	            	Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");
	                    if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName=="true") {
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, cl, currentElement);
	            }
                Template.AggregateWizard.endClassId.set(cl.obj._id);
            }, newPosition);

			if (document.getElementById("goto-wizard").checked == true ){

				//Fields
				var attr_list = [{attribute: ""}];
				var schema = new VQ_Schema();

				if (schema.classExist(class_name)) {

					var klass = schema.findClassByName(class_name);

					_.each(klass.getAllAttributes(), function(att){
						attr_list.push({attribute: att["name"]});
					})
					attr_list = _.sortBy(attr_list, "attribute");
				}
				// console.log(attr_list);
				Template.AggregateWizard.attList.set(attr_list);

				//Alias name
				if (class_name) {
					Interpreter.destroyErrorMsg();
					Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
					Template.AggregateWizard.showDisplay.set("block");
					$("#aggregate-wizard-form").modal("show");
				} else {
					//alert("No class selected - wizard may work unproperly");
					Interpreter.showErrorMsg("No proper link-class pair selected to proceed with Aggregate wizard.", -3);
				}
			}

			clearAddLinkInput();
			$("#add-link-form").modal("hide");
			return;
		}

	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();
	},

	"click #add-long-link": function() {
		//Generate data for Connect Classes
		var schema = new VQ_Schema();
		var data = [];
		var count = 0;
		_.each(schema.getAllClasses(), function(c){
			data.push({name: c.name, id: count});
			count++;
		});
		var activeClass = new VQ_Element(Session.get("activeElement"));
		Template.ConnectClasses.IDS.set({name: activeClass.getName(), id: activeClass.obj["_id"]});
		Template.ConnectClasses.elements.set(data);
		Template.ConnectClasses.addLongLink.set({data: true});
		Template.ConnectClasses.linkMenu.set({data: false});
		Template.ConnectClassesSettings.pathLength.set(3);
		$("#connect-classes-form").modal("show");
		// console.log("Connect classes activated");
		//Hide Add Link 
		clearAddLinkInput();
		$("#add-link-form").modal("hide");
	},

//Menu listeners
	"click #add-link-type-choice": function() {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').attr('checked', false);
            $('#goto-wizard').attr('disabled',"disabled");
        } else {
        	var cardValue = $('input[name=link-list-radio]:checked').attr("card"); console.log("changed", cardValue);
        	if (cardValue == "") {
        		confirmSubquery();
        	}        	
            $('#goto-wizard').removeAttr("disabled");
            $('#goto-wizard').attr('checked', true);
        } 
	},

	"click #link-list-form": function() {
		$("div[id=errorField]").remove();
	},

	"keyup #mySearch": function(){
		if (!Template.AddLink.testAddLink.curValue.data){ console.log("\nmySearch NORMAL action");
		//1st version
			// $("div[id=errorField]").remove();
			// var value = $("#mySearch").val().toLowerCase();
			// if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
			// 	Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
			// } else {
			// 	var ascList = Template.AddLink.fullList.curValue;
			// 	ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
			// 		return e.name.toLowerCase().indexOf(value) > -1 || e.class.toLowerCase().indexOf(value) > -1;
			// 	})
			// 	Template.AddLink.shortList.set(ascList);
			// }
			$("div[id=errorField]").remove();
			var value = $("#mySearch").val().toLowerCase();
			if (value == "" || value == " ") {//empty or space - show all elements
				Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
				// var asc = Template.AddLink.fullList.curValue;
				// _.each(asc, function(a){
				// 	asc.show = true;
				// })
				// Template.AddLink.fullList.set(asc);	
			} else if (value.indexOf('.') > -1) {
				console.log("property path");
				value = value.split('.');
				if (value.length > 2) {
					console.log("too many points");
					return;
				}

				_.each(value, function(v){
					console.log(v);
					if (v.indexOf(' ') > -1 || v.indexOf(',') > -1) {
						var newV = v.replace(/,/g, ' ').replace(/ {2,}/g, ' ').split(" ");
						value[value.indexOf(v)] = newV;			
					} else {
						value[value.indexOf(v)] = [v];
					}
				})

				console.log(value);

				var ascList = Template.AddLink.fullList.curValue;
				var asc = Template.AddLink.fullList.curValue;
				ascList = ascList.filter(function(e){
					var hasLink = true;
					var hasClass = true;

					_.each(value[0], function(v){
						if (v != "" && e.name.toLowerCase().indexOf(v) == -1) {
							hasLink = false;
						}
					});

					_.each(value[1], function(v){
						if (v != "" && e.class.toLowerCase().indexOf(v) == -1) {
							hasClass = false;
						}
					});
					// asc[asc.indexOf(e)].show = (hasLink && hasClass);
					return (hasLink && hasClass);
				})

				Template.AddLink.shortList.set(ascList);	
			} else {
				if (value.indexOf(' ') > -1 || value.indexOf(',') > -1) {
					value = value.replace(/,/g, ' ').replace(/ {2,}/g, ' ');
					value = value.split(" ");			
				} else {
					value = [value];
				}
				value = value.filter(function(e) { return e !== "" });

				var ascList = Template.AddLink.fullList.curValue;
				ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
					var hasValues = true;
					_.each(value, function(v){ //check if any of searched values is missing
						if (e.name.toLowerCase().indexOf(v) == -1 && e.class.toLowerCase().indexOf(v) == -1) {
							hasValues = false;
						}
					});
					//asc[asc.indexOf(e)].show = hasValues;
					return hasValues;
				})			
				Template.AddLink.shortList.set(ascList);
			}
		} else {
			console.log("\nmySearch TEST action");
			$("div[id=errorField]").remove();
			var value = $("#mySearch").val().toLowerCase(); console.log("mySearch read value: ", value);
			if (value == "" || value == " ") {//empty or space - show all elements
				Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
				// var asc = Template.AddLink.fullList.curValue;
				// _.each(asc, function(a){
				// 	asc.show = true;
				// })
				// Template.AddLink.fullList.set(asc);
				console.log("mySearch empty value or space");
			} else if (value.indexOf('.') > -1) {
				console.log("TODO property path");
				value = value.split(".");
				if (value.length > 2){ //More then 1 point is used
					Template.AddLink.shortList.set([]);
		        	$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, use only 1 point to separate link and class</div>");
		   //      	var asc = Template.AddLink.fullList.curValue;
					// _.each(asc, function(a){
					// 	asc.show = false;
					// })
					// Template.AddLink.fullList.set(asc);
					console.log("Multiple points (.)");
				} else {
					console.log("mySearch single point");
					$("div[id=errorField]").remove();

					if (value[0].indexOf(' ') > -1 || value[0].indexOf(',') > -1) {
						value[0] = value[0].replace(/,/g, ' ').replace(/ {2,}/g, ' ');
						value[0] = value[0].split(" ");
					} else {
						value[0] = [value[0]];
					}
					value[0] = value[0].filter(function(e) { return e !== "" });
					
					if (value[1].indexOf(' ') > -1 || value[1].indexOf(',') > -1) {
						value[1] = value[1].replace(/,/g, ' ').replace(/ {2,}/g, ' ');
						value[1] = value[1].split(" ");
					} else {
						value[1] = [value[1]];
					}
					value[1] = value[1].filter(function(e) { return e !== "" });

					var ascList = Template.AddLink.fullList.curValue;
					ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
						var hasValues = true;

						_.each(value[0], function(v){ //check if any of searched values is missing in link part
							if (e.name.toLowerCase().indexOf(v) == -1) {
								hasValues = false;
							}
						});

						if (hasValues) {
							_.each(value[1], function(v){ //check if any of searched values is missing in class part
								if (e.class.toLowerCase().indexOf(v) == -1) {
									hasValues = false;
								}
							});
						}
						// asc[asc.indexOf(e)].show = hasValues;
						return hasValues;
					})
					Template.AddLink.shortList.set(ascList);
				}

			} else { console.log("mySearch no point");
				if (value.indexOf(' ') > -1 || value.indexOf(',') > -1) {
					value = value.replace(/,/g, ' ').replace(/ {2,}/g, ' ');
					value = value.split(" ");			
				} else {
					value = [value];
				}
				value = value.filter(function(e) { return e !== "" }); console.log("mySearch new value: ", value);

				var ascList = Template.AddLink.fullList.curValue; console.log("mySearch full list: ", ascList);
				ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
					var hasValues = true;
					_.each(value, function(v){ //check if any of searched values is missing
						if (e.name.toLowerCase().indexOf(v) == -1 && e.class.toLowerCase().indexOf(v) == -1) {
							hasValues = false;
						}
					});
					// asc[asc.indexOf(e)].show = hasValues;
					return hasValues;
				}); console.log("mySearch filtered list: ", ascList);
				Template.AddLink.shortList.set(ascList); console.log("mySearch no point finished\n");
			}
		}
//Original
		// if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
		// 	Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		// } else {
		// 	var ascList = Template.AddLink.fullList.curValue;
		// 	ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
		// 		return e.name.toLowerCase().indexOf(value) > -1 || e.class.toLowerCase().indexOf(value) > -1;
		// 	})
		// 	Template.AddLink.shortList.set(ascList);
		// }
	},

	"change #link-list-form": function() {
		var typeName = $('input[name=type-radio]').filter(':checked').val();
		var cardValue = $('input[name=link-list-radio]:checked').attr("card");
		console.log("changed", typeName, cardValue);
		if (typeName == "NESTED" && cardValue == "") {
			confirmSubquery();
		}
	},

});

//++++++++++++
//Functions
//++++++++++++
function clearAddLinkInput(){
	$('input[name=link-list-radio]:checked').attr('checked', false);
	// var defaultList = document.getElementsByName("link-list-radio");
	// _.each(defaultList, function(e){
	// 	if (e.value == "++") e.checked = true;
	// 	else e.checked = false;
	// });
	var defaultRadio = document.getElementsByName("type-radio");
	_.each(defaultRadio, function(e){
		if (e.value == "JOIN") e.checked = true;
		else e.checked = false;
	});

	Template.AddLink.fullList.set([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
	Template.AddLink.shortList.set([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);

	$('[name=type-radio]').removeAttr('checked');
	$('input[name=type-radio][value="JOIN"]').attr('checked', true);
	$('input[id=goto-wizard]').attr("disabled","disabled");
	$("#mySearch")[0].value = "";
	$("div[id=errorField]").remove();
}

function confirmSubquery(){
	// var txt;
	var proj = Projects.findOne({_id: Session.get("activeProject")});
	if (proj.showCardinalities=="true" && confirm("You are using subquery link type for link with cardinality equal to 1. Would You like to change link type to Join?\n\nCancel will accept Your settings as is.")) {
		// txt = "You pressed OK!";
		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);
		$('#goto-wizard:checked').attr('checked', false);
        $('#goto-wizard').attr('disabled',"disabled");
	} else {
		// txt = "You pressed Cancel!";		
	}
	// console.log(txt);
}

function getAllAssociations(){
	//start_elem
		var start_elem_id = Session.get("activeElement");
		var startElement = new VQ_Element(start_elem_id);
		if (!_.isEmpty(startElement) && startElement.isClass()){ //Because in case of deleted element ID is still "activeElement"
			//Associations
			var asc = [];
			var ascReverse = [];
			// var ascDetails = getDetailedAttributes(); 
			// //check if max cardinality exists 
			// var hasCardinalities = false;
			// _.each(ascDetails, function(e){
			// 	if (e.max) hasCardinalities = true;
			// })

			var className = startElement.getName(); 
			var schema = new VQ_Schema();
			var proj = Projects.findOne({_id: Session.get("activeProject")});

			if (startElement.isUnion() && !startElement.isRoot()) { // [ + ] element, that has link to upper class 
				if (startElement.getLinkToRoot()){
					var element = startElement.getLinkToRoot().link.getElements();
					if (startElement.getLinkToRoot().start) {
						var newStartClass = new VQ_Element(element.start.obj._id);						
        				className = newStartClass.getName();
        			} else {
        				var newStartClass = new VQ_Element(element.end.obj._id);						
        				className = newStartClass.getName();
        			}						
				}					
			} 

			if (schema.classExist(className)) {
				
				var allAssociations = schema.findClassByName(className).getAllAssociations();

				//remove duplicates
				allAssociations = allAssociations.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
				});
				_.each(allAssociations, function(e){
					var cardinality = "";
					var colorLetters = ""; 				
					if (proj) {				
						if (proj.showCardinalities=="true"){ 
							if (e.type == "<=") {
								cardinality = cardinality.concat("[*]");
								colorLetters = colorLetters.concat("color: purple");
							} else {
								//var maxCard = schema.resolveSchemaRoleByName(e.name,className,e.class).maxCardinality; maxCard tiek padota uzreiz LL
								var maxCard = e.maxCard;
								if (maxCard == null || !maxCard || maxCard == -1 || maxCard > 1) {
									cardinality = cardinality.concat("[*]");
									colorLetters = colorLetters.concat("color: purple");
								}
							}
							/*if (!hasCardinalities || e.type == "<=") { 
								cardinality = cardinality.concat("[*]");
								colorLetters = colorLetters.concat("color: purple");
							} else {
								_.each(ascDetails, function(d){
									//if (d.name == e.name && ((d.from == className && d.to == e.class && e.type == "=>") || (d.from == e.class && d.to == className && e.type == "<="))) { 
									if (d.name == e.name && (d.from == className && d.to == e.class && e.type == "=>") 
										&& d.max == -1) {
										cardinality = cardinality.concat("[*]");
										colorLetters = colorLetters.concat("color: purple");
									}
									//}
								});
								
							}*/
						}
					} //console.log(e.type, schema.resolveLinkByName(e.name).maxCardinality, cardinality, colorLetters);				
					
					
					//prefix:name
					var eName = e.short_name
					
					
					if(e.type == "=>") asc.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					else ascReverse.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					
					if (e.class == className) //Link to itself
						if (e.type == "=>")
							ascReverse.push({name: e.name, class: e.short_class_name, type: "<=", card: cardinality, clr: colorLetters});
						else
							asc.push({name: e.name, class: e.short_class_name, type: "=>", card: cardinality, clr: colorLetters});
				});
			}

			//default value for any case
			if (proj){
      			if (proj.showCardinalities=="true")
      				ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "[*]", clr: "color: purple"}); 
				else {
      				ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "", clr: ""});
      			}
      		}
      		asc = asc.concat(ascReverse);

      		if (proj){
      			var selfName = "";
      			if (className.indexOf("[") == -1) {      				
      				selfName = className;
      			} else {
					var linkUp = startElement.getLinkToRoot(); 
					if (!linkUp || linkUp == undefined) {
						selfName = "";
					} else {
						linkUp = linkUp.link.obj;
						var previousClassId = "";		
						if (linkUp.startElement == start_elem_id) {
							previousClassId = linkUp.endElement;
						} else if (linkUp.endElement == start_elem_id) {
							previousClassId = linkUp.startElement;
						} else {
							console.log(73, ": error with previous element");
							return;
						}

						var previousVQelement = new VQ_Element(previousClassId);
						selfName = previousVQelement.getName();
					}
				}
      			if (proj.showCardinalities=="true")
      				asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: ""}); 
				else {
      				asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: ""});
      			}
      		}  		
			return asc;
		}
}

