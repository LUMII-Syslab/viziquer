Interpreter.customMethods({
	AddAggregate2: function () {

		$("#add-aggregate-form").modal("show");
		$('#alias-name-aggr').val('');
		$('#aggregate-expression').val('');
		$('input[name=aggr-count]').attr('checked',true);
	}
})



///////////////////////////////////////////////////////////////
Template.AddAggregate.attList = new ReactiveVar([{attribute: "No_attribute"}]);

Template.AddAggregate.helpers({
	
	attList: function() {
		onAggregationChange();
		return Template.AddAggregate.attList.get();
	},
	
});

Template.AddAggregate.events({
	"click #ok-add-aggregate": function() {
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			var alias = $('input[id=alias-name-aggr]').val();
			var expr = $('input[name=aggr-list-radio]:checked').val();		
			var distinct = $('input[id=distinct-aggr-check-box]:checked').val();
			var required = $('input[id=require-aggr-check-box]:checked').val();
			if(typeof required !== "undefined" && required == "on") required = true;
			else required = false;
			
			// var fld = $('option[name=field-name-aggr]:selected').val();
			var fld = document.getElementById('field-list-aggr').value;
			if (fld == "") {
				expr = expr.concat("(.)");
			} else {
				if(typeof distinct !== "undefined" && distinct == "on") expr = expr.concat("(DISTINCT ", fld, ")");
				else expr = expr.concat("(", fld, ")");
			}
			vq_obj.addAggregateField(expr,alias,required);
		}

		clearAggregateInput();
		return;
	},

	"click #cancel-add-aggregate": function() {
		clearAggregateInput();
		return;
	},

	"change #aggr-count": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-count_distinct": function() {
		document.getElementById("distinct-aggr").style.display = "none";
		onAggregationChange();
		return;
	},
	"change #aggr-sum": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-avg": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-max": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-min": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-sample": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	"change #aggr-group_concat": function() {
		document.getElementById("distinct-aggr").style.display = "inline-block";
		onAggregationChange();
		return;
	},
	
	'click #extra-options-button': function(e) {
		if(document.getElementById("extra-options").style.display == "none") document.getElementById("extra-options").style.display = "block";
		else document.getElementById("extra-options").style.display = "none";
		return;
	},
});


function clearAggregateInput(){

	document.getElementById("aggr-count").checked=true;
	document.getElementById("distinct-aggr-check-box").checked=false;
	document.getElementById("require-aggr-check-box").checked=false;
	document.getElementById('field-list-aggr').value = "";
	document.getElementById("extra-options").style.display = "none";
	defaultFieldList();

	Template.AddAggregate.attList.set([{attribute: "No_attribute"}]);
}

function defaultFieldList(){
	var defaultFunctions = document.getElementsByName("field-name-aggr");
	_.each(defaultFunctions, function(e){
		if (e.value == "") e.selected = true;
		else e.selected = false;
	});
}

function onAggregationChange(){
		var newFunction = $('input[name=aggr-list-radio]:checked').val()
		//Select suitable atributes for Field form
		defaultFieldList();
			
		var attr_list = [];
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var vq_obj = new VQ_Element(selected_elem_id);

			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();
			
			if (newFunction == "count" || newFunction == "count_distinct" || newFunction == "sample") {
				attr_list.push({attribute: ""});
			}
			
			if (schema.classExist(class_name)) {
				var klass = schema.findClassByName(class_name);

				_.each(klass.getAllAttributes(), function(att){
					var attrType = schema.resolveAttributeByName(class_name, att["short_name"]).type;
					if (newFunction == "sum" || newFunction == "avg") {
						if (attrType == "xsd:integer" || attrType == "xsd:decimal" || attrType == "xsd:double"
							|| attrType == "xsd:float" || attrType == "xsd:int" || attrType == "xsd:long"
							|| attrType == "xsd:short") {
							attr_list.push({attribute: att["name"]})
						}
					} else {
						attr_list.push({attribute: att["name"]});
					}
				})

				var tempSymbolTable = generateSymbolTable();
				var symbolTable = tempSymbolTable["symbolTable"];
				for (var  key in symbolTable) {	
					for (var symbol in symbolTable[key]) {
						if (symbolTable[key][symbol]["upBySubQuery"] == 1 || (typeof symbolTable[key][symbol]["upBySubQuery"] === "undefined" && symbolTable[key][symbol]["kind"] == "CLASS_ALIAS")){
							attr_list.push({attribute: key});
						} else{
							var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][symbol]["context"], tempSymbolTable["abstractQueryTable"], key);
							if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true){
								attr_list.push({attribute: key});
							}
						}
					}	
				}

				attr_list = _.sortBy(attr_list, "attribute");
		 	 	attr_list = _.uniq(attr_list, false, function(item) {
		 	 		return item["attribute"];
		 	 	});
			};
		};

		Template.AddAggregate.attList.set(attr_list);

}


///////////////////////////////////////////////////////////////
/*
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
*/