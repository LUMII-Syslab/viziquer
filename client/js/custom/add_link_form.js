Interpreter.customMethods({
	AddLink: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);
		$('input[id=goto-wizard]').prop("checked",false);
		$('input[id=goto-wizard]').prop("disabled","disabled");	
		$("#mySearch")[0].value = "";		
		$("#add-link-form").modal("show");
	},

	AddSubquery: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('input[id=goto-wizard]').attr('checked', false);
		$('#goto-wizard').removeAttr("disabled");
		$("#add-link-form").modal("show");
	},

	AddUnion: function () {
		//console.log("AddUnion");
		var currentVQElment = new VQ_Element(Session.get("activeElement"));
		if (!currentVQElment.isClass()){
			console.log("Selected element is not a class");
			return;
		}
		var d = 30; //distance between boxes
        var oldPosition = currentVQElment.getCoordinates(); //Old class coordinates and size
        var newPosition = currentVQElment.getNewLocation(d); //New class coordinates and size {x: x, y: y1, width: w, height: h}
        newPosition.width = 75;
        newPosition.height = 50;
        //Link Coordinates
        var coordX = newPosition.x + Math.round(newPosition.width/2);
        var coordY = oldPosition.y + oldPosition.height;
        var locLink = [];
        
        Create_VQ_Element(function(cl){
            cl.setName("[ + ]");
            var proj = Projects.findOne({_id: Session.get("activeProject")});
            cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
            cl.setClassStyle("condition");	                
        	locLink = [coordX, coordY, coordX, newPosition.y];                 
            Create_VQ_Element(function(lnk) {
                lnk.setName("++");
                lnk.setLinkType("REQUIRED");	                    
                lnk.setNestingType("PLAIN");						
				if (proj && proj.autoHideDefaultPropertyName=="true") { 
					lnk.hideDefaultLinkName(true);
					lnk.setHideDefaultLinkName("true");
				}
            }, locLink, true, currentVQElment, cl);
            Template.AggregateWizard.endClassId.set(cl.obj._id);
        }, newPosition);
	},

	AddLinkTest: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);		
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: true});	

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);
		$('input[id=goto-wizard]').prop("checked",false);
		$('input[id=goto-wizard]').prop("disabled","disabled");	
		$("#add-link-form").modal("show");
	},
})

Template.AddLink.fullList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: "", show: true}]);
// Template.AddLink.shortList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
Template.AddLink.testAddLink = new ReactiveVar({data: false});

Template.AddLink.helpers({

	fullList: function(){
		return Template.AddLink.fullList.get();
	},

	// shortList: function(){
	// 	return Template.AddLink.shortList.get();
	// },

	testAddLink: function(){
		return Template.AddLink.testAddLink.get();
	},
});

Template.AddLink.events({
//Buttons
	"click #ok-add-link": async function() {

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
	        	Template.AddLink.fullList.set(await getAllAssociations());
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
            var nameLength = 12*class_name.length + 2*(class_name.match(/[A-Z]/g) || []).length;
            if (nameLength < 75) nameLength = 75; //default minimal width
            if (nameLength > 512) nameLength = 512; //default maximal width
            if (newPosition.width < nameLength) {
		    	//newPosition.width = 75;
		    	newPosition.width = nameLength;
		    }    
            //Link Coordinates
            var coordX = oldPosition.x + Math.round(Math.min(oldPosition.width, newPosition.width)/2);
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
				attr_list = attr_list.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['attribute'] === obj['attribute']});
				});
				// console.log(attr_list);
				Template.AggregateWizard.attList.set(attr_list);

				//Alias name
				if (class_name) {
					Interpreter.destroyErrorMsg();
					Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
					Template.AggregateWizard.showDisplay.set("block");
					Template.AggregateWizard.fromAddLink.set(true);
					
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
		if (activeClass.isUnion() && !activeClass.isRoot()) { console.log(239);// [ + ] element, that has link to upper class 
			if (activeClass.getLinkToRoot()){
				var element = activeClass.getLinkToRoot().link.getElements();
				var newStartClass = "";
				if (activeClass.getLinkToRoot().start) {
					var newStartClass = new VQ_Element(element.start.obj._id);
    			} else {
    				var newStartClass = new VQ_Element(element.end.obj._id);
    			} console.log(newStartClass.getName());
    			Template.ConnectClasses.IDS.set({name: newStartClass.getName(), id: activeClass.obj["_id"]});						
			}					
		} else {
			Template.ConnectClasses.IDS.set({name: activeClass.getName(), id: activeClass.obj["_id"]});
		}
		//Template.ConnectClasses.IDS.set({name: activeClass.getName(), id: activeClass.obj["_id"]});
		Template.ConnectClasses.elements.set(data);
		Template.ConnectClasses.addLongLink.set({data: true});
		Template.ConnectClasses.linkMenu.set({data: false});
		Template.ConnectClassesSettings.pathLength.set(3);

		var subquerySettings = {};
		if ($('input[name=type-radio]').filter(':checked').val() == "NESTED") {
			subquerySettings.isChecked = true;
		} else {
			subquerySettings.isChecked = false;
		}
		if ($('#goto-wizard').is(':checked')) {
			subquerySettings.gotoWizard = "checked";
		} else {
			subquerySettings.gotoWizard = "";
		}
		Template.ConnectClasses.gotoSubquery.set(subquerySettings);

		$("#connect-classes-form").modal("show");
		// console.log("Connect classes activated");
		//Hide Add Link 
		clearAddLinkInput();
		$("#add-link-form").modal("hide");
	},
	
	
	"click #build-path-button": function() {
		$("#build-path-form").modal("show");
	},

//Menu listeners
	"click #add-link-type-choice": function() {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').prop('checked', false);
            $('#goto-wizard').prop('disabled',"disabled");
        } else {
        	var cardValue = $('input[name=link-list-radio]:checked').attr("card"); //console.log("changed", cardValue);
        	if (cardValue == "") {
        		confirmSubquery();
        	} else {
        		$('#goto-wizard').removeAttr("disabled");
        		$('#goto-wizard').prop('checked', true);
        	}           
        } 
	},

	"click #link-list-form": function() {
		$("div[id=errorField]").remove();
	},

	"keyup #mySearch5": function(){
	// 	if (!Template.AddLink.testAddLink.curValue.data){ console.log("\nmySearch NORMAL action");
	// 		$("div[id=errorField]").remove();
	// 		var value = $("#mySearch").val().toLowerCase();
	// 		value = value.trim();
	// 		if (value == "" || value == " ") {//empty or space - show all elements
	// 			// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
	// //TEST
	// 			// if (Template.AddLink.testAddLink.curValue.data){
	// 				var asc = Template.AddLink.fullList.curValue;
	// 				_.each(asc, function(a){
	// 					a.show = true;
	// 				})
	// 				Template.AddLink.fullList.set(asc);	
	// 			// }
	// 		} else if (value.indexOf('.') > -1) {
	// 			console.log("property path");
	// 			value = value.split('.');
	// 			if (value.length > 2) {
	// 				console.log("too many points");
	// 				$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, use only 1 period to separate link and class</div>");
	// 				return;
	// 			}

	// 			_.each(value, function(v){
	// 				console.log(v);
	// 				if (v.indexOf(' ') > -1 || v.indexOf(',') > -1) {
	// 					var newV = v.replace(/,/g, ' ').replace(/ {2,}/g, ' ').split(" ");
	// 					value[value.indexOf(v)] = newV;			
	// 				} else {
	// 					value[value.indexOf(v)] = [v];
	// 				}
	// 			})

	// 			console.log(value);

	// 			var ascList = Template.AddLink.fullList.curValue;
	// 			var asc = Template.AddLink.fullList.curValue;
	// 			// ascList = ascList.filter(function(e){
	// 			_.each(ascList, function(e){
	// 				var hasLink = true;
	// 				var hasClass = true;

	// 				_.each(value[0], function(v){
	// 					if (v != "" && e.name.toLowerCase().indexOf(v) == -1) {
	// 						hasLink = false;
	// 					}
	// 				});

	// 				_.each(value[1], function(v){
	// 					if (v != "" && e.class.toLowerCase().indexOf(v) == -1) {
	// 						hasClass = false;
	// 					}
	// 				});
	// //TEST
	// 				// if (Template.AddLink.testAddLink.curValue.data){
	// 					asc[asc.findIndex(elem => _.isEqual(elem,e) )].show = (hasLink && hasClass);
	// 				// }
	// 				// return (hasLink && hasClass);
	// 			})

	// 			// Template.AddLink.shortList.set(ascList);
	// //TEST
	// 			// if (Template.AddLink.testAddLink.curValue.data){
	// 				Template.AddLink.fullList.set(asc);
	// 			// }	
	// 		} else {
	// 			if (value.indexOf(' ') > -1 || value.indexOf(',') > -1) {
	// 				value = value.replace(/,/g, ' ').replace(/ {2,}/g, ' ');
	// 				value = value.split(" ");			
	// 			} else {
	// 				value = [value];
	// 			}
	// 			value = value.filter(function(e) { return e !== "" });

	// 			var ascList = Template.AddLink.fullList.curValue;
	// 			// ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}		
	// 			_.each(ascList, function(e){		
	// 				var hasValues = true;
	// 				_.each(value, function(v){ //check if any of searched values is missing
	// 					if (e.name.toLowerCase().indexOf(v) == -1 && e.class.toLowerCase().indexOf(v) == -1) {
	// 						hasValues = false;
	// 					}
	// 				});
	// //TEST
	// 				if (Template.AddLink.testAddLink.curValue.data){
	// 					asc[asc.findIndex(elem => _.isEqual(elem,e) )].show = hasValues;
	// 				}
	// 				return hasValues;
	// 			})			
	// 			// Template.AddLink.shortList.set(ascList);
	// //TEST
	// 			// if (Template.AddLink.testAddLink.curValue.data){
	// 				Template.AddLink.fullList.set(asc);
	// 			// }
	// 		}
	// 	} else {
			// console.log("\nmySearch TEST action");
			$("div[id=errorField]").remove();
			var value = $("#mySearch").val().toLowerCase(); console.log("mySearch read value: ", value);
			var asc = Template.AddLink.fullList.curValue;
			if (value == "" || value == " ") {//empty or space - show all elements
				// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
	//TEST
				// if (Template.AddLink.testAddLink.curValue.data){
					
					_.each(asc, function(a){
						a.show = true;
					})
					Template.AddLink.fullList.set(asc);
				// }
				// console.log("mySearch empty value or space");
			} else if (value.indexOf('.') > -1) {
				// console.log("TODO property path");
				value = value.split(".");
				if (value.length > 2){ //More then 1 point is used
					// Template.AddLink.shortList.set([]);
		        	$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, use only 1 period to separate link and class</div>");
	//TEST
		        	// if (Template.AddLink.testAddLink.curValue.data){		        		
						_.each(asc, function(a){
							a.show = false;
						})
						Template.AddLink.fullList.set(asc);
					// }
					console.log("Multiple points (.)");
				} else {
					// console.log("mySearch single point");
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

					// var ascList = Template.AddLink.fullList.curValue;
					// var asc = Template.AddLink.fullList.curValue;
					// ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
					_.each(asc, function(e){
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
						};
	//TEST
						// if (Template.AddLink.testAddLink.curValue.data){
							e.show = hasValues;
						// }
						// return hasValues;
					})
					// Template.AddLink.shortList.set(ascList);
	//TEST
					// if (Template.AddLink.testAddLink.curValue.data){
						Template.AddLink.fullList.set(asc);
					// }
				}

			} else { //console.log("mySearch no point");
				if (value.indexOf(' ') > -1 || value.indexOf(',') > -1) {
					value = value.replace(/,/g, ' ').replace(/ {2,}/g, ' ');
					value = value.split(" ");			
				} else {
					value = [value];
				}
				value = value.filter(function(e) { return e !== "" }); console.log("mySearch new value: ", value);

				// var ascList = Template.AddLink.fullList.curValue; console.log("mySearch full list: ", ascList);
				// ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
				_.each(asc, function(e){
					var hasValues = true;
					_.each(value, function(v){ //check if any of searched values is missing
						if (hasValues && e.name.toLowerCase().indexOf(v) == -1 && e.class.toLowerCase().indexOf(v) == -1) {
							hasValues = false;
						}
					}); //console.log(400, e, asc.findIndex(elem => _.isEqual(elem,e) ));//;
	//TEST
					// if (Template.AddLink.testAddLink.curValue.data){
						e.show = hasValues;
					// }
					return hasValues;
				}); //console.log("mySearch filtered list: ", ascList);
				// Template.AddLink.shortList.set(ascList); console.log("mySearch no point finished\n");
	//TEST
				// if (Template.AddLink.testAddLink.curValue.data){
					Template.AddLink.fullList.set(asc);
				// }
			}
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
	'click #apply-button': async function(e) {
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);
		return;
	},
	'click #dbp_for_links': async function(e) {
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true});
		})
		Template.AddLink.fullList.set(asc);
		return;
	},

});


Template.BuildLinkPath.events({
	"keydown #build-path-input": function(e) {
		autoCompletionAddLink(e);
		return;
	},
	
	"click #ok-build-path": function() {
		
		var path = $("#build-path-input").val()
		var asc = Template.AddLink.fullList.curValue;
		asc.unshift({name: path, class: " ", type: "=>", card: "", clr: "", show: true})
		Template.AddLink.fullList.set(asc);
		document.getElementById("build-path-input").value = "";
		return;
	},
	
	"click #cancel-build-path": function() {
		document.getElementById("build-path-input").value = "";
		return;
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
	// Template.AddLink.shortList.set([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);

	$('[name=type-radio]').removeAttr('checked');
	$('input[name=type-radio][value="JOIN"]').attr('checked', true);
	$('input[id=goto-wizard]').prop("checked",false);
	$('input[id=goto-wizard]').prop("disabled","disabled");
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
		$('#goto-wizard:checked').prop('checked', false);
        $('#goto-wizard').prop('disabled',"disabled");
	} else {
		// txt = "You pressed Cancel!";
		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('#goto-wizard').removeAttr("disabled");
        $('#goto-wizard').prop('checked', true);		
	}
	// console.log(txt);
}

async function getAllAssociations(){
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
			
			if(className === null) className= "";
			
			// var schema = new VQ_Schema();
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

			// if (schema.classExist(className)) {
				
				// var allAssociations = schema.findClassByName(className).getAllAssociations();

				var param = {propertyKind:'ObjectExt'};
				var filter = $("#mySearch").val().toLowerCase();
				if(filter != null) param["filter"] = filter;
				if ($("#dbp_for_links").is(":checked") ) {
					//param.namespaces = {notIn: ['dbp']};
					//param.orderByPrefix = 'case when ns_id = 2 then 0 else 1 end desc,';
					param.orderByPrefix = `case when ns_id = 2 then 0 
else case when display_name LIKE 'wiki%' or prefix = 'rdf' and display_name = 'type' or prefix = 'dct' and display_name = 'subject'
or prefix = 'owl' and display_name = 'sameAs' or prefix = 'prov' and display_name = 'wasDerivedFrom' then 1 else 2 end end desc,`; 
				}
				
				var prop = await dataShapes.getProperties(param, startElement);
				var allAssociations = prop["data"];
				
				_.each(allAssociations, function(e){
					if ( e.mark === 'out') e.type = '=>';
					else e.type = '<=';
					
					if (e.class_iri !== undefined && e.class_iri !== null) {
						var prefix;
						if(e.class_is_local == true)prefix = "";
						else prefix = e.class_prefix+":";
						e.short_class_name = prefix + e.class_display_name;						
					}
					else
						e.short_class_name = "";
					
				});

				//remove duplicates - moved to getAllAssociations()
				//allAssociations = allAssociations.filter(function(obj, index, self) { 
				//	return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
				//});
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
					var prefix;
					if(e.is_local == true)prefix = "";
					else prefix = e.prefix+":";
					var eName = prefix + e.display_name;
					
					
					if(e.mark == "out") asc.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					else ascReverse.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					
					if (e.class == className && e.type == "=>"){ //Link to itself
						ascReverse.push({name: e.name, class: e.short_class_name, type: "<=", card: cardinality, clr: colorLetters});
					}
				});
			// }

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

      		asc = asc.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
			}); 
			
			//_.each(asc, function(e){
			//	e.class = "";
			//});

			return asc;
		}
}

