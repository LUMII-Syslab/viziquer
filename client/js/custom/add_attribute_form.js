Template.AddAttribute.attrList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.linkList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.existingAttributes = new ReactiveVar([{name: "No_attribute"}]);

Template.AddNewAttribute.alias = new ReactiveVar("");
Template.AddNewAttribute.expression = new ReactiveVar("");
Template.AddNewAttribute.requireValues = new ReactiveVar("false");
Template.AddNewAttribute.helper = new ReactiveVar("false");
Template.AddNewAttribute.attributeid = new ReactiveVar("");

Interpreter.customMethods({
	AddAttribute: function () {
		
		Template.AddAttribute.attrList.set(getAttributes());
		Template.AddAttribute.linkList.set(getAssociations());
		Template.AddAttribute.existingAttributes.set(getExistingAttributes());
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
		return Template.AddAttribute.existingAttributes.get();
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
		  console.log("v1", vq_obj, selected_elem_id )
		  // var field_list = vq_obj.getFields();
		  // var x = document.getElementsByName("add-attribute");
		  // var x = document.getElementsByClassName("information");
		  // for(var existingDiagramField in field_list){
			// var fieldFound = false;
			// for(var existingField in x){
				// if(typeof x[existingField] === "object"){
					// if(x[existingField].getAttribute("name") == field_list[existingDiagramField]["_id"]){
						// if(x[existingField].parentNode.style.display != "none"){
							// fieldFound = true;
							// break;
						// } else x[existingField].parentNode.style.display = "table-row";
					// }
				// }
				
			// }
			// if(fieldFound == false){
				// var list = {compartmentId: field_list[existingDiagramField]["_id"],
					// projectId: Session.get("activeProject"),
					// versionId: Session.get("versionId"),
				// };

				// Utilities.callMeteorMethod("removeCompartment", list);
			// }
		  // }
		  
		  
		  var buttonn = $('button[name=required-attribute-to-add]').closest(".attribute");
		  buttonn.each(function () {
		    
			var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]').attr("class");
			if(required.startsWith("fa fa-plus")) required = true;
			else required = false;
			
			var name = $(this).attr("name");
			vq_obj.addField(name,null,required,false,false);
		  });
		};
		
		return;

	},
	
	"click #cancel-add-attribute": function(e) {
		var x = document.getElementsByClassName("resp-table-row");
		for(var attr in x){
			if(typeof x[attr] === "object" && x[attr].style.display == "none") x[attr].style.display = "table-row";
		}
		return;

	},
	
	"click #required-attribute": function(e) {
		console.log($(e.target).attr('name'));

		if(e.target.className == "button button-required") {
			e.target.className = "fa fa-check button button-required";
			$(e.target).attr('name', "required-attribute-to-add");
		}
		else if(e.target.className == "fa fa-check button button-required") {
			e.target.className = "fa fa-plus button button-required";
			$(e.target).attr('name', "required-attribute-to-add");
		}
		else if(e.target.className == "fa fa-plus button button-required"){
			e.target.className = "button button-required";
			$(e.target).attr('name', "required-attribute");
		}
		
		return;

	},
	
	"click #required-existing-attribute": function(e) {
	
		var labelText = $(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent;
		if(labelText.startsWith("{+}")) {
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = labelText.substring(4);
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("requireValues", "");
		}else if(labelText.startsWith("{h} {+}")) {
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = "{h} "+labelText.substring(7);
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("requireValues", "");
		}else if(labelText.startsWith("{h}")){
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = "{h} {+} "+labelText.substring(3);
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("requireValues", "checked");
		}else {
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = "{+} "+labelText;
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("requireValues", "checked");
		}
		return;
	},
	
	"click #attribute-helper-button": function(e) {
		var labelText = $(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent;
		if(labelText.startsWith("{+}")){
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = "{h} "+labelText;
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("helper", "checked");
		}else if(labelText.startsWith("{h} {+}")) {
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = labelText.substring(4);
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("helper", "");
		}else if(labelText.startsWith("{h}")){
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = labelText.substring(4);
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("helper", "");
		}else {
			$(e.target).closest(".attribute")[0].childNodes[1].childNodes[1].childNodes[1].textContent = "{h} "+labelText;
			$(e.target).closest(".attribute")[0].childNodes[1].setAttribute("helper", "checked");
		}
		
		// var act_elem = Session.get("activeElement");
			// var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			// if(typeof act_el !== 'undefined'){
				// var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				// var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				// var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});

				// compart.subCompartments["Attributes"]["Attributes"]["Expression"]["value"] = expression;
				// compart.subCompartments["Attributes"]["Attributes"]["Expression"]["input"] = expression;
				// if(alias!="" || alias!=null)compart.subCompartments["Attributes"]["Attributes"]["Field Name"]["value"] = alias+"<-";
				// compart.subCompartments["Attributes"]["Attributes"]["Field Name"]["input"] = alias;
				// if(helper==true)compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["value"] = "{h} ";
				// compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["input"] = helper.toString() ;
				// if(requireValues==true)compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["value"] = "{+} ";
				// compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["input"] = requireValues.toString() ;
				
				// Dialog.updateCompartmentValue(compart_type, fullText, value, $(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"), null, null, compart.subCompartments);
			// }
		return;
	},
	
	"click #hide-existing-attribute": function(e) {
		
		if(e.target.innerHTML == "{hide}") {
			e.target.innerHTML = '';
		}
		else {
			e.target.innerHTML = "{hide}";
		}

		return;

	},
	
	"click #input-checkbox": function(e) {

		if(e.target.checked == false) {
			$(e.target.parentElement).children('button[name="required-attribute"]').prop("innerHTML", '\&nbsp;');
		}
		
		return;

	},
	
	"click #hide-checkbox": function(e) {

		// if(e.target.checked == false) {
			// $(e.target.parentElement).children('button[name="required-attribute"]').prop("innerHTML", '\&nbsp;');
		// }else {
			
		// }
		console.log("IIIIII", $(e.target.parentElement.parentElement).children('label[name="add-attribute"]'))
		return;

	},
	
	"click #attribute-delete-button": function(e) {
		
		// console.log($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"));
		
		$(e.target).closest(".attribute")[0].style.display = "none";
		
		
		var list = {compartmentId: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"),
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

				Utilities.callMeteorMethod("removeCompartment", list);
		// $(e.target).closest(".attribute")[0].remove();
		
		return;

	},
	
	"click #attribute-extra-button": function(e) {
		
		if($(e.target).closest(".attribute").children(".information").children('label[name="attrbute-exist-extra"]')[0].style.display != "block") $(e.target).closest(".attribute").children(".information").children('label[name="attrbute-exist-extra"]')[0].style.display = "block";
		else $(e.target).closest(".attribute").children(".information").children('label[name="attrbute-exist-extra"]')[0].style.display = "none";
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
	
});

Template.AddNewAttribute.events({

	"click #ok-add-new-attribute": function(e, t) {
		console.log("eee", e, t);
		var alias = document.getElementById("add-new-attribute-alias").value;
		var expression = document.getElementById("add-new-attribute-expression").value;
		var requireValues = document.getElementById("add-new-attribute-requireValues").checked ;
		var helper = document.getElementById("add-new-attribute-helper").checked ;
		var fullText = "";
		if(helper == true) fullText = "{h} ";
		if(requireValues == true) fullText = fullText + "{+} ";
		if(alias != null && alias != "") fullText = fullText + alias + "<-";
		fullText = fullText + expression;
		
		console.log(alias, $(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"))
		if($(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid") == "newAttribute"){
			
			console.log(document.getElementById("resp-table-body"));
			str = '<div class="resp-table-row attribute">'+
									'<div style="display: table-cell;" class="table-body-cell information" name="newAttribute" alias="'+alias+'" expression="'+expression+'" requireValues="'+requireValues+'" helper="'+helper+'">'+
										'<label class="label-checkbox" name="add-attribute">'+
											'<span>'+fullText+'</span>'+
										'</label>'+
									'</div>'+
									'<div style="display: table-cell;" class="table-body-cell">'+
										'<a class="btn btn-xs btn-warning edit-multi-field"><i id="attribute-extra-button" class="fa fa-pencil"></i></a>'+
										'<a class="btn btn-xs btn-default"><i id="attribute-helper-button" class="fa">h</i></a>'+
										'<a class="btn btn-xs btn-default"><i id="required-existing-attribute" class="fa fa-plus"></i></a>'+
										'<a class="btn btn-xs btn-info up-multi-field"><i id="attribute-muve-button" class="fa fa-arrow-up"></i></a>'+
										'<a class="btn btn-xs btn-danger remove-multi-field"><i id="attribute-delete-button" class="fa fa-trash-o"></i></a>'+
									'</div>'+
								'</div>'
			document.getElementById("resp-table-body").insertAdjacentHTML( 'beforeend', str );
			var selected_elem_id = Session.get("activeElement");
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
				var vq_obj = new VQ_Element(selected_elem_id);
				vq_obj.addField(expression,alias,requireValues,false,helper);
			};
		} else {
			var attribute = document.getElementsByName($(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"))[0];
			attribute.setAttribute("alias", alias);
			attribute.setAttribute("expression", expression);
			attribute.setAttribute("requireValues", requireValues);
			attribute.setAttribute("helper", helper);
			attribute.childNodes[1].childNodes[1].textContent = fullText;

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
				if(helper==true)compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["value"] = "{h} ";
				compart.subCompartments["Attributes"]["Attributes"]["IsInternal"]["input"] = helper.toString() ;
				if(requireValues==true)compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["value"] = "{+} ";
				compart.subCompartments["Attributes"]["Attributes"]["Require Values"]["input"] = requireValues.toString() ;
				
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(document.getElementById("add-new-attribute-alias")).closest(".multi-field")[0].getAttribute("attributeid"), null, null, compart.subCompartments);
			}
		}
		return;
	},
	
	"click #cancel-add-new-attribute": function(e) {
		
		return;

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
			
			//attr_list.push({name:"*"});
						
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
				for(var field in field_list){
					if(field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {disabled = true; break;}
				}
				attr.disabled = disabled;
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
				for(var field in field_list){
					if(field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {disabled = true; break;}
				}
				attr.disabled = disabled;
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
		var field_list = vq_obj.getFields().map(function(f) {
			var al = f.alias;
			if(al==null) al="";
			var r = "";
			if(f.requireValues == true) {
				r = "checked";
			}
			var fulltext = f.fulltext;
			var hide = "false";
			// if(typeof f.alias !== 'undefined' && f.alias != "") fulltext = f.alias + "<-" + fulltext;
			if(f.isInternal == true) {
				hide = "checked";
			}
			
			return {name:f.exp, requireValues: r, fulltext:fulltext, al:al, hel:hide, id:f._id}});
		return field_list;
	}
	return [];
}
