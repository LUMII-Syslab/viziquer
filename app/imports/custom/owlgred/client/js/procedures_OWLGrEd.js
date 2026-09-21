import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/platform/client/js/utilities/utils.js'
import { Projects, Elements, Compartments, ElementTypes, CompartmentTypes, Diagrams } from '/imports/db/platform/collections'
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import { Create_New_OWLGrEd_Element, Create_OWLGrEd_Element } from './OWLGrEd_Element.js';

Interpreter.customMethods({

	getNamespacesOwlgred: function(){
		// console.log("getNamespacesOwlgred");
	},

	getAttributeNsOwlgred: function(){
		// console.log("getAttributeNsOwlgred");
	},

	getLinkNsOwlgred: function(){
		// console.log("getLinkNsOwlgred");
	},

	getObjectNsOwlgred: function(){

		// console.log("getObjectNsOwlgred");
	},

	roleNameFromNsOwlgred: function(){
		// console.log("roleNameFromNsOwlgred");
	},

	annotationTypesOwlgred: function(){
		//predefined attotation types
		let annotationTable = [
			{ input: "backwardCompatibleWith", value: "backwardCompatibleWith" },
			{ input: "comment", value: "comment" },
			{ input: "deprecated", value: "deprecated" },
			{ input: "incompatibleWith", value: "incompatibleWith" },
			{ input: "isDefinedBy", value: "isDefinedBy" },
			{ input: "label", value: "label" },
			{ input: "priorVersion", value: "priorVersion" },
			{ input: "seeAlso", value: "seeAlso" },
			{ input: "versionInfo", value: "versionInfo" }
		];

		const diagramId = Session.get("activeDiagram");
		const active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

		const elem_type = ElementTypes.findOne({name: "AnnotationProperty"});

		const projectId = Session.get("activeProject");
        const versionId = Session.get("versionId");


		//annotation properties from diagramm;
		var elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type["_id"]})
		Elements.find({diagramId: diagramId, elementTypeId:elem_type["_id"]}).forEach(function(elem) {
			const compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type["_id"]});
			const compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: elem["_id"]});
			if(typeof compart !== "undefined"){
				let annotationName = compart["value"];
				annotationTable.push({input: annotationName, value: annotationName} );
			}
		});

		// console.log("annotationTypesOwlgred");
		return annotationTable;
	},

	languageValuesOwlgred: function(){
		//predefined languages
		return [
			{ input: "en", value: "en" },
			{ input: "lv", value: "lv" },
			{ input: "de", value: "de" },
			{ input: "es", value: "es" },
			{ input: "fr", value: "fr" },
			{ input: "pt", value: "pt" }
		];
	},

	getClassNamesForObjectOwlgred: function(){
		let classNamesForObject = [];
		const diagramId = Session.get("activeDiagram");
		const active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

		const elem_type = ElementTypes.findOne({name: "Class"});

		const projectId = Session.get("activeProject");
        const versionId = Session.get("versionId");


		//annotation properties from diagramm;
		var elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type["_id"]})
		Elements.find({diagramId: diagramId, elementTypeId:elem_type["_id"]}).forEach(function(elem) {

			const compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type["_id"]});
			const compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: elem["_id"]});
			if(typeof compart !== "undefined"){
				let annotationName = compart["value"];
				classNamesForObject.push({input: annotationName, value: annotationName} );
			}
		});
		// console.log("getClassNamesForObjectOwlgred", classNamesForObject);
		return classNamesForObject;

	},

	defaultTypesOwlgred: function(){
		let defaultTypes = [
			{ input: "Literal", value: "Literal" },
			{ input: "NCName", value: "NCName" },
			{ input: "NMTOKEN", value: "NMTOKEN" },
			{ input: "Name", value: "Name" },
			{ input: "PlainLiteral", value: "PlainLiteral" },
			{ input: "XMLLiteral", value: "XMLLiteral" },
			{ input: "anyURI", value: "anyURI" },
			{ input: "base64Binary", value: "base64Binary" },
			{ input: "boolean", value: "boolean" },
			{ input: "byte", value: "byte" },
			{ input: "date", value: "date" },
			{ input: "dateTime", value: "dateTime" },
			{ input: "dateTimeStamp", value: "dateTimeStamp" },
			{ input: "decimal", value: "decimal" },
			{ input: "double", value: "double" },
			{ input: "float", value: "float" },
			{ input: "hexBinary", value: "hexBinary" },
			{ input: "int", value: "int" },
			{ input: "integer", value: "integer" },
			{ input: "language", value: "language" },
			{ input: "long", value: "long" },
			{ input: "negativeInteger", value: "negativeInteger" },
			{ input: "nonNegativeInteger", value: "nonNegativeInteger" },
			{ input: "nonPositiveInteger", value: "nonPositiveInteger" },
			{ input: "normalizedString", value: "normalizedString" },
			{ input: "positiveInteger", value: "positiveInteger" },
			{ input: "rational", value: "rational" },
			{ input: "real", value: "real" },
			{ input: "short", value: "short" },
			{ input: "string", value: "string" },
			{ input: "time", value: "time" },
			{ input: "token", value: "token" },
			{ input: "unsignedByte", value: "unsignedByte" },
			{ input: "unsignedInt", value: "unsignedInt" },
			{ input: "unsignedLong", value: "unsignedLong" },
			{ input: "unsignedShort", value: "unsignedShort" }
		];
		// console.log("defaultTypesOwlgred");

		const diagramId = Session.get("activeDiagram");
		const active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

		const elem_type = ElementTypes.findOne({name: "DataType"});

		const projectId = Session.get("activeProject");
        const versionId = Session.get("versionId");


		//annotation properties from diagramm;
		var elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type["_id"]})
		Elements.find({diagramId: diagramId, elementTypeId:elem_type["_id"]}).forEach(function(elem) {
			const compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type["_id"]});
			const compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: elem["_id"]});
			if(typeof compart !== "undefined"){
				let annotationName = compart["value"];
				defaultTypes.push({input: annotationName, value: annotationName} );
			}
		});

		// console.log("defaultTypes", defaultTypes);

		return defaultTypes;
	},
	
	setPropertyAssertionNegationOwlgred: async function(compartment){

		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let isInverse = compartment.input;
		let propertyName = await elemOWLGrEd.getCompartmentValue("Property");
		if(typeof propertyName !== "undefined" && propertyName !== null && propertyName !== ""){
			if(isInverse === "true"){
				await elemOWLGrEd.setCompartmentValue("Property", propertyName, "\u2260 " + propertyName, false);
			} else {
				await elemOWLGrEd.setCompartmentValue("Property", propertyName, propertyName, false);
			}
		} else {
			await elemOWLGrEd.setCompartmentValue("Property", "", "", false);
		}
	},
	
	setPropertyAssertionNegationForPropertyOwlgred: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId){
		let compart_type = this;
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let roleName = input;
		let value = input;
		let isInverse = await elemOWLGrEd.getCompartmentValue("isNegative");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true")value = "\u2260 " + roleName;
		}
		return Dialog.updateCompartmentValue(compart_type, elem_id, roleName, value, src_id);
	},

	
	setRestrictionInverseOwlgred: async function(compartment){

		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let isInverse = compartment.input;
		let roleName = await elemOWLGrEd.getCompartmentValue("Role");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true"){
				await elemOWLGrEd.setCompartmentValue("Role", roleName, "inverse(" + roleName + ")", false);
			} else {
				await elemOWLGrEd.setCompartmentValue("Role", roleName, roleName, false);
			}
		} else {
			await elemOWLGrEd.setCompartmentValue("Role", "", "", false);
		}
	},

	setRestrictionInverseForRoleOwlgred: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId){
		let compart_type = this;
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let roleName = input;
		let value = input;
		let isInverse = await elemOWLGrEd.getCompartmentValue("IsInverse");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true")value = "inverse(" + roleName + ")";
		}
		return Dialog.updateCompartmentValue(compart_type, elem_id, roleName, value, src_id);
	},

	setIsNegativeAssertionOwlgred: async function(compartment){

		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let isInverse = compartment.input;
		let roleName = await elemOWLGrEd.getCompartmentValue("Property");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true"){
				await elemOWLGrEd.setCompartmentValue("Property", roleName, "<>" + roleName, false);
			} else {
				await elemOWLGrEd.setCompartmentValue("Property", roleName, roleName, false);
			}
		} else {
			await elemOWLGrEd.setCompartmentValue("Property", "", "", false);
		}
	},

	setIsNegativeAssertionInvOwlgred: async function(compartment){

		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let isInverse = compartment.input;
		let roleName = await elemOWLGrEd.getCompartmentValue("InvProperty");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true"){
				await elemOWLGrEd.setCompartmentValue("InvProperty", roleName, "<>" + roleName, false);
			} else {
				await elemOWLGrEd.setCompartmentValue("InvProperty", roleName, roleName, false);
			}
		} else {
			await elemOWLGrEd.setCompartmentValue("InvProperty", "", "", false);
		}
	},

	setIsNegativeAssertionForPropertyOwlgred: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId){
		let compart_type = this;
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let roleName = input;
		let value = input;
		let isInverse = await elemOWLGrEd.getCompartmentValue("IsNegativeAssertion");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true")value = "<>" + roleName;
		}

		const elemType = ElementTypes.findOne({name: "LinkObject"});
		let roleName2 = 0;
		let invRoleName = await elemOWLGrEd.getCompartmentValue("InvProperty");


		if (typeof roleName !== 'undefined' && roleName !== null && roleName.trim() !== '') {
			roleName2 = 1;
		} else roleName2 = 0;
		if (typeof invRoleName !== 'undefined' && invRoleName !== null && invRoleName.trim() !== '') {
			invRoleName = 1;
		} else invRoleName = 0;
		let assocStyles = elemType.styles;
		let style;

		if(roleName2 === 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Link_both_end');
		} else if(roleName2 === 1 && invRoleName !== 1){
			style = assocStyles.find(s => s.name === 'Link_direct');
		} else if(roleName2 !== 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Link_inverse');
		} else {
			style = assocStyles.find(s => s.name === 'Default');
		}

		style = flattenObjectToArray(style);
		// console.log(style);
		elemOWLGrEd.setCustomStyle(style);



		return Dialog.updateCompartmentValue(compart_type, elem_id, roleName, value, src_id);
	},

	setIsNegativeAssertionForPropertyInvOwlgred: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId){

		let compart_type = this;
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let roleName = input;
		let value = input;
		let isInverse = await elemOWLGrEd.getCompartmentValue("InvIsNegativeAssertion");
		if(typeof roleName !== "undefined" && roleName !== null && roleName !== ""){
			if(isInverse === "true")value = "<>" + roleName;
		}


		const elemType = ElementTypes.findOne({name: "LinkObject"});
		let roleName2 = await elemOWLGrEd.getCompartmentValue("Property")
		let invRoleName = input;


		if (typeof roleName2 !== 'undefined' && roleName2 !== null && roleName2.trim() !== '') {
			roleName2 = 1;
		} else roleName2 = 0;
		if (typeof invRoleName !== 'undefined' && invRoleName !== null && invRoleName.trim() !== '') {
			invRoleName = 1;
		} else invRoleName = 0;
		let assocStyles = elemType.styles;
		let style;

		if(roleName2 === 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Link_both_end');
		} else if(roleName2 === 1 && invRoleName !== 1){
			style = assocStyles.find(s => s.name === 'Link_direct');
		} else if(roleName2 !== 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Link_inverse');
		} else {
			style = assocStyles.find(s => s.name === 'Default');
		}

		style = flattenObjectToArray(style);
		// console.log(style);
		elemOWLGrEd.setCustomStyle(style);


		return Dialog.updateCompartmentValue(compart_type, elem_id, roleName, value, src_id);
	},

	defaultMultiplicityOwlgred: function(){
		// console.log("defaultMultiplicityOwlgred");
		return [
			{ input: "*", value: "*" },
			{ input: "1", value: "1" },
			{ input: "0..1", value: "0..1" },
			{ input: "1..*", value: "1..*" }
		];
	},

	changeOWLAssocStyleFromCompartmentOwlgred: async function(compartment){
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		const elemType = ElementTypes.findOne({name: "Association"});
		let roleName = "";
		let invRoleName = "";
		if(compartment.compartmentType.name === "Name") {
			roleName = compartment.input;
			invRoleName = await elemOWLGrEd.getCompartmentValue("NameInv");
		} else {
			roleName = await elemOWLGrEd.getCompartmentValue("Name");
			invRoleName = compartment.input;
		}

		if (typeof roleName !== 'undefined' && roleName !== null && roleName.trim() !== '') {
			roleName = 1;
		} else roleName = 0;
		if (typeof invRoleName !== 'undefined' && invRoleName !== null && invRoleName.trim() !== '') {
			invRoleName = 1;
		} else invRoleName = 0;
		let assocStyles = elemType.styles;
		let style;

		if(roleName === 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Association_both_end');
		} else if(roleName === 1 && invRoleName !== 1){
			style = assocStyles.find(s => s.name === 'Association_direct');
		} else if(roleName !== 1 && invRoleName === 1){
			style = assocStyles.find(s => s.name === 'Association_inverse');
		} else {
			style = assocStyles.find(s => s.name === 'Default');
		}
		// Example usage:
		style = flattenObjectToArray(style);
		// console.log(style);
		elemOWLGrEd.setCustomStyle(style);
	},

	changeOWLinkStyleFromCompartmentOwlgred: async function(compartment){

		// const elem = Elements.findOne({_id: Session.get("activeElement")});
		// const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		// const elemType = ElementTypes.findOne({name: "LinkObject"});
		// let roleName = "";
		// let invRoleName = "";
		// if(compartment.compartmentType.name === "Property") {
			// roleName = compartment.input;
			// invRoleName = await elemOWLGrEd.getCompartmentValue("InvProperty");
		// } else {
			// roleName = await elemOWLGrEd.getCompartmentValue("Property");
			// invRoleName = compartment.input;
		// }

		// if (typeof roleName !== 'undefined' && roleName !== null && roleName.trim() !== '') {
			// roleName = 1;
		// } else roleName = 0;
		// if (typeof invRoleName !== 'undefined' && invRoleName !== null && invRoleName.trim() !== '') {
			// invRoleName = 1;
		// } else invRoleName = 0;
		// let assocStyles = elemType.styles;
		// let style;

		// if(roleName === 1 && invRoleName === 1){
			// style = assocStyles.find(s => s.name === 'Link_both_end');
		// } else if(roleName === 1 && invRoleName !== 1){
			// style = assocStyles.find(s => s.name === 'Link_direct');
		// } else if(roleName !== 1 && invRoleName === 1){
			// style = assocStyles.find(s => s.name === 'Link_inverse');
		// } else {
			// style = assocStyles.find(s => s.name === 'Default');
		// }
		// console.log("YYYYYYYYYYYYYYYYYYYYYYYYYYYYY", compartment, style, roleName, invRoleName)

		// style = flattenObjectToArray(style);
		// console.log(style);
		// elemOWLGrEd.setCustomStyle(style);
	},

	getPropertiesOwlgred: function(){
		// console.log("getPropertiesOwlgred");
	},

	setSomeOwlgred: async function(compartment){
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let some = compartment.input;
		if(some === "true"){
			await elemOWLGrEd.setCompartmentValue("Only", "false", "");
		}
	},

	setOnlyOwlgred: async function(compartment){
		const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		let only = compartment.input;
		if(only === "true"){
			await elemOWLGrEd.setCompartmentValue("Some", "false", "");
		}
	},

	setHorizontalLine: async function(elemId, compart_type_id){
		let elem = await Elements.findOneAsync({_id: elemId});
		let compart_type = CompartmentTypes.findOne({_id: compart_type_id});

		let compartTypeName = compart_type.name;

		if(compartTypeName === "EquivalentClasses" || compartTypeName === "SuperClasses" || compartTypeName === "DisjointClasses"
		|| compartTypeName === "Keys" || compartTypeName === "Attributes" || compartTypeName === "SuperProperties"
		|| compartTypeName === "NegativeDataPropertyAssertion" || compartTypeName === "DataPropertyAssertion" || compartTypeName === "DifferentIndividuals" || compartTypeName === "SameIndividuals"
		|| compartTypeName === "Multiplicity"
		){

			let horLineNames = {
				EquivalentClasses: "HorizontalLine2",
				SuperClasses: "HorizontalLine3",
				DisjointClasses: "HorizontalLine4",
				Keys: "HorizontalLine5",
				Attributes: "HorizontalLine6",
				SuperProperties: "HorizontalLine7", //8
				NegativeDataPropertyAssertion: "HorizontalLine9",
				DataPropertyAssertion: "HorizontalLine10",
				DifferentIndividuals: "HorizontalLine11",
				SameIndividuals: "HorizontalLine11"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elemId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};

			if(compartTypeName === "SuperProperties"){
				var comp_type =  CompartmentTypes.findOne({name: "HorizontalLine8", elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elemId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
			}
		}
	},
	
	setHorizontalLineProperty: async function(elemId, compart_type_id){
		
		if(typeof compart_type_id === "undefined") {
			compart_type_id = elemId.compartmentType._id;
			elemId = Session.get("activeElement");
		}
		console.log(elemId, compart_type_id)
		let elem = await Elements.findOneAsync({_id: elemId});
		let compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Multiplicity" || compartTypeName === "EquivalentProperties" || compartTypeName === "SuperProperties" || compartTypeName === "DisjointProperties" || compartTypeName === "Domain"|| compartTypeName === "Range"	
		){

			let horLineNames = {
				Multiplicity: "HorizontalLine15",
				EquivalentProperties: "HorizontalLine16",
				SuperProperties: "HorizontalLine17",
				DisjointProperties: "HorizontalLine18",
				Domain: "HorizontalLine27",
				Range: "HorizontalLine27"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elemId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
	},
	
	setHorizontalLineDataProperty: async function(elemId, compart_type_id){
		
		if(typeof compart_type_id === "undefined") {
			compart_type_id = elemId.compartmentType._id;
			elemId = Session.get("activeElement");
		}
		console.log(elemId, compart_type_id)
		let elem = await Elements.findOneAsync({_id: elemId});
		let compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Multiplicity" || compartTypeName === "EquivalentProperties" || compartTypeName === "SuperProperties" 
		|| compartTypeName === "DisjointProperties"	|| compartTypeName === "Domain"	|| compartTypeName === "Range"	
		){

			let horLineNames = {
				Domain: "HorizontalLine20",
				Range: "HorizontalLine20",
				Multiplicity: "HorizontalLine21",
				EquivalentProperties: "HorizontalLine22",
				SuperProperties: "HorizontalLine23",
				DisjointProperties: "HorizontalLine24"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elemId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
	},
	
	setHorizontalLineDataPropertyAssertion: async function(elemId, compart_type_id){
		
		if(typeof compart_type_id === "undefined") {
			compart_type_id = elemId.compartmentType._id;
			elemId = Session.get("activeElement");
		}
		console.log(elemId, compart_type_id)
		let elem = await Elements.findOneAsync({_id: elemId});
		let compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Type" || compartTypeName === "Value"){

			let horLineNames = {
				Type: "HorizontalLine28",
				Value: "HorizontalLine28"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elemId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
	},

	removeHorizontalLine: async function(compart_id){
	  let compart = Compartments.findOne({_id: compart_id});
	  let compartments = Compartments.find({compartmentTypeId: compart.compartmentTypeId, elementId:compart.elementId}).map(function(c){return c["input"];});
	  if(compartments.length <= 1){

		let elem = await Elements.findOneAsync({_id: compart.elementId});
		let compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId});
		let compartTypeName = compart_type.name;

		if(compartTypeName === "EquivalentClasses" || compartTypeName === "SuperClasses" || compartTypeName === "DisjointClasses"
		|| compartTypeName === "Keys" || compartTypeName === "Attributes" || compartTypeName === "SuperProperties"
		|| compartTypeName === "NegativeDataPropertyAssertion" || compartTypeName === "DataPropertyAssertion" || compartTypeName === "DifferentIndividuals" || compartTypeName === "SameIndividuals"){

			let horLineNames = {
				EquivalentClasses: "HorizontalLine2",
				SuperClasses: "HorizontalLine3",
				DisjointClasses: "HorizontalLine4",
				Keys: "HorizontalLine5",
				Attributes: "HorizontalLine6",
				SuperProperties: "HorizontalLine7", //8
				NegativeDataPropertyAssertion: "HorizontalLine9",
				DataPropertyAssertion: "HorizontalLine10",
				DifferentIndividuals: "HorizontalLine11",
				SameIndividuals: "HorizontalLine11"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: compart.elementId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = false
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};

			if(compartTypeName === "SuperProperties"){
				var comp_type =  CompartmentTypes.findOne({name: "HorizontalLine8", elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: compart.elementId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = false
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
			}
		}
		}
	},
	
	removeHorizontalLineProperty: async function(compart_id){
	  let compart = Compartments.findOne({_id: compart_id});
	  let compartments = Compartments.find({compartmentTypeId: compart.compartmentTypeId, elementId:compart.elementId}).map(function(c){return c["input"];});
	  if(compartments.length <= 1){

		let elem = await Elements.findOneAsync({_id: compart.elementId});
		let compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId});
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Multiplicity" || compartTypeName === "EquivalentProperties" || compartTypeName === "SuperProperties" 
		|| compartTypeName === "DisjointProperties"	|| compartTypeName === "Domain"	|| compartTypeName === "Range"	
		){

			let horLineNames = {
				Domain: "HorizontalLine20",
				Range: "HorizontalLine20",
				Multiplicity: "HorizontalLine21",
				EquivalentProperties: "HorizontalLine22",
				SuperProperties: "HorizontalLine23",
				DisjointProperties: "HorizontalLine24"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: compart.elementId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = false
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
		}
	},	
	
	removeHorizontalLineDataProperty: async function(compart_id){
	  let compart = Compartments.findOne({_id: compart_id});
	  let compartments = Compartments.find({compartmentTypeId: compart.compartmentTypeId, elementId:compart.elementId}).map(function(c){return c["input"];});
	  if(compartments.length <= 1){

		let elem = await Elements.findOneAsync({_id: compart.elementId});
		let compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId});
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Multiplicity" || compartTypeName === "EquivalentProperties" || compartTypeName === "SuperProperties" || compartTypeName === "DisjointProperties" || compartTypeName === "Domain" || compartTypeName === "Range"	
		){

			let horLineNames = {
				Multiplicity: "HorizontalLine15",
				EquivalentProperties: "HorizontalLine16",
				SuperProperties: "HorizontalLine17",
				DisjointProperties: "HorizontalLine18",
				Domain: "HorizontalLine27",
				Range: "HorizontalLine27"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: compart.elementId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = false
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
		}
	},
	
	removeHorizontalLineDataPropertyAssertion: async function(compart_id){
	  let compart = Compartments.findOne({_id: compart_id});
	  let compartments = Compartments.find({compartmentTypeId: compart.compartmentTypeId, elementId:compart.elementId}).map(function(c){return c["input"];});
	  if(compartments.length <= 1){

		let elem = await Elements.findOneAsync({_id: compart.elementId});
		let compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId});
		let compartTypeName = compart_type.name;

		if(compartTypeName === "Type" || compartTypeName === "Value"){

			let horLineNames = {
				Type: "HorizontalLine28",
				Value: "HorizontalLine28"
			}
			var elem_type_id = elem["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: horLineNames[compartTypeName], elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: compart.elementId, compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = false
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
			};
		}
		}
	},
	
	
	setClassifierTypeOwlgred: async function(compart_id){
		
		let compart = Compartments.findOne({_id: compart_id.compartmentId});
		let elem = await Elements.findOneAsync({_id: compart.elementId});
		var compTypeLabel =  CompartmentTypes.findOne({name: "Label", elementTypeId: elem["elementTypeId"]});
		let label = Compartments.findOne({elementId: compart.elementId, compartmentTypeId: compTypeLabel["_id"]});
		console.log("setClassifierTypeOwlgred", compart_id, compart_id.value, compart, elem, compTypeLabel, label)
		const value = compart_id.value;
		const elemOWLGrEd = await Create_OWLGrEd_Element(elem["_id"]);
		if(value === "Individual_enumeration"){
			await elemOWLGrEd.setCompartmentValue("Label", "<<Classifier>>", "<<Classifier>>");
		} else if(value === "SKOS_vocabulary"){
			await elemOWLGrEd.setCompartmentValue("Label", "<<SKOS vocabulary>>", "<<SKOS vocabulary>>");
			await elemOWLGrEd.setCompartmentValue("ClosedClassifier", "false", "");
			await elemOWLGrEd.setCompartmentValue("DifferentIndividuals", "false", "");
		} else if(value === "Individual_enumeration_SKOS"){
			await elemOWLGrEd.setCompartmentValue("Label", "<<Classifier vocabulary>>", "<<Classifier vocabulary>>");
		} else if(value === "Datatype_enumeration"){
			await elemOWLGrEd.setCompartmentValue("Label", "<<Datatype classifier>>", "<<Datatype classifier>>");
			await elemOWLGrEd.setCompartmentValue("ClosedClassifier", "false", "");
			await elemOWLGrEd.setCompartmentValue("DifferentIndividuals", "false", "");
		}
		
	},
});

function flattenObjectToArray(obj, prefix = '') {
    let result = [];
    for (let key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const value = obj[key];
        const attrName = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result = result.concat(flattenObjectToArray(value, attrName));
        } else {
            result.push({ attrName, attrValue: value });
        }
    }
    return result;
}


export {
}
