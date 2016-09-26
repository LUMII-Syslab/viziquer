

Template.signup.events({

	'keyup #email' : function(e) {
		e.preventDefault();		
		process_email_field(e);
	},

	'change #email': function(e) {
		e.preventDefault();
		process_email_field(e);
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
	},

	'blur #confirmPassword' : function(e) {
		blur_password_fields(e);
	},

	'keyup #name' : function(e) {
		var field = $(e.target);

		process_fields(field, "name_error", "Name");
		check_fields_values();
	},

	'keyup #surname' : function(e) {
		var field = $(e.target);

		process_fields(field, "surname_error", "Surname");
		check_fields_values();			
	},

	// 'keyup #secretPhrase' : function(e) {
	// 	var field = $(e.target);

	// 	process_fields(field, "secret_phrase_error", "Secret phrase");
	// 	check_fields_values();
	// },

	'click #signup' : function(e, templ) {
		e.preventDefault();

		var password = $("#password").val();
		var confirmed_password = $("#confirmPassword").val();

		//if (password && password == confirmed_password) {
		if (Session.get("IsSignUpEnabled")) {
			var list = {
				email: $("#email").val(),
				name: $("#name").val(),
				surname: $("#surname").val(),
				password: password,
				secretPhrase: $("#secretPhrase").val(),
				"recaptcha-response" : $('#g-recaptcha-response').val()
			}

			Meteor.call("makeUser", list, function(err) {
				if (err) {
					console.log("Error in makeUser callback");
					console.log(err);
				}
				else {
					Router.go("goToEmail");
				}
			});
		}

		return false;
	},

});

Template.signup.helpers({

	mail_error: function() {
		return Session.get("mail_error");
	},

	password_error: function() {
		return Session.get("passwordError");
	},	

	confirmed_password_error: function() {
		return Session.get("confirmedPasswordError");
	},

	name_error: function() {
		return Session.get("name_error");
	},

	surname_error: function() {
		return Session.get("surname_error");
	},

	secret_phrase_error: function() {
		return Session.get("secret_phrase_error");
	},

	button_enabled: function() {

		if (Session.get("IsSignUpEnabled"))
			return "";

		else
			return "disabled";
	},

});

Template.signup.onDestroyed(function() {

	Session.set("mail_error", reset_variable());
	Session.set("passwordError", reset_variable());
	Session.set("confirmedPasswordError", reset_variable());
	Session.set("name_error", reset_variable());
	Session.set("surname_error", reset_variable());
	Session.set("secret_phrase_error", reset_variable());
	Session.set("IsSignUpEnabled", reset_variable());

});

blur_password_fields = function(e) {

	var field = $(e.target);

	//if the field has been already edited, then no action
	if (field.hasClass("parsley-validated"))
		return;

	//if the field hasn't been edited before
	else {

		field.addClass("parsley-validated");

		var password = $("#password").val();
		var confirmed_password = $("#confirmPassword").val();

		check_passwords(password, confirmed_password);
		check_fields_values();
	}
}

function process_email_field(e) {

	var field = $(e.target);
	var email = field.val();

	//if there is an email
	if (email) {

		var list = {email: email};
		Utilities.callMeteorMethod("isRegisteredUser", list, function(res) {

			//if user already registered
			if (res) {

				Session.set("mail_error", "User already registered.");
			}

			//removing error
			else {
				Session.set("mail_error", reset_variable());
			}

			check_fields_values();
		});
	}

	else {
		Session.set("mail_error", "Email address is required.");
		check_fields_values();
	}
}

function process_fields(field, var_name, field_name) {

	if (!field.val())
		Session.set(var_name, field_name + " is required.");

	else
		Session.set(var_name, reset_variable());
}

function check_fields_values() {

	var email = $("#email").val();

	var password = $("#password").val();
	var confirmed_password = $("#confirmPassword").val();

	var name = $("#name").val();
	var surname = $("#surname").val();

	//var secretPhrase = $("#secretPhrase").val();

	//disabling signup button
	if (Session.get("mail_error") || Session.get("passwordError") ||
		Session.get("confirmedPasswordError") || Session.get("name_error") ||
		Session.get("surname_error") || Session.get("secret_phrase_error") || 
		!email || !password || !confirmed_password || !name || !surname) {

		Session.set("IsSignUpEnabled", reset_variable());
	}

	//enabling singup button
	else {
		Session.set("IsSignUpEnabled", true);
	}
}
