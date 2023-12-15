import { Dialog } from '/client/js/platform/interpretator/Dialog'
import { Tools, ToolVersions } from '/imports/db/platform/collections'

Template.toolRibbon.helpers({

	title: function() {
		var tool = Tools.findOne({_id: Session.get("toolId")});
		if (tool) {
			return tool["name"];
		}
	},

	editMode: function() {
		var tool_version = ToolVersions.findOne({status: "New"});
		if (tool_version) {
			return true;
		}
		else {
			return false;
		}
	},

});

Template.toolRibbon.events({

//opens dialog to specify project settings
	'click #settings' : function(e) {
		$("#settings-form").modal("show");
	},

//deletes the tool
	'click #delete' : function(e) {
		Session.set("confirmationText", "ConfirmDeleteToolType");
		Session.set("confirmationProcedure", "delete_tool");
		$("#delete-confirm-form").modal("show");		
	},

//edit tool
	'click #edit' : function(e) {
		$("#rename-tool-form").modal("show");
	},

//shows button's tooltip on mouse over
    'mouseover .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    },

//removes tooltip on mouse leave
    'mouseleave .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    },

//shows load model form
	'click #load-model' : function(e) {
		$("#load-model-form").modal("show");
	},

});




