import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { ClientStorage } from 'ClientStorage';

import { Users } from '../../imports/db/platform/collections.js'
import { i18n } from 'meteor/universe:i18n';

import "./main.html";

i18n.setLocale('en');
Template.registerHelper('_', function (key, options) {
  const params = (options && options.hash) || {};
  return i18n.__(key, params);
});


Template.nav.helpers({

    skin: function() {
        return 6;
    },
    toolGroup: function() {
      return Session.get("toolGroup");
    }
});

Template.nav.events({

  "click #sidebarToggle": function(e) {
    e.preventDefault();

    var side_bar_class = "sidebar-display";

    var side_bar = $("#wrapper");
    if (side_bar.hasClass(side_bar_class))
      side_bar.removeClass(side_bar_class);
    else
      side_bar.addClass(side_bar_class);

    return;
  },

  "click #menuToggle": function(e) {
    e.preventDefault();

    var side_bar_class = "sidebar-hide";

    var side_bar = $("#wrapper");
    if (side_bar.hasClass(side_bar_class))
      side_bar.removeClass(side_bar_class);
    else
      side_bar.addClass(side_bar_class);

    return;
  },


});


Template.userT.onCreated(function() {
  var clientStorage = new ClientStorage("localStorage");
  var user = JSON.parse(clientStorage.get('current_user') || "{}");
  if (!_.isEmpty(user)) {
      Session.set("userSystemId", user["systemId"]);
  }

  Meteor.subscribe('navbar_user', {});
});



//sets user name
Template.userT.helpers({
  profile: function() {
    var user = Users.findOne({systemId: Session.get("userSystemId")});
    if (user) {
        Session.set("activeProject", user["activeProject"]);
        Session.set("versionId", user["activeVersion"]);

        return {name: user["name"],
                surname: user["surname"],
                profileImage: user["profileImage"]};
    }
  },
});

Template.userT.events({

//logs out the user
  'click #logout' : function(e, templ) {
      e.preventDefault();
      Meteor.logout(function(err){
          if (err) {
              console.error("Logout error", err)
          }

          else {
              const clientStorage = new ClientStorage("localStorage");
              clientStorage.set('current_user', "{}");

              // if (UserStatus.isMonitoring())
              //   UserStatus.stopMonitor();
          }

      });

      FlowRouter.go("index");
      return false;
  },
});
//End of user

Meteor.startup(() => {
  Tracker.autorun(() => {
    const toolGroup = Session.get("toolGroup");
    document.title = `${toolGroup || ""} App`;
  });
});
