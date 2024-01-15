import { is_project_member, is_project_version_admin } from '/imports/libs/platform/user_rights'
import { Schema, Associations, Attributes, Classes } from '/imports/db/custom/vq/collections'

Meteor.methods({

    loadMOntologyByUrl: function(list) {
    // http://viziquer.lumii.lv/schema-store/schemas/Scholarly.json        
        console.log("in loadMOntologyByUrl", list)
        var result = HTTP.call('GET', list.url);

		//console.log("result", result.data)
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			//Schema.remove({projectId: list.projectId, versionId: list.versionId});
			Schema.remove({projectId: list.projectId});

			var data = result.data;
			//var schema = _.extend(data, {projectId: list.projectId, versionId: list.versionId});
			var schema = _.extend(data, {projectId: list.projectId});
			
			//console.log(schema);
			Schema.batchInsert([schema]);
		} 
    	},

	loadMOntology: function(list) {

                var user_id = Meteor.userId();
                if (is_project_version_admin(user_id, list)) {

                    //Schema.remove({projectId: list.projectId, versionId: list.versionId});
					Schema.remove({projectId: list.projectId});

                    var data = list.data;
					//console.log(data);
					//var schema = _.extend(data, {projectId: list.projectId, versionId: list.versionId});
					var schema = _.extend(data, {projectId: list.projectId});
					
					//console.log(schema);
					Schema.batchInsert([schema]);

				}
				
	},
	getProjectSchema: function(list) {
		return { schema:{} };
		var user_id = this.userId;
		if (is_project_member(user_id, list)) {

			var project_id = list.projectId;
			//var version_id = list.versionId;

			//var schema = Schema.findOne({projectId: project_id, versionId: version_id});
			var schema = Schema.findOne({projectId: project_id});
			if (!schema) { schema = {}; }

			return { schema:schema };
		}
	},
});
