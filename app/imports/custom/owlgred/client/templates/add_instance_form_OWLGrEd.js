import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Compartments, CompartmentTypes, Elements } from '/imports/db/platform/collections';
import { process_sub_compart_types } from '/imports/platform/client/templates/diagrams/dialog/subCompartments';
import { Create_OWLGrEd_Element } from '../js/OWLGrEd_Element.js';
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'

import './add_instance_form_OWLGrEd.html';

Template.AddInstance_OWLGrEd.onCreated(function () {
  this.attributeInputs = new ReactiveVar([]);

  this.autorun(async () => {
    const selectedElemId = Session.get("activeElement");
    if (!selectedElemId) {
      this.attributeInputs.set([]);
      return;
    }

    const elemOWLGrEd = await Create_OWLGrEd_Element(selectedElemId);
    const attributes = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Attributes");

    const attributeInputs = (attributes || []).map((attr) => {
      const attributeId = attr?._id?._id || attr?.fulltext?._id || "";
      const attributeName = attr?.Name || "";

      return {
        attributeId,
        attributeName,
        inputId: `instance-${attributeId}`,
        value: ""
      };
    });

    this.attributeInputs.set(attributeInputs);
  });
});

Template.AddInstance_OWLGrEd.helpers({
  field_instance_obj: function () {
    const data_in = Template.currentData();
    if (!data_in) return;

    const instance = Template.instance();

    const compart_type_id = data_in["_id"];
    let compart_id = Session.get("multFieldCompartmentId");
    const compart = Compartments.findOne({ _id: compart_id });

    const fields = [];
    const compart_type = CompartmentTypes.findOne({ _id: compart_type_id });
    if (!compart_type) {
      return { fields: [], attributeInputs: [], iriValue: "" };
    }

    let sub_compartment;
    if (compart) {
      sub_compartment = compart["subCompartments"][compart_type["name"]];
      compart_id = compart["_id"];
    }

    process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);

    for (let i = 0; i < fields.length; i++) {
      fields[i][fields[i]["name"].replace(/\s/g, '').replace(/-/g, '')] = true;
    }

    const templateAttributes = instance.attributeInputs.get() || [];

    let savedItems = [];
    let iriValue = "";

    // fields[0].field_value contains encoded JSON for Individual
    const individualField = fields.find(f => f.name === "Individual");

    if (individualField && individualField.field_value) {
      try {
        savedItems = JSON.parse(individualField.field_value) || [];
      } catch (e) {
        console.warn("Invalid Individual field_value JSON:", individualField.field_value);
      }
    }

    // Extract IRI
    const iriItem = savedItems.find(item => item.id === "IRI");
    if (iriItem) {
      iriValue = iriItem.value || iriItem.input || "";
    }

    // Map saved values by id
    const savedMap = {};
    savedItems.forEach(item => {
      if (item.id && item.id !== "IRI") {
        savedMap[item.id] = item;
      }
    });

    // Fill current template attributes from saved values
    const mergedAttributeInputs = templateAttributes.map(attr => {
      const saved = savedMap[attr.attributeId];
      return {
        ...attr,
        value: saved ? (saved.value || saved.input || "") : ""
      };
    });

    // Add attributes that exist in saved data but are missing in current template
    const existingIds = new Set(mergedAttributeInputs.map(a => a.attributeId));

    savedItems.forEach(item => {
      if (item.id !== "IRI" && !existingIds.has(item.id)) {
        mergedAttributeInputs.push({
          attributeId: item.id,
          attributeName: item.name || item.id,
          inputId: `instance-${item.id}`,
          value: item.value || item.input || ""
        });
      }
    });

    return {
      _id: compart_type["_id"],
      compartmentId: compart_id,
      name: compart_type["name"],
      label: compart_type["label"],
      fields,
      iriValue,
      attributeInputs: mergedAttributeInputs
    };
  }
});

Template.AddInstance_OWLGrEd.events({
  'click #ok-add-new-instance-owlgred': async function (e, templ) {
    const attributeValues = [];
	
	 const iri = templ.$('#add-instance-iri').val();
	 attributeValues.push({
        id: "IRI",
        name: "IRI",
        value: iri,
        input: iri
      });
	 

    templ.$('.instance-attribute-input').each(function () {
      attributeValues.push({
        id: this.dataset.attributeId,
        name: this.dataset.attributeName,
        value: this.value,
        input: ""
      });
    });
	
	
	let selected_elem_id = Session.get("activeElement");
	let elem = document.getElementById("add-instance-form-owlgred");
	let act_el = await Elements.findOneAsync({_id: selected_elem_id});
	    // if new individual
		if(elem.getAttribute("compartmentId") === null){

			if (await Elements.findOneAsync({_id: selected_elem_id})){
				let owlgred_obj = await Create_OWLGrEd_Element(selected_elem_id);

			   await owlgred_obj.addCompartmentSubCompartments2("Individuals",[
				 {name:"Individual",input:iri, value:JSON.stringify(attributeValues)}
				])

			};
		} else {

			let compart_type = await CompartmentTypes.findOneAsync({name: "Individuals", elementTypeId: act_el["elementTypeId"]});
			let compart = await Compartments.findOneAsync({_id:elem.getAttribute("compartmentId"), compartmentTypeId: compart_type["_id"], elementId: selected_elem_id});

			if(typeof compart !== "undefined"){

				let attribute = compart.subCompartments.Individuals.Individuals;


				attribute.Individual.input = JSON.stringify(attributeValues);
				attribute.Individual.value = iri;

				let act_elem = Session.get("activeElement");

				let value = Dialog.buildCompartmentValue(compart_type, iri, iri);
				Dialog.updateCompartmentValue(compart_type, act_elem, iri, value, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
			}
		}
	
    // console.log("attributeValues", attributeValues);
  },

  'click #cancel-add-new-instance-owlgred': function() {
    let rows = document.querySelectorAll('#instance-table-annotations tbody tr');
    rows.forEach(row => row.remove());

    if (document.getElementById("add-instance-name")) {
      document.getElementById("add-instance-name").value = "";
    }
    if (document.getElementById("add-instance-class")) {
      document.getElementById("add-instance-class").value = "";
    }
  },

  'click #add-instance-annotation-row-btn': function(e) {
    e.preventDefault();

    const tbody = document.querySelector('#instance-table-annotations tbody');
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
      <td>
        <input class="form-control property-select" type="text" name="annotationType" list="InstanceAnnotationTypeList" autocomplete="off" />
      </td>
      <td>
        <input class="form-control property-select" type="text" name="annotationValue" autocomplete="off" />
      </td>
      <td>
        <input class="form-control property-select" type="text" name="annotationLang" list="InstanceLanguageList" autocomplete="off" />
      </td>
      <td>
        <button class="btn btn-sm btn-danger delete-btn">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(newRow);
  },

  'click .delete-btn': function(event) {
    event.preventDefault();
    const row = event.currentTarget.closest('tr');
    if (row) row.remove();
  },
});