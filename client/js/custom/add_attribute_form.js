Template.AddAttribute.attrList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.linkList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.existingAttributeList = new ReactiveVar([{name: "No_attribute"}]);

Template.AddNewAttribute.alias = new ReactiveVar("");
Template.AddNewAttribute.expression = new ReactiveVar("");
Template.AddNewAttribute.requireValues = new ReactiveVar("false");
Template.AddNewAttribute.helper = new ReactiveVar("false");
Template.AddNewAttribute.attributeid = new ReactiveVar("");
Template.AddNewAttribute.selectThis = new ReactiveVar("");

Interpreter.customMethods({
	AddAttribute: function () {
		// attribute-to-add
		Template.AddAttribute.attrList.set(getAttributes());
		Template.AddAttribute.linkList.set(getAssociations());
		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		$("#add-attribute-form").modal("show");
		$('input[name=stack-checkbox]').attr('checked',false);
		$('button[name=required-attribute]').html('\&nbsp;');
		$("#class-associations")[0].style.display = "none";
		$("#mySearch-attribute")[0].value = "";
	}
})


Template.AddAttribute.helpers({

	attributes: function() {
		return Template.AddAttribute.attrList.get();
	},
	
	associations: function() {
		return Template.AddAttribute.linkList.get();
	},
	
	existingAttributes: function() {
		return Template.AddAttribute.existingAttributeList.get();
	},
	showLabels: function() {
		if(getExistingAttributes().length > 0) return true;
		return false;
	},
});


Template.AddAttribute.events({

	"click #ok-add-attribute": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
 
		  var buttonn = $('button[name=required-attribute-to-add]').closest(".attribute");
		  buttonn.each(function () {
		    
			if($(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].getAttribute("disabled") != "true"){
				var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]').attr("class");
				if(required.startsWith("fa fa-plus")) required = true;
				else if(required.startsWith("fa fa-check")) required = false;
				else return;
				var name = $(this).attr("name");
				vq_obj.addField(name,null,required,false,false);
	
				$(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].className = "button button-required";
			}
		  });
		};
		
		return;
	},
	
	"click #save-add-attribute": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
		  var buttonn = $('button[name=required-attribute-to-add]').closest(".attribute");
		  buttonn.each(function () {
		    
			if($(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].getAttribute("disabled") != "true"){
				var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]').attr("class");
				if(required.startsWith("fa fa-plus")) required = true;
				else if(required.startsWith("fa fa-check")) required = false;
				else return;
				
				var name = $(this).attr("name");
				vq_obj.addField(name,null,required,false,false);
			}
		  });
		};
		
		Template.AddAttribute.attrList.set(getAttributes());
		Template.AddAttribute.linkList.set(getAssociations());
		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		
		return;
	},
	
	"click #cancel-add-attribute": function(e) {

		 var buttonn = $('button[name=required-attribute-to-add]');
		 buttonn.each(function () {
			$(this)[0].className = "button button-required";
		  });
		
		return;
	},
	
	"click .button-required": function(e) {
		var attributeName = $(e.target).closest(".attribute")[0].getAttribute("name")
		if(e.target.className == "button button-required") {
			e.target.className = "fa fa-check button button-required";
			$(e.target).attr('name', "required-attribute-to-add");
		}
		else if(e.target.className == "fa fa-check button button-required") {
			if(attributeName == "(select this)"){
				e.target.className = "button button-required";
			} else e.target.className = "fa fa-plus button button-required";
			$(e.target).attr('name', "required-attribute-to-add");
		}
		else if(e.target.className == "fa fa-plus button button-required"){
			e.target.className = "button button-required";
			$(e.target).attr('name', "required-attribute");
		}
		
		return;
	},
	
	"click #required-existing-attribute": function(e) {
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") != "(select this)"){
			var act_elem = Session.get("activeElement");
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			if(typeof act_el !== 'undefined'){
				var compart = Compartments.findOne({_id: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name")});
				var attributeInformation = $(e.target).closest(".attribute")[0].childNodes[1];
			
				var prefixesValue = "";
				
				if(attributeInformation.getAttribute("helper") == "checked") prefixesValue = "h";
				if(attributeInformation.getAttribute("requireValues") != "checked") {
					prefixesValue = prefixesValue +  "+";
					compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["input"] = "true";
					attributeInformation.setAttribute("requireValues", "checked")
				} else {
					attributeInformation.setAttribute("requireValues", "")
					compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["input"] = "false";
				}
				
				if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
				
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;	
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;	
				
				var fullText = prefixesValue;
				if(attributeInformation.getAttribute("alias") != null && attributeInformation.getAttribute("alias") != "") fullText = fullText + attributeInformation.getAttribute("alias") + "<-";
				fullText = fullText + attributeInformation.getAttribute("expression");
				
				var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"), null, null, compart.subCompartments);
			}
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		}
		return;
	},
	
	"click #attribute-helper-button": function(e) {
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") != "(select this)"){
			var act_elem = Session.get("activeElement");
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			if(typeof act_el !== 'undefined'){
				var compart = Compartments.findOne({_id: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name")});
				var attributeInformation = $(e.target).closest(".attribute")[0].childNodes[1];
			
				var prefixesValue = "";
				
				if(attributeInformation.getAttribute("helper") != "checked") {
					prefixesValue = "h";
					compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["input"] = "true";
					attributeInformation.setAttribute("helper", "checked")
				} else {
					attributeInformation.setAttribute("helper", "")
					compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["input"] = "false";
				}
				if(attributeInformation.getAttribute("requireValues") == "checked") {
					prefixesValue = prefixesValue +  "+";
				}
				
				if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
				
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;	
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;	
				
				var fullText = prefixesValue;
				if(attributeInformation.getAttribute("alias") != null && attributeInformation.getAttribute("alias") != "") fullText = fullText + attributeInformation.getAttribute("alias") + "<-";
				fullText = fullText + attributeInformation.getAttribute("expression");
				
				var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"), null, null, compart.subCompartments);
			}
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		}
		return;
	},
	
	
	
	"click #attribute-move-button": function(e) {
		var compart_type_id = CompartmentTypes.findOne({name: "Attributes", elementTypeId: Elements.findOne({_id: Session.get("activeElement")})["elementTypeId"]})["_id"];

		var compartments = Compartments.find({compartmentTypeId: compart_type_id, elementId: Session.get("activeElement"), }, {sort: {index: 1}}).fetch();
		var compart_id = $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name");

		var index = -1;
		var current_compart = {};

		for (var i=0;i<compartments.length;i++) {
			var compart = compartments[i];
			if (compart._id == compart_id) {
				current_compart = compart;
				index = i;
				break;
			}
		}
		
		var prev_index = index - 1;
		if (prev_index >= 0) {
			var prev_compart = compartments[prev_index];
			var list = {projectId: Session.get("activeProject"),
						elementId: Session.get("activeElement"),
						prevCompartment: {id: prev_compart._id, index: prev_compart.index,},
						currentCompartment: {id: current_compart._id, index: current_compart.index,},
					};
			Utilities.callMeteorMethod("swapCompartments", list);
		}
		
		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		return;
	},
	
	
	"click #attribute-delete-button": function(e) {
			
		var list = {compartmentId: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"),
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("removeCompartment", list);
		
		var attr_list = getAttributes();
		var link_list = getAssociations();
		Template.AddAttribute.attrList.set(attr_list);
		Template.AddAttribute.linkList.set(link_list);
		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		
		return;
	},
	
	"keyup #mySearch-attribute": function(){
		var value = $("#mySearch-attribute").val().toLowerCase();
		var attr_list = getAttributes();
		var link_list = getAssociations();
		attr_list = attr_list.filter(function(obj) { 
			return typeof obj['name'] === 'undefined' || obj['name'].toLowerCase().indexOf(value)!== -1;
		});
		Template.AddAttribute.attrList.set(attr_list);
		link_list = link_list.filter(function(obj) { 
			return typeof obj['name'] === 'undefined' || obj['name'].toLowerCase().indexOf(value)!== -1;
		});
		Template.AddAttribute.linkList.set(link_list);
	},
	
	'click #attribute-new-button': function(e) {
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
		Template.AddNewAttribute.selectThis.set("");
		Template.AddNewAttribute.attributeid.set("newAttribute");

		$("#add-new-attribute-form").modal("show");
		return;
	},
	
	'click #attribute-extra-button': function(e) {
		
		Template.AddNewAttribute.alias.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("alias"));
		Template.AddNewAttribute.expression.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression"));
		Template.AddNewAttribute.requireValues.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("requireValues"));
		Template.AddNewAttribute.helper.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("helper"));		
		Template.AddNewAttribute.attributeid.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"));		
		var selectThis = "";
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") == "(select this)")selectThis = "disabled";
		Template.AddNewAttribute.selectThis.set(selectThis);		
		$("#add-new-attribute-form").modal("show");
		return;
	},
});

Template.AddNewAttribute.helpers({

	alias: function() {
		return Template.AddNewAttribute.alias.get();
	},
	
	expression: function() {
		return Template.AddNewAttribute.expression.get();
	},
	
	requireValues: function() {
		return Template.AddNewAttribute.requireValues.get();
	},
	
	helper: function() {
		return Template.AddNewAttribute.helper.get();
	},

	attributeid: function() {
		return Template.AddNewAttribute.attributeid.get();
	},
	
	selectThis: function() {
		return Template.AddNewAttribute.selectThis.get();
	},
	
});

Template.AddNewAttribute.events({

	"click #ok-add-new-attribute": function(e, t) {

		var alias = document.getElementById("add-new-attribute-alias").value;
		var expression = document.getElementById("add-new-attribute-expression").value;
		var requireValues = document.getElementById("add-new-attribute-requireValues").checked ;
		var helper = document.getElementById("add-new-attribute-helper").checked ;
		var fullText = "";
		
		var prefixesValue = "";
		if(helper == true) prefixesValue = "h";
		if(requireValues == true) prefixesValue = prefixesValue + "+";
		if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
		
		fullText = prefixesValue;
		if(alias != null && alias != "") fullText = fullText + alias + "<-";
		fullText = fullText + expression;

		if($(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid") == "newAttribute"){
			var selected_elem_id = Session.get("activeElement");
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
				var vq_obj = new VQ_Element(selected_elem_id);
				vq_obj.addField(expression,alias,requireValues,false,helper);
			};
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		} else {
			var attribute = document.getElementsByName($(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"))[0];
			attribute.setAttribute("alias", alias);
			attribute.setAttribute("expression", expression);
			attribute.setAttribute("requireValues", requireValues);
			attribute.setAttribute("helper", helper);
			// attribute.textContent = fullText;

			var act_elem = Session.get("activeElement");
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			if(typeof act_el !== 'undefined'){
				var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});

				compart.subCompartments["Attributes"]["Attributes"]["Expression"]["value"] = expression;
				compart.subCompartments["Attributes"]["Attributes"]["Expression"]["input"] = expression;
				if(alias!="" || alias!=null)compart.subCompartments["Attributes"]["Attributes"]["Field Name"]["value"] = alias+"<-";
				compart.subCompartments["Attributes"]["Attributes"]["Field Name"]["input"] = alias;
				// if(helper==true)compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["value"] = "{h} ";
				compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["input"] = helper.toString() ;
				// if(requireValues==true)compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["value"] = "{+} ";
				compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["input"] = requireValues.toString() ;
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"), null, null, compart.subCompartments);
			}
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());		
		}
		
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
			
		document.getElementById("add-new-attribute-alias").value = "";
		document.getElementById("add-new-attribute-expression").value = "";
		document.getElementById("add-new-attribute-requireValues").checked = false;
		document.getElementById("add-new-attribute-helper").checked = false;
		
		return;
	},
	
	"click #cancel-add-new-attribute": function(e) {
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
		
		document.getElementById("add-new-attribute-alias").value = "";
		document.getElementById("add-new-attribute-expression").value = "";
		document.getElementById("add-new-attribute-requireValues").checked = false;
		document.getElementById("add-new-attribute-helper").checked = false;
		
		return;

	},
	
	"keydown #add-new-attribute-expression": function(e) {
		autoCompletionAddAttribute(e);
		return;
	},
	
	"hidden.bs.modal #add-new-attribute-form": function(e) {
		autoCompletionCleanup();
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
	},
});

function getAttributes(){
	var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);
			
			// if(vq_obj.isUnion() != true && vq_obj.isUnit() != true) attr_list.push({name:"(select this)"});
			if(vq_obj.isRoot() == true && vq_obj.isUnit() == true) {}
			else attr_list.push({name:"(select this)"});
						
			attr_list.push({separator:"line"});
			
		
			var symbolTable = generateSymbolTable()["symbolTable"];
			
			for (var  key in symbolTable) {	
				for (var symbol in symbolTable[key]) {
					if(symbolTable[key][symbol]["context"] != selected_elem_id){
						if(symbolTable[key][symbol]["upBySubQuery"] == 1 && (typeof symbolTable[key][symbol]["distanceFromClass"] === "undefined" || symbolTable[key][symbol]["distanceFromClass"] <= 1 ))attr_list.push({name: key});
						// if(typeof symbolTable[key][symbol]["upBySubQuery"] == 'undefined' || symbolTable[key][symbol]["upBySubQuery"] == 1)attr_list.push({name: key});
					}
				}	
			}
			
			attr_list.push({separator:"line"});

			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				var all_attributes = schema.findClassByName(class_name).getAllAttributes();
				for (var key in all_attributes){
					
					att_val = all_attributes[key]["short_name"];
					attr_list.push({name: att_val});
				}
			};

			
			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
			var field_list = vq_obj.getFields();
			attr_list = attr_list.map(function(attr) {
				var disabled = false;
				var buttonClassName = "button button-required";
				for(var field in field_list){
					if(field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {
						disabled = true; 
						if(field_list[field]["requireValues"] == true) buttonClassName = "fa fa-plus button button-required";
						else buttonClassName = "fa fa-check button button-required";
						break;
					}
				}
				attr.disabled = disabled;
				attr.buttonClassName = buttonClassName;
	
				attr.buttonName = "required-attribute";
				return attr;
			});
			
			return attr_list;

		}
	return [];
}

function getAssociations(){
	var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			var attr_list_reverse = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);
			
			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				var all_attributes = schema.findClassByName(class_name).getAllAssociations();
				for (var key in all_attributes){	
					att_val = all_attributes[key]["short_name"];
					if(all_attributes[key]["type"] == "=>") attr_list.push({name: att_val});
					else attr_list_reverse.push({name: "INV("+att_val+")"});
				}
			};
			
			attr_list = attr_list.concat(attr_list_reverse);

			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
			var field_list = vq_obj.getFields();
			attr_list = attr_list.map(function(attr) {
				var disabled = false;
				var buttonClassName = "button button-required";
				for(var field in field_list){
					if(field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {
						disabled = true; 
						if(field_list[field]["requireValues"] == true) buttonClassName = "fa fa-plus button button-required";
						else buttonClassName = "fa fa-check button button-required";
						break;
					}
				}
				attr.disabled = disabled;
				attr.buttonClassName = buttonClassName;
				attr.buttonName = "required-attribute";
				return attr;
			});
			return attr_list;

		}
	return [];
}

function getExistingAttributes(){
	var selected_elem_id = Session.get("activeElement");
	if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		var vq_obj = new VQ_Element(selected_elem_id);
		
		// var compart_type_id = CompartmentTypes.findOne({name: "Attributes", elementTypeId: Elements.findOne({_id: Session.get("activeElement")})["elementTypeId"]})["_id"];
		// var compartments = Compartments.find({compartmentTypeId: compart_type_id, elementId: Session.get("activeElement"), }, {sort: {index: 1}}).fetch();

		// var field_list = [];
		
		// var fieldListTemp = vq_obj.getFields();
		// for(var compartment in compartments){
			// for(var field in fieldListTemp){
				// if(fieldListTemp[field]["_id"] == compartments[compartment]["_id"]) {
					// field_list.push(fieldListTemp[field]);
					// break;
				// }
			// }
		// }
		
		// var field_list = field_list.map(function(f) {
		var field_list = vq_obj.getFields().map(function(f) {
			var al = f.alias;
			if(al==null) al="";
			var r = "";
			if(f.requireValues == true) {
				r = "checked";
			}
			var fulltext = f.Prefixes;
			if(typeof fulltext == "undefined") fulltext = "";
			// var fulltext = f.fulltext;
			var hide = "false";
			if(typeof f.alias !== 'undefined' && f.alias != "") fulltext = fulltext + f.alias + "<-";
			fulltext = fulltext + f.exp;
			if(f.isInternal == true) {
				hide = "checked";
			}
			
			var disabled = "";
			if(f.exp == "(select this)") disabled = "disabled";
			
			return {name:f.exp, requireValues: r, fulltext:fulltext, al:al, hel:hide, id:f._id, disabled:disabled}});
		return field_list;
	}
	return [];
}
