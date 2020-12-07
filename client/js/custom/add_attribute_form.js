Template.AddAttribute.attrList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.linkList = new ReactiveVar([{name: "No_attribute"}]);

Interpreter.customMethods({
	AddAttribute: function () {
		
		Template.AddAttribute.attrList.set(getAttributes());
		Template.AddAttribute.linkList.set(getAssociations());
		$("#add-attribute-form").modal("show");
		$('input[name=stack-checkbox]').attr('checked',false);
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
		return getExistingAttributes();
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
		  
		  var x = document.getElementsByName("add-attribute");
		  
		  var checkboxes = $('input[name=stack-checkbox]:checked').closest(".attribute");
		  checkboxes.each(function () {
		    var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute"]').prop("innerHTML")

			if(required == "+") required = true;
			else required = false;
			
			var name = $(this).attr("name");
			vq_obj.addField(name,null,required,false,false);
		  });
		};

		return;

	},
	
	"click #required-attribute": function(e) {
		
		if(e.target.innerHTML == "+") {
			e.target.innerHTML = '\&nbsp;';
		}
		else {
			e.target.innerHTML = "+";
			$(e.target.parentElement).children('input[name="stack-checkbox"]').prop("checked", true);
		}

		return;

	},
	
	"click #required-existing-attribute": function(e) {
		
		if(e.target.innerHTML == "+") {
			e.target.innerHTML = '-';
		}
		else {
			e.target.innerHTML = "+";
		}

		return;

	},
	
	"click #required-existing-attribute2": function(e) {
		
		if(e.target.innerHTML == "{+}") {
			e.target.innerHTML = '';
		}
		else {
			e.target.innerHTML = "{+}";
		}

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
	
	"click #attribute-extra-button": function(e) {

		if($(e.target).closest(".attribute").children('label[name="attrbute-exist-extra"]')[0].style.display != "block") $(e.target).closest(".attribute").children('label[name="attrbute-exist-extra"]')[0].style.display = "block";
		else $(e.target).closest(".attribute").children('label[name="attrbute-exist-extra"]')[0].style.display = "none";
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
			var r = "-";
			var r2 = "";
			if(f.requireValues == true) {
				r = "+";
				r2 = "{+}";
			}
			var fulltext = f.exp;
			var hide = "";
			var hideBox = "";
			if(typeof f.alias !== 'undefined' && f.alias != "") fulltext = f.alias + "<-" + fulltext;
			if(f.isInternal == true) {
				fulltext = "{hide} " + fulltext;
				hide = "{hide}";
				hideBox = "checked";
			}
			
			return {name:f.exp, required: r, required2: r2, fulltext:fulltext, alias:f.alias, hideCheckBox:hideBox, hideButton:hide}});
		return field_list;
	}
	return [];
}
