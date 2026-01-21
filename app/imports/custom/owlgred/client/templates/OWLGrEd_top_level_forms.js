import { Projects, Tools } from '../../../../db/platform/collections.js'
import './OWLGrEd_top_level_forms.html'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'

const OWLGrEdToolGroup = 'OWLGrEd';

Template.OWLGRED_structureRibbon_button.helpers({
  isOWLGRED: function() {
  	var tool = Tools.findOne({toolGroup: OWLGrEdToolGroup,isDeprecated: {$ne: true}});

	  if ( tool != undefined)
	   return true;
	  else
		  return false;
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
	tools: async function() {
    var tools = await Tools.find({ isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

		var result = {tools:[]};
		var tool_id = "";

    for (const t of tools) {
      var tt = {};
      if ( t.toolGroup && t.toolGroup == OWLGrEdToolGroup)
        tt = {_id: t._id, name: t.name};
      else if ( t.toolGroup == undefined)
        tt = {_id: t._id, name: t.name};

      if ( tt._id != undefined) {
        if ( t.name == "OWLGrEd" || t.name == "OWLGRED") {
          tt["selected"] = "selected";
          tool_id = t._id;
        }
         result.tools.push(tt);
      }
    }

		if ( tool_id == "" && result.tools.length > 0) {
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

		if (project_name == "") {
			project_name = "OWLGRED project";
		}

		if(project_name != ""){

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

			await Utilities.callMeteorMethodAsync("insertProject", list);
			$("#OWLGRED-add-project").modal("hide");

		} else {

			console.log(document.getElementById("project-name").style.borderColor)

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
