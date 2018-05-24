Interpreter.customMethods({
	AddLink: function () {
		$("#add-link-form").modal("show");
	}
})


Template.AddLink.helpers({

	associations: function() {
		//start_elem
		var start_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: start_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			//Associations
			var asc_all = [];
			var asc = [];
			var atr = [];
			var atrNameArray = [];
			var asoc = [];
			//Class Name - direct
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: Elements.findOne({_id: start_elem_id})["elementTypeId"]});
			if (!compart_type) {
				return [{name: "++", class: "", type: "=>"}];
			}

			var act_comp = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: start_elem_id});
			if (!act_comp) {
				return [{name: "++", class: "", type: "=>"}];
			}

			var className = act_comp["input"];
			var schema = new VQ_Schema();

			if (!schema.classExist(className)) {
				return [{name: "++", class: "", type: "=>"}];
			}

			asc = schema.findClassByName(className).getAllAssociations();
			asoc = asc.map(function(elem){
				atrNameArray = [];				
				atr = schema.findClassByName(elem.class).getAllAttributes();
				atr.map(function(a){					
					atrNameArray.push(a.name);
				})
				//console.log(atrNameArray);								
				return ({name: elem.name, class: elem.class, type: elem.type, attributes: atrNameArray});
			})
			asoc.push({name: "++", class: "", type: "=>", attributes: []});
			//console.log(asoc);

			atr = schema.findClassByName(className).getAllAttributes();	
      		//asc.push({name: "++", class: "", type: "=>", attributes: "(-)"});

			return asoc;
			
		}
	},


});


Template.AddLink.events({

	"click #ok-add-link": function(e) {
		//Read user's choise
		var obj = $('input[name=stack-radio]:checked').closest(".association");
		//console.log("obj = ", obj);

		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");
		
		//start_elem
		var start_elem_id = Session.get("activeElement");
		var elem_start = Elements.findOne({_id: start_elem_id});
		if (!elem_start){
			console.log("Error - no element with ID exists");
			return;
		}

		obj = $('input[name=link-type-radio]:checked').val();		
		if (!obj) {
			obj = "REQUIRED";
		}
		// console.log("obj = ", obj);

	//If diagram is populated - search for overlap
	//Temporal solution: Put new element as low as possible, no packaging algorithm && elem_list["location"]
		var startElement = new VQ_Element(start_elem_id);		
		var end_elem_id = startElement.drawLinkedClass(class_name, name, line_direct, obj);

		//Remove any changes to start-state
		$('input[name=stack-radio]:checked').attr('checked', false);
		$('input[name=link-type-radio]:checked').attr('checked', false);
		var ulElements = document.getElementsByTagName("ul");
                _.each(ulElements, function(e){
                    e.style.display = 'none';
                })
		$('details').removeAttr("open");		

		return;

	},

	"click #cancel-add-link": function(e) {
		//Remove any changes to start-state
		$('input[name=stack-radio]:checked').attr('checked', false);
		$('input[name=link-type-radio]:checked').attr('checked', false);
		var ulElements = document.getElementsByTagName("ul");
                _.each(ulElements, function(e){
                    e.style.display = 'none';
                })
		$('details').removeAttr("open");
	},


});