


Meteor.methods({

	loadOntology: function(list) {

                var user_id = Meteor.userId();
                if (is_project_version_admin(user_id, list)) {

                        Associations.remove({projectId: list.projectId, versionId: list.versionId});
                        Attributes.remove({projectId: list.projectId, versionId: list.versionId});
                        Classes.remove({projectId: list.projectId, versionId: list.versionId});

                        var data = list.data;
                	if (data.Associations && data.Associations.length > 0) {

                                var associations = _.map(data.Associations, function(association) {
                                        _.extend(association, {projectId: list.projectId, versionId: list.versionId});

                                        return association;
                                });

                		Associations.batchInsert(associations);
                	}

                	if (data.Attributes && data.Attributes.length > 0) {

                                var attributes = _.map(data.Attributes, function(attribute) {
                                        _.extend(attribute, {projectId: list.projectId, versionId: list.versionId});

                                        return attribute;
                                });

                		Attributes.batchInsert(attributes);
                	}


                	if (data.Classes && data.Classes.length > 0) {

                                var classes = _.map(data.Classes, function(_class) {
                                        _.extend(_class, {projectId: list.projectId, versionId: list.versionId});

                                        return _class;
                                });
    
                		Classes.batchInsert(classes);
                	}

                }
	},
	loadMOntology: function(list) {

                var user_id = Meteor.userId();
                if (is_project_version_admin(user_id, list)) {

                    Schema.remove({projectId: list.projectId, versionId: list.versionId});

                    var data = list.data;
					console.log(data);
					var schema = _.extend(data, {projectId: list.projectId, versionId: list.versionId});
					
					//console.log(schema);
					Schema.batchInsert([schema]);


                }
				
	},
	loadTriplesMaps: function(list) {

	//var x=require('n3').Parser().parse(require('fs').readFileSync('UnivExample_hasMarkS2.n3').toString())
//var parser = N3.Parser({ format: 'N3' });
//var x = parser.parse(list);


                var user_id = Meteor.userId();
                if (is_project_version_admin(user_id, list)) {

                    TriplesMaps.remove({projectId: list.projectId, versionId: list.versionId});
					// Te varētu likt to izparsēšanu	
                    var data = list.data;
					var triplesMaps = _.extend(data, {projectId: list.projectId, versionId: list.versionId});
					
					//console.log(triplesMaps);
					TriplesMaps.batchInsert([triplesMaps]); 


                }
				
	},
});
