
Meteor.publish("Diagrams", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;
	
	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		//selects project diagrams
		var diagrams_query = {projectId: list["projectId"],
								versionId: list["versionId"],
							};

		if (role != "Admin" && role != "Reader")
			diagrams_query["allowedGroups"] = role;

		var fields = {_id: 1, name: 1, imageUrl: 1, seenCount: 1, createdAt: 1,
					diagramTypeId: 1, parentDiagrams: 1, allowedGroups: 1};

		return Diagrams.find(diagrams_query, {fields: fields, sort: {name: 1}});
	}
	else {
		error_msg();	
		return this.stop();	
	}
});

Meteor.publish("FoundDiagrams", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		//if search filter is applied, then selects diagrams from compartments
		if (list["text"] && list["text"] != "") {

			var proj_id = list["projectId"];
			var version_id = list["versionId"];

			//selects compartments and then their diagrams ids
			//THIS IS NOT REACTIVE
			var comparts = Compartments.find({projectId: proj_id, versionId: version_id,
											valueLC: {$regex: make_regex_subsring(list["text"])}});
			var diagram_ids = comparts.map(function(compart){return compart["diagramId"]});

			var diagram_regex = {"$regex": make_regex_subsring(list["text"]), $options: 'i'};
			

			var query1 = {projectId: proj_id,
							versionId: version_id,
							name: diagram_regex};

			var query2 = {_id: {$in: diagram_ids}}

			if (role != "Admin" && role != "Reader") {
				query1["allowedGroups"] = role;
				query2["allowedGroups"] = role;	
			}

			var diagrams_query = {$or: [query1, query2]};

			var self = this;
			var initializing = true;

			var dgrs = {noDiagrams: 1};
			var count = 0;
			var handle = Diagrams.find(diagrams_query).observeChanges({
				added: function (id) {
					count++;
					dgrs[id] = 1;
					if (count > 0)
						dgrs["noDiagrams"] = 0;

					if (!initializing) {
							self.changed("FoundDiagrams", user_id, dgrs);
					}
				},
				removed: function (id) {
					count--;
					dgrs[id] = 0;

					if (count == 0)
						dgrs["noDiagrams"] = 1;

					self.changed("FoundDiagrams", user_id, dgrs);
				}
			});

			initializing = false;
			self.added("FoundDiagrams", user_id, dgrs);
			self.ready();

			self.onStop(function () {
				handle.stop();
			});
		}
	}
	else {
		error_msg();	
		return this.stop();	
	}
});


Meteor.publish("DiagramTypes_UserVersionSettings", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	var user_id = this.userId;
	if (is_project_version_reader(user_id, list)) {

		//selecting the version that stores the tool and tool version info
		var version = Versions.findOne({_id: list["versionId"], projectId: list["projectId"]});
		if (version) {

			//adding some limits on the fields
			var diagram_type_fields = {fields: {_id: 1, name: 1, editorType: 1,
										extensionPoints: 1, style: 1}};
			var user_version_settings = {fields: {userSystemId: 0,
													documentsSortBy: 0,
													documentsSelectedGroup: 0,
													}};

			return [DiagramTypes.find({toolId: version["toolId"],
										versionId: version["toolVersionId"]}, diagram_type_fields),
					UserVersionSettings.find({projectId: list["projectId"],
											userSystemId: user_id, 
											versionId: list["versionId"]},
											user_version_settings)];
		}
		else {
			error_msg();
			return this.stop();
		}
	}
	else {
		error_msg();
		return this.stop();
	}
});

					
Meteor.publish("ElementsSections_Sections", function(list) {
	
	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		var diagram_query = {_id: list["diagramId"], projectId: list["projectId"],
							versionId: list["versionId"]};

		if (role != "Admin" && role != "Reader") {
			diagram_query["allowedGroups"] = role;
			//doc_query["allowedGroups"] = role;	
		}

		if (Diagrams.findOne(diagram_query)) {
			return 	Meteor.publishWithRelations({
						handle: this,
						collection: ElementsSections,
						filter: {projectId: list["projectId"], diagramId: list["diagramId"],
								versionId: list["versionId"]},

						mappings: [
							{key: 'sectionId',
				        	collection: Sections,
					        },
					    ]
					});
		}

		else {
			error_msg();
			return this.stop();
		}

	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("ElementsSections_Diagrams", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	var user_id = this.userId;
	if (is_project_version_reader(user_id, list)) {

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: ElementsSections,
					filter: {projectId: list["projectId"],
							versionId: list["versionId"]},

					mappings: [
						{key: 'diagramId',
			        	collection: Diagrams,

			        	mappings: [
							{key: 'diagramId',
							reverse: true,
				        	collection: Compartments,
				        	filter: {isObjectRepresentation: true},
				        	},
				        ],
				        },
				    ]
				});

		//vajag compartmentus
	}
	else {
		error_msg();
		return this.stop();
	}
});


Meteor.publish("Diagram_Palette_ElementType", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		var version = Versions.findOne({_id: list["versionId"], projectId: list["projectId"]});
		if (version) {

			var tool_id = version["toolId"];
			var tool_version_id = version["toolVersionId"];

			//diagram
			var diagram_query = {_id: list["id"],
								projectId: list["projectId"],
								versionId: list["versionId"]};

			var diagram_limit = {fields: {_id: 1, name: 1, imageUrl: 1, style: 1, seenCount: 1,
								allowedGroups: 1, diagramTypeId: 1, parentDiagrams: 1,
								editingUserId: 1, editingStartedAt: 1, editorType: 1,
								"edit.action": 1, "edit.userId": 1}};					

			//diagram types and element types
			var diagram_type_query = {_id: list["diagramTypeId"],
									toolId: tool_id, versionId: tool_version_id};
			var diagram_type_limit = {fields: {diagramId: 0, diagramTypeId: 0,
												toolId: 0, versionId: 0}};

			//elements and compartments
			var element_query = {diagramId: list["id"], 
								projectId: list["projectId"],
								versionId: list["versionId"]};
			var element_limit = {fields: limit_element_fields()};
			var compart_limit = {fields: {}};


			var type_query = {diagramTypeId: list["diagramTypeId"],
								toolId: tool_id, versionId: tool_version_id};
			var elem_type_limit = {fields: {}};
			var palette_button_type_limit = {fields: {toolId: 0, versionId: 0, diagramId: 0}};

			if (role != "Admin" && role != "Reader") {
				diagram_query["allowedGroups"] = role;
				//doc_query["allowedGroups"] = role;	
			}

			//if no diagrams found, then no data
			var diagrams = Diagrams.find(diagram_query, diagram_limit);
			if (diagrams.count() == 0) {
				error_msg();
				return this.stop();				
			}
			
			else
				return [diagrams,
						Elements.find(element_query, element_limit),
						Compartments.find(element_query, compart_limit),
						
						DiagramTypes.find(diagram_type_query, diagram_type_limit),
						ElementTypes.find(type_query, elem_type_limit),
						PaletteButtons.find(type_query, palette_button_type_limit),
					];
		}
	}
	else {
		error_msg(checked_rights);
		return this.stop();
	}
});

Meteor.publish("DiagramLogs", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: DiagramLogs,
					filter: {diagramId: list["diagramId"], projectId: list["projectId"],
							versionId: list["versionId"]},
					//filter: {diagramId: list["diagramId"]},
					options: {
						sort: {createdAt: -1},
						limit: list["logsCount"],
					},
					mappings: [
						{collection: Meteor.users,
						key: "authorId",

			        	mappings: [{
			        		reverse: true,
				        	key: 'systemId',
				        	collection: Users
				        	},
				        ],
				        },
					]
		    	});
	}
});

Meteor.publish("Diagram_Types_Documents", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(user_id, list, role)) {

		var version = Versions.findOne({_id: list["versionId"], projectId: list["projectId"]});
		if (version) {

			var tool_id = version["toolId"];
			var tool_version_id = version["toolVersionId"];

			//documents
			var doc_query = {projectId: list["projectId"], versionId: list["versionId"]};
			var doc_limit = {fields: {_id: 1, name: 1}};				

			var type_query = {diagramTypeId: list["diagramTypeId"], toolId: tool_id, versionId: tool_version_id};
			
			//var elem_type_limit = {fields: {}};
			var compart_type_limit = {fields: {}};
			var dialog_type_limit = {fields: {}};
			//var palette_button_type_limit = {fields: {toolId: 0, versionId: 0, diagramId: 0}};

			if (role != "Admin" && role != "Reader") {
				diagram_query["allowedGroups"] = role;
				//doc_query["allowedGroups"] = role;	
			}

			return [
					//types
					//DiagramTypes.find(diagram_type_query, diagram_type_limit),
					//ElementTypes.find(type_query, elem_type_limit),
					Documents.find(doc_query, doc_limit),
					CompartmentTypes.find(type_query, compart_type_limit),
					DialogTabs.find(type_query, dialog_type_limit),

					DiagramFiles.find(doc_query),
					CloudFiles.find(doc_query),
					FileObjects.find(doc_query),

					//PaletteButtons.find(type_query, palette_button_type_limit),			
				];
		}
	}

	else {
		error_msg(checked_rights);
		return this.stop();
	}
});

Meteor.publish("Diagram_Locker", function(list) {

	if (is_project_version_reader(this.userId, list)) {

		var self = this;
		var user;

		var diagram = Diagrams.find({_id: list["diagramId"],
									projectId: list["projectId"],
									versionId: list["versionId"],
								});


		//TODO: This is not reactive when user's name changes (need improvement)
		var handle = diagram.observe({
			added: function (doc) {

				user = Users.findOne({systemId: doc["editingUserId"]});
				if (user)
					self.added("Users", doc["editingUserId"], user);
			},

			changed: function(new_doc, old_doc) {
				user = Users.findOne({systemId: new_doc["editingUserId"]});

				if (old_doc["editingUserId"])
					self.removed('Users', old_doc["editingUserId"]);

				if (new_doc["editingUserId"] && user)
					self.added("Users", new_doc["editingUserId"], user);
			},

			removed: function (doc) {

				if (doc["editingUserId"])
					self.removed('Users', doc["editingUserId"]);
			}

		});

		self.ready();

		self.onStop(function () {
			handle.stop();
		});
	}

});

Meteor.publish("Documents", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;
	
	var role = proj_user["role"];

	//checks rights to access the project
	if (is_project_version_reader(user_id, list, role)) {

		//selects project diagrams
		var documents_query = {projectId: list["projectId"],
								versionId: list["versionId"],
							};

		if (role != "Admin" && role != "Reader")
			documents_query["allowedGroups"] = role;

		//selects project documents
		var documents_limit = {fields: get_documents_limit(), sort: {name: 1}};
	
		//if the search filter is applied, then selects the specified compartments
		if (list["text"] && list["text"] != "") {

			//selects sections and then their document ids
			//THIS IS NOT REACTIVE
			var sections = Sections.find({projectId: list["projectId"],
											versionId: list["versionId"],
											textLC: {$regex: make_regex_subsring(list["text"])}});
			var doc_ids = sections.map(function(section){return section["documentId"]});

			var document_regex = {$regex: make_regex_subsring(list["text"]), $options: 'i'};
			documents_query = {$or: [{projectId: list["projectId"], versionId: list["versionId"],
											name: document_regex}, {_id: {$in: doc_ids}}]};
		}


		return [Documents.find(documents_query, documents_limit),

				UserVersionSettings.find({projectId: list["projectId"],
											userSystemId: user_id, 
											versionId: list["versionId"]}, 
											{fields: {view: 0,
													collapsedDiagrams: 0,
													consistencyCheck: 0,
													diagramsSortBy: 0,
													diagramsSelectedGroup: 0,
												}}),
				];


	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("Files", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;
	
	var role = proj_user["role"];

	//checks rights to access the project
	if (is_project_version_reader(user_id, list, role)) {

		//selects project diagrams
		var query = {projectId: list["projectId"],
								versionId: list["versionId"],
							};

		if (role != "Admin" && role != "Reader")
			query["allowedGroups"] = role;

		//selects project documents
		//var limit = {fields: get_documents_limit(), sort: {name: 1}};
		var limit = {};

		return [CloudFiles.find(query, limit),
				FileObjects.find({projectId: list.projectId, versionId: list.versionId}),
			];
	}

	else {
		error_msg();
		return this.stop();
	}
});


Meteor.publish("DiagramFiles", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	return	Meteor.publishWithRelations({
				handle: this,
				collection: DiagramFiles,
				filter: {projectId: list.projectId, versionId: list.versionId},
				options: {
					//fields: posts_fields,
				},

				mappings: [
					{
			        	key: "diagramId",
			        	collection: Diagrams,
			        	options: {
			        		fields: {name: 1, diagramTypeId: 1},
			        	},
			        },

			        {
			        	key: "elementId",
			        	collection: Elements,
						options: {
							fields: {_id: 1},
						},

						mappings: [
							{	
					        	key: "elementId",
					        	collection: Compartments,
					        	reverse: true,

					        	filter: {projectId: list.projectId, versionId: list.versionId, isObjectRepresentation: true},
					        	options: {
									fields: {value: 1, elementId: 1, isObjectRepresentation: 1},
								},
							},
						],

					},
				]
	    	});
});

Meteor.publish("DocumentTypes", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var version = Versions.findOne({_id: list["versionId"],
									projectId: list["projectId"]});
	if (version) {

		var tool_id = version["toolId"];
		var tool_version_id = version["toolVersionId"];

		//document types
		var document_type_query = {toolId: tool_id, versionId: tool_version_id};
		var document_type_limit = {};//{fields: {diagramId: 0, diagramTypeId: 0,
									//		toolId: 0, versionId: 0}};

		return DocumentTypes.find(document_type_query, document_type_limit);
	}

	else {
		error_msg();
		return this.stop();
	}

});

Meteor.publish("Document_Sections", function(list) {

	var user_id = this.userId;
	if (!list || list["noQuery"] || !list["projectId"] || !user_id)
		return this.stop();

	var proj_id = list["projectId"];
	var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
	if (!proj_user)
		return;

	var role = proj_user["role"];
	if (is_project_version_reader(this.userId, list, role)) {

		//selects project documents
		var document_query = {_id: list["id"], projectId: list["projectId"],
								versionId: list["versionId"]};

		if (role != "Admin" && role != "Reader")
			document_query["allowedGroups"] = role;

		var documents_limit = {fields: get_documents_limit()};

		var section_query = {documentId: list["id"], projectId: list["projectId"],
								versionId: list["versionId"]};				

		var sections_limit = {fields: {textLC: 0, authorId: 0, createdAt: 0,
										projectId: 0, versionId: 0}};


		var documents = Documents.find(document_query, documents_limit);
		if (documents.count() == 0) {
			error_msg();
			return this.stop();				
		}
		else {

			var version = Versions.findOne({_id: list["versionId"],
											projectId: list["projectId"]});
			if (!version)
				return this.stop();

			var tool_id = version["toolId"];
			var tool_version_id = version["toolVersionId"];

			return [documents,
					Sections.find(section_query, sections_limit),
					DocumentTypes.find({toolId: tool_id, versionId: tool_version_id}),
				];
		}
	}
	else {
		error_msg();
		return this.stop();
	}
});


Meteor.publish("ProjectsGroups", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	if (is_project_member(this.userId, list)) {
		return ProjectsGroups.find({projectId: list["projectId"]});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});


Meteor.publish("SearchNewProjectUsers", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	if (is_project_admin(this.userId, list)) {

		if (list["text"] == "")
			return this.stop();
		else {
			var query = build_user_search_query(list["text"]);
			var limit = get_user_query_limit();

			return Users.find(query, limit);
		}
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});

Meteor.publish("Posts_Users", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	var posts_fields = {projectId: 0};

	if (is_project_member(this.userId, list)) {
		return	Meteor.publishWithRelations({
					handle: this,
					collection: Posts,
					filter: {projectId: list["projectId"]},
					filter: {},
					options: {
						sort: {createdAt: -1},
						limit: list["limit"],
						fields: posts_fields,
					},
					mappings: [
						{
			        	key: "authorId",
			        	collection: Meteor.users,
			        	mappings: [
							{
				        	reverse: true,
				        	key: 'systemId',
				        	collection: Users,
				        	options: get_maximal_user_query_limit(),
				        	},
			        	]
				        },

						{
			        	key: "postId",
			        	collection: Likers,
			        	reverse: true,

						options: {
							fields: {projectId: 0},
						},

			        	mappings: [
							{
				        	key: "userSystemId",
				        	collection: Meteor.users,
				        	mappings: [
								{
					        	reverse: true,
					        	key: 'systemId',
					        	collection: Users,
					        	options: get_maximal_user_query_limit(),
					        	},
				        	]
					        },
			        	]
				        },
					]
		    	});
	}
	else {
		error_msg();
		return this.stop();
	}
});



Meteor.publish("Versions", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		var query = {projectId: list["projectId"], status: "Published"};
		var fields = limit_versions_fields();
		if (is_project_admin(user_id, list))
			query["status"] = {$in: ["New", "Published"]};

		return Versions.find(query, {sort: {createdAt: -1}, fields: fields});
	}
	else {
		error_msg();
		return this.stop();
	}
});

// server: publish the current size of a collection
Meteor.publish("postsCount", function (list) {

	if (is_project_member(this.userId, list)) {

		var self = this;
		var count = 0;
		var initializing = true;

		var handle = Posts.find({projectId: list["projectId"]}).observeChanges({
			added: function (id) {
				count++;
				if (!initializing)
					self.changed("counts", list["projectId"], {count: count});
			},
			removed: function () {
				count--;
				self.changed("counts", list["projectId"], {count: count});
			}
			// don't care about changed
		});

		initializing = false;
		self.added("counts", list["projectId"], {count: count});
		self.ready();

		self.onStop(function () {
			handle.stop();
		});
	}
});


// server: publish the current size of a collection
Meteor.publish("elementsCount", function (list) {

	var self = this;
	var count = 0;
	var initializing = true;
	var query = empty_query();		

	var user_id = this.userId;
	if (is_project_version_reader(user_id, list)) {
		query = {projectId: list["projectId"],
				versionId: list["versionId"],
				diagramId: list["diagramId"]};
	}
	else if (list["toolId"] && is_system_admin(user_id)) {
		query = {toolId: list["toolId"],
				versionId: list["versionId"],
				diagramId: list["diagramId"]};
	}
	else
		return;


	var handle = Elements.find(query).observeChanges({
		added: function (id) {
			count++;
			if (!initializing)
				self.changed("counts", list["diagramId"], {count: count});
		},
		removed: function (ids) {
			count--;
			self.changed("counts", list["diagramId"], {count: count});
		}
		// don't care about changed
	});

	initializing = false;
	self.added("counts", list["diagramId"], {count: count});
	self.ready();

	self.onStop(function () {
		handle.stop();
	});
});

Meteor.publish("ProjectsUsers_Users", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	if (is_project_member(this.userId, list)) {

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: ProjectsUsers,
					filter: {projectId: list["projectId"]},

					mappings: [
						{
			        	key: 'userSystemId',
			        	collection: Meteor.users,

						mappings: [
							{reverse: true,
				        	key: 'systemId',
				        	collection: Users,
				        	options: get_maximal_user_query_limit(),
					        },
					    ]
				        },
				    ]
				})
	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("Searches", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	if (is_project_member(this.userId, list)) {

		if (list["text"] && list["text"] != "") {

			var query = {phrase: {$regex: "^" + list["text"].toLowerCase()},
						type: list["type"]};
			query["projects." + list["projectId"]] = {$exists: true};

			return Searches.find(query, {sort: {counter: -1}, limit: 10});
		}
		else
			return this.stop();
	}

	else if (system_id) {

		if (list["text"] && list["text"] != "") {

			var query = {phrase: {$regex: "^" + list["text"].toLowerCase()},
						type: list["type"],
						userSystemId: system_id};

			return Searches.find(query, {sort: {counter: -1}, limit: 10});
		}
		else
			return this.stop();
	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("UserSearches", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var system_id = this.userId;
	if (system_id) {

		if (list["text"] && list["text"] != "") {

			var query = {};
			query["users." + system_id] = {$exists: true};
 			query["phrase"] = {$regex: "^" + list["text"].toLowerCase()};
			query["type"] = list["type"];

			var user_count = {};
			user_count["users." + system_id] = -1;

			return Searches.find(query, {sort: user_count, limit: 10});
		}
		else
			return this.stop();
	}
	else {
		error_msg();
		return this.stop();
	}
});


Meteor.publish("Forum_Posts", function(list) {

	//gets user's id
	var user_id = this.userId;
	if (!user_id || !list || list["noQuery"])
		return this.stop();

	var filter = select_project_users(user_id, list);

	if (list["postId"]) {
		filter["_id"] = list["postId"];
	}

	if (list["tag"])
		filter["tags"] = list["tag"];

	var limit = {};
	limit["sort"] = {createdAt: -1};
	limit["skip"] = (list["nr"] - 1) * list["step"];
	limit["limit"] = list["step"];

	return Meteor.publishWithRelations({
						handle: this,
						collection: ForumPosts,
						filter: filter,
						options: limit,

						mappings: [{
				        	key: 'authorId',
				        	collection: Meteor.users,

							mappings: [{
								reverse: true,
					        	key: 'systemId',
					        	collection: Users,
					        	options: get_maximal_user_query_limit(),
						    },]
					    	},
					    ],
					});

	
});

// server: publish the current size of a collection
Meteor.publish("forumPostsCount", function (list) {
	var user_id = this.userId;
	if (!user_id || !list || list["noQuery"])
		return this.stop();

	var filter = select_project_users(user_id, list);

	var self = this;
	var count = 0;
	var initializing = true;

	var query = {};
	if (list["projectIds"])
		query = {projectId: {$in: list["projectIds"]}};

	if (list["tag"])
		query["tags"] = list["tag"];

	var handle = ForumPosts.find(query).observeChanges({
		added: function (id) {

			count++;
			if (!initializing)
				self.changed("ForumPostsCount", user_id, {count: count});

		},
		removed: function (ids) {
			count--;
			self.changed("ForumPostsCount", user_id, {count: count});
		},

		// don't care about changed
	});

	initializing = false;
	self.added("ForumPostsCount", user_id, {count: count});
	self.ready();

	self.onStop(function () {
		handle.stop();
	});

});

Meteor.publish("Forum_PostComments", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		var filter = build_forum_project_users_query(list);
		if (list["postId"])
			filter["forumPostId"] = list["postId"];

		return Meteor.publishWithRelations({
					handle: this,
					collection: ForumPostComments,
					filter: filter,

					mappings: [
						{
			        	key: 'authorId',
			        	collection: Meteor.users,

						mappings: [
							{reverse: true,
				        	key: 'systemId',
				        	collection: Users,
				        	options: get_maximal_user_query_limit(),
					        },
					    ]
				        },
				    ]
				});
	}
	else {
		error_msg();
		return this.stop();
	}
});


//Forum_Tags
Meteor.publish("Forum_Tags", function(list) {

	var user_id = this.userId;
	if (!user_id || !list || list["noQuery"]) {
		error_msg();
		return this.stop();
	}

	var filter;
	if (list["projectId"])
		filter = {projectId: list["projectId"]};

	else {
		var project_ids = ProjectsUsers.find({userSystemId: user_id}).map(
			function(proj_user) {
				return proj_user["projectId"];
			});

		filter = {projectId: {$in: project_ids}};
	}

	return ForumPostTags.find(filter);
});

//Tasks
Meteor.publish("Tasks", function(list) {

	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		return [Diagrams.find({projectId: list["projectId"], versionId: list["versionId"]}),
				Tasks.find({projectId: list["projectId"], versionId: list["versionId"]}),
			];
	}

});

Meteor.publish("Task", function(list) {

	var user_id = this.userId;
	if (is_project_member(user_id, list)) {

		return [
			Diagrams.find({_id: list["diagramId"], projectId: list["projectId"], versionId: list["versionId"]}),
			Elements.find({diagramId: list["diagramId"], projectId: list["projectId"], versionId: list["versionId"]}),
			Compartments.find({diagramId: list["diagramId"], projectId: list["projectId"], versionId: list["versionId"]}),

			Tasks.find({_id: list["taskId"], projectId: list["projectId"], versionId: list["versionId"]}),
			TaskSteps.find({taskId: list["taskId"], projectId: list["projectId"], versionId: list["versionId"]}),
		];
	}

});


//End of publish

function get_documents_limit() {
	return {nameLC: 0, authorId: 0, versionId: 0, projectId: 0};
}

function limit_versions_fields() {
	return {createdBy: 0, projectId: 0, publishedBy: 0};
}

function limit_element_fields() {
	return {_id: 1, type: 1, style: 1, styleId: 1, location: 1, startElement: 1, endElement: 1,
			swimlane: 1, points: 1, superTypeIds: 1, elementTypeId: 1, targetId: 1, diagramId: 1};
}

function make_regex_subsring(text) {
	if (text)
		return ".*" + text.toLowerCase() + ".*";
}

function build_forum_project_users_query(list) {
	return {projectId: list["projectId"]};
}

function select_project_users(user_id, list) {

	var query_out = {}

	//if (list["projectId"])
	//	return {projectId: list["projectId"], authorId: user_id};
	
	//else
		// var proj_users = ProjectsUsers.find({userSystemId: user_id, }).map(
		// 	function(proj_user) {
		// 		return proj_user["userSystemId"];
		// 	});

	//var res = {authorId: {$in: proj_users}};
	var query = {userSystemId: user_id};

	if (list["projectId"])
		query["projectId"] = list["projectId"];


	var proj_ids = ProjectsUsers.find(query).map(
		function(proj_user) {
			return proj_user["projectId"];
		});

	if (!proj_ids)
		proj_ids = [];

	return {projectId: {$in: proj_ids}};

	//return {authorId: {$in: proj_users}};
}
