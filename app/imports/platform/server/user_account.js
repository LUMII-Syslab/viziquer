// import { Roles } from 'meteor/alanning:roles'
import { Roles } from "meteor/roles";

import { get_current_time } from "./_helpers.js";
import {
  build_power_user_role,
  is_project_admin,
  is_system_admin,
} from "../../libs/platform/user_rights.js";
import { load_configurator } from "./load_configuration.js";
import { Users, Tools, ToolVersions } from "../../db/platform/collections.js";
import { Services } from "../../db/platform/collections.js";
import { is_test_user } from "./_global_functions.js";
import { send_email } from "../../libs/platform/lib.js";
import { config } from "dotenv";

Meteor.methods({
  makeUser: async function (list) {
    // var connection = this.connection;
    //if (list && check_captcha(connection, list["recaptcha-response"])) {
    if (list) {
      let is_system_admin = false;
      let is_first_user = false;

      const any_user = await Users.findOneAsync();

      //if the user is the first, then this is a system admin
      if (!any_user) {
        is_system_admin = true;
        is_first_user = true;
      }

      //inserting user in accounts
      var user_id = await Accounts.createUser({
        email: list["email"],
        password: list["password"],
      });

      //inserting user
      var user_data = build_user_data(user_id, list);
      user_data["isSystemAdmin"] = is_system_admin;

      var id = await Users.insertAsync(user_data);

      // if (!is_test_user(list["email"]))
      // Accounts.sendVerificationEmail(user_id, list["email"]);

      if (is_first_user) {
        var role = build_power_user_role();

        await Roles.createRoleAsync(role, { unlessExists: true });
        await Roles.addUsersToRolesAsync(user_id, [ role ]);

        //loading configurator data
        await load_configurator(user_id);

        // var fs = Npm.require('fs');
        // var current_dir = process.env.PWD;
        console.log(
          `App assets are here: ${Assets.absoluteFilePath("jsons/autoload.json")}`,
        );

        let configList;
        try {
          if (Meteor.settings && Meteor.settings.configurationName) {
            configList = [
              { configurationFile: Meteor.settings.configurationName },
            ];
          } else {
            configList = JSON.parse(
              await Assets.getTextAsync("jsons/autoload.json"),
            );
          }
        } catch (err) {
          console.error(err);
          console.log(
            `Neither configurationName nor autoload file hs been found; will use "vq/VQ_configuration_dss_latest.json" `,
          );
          configList = [
            {
              configurationFile: "vq/VQ_configuration_dss_latest.json",
              toolName: "ViziQuer",
              toolGroup: "VQ",
              services: "vq/services_dss_ext2.json",
            },
          ];
        }
        console.log("configurations to be loaded:", configList);

        if (!Array.isArray(configList)) configList = [ configList ];

        for (const cfg of configList) {
          console.log(`🧰 loading initial configuration`, cfg);

          let configurationFile =
            typeof cfg === "string" ? cfg : cfg.configurationFile;
          try {
            console.log(
              "Trying to load configuration from",
              `jsons/${configurationFile}`,
            );
            const configurationData = JSON.parse(
              await Assets.getTextAsync(`jsons/${configurationFile}`),
            );

            let toolName = configurationData?.tool?.name;
            if (typeof cfg === "object" && cfg.toolName) {
              toolName = cfg.toolName;
            }
            if (!toolName) {
              // FIXME-TOOLGROUPS
              if (configurationFile.toLowerCase.includes('owl')) {
                toolName = "Perhaps OWLGrEd";
              } else if (configurationFile.toLowerCase.includes('viziquer') || configurationFile.toLowerCase.includes('vq')) {
                toolName = "Perhaps ViziQuer";
              } else {
                toolName = "Unknown Tool";
              }
            }

            let toolGroup = configurationData?.toolGroup;
            if (typeof cfg === "object" && cfg.toolGroup) {
              toolGroup = cfg.toolGroup;
            }
            if (!toolGroup) {
              // FIXME-TOOLGROUPS
              if (configurationFile.toLowerCase.includes('owl')) {
                toolGroup = "OWLGrEd";
              } else if (configurationFile.toLowerCase.includes('viziquer') || configurationFile.toLowerCase.includes('vq')) {
                toolGroup = "VQ";
              } else {
                toolGroup = "Unknown Tool";
              }
            }

            const new_tool = {
              // name: "Viziquer",
              name: toolName,
              toolGroup,
              createdAt: new Date(),
              createdBy: user_id,
              documents: true,
              archive: true,
              analytics: true,
              users: true,
              // forum: true,
              tasks: true,
              training: true,
            };

            const tool_id = await Tools.insertAsync(new_tool);
            console.log("New tool created:", toolName, tool_id);

            const version_id = await ToolVersions.insertAsync({
              createdAt: new_tool.createdAt,
              createdBy: user_id,
              status: "New",
              toolId: tool_id,
            });

            await Meteor.callAsync("importAjooConfiguration", {
              toolId: tool_id,
              versionId: version_id,
              data: configurationData,
            });

            if (typeof cfg === "object" && cfg.services) {
              try {
                // Services.remove({ toolId: tool_id });
                const servicesData = JSON.parse(
                  await Assets.getTextAsync(`jsons/${cfg.services}`),
                );
                // console.log("servicesData is", servicesData);
                servicesData.toolId = tool_id;

                // Services.batchInsert( [ servicesData ] )
                await Services.insertAsync(servicesData);
              } catch (err) {
                console.error(err);
                console.error(
                  `Error loading services from ${Assets.absoluteFilePath(`jsons/${cfg.services}`)}; skipping it`,
                );
              }
            }
          } catch (err) {
            console.error(
              `Error loading configuration ${JSON.stringify(cfg)}; skipping it`,
            );
            console.error(err);
            continue;
          }
        }
      }
    }

    return id;
  },

  updateUser: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      //users cannot set admin property by themselves
      if (list["isSystemAdmin"]) return;
      //updating user's properties
      else {
        var operation = "$set";
        if (list["operation"]) operation = list["operation"];

        var update = {};
        update[operation] = list["update"];

        await Users.updateAsync({ systemId: user_id }, update);
      }
    }
  },

  sendResetPasswordLink: async function (list) {
    if (list) {
      //var secret_phrase = list["secretPhrase"] || "";

      var user = await Users.findOneAsync({ email: list["email"] });
      if (user) {
        var user_id = user["systemId"];
        if (!is_test_user(list["email"]))
          Accounts.sendResetPasswordEmail(user_id);

        //reseting fails count
        await Users.updateAsync(
          { systemId: user_id },
          { $set: { loginFailsCount: 0 } },
        );
      }
    }
  },

  isRegisteredUser: async function (list) {
    var user = await Users.findOneAsync({ email: list["email"] });

    //checking if there is a user with a given email
    if (user) return true;
  },

  passwordChanged: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      //sending email to inform that the user's password was changed
      var user = await Users.findOneAsync({ systemId: user_id });
      if (user) {
        var email = {
          email: user["email"],
          subject: "Password changed",
          //html: list["html"],
          text: "Your password was recently changed.",
        };

        send_email(email);
      }
    }
  },

  enrollUser: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_admin(user_id, list)) {
      if (list["email"]) {
        var new_user_id;
        var new_user = await Meteor.users.findOneAsync({
          "emails.address": list["email"],
        });

        //if user is not registred in the system, then sending an invitation email
        if (!new_user) {
          //inserting user in accounts
          new_user_id = await Accounts.createUser({
            email: list["email"],
            password: "password",
          });

          //inserting user
          var user_data = build_user_data(new_user_id, list);
          await Users.insertAsync(user_data);

          // Accounts.sendEnrollmentEmail(new_user_id);
        } else {
          new_user_id = new_user["_id"];
        }

        //inviting the user
        var invitation = {
          userSystemId: new_user_id,
          role: list["role"],
          projectId: list["projectId"],
        };

        await Meteor.callAsync("insertProjectsUsers", invitation);
      }
    }
  },

  enrollUserAccepted: async function (list) {
    if (!list) {
      return;
    }

    var user = await Meteor.users.findOneAsync({
      "services.password.reset.token": list["token"],
    });
    if (user) {
      if (list["name"] || list["surname"])
        await Users.updateAsync(
          { systemId: user["_id"] },
          { $set: { name: list["name"], surname: list["surname"] } },
        );

      await Accounts.setPasswordAsync(user["_id"], list["password"]);

      var email = user["emails"][0]["address"];

      await Meteor.users.updateAsync(
        { _id: user["_id"], "emails.address": email },
        { $set: { "emails.$.verified": true } },
      );
      return email;
    }
  },

  verifyAccount: async function (list) {
    if (!list) {
      return;
    }

    // console.log("verify ");

    // Email.send({
    //   to: "arturs.sprogis@gmail.com",
    //   from: "viziquer@viziquer.lv",
    //   subject: "Example Email",
    //   text: "The contents of our email in plain text.",
    // });

    var user = await Meteor.users.findOneAsync({
      "services.email.verificationTokens.token": list["token"],
    });
    if (user) {
      var email = user["emails"][0]["address"];
      await Meteor.users.updateAsync(
        { _id: user["_id"], "emails.address": email },
        { $set: { "emails.$.verified": true } },
      );
    }
  },

  //for testing
  generate_users: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id)) {
      //number of users to add
      var count = list["count"];

      //start indexing from users count
      var users_count = await Users.find().countAsync();

      for (var i = 0; i < count; i++) {
        var index = users_count + i + 1;

        //user properties
        var name = "Mr";
        var surname = "test" + index;
        var mail = surname + "@test.com";
        var password = surname + surname;

        //inserting user in accounts
        var user_id = await Accounts.createUser({
          email: mail,
          password: password,
        });

        var date = get_current_time();

        //inserting in Users collection
        var id = await Users.insertAsync({
          systemId: user_id,
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

Accounts.validateLoginAttempt(function (obj) {
  if (!obj) {
    return;
  }

  //checking if the user's mail is verified
  // if (obj && obj["user"] &&  obj["user"]["emails"] && obj["user"]["emails"][0] && obj["user"]["emails"][0]["verified"]) {

  //This is a tmp solution because the verification is not working as expected
  if (true) {
    // var user = Users.findOne({systemId: obj["user"]["_id"], loginFailsCount: {$lte: 10}});

    // if (user) {
    return true;
    // }

    // else {
    // throw new Meteor.Error("too-many-fails", "User has made too many login fails.");
    // return false;
    // }
  } else {
    throw new Meteor.Error("not-verified", "User has not verified email.");
    return false;
  }
});

// import { UserStatus } from 'meteor/mizzao:user-status';

// UserStatus.events.on("connectionLogin", function(fields) {

// 	if (!fields)
// 		return;

// 	var item = {connectionId: fields["connectionId"],
// 				loginTime: fields["loginTime"],
// 				userAgent: fields["userAgent"],
// 				ipAddress: fields["ipAddr"]
// 			};

// 	Users.update({systemId: fields["userId"]},
// 				{$push: {logins: item}, $set: {loginFailsCount: 0}});

// });

// UserStatus.events.on("connectionLogout", function(fields) {

// 	if (!fields)
// 		return;

// 	Users.update({systemId: fields["userId"], "logins.connectionId": fields["connectionId"]},
// 					{$set: {"logins.$.logoutTime": fields["logoutTime"]}});

// });

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

Accounts.onLoginFailure(async function (obj) {
  if (obj && obj["error"] == "too-many-fails") return;
  else {
    var item = {
      ipAddress: obj["connection"]["clientAddress"],
      time: get_current_time(),
    };

    if (obj && obj["user"] && obj["user"]["_id"]) {
      await Users.updateAsync(
        { systemId: obj["user"]["_id"] },
        { $push: { loginFails: item }, $inc: { loginFailsCount: 1 } },
      );
    }
  }
});

// Accounts.emailTemplates.siteName = build_site_name();
// Accounts.emailTemplates.from = build_from_address();
// Accounts.emailTemplates.enrollAccount.subject = function (user) {
//     return "ajoo registration";
// };

Accounts.urls.resetPassword = function (token) {
  return Meteor.absoluteUrl("reset-password/" + token);
};

Accounts.urls.verifyEmail = function (token) {
  return Meteor.absoluteUrl("verify-email/" + token);
};

Accounts.urls.enrollAccount = function (token) {
  return Meteor.absoluteUrl("enroll-account/" + token);
};

Accounts.emailTemplates.enrollAccount.text = function (user, url) {
  //return "Hello, " + user.profile.name + "\n" +
  //	"This is from ajoo , click on the link: " + url;

  return (
    "Hello, you have successfully been registred in ajoo system.\n" +
    "To activate the account, click on the link: " +
    url
  );
};

Accounts.emailTemplates.resetPassword.subject = function (user) {
  return "ajoo reset password";
};

Accounts.emailTemplates.resetPassword.text = async function (user_obj, url) {
  var user = await Users.findOneAsync({ systemId: user_obj["_id"] });
  return (
    "Hello, " +
    user.name +
    " " +
    user.surname +
    "\n" +
    "Click on the link: " +
    url
  );
};

function build_user_data(user_id, list) {
  var date = get_current_time();

  var user = {
    systemId: user_id,
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

  if (list["name"]) user["nameLC"] = list["name"].toLowerCase();

  if (list["surname"]) user["surnameLC"] = list["surname"].toLowerCase();

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
