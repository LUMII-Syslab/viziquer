import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects } from '/imports/db/platform/collections'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'

import './add_link_form.html'
import { Create_VQ_Element, VQ_Element } from '../js/VQ_Element';
import { autoCompletionCleanup } from '../js/autoCompletion';

const delay = ms => new Promise(res => setTimeout(res, ms));
const delayTime = 500;
var linkKeyDownTimeStamp;


Interpreter.customMethods({
	AddLink: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		
		
		var start_elem_id = Session.get("activeElement");			
		var currentElement = new VQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about its links";
		
		if(currentElement !== null && currentElement.getName() != null && currentElement.getName() != "") 
		{
			joinLinkDesc = "join information from "+currentElement.getName()+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about its links";
		}
		
		Template.AddLink.JoinLinkText.set(joinLinkDesc);	
		Template.AddLink.SubqueryLinkText.set(subqueryLinkDesc);
		
		Template.AddLink.fullList.set([{name: "", text: "Waiting answer...", wait: true}]);
			
		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);
		$('input[id=goto-wizard]').prop("checked",false);
		$('input[id=linked-instance-exists]').prop("checked",false);
		$('input[id=goto-wizard]').prop("disabled","disabled");	
		$('input[id=linked-instance-exists]').prop("disabled","disabled");	
		$("#mySearch")[0].value = "";		
		$("#add-link-form").modal("show");
		
		
		Template.AddLink.Count.set(startCount);
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
		})
		Template.AddLink.fullList.set(asc);
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});
		
		// cc.pop();
			// cc.push({ch_count: 0, children: [], data_id: "wait", localName: "Waiting answer..."});
			// Template.schemaTree.Classes.set(cc);
	},

	AddSubquery: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		Template.AddLink.Count.set(startCount);
		
		Template.AddLink.fullList.set([{name: "", text: "Waiting answer...", wait: true}]);
		
		
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});
		
		var start_elem_id = Session.get("activeElement");			
		var currentElement = new VQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
		
		if(currentElement !== null && currentElement.getName() != null && currentElement.getName() != "") 
		{
			joinLinkDesc = "join information from "+currentElement.getName()+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about links";
		}
		
		Template.AddLink.JoinLinkText.set(joinLinkDesc);	
		Template.AddLink.SubqueryLinkText.set(subqueryLinkDesc);

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('input[id=goto-wizard]').attr('checked', true);
		$('input[id=linked-instance-exists]').attr('checked', false);
		$('#goto-wizard').removeAttr("disabled");
		$('#linked-instance-exists').removeAttr("disabled");
		$("#mySearch")[0].value = "";
		$("#add-link-form").modal("show");
		
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
		})
		Template.AddLink.fullList.set(asc);
	},
	
	AddFilterExists: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];
		Template.AddLink.Count.set(startCount);
		
		Template.AddLink.fullList.set([{name: "", text: "Waiting answer...", wait: true}]);
		
		
		// Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		Template.AddLink.testAddLink.set({data: false});
		
		var start_elem_id = Session.get("activeElement");			
		var currentElement = new VQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
		
		if(currentElement !== null && currentElement.getName() != null && currentElement.getName() != "") 
		{
			joinLinkDesc = "join information from "+currentElement.getName()+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about links";
		}
		
		Template.AddLink.JoinLinkText.set(joinLinkDesc);	
		Template.AddLink.SubqueryLinkText.set(subqueryLinkDesc);

		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('input[id=goto-wizard]').attr('checked', false);
		$('input[id=linked-instance-exists]').attr('checked', true);
		$('#goto-wizard').removeAttr("disabled");
		$('#linked-instance-exists').removeAttr("disabled");
		$("#mySearch")[0].value = "";
		$("#add-link-form").modal("show");
		
		
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
		})
		Template.AddLink.fullList.set(asc);
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
            // cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
            cl.setClassStyle("condition");	                
        	locLink = [coordX, coordY, coordX, newPosition.y];                 
            Create_VQ_Element(function(lnk) {
                lnk.setName("++");
                lnk.setLinkType("REQUIRED");	                    
                lnk.setNestingType("PLAIN");						
				if (proj && proj.autoHideDefaultPropertyName==true) { 
					lnk.hideDefaultLinkName(true);
					lnk.setHideDefaultLinkName("true");
				}
            }, locLink, true, currentVQElment, cl);
            Template.AggregateWizard.endClassId.set(cl.obj._id);
        }, newPosition);
	},

})
Template.AddLink.JoinLinkText = new ReactiveVar("")
Template.AddLink.SubqueryLinkText = new ReactiveVar("")
Template.AddLink.Count = new ReactiveVar("")
const startCount = 30;
const plusCount = 20
Template.AddLink.fullList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: "", show: true}]);
// Template.AddLink.shortList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
Template.AddLink.testAddLink = new ReactiveVar({data: false});

Template.AddLink.helpers({

	fullList: function(){
		return Template.AddLink.fullList.get();
	},
	joinLinkText: function(){
		return Template.AddLink.JoinLinkText.get();
	},
	subqueryLinkText: function(){
		return Template.AddLink.SubqueryLinkText.get();
	},

	// shortList: function(){
	// 	return Template.AddLink.shortList.get();
	// },

	testAddLink: function(){
		return Template.AddLink.testAddLink.get();
	},
});

Template.SelectTargetClass.classes = new ReactiveVar("")

Template.SelectTargetClass.helpers({

	classes: function(){
		return Template.SelectTargetClass.classes.get();
	},

}); 

Template.SelectTargetClass.events({
	
	"keyup #class-search": async function(){
		var f = $("#class-search").val().toLowerCase();
		$('[name=class-list-radio]').removeAttr('checked');
		
		var obj = $('input[name=link-list-radio]:checked').closest(".association");
		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		
		var schemaName = dataShapes.schema.schemaType;
		if(typeof schemaName === "undefined") schemaName = "";
		
		var params = {};
		var start_elem_id = Session.get("activeElement");
		var startElement = new VQ_Element(start_elem_id);
		var startElementName = startElement.getName();
		var startElementAlias = startElement.getInstanceAlias();

		if(schemaName.toLowerCase() == "wikidata"  && typeof startElementName != "undefined" && startElementName !== null && startElementName != "" && ((startElementName.startsWith("[") && startElementName.endsWith("]")) || startElementName.indexOf(":") == -1)) startElementName = "wd:"+startElementName;
		if(schemaName.toLowerCase() == "wikidata"  && ((name.startsWith("[") && name.endsWith("]")) || name.indexOf(":") == -1)) name = "wdt:"+name;
			if(line_direct == "=>") {
				var elementParams = [{"name": name, "type": "in",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					var cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30,  "filter": f},
					"element": {"pList": {"in": elementParams}}
				}
			} else {
				var elementParams = [{"name": name, "type": "out",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					var cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30,  "filter": f},
					"element": {"pList": {"out": elementParams}}
				}
			}
		var classes = await dataShapes.getClassesFull(params);
		classes = classes.data;
		
		var schemaName = dataShapes.schema.schemaType;
		if(typeof schemaName === "undefined") schemaName = "";
		
		_.each(classes, function(e){
			var prefix;
			if(e.is_local == true || e.prefix == "" || (schemaName.toLowerCase() == "wikidata" && e.prefix == "wd"))prefix = "";
			else prefix = e.prefix+":";
			e.short_class_name = prefix + e.display_name;
			if(e.principal_class == 2) e.clr = "color: purple";
			else if(e.principal_class == 0) e.clr = "color: #C5C5C5";
			else e.clr = "color: #777777";
			//style="{{clr}}"
			
		})
		Template.SelectTargetClass.classes.set(classes);
	},
	
	"click #ok-select-class": function() {
		var clazz = $('input[name=class-list-radio]:checked').val();
		if(typeof clazz !== "undefined"){
			
			var obj = $('input[name=link-list-radio]:checked').closest(".association");
			if(clazz == "(no_class)"){
				obj.attr("className", "");
				obj.find('#targetClass')[0].innerHTML= "";
			}else {
				obj.attr("className", clazz);
				obj.find('#targetClass')[0].innerHTML= clazz;
			}
		}
		return;
	},
	
	"click #cancel-select-class": function() {
		//document.getElementById("build-path-input").value = "";
		return;
	},
	
	

});

Template.AddLink.events({
//Buttons
	'click #more-add-link-button': async function(e) {
		// var value = $("#mySearch").val().toLowerCase();
		var count = Template.AddLink.Count.get();
			count = count + plusCount;
		Template.AddLink.Count.set(count);
		
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
		})
		Template.AddLink.fullList.set(asc);
		
		// Template.AddLink.fullList.set(await getAllAssociations());
	},

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
				
				
				
                if(typeof class_name !== "undefined" && class_name != null && class_name !== "" && class_name !== " "){				
					cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
				}
                cl.setClassStyle("condition");
                if (line_direct == "=>") {
                	locLink = [coordX, coordY, coordX, newPosition.y];                 
	                Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
						if(document.getElementById("linked-instance-exists").checked == true)  lnk.setLinkType("FILTER_EXISTS");
						else lnk.setLinkType("REQUIRED");

	                    if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName==true) { 
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, currentElement, cl);
	            } else {
	            	locLink = [coordX, newPosition.y, coordX, coordY];
	            	Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    if(document.getElementById("linked-instance-exists").checked == true)  lnk.setLinkType("FILTER_EXISTS");
						else lnk.setLinkType("REQUIRED");
						
						if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName==true) {
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, cl, currentElement);
	            }
                Template.AggregateWizard.endClassId.set(cl.obj._id);
				Session.set("activeElement", cl.obj._id);
            }, newPosition);

			if (document.getElementById("goto-wizard").checked == true ){

				//Fields
				var attr_list = [{attribute: ""}];
				
				// var schema = new VQ_Schema();

				// if (schema.classExist(class_name)) {

					// var klass = schema.findClassByName(class_name);

					// _.each(klass.getAllAttributes(), function(att){
						// attr_list.push({attribute: att["name"]});
					// })
					// attr_list = _.sortBy(attr_list, "attribute");
				// }
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
					Template.AggregateWizard.placeholder.set("("+class_name+")");
					
					$("#aggregate-wizard-form").modal("show");
				} else {
					//alert("No class selected - wizard may work unproperly");
					// Interpreter.showErrorMsg("No proper link-class pair selected to proceed with Aggregate wizard.", -3);
					Interpreter.destroyErrorMsg();
					Template.AggregateWizard.defaultAlias.set("");
					Template.AggregateWizard.showDisplay.set("block");
					Template.AggregateWizard.fromAddLink.set(true);
					Template.AggregateWizard.placeholder.set("(linked instance itself)");
					
					$("#aggregate-wizard-form").modal("show");
				}
			}
			$("#add-link-form").modal("hide");
			clearAddLinkInput();
			
			return;
		}

	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();
	},
	
	"click #select-class-button": async function(e) { 
		var obj = $('input[name=link-list-radio]:checked').closest(".association");
		var linkType = $('input[name=type-radio]:checked').val();

		// var name = obj.attr("name");
		// if(typeof name === "undefined") 
		var name = $(e.target).closest(".association").attr("name");
		var line_direct = $(e.target).closest(".association").attr("line_direct");
		// if(line_direct == "<=") line_direct = "out"; else line_direct = "in";
		var class_name = $(e.target).closest(".association").attr("className");
		
		var schemaName = dataShapes.schema.schemaType;
		if(typeof schemaName === "undefined") schemaName = "";
		
		Template.SelectTargetClass.classes.set([{text: "Waiting answer...", wait: true}]);
		
		autoCompletionCleanup();
		
		$("#class-search")[0].value = "";
		$('[name=class-list-radio]').removeAttr('checked');
		$("#select-class-form").modal("show");
		
		var classes;
		if(name == "==" || name == "++") {
			classes = await dataShapes.getClasses();
		}
		else {
			var params = {};
			var start_elem_id = Session.get("activeElement");
			var startElement = new VQ_Element(start_elem_id);
			var startElementName = startElement.getName();
			var startElementAlias = startElement.getInstanceAlias();

			if(schemaName.toLowerCase() == "wikidata"  && ((name.startsWith("[") && name.endsWith("]")) || name.indexOf(":") == -1)) name = "wdt:"+name;
			if(schemaName.toLowerCase() == "wikidata"  && typeof startElementName != "undefined" && startElementName !== null && startElementName != "" && ((startElementName.startsWith("[") && startElementName.endsWith("]")) || startElementName.indexOf(":") == -1)) startElementName = "wd:"+startElementName;
			
			if(line_direct == "=>") {
				var elementParams = [{"name": name, "type": "in",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					var cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30},
					"element": {"pList": {"in": elementParams,}}
				}
			} else {
				var elementParams = [{"name": name, "type": "out",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					var cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30},
					"element": {"pList": {"out": elementParams,}}
				}
			}

			classes = await dataShapes.getClassesFull(params);
			
		}
		classes = classes.data;
		var proj = Projects.findOne({_id: Session.get("activeProject")});

		_.each(classes, function(e){
			var prefix;
			if(proj.showPrefixesForAllNames != true && (e.is_local == true || e.prefix == "" || (schemaName.toLowerCase() == "wikidata" && e.prefix == "wd")))prefix = "";
			else prefix = e.prefix+":";
			// e.short_class_name = prefix + e.display_name;
			e.short_class_name = e.full_name;
			if(e.principal_class == 2) e.clr = "color: purple";
			else if(e.principal_class == 0) e.clr = "color: #bbbbbb";
			else e.clr = "color: #777777";
		})
		
		classes = classes.filter(function(e) { return e.short_class_name !== class_name });
		
		if(class_name != null && class_name !== "" && class_name != " "){
			classes.unshift({short_class_name:class_name, clr: "color: #777777"})
		}
		
		Template.SelectTargetClass.classes.set(classes);
		
		
	},

	"click #add-long-link": function() {
		//Generate data for Connect Classes
		// var schema = new VQ_Schema();
		var data = [];
		var count = 0;
		// _.each(schema.getAllClasses(), function(c){
			// data.push({name: c.name, id: count});
			// count++;
		// });
		var activeClass = new VQ_Element(Session.get("activeElement"));
		if (activeClass.isUnion() && !activeClass.isRoot()) { console.log(239);// [ + ] element, that has link to upper class 
			if (activeClass.getLinkToRoot()){
				var element = activeClass.getLinkToRoot().link.getElements();
				var newStartClass = "";
				if (activeClass.getLinkToRoot().start) {
					var newStartClass = new VQ_Element(element.start.obj._id);
    			} else {
    				var newStartClass = new VQ_Element(element.end.obj._id);
    			} 
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
		autoCompletionCleanup()
		
		$("#build-path-form").modal("show");
	},

//Menu listeners
	"click #add-link-type-choice": function() {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').prop('checked', false);
            $('#linked-instance-exists:checked').prop('checked', false);
            $('#goto-wizard').prop('disabled',"disabled");
            $('#linked-instance-exists').prop('disabled',"disabled");
        } else {
        	var cardValue = $('input[name=link-list-radio]:checked').attr("card"); //console.log("changed", cardValue);
        	if (cardValue == "") {
        		confirmSubquery();
        	} else {
        		$('#goto-wizard').removeAttr("disabled");
        		$('#linked-instance-exists').removeAttr("disabled");
        		$('#goto-wizard').prop('checked', true);
        	}           
        } 
	},
	
	"click #goto-wizard": function() {
		if(document.getElementById("goto-wizard").checked == true) $('#linked-instance-exists').prop('checked', false);
	},
	
	"click #linked-instance-exists": function() {
		if(document.getElementById("linked-instance-exists").checked == true) $('#goto-wizard').prop('checked', false);
	},

	"click #link-list-form": function() {
		
		var checkedName = $('input[name=link-list-radio]:checked');
		var start_elem_id = Session.get("activeElement");			
		var currentElement = new VQ_Element(start_elem_id);
		var joinLinkDesc = "";
		var subqueryLinkDesc = "";
		if(checkedName.attr("value") == "++" || checkedName.attr("value") == "=="){
			joinLinkDesc = "join information from the host node and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
			if(currentElement !== null && currentElement.getName() != null && currentElement.getName() != "") {
				joinLinkDesc = "join information from "+currentElement.getName()+" and the linked node";
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about its links";
			}
		} else {
			
			var obj = $('input[name=link-list-radio]:checked').closest(".association");
			
			var targetClassText = "";
			var targetClassTextS = "";
			var className = obj.attr("className");
			
			
	
			var line_direct = obj.attr("line_direct");
			if(line_direct == "=>"){
				if(className != null && className != "") {
					targetClassText = " (that is a " + className + ")";
					targetClassTextS = " to" + className;
				}
				joinLinkDesc = "join information from "+currentElement.getName()+" and its linked " + checkedName.attr("value") + targetClassText;
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about its " + checkedName.attr("value") +" links " + targetClassTextS;
			} else {
				if(className != null && className != "") {
					targetClassText = " (from " + className + ")";
					targetClassTextS = " from" + className;
				}
				joinLinkDesc = "join information from "+currentElement.getName()+" and its incoming link by " + checkedName.attr("value") + targetClassText;
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+currentElement.getName()+" about its incoming " + checkedName.attr("value")+" links" +targetClassTextS;
			}
		}
		Template.AddLink.JoinLinkText.set(joinLinkDesc);
		Template.AddLink.SubqueryLinkText.set(subqueryLinkDesc);
		
		$("div[id=errorField]").remove();
	},

	"change #link-list-form": function() {
		// var typeName = $('input[name=type-radio]').filter(':checked').val();
		// var cardValue = $('input[name=link-list-radio]:checked').attr("card");
		// if (typeName == "NESTED" && cardValue == "") {
			// confirmSubquery();
		// }
	},
	'click #apply-button': async function(e) {
		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
		})
		Template.AddLink.fullList.set(asc);
		return;
	},
	'keyup #mySearch': async function(e) {
		linkKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if (linkKeyDownTimeStamp === e.timeStamp ) {
			var asc = [];
			_.each(await getAllAssociations(), function(a){
				asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
			})
			Template.AddLink.fullList.set(asc);
		}
		return;
	},
	'click #dbp_for_links': async function(e) {

		var asc = [];
		_.each(await getAllAssociations(), function(a){
			asc.push({name: a.name, class: a.class , text: a.text, type: a.type, card: a.card, clr: a.clr, show: true, is:a.is, of:a.of});
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
	// $('input[id=linked-instance-exists]').prop("checked",false);
	$('input[id=goto-wizard]').prop("disabled","disabled");
	$('input[id=linked-instance-exists]').prop("disabled","disabled");
	$("#mySearch")[0].value = "";
	$("div[id=errorField]").remove();
}

function confirmSubquery(){
	
	// var txt;
	var proj = Projects.findOne({_id: Session.get("activeProject")});
	if (proj.showCardinalities==true && confirm("You are using subquery link type for link with cardinality equal to 1. Would You like to change link type to Join?\n\nCancel will accept Your settings as is.")) {
		// txt = "You pressed OK!";
		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="JOIN"]').prop('checked', true);
		$('#goto-wizard:checked').prop('checked', false);
		$('#linked-instance-exists:checked').prop('checked', false);
        $('#goto-wizard').prop('disabled',"disabled");
        $('#linked-instance-exists').prop('disabled',"disabled");
	} else {
		// txt = "You pressed Cancel!";
		$('[name=type-radio]').removeAttr('checked');
		$('input[name=type-radio][value="NESTED"]').prop('checked', true);
		$('#goto-wizard').removeAttr("disabled");
		$('#linked-instance-exists').removeAttr("disabled");
        $('#goto-wizard').prop('checked', true);		
        $('#linked-instance-exists').prop('checked', false);		
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
			
			var className = startElement.getName();
				
			if(typeof className === "undefined" || className === null) className= "";
				
			// var schema = new VQ_Schema();
			var proj = Projects.findOne({_id: Session.get("activeProject")});
			if((startElement.isUnit() != true && startElement.isUnion() != true) || !startElement.isRoot()) {
				var newStartElement = startElement;
				
				if ((startElement.isUnion() || startElement.isUnit()) && !startElement.isRoot()) { // [ + ] element, that has link to upper class 
					if (startElement.getLinkToRoot()){
						var element = startElement.getLinkToRoot().link.getElements();
						if (startElement.getLinkToRoot().start) {
							newStartElement = new VQ_Element(element.start.obj._id);
							
							className = newStartElement.getName();
						} else {
							newStartElement = new VQ_Element(element.end.obj._id);						
							className = newStartElement.getName();
						}						
					}					
				} 

				// if (schema.classExist(className)) {
					
					// var allAssociations = schema.findClassByName(className).getAllAssociations();

					var param = {propertyKind:'ObjectExt', linksWithTargets:true};
					var filter = $("#mySearch").val().toLowerCase();
					if(filter != null) param["filter"] = filter;
					param["limit"] = Template.AddLink.Count.get();

					if ($("#dbp_for_links").is(":checked") ) {
						param.basicOrder = true;
					}
					
					var prop = await dataShapes.getProperties(param, newStartElement);
					
					var allAssociations = prop["data"];
					
					var schemaName = dataShapes.schema.schemaType;
					if(typeof schemaName === "undefined") schemaName = "";

					
					_.each(allAssociations, function(e){
						if ( e.mark === 'out') {
							e.type = '=>';
							e.is = "";
							e.of = "";
						} else {
							e.type = '<=';
							e.is = "is";
							e.of = "of";
						}
						
						if (e.class_iri !== undefined && e.class_iri !== null) {
							var prefix;
							if(e.is_local == true || (schemaName.toLowerCase() == "wikidata" && e.class_prefix == "wd"))prefix = "";
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
							if (proj.showCardinalities==true){ 
								if (e.type == "<=") {
									cardinality = cardinality.concat("[*]");
									colorLetters = colorLetters.concat("color: purple");
								} else {
									//var maxCard = schema.resolveSchemaRoleByName(e.name,className,e.class).maxCardinality; maxCard tiek padota uzreiz LL
									var maxCard = e.x_max_cardinality;
									
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
						if(proj.showPrefixesForAllNames != true && (e.is_local == true || (schemaName.toLowerCase() == "wikidata" && e.prefix == "wdt")))prefix = "";
						else prefix = e.prefix+":";
						var eName = prefix + e.display_name;
						
						
						if(e.mark == "out") asc.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters, is:e.is, of:e.of});
						else ascReverse.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters, is:e.is, of:e.of});
						
						if (e.class == className && e.type == "=>"){ //Link to itself
							ascReverse.push({name: e.name, class: e.short_class_name, type: "<=", card: cardinality, clr: colorLetters, is:e.is, of:e.of});
						}
					});
				// }
			}
				//default value for any case
			if (proj){
				if (proj.showCardinalities==true)
					ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "[*]", clr: "color: purple", is:"", of:""}); 
				else {
					ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "", clr: "", is:"", of:""});
				}
			}
			asc = asc.concat(ascReverse);
			
			

      		if (proj){
      			var selfName = "";
      			if (className != null && className.indexOf("[") == -1) {      				
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
				if((startElement.isUnit() != true && startElement.isUnion() != true) || !startElement.isRoot()) {
					if (proj.showCardinalities==true)
						asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: "", is:"", of:""}); 
					else {
						asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: "", is:"", of:""});
					}
				}
      		}

      		asc = asc.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
			}); 
			
			return asc;
		}
}

