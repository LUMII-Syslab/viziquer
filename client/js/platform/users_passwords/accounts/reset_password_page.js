
Template.resetPasswordPageTemplate.events({

	"click #reset": function(e) {
		e.preventDefault();

		var email = $("#email").val();
		var secret_phrase = $("#secretPhrase").val();
		var list = {email: email,
					secretPhrase: secret_phrase,
					"recaptcha-response": $('#g-recaptcha-response').val()
				};

		Utilities.callMeteorMethod("sendResetPasswordLink", list);

		Router.go("goToEmail");

		return;
	},

});