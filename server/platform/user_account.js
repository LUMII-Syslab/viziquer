
Meteor.methods({

	makeUser: function(list) {

		var connection = this.connection;
		//if (list && check_captcha(connection, list["recaptcha-response"])) {
		if (list) {

			var is_system_admin = false;
			var is_first_user = false;;

			var first_user = Users.findOne();
			
			//if the user is the first, then this is a system admin 
			if (!first_user) {
				is_system_admin = true;
				is_first_user = true;
			}
			
			//inserting user in accounts
			var user_id = Accounts.createUser({email: list["email"], password: list["password"]});

			//inserting user
			var user_data = build_user_data(user_id, list);
			user_data["isSystemAdmin"] = is_system_admin;

			var id = Users.insert(user_data);

			if (!is_test_user(list["email"]))
				Accounts.sendVerificationEmail(user_id, list["email"]);

			if (is_first_user) {
				var role = build_power_user_role();
				Roles.addUsersToRoles(user_id, [role]);
				
				//loading configurator data
				load_configurator(user_id);
			}

			return id;
		}
	},

	updateUser: function(list) {

		var user_id = Meteor.userId();
		if (user_id) {

			//users cannot set admin property by themselves
			if (list["isSystemAdmin"])
				return;

			//updating user's properties
			else {
				var operation = "$set";
				if (list["operation"])
					operation = list["operation"];

				var update = {};
				update[operation] = list["update"];

				Users.update({systemId: user_id}, update);
			}
		}
	},

	sendResetPasswordLink: function(list) {
			
		if (list) {

			//var secret_phrase = list["secretPhrase"] || "";
			
			var user = Users.findOne({email: list["email"]});
			if (user) {

				var user_id = user["systemId"];
				if (!is_test_user(list["email"]))
					Accounts.sendResetPasswordEmail(user_id);

				//reseting fails count
				Users.update({systemId: user_id}, {$set: {loginFailsCount: 0}});
			}
		}

	},

	isRegisteredUser: function(list) {

		var user = Users.findOne({email: list["email"]});

		//checking if there is a user with a given email
		if (user)
			return true;
	},

	passwordChanged: function(list) {

		var user_id = Meteor.userId();
		if (user_id) {

			//sending email to inform that the user's password was changed
			var user = Users.findOne({systemId: user_id});
			if (user) {

				var email = {email: user["email"],
							subject: "Password changed",
					    	//html: list["html"],
					    	text: "Your password was recently changed.",
						};

				send_email(email);
			}
		}	
	},

	enrollUser: function(list) {

		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			if (list["email"]) {

				var new_user_id;
				var new_user = Meteor.users.findOne({"emails.address": list["email"]});
					
				//if user is not registred in the system, then sending an invitation email
				if (!new_user) {

					//inserting user in accounts
					new_user_id = Accounts.createUser({email: list["email"],
														password: "password"});

					//inserting user
					var user_data = build_user_data(new_user_id, list);
					Users.insert(user_data);

					Accounts.sendEnrollmentEmail(new_user_id);
				}

				else {
					new_user_id = new_user["_id"];
				}

				//inviting the user
				var invitation = {userSystemId: new_user_id,
									role: list["role"],
									projectId: list["projectId"],
								};

				Meteor.call("insertProjectsUsers", invitation);

			}
		}
	},

	enrollUserAccepted: function(list) {

		if (!list)
			return;

		var user = Meteor.users.findOne({"services.password.reset.token": list["token"]});
		if (user) {

			if (list["name"] || list["surname"])
				Users.update({systemId: user["_id"],},
							{$set: {name: list["name"], surname: list["surname"],}});

			Accounts.setPassword(user["_id"], list["password"]);

			var email = user["emails"][0]["address"];

			Meteor.users.update({_id: user["_id"], "emails.address": email},
								{$set: {"emails.$.verified": true,}});
			return email;
		}

	},

	//for testing
	generate_users: function(list) {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id)) {

			//number of users to add
			var count = list["count"];

			//start indexing from users count
			var users_count = Users.find().count();

			for (var i=0;i<count;i++) {

				var index = users_count + i + 1;

				//user properties
				var name = "Mr";
				var surname ="test"+ index;
				var mail = surname + "@test.com";
				var password = surname + surname;

				//inserting user in accounts
				var user_id = Accounts.createUser({email: mail, password: password});

				var date = get_current_time();

				//inserting in Users collection
				var id = Users.insert({systemId: user_id,
										createdAt: date,
										lastModified: date,
										profileImage: "/img/user.jpg",
										language: "en",
										tags: [],
										activeProject: "no-project",
										name: name,
										surname: surname,
										nameLC: name.toLowerCase(),
										surnameLC: surname.toLowerCase(),
										email: mail,
										//secretPhrase: surname,
										logins: [],
										loginFails: [],
										loginFailsCount: 0,
										isSystemAdmin: false,
									});
			}
		}
	},

});


Accounts.validateLoginAttempt(function(obj) {
	
	if (!obj) {
		return;
	}

	//checking if the user's mail is verified
	// if (obj && obj["user"] &&  obj["user"]["emails"] && obj["user"]["emails"][0] ) {
		//&& obj["user"]["emails"][0]["verified"]) {

	//This is a tmp solution because the verification is not working as expected
	if (true) {

		var user = Users.findOne({systemId: obj["user"]["_id"], loginFailsCount: {$lte: 30000}});

		if (user) {
			return true;
		}

		else {
			throw new Meteor.Error("too-many-fails", "User has made too many login fails.");
			return false;
		}
	}

	else {
		throw new Meteor.Error("not-verified", "User has not verified email.");
		return false;
	}

});

UserStatus.events.on("connectionLogin", function(fields) {

	if (!fields)
		return;

	var item = {connectionId: fields["connectionId"],
				loginTime: fields["loginTime"],
				userAgent: fields["userAgent"],
				ipAddress: fields["ipAddr"]
			};

	Users.update({systemId: fields["userId"]},
				{$push: {logins: item}, $set: {loginFailsCount: 0}});

});

UserStatus.events.on("connectionLogout", function(fields) {

	if (!fields)
		return;

	Users.update({systemId: fields["userId"], "logins.connectionId": fields["connectionId"]},
					{$set: {"logins.$.logoutTime": fields["logoutTime"]}});

});

// UserStatus.events.on("connectionIdle", function(fields) {

// 	if (!fields)
// 		return;

// // userId, connectionId, and lastActivity.
// 	var user_id = fields.userId;
// 	//var last_activity = 

// 	console.log("in connection user going idle ", fields)

// 	Meteor.users


// });

// UserStatus.events.on("connectionActive", function(fields) {

// 	if (!fields)
// 		return;

// 	console.log("in connection is active ", fields)


// });

Accounts.onLoginFailure(function(obj) {

	if (obj && obj["error"] == "too-many-fails")
		return;

	else {
		var item = {ipAddress: obj["connection"]["clientAddress"], time: get_current_time()};

		if (obj && obj["user"] && obj["user"]["_id"]) {
			Users.update({systemId: obj["user"]["_id"]},
					{$push: {loginFails: item}, $inc: {loginFailsCount: 1}});
		}
	}
});

Accounts.emailTemplates.siteName = build_site_name();
Accounts.emailTemplates.from = build_from_address();
Accounts.emailTemplates.enrollAccount.subject = function (user) {
    return "ajoo registration";
};

Accounts.urls.resetPassword = function (token) {
    return Meteor.absoluteUrl('reset-password/' + token);
};

Accounts.urls.verifyEmail = function (token) {
    return Meteor.absoluteUrl('verify-email/' + token);
};

Accounts.urls.enrollAccount = function (token) {
    return Meteor.absoluteUrl('enroll-account/' + token);
};

Accounts.emailTemplates.enrollAccount.text = function (user, url) {
    //return "Hello, " + user.profile.name + "\n" + 
   	//	"This is from ajoo , click on the link: " + url;

   	return "Hello, you have successfully been registred in ajoo system.\n" + 
			"To activate the account, click on the link: " + url; 
};

Accounts.emailTemplates.resetPassword.subject = function (user) {
    return "ajoo reset password";
};

Accounts.emailTemplates.resetPassword.text = function (user_obj, url) {

	var user = Users.findOne({systemId: user_obj["_id"]});
    return "Hello, " + user.name + " " + user.surname + "\n" + 
   			"Click on the link: " + url;
};

function build_user_data(user_id, list) {

	var date = get_current_time();

	var user = {systemId: user_id,
				createdAt: date,
				lastModified: date,
				profileImage: "/img/user.jpg",
				language: "en",
				tags: [],
				activeProject: "no-project",
				name: list["name"],
				surname: list["surname"],
				email: list["email"],
				//secretPhrase: list["secretPhrase"],
				logins: [],
				loginFails: [],
				loginFailsCount: 0,
				isSystemAdmin: false,
			};

	if (list["name"])
		user["nameLC"] = list["name"].toLowerCase();

	if (list["surname"])
		user["surnameLC"] = list["surname"].toLowerCase();

	return user;
}




// Meteor.users.find({"status.online": true}).observe({

// 	// id just came online
// 	added: function(id) {
	
// 	},

// 	// id just went offline
// 	removed: function(id) {
// 	}

// });


