import { Interpreter } from '/imports/client/lib/interpreter'
import { Elements, Compartments, CompartmentTypes  } from '/imports/db/platform/collections'
import { process_sub_compart_types } from '/imports/platform/client/templates/diagrams/dialog/subCompartments'
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import { Utilities } from '/imports/platform/client/js/utilities/utils.js'
import { Create_OWLGrEd_Element } from '../js/OWLGrEd_Element.js';

import './add_attribute_form_OWLGrEd.html'

Template.AddAttribute_OWLGrEd.helpers({

	field_obj: function() {
		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		//var compart_type_id = $(this).$(".multi-field").attr("id");
		//var compart_type_id = Session.get("multiRowCompartmentTypeId");

		// var compart_type_id = data_in["compartmentTypeId"];
		var compart_type_id = data_in["_id"];
		let compart_id = Session.get("multFieldCompartmentId");
		// if(compart_id === null || typeof compart_id === "undefined") compart_id = Template.AddNewAttribute.attributeidEdit.get();
		var compart = Compartments.findOne({_id: compart_id});

		var fields = [];

		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		if (!compart_type) {
			return {fields: fields};
		}

		var sub_compartment;
		if (compart) {
			sub_compartment = compart["subCompartments"][compart_type["name"]];
			compart_id = compart["_id"];
		}

		process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);
		let require = false;
		for (let field = 0; field < fields.length; field++) {
			fields[field][fields[field]["name"].replace(/\s/g, '').replace(/-/g, '')] = true;
			// if(fields[field]["name"] == "Annotation") fields[field]["next_level_form"] = "show_sub_multi_field_form";
			const fieldValue = fields[field]["field_value"];

			const fieldName = fields[field]["name"];
			if (
			  fieldValue != null &&                            // not null and not undefined
			  fieldValue !== "" &&                             // not empty string
			  (fieldName === "Annotation" ||
			   fieldName === "EquivalentProperties" ||
			   fieldName === "SuperProperties" ||
			   fieldName === "DisjointProperties")
			) {
			  try {
				fields[field]["field_value"] = JSON.parse(fieldValue);
			  } catch (e) {
				console.warn("Invalid JSON:", fieldValue);
			  }
			}
		}


		var field_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["name"],
						label: compart_type["label"],
						fields: fields,
					};

		return field_obj;
	},

});


Template.AddAttribute_OWLGrEd.events({

	'click #ok-add-new-attribute-owlgred': async function(e, templ) {
		let elem = document.getElementById("add-attribute-form-owlgred");
		let selected_elem_id = Session.get("activeElement");
		let act_el = await Elements.findOneAsync({_id: selected_elem_id});
		if(elem.getAttribute("compartmentId") === null){
			if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			//Read user's choise
			  let vq_obj = await Create_OWLGrEd_Element(selected_elem_id);

			};
		}


		let name = "";
		let type = "";
		let multiplicity = "";
		let annotations = "";
		let isFunctional = "";
		let equivalentProperties = "";
		let superProperties = "";
		let disjointProperties = "";

		if(document.getElementById("add-attribute-name") != null) name = document.getElementById("add-attribute-name").value;
		if(document.getElementById("add-attribute-type") != null) type = document.getElementById("add-attribute-type").value;
		if(document.getElementById("add-attribute-multiplicity") != null) multiplicity = document.getElementById("add-attribute-multiplicity").value;
		if(document.getElementById("add-attribute-IsFunctional") != null) isFunctional = document.getElementById("add-attribute-IsFunctional").checked;


		const annotationsTable = templ.findAll('#property-table-annotations tbody tr');
		const annotationsResult = [];

		const rows = document.querySelectorAll('#property-table-annotations tbody tr');
		rows.forEach(row => {
		  const annotationTypeInput = row.querySelector('td:nth-child(1) input');
		  const valueInput = row.querySelector('td:nth-child(2) input');
		  const languageInput = row.querySelector('td:nth-child(3) input');

		  const annotationType = annotationTypeInput?.value?.trim();
		  const value = valueInput?.value?.trim();
		  const language = languageInput?.value?.trim();

		  if (annotationType && value) {
			annotationsResult.push({
			  name: "Annotation",
			  annotationType,
			  value,
			  language,
			  input: value,
			  // subCompartments: [
				// { name: "Type", value: annotationType, input: annotationType },
				// { name: "Value", value: value, input: value },
				// { name: "Language", value: language || "", input: language || "" }
			  // ]
			});
		  }
		});


		const equivelentTable = document.querySelectorAll('#property-table-equivalent tbody tr');
		const equivelentResult = [];
		equivelentTable.forEach(row => {
		  const propertyInput = row.querySelector('td:nth-child(1) input');
		  const propertyValue = propertyInput?.value?.trim();

		  if (propertyValue) {
			equivelentResult.push({
			  name: "equivalent",
			  value: propertyValue,
			  input: "\u2261"+propertyValue,
			  // subCompartments: [
				// { name: "Property", value: propertyValue, input: propertyValue }
			  // ]
			});
		  }
		});


		const superTable = document.querySelectorAll('#property-table-super tbody tr');
		const superResult = [];
		superTable.forEach(row => {
		  const propertyInput = row.querySelector('td:nth-child(1) input');
		  const propertyValue = propertyInput?.value?.trim();

		  if (propertyValue) {
			superResult.push({
			  name: "super",
			  value: propertyValue,
			  input: "\u2286"+propertyValue,
			  // subCompartments: [
				// { name: "Property", value: propertyValue, input: propertyValue }
			  // ]
			});
		  }
		});

		const disjointTable = document.querySelectorAll('#property-table-disjoint tbody tr');
		const disjointResult = [];
		disjointTable.forEach(row => {
		  const propertyInput = row.querySelector('td:nth-child(1) input');
		  const propertyValue = propertyInput?.value?.trim();

		  if (propertyValue) {
			disjointResult.push({
			  name: "disjoint",
			  value: propertyValue,
			  input: "\u27C2"+propertyValue,
			  // subCompartments: [
				// { name: "Property", value: propertyValue, input: propertyValue }
			  // ]
			});
		  }
		});


		equivalentProperties = `${equivelentResult.map(item => item.input).join(', ')}`;
		superProperties = `${superResult.map(item => item.input).join(', ')}`;
		disjointProperties = `${disjointResult.map(item => item.input).join(', ')}`;

		// annotations = annotationsResult
		  // .map(item => `${item.annotationType} : ${item.value}${item.language ? '@' + item.language : ''}`)
		  // .join(', ');
		annotations = annotationsResult.map(item => {
		  const lang = item.language ? `@${item.language}` : '';
		  return `${item.annotationType} : "${item.value}"${lang}`;
		}).join(', ');


		if(elem.getAttribute("compartmentId") === null){

			if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			  var owlgred_obj = await Create_OWLGrEd_Element(selected_elem_id);

			   await owlgred_obj.addCompartmentSubCompartments2("Attributes",[
				  {name:"Name",value:name},
				  {name:"Type",value:type},
				  {name:"Multiplicity",value:multiplicity},
				  {name:"Annotation",input:annotations, value:JSON.stringify(annotationsResult)},
				  {name:"IsFunctional",value:isFunctional.toString()},
				  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
				  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
				  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
				])
			}
		} else {

			var compart_type = await CompartmentTypes.findOneAsync({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
			var compart = await Compartments.findOneAsync({_id:elem.getAttribute("compartmentId"), compartmentTypeId: compart_type["_id"], elementId: selected_elem_id});

			if(typeof compart !== "undefined"){

				let attribute = compart.subCompartments.Attributes.Attributes;

				let funcValue = "";
				if(isFunctional === true) funcValue = "{func}";
				attribute.Name.value = name;
				attribute.Name.input = name;
				attribute.Type.value = type;
				attribute.Type.input = type;
				attribute.Multiplicity.value = multiplicity;
				attribute.Multiplicity.input = multiplicity;
				attribute.Annotation.input = JSON.stringify(annotationsResult);
				attribute.Annotation.value = annotations;
				attribute.IsFunctional.value = funcValue;
				attribute.IsFunctional.input = isFunctional.toString();
				attribute.EquivalentProperties.input = JSON.stringify(equivelentResult);
				attribute.EquivalentProperties.value = equivalentProperties;
				attribute.SuperProperties.input = JSON.stringify(superResult);
				attribute.SuperProperties.value = superProperties;
				attribute.DisjointProperties.input = JSON.stringify(disjointResult);
				attribute.DisjointProperties.value = disjointProperties;


				let fullText = "";
				if(name) fullText = fullText + name;
				if(type) fullText = fullText + " : " + type;
				if(multiplicity) fullText = fullText + "[" +multiplicity + "]";
				if(annotations) fullText = fullText + "{" +annotations + "}";
				if(isFunctional) fullText = fullText + funcValue;
				if(equivalentProperties) fullText = fullText + "{" +equivalentProperties + "}";
				if(superProperties) fullText = fullText + "{" +superProperties + "}";
				if(disjointProperties) fullText = fullText + "{" +disjointProperties + "}";

				var act_elem = Session.get("activeElement");

				let value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				Dialog.updateCompartmentValue(compart_type, act_elem, fullText, value, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
			}

		}

		var elem_id = Session.get("activeElement");
		let element = Elements.findOne({_id: elem_id});
			var elem_type_id = element["elementTypeId"];
			var comp_type =  CompartmentTypes.findOne({name: "HorizontalLine6", elementTypeId: elem_type_id});

			if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp =  Compartments.findOne({elementId: elem_id, compartmentTypeId: comp_type_id});
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
		rows.forEach(row => row.remove());
		equivelentTable.forEach(row => row.remove());
		superTable.forEach(row => row.remove());
		disjointTable.forEach(row => row.remove());
		document.getElementById("add-attribute-name").value = "";
		document.getElementById("add-attribute-type").value = "";
		document.getElementById("add-attribute-multiplicity").value = "";
		document.getElementById("add-attribute-IsFunctional").checked = false;
		return;
	},

	'click #cancel-add-new-attribute-owlgred': function(e, templ) {
	  let rows = document.querySelectorAll('#property-table-annotations tbody tr');
	  rows.forEach(row => row.remove());
	  rows = document.querySelectorAll('#property-table-equivalent tbody tr');
	  rows.forEach(row => row.remove());
	  rows = document.querySelectorAll('#property-table-super tbody tr');
	  rows.forEach(row => row.remove());
	  rows = document.querySelectorAll('#property-table-disjoint tbody tr');
	  rows.forEach(row => row.remove());
	  document.getElementById("add-attribute-name").value = "";
	  document.getElementById("add-attribute-type").value = "";
	  document.getElementById("add-attribute-multiplicity").value = "";
	  document.getElementById("add-attribute-IsFunctional").checked = false;
	},



	'click #ok-add-new-attribute-owlgred2': function(e, templ) {
		var src = $(e.target);

		var form = templ.$(".row-form");
		form.modal("hide");

		var compart_type_id = form.attr("compartmentTypeId");
		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		if (!compart_type) {
			return;
		}

		var sub_compart_tree = {};

		var multi_field = form.find(".multi-field");

		var res = Dialog.buildSubCompartmentTree(multi_field, compart_type, sub_compart_tree);

		var input = res;
		var value = input;

		var src_id = form.attr("compartmentId");
		var elem_id = form.attr("date-element") || Session.get("activeElement");

		var elem_style;
		var compart_style;

		if(typeof src_id === "undefined") Interpreter.executeExtensionPoint(compart_type, "createCompartment", [elem_id]);

		Dialog.updateCompartmentValue(compart_type, elem_id, input, value, src_id, compart_style, elem_style, sub_compart_tree);
	},



	'click #add-annotation-row-btn': function(e, templ) {
	  var tbody = document.querySelector('#property-table-annotations tbody');
	  var newRow = document.createElement('tr');

	  newRow.innerHTML = `
		<td>
												<input class="form-control property-select" type="text" name="product" list="AnnotationTypeList" autocomplete="off" />
												<datalist id="AnnotationTypeList" class="datalist">
													<option mappedValue="backwardCompatibleWith" input="backwardCompatibleWith">backwardCompatibleWith</option>
													<option mappedValue="comment" input="comment">comment</option>
													<option mappedValue="deprecated" input="deprecated">deprecated</option>
													<option mappedValue="incompatibleWith" input="incompatibleWith">incompatibleWith</option>
													<option mappedValue="isDefinedBy" input="isDefinedBy">isDefinedBy</option>
													<option mappedValue="label" input="label">label</option>
													<option mappedValue="priorVersion" input="priorVersion">priorVersion</option>
													<option mappedValue="seeAlso" input="seeAlso">seeAlso</option>
													<option mappedValue="versionInfo" input="versionInfo">versionInfo</option>
												</datalist>
											  </td>
											  <td>
												<input class="form-control property-select" type="text" name="product" autocomplete="off" />
											  </td>
											  <td>
												<input class="form-control property-select" type="text" name="product" list="LanguageList" autocomplete="off" />
												<datalist id="LanguageList" class="datalist">
													<option mappedValue="en" input="en">en</option>
													<option mappedValue="lv" input="lv">lv</option>
													<option mappedValue="de" input="de">de</option>
													<option mappedValue="es" input="es">es</option>
													<option mappedValue="fr" input="fr">fr</option>
													<option mappedValue="pt" input="pt">pt</option>
												</datalist>
											  </td>
											  <td>
												<button class="btn btn-sm btn-danger delete-btn">
												  <i class="fa fa-trash"></i>
												</button>
											  </td>	  `;

	  tbody.appendChild(newRow);
	},

	'click #add-equivalent-properties-row-btn': function(e, templ) {
	  var tbody = document.querySelector('#property-table-equivalent tbody');
	  var newRow = document.createElement('tr');

	  newRow.innerHTML = `
		<tr>
											  <td>
												<input class="form-control property-select" type="text" name="product" list="productName"  autocomplete="off" />
											  </td>
											  <td>
												<button class="btn btn-sm btn-danger delete-btn">
												  <i class="fa fa-trash"></i>
												</button>
											  </td>
											</tr>	  `;

	  tbody.appendChild(newRow);
	},

	'click #add-disjoint-properties-row-btn': function(e, templ) {
	  var tbody = document.querySelector('#property-table-disjoint tbody');
	  var newRow = document.createElement('tr');

	  newRow.innerHTML = `
		<tr>
											  <td>
												<input class="form-control property-select" type="text" name="product" list="productName"  autocomplete="off" />
											  </td>
											  <td>
												<button class="btn btn-sm btn-danger delete-btn">
												  <i class="fa fa-trash"></i>
												</button>
											  </td>
											</tr>	  `;

	  tbody.appendChild(newRow);
	},

	'click #add-super-properties-row-btn': function(e, templ) {
	  var tbody = document.querySelector('#property-table-super tbody');
	  var newRow = document.createElement('tr');

	  newRow.innerHTML = `
		<tr>
											  <td>
												<input class="form-control property-select" type="text" name="product" list="productName"  autocomplete="off" />
											  </td>
											  <td>
												<button class="btn btn-sm btn-danger delete-btn">
												  <i class="fa fa-trash"></i>
												</button>
											  </td>
											</tr>	  `;

	  tbody.appendChild(newRow);
	},

	'click .delete-btn': function (event, template) {
		event.preventDefault();
		// Remove the row containing the clicked delete button
		const row = event.currentTarget.closest('tr');
		if (row) {
		  row.remove();
		}
	},

});


function safeParse(input) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return input;
  }
}
