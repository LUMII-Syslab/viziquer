import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { ClientStorage } from 'ClientStorage';
import { Users } from '/libs/platform/collections'
import { reset_variable } from '/client/js/platform/utilities/utils'


Template.index.events({

//signing
	'click #signin': function(e) {
		e.preventDefault();

		login(e);
		return false;
	},


	'click #public-diagram': function(e) {
		e.preventDefault();
		Utilities.callMeteorMethod("addPublicDiagram", {}, function(res) {
			FlowRouter.go("public-diagram", res);
        });
	},


//signing in when enter is pressed and email and password fields have some values
	'keypress': function(e) {
		//e.preventDefault();
		if (e.charCode == 13) {
			login(e);
		}
		//return false;
	},
        
});

Template.index.helpers({

	login_error: function(e) {
		var err = Session.get("loginError");
		if (err) {

			$("#button-message").delay(2000).fadeOut("slow", function() {
				Session.set("loginError", reset_variable());
				$("#button-message").removeAttr("style");
			});

			return err;
		}
	},

});

//login function
function login(e, name, password) {

	console.log("in login")

	//gets login information
	name = name || $('#email').val();
	password = password || $('#password').val();

	//checks if user has entered login and password
	if (name != "" && password != "") {

		//checks if the user is already logged in, then opens the active project
		var meteor_user = Meteor.user();

		console.log("meteor_user", meteor_user)


		if (meteor_user) {
			var user = Users.findOne({systemId: meteor_user["_id"]});
			if (user) {
				// redirect_on_login(user);

				Meteor.logout(function(err){
					if (err) {
						console.error("Logout error", err)
					}

					else {

						// if (UserStatus.isMonitoring()) {
					    // 	UserStatus.stopMonitor();
						// }

						loginWithPassword(name, password);
					}
				});
			}
		}

		//logs in the user
		loginWithPassword(name, password);
	}

	else {
		console.error("Error in login");
	}

}


function loginWithPassword(name, password) {

	console.log("loginWithPassword")

    Meteor.loginWithPassword(name, password, function (err) {
		if (err) {

			//login error msg
			if (err["error"] == "not-verified")
				Session.set("loginError", {not_verified: true});

			else if (err["error"] == "403")
				Session.set("loginError", {incorrect_password: true});

			else if (err["error"] == "too-many-fails")
				Session.set("loginError", {too_many_attempts: true});
		}

		else {
			login_on_success();
		}
    });
}


login_on_success = function() {

	console.log("login_on_success")

	var list = {};
	var meteor_user = Meteor.user();
	Meteor.subscribe("LoginUser", list, function() {
		
		var user = Users.findOne({systemId: meteor_user["_id"]});
		if (user) {
			redirect_on_login(user);
		}

		else {
			console.error("Error: no user");
		}

	});

}

function redirect_on_login(user) {

	// if (UserStatus.isMonitoring()) {
	// 	UserStatus.stopMonitor();
	// }

	// var minute = 60000;
	// UserStatus.startMonitor({threshold: 7 * minute, idle: 10 * minute});

	const clientStorage = new ClientStorage("localStorage"); 
	clientStorage.set('current_user', JSON.stringify(user));



	if (user["activeProject"] == "no-project") {
		FlowRouter.go("structure");
	}

	else {
		FlowRouter.go("structure");
	}
}


