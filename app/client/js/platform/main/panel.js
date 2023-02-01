//Panel
Template.panel.helpers({

    isProjectsActive: function() {
        return Session.get("activePanelItem") === "structure";
    },

    panel: function() {

        var project = Projects.findOne({_id: Session.get("activeProject")});
        if (project) {

          var tool = Tools.findOne({_id: project["toolId"]});
          if (tool) {

              var is_admin = is_system_admin(Session.get("userSystemId"));
              var panel = [ 
                            // {icon: "pencil", id: "feed", route: "project", isVisible: true},
                            {icon: "picture-o", id: "diagrams", route: "diagrams", isVisible: true},
                            // {icon: "archive", id: "archive", route: "archive"},
                            {icon: "group", id: "users", route: "users"},            
                            // {icon: "forumbee", id: "forum", route: "forum"},     
                              
                            // {icon: "desktop", id: "analytics", route: "analytics"},        
                            {icon: "wrench", id: "configurator", route: "configurator", isVisible: is_admin},     

                        ];

              var extension = {projectId: Session.get("activeProject"), versionId: Session.get("versionId"),};


              var active_panel = Session.get("activePanelItem");
              _.each(panel, function(item) {
                  if (tool[item.id]) {
                    item.isVisible = true;
                  }

                  if (active_panel && item.id === active_panel) {
                    item.active = "active";
                  }

                  _.extend(item, extension);
              });

              return panel;
          }

          else
              return no_project_panel();
        }

        else
            return no_project_panel();
    },



    profile: function() {
      var user = Users.findOne({systemId: Session.get("userSystemId")});
      if (user)
          return {name: user["name"],
                surname: user["surname"],
                profileImage: user["profileImage"]}; 
    },
    
    skin: function() {
      return 6;
    },

});

function no_project_panel() {

    var panel = [
                  {icon: "wrench", id: "configurator", route: "configurator", isVisible: is_system_admin(Session.get("userSystemId"))},                      
              ];

    _.each(panel, function(item) {

        if (item.id && item.id === Session.get("activePanelItem")) {
          item.active = "active";
        }

    });

    return panel;
}

function is_system_admin(system_id) {
  
  var user = Users.findOne({systemId: system_id});
  if (user && user["isSystemAdmin"] === true) {
      return true;
  }
}
