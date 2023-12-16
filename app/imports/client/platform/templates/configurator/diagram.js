import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/client/platform/js/utilities/utils'

Interpreter.methods({

	ResizeConfiguratorElement: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");

		Utilities.callMeteorMethod("resizeElement", list);
	},

	ChangeConfiguratorCollectionPosition: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");

		Utilities.callMeteorMethod("changeCollectionPosition", list);
	},

	CopyConfiguratorCollection: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");
	},

	CutConfiguratorCollection: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");
	},

	PasteConfiguratorCollection: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");
	},

	UpdateConfiguratorDiagram: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");

		return {serverMethod: "updateDiagram"};
	},

	//deleting configurator diagram
	DeleteConfiguratorDiagram: function(list) {
		list["toolId"] = Session.get("toolId");
		list["versionId"] = Session.get("toolVersionId");

		Utilities.callMeteorMethod("removeDiagram", list);

		if (Session.get("toolVersionId")) {
			FlowRouter.go("tool", {_id: Session.get("toolId"), versionId: Session.get("toolVersionId")});
		}
		else {
			FlowRouter.go("tool", {_id: Session.get("toolId")});
		}
	},

	//deleting configurator collection
	DeleteConfiguratorElementsCollection: function(list) {

		// list["domain"] = domain_data;
		list["toolId"] = Session.get("toolId")
		list["versionId"] = Session.get("toolVersionId");

		//deleteConfiguratorCollection
		Utilities.callMeteorMethod("deleteElements", list);
	},

});

