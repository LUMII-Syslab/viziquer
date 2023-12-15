import { Utilities } from '/client/js/platform/utilities/utils'
import { Notifications, Users, Projects } from '/imports/db/platform/collections'

import './notifications.html'

//sets new notification count
Template.newNotificationsCountT.helpers({
	newNotificationsCount: function() {
	    return Notifications.find({status: "new", receiver: Session.get("userSystemId")}).count();
	},
});	


Template.notificationsDropDownT.onCreated(function() {
	Meteor.subscribe('Notifications', {limit: 6});
});


//sets new and seen notification count
Template.notificationsDropDownT.helpers({

	notificationsCount: function() {
	    return Notifications.find({receiver: Session.get("userSystemId")}).count();
	},

	//notifications
	notifications: function() {
	    var notifications = Notifications.find({receiver: Session.get("userSystemId")}, {$sort: {createdAt: -1}, $limit: 6});
	    return process_notifications(notifications);
	},
});

Template.notificationsDropDownT.events({

	//accepts invitation
	'click .projectAccept': function(e) {
		e.preventDefault();
		e.stopPropagation();
		accept_invitation(e);
	},

	//rejects invitation
	'click .projectDecline': function(e) {
		e.preventDefault();
		reject_invitation(e);
	},

});

Template.notificationsT.events({

//sets new notifications as viewed
	'click #nav-notifications' : function(e, templ) {
		var list = {};

		//the server method is used to update multiple notifications at once
		Utilities.callMeteorMethod("setNotifcationsSeen", list);
	},
});





Template.userNotifications.helpers({

	notifications: function() {
		var notifications = Notifications.find({}, {sort: {createdAt: -1}});
		return process_notifications(notifications);
	},

	total_notifications: function() {
		return Notifications.find().count();
	},

});

Template.userNotifications.events({

	'click .notification-delete' : function(e) {
		e.preventDefault();	
		var id = $(e.target).closest(".notification-delete").attr("id");

		var list = {id: id};

		Utilities.callMeteorMethod("removeNotification", list);
	},

	//accepts invitation
	'click .projectAccept': function(e) {
		e.preventDefault();
		accept_invitation(e);
	},

	//declines invitation
	'click .projectDecline': function(e) {
		e.preventDefault();
		reject_invitation(e);
	},

});

//rejects the invitation
function reject_invitation(e) {
    var id = $(e.target).closest(".notification").attr("id");

    var list = {id: id, update: {$set: {status: "rejected"}}};
    Utilities.callMeteorMethod("updateNotification", list);
}

//accepts the invitation
function accept_invitation(e) {
	var notification = $(e.target).closest(".notification");
    var id = notification.attr("id");
    
    var list = {id: id, update: {$set: {status: "confirmed"}}};
    Utilities.callMeteorMethod("updateNotification", list, function() {

	    //navigating to the accepted project
	    var proj_id = notification.attr("projectId");    
	    if (proj_id) {

	    	var proj_user = ProjectsUsers.findOne({projectId: proj_id,
	    											userSystemId: Session.get("userSystemId")})

	    	if (proj_user)
	   			Router.go("diagrams", {projectId: proj_id, versionId: proj_user["versionId"]});
	    }
    });

}

function process_notifications(notifications_cursor) {
    return notifications_cursor.map(
      	function(notification) {
	        notification["time"] = time_interval_from_given_date(notification["createdAt"]);

	        if (notification["type"] == "NewVersion" ||
				notification["type"] == "DeleteVersion" ||
				notification["type"] == "PublishVersion") {

				notification["version"] = true;

				if (notification["type"] == "NewVersion")
					notification["new"] = true;
				else if (notification["type"] == "DeleteVersion")
					notification["delete"] = true;
				else if (notification["type"] == "PublishVersion")
					notification["publish"] = true;
			}
			else {

				if (notification["type"] == "Invitation" &&
					notification["status"] != "rejected" && notification["status"] != "confirmed")
					notification["invited"] = true;
				else if (notification["type"] == "Removed")
					notification["removed"] = true;
				else if (notification["type"] == "ChangeRole")
					notification["changed"] = true;

				if (notification["status"] == "seen")
					notification["seen"] = true;
				else if (notification["status"] == "confirmed")
					notification["confirmed"] = true;
				else if (notification["status"] == "rejected")
					notification["rejected"] = true;
			}

			var sender = Users.findOne({systemId: notification["createdBy"]});
			if (sender) {
			  	notification["sendedBy"] = sender["name"] + " " + sender["surname"];
			}

			var project = Projects.findOne({_id: notification["projectId"]});
			if (project) {
			  	notification["projectName"] = project["name"];
			}

			return notification;
    });
}
