import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { ClientStorage } from 'ClientStorage';
import { Users } from '/imports/db/platform/collections'

// platform templates
import '/imports/client/platform/templates/index.js'

// custom templates
// VQ
import '/imports/client/custom/vq/templates/import_index.js'

// interpreter methods
import '/imports/client/platform/import_index.js'
import '/imports/client/custom/vq/js/import_index.js'

Template.nav.helpers({

    skin: function() {
        return 6;
    },
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

        console.log("user changed")


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

