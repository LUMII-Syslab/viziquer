

Template.enrollTemplate.onCreated(function() {

	// "click #enroll-ok-button": function(e) {

	console.log("sdgsdgsgsgsdg")


	// var password = $("#password").val();
	// var confirmed_password = $("#confirmPassword").val();
	// if (password != confirmed_password)
	// 	return;

	var list = {token: Session.get("token"),
	// 			name: $("#name").val(),
	// 			surname: $("#surname").val(),
	// 			password: password,
			};

	Utilities.callMeteorMethod("verifyAccount", list, function(email) {
		// login(e, email, password);
	});


});