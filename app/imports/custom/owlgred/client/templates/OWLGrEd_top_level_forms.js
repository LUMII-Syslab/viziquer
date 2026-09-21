import { Template } from 'meteor/templating';
import { Projects, Tools } from '../../../../db/platform/collections.js'
import './OWLGrEd_top_level_forms.html'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'

const OWLGrEdToolGroup = 'OWLGrEd';
const OWLGrEdToolGroupName = 'OWLGrEd';

Template.OWLGRED_structureRibbon_button.helpers({
  isOWLGRED: function() {
  	var tool = Tools.findOne({toolGroup: OWLGrEdToolGroup,isDeprecated: {$ne: true}});

	  if ( tool !== undefined)
	   return true;
	  else
		  return false;
	},
  toolGroupName: function() {
    return OWLGrEdToolGroupName;
  },
});

Template.OWLGRED_structureRibbon_button.events({
	'click #OWLGRED-add': function(e) {
		e.preventDefault();
		//Template.OWLGRED_createProjectModal.loading.set(false);
		$("#OWLGRED-add-project").modal("show");
		return;
	},
});

// Template.OWLGRED_createProjectModal.rendered = async function() {
// }

Template.OWLGRED_createProjectModal.helpers({
	toolGroupName: function() {
		return OWLGrEdToolGroupName;
	},
	tools: async function() {
    var tools = await Tools.find({ isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

		var result = {tools:[]};
		var tool_id = "";

    for (const t of tools) {
      var tt = {};
      if ( t.toolGroup && t.toolGroup === OWLGrEdToolGroup)
        tt = {_id: t._id, name: t.name};
      else if ( t.toolGroup === undefined)
        tt = {_id: t._id, name: t.name};

      if ( tt._id !== undefined) {
        if ( t.name === "OWLGrEd" || t.name === "OWLGRED") {
          tt["selected"] = "selected";
          tool_id = t._id;
        }
         result.tools.push(tt);
      }
    }

		if ( tool_id === "" && result.tools.length > 0) {
			result.tools[0]["selected"] = "selected";
			tool_id = result.tools[0]._id;
		}


		return result;
	},


});

Template.OWLGRED_createProjectModal.events({

	'click #OWLGRED-create-project': async function() {

		var project_name_obj = $('#OWLGRED-project-name');
		var icon_name_obj = $("#OWLGRED-icon-name");
		var category_obj = $("#OWLGRED-category-name");

		var project_name = project_name_obj.val();

		if (project_name === "") {
			project_name = "OWLGRED project";
		}

		if(project_name !== ""){

			document.getElementById("OWLGRED-project-name-required").style.display = "none";
			document.getElementById("OWLGRED-project-name").style.borderColor = "#ccc";

			//$("#add-project").modal("hide");

			var tool_id = $("#OWLGRED-tool").find(":selected").attr("id");

			var icon_name = icon_name_obj.val();
			var category_name = category_obj.val();

			//resets tools query
			Session.set("tools", reset_variable());

			var list = {name: project_name,
						icon: icon_name,
						category: category_name,
						toolId: tool_id,
					};
					
			let OWLGrEdimportParameters = {
				"showOntoAnnotations": true,
				"showAnnotationPropertyDefs": true,
				"showDataTypes": true,
				"showClasses": true,
				"showSubclasses": true,
				"showSubclassesType_text": false,
				"showSubclassesType_graph": true,
				"showSubclassesGraphicsType_lines": false,
				"showSubclassesGraphicsType_forks": true,
				"showDisjointClasses": true,
				"showDisjointClassesType_text": false,
				"showDisjointClassesType_graph": true,
				"showDisjointClassesGraphicsGroupAsBoxes": true,
				"showDisjointClassesMarkAtForks": true,
				"showEquivalentClasses": true,
				"showEquivalentClassesType_text": false,
				"showEquivalentClassesType_graph": true,
				"showEquivalentClassesGraphicsGroupAsBoxes": true,
				"showKeys": true,
				"showClassAnnotations": true,
				"showClassAnnotationsType_text": true,
				"showClassAnnotationsType_graph": false,
				"showClassAnnotationsEnableSpecComments": true,
				"showObjectProperties": true,
				"showObjectPropertiesType_text": false,
				"showObjectPropertiesType_graph": true,
				"showObjectPropertiesMergeInverse": true,
				"showObjectPropertiesSubObjectProperties": true,
				"showObjectPropertiesEquivalentObjectProperties": true,
				"showObjectPropertiesDisjointObjectProperties": true,
				"showObjectPropertiesPropertyChains": true,
				"showObjectPropertiesIsFunctional": true,
				"showObjectPropertiesIsInverSefunctional": true,
				"showObjectPropertiesIsSymmetric": true,
				"showObjectPropertiesIsAsymmetric": true,
				"showObjectPropertiesIsReflexive": true,
				"showObjectPropertiesIsIrreflexive": true,
				"showObjectPropertiesIsTransitive": true,
				"showObjectPropertyAnnotations": true,
				"showDataProperties": true,
				"showDataPropertiesSubDataProperties": true,
				"showDataPropertiesEquivalentDataProperties": true,
				"showDataPropertiesDisjointDataProperties": true,
				"showDataPropertiesIsFunctional": true,
				"showDataPropertyAnnotations": true,
				"showPropertyRestrictions": true,
				"showObjectCardinalityRestrictionsAsMultiplicity": true,
				"showDataCardinalityRestrictionsAsMultiplicity": true,
				"showPropertyRestrictionsGraphically": true,
				"showPropertyRestrictionsGraphicallyNoLineToSelf": true,
				"showIndividuals": true,
				"showSameIndividuals": true,
				"showIndividualsType_object": true,
				"showSameIndividualsType_object_list": false,
				"showSameIndividualsType_class_list": false,
				"showSameIndividualsType_text": false,
				"showSameIndividualsType_graph": true,
				"showSameIndividualsGraphicsGroupAsBoxes": true,
				"individualCountInList": 20,
				"showDifferentIndividuals": true,
				"showDifferentIndividualsType_text": false,
				"showDifferentIndividualsType_graph": true,
				"showDifferentIndividualsGraphicsGroupAsBoxes": true,
				"showIndividualAnnotations": true,
				"showIndividualAnnotationType_text": true,
				"showIndividualAnnotationType_graph": false,
				"showIndividualClassAssertions": true,
				"showClassAssertionsType_text": true,
				"showClassAssertionsType_graph": false,
				"showClassAssertionsGraphicsKeepText": true,
				"showIndividualsObjectPropertyAssertions": true,
				"showIndividualsDataPropertyAssertions": true,
				"showIndividualsNegativeObjectPropertyAssertions": true,
				"showIndividualsNegativeDataPropertyAssertions": true,
				"showAsClassifiers": false,
				"showAsClassifiersDataTypes": false,
				"showAsClassifiersIndividualEnumeration": false,
				"showAsClassifiersSKOS": false,
				"showAsClassifiersSKOSIndividualEnumeration": false
			}
			list.OWLGrEdimportParameters = JSON.stringify(OWLGrEdimportParameters, null, 2);
			await Utilities.callMeteorMethodAsync("insertProject", list);
			$("#OWLGRED-add-project").modal("hide");

		} else {

			document.getElementById("project-name").style.borderColor = "red";
			document.getElementById("project-name-required").style.display = "block";
		}
	},
});



Template.OWLGRED_editProjectModal.helpers({

	data: function() {
		var proj = Projects.findOne({_id: Session.get("editProjectId")});
		if (proj) {
			return {name: proj["name"] || "",
						icon: proj["icon"] || "",
						category: proj["category"] || "",
					};
		}
	},
});

Template.OWLGRED_editProjectModal.events({

	"click #OWLGRED-project-edited": function(e) {
		e.preventDefault();

		$("#OWLGRED-edit-project-form").modal("hide");

		var project_name = $('#OWLGRED-edit-project-name').val();
		var icon_name = $("#OWLGRED-edit-icon-name").val();
		var category_name = $("#OWLGRED-edit-category-name").val();
		var proj_id = Session.get("editProjectId");

		var list = {projectId: proj_id,
					set: {name: project_name, icon: icon_name, category: category_name},
				};

		Utilities.callMeteorMethod("updateProject", list);

		Session.set("editProjectId", reset_variable());

		return;
	},

});

//----------------------------------------------------------------------------------------------

Template.OWLGrEd_diagramsToolbar_buttons.helpers({
  isOWLGrEProj: function() {
    const project = Projects.findOne({ _id: Session.get("activeProject") });
  	const tool = Tools.findOne({_id: project.toolId});
    if ( (tool.toolGroup && tool.toolGroup === OWLGrEdToolGroup) || tool.toolGroup === undefined)
      return true;
    else
      return false;
	},
});

Template.OWLGrEd_diagramsToolbar_buttons.events({
  "click #OWLGrEdsettings": function (e) {
    // Dialog.destroyTooltip(e);
    $("#OWLGRED-ontology-settings-form").modal("show");
  },
});

// START of OWLGRED_ontologySettings

Template.OWLGRED_ontologySettings.onCreated(function () {
  Session.set("msg", undefined);
});

Template.OWLGRED_ontologySettings.onRendered(function () {
  const instance = this;

  const refresh = () => {
    const $modal = instance.$("#OWLGRED-ontology-settings-form");

    $modal.find("[data-enable-when]").each(function () {
      const conditions = $(this).attr("data-enable-when").split(",");

      let enabled = true;

      conditions.forEach((id) => {
        const el = $modal.find("#" + id).get(0);
        if (!el || !el.checked) enabled = false;
      });

      // Enable/disable all inputs inside
      $(this).find("input, select, textarea").prop("disabled", !enabled);
    });
  };

  // expose for reuse
  instance._refreshOntologySettingsDependencies = refresh;

  // run initially
  refresh();

  // re-run on any change
  instance.$("#OWLGRED-ontology-settings-form").on(
    "change.owlgredSettings",
    "input",
    refresh
  );
});

Template.OWLGRED_ontologySettings.onRendered(async function () {
  const instance = this;

  const applySettingsToForm = (settings) => {
      const $modal = instance.$("#OWLGRED-ontology-settings-form");

	  Object.entries(settings || {}).forEach(([id, val]) => {
		const $el = $modal.find("#" + id);
		if (!$el.length) return;

		const el = $el.get(0);
		if (el.type === "checkbox" || el.type === "radio") el.checked = !!val;
		else $el.val(val);
	  });

	  if (instance._refreshOntologySettingsDependencies) {
		instance._refreshOntologySettingsDependencies();
	  }
    };

    // Load settings from proj.OWLGrEdimportParameters (JSON string)
	 const loadFromProject = async () => {
	  const proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });

	  let settings = {};
	  try {
		const jsonStr = proj?.OWLGrEdimportParameters;

		if (typeof jsonStr === "string" && jsonStr.trim() !== "") {
		  settings = JSON.parse(jsonStr);
		}
	  } catch (e) {
		console.error("Invalid OWLGrEdimportParameters JSON:", e);
		settings = {};
	  }

	  applySettingsToForm(settings);
	};

  // When modal is shown, load from project and fill inputs
  instance
    .$("#OWLGRED-ontology-settings-form")
    .off("shown.bs.modal.owlgredLoadProject")
    .on("shown.bs.modal.owlgredLoadProject", loadFromProject);
});


Template.OWLGRED_ontologySettings.onDestroyed(function () {
  Session.set("msg", undefined);

  // Remove delegated handlers if template gets destroyed while modal is open
  try {
    this.$("#OWLGRED-ontology-settings-form").off(".owlgredSettings");
  } catch (e) {}
});

Template.OWLGRED_ontologySettings.events({
    "click #OWLGRED-ok-ontology-settings": async function (e, t) {
	  // Collect values of all inputs in the settings modal as { id: value }
	  const $modal = $("#OWLGRED-ontology-settings-form");
	  const settings = {};

	  $modal.find("input, select, textarea").each(function () {
		if (!this.id) return;

		if (this.type === "checkbox" || this.type === "radio") {
		  settings[this.id] = !!this.checked;
		} else {
		  settings[this.id] = $(this).val();
		}
	  });

	  const jsonText = JSON.stringify(settings, null, 2);
	  
	  // Download as file
	  // const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
	  // const url = URL.createObjectURL(blob);

	  // const a = document.createElement("a");
	  // a.href = url;
	  // a.download = "ontology-loading-preferences.json";
	  // document.body.appendChild(a);
	  // a.click();
	  // a.remove();

	  // URL.revokeObjectURL(url);
	  var list = {
		  projectId: Session.get("activeProject"),
		  versionId: Session.get("versionId"),
		  diagramId: Session.get("activeDiagram"),
		  OWLGrEdimportParameters: jsonText
		};
	  
	  
	  Utilities.callMeteorMethod("OWLGrEdupdateProjectOntology", list);
   },

  "click #OWLGRED-cancel-ontology-settings": function () {},

  "click #selectAllIndividualsAssertions": function (e, t) {
    e.preventDefault();
    [
      "showIndividualsObjectPropertyAssertions",
      "showIndividualsDataPropertyAssertions",
      "showIndividualsNegativeObjectPropertyAssertions",
      "showIndividualsNegativeDataPropertyAssertions",
    ].forEach((id) => {
      const el = t.$("#" + id).get(0);
      if (el && !el.disabled) el.checked = true;
    });

    if (t._refreshOntologySettingsDependencies) t._refreshOntologySettingsDependencies();
  },

  "click #clearAllIndividualsAssertions": function (e, t) {
    e.preventDefault();
    [
      "showIndividualsObjectPropertyAssertions",
      "showIndividualsDataPropertyAssertions",
      "showIndividualsNegativeObjectPropertyAssertions",
      "showIndividualsNegativeDataPropertyAssertions",
    ].forEach((id) => {
      const el = t.$("#" + id).get(0);
      if (el && !el.disabled) el.checked = false;
    });

    if (t._refreshOntologySettingsDependencies) t._refreshOntologySettingsDependencies();
  },
});

Template.OWLGRED_ontologySettings.helpers({
  msg: function () {
    return Session.get("msg");
  },

  project: function () {
    return Projects.findOne({ _id: Session.get("activeProject") });
  },
});

// END of OWLGRED_ontologySettings