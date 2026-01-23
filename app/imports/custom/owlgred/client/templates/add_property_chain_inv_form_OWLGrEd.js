import { Template } from 'meteor/templating';
import { Projects, Elements, Compartments, CompartmentTypes } from '/imports/db/platform/collections'
import { process_sub_compart_types } from '/imports/platform/client/templates/diagrams/dialog/subCompartments'
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import { Utilities } from '/imports/platform/client/js/utilities/utils.js'
import { Create_New_OWLGrEd_Element, Create_OWLGrEd_Element } from '../js/OWLGrEd_Element.js';

import './add_property_chain_inv_form_OWLGrEd.html'

Template.AddPropertyChainInv_OWLGrEd.helpers({

	key_obj:  function() {
		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		var compart_type_id = data_in["compartmentTypeId"];
		var compart =  Compartments.findOne({_id: Session.get("multFieldCompartmentId")});
		var fields = [];

		var compart_type =  CompartmentTypes.findOne({_id: compart_type_id});
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

		for (let field = 0; field < fields.length; field++) {
			fields[field][fields[field]["name"].replace(/\s/g, '').replace(/-/g, '')] = true;
			const fieldValue = fields[field]["field_value"];

			const fieldName = fields[field]["name"];
			if (
			  fieldValue !== null &&                            // not null and not undefined
			  fieldValue !== ""                             // not empty string
			) {
			  try {
				fields[field]["field_value"] = JSON.parse(fieldValue);
			  } catch (e) {
				console.warn("Invalid JSON:", fieldValue);
			  }
			}
		}

		if(typeof fields[0] !== "undefined" && typeof fields[0]["field_value"] !== "undefined" && fields[0]["field_value"] !== "")	fields = transformFields(fields[0]["field_value"]);
		else fields = [];

		// if(typeof sub_compartment !== "undefined" && typeof sub_compartment["PropertyChainsInv"] !== "undefined") {
			// fields = sub_compartment["PropertyChainsInv"];
			// fields = transformFields(sub_compartment["PropertyChainsInv"]);
		// }
		var key_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["name"],
						label: compart_type["label"],
						fields: fields,
					};

		return key_obj;
	},

});


Template.AddPropertyChainInv_OWLGrEd.events({
	'click #ok-add-new-property-chain-inv-owlgred': async function(e, templ) {

	const result = [];

    const rows = templ.findAll('#property-table-inv tbody tr');
    rows.forEach(row => {
      const propertyInputRow = row.querySelector('td:nth-child(1) input');
      // const inverseSelect = row.querySelector('td:nth-child(2) select');
	  const inverseCheckbox = row.querySelector('td:nth-child(2) input[type="checkbox"]');

      const propertyValue = propertyInputRow?.value?.trim();
      let propertyInput = propertyValue;
      // const isInverseValue = inverseSelect?.value?.toLowerCase() === "true";
	  const isInverseValue = inverseCheckbox.checked;   // true / false
	  if(isInverseValue) propertyInput = "inv("+ propertyInput + ")";

      if (propertyValue) {
		result.push(
		{
			name: "PropertyChain",
			value: propertyValue,
			input: propertyInput,
			delimiter: " o ",
			subCompartments: [
				{ name: "Property", value: propertyValue, input: propertyInput },
				{ name: "Inverse", value: isInverseValue, input: "" }
			]
		})
      }
    });

	let chainProperties = `${result.map(item => item.input).join(' o ')}`;

		var selected_elem_id = Session.get("activeElement");
		var elem = document.getElementById("add-property-chain-inv-form-owlgred");
		var act_el = await Elements.findOneAsync({_id: selected_elem_id});
		if(elem.getAttribute("compartmentId") === null){

			if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			  var owlgred_obj = await Create_OWLGrEd_Element(selected_elem_id);
			  // await owlgred_obj.addCompartmentSubCompartments("PropertyChainsInv", result)
			  await owlgred_obj.addCompartmentSubCompartments2("PropertyChainsInv",[
				 {name:"PropertyChain",input:chainProperties, value:JSON.stringify(result)}
				])
			};
		} else {

			var compart_type = await CompartmentTypes.findOneAsync({name: "PropertyChainsInv", elementTypeId: act_el["elementTypeId"]});
			var compart = await Compartments.findOneAsync({_id:elem.getAttribute("compartmentId"), compartmentTypeId: compart_type["_id"], elementId: selected_elem_id});

			if(typeof compart !== "undefined"){

				let attribute = compart.subCompartments.PropertyChainsInv.PropertyChainsInv;


				attribute.PropertyChain.input = JSON.stringify(result);
				attribute.PropertyChain.value = chainProperties;

				var act_elem = Session.get("activeElement");

				let value = Dialog.buildCompartmentValue(compart_type, chainProperties, chainProperties);
				Dialog.updateCompartmentValue(compart_type, act_elem, chainProperties, value, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
			}

			// if(typeof compart !== "undefined"){
				// let fullTextArray = []
				 // let keys = [];
				 // for(let key = 0; key < result.length; key++){
					 // fullTextArray.push(result[key]["subCompartments"][0]["input"]);
					 // keys.push(
					   // {
						 // "PropertyChain":{
							 // "Inverse": {
								 // "input":result[key]["subCompartments"][1]["value"],
								 // "value":result[key]["subCompartments"][1]["input"]
							 // },
							  // "Property": {
								 // "input":result[key]["subCompartments"][0]["value"],
								 // "value":result[key]["subCompartments"][0]["input"]
							 // }
						 // }
					   // }
					 // )
				 // }

				// compart.subCompartments.PropertyChainsInv.PropertyChainsInv = keys;
				// var act_elem = Session.get("activeElement");
				// let fullText = fullTextArray.join(" o ");
				// let value = Dialog.buildCompartmentValue(compart_type, fullText, fullText);
				// Dialog.updateCompartmentValue(compart_type, act_elem, fullText, value, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
			// }
		}

		rows.forEach(row => row.remove());
	},

	'click #cancel-add-new-property-chain-inv-owlgred': function(e, templ) {
	  const rows = templ.findAll('#property-table tbody tr');
	  rows.forEach(row => row.remove());
	},


	'click #add-key-row-btn': function(e, templ) {
	  var tbody = document.querySelector('#property-table-inv tbody');
	  var newRow = document.createElement('tr');

	  newRow.innerHTML = `
		<td>
			<input class="form-control property-select" type="text" name="product" autocomplete="off" list="productName" />
			<datalist id="productName">
			<option value="">Select a property</option>
			</datalist>
		</td>
		<td style="text-align: center; vertical-align: middle;">
		  <input
			type="checkbox"
			class="is-inverse-checkbox"
		  />
		</td>
								 <button id="delete-key-row-btn" class="btn btn-sm btn-danger delete-btn">
									<i class="fa fa-trash"></i> Delete
								  </button>
	   </td>	  `;

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


function transformFields(field_value) {
  return field_value.map(field => {
    const propertyObj = field.subCompartments.find(sc => sc.name === "Property");
    const inverseObj = field.subCompartments.find(sc => sc.name === "Inverse");

    const property = propertyObj ? propertyObj.value || propertyObj.input : "";
    const inverseVal = inverseObj ? inverseObj.value : false;

    return {
      Property: property,
      InverseTrue: inverseVal === true ? "checked" : "",
      InverseFalse: inverseVal === false ? "selected" : ""
    };
  });
}
