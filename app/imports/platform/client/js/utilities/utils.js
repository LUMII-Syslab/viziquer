import { build_project_version_admin_role  } from '../../../../libs/platform/user_rights.js'
import { Projects, Tools, ProjectsUsers, ProjectsGroups, DiagramTypes  } from '../../../../db/platform/collections.js'
import { Interpreter } from '../../../../client/lib/interpreter.js'


const Utilities = {

	isAdmin: function() {
		var user = ProjectsUsers.findOne({userSystemId: Session.get("userSystemId"), projectId: Session.get("activeProject"),});
		if (user) {
			var role = user["role"];
			if (role == "Admin") {
				return true;
			}
			else {
				return false;
			}
		}
		return false;
	},

	isEditable: function() {
		var user = Meteor.user();
		if (user) {

			var role = build_project_version_admin_role(Session.get("activeProject"), Session.get("versionId"));

			//console.log("user roles", user["roles"])
			//console.log("role ", role)

			// to be fixed
			// return _.find(user["roles"], function(role_in) {
			// 			return role_in === role;
			// 		});

			return true;
		}
	},

	resetQuery: function() {
		return {noQuery: -1};
	},

	getProjectGroups: function() {

		var default_groups = [{nr: 1,
								_id: "Admin",
								name: "Admin",
								isDefault: true,
								isEditable: false,
								isRemovable: false,
								count: ProjectsUsers.find({role: "Admin", projectId: Session.get("activeProject")}).count(),
							},
							{nr: 2,
								_id: "Reader",
								name: "Reader",
								isDefault: true,
								isEditable: false,
								isRemovable: false,
								count: ProjectsUsers.find({role: "Reader", projectId: Session.get("activeProject")}).count(),
							},
						];

		return _.union(default_groups, ProjectsGroups.find().fetch());
	},

	editUserProfile: function(update, operation) {

		var list = {update: update,
					operation: operation};

		Utilities.callMeteorMethod("updateUser", list);
	},
	changeUserActiveProject: async function(proj_id) {
		const proj = await Projects.findOneAsync({_id: proj_id});

	    var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: Session.get("userSystemId")});
	    if (proj_user) {
	        var version_id = proj_user["versionId"];
	        Utilities.editUserProfile({activeProject: proj_id, activeVersion: version_id});
				if ( proj != undefined ) {
					const tool = await Tools.findOneAsync({_id: proj.toolId});
          // TODO šis na līdz galam skaisti
          let toolGroupName = 'ViziQuer';
          if ( tool.toolGroup != undefined ) {
            if ( tool.toolGroup != 'VQ' )
              toolGroupName = tool.toolGroup;
          }
          Session.set("toolGroup", toolGroupName);
					//console.log('@@@@@@@@  changeUserActiveProject  @@@@@@@@', tool, Session)
					if ( tool.toolGroup != undefined ) { // Jaunā konfigurācija
						if ( tool.toolGroup == 'VQ') {
							Interpreter.executeExtensionPoint(tool, "changeProject", proj_id);
						}
					}
					else {
						Interpreter.executeExtensionPoint({extensionPoints:[{extensionPoint: 'changeProject', procedure: 'changeProject'}]}, "changeProject", proj_id);
					}
				}
	        return version_id;
	    }
	},

	addingProjectOrToolParams: function(list) {

		var attrs;
		if (DiagramTypes.findOne({diagramId: Session.get("activeDiagram")})) {
			attrs = {toolId: Session.get("toolId"), versionId: Session.get("toolVersionId")};
		}

		else {
			attrs = {projectId: Session.get("activeProject"), versionId: Session.get("versionId")};
		}

		_.extend(list, attrs);
	},

	callMeteorMethod: function(method_name, list, callback) {

		Meteor.call(method_name, list, function(err, res) {
			if (err) {
				console.log("Error in " + method_name + " callback", err);
			}
			else {
				if (typeof callback === 'function') {
					callback(res);
				}
			}
		});
	},


	callMeteorMethodAsync: async function (method_name, ...args) {
		try {
		  if (args.length > 0 && typeof args[args.length - 1] === 'function') {
			console.error(method_name, 'callback functions not (yet) supported in async mode');
			return null;
		  } else {
			return await Meteor.callAsync(method_name, ...args);
		  }
		} catch (err) {
		  console.error("Error in method " + method_name + " call: ", err);
		  return null;
		}
	},
};


//resets session variable
const reset_variable = function() {
	return undefined;
}


export {
  reset_variable,
  Utilities
}
