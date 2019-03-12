Interpreter.customMethods({
	AddAttribute: function () {

		$("#add-attribute-form").modal("show");
		$('input[name=stack-checkbox]').attr('checked',false);
		$("#class-associations")[0].style.display = "none";
	}
})


Template.AddAttribute.helpers({

	attributes: function() {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);
			
			// if(vq_obj.isUnion() != true && vq_obj.isUnit() != true) attr_list.push({name:"(select this)"});
			if(vq_obj.isRoot() == true && vq_obj.isUnit() == true) {}
			else attr_list.push({name:"(select this)"});
			
			attr_list.push({name:"*"});
						
			attr_list.push({separator:"line"});
			
		
			var symbolTable = generateSymbolTable()
			
			for (var  key in symbolTable) {	
				for (var symbol in symbolTable[key]) {
					if(symbolTable[key][symbol]["context"] != selected_elem_id){
						var vq_obj2 = new VQ_Element(symbolTable[key][symbol]["context"]);
						var links = vq_obj2.getLinks();
						for (var assoc in links) {
							if(links[assoc]["link"].isSubQuery() || links[assoc]["link"].isGlobalSubQuery()){
								var association = links[assoc]["link"];
								var isStart = links[assoc]["start"];
								var clazz;
								if(isStart == true) clazz = association.getStartElement();
								else clazz = association.getEndElement();
								if(clazz["obj"]["_id"] == selected_elem_id) attr_list.push({name: key});
							}
						}
					}
				}	
			}
			
			attr_list.push({separator:"line"});

			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				var showPrefixesForAllNonLocalNames = "false";
				var proj = Projects.findOne({_id: Session.get("activeProject")});
				if (proj) {
					if (proj.showPrefixesForAllNonLocalNames=="true") {
						showPrefixesForAllNonLocalNames="true";
					}
				}// else attr_list = attr_list.concat(schema.findClassByName(class_name).getAllAttributes());	
				var all_attributes = schema.findClassByName(class_name).getAllAttributes();
				for (var key in all_attributes){
					att_val = all_attributes[key]["name"];
					if (showPrefixesForAllNonLocalNames=="true") {
						if(all_attributes[key]["isDefOnt"] != true || (all_attributes[key]["isDefOnt"] == true && all_attributes[key]["isUnique"] != true))att_val = all_attributes[key]["prefix"] + ":" + att_val;
					} else {
						if(all_attributes[key]["isDefOnt"] != true && all_attributes[key]["isUnique"] != true)att_val = all_attributes[key]["prefix"] + ":" + att_val;
					}
					attr_list.push({name: att_val});
				}
			};

			
			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
      var field_list = vq_obj.getFields().map(function(f) {return f.exp});
			attr_list = attr_list.map(function(attr) {
        attr.disabled = (_.indexOf(field_list,attr.name) > -1);
				return attr;
			});
			return attr_list;

		}
	},
	
	associations: function() {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);
			
			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				var proj = Projects.findOne({_id: Session.get("activeProject")});
				if (proj) {
					var all_attributes = schema.findClassByName(class_name).getAllAssociations();
					for (var key in all_attributes){
						att_val = all_attributes[key]["name"];
						if (proj.showPrefixesForAllNonLocalNames=="true") {
							if(all_attributes[key]["isDefOnt"] != true || (all_attributes[key]["isDefOnt"] == true && all_attributes[key]["isUnique"] != true))att_val = all_attributes[key]["prefix"] + ":" + att_val;
						};
						attr_list.push({name: att_val});
					}	
				} else attr_list = attr_list.concat(schema.findClassByName(class_name).getAllAssociations());	
			};

			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
			var field_list = vq_obj.getFields().map(function(f) {return f.exp});
			attr_list = attr_list.map(function(attr) {
			attr.disabled = (_.indexOf(field_list,attr.name) > -1);
				return attr;
			});
			return attr_list;

		}
	},
});


Template.AddAttribute.events({

	"click #ok-add-attribute": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
		  var checkboxes = $('input[name=stack-checkbox]:checked').closest(".attribute");
      checkboxes.each(function () {
					var name = $(this).attr("name");
					vq_obj.addField(name,null,false,false,false);
		  });
	  };

		return;

	},

});
