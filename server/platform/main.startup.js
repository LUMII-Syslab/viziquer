
	Meteor.startup(function () {
		console.log("Loading server");

		Meteor.call("importConfiguration");

  		// var settings = Meteor.settings || {};

		//kadira settings
		//Kadira.connect(settings.appId, settings.appSecret);

		//adding captcha secret key
	   // reCAPTCHA.config({privatekey: '6Le-uwkTAAAAAIH3amO6eRpcjRYJw50q1uef8phe'});

	    //mail server settings
  		// process.env.MAIL_URL = 'smtp://postmaster@sandbox3eb2756f94924ab0838893d4c969e4e8.mailgun.org:683dbf555c8b46b4ecfd3508c8f1da39@smtp.mailgun.org:587';
  		// process.env.MAIL_URL = 'smtp://postmaster@viziquer.lumii.lv:46c1183101c042354b083dd2420bfe61@smtp.mailgun.org:587';


  		// checking if CompartmentTypes contains attribute label
  		var compart_type = CompartmentTypes.findOne({label: { $exists: false }});
  		if (compart_type) {
	  		CompartmentTypes.find().forEach(function(compart_type) {
	  			CompartmentTypes.update({_id: compart_type._id}, {$set: {label: compart_type.name,}});
	  		});
  		}

        if (Meteor.isServer) {
            const path = Npm.require('path');
            const dotenv = Npm.require('dotenv');
            const envFile = process.env.ENV_NAME ? `${process.env.ENV_NAME}.env` : '.env';
            const envPath = path.resolve(process.env.PWD, envFile);
            console.log(`Looking for env in ${envPath}`);
            const env = dotenv.config({ path: envPath });
            if (env && env.parsed) {
                console.log('env loaded:', env.parsed)
            } else {
                console.log('no env found');
            }
        }

		console.log("End startup");
	});


