import './noProject.html'

Template.noProject.events({

	//creates a new project
	'click #create-project' : function(e) {
		var proj_name = $("#projectName").val();
		create_project(e, proj_name);
	},

});
