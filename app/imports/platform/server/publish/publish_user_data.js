import { Meteor } from "meteor/meteor";
import { publishComposite } from "meteor/reywood:publish-composite";

import {
  Users,
  Notifications,
  Searches,
  Tools,
  Projects,
  ProjectsUsers,
} from "../../../db/platform/collections.js";
import { not_loggedin_msg } from "../_helpers.js";

import {
  error_msg,
  get_maximal_user_query_limit,
  get_user_query_limit,
  build_user_search_query,
} from "../_global_functions.js";

//This is for roles package
Meteor.publish(null, function () {
  return Meteor.roles.find({});
});

Meteor.publish("LoginUser", function (list) {
  var user_id = this.userId;
  var limit = user_limit();

  return Users.find({ systemId: user_id }, limit);
});

Meteor.publish("navbar_user", function (list) {
  if (!list || list.noQuery) {
    return this.stop();
  }

  //gets user's id
  var user_id = this.userId;
  if (user_id) {
    var limit = user_limit();
    return Users.find({ systemId: user_id }, limit);
  } else {
    not_loggedin_msg();
    return this.stop();
  }
});

publishComposite("navbar_projects", function (list) {
console.log('publishComposite(navbar_projects)')
  if (!list || list.noQuery) {
    return this.ready();
  }

  const user_id = this.userId;
  if (!user_id) {
    not_loggedin_msg();
    return this.ready();
  }

  const fields = { invitedBy: 0, modifiedAt: 0 };

  return {
    find() {
      return ProjectsUsers.find(
        { userSystemId: user_id, status: "Member" },
        { fields },
      );
    },
    children: [
      {
        find(projectUser) {
          return Projects.find({ _id: projectUser.projectId });
        },
        children: [
          {
            find(project) {
              return Tools.find({ _id: project.toolId });
            },
          },
        ],
      },
    ],
  };
});

// Meteor.publish("navbar_projects", function(list) {

// 	if (!list || list.noQuery)
// 		return this.stop();

// 	//gets user's id
// 	var user_id = this.userId;
// 	if (user_id) {
// 		var fields = {invitedBy: 0, modifiedAt: 0};
// 		return 	Meteor.publishWithRelations({
// 					handle: this,
// 					collection: ProjectsUsers,
// 					filter: {userSystemId: user_id, status: "Member"},
// 					options: {
// 						fields: fields,
// 					},
// 				    mappings: [
// 			        	{key: "projectId",
// 						collection: Projects,
// 				        mappings: [
// 				        	{key: 'toolId',
// 				        	collection: Tools,
// 				        	fileter: {}
// 				        	}
// 				        ]}
// 				    ]
// 				});
// 	}
// 	else {
// 		not_loggedin_msg();
// 		return this.stop();
// 	}
// });

// Meteor.publish("Notifications", function(list) {
// 	if (!list || list.noQuery)
// 		return this.stop();

// 	var user_id = this.userId;
// 	if (user_id) {
// 		var limit = {sort: {createdAt: -1}};
// 		return 	Meteor.publishWithRelations({
// 					handle: this,
// 					collection: Notifications,
// 					filter: {receiver: user_id},
// 					options: {
// 						sort: {createdAt: -1},
// 						//limit: limit,
// 					},
// 					mappings: [
// 						{key: 'createdBy',
// 			        	collection: Meteor.users,

// 			        	mappings: [
// 							{reverse: true,
// 				        	key: 'systemId',
// 				        	collection: Users,
// 			        		}
// 			        	]
// 				        },

// 						{key: 'projectId',
// 			        	collection: Projects,
// 				        },
// 				    ]
// 				});
// 	}
// 	else {
// 		not_loggedin_msg();
// 		return this.stop();
// 	}
// });

publishComposite("Notifications", function (list) {
  if (!list || list.noQuery) {
    return this.ready();
  }

  const user_id = this.userId;
  if (!user_id) {
    not_loggedin_msg();
    return this.ready();
  }

  return {
    find() {
      return Notifications.find(
        { receiver: user_id },
        { sort: { createdAt: -1 } },
      );
    },
    children: [
      {
        find(notification) {
          return Meteor.users.find({ _id: notification.createdBy });
        },
        children: [
          {
            find(user) {
              return Users.find({ systemId: user._id });
            },
          },
        ],
      },
      {
        find(notification) {
          return Projects.find({ _id: notification.projectId });
        },
      },
    ],
  };
});

function user_limit() {
  return {
    fields: {
      date: 0,
      nameLC: 0,
      surnameLC: 0,
      loginFails: 0,
      loginFailsCount: 0,
      logins: 0,
    },
  };
}
