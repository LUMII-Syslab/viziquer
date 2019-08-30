Interpreter.customMethods({
	AddAggregate: function () {

		$("#add-aggregate-form").modal("show");
		$('#aggregate-alias').val('');
		$('#aggregate-expression').val('');
	//	$('input[name=stack-checkbox-req]').attr('checked',false);
	}
})


Template.AddAggregate.helpers({

	aggregates: function() {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			//attr_list.push({separator:"line"});

			var vq_obj = new VQ_Element(selected_elem_id);

			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				var klass = schema.findClassByName(class_name);

				_.each(klass.getAllAttributes(), function(att){
					attr_list.push({aggregate:"avg("+att["name"]+")"});
					attr_list.push({aggregate:"min("+att["name"]+")"});
					attr_list.push({aggregate:"max("+att["name"]+")"});
					attr_list.push({aggregate:"sum("+att["name"]+")"});
					attr_list.push({aggregate:"group_concat("+att["name"]+",',')"});
				})

				var tempSymbolTable = generateSymbolTable();
				var symbolTable = tempSymbolTable["symbolTable"];
				for (var  key in symbolTable) {	
					for (var symbol in symbolTable[key]) {
						if (symbolTable[key][symbol]["upBySubQuery"] == 1 || (typeof symbolTable[key][symbol]["upBySubQuery"] === "undefined" && symbolTable[key][symbol]["kind"] == "CLASS_ALIAS")){
							attr_list.push({aggregate:"avg("+key+")"});
							attr_list.push({aggregate:"min("+key+")"});
							attr_list.push({aggregate:"max("+key+")"});
							attr_list.push({aggregate:"sum("+key+")"});
							attr_list.push({aggregate:"group_concat("+key+",',')"});
						} else{
							var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][symbol]["context"], tempSymbolTable["abstractQueryTable"], key);
							if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true){
								attr_list.push({aggregate:"avg("+key+")"});
								attr_list.push({aggregate:"min("+key+")"});
								attr_list.push({aggregate:"max("+key+")"});
								attr_list.push({aggregate:"sum("+key+")"});
								attr_list.push({aggregate:"group_concat("+key+",',')"});
							}
						}
					}	
				}

				attr_list = _.sortBy(attr_list, "aggregate");
		 	 	attr_list = _.uniq(attr_list, false, function(item) {
		 	 		return item["aggregate"];
		 	 	});
			};

			attr_list = _.union([{aggregate:"count(.)"},{aggregate:"count_distinct(.)"}], attr_list);
			return attr_list;

		};

		return [];
	},


});


Template.AddAggregate.events({

	"click #ok-add-aggregate": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			var alias = $('#aggregate-alias').val();
			var expr =	$('#aggregate-expression').val();
			vq_obj.addAggregateField(expr,alias);
			if (!vq_obj.isRoot()) {
				var vq_link = vq_obj.getLinkToRoot();
				if (vq_link && !vq_link.link.isSubQuery() && !vq_link.link.isGlobalSubQuery()) {
					vq_link.link.setNestingType("SUBQUERY");
				}
			}
	  };

		return;

	},

});
