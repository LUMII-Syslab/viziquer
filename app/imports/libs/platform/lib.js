import { Contacts } from '/imports/db/platform/collections'
import { is_test_user } from '/imports/server/platform/_global_functions'

function get_contacts(system_id) {
	var contacts = Contacts.find({userSystemId: system_id});
	var user_ids = [];
	if (contacts.count() > 0) {
		var contacts_fetch = contacts.fetch();
		for (var i=0;i<contacts_fetch.length;i++) {
			var contact = contacts_fetch[i];
			if (contact["contactId"])
				user_ids.push(contact["contactId"]);
		}
	}
	return user_ids;
}

//checks if variable is empty sting or undefined
function is_empty(str) {
	if (str == "" || typeof str == 'undefined')
		return true;
	else
		return false;
}

//checks if variable is not empty or undefined
function is_not_empty(str) {
	return !is_empty(str);
}

function get_configurator_project_id() {
	return 0;
}

function generate_id() {
	var obj = new Meteor.Collection.ObjectID();
	return obj._str;
}

function is_ajoo_editor(editor_type) {

	if (editor_type == "ajooEditor")
		return true;
	else
		return;
}

function is_zoom_chart_editor(editor_type) {

	if (editor_type == "ZoomChart")
		return true;
	else
		return;
}

function check_captcha(connection, captcha) {

	if (connection && captcha) {

        var verifyCaptchaResponse = reCAPTCHA.verifyCaptcha(connection.clientAddress, captcha);

        //console.log('reCAPTCHA response', verifyCaptchaResponse.data);
        /* verifyCaptchaResponse.data returns a json {
                'success': true|false,
                'error-codes': an-error-code
            };
            // check at https://developers.google.com/recaptcha/docs/verify
        */

        //if not success
        if( verifyCaptchaResponse.data.success === false ){
            console.log("Error:" + verifyCaptchaResponse.data);
            return;
        }

        else
        	return true;
	}

	return;
}

function send_email(list) {

	if (Meteor.isServer) {

		if (is_test_user(list["email"]))
			return;

		else {

			var mail_data = {
					    	to: list["email"],
					    	from: build_from_address(),
					    	subject: list["subject"],
					    	html: list["html"],
					    	text: list["text"],
					    };

		    Email.send(mail_data, function(err, obj) {
		    	if (err)
		    		console.log("Error in sending mail", err);
		    });
		}
	}
}



export {
  get_contacts,
  is_empty,
  is_not_empty,
  get_configurator_project_id,
  generate_id,
  is_ajoo_editor,
  is_zoom_chart_editor,
  check_captcha,
  send_email,
}
