Interpreter.customMethods({
//From selection
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

				if (startClass.isUnion() && !startClass.isRoot()) { // [ + ] element, that has link to upper class 
					if (startClass.getLinkToRoot()){
						var element = startClass.getLinkToRoot().link.getElements();
						var newStartClass = "";
						if (startClass.getLinkToRoot().start) {
							var newStartClass = new VQ_Element(element.start.obj._id);
		    			} else {
		    				var newStartClass = new VQ_Element(element.end.obj._id);
		    			}
		    			if (newStartClass.obj["_id"] != endClass.obj["_id"]) {
			    			usedClasses[0].name = newStartClass.getName();
			    		} else {
			    			console.log("[ + ] connection to root");
			    			Interpreter.showErrorMsg("It is not allowed to connect [ + ] with its root this way.", -3);
			    			return;
			    		}					
					}					
				}

				if (endClass.isUnion() && !endClass.isRoot()) { // [ + ] element, that has link to upper class 
					if (endClass.getLinkToRoot()){
						var element = endClass.getLinkToRoot().link.getElements();
						var newStartClass = "";
						if (endClass.getLinkToRoot().start) {
							var newStartClass = new VQ_Element(element.start.obj._id);
		    			} else {
		    				var newStartClass = new VQ_Element(element.end.obj._id);
		    			}
		    			if (newStartClass.obj["_id"] != startClass.obj["_id"]) {
		    				usedClasses[1].name = newStartClass.getName();
		    			} else {
			    			console.log("[ + ] connection to root");
			    			Interpreter.showErrorMsg("It is not allowed to connect [ + ] with its root this way.", -3);
			    			return;
			    		}
					}					
				}

				
				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue);
				list.sort(function (x, y) {
				    var n = x.array.length - y.array.length;
				    if (n !== 0) {
				        return n;
				    }
				    return x.countInverseLinks - y.countInverseLinks;
				});
				Template.ConnectClasses.IDS.set(ids);
				Template.ConnectClasses.elements.set(usedClasses);
				Template.ConnectClasses.linkList.set(list);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: false});
				Template.ConnectClasses.linkID.set({data: "no link"});
				Template.ConnectClasses.gotoSubquery.set({isChecked: false, gotoWizard: ""});

				Template.ConnectClassesSettings.fromToClass.set({fromName: usedClasses[0].name, fromID: usedClasses[0].id, toName: usedClasses[1].name, toID: usedClasses[1].id});


				$("#not-show-as-property-path")[0].checked = true;
				$("#connect-classes-goto-aggregate-wizard")[0].checked = false;
				$("#connect-classes-form").modal("show");			
			}
		}		
		
	},

//From Link
	linkConnectClasses: function () {
		Interpreter.destroyErrorMsg();		
		var link = new VQ_Element(Session.get("activeElement"));
		if (link && link.isLink()) {
			var startClass = link.getStartElement();
			var endClass = link.getEndElement();
			if (startClass && endClass) {
				var ids = [{text: startClass.obj["_id"]}, {text: endClass.obj["_id"]}];
				var usedClasses = [{name: startClass.getName(), id: startClass.obj["_id"]}, {name: endClass.getName(), id: endClass.obj["_id"]}];
				if (startClass.isUnion() && !startClass.isRoot()) { // [ + ] element, that has link to upper class 
					if (startClass.getLinkToRoot()){
						var element = startClass.getLinkToRoot().link.getElements();
						var newStartClass = "";
						if (startClass.getLinkToRoot().start) {
							var newStartClass = new VQ_Element(element.start.obj._id);
		    			} else {
		    				var newStartClass = new VQ_Element(element.end.obj._id);
		    			}
		    			if (newStartClass.obj["_id"] != startClass.obj["_id"]) {
		    				usedClasses[0].name = newStartClass.getName();
		    			} else {
			    			console.log("[ + ] connection to root");
			    			Interpreter.showErrorMsg("It is not allowed to connect [ + ] with its root this way.", -3);
			    			return;
			    		}					
					}					
				}

				if (endClass.isUnion() && !endClass.isRoot()) { // [ + ] element, that has link to upper class 
					if (endClass.getLinkToRoot()){
						var element = endClass.getLinkToRoot().link.getElements();
						var newStartClass = "";
						if (endClass.getLinkToRoot().start) {
							var newStartClass = new VQ_Element(element.start.obj._id);
		    			} else {
		    				var newStartClass = new VQ_Element(element.end.obj._id);
		    			}
		    			if (newStartClass.obj["_id"] != startClass.obj["_id"]) {
		    				usedClasses[1].name = newStartClass.getName();
		    			} else {
			    			console.log("[ + ] connection to root");
			    			Interpreter.showErrorMsg("It is not allowed to connect [ + ] with its root this way.", -3);
			    			return;
			    		}					
					}					
				}

				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue);
				list.sort(function (x, y) {
				    var n = x.array.length - y.array.length;
				    if (n !== 0) {
				        return n;
				    }
				    return x.countInverseLinks - y.countInverseLinks;
				});
				Template.ConnectClasses.IDS.set(ids);
				Template.ConnectClasses.elements.set(usedClasses);
				Template.ConnectClasses.linkList.set(list);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: true});
				Template.ConnectClasses.linkID.set({data: link.obj["_id"]});
				Template.ConnectClasses.gotoSubquery.set({isChecked: false, gotoWizard: ""});

				Template.ConnectClassesSettings.fromToClass.set({fromName: usedClasses[0].name, fromID: usedClasses[0].id, toName: usedClasses[1].name, toID: usedClasses[1].id});

				$("#not-show-as-property-path")[0].checked = false;
				// $("#connect-classes-goto-aggregate-wizard")[0].checked = false;			
				$("#connect-classes-form").modal("show");
				console.log("link with classes");
			}
		}
	},

	test_linkConnectClasses: function () {
		Interpreter.destroyErrorMsg();
		var link = new VQ_Element(Session.get("activeElement"));
		if (link && link.isLink()) {
			var startClass = link.getStartElement();
			var endClass = link.getEndElement();
			if (startClass && endClass) {
				var ids = [{text: startClass.obj["_id"]}, {text: endClass.obj["_id"]}];
				var usedClasses = [{name: startClass.getName(), id: startClass.obj["_id"]}, {name: endClass.getName(), id: endClass.obj["_id"]}];
				var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue);
				list.sort(function (x, y) {
				    var n = x.array.length - y.array.length;
				    if (n !== 0) {
				        return n;
				    }
				    return x.countInverseLinks - y.countInverseLinks;
				});
				Template.ConnectClasses.IDS.set(ids);				
				Template.ConnectClasses.elements.set(usedClasses);							
				Template.ConnectClasses.linkList.set(list);
				Template.ConnectClasses.addLongLink.set({data: false});
				Template.ConnectClasses.linkMenu.set({data: true});
				Template.ConnectClasses.linkID.set({data: link.obj["_id"]});
				Template.ConnectClasses.gotoSubquery.set({isChecked: false, gotoWizard: ""});

				Template.ConnectClassesSettings.fromToClass.set({fromName: startClass.getName(), fromID: startClass.obj["_id"], toName: endClass.getName(), toID: endClass.obj["_id"]});

				$("#not-show-as-property-path")[0].checked = false;
				// $("#connect-classes-goto-aggregate-wizard")[0].checked = false;			
				$("#connect-classes-form").modal("show");
				console.log("TEST");
			}
		}
	},		
})

Template.ConnectClasses.IDS= new ReactiveVar([{name: "no class", id:"0"}]);
Template.ConnectClasses.linkList = new ReactiveVar([{array: [{class: "No connection of given length is found"}], show: true, countInverseLinks: 0, number: -1}]);
Template.ConnectClasses.elements = new ReactiveVar([{name: "No class", id: 0}]);
Template.ConnectClasses.addLongLink = new ReactiveVar({data: false});
Template.ConnectClasses.linkMenu = new ReactiveVar({data: false});
Template.ConnectClasses.linkID = new ReactiveVar({data: "no link"});
Template.ConnectClasses.gotoSubquery = new ReactiveVar({isChecked: false, gotoWizard: ""});

Template.ConnectClasses.helpers({

	IDS: function(){
		return Template.ConnectClasses.IDS.get();
	},

	linkList: function(){
		return Template.ConnectClasses.linkList.get();
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

	gotoSubquery: function(){
		return Template.ConnectClasses.gotoSubquery.get();
	},

});

Template.ConnectClasses.events({
	"keyup #searchList": function(){
		$('#chain_text')[0].style.color = "";
		var value = $("#searchList").val().toLowerCase(); 
		value = value.trim(); 
		console.log("mySearch: ", value);
		var data = Template.ConnectClasses.linkList.curValue;
		var inverseCount = Template.ConnectClassesSettings.inverseValue.curValue.data; //"none", "one", "more"
		if (value == "") {//empty string
			_.each(data, function(e){
				if (inverseCount == "more" || (inverseCount == "one" && e.countInverseLinks < 2) || (inverseCount == "none" && e.countInverseLinks < 1)) {
					e.show = true;
				}
			})			
		} else if (value.indexOf('.') > -1){
			value = value.split('.');
			if (value.length > 2) {
				console.log("too many points");
				$(".searchBox").append("<div id='errorFieldCC' style='color:red; margin-top: 5px;'>Please, use only 1 period to separate link and class</div>");
				return;
			}

		} else{
			_.each(data, function(e){
			//if number of inverse link is ok - check for value				
				if (inverseCount == "more" || (inverseCount == "one" && e.countInverseLinks < 2) || (inverseCount == "none" && e.countInverseLinks < 1)) {
					var found = false;

					_.each(e.array, function(a){ console.log(e.array.indexOf(a), e.array.length - 1);
						// the first class is not checked
						if (e.array.indexOf(a) > 0 && e.array.indexOf(a) != e.array.length - 1){ 						
						// given classes are not searched for value 
						// except last element - check both class and link
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
						data[data.indexOf(e)].show = true;
					} else {
						data[data.indexOf(e)].show = false;
					}
				} else {
					data[data.indexOf(e)].show = false;
				}
			})
		}
		data.sort(function (x, y) {
		    var n = x.array.length - y.array.length;
		    if (n !== 0) {
		        return n;
		    }
		    return x.countInverseLinks - y.countInverseLinks;
		});

		Template.ConnectClasses.linkList.set(data);
	},


	"click #ok-connect": function(){
		var firstId = "";
		var lastElement = "";
		//test selected chain
		var number = $('input[name=stack-radio]:checked').val();
		var noPropertyPath = $("#not-show-as-property-path").is(':checked'); //console.log(noPropertyPath);
		var checkedAggregateWizard = $("#connect-classes-goto-aggregate-wizard").is(':checked');
		if (number < 0 || !number) {
			$('#chain_text')[0].style.color = "red";
			$("#connect-classes-form").modal("show");
			return;
		}
		
		var chain = Template.ConnectClasses.linkList.curValue.filter(a => a.number == number)[0]["array"];
		chain = _.rest(chain);
		if (!Template.ConnectClasses.addLongLink.get().data){			
			firstId = Template.ConnectClasses.elements.curValue[0].id;
			lastElement = Template.ConnectClasses.elements.curValue.filter(e => e.id != firstId)[0];
		} else {
			firstId = Session.get("activeElement");
			lastElement = {name: chain[chain.length-1].class, id: "no_class_exists"};
		} 
		var currentVQElment = new VQ_Element(firstId);		

	//Property path - 1 link notation
		if (!noPropertyPath) {
			var nesting = "";
			if (Template.ConnectClasses.gotoSubquery.get().isChecked){
				nesting = "SUBQUERY";
			} else {
				nesting = "PLAIN";
			}
			//console.log("TODO property path");
			var class_name = lastElement.name;
			var name = ""; //link name
			_.each(chain, function(e){ //{link: ee["name"], class: ee["class"], type: " <= ", direction: ee["type"]}
				if (e.type.indexOf("<=") > -1) {
					name = name.concat("^",e.link, ".");
				} else {
					name = name.concat(e.link, ".");
				}
			});
			name = name.slice(0,-1);
			//console.log(class_name, name);

			if (Template.ConnectClasses.addLongLink.get().data){			
				var d = 30; //distance between boxes
	            var oldPosition = currentVQElment.getCoordinates(); //Old class coordinates and size
	            var newPosition = currentVQElment.getNewLocation(d); //New class coordinates and size
	            if (currentVQElment.getName() == "[ + ]") {
			    	newPosition.width = 12*class_name.length;
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
                	locLink = [coordX, coordY, coordX, newPosition.y];                 
	                Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");	                    
	                    lnk.setNestingType(nesting);						
						if (proj && proj.autoHideDefaultPropertyName=="true") { 
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, currentVQElment, cl);
	                Template.AggregateWizard.endClassId.set(cl.obj._id);
	            }, newPosition);
			} else if (Template.ConnectClasses.linkMenu.get().data) {
				var lnk = new VQ_Element(Template.ConnectClasses.linkID.get().data);				
				lnk.setName(name);
				lnk.setNestingType(nesting);			
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
                    lnk.setNestingType(nesting);						
					if (proj && proj.autoHideDefaultPropertyName=="true") { 
						lnk.hideDefaultLinkName(true);
						lnk.setHideDefaultLinkName("true");
					}					
                }, locLink, true, currentVQElment, nextVQElement);
			}
			//Aggregate wizard settings			
			if (checkedAggregateWizard) { 
				//console.log(342, lastElement);
				//
				Template.AggregateWizard.startClassId.set(firstId);
				if (Template.AggregateWizard.endClassId.get().indexOf("No end") > -1) {
					Template.AggregateWizard.endClassId.set(lastElement.id);
				}
				//Fields
				var attr_list = [{attribute: ""}];
				var schema = new VQ_Schema();

				if (schema.classExist(class_name)) {
					var klass = schema.findClassByName(lastElement.name);

					_.each(klass.getAllAttributes(), function(att){
						attr_list.push({attribute: att["name"]});
					})
					attr_list = _.sortBy(attr_list, "attribute");
				}
				attr_list = attr_list.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['attribute'] === obj['attribute']});
				});
				console.log(attr_list);
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
		} else { 
	//draw all classes and links
			AddNextLink(currentVQElment, chain, lastElement, Template.ConnectClasses.gotoSubquery.get().isChecked, currentVQElment, Template.ConnectClasses.addLongLink.get().data);		
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
		if (Template.ConnectClasses.addLongLink.get().data) {
			Template.ConnectClassesSettings.addLongLinkS.set({data: true});
		}
		$("#connect-classes-form").modal("hide");
		$("#connect-classes-settings").modal("show");
		$("#searchList")[0].value = "";
	},

	"click #choose-second-class-button": function(){
		$('#chain_text')[0].style.color = "";
		var nextClassName = $('#classList2').val();
		var ids = [{text: Template.ConnectClasses.IDS.curValue["id"]}, {text: "no_class_exists", name: nextClassName}];
		var list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue);

		var inverseCount = Template.ConnectClassesSettings.inverseValue.curValue.data;
		_.each(list, function(a){					
			if (inverseCount == "more" || (inverseCount == "none" && a.countInverseLinks < 1) || (inverseCount == "one" && a.countInverseLinks < 2)) {
				a.show = true;
			} else {
				a.show = false;
			}			
		});

		Template.ConnectClassesSettings.fromToClass.set({fromName: Template.ConnectClasses.IDS.curValue["name"], fromID: Template.ConnectClasses.IDS.curValue["id"], toName: nextClassName, toID:"no_class_exists"});
		list.sort(function (x, y) {
		    var n = x.array.length - y.array.length;
		    if (n !== 0) {
		        return n;
		    }
		    return x.countInverseLinks - y.countInverseLinks;
		});
		Template.ConnectClasses.linkList.set(list);		
	},

	"click #not-show-as-property-path": function(){
		var settings = Template.ConnectClasses.gotoSubquery.get();		
		if (settings.isChecked) {
			var checked = $("#not-show-as-property-path").is(':checked'); //console.log(checked);			
			if (checked) {
				$("#connect-classes-goto-aggregate-wizard")[0].checked = false;
				Template.ConnectClasses.gotoSubquery.set({isChecked: settings.isChecked, gotoWizard: "disabled"});			
			} else {
				Template.ConnectClasses.gotoSubquery.set({isChecked: settings.isChecked, gotoWizard: "enabled"});
			}
		}			
	},

	"click #chain-list": function() {
		$('#chain_text')[0].style.color = "";
	},
});

//===========================
//S E T T I N G S
//===========================
Template.ConnectClassesSettings.fromToClass = new ReactiveVar({fromName: "", fromID: "", toName: "", toID:""});
Template.ConnectClassesSettings.directionValue = new ReactiveVar({data: 0}); //start elem ID
Template.ConnectClassesSettings.inverseValue = new ReactiveVar({data: "more"}); //"none", "one", "more"
Template.ConnectClassesSettings.pathLength = new ReactiveVar(3);
Template.ConnectClassesSettings.addLongLinkS = new ReactiveVar({data: false});

Template.ConnectClassesSettings.helpers({

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
		//Path's length		
		if (document.getElementById("default-max-length").checked) {
			Template.ConnectClassesSettings.pathLength.set(3);
			$('#max_length').val("3");
		} else {
			var maxLength = $('#max_length').val();
			if (!document.getElementById("great-max-length").checked && maxLength > 5) {
				Template.ConnectClassesSettings.pathLength.set(5);
			} else {				
				Template.ConnectClassesSettings.pathLength.set(maxLength);
			}
		}

		var list = [];
		if (!Template.ConnectClassesSettings.addLongLinkS.get().data) {
			//Direction
			var startElemID = $('input[name=path-radio]:checked').val();
			var elementList = Template.ConnectClassesSettings.fromToClass.curValue; console.log("inside direction", elementList, startElemID);
			
			if (elementList.fromID == startElemID){
				console.log("original order");
				Template.ConnectClasses.elements.set([{name: elementList.fromName, id: elementList.fromID}, {name: elementList.toName, id: elementList.toID}]);
				list = GetChains([{text: elementList.fromID}, {text: elementList.toID}], Template.ConnectClassesSettings.pathLength.curValue);
			} else if (elementList.toID == startElemID) {
				console.log("oposite order");
				Template.ConnectClasses.elements.set([{name: elementList.toName, id: elementList.toID}, {name: elementList.fromName, id: elementList.fromID}]);
				list = GetChains([{text: elementList.toID}, {text: elementList.fromID}], Template.ConnectClassesSettings.pathLength.curValue);		
			} else {
				console.log("unknown order");
				return;
			} console.log(list);
			list.sort(function (x, y) {
			    var n = x.array.length - y.array.length;
			    if (n !== 0) {
			        return n;
			    }
			    return x.countInverseLinks - y.countInverseLinks;
			});
			
			Template.ConnectClassesSettings.directionValue.set({data: startElemID});
		} else {
			if ($('#classList2').val()) {
				var ids = [{text: Template.ConnectClasses.IDS.curValue["id"]}, {text: "no_class_exists", name: $('#classList2').val()}];
				list = GetChains(ids, Template.ConnectClassesSettings.pathLength.curValue);
			} else {
				list = [{array: [{class: "No connection of given length is found"}], show: true, countInverseLinks: 0, number: -1}]
			}
		}
		Template.ConnectClasses.linkList.set(list);
		console.log("Settings - inverse");
		//Inverse
		var inverseCount = $('input[name=inverse-links]:checked').val();
		Template.ConnectClassesSettings.inverseValue.set({data: inverseCount});
		var data = Template.ConnectClasses.linkList.curValue;
		_.each(data, function(a){						
			if (inverseCount == "more" || (inverseCount == "none" && a.countInverseLinks < 1) || (inverseCount == "one" && a.countInverseLinks < 2)) {
				a.show = true;
			} else {
				a.show = false;
			}			
		});
		data.sort(function (x, y) {
		    var n = x.array.length - y.array.length;
		    if (n !== 0) {
		        return n;
		    }
		    return x.countInverseLinks - y.countInverseLinks;
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
            $('#great-max-length').attr('checked', false);
            $('#great-max-length').attr('disabled',"disabled");
        } else {
            $('#max_length').removeAttr("disabled");
            $('#great-max-length').removeAttr("disabled");
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
	$("#not-show-as-property-path")[0].checked = false;
	if (Template.ConnectClasses.gotoSubquery.get().isChecked) $("#connect-classes-goto-aggregate-wizard")[0].checked = false;
	$("#searchList")[0].value = "";
	$('#chain_text')[0].style.color = "";
	Template.ConnectClasses.IDS.set([{name: "no class", id:"0"}]);
	Template.ConnectClasses.linkList.set([{array: [{class: "No connection of given length is found"}], number: -1}]);
	Template.ConnectClasses.elements.set([{name: "No class", id: 0}]);
	Template.ConnectClasses.addLongLink.set({data: false});
	Template.ConnectClasses.gotoSubquery.set({isChecked: false, gotoWizard: ""});

	Template.ConnectClassesSettings.fromToClass.set({fromName: "", fromID: "", toName: "", toID:""});
	Template.ConnectClassesSettings.directionValue.set({data: 0});
	Template.ConnectClassesSettings.inverseValue.set({data: "more"}); //"none", "one", "more"
	Template.ConnectClassesSettings.pathLength.set(3);
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
			if (elem.isUnion() && !elem.isRoot()) { console.log(239);// [ + ] element, that has link to upper class 
				if (elem.getLinkToRoot()){
					var element = elem.getLinkToRoot().link.getElements();
					var newStartClass = "";
					if (elem.getLinkToRoot().start) {
						var newStartClass = new VQ_Element(element.start.obj._id);
	    			} else {
	    				var newStartClass = new VQ_Element(element.end.obj._id);
	    			} console.log(newStartClass.getName());
	    			elemInfo.push({id: id["text"], class: newStartClass.getName()});	    									
				}					
			} else {
				elemInfo.push({id: id["text"], class: elem.getName()});

			}
			//elemInfo.push({id: id["text"], class: elem.getName()});
		}
	}); //console.log(GetLinks(elemInfo[0]["id"]));
//Direct links
	_.each(GetLinks(elemInfo[0]["id"]), function(e) {		
		if(e["class"] == elemInfo[1]["class"]){
			linkRezult.push([e]); //console.log(e);
		} else if (e["class"] == elemInfo[0]["class"]) {
			//console.log("same class");
		} else {
			link_chain.push([e]); 
		}
	}); //console.log(GetLinks(elemInfo[1]["id"]));
//Inverse direct links
	_.each(GetLinks(elemInfo[1]["id"]) , function(e) {		
		if(e["class"] == elemInfo[0]["class"]){
			var tp = "";
			if (e.type == "<=") {tp = "=>";} else { tp = "<=";}
			var newElem = {
					name: e.name, 
					isUnique: e.isUnique, 
					prefix: e.prefix, 
					isDefOnt: e.isDefOnt, 
					class: elemInfo[1]["class"], 
					type: tp, 
					maxCard: e.maxCard, 
					short_name: e.short_name, 
					short_class_name: elemInfo[1]["class"]
				};
			var exists = false;
			_.each(linkRezult, function(el){//console.log(764, _.isEqual(el[0],newElem), el[0], newElem);
				if (!exists && el[0].name == newElem.name && el[0].class == newElem.class && el[0].type == newElem.type ) {
					exists = true;
				}
			});
			if (!exists){
				// console.log("new ", newElem);
				linkRezult.push([newElem]);
			}
		}
	}); 

	var actChain = link_chain;
	var asocNew = [];	
	for (var i = 1; i < maxLength; i++){
		if(actChain){ 
			link_chain = actChain; //console.log(799, actChain);
			actChain = [];
			asocNew = [];

			_.each(link_chain, function(e){ 
				asocNew = [];
				var className = e[i-1]["class"];
				var allAsoc = schema.findClassByName(className).getAllAssociations(); //console.log(766, className);
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
				
				_.each(allAsoc, function(a){ //console.log(a.maxCard);
					var index = -1;
					var isNew = true;
					_.each(asocNew, function(as){
						//if association connects same classes AND the same link name (!= (as.type != a.type) => XOR different directions)
						if (as.class == a.class && as.name == a.name) { 
							isNew = false;							
						}
					});

					// if (i > 1 && isNew && e[i-1]["name"] == a.name && e[i-1]["type"] != a.type && a.maxCard == 1) {
					// 	if (e[i-2]["class"] == a.class ) {
					// 		console.log("maxCard == 1 vor inverse link from", e[i-2]["class"], "\n", e[i-1], "\n", a);
					// 		isNew = false;
					// 	}
					// }  
					
					if (isNew) {
						asocNew.push(a);
					} 					
				});

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
		// var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: Elements.findOne({_id: start_elem_id})["elementTypeId"]});
		// if (!compart_type) {
		// 	return [{name: "", class: "", type: "=>"}];
		// }

		// var act_comp = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: start_elem_id});
		// if (!act_comp) {
		// 	return [{name: "", class: "", type: "=>"}];
		// }

		var elem = new VQ_Element(start_elem_id);
		var className = "";
		if (elem.isUnion() && !elem.isRoot()) { // [ + ] element, that has link to upper class 
			if (elem.getLinkToRoot()){
				var element = elem.getLinkToRoot().link.getElements();
				if (elem.getLinkToRoot().start) {
					var newStartClass = new VQ_Element(element.start.obj._id);						
    				className = newStartClass.getName();
    			} else {
    				var newStartClass = new VQ_Element(element.end.obj._id);						
    				className = newStartClass.getName();
    			}						
			}					
		} else {
			className = elem.getName();
		}

		// var className = act_comp["input"];
		var schema = new VQ_Schema();
		if (className == null || !schema.classExist(className)) {
			return [{name: "", class: "", type: "=>"}];
		}

		asc = schema.findClassByName(className).getAllAssociations(); //console.log("712 ", className, asc);

		asc = asc.filter(function(obj, index, self) { 
			return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
		});	//console.log("716 ", className, asc);

		return asc;			
	}
}

function AddNextLink(currentElement, chain, lastElement, needSubquery, subqueryFromElement, longLink){
	if (chain.length == 0)  {
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

	var nesting = "";
	if (needSubquery && currentElement.getName() == subqueryFromElement.getName()){
		nesting = "SUBQUERY";
		needSubquery = false;
	} else {
		nesting = "PLAIN";
	}
	
    var oldPosition = currentElement.getCoordinates(); //Old class coordinates and size
    var locLink = [];	
	if (chain[0].class == lastElement.name && !longLink) {
		var lastVQElement = new VQ_Element(lastElement.id);
		var proj = Projects.findOne({_id: Session.get("activeProject")});			
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
                lnk.setNestingType(nesting);
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
                lnk.setNestingType(nesting);
				if (proj && proj.autoHideDefaultPropertyName=="true") {
					lnk.hideDefaultLinkName(true);
					lnk.setHideDefaultLinkName("true");
				}
            }, locLink, true, lastVQElement, currentElement);
        }
	} else { 
		var d = 30; //distance between boxes
	    var newPosition = currentElement.getNewLocation(d); //New class coordinates and size	    
	    if (currentElement.getName() == "[ + ]") {
	    	//newPosition.width = 75;
	    	newPosition.width = 12*chain[0].class.length;;
	    }
	    //Link Coordinates
	    var coordX = oldPosition.x + Math.round(Math.min(oldPosition.width, newPosition.width)/2);
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
	                lnk.setNestingType(nesting);
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
	                lnk.setNestingType(nesting);
					if (proj && proj.autoHideDefaultPropertyName=="true") {
						lnk.hideDefaultLinkName(true);
						lnk.setHideDefaultLinkName("true");
					}
	            }, locLink, true, cl, currentElement);
	        }
	        var newChain = _.rest(chain); //console.log(cl, lastElement);
	        AddNextLink(cl, newChain, lastElement, needSubquery, subqueryFromElement, longLink);
	    }, newPosition);
	}
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
	}

	if (!bX) {
		if ((startElem.y + startElem.height) < endElem.y){ console.log(486);
			y1 = y1 + Math.round(startElem.height/2);
		} else if (startElem.y > (endElem.y + endElem.height)) { console.log(488);
			y1 = y1 - Math.round(startElem.height/2);
		}				
	}

	if (!bY) {
		if ((startElem.x + startElem.width) < endElem.x){
			x2 = x2 - Math.round(endElem.width/2);		
		} else if (startElem.x > (endElem.x + endElem.width)) {
			x2 = x2 + Math.round(endElem.width/2);
		}
	}
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
	_.each(list, function(a){
		var aDirection = a.direction;
		if (aDirection && aDirection == "<=") {
			count++;
		}
	})						
	return count;
}