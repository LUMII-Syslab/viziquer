import { Utilities } from '/imports/client/platform/js/utilities/utils.js'
import { Versions, ProjectsUsers } from '/imports/db/platform/collections.js'

import './archive.html'

Template.archiveTemplate.events({

	'click #new-version': function(e) {

		var btn = $(e.target);
		if (btn.attr("disabled"))
			return;

		//selects toolid and tool's version id from the last version
		var version = Versions.findOne({}, {sort: {createdAt: -1}});
		if (version) {

			var list = {projectId: Session.get("activeProject"),
						toolVersionId: version["toolVersionId"],
						toolId: version["toolId"],
					}

			Utilities.callMeteorMethod("insertVersion", list)
		}
	},

	//removesr the new version
	'click #remove-version-button': function(e) {

		var btn = $(e.target);
		if (btn.attr("disabled"))
			return;

		var version = Versions.findOne({status: "New"});
		if (version) {

			var list = {projectId: Session.get("activeProject"), versionId: version["_id"]}
			Utilities.callMeteorMethod("removeVersion", list);
		}
	},

	'click #publish-version-button': function(e) {
		$("#publish-version").modal("show");
	},

	//publishing the new version
	'click #publish': function(e) {

		var btn = $(e.target);
		if (btn.attr("disabled"))
			return;

		var new_version = Versions.findOne({status: "New"});
		if (new_version) {

			$("#publish-version").modal("hide");

			var list = {projectId: Session.get("activeProject"),
						versionId: new_version["_id"],
						comment: $("#comment").val(),
					};
			
			Utilities.callMeteorMethod("publishVersion", list);
		}
	},

	//setting the pulled version to the user
	'click .pull': function(e) {
		e.preventDefault();
		pull_version(e);
		return;
	},

	'click .timeline-icon': function(e) {
		e.preventDefault();
		pull_version(e);
		return;
	},

});

//rendering project versions
Template.archiveTemplate.helpers({

	versions: function() {
		
		//selects active user's project info
		var project_user = ProjectsUsers.findOne({projectId: Session.get("activeProject"),
													userSystemId: Session.get("userSystemId")});
		
		//selects version in descending order and iterates through versions and sets the active project
		//and transforms date format
		return Versions.find({},{sort: {createdAt: -1}}).map(
			function(version) {
		
				//transforms the published date in different form
				var date = version["publishedAt"];
				if (date)
					version["date"] = joined_date(date);

				//sets active version
				if (project_user && version["_id"] == project_user["versionId"])
					version["active"] = true;

				return version;
		});
	},

	//disables and enables new version, remove and publish buttons
	buttons_enabled: function() {

		var res = {};
		var is_admin = Utilities.isAdmin();
		if (is_admin) {

			//disabling and enabling the buttons according to the last version status
			var version = Versions.findOne({status: "New"});
			if (version) {

				var versions_count = Versions.find().count();

				//if this is the only version, then removing is not allowed
				if (versions_count == 1) {
					res["new_version_disabled"] = true;
					res["remove_version_disabled"] = true;
					res["publish_version_disabled"] = false;
				}

				else {
					res["new_version_disabled"] = true;
					res["remove_version_disabled"] = false;
					res["publish_version_disabled"] = false;
				}

			}
			else {
				res["new_version_disabled"] = false;
				res["remove_version_disabled"] = true;				
				res["publish_version_disabled"] = true;
			}

			res["style"] = "visibility: visible;"
		}

		//if the user is not admin, then showing no buttons
		else {
			res["style"] = "visibility: hidden;"
		}

		return res;
	},

});

//rendering project versions
Template.publishVersion.helpers({
	
	//this shows the version number in the publish dialog window
	version_number: function() {
		var version = Versions.findOne({status: "New"});
		if (version)
			return version["_id"];
	},
});

function pull_version(e) {

	//selecting the pulled object
	var version = $(e.target).closest(".version");
	var version_id = version.attr("id");

	var list = {userSystemId: Session.get("userSystemId"), projectId: Session.get("activeProject"),
				update: {$set: {versionId: version_id}}};

	Utilities.callMeteorMethod("updateProjectsUsers", list);
}
