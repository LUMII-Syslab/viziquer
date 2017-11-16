	
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
  		process.env.MAIL_URL = 'smtp://postmaster@viziquer.lumii.lv:46c1183101c042354b083dd2420bfe61@smtp.mailgun.org:587';



  		// CompartmentTypes.find().forEach(function(compart_type) {
  		// 	CompartmentTypes.update({_id: compart_type._id}, {$set: {label: compart_type.name,}});
  		// });

  		var compart_type = CompartmentTypes.findOne();

  		console.log(compart_type);

  		console.log("done")



 //  		var settings = Meteor.settings;
// 		if (settings.AWSAccessKeyId) {

// 			Slingshot.createDirective("myFileUploads", Slingshot.S3Storage, {
		      
// 				bucket: settings.bucket,
// 				region: settings.region,

// 				acl: "private",

// 				authorize: function (file, list) {

// 					var user_id = this.userId;
// 					if (is_project_version_admin(user_id, list)) {
// 					    return true;
// 					}

// 					else {
// 					    throw new Meteor.Error("Login Required", "Please login before posting files");
// 					}

// 				},

// 				key: function (file, list) {

// 					if (!list) {
// 					  return;
// 					}

// 					//Store file into a directory by project and version
// 					return build_file_key(list, file.name);
// 				},

// 			});
// 		}

		console.log("End startup");
	});


