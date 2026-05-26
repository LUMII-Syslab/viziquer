import { Template } from 'meteor/templating';
import { Interpreter } from '../../../../client/lib/interpreter.js'
import { Projects, Elements, DiagramTypes, ElementTypes } from '../../../../db/platform/collections.js'

import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'

import './add_link_form.html'
import { Create_VQ_Element_Async, createVQ_Element, Create_Any_VQ_Element_Async } from '../js/VQ_Element.js'
import { autoCompletionCleanup, autoCompletionAddLink } from '../js/autoCompletion.js'
import { getClassListFromString } from '../js/generateSPARQL_jo.js'

import { getSchemaNameForElement } from '../../../../custom/vq/client/js/transformations.js'
import { computeOrthogonalLinePointsFromBoxes } from '../../../../platform/client/js/editor/ajooEditor/ajoo/Elements/Lines/draw_new_line.js'

const delay = ms => new Promise(res => setTimeout(res, ms));
const delayTime = 500;
var linkKeyDownTimeStamp;

Template.AddLink.isDataSchema = new ReactiveVar(false);

Interpreter.customMethods({
	AddLink: async function () {
		Interpreter.destroyErrorMsg();
		var asc = [];


		var start_elem_id = Session.get("activeElement");
		var currentElement = await createVQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about its links";
		const elemName = await currentElement.getName();
		if(currentElement !== null && elemName !== null && elemName !== "")
		{
			joinLinkDesc = "join information from "+elemName+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about its links";
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
		const associations = await getAllAssociations();
		for (let a of associations) {
			asc.push(
				{
					name: a.name,
					class: a.class,
					text: a.text,
					type: a.type,
					card: a.card,
					clr: a.clr,
					show: true,
					isDataSchema: Template.AddLink.isDataSchema.get(),
					is: a.is,
					of: a.of
				}
			);
		}

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
		var currentElement = await createVQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
		const elemName = await currentElement.getName();
		if(currentElement !== null && elemName != null && elemName != "")
		{
			joinLinkDesc = "join information from "+elemName+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about links";
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

		const associations = await getAllAssociations();
    for (let a of associations) {
      asc.push({
        name: a.name,
        class: a.class,
        text: a.text,
        type: a.type,
        card: a.card,
        clr: a.clr,
        show: true,
        is: a.is,
        of: a.of
      });
    }

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
		var currentElement = await createVQ_Element(start_elem_id);
		var joinLinkDesc = "join information from the host node and the linked node";
		var subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
		const elemName = await currentElement.getName();
		if(currentElement !== null && elemName != null && elemName != "")
		{
			joinLinkDesc = "join information from "+elemName+" and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about links";
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


		const associations = await getAllAssociations();
		for (let a of associations) {
			asc.push({
				name: a.name,
				class: a.class,
				text: a.text,
				type: a.type,
				card: a.card,
				clr: a.clr,
				show: true,
				filteredClasses: a.filteredClasses,
				is: a.is,
				of: a.of
			});
		}

		Template.AddLink.fullList.set(asc);
	},

	AddUnion: async function () {
		//console.log("AddUnion");
		var currentVQElment = await createVQ_Element(Session.get("activeElement"));
		if (!(await currentVQElment.isClass())){
			console.log("Selected element is not a class");
			return;
		}
		var d = 30; //distance between boxes
        var oldPosition = await currentVQElment.getCoordinates(); //Old class coordinates and size
        var newPosition = await currentVQElment.getNewLocation(d); //New class coordinates and size {x: x, y: y1, width: w, height: h}
        newPosition.width = 75;
        newPosition.height = 50;
        //Link Coordinates
        var coordX = newPosition.x + Math.round(newPosition.width/2);
        var coordY = oldPosition.y + oldPosition.height;
        var locLink = [];


		const cl = await Create_VQ_Element_Async(newPosition);
		await cl.setName("[ + ]");

		const proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });
		await cl.setClassStyle("condition");

		locLink = [coordX, coordY, coordX, newPosition.y];

		const lnk = await Create_VQ_Element_Async(locLink, true, currentVQElment, cl);
		await lnk.setName("++");
		await lnk.setLinkType("REQUIRED");
		await lnk.setNestingType("PLAIN");

		// if (proj && proj.autoHideDefaultPropertyName === true) {
			// await lnk.hideDefaultLinkName(true); // assuming it's async now
			// lnk.setHideDefaultLinkName("true");
		// }

		Template.AggregateWizard.endClassId.set(cl.obj._id);

        // Create_VQ_Element(function(cl){
            // cl.setName("[ + ]");
            // var proj = Projects.findOne({_id: Session.get("activeProject")});
            // cl.setClassStyle("condition");
        	// locLink = [coordX, coordY, coordX, newPosition.y];
            // Create_VQ_Element(function(lnk) {
                // lnk.setName("++");
                // lnk.setLinkType("REQUIRED");
                // lnk.setNestingType("PLAIN");
				// if (proj && proj.autoHideDefaultPropertyName==true) {
					// lnk.hideDefaultLinkName(true);
					// lnk.setHideDefaultLinkName("true");
				// }
            // }, locLink, true, currentVQElment, cl);
            // Template.AggregateWizard.endClassId.set(cl.obj._id);
        // }, newPosition);
	},

	AddLinkForSchema: async function () {
		Template.AddLink.isDataSchema.set(true);
		Interpreter.destroyErrorMsg();

		var start_elem_id = Session.get("activeElement");
		var currentElement = await createVQ_Element(start_elem_id);
		currentElement.setVirtualRoot(true);
		var currentElementName = await currentElement.getName();
		document.getElementById("modal-title").textContent = `Add link for class: ${currentElementName}`;

		Template.AddLink.Count.set(startCount);
		const associations = await getAllAssociations();
		asc = [];
		for (let a of associations) {
			asc.push(
				{
					name: a.name,
					class: a.class,
					text: a.text,
					type: a.type,
					card: a.card,
					clr: a.clr,
					show: true,
					isDataSchema: true,
					filteredClasses: a.filteredClasses,
					is: a.is,
					of: a.of
				}
			);
		}

		Template.AddLink.fullList.set(asc);

		const properties = dataShapes.schema.diagram.properties;
		selectedProperties = properties;
		Template.AddLink.Properties.set(properties);
		Template.AddLink.PropCount.set(properties.length);
		Template.AddLink.PropCountRest.set(0);
		Template.AddLink.RestProperties.set([]);

		$("#add-link-form").modal("show");
	},

})
// actual lists
var selectedProperties = [];
var restProperties = [];
// UI
Template.AddLink.Properties = new ReactiveVar([]);
Template.AddLink.PropCount = new ReactiveVar("");
Template.AddLink.RestProperties = new ReactiveVar([]);
Template.AddLink.PropCountRest = new ReactiveVar('');
Template.AddLink.JoinLinkText = new ReactiveVar("")
Template.AddLink.SubqueryLinkText = new ReactiveVar("")
Template.AddLink.Count = new ReactiveVar("")
Template.AddLink.ShowMore = new ReactiveVar(true);
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
	isDataSchema: function () {
		return Template.AddLink.isDataSchema.get();
	},
	properties: function () {
		return Template.AddLink.Properties.get();
	},
	propCount: function () {
		return Template.AddLink.PropCount.get();
	},
	restProperties: function () {
		return Template.AddLink.RestProperties.get();
	},
	propCountRest: function() {
		return Template.AddLink.PropCountRest.get();
	},
	showMore: function() {
		return Template.AddLink.ShowMore.get();
	},
});

var currentExpandedAssociation;
Template.SelectTargetClass.classes = new ReactiveVar("")
Template.SelectTargetClass.isDataSchema = new ReactiveVar(false);

Template.SelectTargetClass.helpers({

	classes: function(){
		return Template.SelectTargetClass.classes.get();
	},
	isDataSchema: function () {
		return Template.SelectTargetClass.isDataSchema.get();
	}
});

Template.SelectTargetClass.events({

	"keyup #class-search": async function(){
		var f = $("#class-search").val().toLowerCase();
		$('[name=class-list-radio]').removeAttr('checked');

		var obj = $('input[name=link-list-radio]:checked').closest(".association");
		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");

		let scName = await getSchemaNameForElement(null, Template.SelectTargetClass.isDataSchema.get());
		let schemaName = dataShapes.schema.schema;
		if(typeof scName !== "undefined" && scName !== null && scName !== "") {
			schemaName = scName;
		}

		if(typeof schemaName === "undefined") schemaName = "";

		var params = {};
		var start_elem_id = Session.get("activeElement");
		var startElement = await createVQ_Element(start_elem_id);
		var startElementName = await startElement.getName();
		var startElementAlias = await startElement.getInstanceAlias();

		if(schemaName.toLowerCase() === "wikidata"  && typeof startElementName != "undefined" && startElementName !== null && startElementName != "" && ((startElementName.startsWith("[") && startElementName.endsWith("]")) || startElementName.indexOf(":") === -1)) startElementName = "wd:"+startElementName;
		if(schemaName.toLowerCase() === "wikidata"  && ((name.startsWith("[") && name.endsWith("]")) || name.indexOf(":") === -1)) name = "wdt:"+name;
			if(line_direct === "=>") {
				let elementParams = [{"name": name, "type": "in",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					let cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30,  "filter": f},
					"element": {"pList": {"in": elementParams}}
				}

			} else {
				let elementParams = [{"name": name, "type": "out",}]
				if(typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if(typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != ""){
					let cls = dataShapes.getIndividualName(startElementAlias);
					if(cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": {"limit": 30,  "filter": f},
					"element": {"pList": {"out": elementParams}}
				}

			}
		if(typeof schemaName === "undefined" && schemaName !== null && schemaName !== null && dataShapes.schema.schema !== schemaName) params.main.schema = schemaName;
		var classes = await dataShapes.getClassesFull(params);
		classes = classes.data;

		if(typeof schemaName === "undefined") schemaName = "";

		for (let e of classes) {
      let prefix;
      if (
        dataShapes.schema.schema === schemaName &&
        (e.is_local === true || e.prefix === "" || (schemaName.toLowerCase() === "wikidata" && e.prefix === "wd"))
      ) {
        prefix = "";
      } else {
        prefix = e.prefix + ":";
      }

      e.short_class_name = prefix + e.display_name;

      if (e.principal_class === 2) {
        e.clr = "color: purple";
      } else if (e.principal_class === 0) {
        e.clr = "color: #C5C5C5";
      } else {
        e.clr = "color: #777777";
      }
  }

		Template.SelectTargetClass.classes.set(classes);
	},

	"click #ok-select-class": function (e) {
		let selectedValues = [];
		const isDataSchema = Template.SelectTargetClass.isDataSchema.get();

		if (isDataSchema) {
			selectedValues = $('input[name="class-list-checkbox"]:checked').map(function () {
				return $(this).val();
			}).get();
		} else {
			let val = $('input[name="class-list-radio"]:checked').val();
			if (val) selectedValues.push(val);
		}

		var clazz = selectedValues.length > 0 ? selectedValues.join(", ") : undefined;
		if (typeof clazz !== "undefined") {

			var obj = currentExpandedAssociation;
			if (clazz === "(no_class)") {
				obj.attr("className", "");
				obj.find('.targetClass')[0].innerHTML = "";
			} else {
				obj.attr("className", clazz);
				obj.find('.targetClass')[0].innerHTML = clazz;
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
		const associations = await getAllAssociations();

		for (let a of associations) {
			asc.push({
				name: a.name,
				class: a.class,
				text: a.text,
				type: a.type,
				card: a.card,
				clr: a.clr,
				show: true,
				filteredClasses: a.filteredClasses,
				isDataSchema: Template.AddLink.isDataSchema.get(),
				is: a.is,
				of: a.of
			});
		}

		Template.AddLink.fullList.set(asc);

		// Template.AddLink.fullList.set(await getAllAssociations());
	},

	"click #ok-add-link": async function () {
		if (Template.AddLink.isDataSchema.get()) {
			addNewLinksForDataSchema();
			return;
		}
		//Read user's choise
		var obj = $('input[name=link-list-radio]:checked').closest(".association");
		var linkType = $('input[name=type-radio]:checked').val();

		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");

		$("div[id=errorField]").remove();

        if (!name || name === "") {
        	var value = $("#mySearch").val();
        	if (!value){
	            console.log("Choose valid link");
	            $(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link</div>");
	        } else {
	        	Template.AddLink.fullList.set(await getAllAssociations());
	        	$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link. <br> Path deffinition will be added later</div>");
	        }
        } else {
			$("#add-link-form").modal("hide");
			//start_elem
			var start_elem_id = Session.get("activeElement");
			Template.AggregateWizard.startClassId.set(start_elem_id);
			// var elem_start = Elements.findOne({_id: start_elem_id});

			var currentElement = await createVQ_Element(start_elem_id);
			if (currentElement === null) {
				console.log("Unknown error - active element does not exist.");
				return;
			}

            var d = 30; //distance between boxes
            var oldPosition = await currentElement.getCoordinates(); //Old class coordinates and size
            var newPosition = await currentElement.getNewLocation(d); //New class coordinates and size
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

			const cl = await Create_VQ_Element_Async(newPosition);
			await cl.setName(class_name);

			const proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });

			if (typeof class_name !== "undefined" && class_name != null && class_name.trim() !== "") {
				await cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
			}

			await cl.setClassStyle("condition");

			if (line_direct === "=>") {
				locLink = [coordX, coordY, coordX, newPosition.y];
				const lnk = await Create_VQ_Element_Async(locLink, true, currentElement, cl);

				await lnk.setName(name);
				if (document.getElementById("linked-instance-exists").checked === true)
					await lnk.setLinkType("FILTER_EXISTS");
				else
					await lnk.setLinkType("REQUIRED");

				if (linkType === "JOIN")
					await lnk.setNestingType("PLAIN");
				else if (linkType === "NESTED")
					await lnk.setNestingType("SUBQUERY");

				// if (proj && proj.autoHideDefaultPropertyName === true) {
					// await lnk.hideDefaultLinkName(true);
					// lnk.setHideDefaultLinkName("true");
				// }

			} else {
				locLink = [coordX, newPosition.y, coordX, coordY];
				const lnk = await Create_VQ_Element_Async(locLink, true, cl, currentElement);

				await lnk.setName(name);
				if (document.getElementById("linked-instance-exists").checked === true)
					await lnk.setLinkType("FILTER_EXISTS");
				else
					await lnk.setLinkType("REQUIRED");

				if (linkType === "JOIN")
					await lnk.setNestingType("PLAIN");
				else if (linkType === "NESTED")
					await lnk.setNestingType("SUBQUERY");

				// if (proj && proj.autoHideDefaultPropertyName === true) {
					// await lnk.hideDefaultLinkName(true);
					// lnk.setHideDefaultLinkName("true");
				// }
			}

			Template.AggregateWizard.endClassId.set(cl.obj._id);
			Session.set("activeElement", cl.obj._id);


            // Create_VQ_Element(function(cl){
                // cl.setName(class_name);
                // var proj = Projects.findOne({_id: Session.get("activeProject")});



                // if(typeof class_name !== "undefined" && class_name != null && class_name !== "" && class_name !== " "){
					// cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
				// }
                // cl.setClassStyle("condition");
                // if (line_direct === "=>") {
                	// locLink = [coordX, coordY, coordX, newPosition.y];
	                // Create_VQ_Element(function(lnk) {
	                    // lnk.setName(name);
						// if(document.getElementById("linked-instance-exists").checked === true)  lnk.setLinkType("FILTER_EXISTS");
						// else lnk.setLinkType("REQUIRED");

	                    // if (linkType === "JOIN") lnk.setNestingType("PLAIN");
						// else if (linkType === "NESTED") lnk.setNestingType("SUBQUERY");
						// if (proj && proj.autoHideDefaultPropertyName==true) {
							// lnk.hideDefaultLinkName(true);
							// lnk.setHideDefaultLinkName("true");
						// }
	                // }, locLink, true, currentElement, cl);
	            // } else {
	            	// locLink = [coordX, newPosition.y, coordX, coordY];
	            	// Create_VQ_Element(function(lnk) {
	                    // lnk.setName(name);
	                    // if(document.getElementById("linked-instance-exists").checked === true)  lnk.setLinkType("FILTER_EXISTS");
						// else lnk.setLinkType("REQUIRED");

						// if (linkType === "JOIN") lnk.setNestingType("PLAIN");
						// else if (linkType === "NESTED") lnk.setNestingType("SUBQUERY");
						// if (proj && proj.autoHideDefaultPropertyName==true) {
							// lnk.hideDefaultLinkName(true);
							// lnk.setHideDefaultLinkName("true");
						// }
	                // }, locLink, true, cl, currentElement);
	            // }
                // Template.AggregateWizard.endClassId.set(cl.obj._id);
				// Session.set("activeElement", cl.obj._id);
            // }, newPosition);

			if (document.getElementById("goto-wizard").checked === true ){

				//Fields
				var attr_list = [{attribute: ""}];

				attr_list = attr_list.filter(function(obj, index, self) {
					return index === self.findIndex(function(t) { return t['attribute'] === obj['attribute']});
				});
				// console.log(attr_list);
				Template.AggregateWizard.attList.set(attr_list);

				//Alias name
				if (class_name) {
					Interpreter.destroyErrorMsg();
					let defaultAlias = class_name.charAt(0);
					if(class_name.indexOf(":") !== -1) defaultAlias = class_name.charAt(class_name.indexOf(":")+1);
					Template.AggregateWizard.defaultAlias.set(defaultAlias + "_count");
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
			// $("#add-link-form").modal("hide");
			clearAddLinkInput();

			return;
		}

	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();
	},

	"click .select-class-button": async function (e) {
		hideClassEmptyError(e.target);
		if (Template.AddLink.isDataSchema.get()) {
			e.stopPropagation();
			e.preventDefault();
		}

		currentExpandedAssociation = $(e.target).closest(".association");
		var name = $(e.target).closest(".association").attr("name");
		var line_direct = $(e.target).closest(".association").attr("line_direct");
		var class_name_array = $(e.target).closest(".association").attr("className").split(", ");

		Template.SelectTargetClass.isDataSchema.set(Template.AddLink.isDataSchema.get());
		Template.SelectTargetClass.classes.set([{ text: "Waiting answer...", wait: true }]);

		autoCompletionCleanup();

		$("#class-search")[0].value = "";
		$('[name=class-list-radio]').removeAttr('checked');
		$("#select-class-form").modal("show");

		Template.SelectTargetClass.classes.set(await getClassesForAssociation(name, line_direct, class_name_array, Template.SelectTargetClass.isDataSchema.get()));
	},

	"click #add-long-link": function() {
		/*//Generate data for Connect Classes
		var data = [];
		var count = 0;
		var activeClass = new VQ_Element(Session.get("activeElement"));
		if ( activeClass.isUnion() && !(activeClass.isRoot())) { console.log(239);// [ + ] element, that has link to upper class
			if (activeClass.getLinkToRoot()){
				var element = activeClass.getLinkToRoot().link.getElements();
				let newStartClass = "";
				if (activeClass.getLinkToRoot().start) {
					newStartClass = new VQ_Element(element.start.obj._id);
    			} else {
    				newStartClass = new VQ_Element(element.end.obj._id);
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
		if ($('input[name=type-radio]').filter(':checked').val() === "NESTED") {
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
		$("#add-link-form").modal("hide");*/
	},


	"click #build-path-button": function() {
		autoCompletionCleanup()

		$("#build-path-form").modal("show");
	},

	'change input[name="link-list-checkbox"]': function (event) {
		const $input = $(event.target);
		if (!$input.is(':checked')) {
			hideClassEmptyError($input);
		}
	},

	'click #removeSelectedProp': function () {
		if ($("#selectedProperties").val() != undefined) {
			const selected = $("#selectedProperties").val().map(v => Number(v));
			let propList = Template.AddLink.Properties.get();
			let restPropList = Template.AddLink.RestProperties.get();
			for (const p of propList) {
				if (selected.includes(p.id)) {
					restPropList.push(p);
					restProperties.push(p);
				}
			}
			propList = propList.filter(function (p) { return !selected.includes(p.id); }); // UI list
			selectedProperties = selectedProperties.filter(function (p) { return !selected.includes(p.id); }); // actual list

			Template.AddLink.Properties.set(propList);
			Template.AddLink.PropCount.set(selectedProperties.length);

			restPropList = restPropList.sort((a, b) => { return b.cnt - a.cnt; }); // UI list
			restProperties = restProperties.sort((a, b) => { return b.cnt - a.cnt; }); // actual list

			Template.AddLink.RestProperties.set(restPropList);
			Template.AddLink.PropCountRest.set(restProperties.length);
		}
	},
	'click #addSelectedProp': function () {
		if ($("#restProperties").val() != undefined) {
			const selected = $("#restProperties").val().map(v => Number(v));
			let propList = Template.AddLink.Properties.get();
			let restPropList = Template.AddLink.RestProperties.get();
			for (const p of restPropList) {
				if (selected.includes(p.id)) {
					propList.push(p);
					selectedProperties.push(p)
				}
			}
			restPropList = restPropList.filter(function (p) { return !selected.includes(p.id); }); // UI list
			restProperties = restProperties.filter(function (p) { return !selected.includes(p.id); }); // actual list

			propList = propList.sort((a, b) => { return b.cnt - a.cnt; }); // UI list
			selectedProperties = selectedProperties.sort((a, b) => { return b.cnt - a.cnt; }); // actual list

			Template.AddLink.Properties.set(propList);
			Template.AddLink.PropCount.set(selectedProperties.length);

			Template.AddLink.RestProperties.set(restPropList);
			Template.AddLink.PropCountRest.set(restProperties.length);
		}
	},

	//Menu listeners
	"click #add-link-type-choice": async function () {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').prop('checked', false);
            $('#linked-instance-exists:checked').prop('checked', false);
            $('#goto-wizard').prop('disabled',"disabled");
            $('#linked-instance-exists').prop('disabled',"disabled");
        } else {
        	var cardValue = $('input[name=link-list-radio]:checked').attr("card"); //console.log("changed", cardValue);
        	if (cardValue === "") {
        		await confirmSubquery();
        	} else {
        		$('#goto-wizard').removeAttr("disabled");
        		$('#linked-instance-exists').removeAttr("disabled");
        		$('#goto-wizard').prop('checked', true);
        	}
        }
	},

	"click #goto-wizard": function() {
		if(document.getElementById("goto-wizard").checked === true) $('#linked-instance-exists').prop('checked', false);
	},

	"click #linked-instance-exists": function() {
		if(document.getElementById("linked-instance-exists").checked === true) $('#goto-wizard').prop('checked', false);
	},

	"click #link-list-form": async function() {

		var checkedName = $('input[name=link-list-radio]:checked');
		var start_elem_id = Session.get("activeElement");
		var currentElement = await createVQ_Element(start_elem_id);
		var joinLinkDesc = "";
		var subqueryLinkDesc = "";
		if(checkedName.attr("value") === "++" || checkedName.attr("value") === "=="){
			joinLinkDesc = "join information from the host node and the linked node";
			subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each host node about links";
			const elemName = await currentElement.getName();
			if(currentElement !== null && elemName != null && elemName != "") {
				joinLinkDesc = "join information from "+elemName+" and the linked node";
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about its links";
			}
		} else {

			var obj = $('input[name=link-list-radio]:checked').closest(".association");

			var targetClassText = "";
			var targetClassTextS = "";
			var className = obj.attr("className");


			const elemName = await currentElement.getName();
			var line_direct = obj.attr("line_direct");
			if(line_direct === "=>"){
				if(className != null && className != "") {
					targetClassText = " (that is a " + className + ")";
					targetClassTextS = " to" + className;
				}

				joinLinkDesc = "join information from "+elemName+" and its linked " + checkedName.attr("value") + targetClassText;
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about its " + checkedName.attr("value") +" links " + targetClassTextS;
			} else {
				if(className != null && className != "") {
					targetClassText = " (from " + className + ")";
					targetClassTextS = " from" + className;
				}
				joinLinkDesc = "join information from "+elemName+" and its incoming link by " + checkedName.attr("value") + targetClassText;
				subqueryLinkDesc = "compute grouped information (e.g., count, etc.) for each "+elemName+" about its incoming " + checkedName.attr("value")+" links" +targetClassTextS;
			}
		}
		Template.AddLink.JoinLinkText.set(joinLinkDesc);
		Template.AddLink.SubqueryLinkText.set(subqueryLinkDesc);

		$("div[id=errorField]").remove();
	},

	"change #link-list-form": function() {
		// var typeName = $('input[name=type-radio]').filter(':checked').val();
		// var cardValue = $('input[name=link-list-radio]:checked').attr("card");
		// if (typeName === "NESTED" && cardValue === "") {
			// confirmSubquery();
		// }
	},
	'click #apply-button': async function(e) {
		var asc = [];
		const associations = await getAllAssociations();

		for (const a of associations) {
			asc.push({
				name: a.name,
				class: a.class,
				text: a.text,
				type: a.type,
				card: a.card,
				clr: a.clr,
				filteredClasses: a.filteredClasses,
				show: true,
				isDataSchema: Template.AddLink.isDataSchema.get(),
				is: a.is,
				of: a.of
			});
		}

		Template.AddLink.fullList.set(asc);
		return;
	},
	'keyup #mySearch': async function(e) {
		linkKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if (linkKeyDownTimeStamp === e.timeStamp ) {
			var asc = [];

      const associations = await getAllAssociations();

			for (const a of associations) {
				asc.push({
					name: a.name,
					class: a.class,
					text: a.text,
					type: a.type,
					card: a.card,
					clr: a.clr,
					show: true,
					filteredClasses: a.filteredClasses,
					isDataSchema: Template.AddLink.isDataSchema.get(),
					is: a.is,
					of: a.of
				});
			}

			Template.AddLink.fullList.set(asc);
		}
		return;
	},
	'keyup #mySearchProps': async function (e) {
		linkKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if (linkKeyDownTimeStamp === e.timeStamp) {
			var filter = $("#mySearchProps").val().toLowerCase();
			if (filter != null && filter != "") {
				const filteredProps = selectedProperties.filter(function (p) { return p.full_name.toLowerCase().includes(filter); });
				const filteredRestProps = restProperties.filter(function (p) { return p.full_name.toLowerCase().includes(filter); });
				Template.AddLink.Properties.set(filteredProps);
				Template.AddLink.RestProperties.set(filteredRestProps);
			} else {
				// Filtering elements is only visual, when filter is empty, set the UI lists back to the actual lists
				Template.AddLink.Properties.set(selectedProperties);
				Template.AddLink.RestProperties.set(restProperties);
			}
		}
		return;
	},
	'click #dbp_for_links': async function(e) {

		var asc = [];
    const associations = await getAllAssociations();

		for (const a of associations) {
			asc.push({
				name: a.name,
				class: a.class,
				text: a.text,
				type: a.type,
				card: a.card,
				clr: a.clr,
				show: true,
				filteredClasses: a.filteredClasses,
				isDataSchema: Template.AddLink.isDataSchema.get(),
				is: a.is,
				of: a.of
			});
		}


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
function hideClassEmptyError(inputElement) {
	$(inputElement).closest('.label-radio').find('.add-class-empty-error').hide();
}

function getSelectedTargetClasses() {
	let hasError = false;
	$('input[name="link-list-checkbox"]:checked').each(function () {
		let $input = $(this);
		let targetClassValue = $input.siblings('.targetClass').text().trim();
		if (targetClassValue === "") {
			$input.siblings('.add-class-empty-error').show();
			hasError = true;
		}
	});

	if (hasError) return null;

	let selectedValues = $('input[name="link-list-checkbox"]:checked').map(function () {
		return { classes: $(this).siblings('.targetClass').text().trim().split(", ") };
	}).get();

	if (selectedValues.length === 0) return null;

	let uniqueClassNames = new Set();
	selectedValues.forEach(sv => sv.classes.forEach(c => {
		if (c !== "" && c !== "(no_class)") uniqueClassNames.add(c);
	}));

	return Array.from(uniqueClassNames);
}

async function getDiagramContext() {
	let diagram_type = await DiagramTypes.findOneAsync({ name: "DataSchema" });
	let class_type = await ElementTypes.findOneAsync({ name: "Class", diagramTypeId: diagram_type._id });
	let objectProperty_type = await ElementTypes.findOneAsync({ name: "ObjectProperty", diagramTypeId: diagram_type._id });

	var diagramId = Session.get("activeDiagram");

	var elems_in_diagram = await Promise.all(Elements.find({ diagramId: diagramId }).map(async function (e) {
		return await createVQ_Element(e["_id"]);
	}));

	const boxElements = elems_in_diagram.filter((e) => e.obj.elementTypeId == class_type._id);
	let existingClassNames = new Set();
	let existingBoxesMap = {};

	for (let elem of boxElements) {
		let name = await elem.getName();
		let clStr = await elem.getCompartmentValue("ClassList");
		if (clStr) {
			let classList = await getClassListFromString(clStr);
			classList.forEach(c => {
				existingClassNames.add(c);
				existingBoxesMap[c] = elem;
			});
		} else if (name) {
			existingClassNames.add(name);
			existingBoxesMap[name] = elem;
		}
	}

	var objectPropertyElements = elems_in_diagram.filter(e => e.obj.elementTypeId == objectProperty_type._id);
	let existingLines = await Promise.all(objectPropertyElements.map(async function (e) {
		let elements = await e.getElements();
		return { source: elements.start.obj._id, target: elements.end.obj._id };
	}));

	return {
		names: existingClassNames,
		boxesMap: existingBoxesMap,
		lines: existingLines,
		diagram_type: diagram_type,
		diagramId: diagramId
	};
}

async function createMissingClassBoxes(classesToFetchIds, currentElement, diagramId, diagram_type, newBoxes) {
	let createdBoxesMap = {};
	if (classesToFetchIds.length === 0) return createdBoxesMap;

	const baseCoords = await currentElement.getCoordinates();
	const baseX = baseCoords.x + baseCoords.width + 150;
	let boxIndex = 0;

	let paramsSelected = { main: { ids: classesToFetchIds } };
	let resSelected = await dataShapes.callServerFunction("xx_getClassListFullfromIds", paramsSelected);

	for (const el of resSelected.data) {
		const limit = 30;
		const propOut = await dataShapes.callServerFunction("xx_getClassOutProperties", { main: { c_id: el.id, limit: limit } });
		propOut.data = propOut.data.filter(function (p) { return !restProperties.map(p => p.full_name).includes(p.shortName) });
		for (const p of propOut.data) { if (p.object_cnt > 0) p.name = `${p.name} \u21D2 IRI`; }

		const propIn = await dataShapes.callServerFunction("xx_getClassInProperties", { main: { c_id: el.id, limit: limit } });
		propIn.data = propIn.data.filter(function (p) { return !restProperties.map(p => p.full_name).includes(p.shortName) });
		for (const p of propIn.data) { p.name = `${p.name} \u21D0 IRI`; }

		let item = {
			compartments: {
				Name: el.display_name,
				AttributesT: { out: propOut.data, in: propIn.data, c: [] },
				ClassList: [{ cnt: el.cnt, shortName: el.name, name: el.display_name }]
			},
			Cnt: el.cnt,
			TypeOld: 'Class',
			TypeNew: 'Class'
		};

		const offsetY = baseCoords.y + boxIndex * 60;
		var newBox = await Create_Any_VQ_Element_Async({x: baseX, y: offsetY, width: 120, height: 30}, "Class", false);
		boxIndex++;
		newBox.setNewExploreFillColor();

		await Meteor.callAsync("addClassCompartments", {
			projectId: Session.get("activeProject"),
			diagram_id: diagramId,
			diagram_type_id: diagram_type._id,
			versionId: Session.get("versionId"),
			element_id: newBox.obj._id,
			element_type_id: newBox.obj.elementTypeId,
			uStrings: { u_in_prop: '\u21A4', u_c_prop: '\u27F2' },
			compactClassView: true,
		}, item);

		createdBoxesMap[el.name] = newBox;
		createdBoxesMap[el.display_name] = newBox;
		newBoxes.push(newBox);
	}

	return createdBoxesMap;
}

async function drawObjectPropertyLine(sourceElem, targetElem, propertiesData, existingLines, diagramId, diagram_type, newLines) {
	propertiesData = propertiesData.filter(function (p) { return !restProperties.map(p => p.full_name).includes(p.shortName) });
	if (!propertiesData || propertiesData.length === 0) return;

	let sourceId = sourceElem.obj._id;
	let targetId = targetElem.obj._id;

	let lineExists = existingLines.find(e => e.source === sourceId && e.target === targetId);
	if (lineExists) return;

	var srcBox = await sourceElem.getCoordinates();
	var tgtBox = await targetElem.getCoordinates();
	var locLink = computeOrthogonalLinePointsFromBoxes(srcBox, tgtBox);

	var newLine = await Create_Any_VQ_Element_Async(locLink, "ObjectProperty", true, sourceElem, targetElem);

	existingLines.push({ source: sourceId, target: targetId });
	if (newLines) newLines.push(newLine);

	let compartmentList = propertiesData.map(p => ({ name: p.name || p.display_name }));

	await Meteor.callAsync("addOneCompartmentFromList", {
		projectId: Session.get("activeProject"),
		diagram_id: diagramId,
		diagram_type_id: diagram_type._id,
		versionId: Session.get("versionId"),
		element_id: newLine.obj._id,
		element_type_id: newLine.obj.elementTypeId,
		uStrings: { u_in_prop: '\u21A4', u_c_prop: '\u27F2' },
		compactClassView: true,
	}, "Name", compartmentList, "", { cut: true, max: 5, class_cnt: 5 });
}

async function addNewLinksForDataSchema() {
	let newTargetClassNames = getSelectedTargetClasses();
	if (!newTargetClassNames || newTargetClassNames.length === 0) return;

	let diagramContext = await getDiagramContext();
	let existingClassNames = diagramContext.names;
	let existingBoxesMap = diagramContext.boxesMap;
	let existingLines = diagramContext.lines;
	let diagram_type = diagramContext.diagram_type;
	let diagramId = diagramContext.diagramId;

	var currentElement = await createVQ_Element(Session.get("activeElement"));

	let allClassNamesToResolve = Array.from(new Set([...newTargetClassNames, ...existingClassNames]));
	let classIdMap = {};

	await Promise.all(allClassNamesToResolve.map(async (name) => {
		const result = await dataShapes.resolveClassByName({ name: name });
		if (result.data && result.data.length > 0) {
			classIdMap[name] = result.data[0].id;
		}
	}));

	let classesToFetchNames = newTargetClassNames.filter(name => !existingBoxesMap[name] && classIdMap[name]);
	let classesToFetchIds = classesToFetchNames.map(name => classIdMap[name]);

	let newBoxes = [];
	let newLines = [];
	let createdBoxesMap = await createMissingClassBoxes(classesToFetchIds, currentElement, diagramId, diagram_type, newBoxes);

	let allDiagramNodes = [];
	for (let name of Array.from(existingClassNames)) {
		if (classIdMap[name] && existingBoxesMap[name]) {
			allDiagramNodes.push({ name: name, id: classIdMap[name], box: existingBoxesMap[name] });
		}
	}
	for (let name of classesToFetchNames) {
		if (classIdMap[name] && createdBoxesMap[name]) {
			allDiagramNodes.push({ name: name, id: classIdMap[name], box: createdBoxesMap[name] });
		}
	}

	let drawnPairs = new Set();

	for (let targetName of newTargetClassNames) {
		let targetId = classIdMap[targetName];
		let targetBox = existingBoxesMap[targetName] || createdBoxesMap[targetName];
		if (!targetId || !targetBox) continue;

		for (let diagramNode of allDiagramNodes) {
			if (diagramNode.id === targetId) continue;

			let pairKeyOut = `${targetId}->${diagramNode.id}`;
			let pairKeyIn = `${diagramNode.id}->${targetId}`;

			// Target -> Diagram node
			if (!drawnPairs.has(pairKeyOut)) {
				const propsOut = await dataShapes.callServerFunction("xx_getClasstoClassProperties", {
					main: { c_1_id: targetId, c_2_id: diagramNode.id, limit: 30 }
				});
				await drawObjectPropertyLine(targetBox, diagramNode.box, propsOut.data, existingLines, diagramId, diagram_type, newLines);
				drawnPairs.add(pairKeyOut);
			}

			// Diagram node -> Target
			if (!drawnPairs.has(pairKeyIn)) {
				const propsIn = await dataShapes.callServerFunction("xx_getClasstoClassProperties", {
					main: { c_1_id: diagramNode.id, c_2_id: targetId, limit: 30 }
				});
				await drawObjectPropertyLine(diagramNode.box, targetBox, propsIn.data, existingLines, diagramId, diagram_type, newLines);
				drawnPairs.add(pairKeyIn);
			}
		}
	}

	if (newBoxes.length > 0 || newLines.length > 0) {
		Interpreter.execute("ComputeIncrementalLayout", [currentElement, newBoxes, newLines, diagramId]);
	}

	$("#add-link-form").modal("hide");
	clearAddLinkInput();
}

async function getClassesForAssociation(name, line_direct, class_name_array, getFiltered = false) {
	let scName = await getSchemaNameForElement(null, Template.AddLink.isDataSchema.get());
	let schemaName = dataShapes.schema.schema;
	let param = {};
	if (typeof scName !== "undefined" && scName !== null && scName !== "" && dataShapes.schema.schema !== scName) {
		schemaName = scName;
		param.schema = schemaName;
	}

	if (typeof schemaName === "undefined") schemaName = "";

	var classes;
	if (!getFiltered) {
		if (name == "==" || name == "++") {
			classes = await dataShapes.getClasses(param);
		}
		else {
			var params = {};
			var start_elem_id = Session.get("activeElement");
			var startElement = await createVQ_Element(start_elem_id);
			var startElementName = await startElement.getName();
			var startElementAlias = await startElement.getInstanceAlias();

			if (schemaName.toLowerCase() == "wikidata" && ((name.startsWith("[") && name.endsWith("]")) || name.indexOf(":") == -1)) name = "wdt:" + name;
			if (schemaName.toLowerCase() == "wikidata" && typeof startElementName != "undefined" && startElementName !== null && startElementName != "" && ((startElementName.startsWith("[") && startElementName.endsWith("]")) || startElementName.indexOf(":") == -1)) startElementName = "wd:" + startElementName;

			if (line_direct == "=>") {
				let elementParams = [{ "name": name, "type": "in", }]
				if (typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if (typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != "") {
					let cls = dataShapes.getIndividualName(startElementAlias);
					if (cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": { "limit": dataShapes.schema.limit },
					"element": { "pList": { "in": elementParams, } }
				}
			} else {
				let elementParams = [{ "name": name, "type": "out", }]
				if (typeof startElementName != "undefined" && startElementName != null && startElementName != "") elementParams[0]["className"] = startElementName;
				if (typeof startElementAlias != "undefined" && startElementAlias != null && startElementAlias != "") {
					let cls = dataShapes.getIndividualName(startElementAlias);
					if (cls != null && cls != "" && cls.indexOf(":") !== -1) elementParams[0]["uriIndividual"] = cls;
				}
				params = {
					"main": { "limit": dataShapes.schema.limit },
					"element": { "pList": { "out": elementParams, } }
				}
			}
			if (typeof scName !== "undefined" && scName !== null && scName !== "" && dataShapes.schema.schema !== scName) {
				params.main.schema = schemaName;
			}
			classes = await dataShapes.getClassesFull(params);

		}
		classes = classes.data;
	} else {
		let associations = Template.AddLink.fullList.get();
		classes = associations.find(assoc => assoc.name === name && assoc.type === line_direct)?.filteredClasses || [];
	}

	var proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });

	for (let e of classes) {
		let prefix;

		if (
			dataShapes.schema.schema === schemaName &&
			proj.showPrefixesForAllNames !== "true" &&
			proj.showPrefixesForAllNames !== true &&
			(e.is_local === true || e.prefix === "" || (schemaName.toLowerCase() === "wikidata" && e.prefix === "wd"))
		) {
			prefix = "";
		} else {
			prefix = e.prefix + ":";
		}

		e.short_class_name = e.full_name;

		if (e.principal_class === 2) {
			e.clr = "color: purple";
		} else if (e.principal_class === 0) {
			e.clr = "color: #bbbbbb";
		} else {
			e.clr = "color: #777777";
		}
	}

	classes = classes.filter(function (e) { return !class_name_array.includes(e.short_class_name); });

	class_name_array.forEach(function (class_name) {
		if (class_name != null && class_name !== "" && class_name != " ") {
			classes.unshift({ short_class_name: class_name, clr: "color: #777777", checked: "checked", full_name: class_name });
		}
	});
	return classes;
}

function clearAddLinkInput() {
	$('input[name=link-list-radio]:checked').attr('checked', false);
	var defaultRadio = document.getElementsByName("type-radio");
  for (let e of defaultRadio) {
    e.checked = (e.value === "JOIN");
  }


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

async function confirmSubquery(){

	// var txt;
	var proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
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

async function getAllAssociations() {
	var start_elem_id = Session.get("activeElement");
	var startElement = await createVQ_Element(start_elem_id);

	if (!_.isEmpty(startElement) && await startElement.isClass()) {
		var asc = [];
		var ascReverse = [];

		var classNameListForCurrentElement;
		if (Template.AddLink.isDataSchema.get()) {
			classNameListForCurrentElement = await getClassListFromString(await startElement.getClassList());
		} else {
			classNameListForCurrentElement = [await startElement.getName()];
		}

		var proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });
		var allAssociations = [];

		let scName = await getSchemaNameForElement(null, Template.AddLink.isDataSchema.get());
		let schemaName = dataShapes.schema.schema;
		if (typeof scName !== "undefined" && scName !== null && scName !== "" && dataShapes.schema.schema !== scName) {
			schemaName = scName;
		}
		if (typeof schemaName === "undefined") schemaName = "";

		var complete = true;
		for (let className of classNameListForCurrentElement) {

			if (typeof className === "undefined" || className === null) className = "";

			if ((await startElement.isUnit() != true && await startElement.isUnion() != true) || !(await startElement.isRoot())) {
				var newStartElement = startElement;

				if ((await startElement.isUnion() || await startElement.isUnit()) && !(await startElement.isRoot())) { // [ + ] element, that has link to upper class
					if (await startElement.getLinkToRoot()) {
						var element = await startElement.getLinkToRoot().link.getElements();
						if (await startElement.getLinkToRoot().start) {
							newStartElement = await createVQ_Element(element.start.obj._id);
							className = await newStartElement.getName();
						} else {
							newStartElement = await createVQ_Element(element.end.obj._id);
							className = await newStartElement.getName();
						}
					}
				}

				var param = { propertyKind: 'ObjectExt', linksWithTargets: true, limit: dataShapes.schema.limit };
				var filter = $("#mySearch").val().toLowerCase();
				if (filter != null) {
					param["filter"] = filter;
				}
				param["limit"] = Template.AddLink.Count.get();

				if ($("#dbp_for_links").is(":checked")) {
					param.basicOrder = true;
				}

				if (typeof scName !== "undefined" && scName !== null && scName !== "" && dataShapes.schema.schema !== scName) {
					param.schema = scName;
				}
				
				var prop = await dataShapes.getProperties(param, newStartElement, null, className);
				complete = complete && prop.complete;

				let currentProps = prop["data"].map(p => ({ ...p, _sourceClassName: className }));
				allAssociations.push(...currentProps);
			}
		}

		Template.AddLink.ShowMore.set(!complete);

		for (let e of allAssociations) {
			if (e.mark === 'out') {
				e.type = '=>';
				e.is = "";
				e.of = "";
			} else {
				e.type = '<=';
				e.is = "is";
				e.of = "of";
			}

			if (e.class_iri !== undefined && e.class_iri !== null) {
				let prefix = "";
				if (
					dataShapes.schema.schema === schemaName &&
					(
						(proj.showPrefixesForAllNames !== "true" && proj.showPrefixesForAllNames !== true && e.class_is_local === true) ||
						(schemaName.toLowerCase() === "wikidata" && e.class_prefix === "wd")
					)
				) {
					prefix = "";
				} else {
					prefix = e.class_prefix + ":";
				}

				e.short_class_name = prefix + e.class_display_name;
			} else {
				e.short_class_name = "";
			}
		}


		//remove duplicates - moved to getAllAssociations()
		//allAssociations = allAssociations.filter(function(obj, index, self) {
		//	return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
		//});
		for (let e of allAssociations) {
			let cardinality = "";
			let colorLetters = "";

			if (proj && proj.showCardinalities === true) {
				if (e.type === "<=") {
					cardinality += "[*]";
					colorLetters += "color: purple";
				} else {
					const maxCard = e.x_max_cardinality;
					if (maxCard === null || !maxCard || maxCard === -1 || maxCard > 1) {
						cardinality += "[*]";
						colorLetters += "color: purple";
					}
				}
			}

			// Compute prefix:name
			let prefix;
			if (
				dataShapes.schema.schema === schemaName &&
				(
					(proj.showPrefixesForAllNames !== "true" && proj.showPrefixesForAllNames !== true) &&
					(e.is_local === true || (schemaName.toLowerCase() === "wikidata" && e.prefix === "wdt"))
				)
			) {
				prefix = "";
			} else {
				prefix = e.prefix + ":";
			}

			const eName = prefix + e.display_name;

			const entry = {
				name: eName,
				class: e.short_class_name,
				type: e.type,
				card: cardinality,
				clr: colorLetters,
				is: e.is,
				of: e.of
			};

			if (e.mark === "out") {
				asc.push(entry);
			} else {
				ascReverse.push(entry);
			}

			if (e.class === e._sourceClassName && e.type === "=>") {
				ascReverse.push({
					name: e.name,
					class: e.short_class_name,
					type: "<=",
					card: cardinality,
					clr: colorLetters,
					is: e.is,
					of: e.of
				});
			}
		}
	}

	if (proj && !Template.AddLink.isDataSchema.get()) {
		if (proj.showCardinalities == true)
			ascReverse.push({ name: "++", class: " ", text: "(empty link)", type: "=>", card: "[*]", clr: "color: purple", is: "", of: "" });
		else {
			ascReverse.push({ name: "++", class: " ", text: "(empty link)", type: "=>", card: "", clr: "", is: "", of: "" });
		}
	}
	asc = asc.concat(ascReverse);

	if (proj && !Template.AddLink.isDataSchema.get()) {
		let classesToProcess = classNameListForCurrentElement || [];
		for (let className of classesToProcess) {
			var selfName = "";
			if (className != null && className.indexOf("[") == -1) {
				selfName = className;
			} else {
				var linkUp = await startElement.getLinkToRoot();
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

					var previousVQelement = await createVQ_Element(previousClassId);
					selfName = await previousVQelement.getName();
				}
			}
			if ((await startElement.isUnit() != true && await startElement.isUnion() != true) || !(await startElement.isRoot())) {
				asc.push({ name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: "", is: "", of: "" });
			}
		}
	}

	asc = asc.filter(function (obj, index, self) {
		return index === self.findIndex(function (t) { return t['name'] === obj['name'] && t['type'] === obj['type'] && t['class'] === obj['class'] });
	});

	if (Template.AddLink.isDataSchema.get()) {
		let diagramContext = await getDiagramContext();
		let classesInDiagram = diagramContext.names;
		const associationPromises = asc.map(async function (association) {
			let classesForAssoc = await getClassesForAssociation(association.name, association.type, [association.class]);
			association.filteredClasses = classesForAssoc.filter(function (c) {
				return !classesInDiagram.has(c.short_class_name);
			});
			return association;
		});

		asc = await Promise.all(associationPromises);
		asc = asc.filter(function (association) {
			return association.filteredClasses && association.filteredClasses.length > 0;
		});
		asc = asc.map(function (a) {
			const max = a.filteredClasses.length;
			a.class = a.filteredClasses[Math.floor(Math.random() * max)].full_name;
			return a;
		});
	}
	return asc;
}

