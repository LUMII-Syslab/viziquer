import { Utilities } from '/client/js/platform/utilities/utils'
import { Users, Projects, ProjectsUsers } from '/libs/platform/collections'

import './projects.html'

//#######################

//Start of projects
Template.activeProject.helpers({
  activeProject: function() {
      var user = Users.findOne({systemId: Session.get("userSystemId")});
      if (user) {
          var proj = Projects.findOne({_id: user["activeProject"]});
          if (proj)
            return proj["name"];
          else
            return "No Projects";
      }
  },
});


Template.projectsT.onCreated(function() {
  Meteor.subscribe('navbar_projects', {projectId: Session.get("activeProject")});
  Meteor.subscribe("Tools", {});
});


Template.projectsT.events({

//opens new project dialog (modal)
  'click #createProject' : function(e, templ) {
      e.preventDefault();

      $("#add-project").modal("show");

      return false;
  },

});

Template.projectsList.events({
  
//removes project when clicks on remove project item
  'click .remove-project' : function(e, templ) {
      e.preventDefault();
      var proj_id = $(e.target).closest(".projects-dropdown-item").attr("id");

      var list = {projectId: proj_id};
      Utilities.callMeteorMethod("removeProject", list);
      
      return false;
  },

//changes active project
  'click .projects-dropdown-item' : async function(e, templ) {
      //e.preventDefault();
      var proj_id = $(e.target).closest(".projects-dropdown-item").attr("id");
	  
      Utilities.changeUserActiveProject(proj_id);
	  await dataShapes.changeActiveProject(proj_id);
  },
});

Template.projectsList.helpers({

  projectsCount: function() {
      return ProjectsUsers.find({userSystemId: Session.get("userSystemId")}).count();
  },

  projects: function() {
  	return ProjectsUsers.find({userSystemId: Session.get("userSystemId")}, {limit: 10}).map(
  		function(proj_user) {
  			
  			//selecting the project name
  			var project = Projects.findOne({_id: proj_user["projectId"]});
        if (project) {
            proj_user["name"] = project["name"];
        }

        return proj_user;
  	}); 
  },
  
});
//End of projects

