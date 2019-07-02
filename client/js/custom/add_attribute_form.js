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
			
		
			var symbolTable = generateSymbolTable()["symbolTable"];
			
			for (var  key in symbolTable) {	
				for (var symbol in symbolTable[key]) {
					if(symbolTable[key][symbol]["context"] != selected_elem_id){
						if(typeof symbolTable[key][symbol]["upBySubQuery"] == 'undefined' || symbolTable[key][symbol]["upBySubQuery"] == 1)attr_list.push({name: key});
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
