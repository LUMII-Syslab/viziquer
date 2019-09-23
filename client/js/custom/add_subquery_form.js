Interpreter.customMethods({
	AddSubquery: function () {
		Interpreter.destroyErrorMsg();
		Template.AddSubquery.fullList.set(getAllAssociations());
		Template.AddSubquery.shortList.set(Template.AddSubquery.fullList.curValue);		
		$("#add-subquery-form").modal("show");
	},
})

Template.AddSubquery.fullList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
Template.AddSubquery.shortList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);

Template.AddSubquery.helpers({

	fullList: function(){
		return Template.AddSubquery.fullList.get();
	},

	shortList: function(){
		return Template.AddSubquery.shortList.get();
	},

});

Template.AddSubquery.events({
	"click #ok-add-subquery": function() {

		//Read user's choise
		var obj = $('input[name=stack-radio]:checked').closest(".association");
		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");

		$("div[id=errorSQField]").remove();

        if (!name || name == "") {
        	var value = $("#mySQSearch").val();
        	if (!value){
	            console.log("Choose valid link");
	            $(".searchBox").append("<div id='errorSQField' style='color:red; margin-top: 0px;'>Please, choose link</div>");
	        } else {
	        	Template.AddSubquery.fullList.set(getAllAssociations());
	        	$(".searchBox").append("<div id='errorSQField' style='color:red; margin-top: 0px;'>Please, choose link. <br> Path deffinition will be added later</div>");
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
	                    lnk.setNestingType("SUBQUERY");
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
	                    lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName=="true") {
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, cl, currentElement);
	            }
                Template.AggregateWizard.endClassId.set(cl.obj._id);
            }, newPosition); console.log(document.getElementById("goto-SQ-wizard").checked);

			if (document.getElementById("goto-SQ-wizard").checked == true ){ 
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

			clearAddSubqueryInput();
			$("#add-subquery-form").modal("hide");
			return;
		}

	},

	"click #cancel-add-subquery": function() {
		clearAddSubqueryInput();
	},	

	"click #sqlink-list-form": function() {
		$("div[id=errorSQField]").remove();
	},

	"keyup #mySQSearch": function(){
		$("div[id=errorSQField]").remove();
		var value = $("#mySQSearch").val().toLowerCase();
		if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
			Template.AddSubquery.shortList.set(Template.AddSubquery.fullList.curValue);
		} else {
			var ascList = Template.AddSubquery.fullList.curValue;
			ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
				return e.name.toLowerCase().indexOf(value) > -1 || e.class.toLowerCase().indexOf(value) > -1;
			})
			Template.AddSubquery.shortList.set(ascList);
		}
	},

});

//++++++++++++
//Functions
//++++++++++++
function clearAddSubqueryInput(){
	$('input[name=stack-radio]:checked').attr('checked', false);
	var defaultRadio = document.getElementsByName("type-radio");
	_.each(defaultRadio, function(e){
		if (e.value == "JOIN") e.checked = true;
		else e.checked = false;
	});

	$('input[id=goto-SQ-wizard]').attr('checked', false);
	$("#mySQSearch")[0].value = "";
	$("div[id=errorSQField]").remove();
}

function getAllAssociations(){
	//start_elem
		var start_elem_id = Session.get("activeElement");
		var startElement = new VQ_Element(start_elem_id);
		if (!_.isEmpty(startElement) && startElement.isClass()){ //Because in case of deleted element ID is still "activeElement"
			//Associations
			var asc = [];
			var ascReverse = [];
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
						}
					}				
					
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