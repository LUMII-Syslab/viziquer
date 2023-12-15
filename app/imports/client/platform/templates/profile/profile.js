import { Dialog } from '/client/js/platform/interpretator/Dialog'
import { analytics } from '/client/lib/global_variables'
import { Users } from '/imports/db/platform/collections'
import { Utilities, reset_variable } from '/imports/client/platform/js/utilities/utils'

import './profile.html'

//builds user object to render it
Template.profileInfo.helpers({
	user: function() {
		return user_profile_info();
	},
});

Template.profileInfo.events({

//changes user image
	'click .user-image' : function(e, templ) {
		e.preventDefault();
        
        var settings = {mimetype: "image/*"};

		Dialog.pickFile(settings, function(InkBlobs) {
				            var pic_name = InkBlobs[0].url;
				            Utilities.editUserProfile({"profileImage": pic_name});
			        	});
	},
});


Template.basicInfoPanel.rendered = function() {
	var user = Users.findOne({systemId: Session.get("userSystemId")});
	if (user) {
		var tags = user["tags"];
		initialize_user_tag_field(tags);
		return tags.length;
	}
}

Template.basicInfoPanel.helpers({

	user: function() {
		var profile = user_profile_info();
		if (profile) {
		    var lang = profile["language"];
		    var options = [{title: "lv", value: "lv"},
		                   {title: "en", value: "en"}];

		    profile["langs"] = _.map(options, function(option) {
				if (option["value"] == lang) {
					option["selected"] = "selected";
				}

				return option;
		    });

		    

		    return profile;
		}
	},

	tags_array: function() {

		var user = user_profile_info();
		if (user) {
			var tags = user["tags"];
			initialize_user_tag_field(tags);
			return tags.length;
		}
	},

});

Template.basicInfoPanel.events({
	
	//saves user profile data
	'blur .profile-field' : function(e) {
		var field = $(e.target);
		if (field.attr("type") == "text")
			var update = {};
			update[field.attr("id")] = field.val();

			Utilities.editUserProfile(update);
	},

	"change #lang": function() {

		analytics.track("Updated Profile", {
			property: "Language"
		});
  
	    var lang = Dialog.getSelectionItem($("#lang")).attr("value"); 
		Utilities.editUserProfile({language: lang});
	    
	    TAPi18n.setLanguage(lang);

	    //var place_holder = TAPi18n.__("type_and_enter", {lng: lang});
		//$("#tags").attr("placeholder", place_holder);
		//$("#tag-input").attr("placeholder", place_holder);
	},  


	//adds user tags
	'itemAdded #tags' : function(e) {
		var is_initialized = $('#tags').attr("initialized");
		if (is_initialized) {
			Utilities.editUserProfile({"tags": e["item"]}, "push");
		}
	},

	//removes user tags
	'itemRemoved #tags' : function(e) {
		Utilities.editUserProfile({"tags": e["item"]}, "pull");
	},

});

Template.passwordPanel.helpers({

	old_password_error: function() {
		if (Session.get("oldPasswordError"))
			return Session.get("oldPasswordError");
		else
			return {};
	},

	new_password_error: function() {
		if (Session.get("newPasswordError"))
			return Session.get("newPasswordError");
		else
			return {};
	},

	confirmed_password_error: function() {
		if (Session.get("confirmedPasswordError"))
			return Session.get("confirmedPasswordError");
		else
			return {};
	},

	button_message: function() {
		return Session.get("buttonMessage");
	},
});

Template.passwordPanel.events({

	//changes password
	'click #savePassword' : function(e) {
		e.preventDefault();

		//selects password data
		var old_password = $("#oldPassword").val();
		var new_password = $("#newPassword").val();
		var confirmed_password = $("#confirmPassword").val();	

		//error properties
		var error_class = get_error_class();
		var empty_value_error = get_empty_field_error();

		if (old_password == "")
			Session.set("oldPasswordError", {errorClass: error_class,
												message: empty_value_error});

		if (new_password == "")
			Session.set("newPasswordError", {errorClass: error_class,
												message: empty_value_error});	

		if (confirmed_password == "")
			Session.set("confirmedPasswordError", {errorClass: error_class,
													message: empty_value_error});	

		//checks the new password's complexity
		var new_password_status = check_password_complexity(new_password);

		if (new_password_status["status"] && new_password == confirmed_password)	{
			Accounts.changePassword(old_password, new_password, function(err) {
				if (err) {
					Session.set("buttonMessage", "OldPasswordIsIncorrect")
				}
				else {
					Session.set("buttonMessage", "PasswordChanged");

					Session.set("oldPasswordError", reset_variable());
					Session.set("newPasswordError", reset_variable());
					Session.set("confirmedPasswordError", reset_variable());

					$("#oldPassword").val("");
					$("#newPassword").val("");
					$("#confirmPassword").val("");

					Utilities.callMeteorMethod("passwordChanged", {});			
				}
			});
		}
		else {

			//if the password is too weak
			if (!new_password_status["status"])
				Session.set("newPasswordError", {errorClass: get_error_class(),
												message: new_password_status["message"]});

			//if typed and re-typed passwords do not match
			if (new_password != confirmed_password)
				Session.set("confirmedPasswordError", {errorClass: error_class, 
														message: "ValueShouldBeTheSame"});
		}

		//sets all the password fields as validated (turns on field checking on key press)
		update_session_var_list("oldPasswordError", "validatedClass", get_validated_class());
		update_session_var_list("newPasswordError", "validatedClass", get_validated_class());
		update_session_var_list("confirmedPasswordError", "validatedClass", get_validated_class());

		$("#button-message").delay(2000).fadeOut("slow", function() {
			Session.set("buttonMessage", reset_variable());
			$("#button-message").removeAttr("style");
		});

		return false;
	},

	//if the field is already validated, then dynamically adds/removes error messages
	'keyup #oldPassword' : function(e) {
		var field = $(e.target);
		if (field.hasClass("parsley-validated")) {
			var val = field.val();
			if (val.length > 0)
				Session.set("oldPasswordError", {});
			else
				Session.set("oldPasswordError", {errorClass: get_error_class(),
												message: get_empty_field_error()});

			update_session_var_list("oldPasswordError", "validatedClass", get_validated_class());
		}
	},

	//if the fields are already validated, then dynamically add/removes error messages
	'keyup .password' : function(e) {
		var field = $(e.target);
		if (field.hasClass("parsley-validated")) {
			if (field.attr("id") == "newPassword") {
				var new_password = field.val();
				if (new_password == "") {
						Session.set("newPasswordError", {errorClass: get_error_class(), 
														message: get_empty_field_error()});
				}
				else {
					//if the re-typed password is differnent
					var confirmed_password = $("#confirmPassword").val();
					if (new_password != confirmed_password) {
						Session.set("confirmedPasswordError", {errorClass: get_error_class(), 
																message: "ValueShouldBeTheSame"});
					}
					//if the re-typed password is equal to the new password
					else {
						Session.set("confirmedPasswordError", {});						
					}

					var new_password_status = check_password_complexity(new_password);

					//if the password is too weak
					if (new_password_status["status"])
						Session.set("newPasswordError", {});	
					else 
						Session.set("newPasswordError", {errorClass: get_error_class(),
														message: new_password_status["message"]});
				}

			}
			else if (field.attr("id") == "confirmPassword") {
				var confirmed_password = field.val();
				if (confirmed_password == "") {
						Session.set("confirmedPasswordError", {errorClass: get_error_class(), 
													message: get_empty_field_error()});
				}
				else {
					var new_password = $("#newPassword").val();
					if (new_password != confirmed_password) {
						Session.set("confirmedPasswordError", {errorClass: get_error_class(), 
													message: "ValueShouldBeTheSame"});
					}
					else 
						Session.set("confirmedPasswordError", {});
				}
			}

			//sets fields as validated after any changes
			update_session_var_list("newPasswordError", "validatedClass", get_validated_class());
			update_session_var_list("confirmedPasswordError", "validatedClass", get_validated_class());
		}
	},
});

Template.editTabLastUpdate.helpers({
	lastUpdate: function() {
	    var user = Users.findOne({systemId: Session.get("userSystemId")});
	    if (user) {

	    	//sets last modified in "pretty" form
	 		var date_obj = user["lastModified"];
	 		if (date_obj) {
		 		var date = date_obj.getDate();
				var month_nr = date_obj.getMonth();
				var year = date_obj.getFullYear();
				var month_list = months();
				var month = month_list[month_nr].substring(0,3);

		    	return {date: date, month: month, year: year};
		    }
	    }
	},
});


function user_profile_info() {
	return Users.findOne({systemId: Session.get("userSystemId")});
}

check_password_complexity = function(password) {
	if (password) {
		if (password.length > 7)
			return {status: true};
		else
			return {status: false, message: "PasswordTooShort"};
	}
	else
		return {status: false, message: "EmptyFieldError"};
}

function get_error_class() {
	return "parsley-error";
}

function get_empty_field_error() {
	return "EmptyFieldError";
}

function get_validated_class() {
	return "parsley-validated";
}

function initialize_user_tag_field(tags) {

	var tags_field = $('#tags');
	if (tags_field.length > 0 && !(tags_field.attr("initialized"))) {

		//#tags
		tags_field.tagsinput({tagClass: "label label-primary",
								maxChars: 15,
								//allowDuplicates: true,
							});

		var tags_input = $(".bootstrap-tagsinput").css({width: "100%",
														"margin-bottom": 0})

													//.addClass("input-sm");
		var tag_input = tags_input.children();

		//var lang = TAPi18n.getLanguage();
		//var place_holder = TAPi18n.__("type_and_enter", {lng: lang});

		tag_input.css({
		// 			width: "3em !important",
		 			border: "none",
		 			"box-shadow": "none",
		 		})
				.attr("id", "tag-input")
				//.attr("placeholder", place_holder);


		_.each(tags, function(tag) {
			tags_field.tagsinput('add', tag);
		});

		tags_field.attr("initialized", "initialized");
	}
}

function update_session_var_list(variable_name, attr_name, attr_value) {

	var list = Session.get(query_name);
	if (!list) {
		list = {};
	}
	
	list[attr_name] = attr_value;

	Session.set(query_name, list);
}
