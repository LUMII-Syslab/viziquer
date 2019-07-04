Interpreter.customMethods({
	AddLinkTest: function () {
		Interpreter.destroyErrorMsg();		
		$("#add-link-test-form").modal("show");
	},
})

Template.AddLinkTest.classList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.linkList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.fullList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.checkList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.shortList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.shortClassList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.shortLinkList = new ReactiveVar([{value: "no value"}]);
Template.AddLinkTest.shortDirectList = new ReactiveVar([{value: "no value"}]);

Template.AddLinkTest.helpers({
	classList: function(){
		return Template.AddLinkTest.classList.get();
	},

	linkList: function(){
		return Template.AddLinkTest.linkList.get();
	},

	fullList: function(){
		return Template.AddLinkTest.asocList.get();
	},

	showList: function(){
		return Template.AddLinkTest.asocList.get();
	},

	checkList: function(){
		return Template.AddLinkTest.checkList.get();
	},

	shortList: function(){
		return Template.AddLinkTest.shortList.get();
	},

	shortClassList: function(){
		return Template.AddLinkTest.shortClassList.get();
	},

	shortLinkList: function(){
		return Template.AddLinkTest.shortLinkList.get();
	},

	shortDirectList: function(){
		return Template.AddLinkTest.shortDirectList.get();
	},

	associations: function() {
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
      				ascReverse.push({name: "++", class: " ", type: "=>", card: "[*]", clr: "color: purple"}); 
				else {
      				ascReverse.push({name: "++", class: " ", type: "=>", card: "", clr: ""});
      			}
      		}
      		asc = asc.concat(ascReverse);
      		var listClass = [];
      		var listLink = [];
      		asc.forEach(function(e){
      			listClass.push({class: e.class, value: e.class});
      			listLink.push({name: e.name, value: e.name});
      			var newElem = e;
      			newElem.full = e.name.concat(" ", e.type, " ", e.card, " ", e.class);
      			return newElem;
      		});
      		listClass = listClass.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['class'] === obj['class']});
				});
      		listLink = listLink.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['name'] === obj['name']});
				});
      		//var checkList = [];
      		//listClass.forEach(function(e){
      		//	checkList.push({value: e.class});
      		//});
      		//checkList.sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));
      		Template.AddLinkTest.classList.set(listClass);
			Template.AddLinkTest.linkList.set(listLink);
			//Template.AddLinkTest.checkList.set(checkList);
      		Template.AddLinkTest.fullList.set(asc);
      		Template.AddLinkTest.shortList.set(asc);
      		Template.AddLinkTest.shortClassList.set(listClass);
			Template.AddLinkTest.shortLinkList.set(listLink);
			Template.AddLinkTest.shortDirectList.set([{value: "=>"},{value: "<="}]);

			return asc;
		}
	},


});

Template.AddLinkTest.events({
	"click #ok-add-link": function() {
	//Version 1
		//var obj = $('input[name=stack-radio]:checked').closest(".association");
		var obj = $("#listV1").val();
		if (obj) {
			obj = obj.split(' ');
			var name = obj[0]; //obj.attr("name");
			var line_direct = obj[1];//obj.attr("line_direct");
			var class_name = obj[3];//obj.attr("className");
			if (!class_name) class_name = " ";
			console.log("Version 1: ", name, line_direct, class_name);
		} else {
			console.log("Version 1: not all set up");
		}
	
	//Version 2
		var obj2 = $("input[name=list-radio]:checked").val();
		if (obj2){
			obj2 = obj2.split(' ');		
			var name2 = obj2[0]; //obj.attr("name");
			var line_direct2 = obj2[1];//obj.attr("line_direct");
			var class_name2 = obj2[3];//obj.attr("className");
			if (!class_name2) class_name2 = " ";
			console.log("Version 2: ", name2, line_direct2, class_name2);
		} else {
			console.log("Version 2: not all set up");
		}

	//Version 3
		var linkName = $('option[name=link-list]:selected').val(); //{value: ""}
		var linkDirect = $('option[name=direction-list]:selected').val(); //{value: ""}
		var className = $('option[name=class-list]:selected').val();
		if (linkName == "empty" || className == "empty" || linkDirect == "empty") {
			console.log("Version 3: not all set up");
		} else {
			console.log("Version 3: ", linkName, linkDirect, className);
		}
	//Finish
		clearAddLinkInput();
		$("#add-link-test-form").modal("hide");
		return;
	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();
	},
//Version 2
	"change #class-link-check": function() {
		var limitType = $('input[name=class-link-radio]:checked').val();
		var list = [];
		if(limitType == "class") {
			var tempList = Template.AddLinkTest.classList.curValue; 
			tempList.forEach(function(e){
      			list.push({value: e.class});
      		});      		
		} else if (limitType == "link") {
			var tempList = Template.AddLinkTest.linkList.curValue;
			tempList.forEach(function(e){
      			list.push({value: e.name});
      		});      		
		} else {
			list.push({value: "no value"});
			var showValues = [];
			var tempList = Template.AddLinkTest.fullList.curValue;
			tempList.forEach(function(e){
      			showValues.push({full: e.full});
      		}); 
			showValues.sort((a,b) => (a.full > b.full) ? 1 : ((b.full > a.full) ? -1 : 0));
			Template.AddLinkTest.shortList.set(showValues);

		}
		list.sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));
		Template.AddLinkTest.checkList.set(list);
	},

	"change #check-list": function() {
		var limitName = $('option[name=check-name]:selected').val();
		var limitType = $('input[name=class-link-radio]:checked').val();
		var selected = [];
		if (limitName == "no value"){
			return;
		} else {
			var tempList = Template.AddLinkTest.fullList.curValue;
			if (limitType == "class") {
				tempList = tempList.filter(a => a.class == limitName);
			} else if (limitType == "link") {
				tempList = tempList.filter(a => a.name == limitName);
			}
			tempList.forEach(function(e){
				selected.push({full: e.full});
			})
		}
		Template.AddLinkTest.shortList.set(selected);
	},
//Version 3
	"change #link-list": function() {
		setV3();
	},

	"change #direction-list": function() {
		setV3(); //console.log("v3");
	},

	"change #class-list": function() {
		setV3(); //console.log("v3");
	},
	

	/*"change #type-choice": function() {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').attr('checked', false);
            $('#goto-wizard').attr('disabled',"disabled");
        } else {
            $('#goto-wizard').removeAttr("disabled");
        } 
	},

	"change #link-list-form": function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
        if (proj) {
            if(proj.showCardinalities=="true"){            
                $('#link-list-form').change(function(){
                    var checkedName = $('input[name=stack-radio]').filter(':checked').attr("card"); //console.log(checkedName);
                    if (checkedName.indexOf("[*]") == -1){//max cardinality not [*]
                        $('input[value=JOIN]').prop('checked', true);
                        $('input[value=NESTED]').prop('checked', false);
                        $('input[value=NESTED]').attr('disabled',"disabled");
                        $('#goto-wizard:checked').attr('checked', false);
                        $('#goto-wizard').attr('disabled',"disabled");
                    } else {
                        $('input[value=NESTED]').removeAttr('disabled');
                        $('input[value=NESTED]').prop('checked', true);
                        $('#goto-wizard').removeAttr('disabled');
                    }                
                });
            }
        }
	},*/

});

//++++++++++++
//Functions
//++++++++++++
function clearAddLinkInput(){
	$("#listV1").val(" ");
}

function setV3(){
	var linkName = $('option[name=link-list]:selected').val(); //{value: ""}
	var linkDirect = $('option[name=direction-list]:selected').val(); //{value: ""}
	var className = $('option[name=class-list]:selected').val(); //{value:""}
	var allList = Template.AddLinkTest.fullList.curValue; //{name: "++", class: " ", type: "=>", card: "", clr: "", full: concat}
	console.log(linkName, linkDirect, className);
	if (linkName == "empty" && className == "empty" && linkDirect == "empty") {
		Template.AddLinkTest.shortClassList.set(Template.AddLinkTest.classList.curValue);
		Template.AddLinkTest.shortLinkList.set(Template.AddLinkTest.linkList.curValue);
		Template.AddLinkTest.shortDirectList.set([{value: "=>"},{value: "<="}]);
	} else if (linkName == "empty" && className == "empty") { //given link direction
		var linkList = [];
		var classList = [];
		allList.forEach(function(e){
			if (e.type == linkDirect){
				linkList.push({value: e.name});
				classList.push({value: e.class});
			}
		});
		linkList = linkList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		classList = classList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortClassList.set(classList);
		Template.AddLinkTest.shortLinkList.set(linkList);
	} else if (linkName == "empty" && linkDirect == "empty"){ //given class
		var linkList = [];
		var directList = [];
		allList.forEach(function(e){
			if (e.class == className){
				linkList.push({value: e.name});
				directList.push({value: e.type});
			}
		});
		linkList = linkList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		directList = directList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortDirectList.set(directList);
		Template.AddLinkTest.shortLinkList.set(linkList);
	} else if (className == "empty" && linkDirect == "empty") { //given link name	
		var classList = [];
		var directList = [];
		allList.forEach(function(e){
			if (e.name == linkName){
				console.log(e);
				classList.push({value: e.class});
				directList.push({value: e.type});
			}
		}); console.log(classList);
		classList = classList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0)); console.log(classList);
		directList = directList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortDirectList.set(directList);
		Template.AddLinkTest.shortClassList.set(classList);		
	} else if (linkName == "empty") { //given direction and class
		var linkList = [];
		allList.forEach(function(e){
			if (e.class == className && e.type == linkDirect){
				linkList.push({value: e.name});
			}
		});
		linkList = linkList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortLinkList.set(linkList);		
	} else if (className == "empty") { //given direction and link name
		var classList = [];
		allList.forEach(function(e){
			if (e.name == linkName && e.type == linkDirect){
				classList.push({value: e.class});
			}
		});
		classList = classList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortClassList.set(classList);			
	} else if (linkDirect == "empty") { //given link name and class
		var directList = [];
		allList.forEach(function(e){
			if (e.name == linkName){
				directList.push({value: e.type});
			}
		});
		directList = directList.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['value'] === obj['value']});
			}).sort((a,b) => (a.value > b.value) ? 1 : ((b.value > a.value) ? -1 : 0));;
		Template.AddLinkTest.shortDirectList.set(directList);
	} else {
		console.log("v3 finished");
	}
}
