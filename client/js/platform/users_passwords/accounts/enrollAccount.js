
Template.enrollAccountTemplate.helpers({

	password_error: function() {
		return Session.get("passwordError");
	},	

	confirmed_password_error: function() {
		return Session.get("confirmedPasswordError");
	},

	button_enabled: function() {

		if (Session.get("IsSignUpEnabled"))
			return "";

		else
			return "disabled";
	},
});

Template.enrollAccountTemplate.events({

	"click #enroll-ok-button": function(e) {

		var password = $("#password").val();
		var confirmed_password = $("#confirmPassword").val();
		if (password != confirmed_password)
			return;

		var list = {token: Session.get("token"),
					name: $("#name").val(),
					surname: $("#surname").val(),
					password: password,
				};

		Utilities.callMeteorMethod("enrollUserAccepted", list, function(email) {
			login(e, email, password);
		});

	},

	'keyup #password' : function(e) {
		var field = $(e.target);

		if (field.hasClass("parsley-validated")) {

			var password = $("#password").val();
			var confirmed_password = $("#confirmPassword").val();

			check_passwords(password, confirmed_password);
			check_fields_values();
		}
	},

	'blur #password' : function(e) {
		blur_password_fields(e);
	},

	'keyup #confirmPassword' : function(e) {
		var field = $(e.target);

		if (field.hasClass("parsley-validated")) {

			var password = $("#password").val();
			var confirmed_password = $("#confirmPassword").val();

			check_passwords(password, confirmed_password);
			check_fields_values();			
		}

		else {

			var password = $("#password").val();
			var confirmed_password = $("#confirmPassword").val();

			if (password == confirmed_password) {
				check_fields_values();
				field.addClass("parsley-validated");
			}
		}
	},

	'blur #confirmPassword' : function(e) {
		blur_password_fields(e);
	},

});

Template.enrollAccountTemplate.onDestroyed(function() {
	Session.set("token", reset_variable());
});

function check_fields_values() {

	var password = $("#password").val();
	var confirmed_password = $("#confirmPassword").val();

	//disabling signup button
	if (Session.get("passwordError") || Session.get("confirmedPasswordError") || 
		!password || !confirmed_password) {

		Session.set("IsSignUpEnabled", reset_variable());
	}

	//enabling singup button
	else {
		Session.set("IsSignUpEnabled", true);
	}



}