import { Interpreter } from '../../../lib/interpreter.js'
import { dataShapes } from '../../../custom/vq/js/DataShapes.js'
import { createVQ_Element } from '../js/VQ_Element.js'
import { Projects, Elements } from '../../../../db/platform/collections.js'
import { executeSparqlString } from '../../../custom/vq/js/generateSPARQL_jo.js'
import './VQ_DSS_custom_sparql.html'
// import { runFragmentAlgorithm, compareFragmentAlgorithmsIntersection, compareFragmentAlgorithmsSizeIncrease, compareFragmentAlgorithmsRank } from './fragments.js';

Template.VQ_DSS_custom_sparql.DirRole = new ReactiveVar('');
Template.VQ_DSS_custom_sparql.ClassName = new ReactiveVar('');
Template.VQ_DSS_custom_sparql.Properties = new ReactiveVar('');
Template.VQ_DSS_custom_sparql.SelectedProperties = new ReactiveVar('');


Interpreter.customMethods({
	GenereteSPARQL_form_class_costumise_DSS: async function() {
	  let editor = Interpreter.editor;
	  let elem = _.keys(editor.getSelectedElements());
	  let selected_elem = await createVQ_Element(elem[0]);
	  let name = await selected_elem.getCompartmentValue("Name");
	  if(name.indexOf("[") !== -1) name = name.substring(0, name.indexOf("]")+1);
	  else {
			if(name.startsWith("(")) name = name.substring(name.indexOf("(")+1);
			let nameIndex = name.lastIndexOf(" (");
			if(nameIndex === -1) nameIndex = name.length;
			name = name.substring(0, nameIndex);
	  }
	  Template.VQ_DSS_custom_sparql.ClassName.set(name);
	  let properties = getProperties(name);
	  Template.VQ_DSS_custom_sparql.Properties.set(properties);
	  Template.VQ_DSS_custom_sparql.SelectedProperties.set([]);
	  
	  
	  let dirRole = "a";

	  let proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
	  if (proj) {
		if (proj.directClassMembershipRole) {
			dirRole = proj.directClassMembershipRole;
		}
	  }
	  Template.VQ_DSS_custom_sparql.DirRole.set(dirRole);
	  
	  let classList = await selected_elem.getCompartmentValue("ClassList");

	if(classList === null){
		$("#VQ-DSS-custom-sparql").modal("show");
	} else {
		
	}
  },
})


Template.VQ_DSS_custom_sparql.helpers({
	className: function() {
		return Template.VQ_DSS_custom_sparql.ClassName.get();
	},
	properties: function() {
		return Template.VQ_DSS_custom_sparql.Properties.get();
	},
	selectedProperties: function() {
		return Template.VQ_DSS_custom_sparql.SelectedProperties.get();
	},
});

Template.VQ_DSS_custom_sparql.events({
	'click #addPropertyToSelection': async function() {
		if ($("#unSelectedProperties").val() != undefined) {

			const toSelection = $("#unSelectedProperties").val()//.map(v => Number(v));
			const Properties = await Template.VQ_DSS_custom_sparql.Properties.get();
			const SelectedProperties = await Template.VQ_DSS_custom_sparql.SelectedProperties.get();
			
			   // Create a Set for faster lookup
			const toSelectSet = new Set(toSelection);
			
			// Filter Properties array - keep only those not in toSelection
			const newProperties = Properties.filter(prop => !toSelectSet.has(prop.localName));
			
			// Get the items to be moved
			const movedProperties = Properties.filter(prop => toSelectSet.has(prop.localName));
			
			// Update the arrays
			Properties.length = 0; // Clear original array
			Properties.push(...newProperties); // Add back remaining properties
			
			SelectedProperties.push(...movedProperties); // Add moved properties
			
			Template.VQ_DSS_custom_sparql.Properties.set(Properties);
			Template.VQ_DSS_custom_sparql.SelectedProperties.set(SelectedProperties);
			
			$('#unSelectedProperties option').prop('selected', false);
		}
	},
	'click #removePropertyFromSelection': async function() {
		if ($("#selectedProperties2").val() != undefined) {
			const toSelection = $("#selectedProperties2").val()//.map(v => Number(v));
			const Properties = await Template.VQ_DSS_custom_sparql.Properties.get();
			const SelectedProperties = await Template.VQ_DSS_custom_sparql.SelectedProperties.get();
			
			   // Create a Set for faster lookup
			const toSelectSet = new Set(toSelection);
			
			// Filter Properties array - keep only those not in toSelection
			const newProperties = SelectedProperties.filter(prop => !toSelectSet.has(prop.localName));
			
			// Get the items to be moved
			const movedProperties = SelectedProperties.filter(prop => toSelectSet.has(prop.localName));
			
			// Update the arrays
			SelectedProperties.length = 0; // Clear original array
			SelectedProperties.push(...newProperties); // Add back remaining properties
			
			Properties.push(...movedProperties); // Add moved properties
			
			Template.VQ_DSS_custom_sparql.Properties.set(Properties);
			Template.VQ_DSS_custom_sparql.SelectedProperties.set(SelectedProperties);
			
			
			$('#selectedProperties2 option').prop('selected', false);
		}
	},
	'click #UpProperty':  function (event, template) {
		 const select = document.getElementById('unSelectedProperties');
		const options = select.options;
		const selectedIndices = [];
		
		// Get indices of selected options
		for (let i = 0; i < options.length; i++) {
			if (options[i].selected) {
				selectedIndices.push(i);
			}
		}
		
		// If nothing selected or first item is selected, do nothing
		if (selectedIndices.length === 0 || selectedIndices.includes(0)) {
			return;
		}
		
		// Move each selected item up one position
		for (const index of selectedIndices) {
			if (index > 0 && !selectedIndices.includes(index - 1)) {
				const option = options[index];
				select.insertBefore(option, options[index - 1]);
			}
		}
		
		// Restore selection
		for (let i = 0; i < options.length; i++) {
			options[i].selected = selectedIndices.includes(i - 1) || 
								 (i === selectedIndices[0] - 1 && !selectedIndices.includes(i));
		}
		
		$('#unSelectedProperties option').prop('selected', false);
	},

    'click #DownProperty':  function (event, template) {
		const select = document.getElementById('unSelectedProperties');
		const options = select.options;
		const selectedIndices = [];
		
		// Get indices of selected options
		for (let i = 0; i < options.length; i++) {
			if (options[i].selected) {
				selectedIndices.push(i);
			}
		}
		
		// If nothing selected or last item is selected, do nothing
		if (selectedIndices.length === 0 || selectedIndices.includes(options.length - 1)) {
			return;
		}
		
		// Move from bottom to top to maintain order
		for (const index of selectedIndices.reverse()) {
			if (index < options.length - 1 && !selectedIndices.includes(index + 1)) {
				const option = options[index];
				select.insertBefore(options[index + 1], option);
			}
		}
		
		// Restore selection
		for (let i = 0; i < options.length; i++) {
			options[i].selected = selectedIndices.includes(i + 1) || 
								 (i === selectedIndices[selectedIndices.length - 1] + 1 && 
								  !selectedIndices.includes(i));
		}
		
		$('#unSelectedProperties option').prop('selected', false);
   },
   
   'click #generate-VQ-DSS-custom-sparql':  async function (event, template) {
		event.preventDefault();
		const className = Template.VQ_DSS_custom_sparql.ClassName.get();
		const selectedProperties = await Template.VQ_DSS_custom_sparql.Properties.get();
		const DirRole = Template.VQ_DSS_custom_sparql.DirRole.get();
		
		
		let params = {name: className};
		let cls = await dataShapes.resolveClassByName(params);

		const classSubject = cls["data"][0]["prefix"]+":"+cls["data"][0]["local_name"];
		const classObject = "?"+cls["data"][0]["display_name"];
		
		let sparqlText = "SELECT * WHERE{\n  "+ classObject + " " + DirRole+ " " + classSubject + ". \n  ";
		let prefixes = await dataShapes.getNamespaces();
		let prefixTable = [];
		for (let i = 0; i < selectedProperties.length; i++) {
			prefixTable[selectedProperties[i]["prefix"]] = "";
			sparqlText = sparqlText + "OPTIONAL{"+classObject + " " + selectedProperties[i]["localName"] + " ?" + selectedProperties[i]["aliasName"] + " .}\n  ";
		}
		sparqlText = sparqlText + "}";
		
		
		let prefixText = "";
		for(let p = 0; p < prefixes.length; p++){
			if(typeof prefixTable[prefixes[p]["name"]] !== "undefined"){
				prefixText = prefixText+"PREFIX " + prefixes[p]["name"] + ": <" + prefixes[p]["value"] + ">\n";
			}
		}
		sparqlText = prefixText + sparqlText;
	  Interpreter.destroyErrorMsg();
	  setText_In_SPARQL_Editor(sparqlText);
   },
   
   'click #execute-VQ-DSS-custom-sparql':  async function (event, template) {
		event.preventDefault();
		const className = Template.VQ_DSS_custom_sparql.ClassName.get();
		const selectedProperties = await Template.VQ_DSS_custom_sparql.Properties.get();
		const DirRole = Template.VQ_DSS_custom_sparql.DirRole.get();
		
		let params = {name: className};
		let cls = await dataShapes.resolveClassByName(params);

		const classSubject = cls["data"][0]["prefix"]+":"+cls["data"][0]["local_name"];
		const classObject = "?"+cls["data"][0]["display_name"];
		let prefixTable = [];
		let sparqlText = "SELECT * WHERE{\n  "+ classObject + " " + DirRole+ " " + classSubject + ". \n  ";
		prefixTable[cls["data"][0]["prefix"]] = "";
		let prefixes = await dataShapes.getNamespaces();
		
		for (let i = 0; i < selectedProperties.length; i++) {
			prefixTable[selectedProperties[i]["prefix"]] = "";
			sparqlText = sparqlText + "OPTIONAL{"+ classObject + " " + selectedProperties[i]["localName"] + " ?" + selectedProperties[i]["aliasName"] + " .}\n  ";
		}
		sparqlText = sparqlText + "}";
		
		let prefixText = "";
		for(let p = 0; p < prefixes.length; p++){
			if(typeof prefixTable[prefixes[p]["name"]] !== "undefined"){
				prefixText = prefixText+"PREFIX " + prefixes[p]["name"] + ": <" + prefixes[p]["value"] + ">\n";
			}
		}
		sparqlText = prefixText + sparqlText;
		
	  Interpreter.destroyErrorMsg();
	  setText_In_SPARQL_Editor(sparqlText);
	  await executeSparqlString(sparqlText);
   }
});

function setText_In_SPARQL_Editor(text) {
  let yasqe = Template.sparqlForm_see_results.yasqe.get();
  let yasqe3 = Template.sparqlForm.yasqe3.get();

  yasqe.setValue(text);
  yasqe3.setValue(text);
}

async function getProperties(className){
	let propList = [];
	let params = {main:{propertyKind:'All',"limit": 100}}
	params.element = {className: className};
	let props = await dataShapes.getPropertiesFull(params);
	let prop = props["data"];
	for(let cl in prop){
		if(typeof prop[cl] !== "function"){
			var prefix = prop[cl]["prefix"]+":";
			propList.push({displayName:prefix+prop[cl]["display_name"], aliasName:prop[cl]["display_name"], localName: prefix+prop[cl]["local_name"], prefix: prop[cl]["prefix"]})
		}
	}
	return propList;
}

function moveSelectedOptions(direction) {
  const $select = $('#selectedProperties2');
  const selectElement = $select[0];
  const options = Array.from(selectElement.options);

  // Get selected indices
  const selectedIndexes = options
    .map((opt, i) => opt.selected ? i : -1)
    .filter(i => i !== -1);

  if (selectedIndexes.length === 0) return;

  const indexes = direction > 0 ? selectedIndexes.reverse() : selectedIndexes;

  for (const i of indexes) {
    const swapIndex = i + direction;
    if (swapIndex < 0 || swapIndex >= options.length) continue;

    const optionToMove = selectElement.removeChild(selectElement.options[i]);
    selectElement.insertBefore(optionToMove, selectElement.options[direction > 0 ? swapIndex + 1 : swapIndex]);
  }

  // Restore selection
  for (let i = 0; i < selectElement.options.length; i++) {
    selectElement.options[i].selected = selectedIndexes.includes(i - direction);
  }

  // Rebuild and update SelectedProperties
  const newSelectedProps = Array.from(selectElement.options).map(opt => ({
    displayName: opt.text,
    localName: opt.value
  }));
  
  for (let i = 0; i < selectElement.options.length; i++) {
    selectElement.options[i].selected = false;
  }

  Template.VQ_DSS_custom_sparql.SelectedProperties.set(newSelectedProps);
}

