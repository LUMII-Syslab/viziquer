
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

//sets user name
Template.userT.helpers({
  profile: function() {
    var user = Users.findOne({systemId: Session.get("userSystemId")});
    if (user)
        return {name: user["name"],
                surname: user["surname"],
                profileImage: Utilities.getProfileImagePath(),
              }; 
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

              if (UserStatus.isMonitoring())
                UserStatus.stopMonitor();
          }

      });

      Router.go("index");
      return false;
  },
});
//End of user

