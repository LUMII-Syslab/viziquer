import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects, Elements, Compartments, CompartmentTypes } from '/imports/db/platform/collections'
import { process_sub_compart_types } from '/imports/client/platform/templates/diagrams/dialog/subCompartments'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'
import { Utilities } from '/imports/client/platform/js/utilities/utils.js'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'
import { generateSymbolTable } from '/imports/client/custom/vq/js/transformations.js'
import { autoCompletionAddAttribute, autoCompletionCleanup } from '/imports/client/custom/vq/js/autoCompletion.js'

import { VQ_Element } from '/imports/client/custom/vq/js/VQ_Element.js';

import './add_attribute_form.html'
import { AddMergeValues2 } from './add_merge_form'

Template.AddAttribute.attrList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.linkList = new ReactiveVar([{name: "No_attribute"}]);
Template.AddAttribute.existingAttributeList = new ReactiveVar([{name: "No_attribute"}]);

Template.AddNewAttribute.alias = new ReactiveVar("");
Template.AddNewAttribute.expression = new ReactiveVar("");
Template.AddNewAttribute.requireValues = new ReactiveVar("false");
Template.AddNewAttribute.helper = new ReactiveVar("false");
Template.AddNewAttribute.attributeid = new ReactiveVar("");
Template.AddNewAttribute.selectThis = new ReactiveVar("");
Template.AddNewAttribute.showLabel = new ReactiveVar("false");
Template.AddNewAttribute.showGraph = new ReactiveVar("false");
Template.AddNewAttribute.addLabel = new ReactiveVar("false");
Template.AddNewAttribute.addAltLabel = new ReactiveVar("false");
Template.AddNewAttribute.addDescription = new ReactiveVar("false");
Template.AddNewAttribute.addNodeLevelCondition = new ReactiveVar("true");
Template.AddNewAttribute.addAttributeCondition = new ReactiveVar("false");
Template.AddNewAttribute.graphInstructionn = new ReactiveVar("");
Template.AddNewAttribute.graphh = new ReactiveVar("");
Template.AddNewAttribute.attributeConditionn = new ReactiveVar("");
Template.AddNewAttribute.attributeConditionSelectionn = new ReactiveVar("");
	
Template.AddAttribute.Count = new ReactiveVar("")
Template.AddAttribute.CountAssoc = new ReactiveVar("")
const startCount = 30;
const plusCount = 20;
const delay = ms => new Promise(res => setTimeout(res, ms));
var attributeKeyDownTimeStamp;
const delayTime = 500;

Interpreter.customMethods({
	AddAttribute: async function () {
		// attribute-to-add
		Template.AddAttribute.Count.set(startCount);
		Template.AddAttribute.CountAssoc.set(startCount);
		
		
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		 if (proj) {
			  if (proj.enableWikibaseLabelServices==true && dataShapes.schema.schemaType === 'wikidata') {
				Template.AddNewAttribute.showLabel.set(true)
			  } else {
				  Template.AddNewAttribute.showLabel.set(false)
			  };
			  if (proj.showGraphServiceCompartments==true) {
				Template.AddNewAttribute.showGraph.set(true)
			  } else {
				  Template.AddNewAttribute.showGraph.set(false)
			  };
			 
		 }

		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		var attributes = await getAttributes(null, true);
		Template.AddAttribute.attrList.set(attributes);
		
		// Template.AddAttribute.attrList.set([{name: "Waiting answer...", wait: true}]);
		
		$("#add-attribute-form").modal("show");
		
		var attributes = await getAttributes()
		// var associations = await getAssociations()
		Template.AddAttribute.attrList.set(attributes);
		
		$('input[name=stack-checkbox]').attr('checked',false);
		$('button[name=required-attribute]').html('\&nbsp;');
		$("#class-associations")[0].style.display = "none";
		$("#mySearch-attribute")[0].value = "";
		$("#more-associations-button")[0].style.display = "none";
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

	"click #ok-add-attribute": async function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			
			
			
		  var buttonn = $('button[name=required-attribute-to-add]').closest(".attribute");
		  buttonn.each(async function () {
		    
			if($(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].getAttribute("disabled") != "true"){
				var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]').attr("class");
				if(required.startsWith("fa fa-plus")) required = true;
				else if(required.startsWith("fa fa-check")) required = false;
				else return;
				var name = $(this).attr("name");
				
				if(name == "(all properties)") {
					
					var abstractS = await generateSymbolTable();
					var symbolTable = abstractS["symbolTableFull"];
					var valCount = 0;
					for(let el in symbolTable){
						if(typeof symbolTable[el] !== "function"){
							for(let s in symbolTable[el]){
								if(typeof symbolTable[el][s] !== "function" && (s == "val" || s.startsWith("val_"))) valCount++;
							}
						}
					}
					name = "?prop";
					var alias = "val";

					if(valCount > 0) {
						name = name + "_" + valCount;
						alias = alias + "_" + valCount;
					}
					
					
					vq_obj.addField(name,alias,required,false,false)
					
				} else vq_obj.addField(name,null,required,false,false);
	
				$(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].className = "button button-required";
			}
		  });
		};

		return;
	},
	
	"click #save-add-attribute": async function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
		  var buttonn = $('button[name=required-attribute-to-add]').closest(".attribute");
		  buttonn.each(async function () {
		    
			if($(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]')[0].getAttribute("disabled") != "true"){
				var required = $(this).children('label[name="add-attribute"]').children('button[name="required-attribute-to-add"]').attr("class");
				if(required.startsWith("fa fa-plus")) required = true;
				else if(required.startsWith("fa fa-check")) required = false;
				else return;
				
				var name = $(this).attr("name");
				if(name == "(all properties)") {
					name = "?prop";
					
					var abstractS = await generateSymbolTable();
					var symbolTable = abstractS["symbolTableFull"];
					var valCount = 0;
					for(let el in symbolTable){
						if(typeof symbolTable[el] !== "function"){
							for(let s in symbolTable[el]){
								if(symbolTable[el][s] !== "function" && (s == "val" || s.startsWith("val_"))) valCount++;
							}
						}
					}
					name = "?prop";
					var alias = "val";

					if(valCount > 0) {
						name = name + "_" + valCount;
						alias = alias + "_" + valCount;
					}
					
					
					vq_obj.addField(name,alias,required,false,false);
					
				} else vq_obj.addField(name,null,required,false,false);
			}
		  });
		};
		var value = $("#mySearch-attribute").val().toLowerCase();
		var attributes = await getAttributes(value);
		var associations = await getAssociations(value);
		Template.AddAttribute.attrList.set(attributes);
		Template.AddAttribute.linkList.set(associations);
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
	
	"click #show-class-associations": async function(e) {
		 var x = document.getElementById("class-associations");
		  if (x.style.display !== "none") {
			x.style.display = "none";
		  } else {
			var value = $("#mySearch-attribute").val().toLowerCase();
			var associations = await getAssociations(value)
			Template.AddAttribute.linkList.set(associations);
			x.style.display = "block";
		  }
		  var y = document.getElementById("more-associations-button");
		  if (x.style.display === "none") {
			y.style.display = "none";
		  } else if (x.style.display !== "none" && y.complete !== "true") {
			y.style.display = "block";
		  } else {
			y.style.display = "none";
		  }
		  
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
	
	"click #required-existing-attribute": async function(e) {
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") != "(select this)"){
			var act_elem = Session.get("activeElement");
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			if(typeof act_el !== 'undefined'){
				var compart = Compartments.findOne({_id: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name")});
				var attributeInformation = $(e.target).closest(".attribute")[0].childNodes[1];
			
				var prefixesValue = "";
				
				var graphInstruction = $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graphInstruction");		
				var graph = $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graph");	
		
				var graphText = "";
				if(graph != "" && graphInstruction != "" && graph != null && graphInstruction != null){
					graphText = "{" + graphInstruction + ": " + graph + "} ";
				}
						
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
				
				prefixesValue = graphText + prefixesValue;
				
				var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] == 'undefined'){
					var prefixes_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
						return sub_compart_type.name == "Prefixes";
					});
					compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] = {input: prefixesValue, value:prefixesValue}
				}
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;	
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;	
				
				var fullText = prefixesValue;
				if(attributeInformation.getAttribute("alias") != null && attributeInformation.getAttribute("alias") != "") fullText = fullText + attributeInformation.getAttribute("alias") + "<-";
				fullText = fullText + attributeInformation.getAttribute("expression");
				
				var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"), null, null, compart.subCompartments);
			}
			var value = $("#mySearch-attribute").val().toLowerCase();
			var attributes = await getAttributes(value);
			var associations = await getAssociations(value);
			Template.AddAttribute.attrList.set(attributes);
			Template.AddAttribute.linkList.set(associations);
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		}
		return;
	},
	
	"click #attribute-helper-button": async function(e) {
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") != "(select this)"){
			var act_elem = Session.get("activeElement");
			var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
			if(typeof act_el !== 'undefined'){
				var compart = Compartments.findOne({_id: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name")});
				var attributeInformation = $(e.target).closest(".attribute")[0].childNodes[1];
			
				var prefixesValue = "";
				
				var graphInstruction = $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graphInstruction");		
				var graph = $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graph");	
		
				var graphText = "";
				if(graph != "" && graphInstruction != "" && graph != null && graphInstruction != null){
					graphText = "{" + graphInstruction + ": " + graph + "} ";
				}
				
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
				
				prefixesValue = graphText + prefixesValue;
				
				var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
				
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] == 'undefined'){
					var prefixes_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
						return sub_compart_type.name == "Prefixes";
					});
					compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] = {input: prefixesValue, value:prefixesValue}
				}
				
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;	
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;	
				
				var fullText = prefixesValue;
				if(attributeInformation.getAttribute("alias") != null && attributeInformation.getAttribute("alias") != "") fullText = fullText + attributeInformation.getAttribute("alias") + "<-";
				fullText = fullText + attributeInformation.getAttribute("expression");
				
				var value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				
				Dialog.updateCompartmentValue(compart_type, fullText, value, $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"), null, null, compart.subCompartments);
			}
			var value = $("#mySearch-attribute").val().toLowerCase();
			var attributes = await getAttributes(value);
			var associations = await getAssociations(value);
			Template.AddAttribute.attrList.set(attributes);
			Template.AddAttribute.linkList.set(associations);
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
	
	
	"click #attribute-delete-button": async function(e) {
			
		var list = {compartmentId: $(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"),
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("removeCompartment", list);
		var value = $("#mySearch-attribute").val().toLowerCase();
		var attr_list = await getAttributes(value);
		var link_list = await getAssociations(value);
		Template.AddAttribute.attrList.set(attr_list);
		Template.AddAttribute.linkList.set(link_list);
		Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		
		return;
	},
	
	"keyup #mySearch-attribute": async function(e){
		attributeKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if (attributeKeyDownTimeStamp === e.timeStamp ) {
			var value = $("#mySearch-attribute").val().toLowerCase();
			var attr_list = await getAttributes(value);
			var link_list = await getAssociations(value);
			Template.AddAttribute.attrList.set(attr_list);
			Template.AddAttribute.linkList.set(link_list);
		}
		return;
	},
	
	'click #attribute-apply-button': async function(e) {
		var value = $("#mySearch-attribute").val().toLowerCase();
		var attr_list = await getAttributes(value);
		var link_list = await getAssociations(value);
		Template.AddAttribute.attrList.set(attr_list);
		Template.AddAttribute.linkList.set(link_list);
		return;
	},
	'click #dbp_for_attributes': async function(e) {
		var value = $("#mySearch-attribute").val().toLowerCase();
		var attr_list = await getAttributes(value);
		var link_list = await getAssociations(value);
		Template.AddAttribute.attrList.set(attr_list);
	},
	
	'click #more-attributes-button': async function(e) {
		var value = $("#mySearch-attribute").val().toLowerCase();
		var count = Template.AddAttribute.Count.get();
			count = count + plusCount;
			Template.AddAttribute.Count.set(count);
		var attr_list = await getAttributes(value);
		Template.AddAttribute.attrList.set(attr_list);
	},
	'click #more-associations-button': async function(e) {
		var value = $("#mySearch-attribute").val().toLowerCase();
		var count = Template.AddAttribute.CountAssoc.get();
			count = count + plusCount;
			Template.AddAttribute.CountAssoc.set(count);
		var link_list = await getAssociations(value);
		Template.AddAttribute.linkList.set(link_list);
	},
	
	
	'click #attribute-new-button': function(e) {
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.addLabel.set("false");
		Template.AddNewAttribute.addAltLabel.set("false");
		Template.AddNewAttribute.addDescription.set("false");
		Template.AddNewAttribute.addNodeLevelCondition.set("true");
		Template.AddNewAttribute.addAttributeCondition.set("false");
		Template.AddNewAttribute.graphInstructionn.set("");		
		Template.AddNewAttribute.graphh.set("");		
		Template.AddNewAttribute.attributeConditionn.set("");		
		Template.AddNewAttribute.attributeConditionSelectionn.set("");	
		Template.AddNewAttribute.helper.set("");
		Template.AddNewAttribute.selectThis.set("");
		Template.AddNewAttribute.attributeid.set("newAttribute");
		
		autoCompletionCleanup();
		document.getElementById("add-new-attribute-form").style.zIndex = "1051";

		$("#add-new-attribute-form").modal("show");
		return;
	},
	
	'click #attribute-extra-button': function(e) {
		
		Template.AddNewAttribute.alias.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("alias"));
		Template.AddNewAttribute.expression.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression"));
			
		Template.AddNewAttribute.requireValues.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("requireValues"));
		Template.AddNewAttribute.helper.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("helper"));		
		Template.AddNewAttribute.attributeid.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("name"));		
		Template.AddNewAttribute.addDescription.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("addDescription"));		
		Template.AddNewAttribute.addNodeLevelCondition.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("addNodeLevelCondition"));		
		Template.AddNewAttribute.addAttributeCondition.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("addAttributeCondition"));		
		Template.AddNewAttribute.addLabel.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("addLabel"));		
		Template.AddNewAttribute.addAltLabel.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("addAltLabel"));		
		Template.AddNewAttribute.graphInstructionn.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graphInstruction"));		
		Template.AddNewAttribute.graphh.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("graph"));		
		Template.AddNewAttribute.attributeConditionn.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("attributeCondition"));		
		Template.AddNewAttribute.attributeConditionSelectionn.set($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("attributeConditionSelection"));		
		var selectThis = "";
		if($(e.target).closest(".attribute")[0].childNodes[1].getAttribute("expression") == "(select this)")selectThis = "disabled";
		Template.AddNewAttribute.selectThis.set(selectThis);

		autoCompletionCleanup();
		document.getElementById("add-new-attribute-form").style.zIndex = "1051";
		
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
	
	addLabel: function() {
		return Template.AddNewAttribute.addLabel.get();
	},
	addAltLabel: function() {
		return Template.AddNewAttribute.addAltLabel.get();
	},
	addDescription: function() {
		return Template.AddNewAttribute.addDescription.get();
	},
	addNodeLevelCondition: function() {
		return Template.AddNewAttribute.addNodeLevelCondition.get();
	},
	addAttributeCondition: function() {
		return Template.AddNewAttribute.addAttributeCondition.get();
	},
	
	showLabel: function() {
		return Template.AddNewAttribute.showLabel.get();
	},
	showGraph: function() {
		return Template.AddNewAttribute.showGraph.get();
	},
	
	graphInstruction: function() {
		return Template.AddNewAttribute.graphInstructionn.get();
	},
	graph: function() {
		return Template.AddNewAttribute.graphh.get();
	},
	attributeCondition: function() {
		return Template.AddNewAttribute.attributeConditionn.get();
	},
	attributeConditionSelection: function() {
		return Template.AddNewAttribute.attributeConditionSelectionn.get();
	},
	
	field_obj: function() {
		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		//var compart_type_id = $(this).$(".multi-field").attr("id");
		//var compart_type_id = Session.get("multiRowCompartmentTypeId");

		var compart_type_id = data_in["compartmentTypeId"];
		var compart = Compartments.findOne({_id: Session.get("multFieldCompartmentId")});

		var fields = [];

		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		if (!compart_type) {
			return {fields: fields};
		}

		var sub_compartment;
		var compart_id;
		if (compart) {
			sub_compartment = compart["subCompartments"][compart_type["name"]];
			compart_id = compart["_id"];
		}

		process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);
		let require = false;
		for (let field = 0; field < fields.length; field++) {
			fields[field][fields[field]["name"].replace(/\s/g, '').replace(/-/g, '')] = true;
			if(fields[field]["name"] == "Require Values" && fields[field]["checked"] == true) require = true;
			if(fields[field]["name"] == "Node-level Condition" && typeof compart_id === "undefined") fields[field]["checked"] = true;
			if(fields[field]["name"] == "Node-level Condition" && require == true) fields[field]["isdisabled"] = "disabled";
			if(fields[field]["name"] == "Attribute Condition" && require == true) fields[field]["isdisabled"] = "disabled";
		}
		
		
		var field_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["name"],
						label: compart_type["label"],
						fields: fields,
					};
		Template.AddNewAttribute.attributeid.set("newAttribute");
		return field_obj;
	},
});

Template.AddNewAttribute.events({
	
	
	"click #add-new-attribute-condition": function() {
		if(document.getElementById("add-new-attribute-condition").checked == true) {
			$('#add-new-node-level-condition').prop('checked', false);
			$('#add-new-node-level-condition').prop('field_value', false);
		}
	},
	
	"click #add-new-node-level-condition": function() {
		if(document.getElementById("add-new-node-level-condition").checked == true) {
			$('#add-new-attribute-condition').prop('checked', false);
			$('#add-new-attribute-condition').prop('field_value', false);
		}
	},
	
	"click #add-new-attribute-requireValues": function() {
		if(document.getElementById("add-new-attribute-requireValues").checked == true) {
			document.getElementById("add-new-attribute-condition").setAttribute('disabled', '');
			document.getElementById("add-new-node-level-condition").setAttribute('disabled', '');
		} else {
			document.getElementById("add-new-attribute-condition").removeAttribute('disabled');
			document.getElementById("add-new-node-level-condition").removeAttribute('disabled');
		}
	},
	
	"click #merge-values-attribute": function(e) {
		AddMergeValues2(e);
	},
	

	"click #ok-add-new-attribute": async function(e, t) {
		var elem = document.getElementById("add-new-attribute-form");
		var selected_elem_id = Session.get("activeElement");
		var act_el = Elements.findOne({_id: selected_elem_id}); 
		if(elem.getAttribute("compartmentId") === null){
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			//Read user's choise
			  var vq_obj = new VQ_Element(selected_elem_id);
			
			};
		}
		
		
		var alias = document.getElementById("add-new-attribute-alias").value;
		var expression = document.getElementById("add-new-attribute-expression").value;
		var requireValues = document.getElementById("add-new-attribute-requireValues").checked ;
		var helper = document.getElementById("add-new-attribute-helper").checked ;
		var addLabel = "";
		var addAltLabel = "";
		var addDescription = "";
		var addNodeLevelCondition = "";
		var addAttributeCondition = "";
		var selectionCondition = "";
		var requiredCondition = "";
		var graph = "";
		var graphInstruction = "";
		
		
		if(document.getElementById("add-new-attribute-add-label") != null) addLabel = document.getElementById("add-new-attribute-add-label").checked;
		if(document.getElementById("add-new-attribute-add-alt-label") != null) addAltLabel = document.getElementById("add-new-attribute-add-alt-label").checked;
		if(document.getElementById("add-new-attribute-add-description") != null) addDescription = document.getElementById("add-new-attribute-add-description").checked;
		if(document.getElementById("add-new-node-level-condition") != null) addNodeLevelCondition = document.getElementById("add-new-node-level-condition").checked;
		if(document.getElementById("add-new-attribute-condition") != null) addAttributeCondition = document.getElementById("add-new-attribute-condition").checked;
		if(document.getElementById("add-new-attribute-selection-condition") != null) selectionCondition = document.getElementById("add-new-attribute-selection-condition").value;
		// if(document.getElementById("add-new-attribute-required-condition") != null) requiredCondition = document.getElementById("add-new-attribute-required-condition").value;
		if(document.getElementById("add-new-attribute-graph") != null) graph = document.getElementById("add-new-attribute-graph").value;
		if(document.getElementById("add-new-attribute-graph-instruction") != null) graphInstruction = document.getElementById("add-new-attribute-graph-instruction").value;
		
		var fullText = "";
		
		var prefixesValue = "";
		if(helper == true) prefixesValue = "h";
		if(requireValues == true) prefixesValue = prefixesValue + "+";
		if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
		
		var graphText = "";
		if(graph != "" && graphInstruction != ""){
			graphText = "{" + graphInstruction + ": " + graph + "} ";
		}
		
		prefixesValue = graphText + prefixesValue;
				
		fullText = prefixesValue;
		if(alias != null && alias != "") fullText = fullText + alias + "<-";
		fullText = fullText + expression;
		
		if(addLabel == true){
			fullText = fullText + " {+label}";
		}
		
		if(addAltLabel == true){
			fullText = fullText + " {+altLabel}";
		}
		
		if(addDescription == true){
			fullText = fullText + " {+description}";
		}
		
		if(selectionCondition != ""){
			fullText = fullText + " ";
			if(addAttributeCondition == true)  fullText = fullText + "@";
			fullText = fullText + "{" + selectionCondition + "}";
		}
		
		// if(requiredCondition != ""){
			// fullText = fullText + " !{" + requiredCondition + "}";
		// }
		
		var elem = document.getElementById("add-new-attribute-form");
		

		if(elem.getAttribute("compartmentId") === null && document.getElementById("add-new-attribute-id").getAttribute("attributeid") == "newAttribute"){

			var selected_elem_id = Session.get("activeElement");
			if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
				var vq_obj = new VQ_Element(selected_elem_id);
				vq_obj.addField(expression,alias,requireValues,false,helper,addLabel,addAltLabel,addDescription,graph,graphInstruction,selectionCondition,addAttributeCondition,addNodeLevelCondition);
			};
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		} else {
			
			var attribute = document.getElementsByName(document.getElementById("add-new-attribute-id").getAttribute("attributeid"))[0];
			if(typeof attribute !== "undefined"){
				attribute.setAttribute("alias", alias);
				attribute.setAttribute("expression", expression);
				attribute.setAttribute("requireValues", requireValues);
				attribute.setAttribute("helper", helper);
				attribute.setAttribute("addLabel", addLabel);
				attribute.setAttribute("addAltLabel", addAltLabel);
				attribute.setAttribute("addDescription", addDescription);
				attribute.setAttribute("addNodeLevelCondition", addNodeLevelCondition);
				attribute.setAttribute("addAttributeCondition", addAttributeCondition);
				attribute.setAttribute("selectionCondition", selectionCondition);
				// attribute.setAttribute("requiredCondition", requiredCondition);
				attribute.setAttribute("graph", graph);
				attribute.setAttribute("graphInstruction", graphInstruction);
			}
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
				compart.subCompartments["Attributes"]["Attributes"]["Add Label"]["input"] = addLabel.toString() ;
				compart.subCompartments["Attributes"]["Attributes"]["Add AltLabel"]["input"] = addAltLabel.toString() ;
				compart.subCompartments["Attributes"]["Attributes"]["Add Description"]["input"] = addDescription.toString() ;
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["AttributeConditionSelection"] !== "undefined")compart.subCompartments["Attributes"]["Attributes"]["AttributeConditionSelection"]["input"] = selectionCondition;
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["Attribute Condition"] !== "undefined")compart.subCompartments["Attributes"]["Attributes"]["Attribute Condition"]["input"] = addAttributeCondition.toString();
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["Node-level Condition"] !== "undefined")compart.subCompartments["Attributes"]["Attributes"]["Node-level Condition"]["input"] = addNodeLevelCondition.toString();
				// compart.subCompartments["Attributes"]["Attributes"]["AttributeCondition"]["input"] = requiredCondition;
				compart.subCompartments["Attributes"]["Attributes"]["Graph"]["input"] = graph;
				compart.subCompartments["Attributes"]["Attributes"]["Graph instruction"]["input"] = graphInstruction;
				
				if(typeof compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] == 'undefined'){
					var prefixes_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
						return sub_compart_type.name == "Prefixes";
					});
					compart.subCompartments["Attributes"]["Attributes"]["Prefixes"] = {input: prefixesValue, value:prefixesValue}
				}

				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;
				compart.subCompartments["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;
				Dialog.updateCompartmentValue(compart_type, fullText, value, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
			}
			var value = $("#mySearch-attribute").val().toLowerCase();
			var attributes = await getAttributes(value);
			var associations = await getAssociations(value);
			Template.AddAttribute.attrList.set(attributes);
			Template.AddAttribute.linkList.set(associations);
			Template.AddAttribute.existingAttributeList.set(getExistingAttributes());
		}
		
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
		Template.AddNewAttribute.addLabel.set("false");
		Template.AddNewAttribute.addAltLabel.set("false");
		Template.AddNewAttribute.addDescription.set("false");
		Template.AddNewAttribute.addNodeLevelCondition.set("true");
		Template.AddNewAttribute.addAttributeCondition.set("false");
		Template.AddNewAttribute.graphInstructionn.set("");		
		Template.AddNewAttribute.graphh.set("");		
		Template.AddNewAttribute.attributeConditionn.set("");		
		Template.AddNewAttribute.attributeConditionSelectionn.set("");
			
		document.getElementById("add-new-attribute-alias").value = "";
		document.getElementById("add-new-attribute-expression").value = "";
		document.getElementById("add-new-attribute-requireValues").checked = false;
		document.getElementById("add-new-attribute-helper").checked = false;
		if(document.getElementById("add-new-attribute-add-label") != null)document.getElementById("add-new-attribute-add-label").checked = false;
		if(document.getElementById("add-new-attribute-add-alt-label") != null)document.getElementById("add-new-attribute-add-alt-label").checked = false;
		if(document.getElementById("add-new-attribute-add-description") != null)document.getElementById("add-new-attribute-add-description").checked = false;
		if(document.getElementById("add-new-node-level-condition") != null) document.getElementById("add-new-node-level-condition").checked = true;
		if(document.getElementById("add-new-attribute-condition") != null) document.getElementById("add-new-attribute-condition").checked = false;
		if(document.getElementById("add-new-attribute-graph") != null)document.getElementById("add-new-attribute-graph").value = "";
		if(document.getElementById("add-new-attribute-graph-instruction") != null)document.getElementById("add-new-attribute-graph-instruction").value = "";
		if(document.getElementById("add-new-attribute-selection-condition") != null)document.getElementById("add-new-attribute-selection-condition").value = "";
		if(document.getElementById("add-new-attribute-required-condition") != null)document.getElementById("add-new-attribute-required-condition").value = "";
		
		document.getElementById("more-condition-options-node").style.display = "none";
		document.getElementById("more-condition-options").style.display = "none";
	
		return;
	},
	
	"click #cancel-add-new-attribute": function(e) {
		Template.AddNewAttribute.alias.set("");
		Template.AddNewAttribute.expression.set("");
		Template.AddNewAttribute.requireValues.set("");
		Template.AddNewAttribute.helper.set("");
		Template.AddNewAttribute.addLabel.set("false");
		Template.AddNewAttribute.addAltLabel.set("false");
		Template.AddNewAttribute.addDescription.set("false");
		Template.AddNewAttribute.addNodeLevelCondition.set("true");
		Template.AddNewAttribute.addAttributeCondition.set("false");
		Template.AddNewAttribute.graphInstructionn.set("");		
		Template.AddNewAttribute.graphh.set("");		
		Template.AddNewAttribute.attributeConditionn.set("");		
		Template.AddNewAttribute.attributeConditionSelectionn.set("");
			
		document.getElementById("add-new-attribute-alias").value = "";
		document.getElementById("add-new-attribute-expression").value = "";
		document.getElementById("add-new-attribute-requireValues").checked = false;
		document.getElementById("add-new-attribute-helper").checked = false;
		
		if(document.getElementById("add-new-attribute-add-label") != null)document.getElementById("add-new-attribute-add-label").checked = false;
		if(document.getElementById("add-new-attribute-add-alt-label") != null)document.getElementById("add-new-attribute-add-alt-label").checked = false;
		if(document.getElementById("add-new-attribute-add-description") != null)document.getElementById("add-new-attribute-add-description").checked = false;
		if(document.getElementById("add-new-node-level-condition") != null) document.getElementById("add-new-node-level-condition").checked = true;
		if(document.getElementById("add-new-attribute-condition") != null) document.getElementById("add-new-attribute-condition").checked = false;
		if(document.getElementById("add-new-attribute-graph") != null)document.getElementById("add-new-attribute-graph").value = "";
		if(document.getElementById("add-new-attribute-graph-instruction") != null)document.getElementById("add-new-attribute-graph-instruction").value = "";
		if(document.getElementById("add-new-attribute-selection-condition") != null)document.getElementById("add-new-attribute-selection-condition").value = "";
		if(document.getElementById("add-new-attribute-required-condition") != null)document.getElementById("add-new-attribute-required-condition").value = "";
		
		document.getElementById("more-condition-options-node").style.display = "none";
		document.getElementById("more-condition-options").style.display = "none";
		
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
		Template.AddNewAttribute.addLabel.set("false");
		Template.AddNewAttribute.addAltLabel.set("false");
		Template.AddNewAttribute.addDescription.set("false");
		Template.AddNewAttribute.addNodeLevelCondition.set("true");
		Template.AddNewAttribute.addAttributeCondition.set("false");
		Template.AddNewAttribute.graphInstructionn.set("");		
		Template.AddNewAttribute.graphh.set("");		
		Template.AddNewAttribute.attributeConditionn.set("");		
		Template.AddNewAttribute.attributeConditionSelectionn.set("");
	},
	
	'click #more-options-attribute-button': function(e) {
		if(document.getElementById("more-condition-options").style.display == "none") document.getElementById("more-condition-options").style.display = "block";
		else document.getElementById("more-condition-options").style.display = "none";
		
		if(document.getElementById("more-condition-options-node").style.display == "none") document.getElementById("more-condition-options-node").style.display = "block";
		else document.getElementById("more-condition-options-node").style.display = "none";
		return;
	},
});

function formParams(vq_obj, propertyKind, filter, limit) {

	var param = {propertyKind: propertyKind};	
	if (filter != null) param["filter"] = filter;
	if (limit != null) param["limit"] = limit;
	var value = $("#mySearch-attribute").val()
	if ( $("#dbp_for_attributes").is(":checked") ) {
		param.basicOrder = true;
	}
	
	return param;
}

async function getAttributes(filter, waiting){
	var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			
			var attr_list = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);

			if(vq_obj.isUnit() != true && vq_obj.isUnion() != true) attr_list.push({name:"(select this)"});
			
			var abstractS = await generateSymbolTable();
			var symbolTable = abstractS["symbolTable"];
			
			if(vq_obj.isUnit() != true && vq_obj.isUnion() != true) attr_list.push({name:"(all properties)"});
			
			attr_list.push({separator:"line"});
			if(waiting == null){
				for (var  key in symbolTable) {	
					for (var symbol in symbolTable[key]) {
						if(typeof symbolTable[key][symbol] !== "function" && symbolTable[key][symbol]["context"] != selected_elem_id){
							if(symbolTable[key][symbol]["upBySubQuery"] == 1 && (typeof symbolTable[key][symbol]["distanceFromClass"] === "undefined" || symbolTable[key][symbol]["distanceFromClass"] <= 1 )){
								attr_list.push({name: key});	
							}
						}
					}	
				}
				
				if((vq_obj.isUnit() != true && vq_obj.isUnion() != true) || !vq_obj.isRoot()) {
				
					attr_list.push({separator:"line"});

					var param = formParams(vq_obj, 'Data', filter,Template.AddAttribute.Count.get());
					
					var newStartElement = vq_obj;
					if ((vq_obj.isUnion() || vq_obj.isUnit()) && !vq_obj.isRoot()) { // [ + ] element, that has link to upper class 
						if (vq_obj.getLinkToRoot()){
							var element = vq_obj.getLinkToRoot().link.getElements();
							if (vq_obj.getLinkToRoot().start) {
								newStartElement = new VQ_Element(element.start.obj._id);
							} else {
								newStartElement = new VQ_Element(element.end.obj._id);						
							}						
						}					
					} 

					var prop = await dataShapes.getProperties(param, newStartElement);

					if(prop["complete"] == true) $("#more-attributes-button")[0].style.display = "none";
					else $("#more-attributes-button")[0].style.display = "block";
					
					prop = prop["data"];
					
					// var proj = Projects.findOne({_id: Session.get("activeProject")});
					var schemaName = dataShapes.schema.schemaType;
					if(typeof schemaName === "undefined") schemaName = "";
					// if (proj) {
						// if (proj.schema) {
							// schemaName = proj.schema;
						// };
					// }
					
					for(let cl in prop){
						if(typeof prop[cl] !== "function"){
							var prefix;
							if((prop[cl]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
								|| (schemaName.toLowerCase() == "wikidata" && prop[cl]["prefix"] == "wdt"))prefix = "";
							else prefix = prop[cl]["prefix"]+":";
							attr_list.push({name: prefix+prop[cl]["display_name"]})
						}
					}
				}
			} else {
				attr_list.push({name: "Waiting answer...", wait: true});
			}
			
			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
			var field_list = vq_obj.getFields();
			attr_list = attr_list.map(function(attr) {
				var disabled = false;
				var buttonClassName = "button button-required";
				//for(var field in field_list){
				for (let field = 0; field < field_list.length; field++) {
					if(field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {
						disabled = true; 
						if(field_list[field]["requireValues"] == true) buttonClassName = "fa fa-plus button button-required";
						else buttonClassName = "fa fa-check button button-required";
						break;
					}
					
					if(attr.name == "(all properties)" && field_list[field]["exp"].startsWith("?")){
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

async function getAssociations(filter){
	var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			
			var vq_obj = new VQ_Element(selected_elem_id);
			
				
			var param = formParams(vq_obj, 'Object', filter, Template.AddAttribute.CountAssoc.get());
			
			var newStartElement = vq_obj;
			if ((vq_obj.isUnion() || vq_obj.isUnit()) && !vq_obj.isRoot()) { // [ + ] element, that has link to upper class 
				if (vq_obj.getLinkToRoot()){
					var element = vq_obj.getLinkToRoot().link.getElements();
					if (vq_obj.getLinkToRoot().start) {
						newStartElement = new VQ_Element(element.start.obj._id);
        			} else {
        				newStartElement = new VQ_Element(element.end.obj._id);						
        			}						
				}					
			} 

			var prop = await dataShapes.getProperties(param, newStartElement);
			
			if(prop["complete"] == true) {
				$("#more-associations-button")[0].complete = "true";
				$("#more-associations-button")[0].style.display = "none";
			}
			else {
				$("#more-associations-button")[0].complete = "false";
			}
			
			prop = prop["data"];
			
			var schemaName = dataShapes.schema.schemaType;
			if(typeof schemaName === "undefined") schemaName = "";

			
			for(let cl in prop){
				if(typeof prop[cl] !== "function"){
					var prefix;
					if((prop[cl]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
						|| (schemaName.toLowerCase() == "wikidata" && prop[cl]["prefix"] == "wdt"))prefix = "";
					else prefix = prop[cl]["prefix"]+":";
					attr_list.push({name: prefix+prop[cl]["display_name"]})
				}
			}
		
			//remove duplicates
			attr_list = attr_list.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['name'] === obj['name'] });
			});
			
			var field_list = vq_obj.getFields();
			attr_list = attr_list.map(function(attr) {
				var disabled = false;
				var buttonClassName = "button button-required";
				for(let field in field_list){
					if(typeof field_list[field] !== "function" && field_list[field]["exp"] == attr.name && (typeof field_list[field]["alias"] === "undefined" || field_list[field]["alias"] == "")) {
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
			
			var addLabel = "false";
			if(f.addLabel == true) {
				addLabel = "checked";
				fulltext = fulltext + " {+label}";
			}
			var addAltLabel = "false";
			if(f.addAltLabel == true) {
				addAltLabel = "checked";
				fulltext = fulltext + " {+altLabel}";
			}
			var addDescription = "false";
			if(f.addDescription == true) {
				addDescription = "checked";
				fulltext = fulltext + " {+description}";
			}
			if(typeof f.attributeConditionSelection !== "undefined" && f.attributeConditionSelection != "") {
				fulltext = fulltext + " {" + f.attributeConditionSelection + "}";
			}
			
			// if(typeof f.attributeCondition !== "undefined" && f.attributeCondition != "") {
				// fulltext = fulltext + " !{" + f.attributeCondition + "}";
			// }
			
			
			var disabled = "";
			if(f.exp == "(select this)") disabled = "disabled";

			return {name:f.exp, requireValues: r, fulltext:fulltext, al:al, hel:hide, id:f._id, disabled:disabled, addLabel:addLabel, addAltLabel:addAltLabel, addDescription:addDescription, attributeCondition:f.attributeCondition, attributeConditionSelection:f.attributeConditionSelection, graph:f.graph, graphInstruction:f.graphInstruction}});
		return field_list;
	}
	return [];
}
