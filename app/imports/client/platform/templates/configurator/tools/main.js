import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { Tools, Projects } from '/imports/db/platform/collections'

Template.renameTool.helpers({
	tool: function() {
		var tool = Tools.findOne({_id: Session.get("toolId")});
		if (tool) {
			
			tool.checked = "";
			if (tool.isDeprecated) {
				tool.checked = "checked";
			}

			return tool;
		}
	},

});

Template.renameTool.events({

	'click #update-tool-name' : function(e) {
		var tool_name = $("#tool-name").val();
		var is_deprecetad = $("#isDeprecated").is(":checked");

		$('#rename-tool-form').modal('hide');

		var list = {toolId: Session.get("toolId"), set: {name: tool_name, isDeprecated: is_deprecetad,}};
		Utilities.callMeteorMethod("updateTool", list);
	},

});

Template.loadModelForm.helpers({
	projects: function() {
		return Projects.find({toolId: Session.get("toolId")}, {sort: {name: 1}});
	},
});

Template.loadModelForm.events({

	'click #loadModel' : function(e) {

	    _.each($("#model-upload")[0].files, function(file_in) {

	        var reader = new FileReader();
	        reader.onload = function() {

				var project_ids = _.map($(".load-model-checkbox:checked"), function(check_box) {
										return $(check_box).attr("id");
									});

				if (project_ids.length > 0) {
					var list = {
								projectIds: project_ids,
								data: reader.result,
							};
					
					Utilities.callMeteorMethod("loadData", list);
				}
	        }

	        reader.onerror = function(error) {
	            console.error("Error: ", error);
	        }

	        reader.readAsText(file_in);
	    });
	},

});

Template.settings.helpers({
	panel_settings: function() {

		return [{options: get_tool_setting("feed"), id: "feed", name: "Feed"},
				{options: get_tool_setting("documents"), id: "documents", name: "Documents"},
				{options: get_tool_setting("archive"), id: "archive", name: "Archive"},
				{options: get_tool_setting("users"), id: "users", name: "Users"},
				{options: get_tool_setting("forum"), id: "forum", name: "Forum"},
				{options: get_tool_setting("analytics"), id: "analytics", name: "Analytics"},

				{options: get_tool_setting("tasks"), id: "tasks", name: "Tasks"},
				{options: get_tool_setting("training"), id: "training", name: "Training"},
			];
	},

});

Template.settings.events({

	'click #save-tool-settings' : function(e) {

		var set = {};
		$(".selection-item").each(function(i, obj_in) {

			var obj = $(obj_in);

			var id = $(obj).attr("id");
			set[id] = (obj.find("option:selected").attr("value") === "true");
		});

		$('#settings-form').modal('hide');

		var list = {toolId: Session.get("toolId"), set: set};
		Utilities.callMeteorMethod("updateTool", list);
	},

});

function get_tool_setting(name) {
	var tool = Tools.findOne({_id: Session.get("toolId")});
	if (tool) {
		var yes_item = {input: "Yes", value: "true"};
		var no_item = {input: "No", value: "false"};

		if (tool[name]) {
			yes_item["selected"] = "selected";
		}
		else {
			no_item["selected"] = "selected";	
		}

		return {yes: yes_item, no: no_item};
	}
}



