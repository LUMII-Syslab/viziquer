import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Users, DiagramTypes } from '/libs/platform/collections'

// DISABLE QUERY STRING COMPATIBILITY
// WITH OLDER FlowRouter AND Meteor RELEASES
FlowRouter.decodeQueryParamsOnce = true;


FlowRouter.route('/', {
  name: 'index',
  waitOn() {
    return import('/client/js/platform/index/index.js');
  },
  action() {
    BlazeLayout.render('publicLayout', {main: 'index'});
  }
});


FlowRouter.route('/signup', {
  name: 'signup',
  waitOn() {
    return import('/client/js/platform/signup/signup.js');
  },
  action() {
    BlazeLayout.render('publicLayout', {main: 'signup'});
  }
});


FlowRouter.route('/reset-password/:token', {
  name: 'resetPassword',
  action() {
    BlazeLayout.render('publicLayout', {main: 'resetPasswordTemplate'});
  }
});


FlowRouter.route('/go-to-your-email', {
  name: 'goToEmail',
  action() {
    BlazeLayout.render('publicLayout', {main: 'goToEmailTemplate'});
  }
});


FlowRouter.route('/enroll-account/:token', {
  name: 'enrollAccount',
  action() {
    BlazeLayout.render('publicLayout', {main: 'enrollAccountTemplate'});
  }
});


FlowRouter.route('/structure', {
  name: 'structure',
  waitOn() {
    // return import('/client/js/platform/signup/signup.js');
  },

  subscriptions: function(params, queryParams) {
    this.register('Structure_Tools', Meteor.subscribe('Structure_Tools', {}));
  },

  action() {
    Session.set("activePanelItem", "structure");
    BlazeLayout.render('mainLayout', {main: 'structureTemplate', ribbon: 'structureRibbon'});
  },
});


FlowRouter.route('/project/:projectId/version/:versionId/diagrams/:phrase?', {
  name: 'diagrams',
  waitOn() {
    // return import('/client/js/platform/signup/signup.js');
  },

  subscriptions: function(params, queryParams) {
    var diagrams_query = build_diagrams_query(params);

    this.register('Diagrams', Meteor.subscribe('Diagrams', diagrams_query));
    this.register('FoundDiagrams', Meteor.subscribe('FoundDiagrams', diagrams_query));
    this.register('DiagramTypes_UserVersionSettings', Meteor.subscribe('DiagramTypes_UserVersionSettings', {projectId: params.projectId, versionId: params.versionId,}));
    this.register('ProjectsGroups', Meteor.subscribe('ProjectsGroups', {projectId: params.projectId}));

    // Deps.autorun(function () {
    //     this.register('Searches', Meteor.subscribe('Searches', {projectId: proj_id}));
    // });


  //         Meteor.subscribe("Diagrams", Session.get("diagrams"));
  //         Meteor.subscribe("FoundDiagrams", Session.get("diagrams"));

  //         Meteor.subscribe("DiagramTypes_UserVersionSettings", {projectId: proj_id, versionId: version_id});

  //         Meteor.subscribe("ProjectsGroups", {projectId: proj_id}),

  //         //searching suggestions
  //         Deps.autorun(function () {
  //             Meteor.subscribe("Searches", Session.get("diagramsSearch"));
  //         });


  },

  action(params, queryParams) {
    Session.set("activePanelItem", "diagrams");
    Session.set("sortBy", {name: 1});

    var proj_id = params.projectId;
    var version_id = params.versionId;
    Session.set("versionId", version_id);

    var diagrams_query = build_diagrams_query(params);
    Session.set("diagrams", diagrams_query);

    BlazeLayout.render('mainLayout', {main: 'diagramsTemplate', ribbon: 'diagramsRibbon'});
  },
});

function build_diagrams_query(params) {
    var diagrams_query = {projectId: params.projectId, versionId: params.versionId};
    var phrase = params.phrase;
    if (phrase) {
        diagrams_query["text"] = phrase;
    }

    return diagrams_query;
}


  // this.route('diagrams', {
  //     path: '/project/:projectId/version/:versionId/diagrams/:phrase?',
  //     template: "diagramsTemplate",
  //     layoutTemplate: "mainLayout",
  //     yieldTemplates: {
  //         'diagramsRibbon': {to: 'ribbon'},
  //     },

  //     waitOn: function() {
  //       //sets panel item to activate
  //         Session.set("activePanelItem", "diagrams");

  //         Session.set("sortBy", {name: 1});

  //         var proj_id = this.params.projectId;
  //         var version_id = this.params.versionId;
  //         Session.set("versionId", version_id);

  //         var diagrams_query = {projectId: proj_id, versionId: version_id};
  //         var phrase = this.params.phrase;
  //         if (phrase)
  //             diagrams_query["text"] = phrase;

  //         Session.set("diagrams", diagrams_query);

  //         Meteor.subscribe("Diagrams", Session.get("diagrams"));
  //         Meteor.subscribe("FoundDiagrams", Session.get("diagrams"));

  //         Meteor.subscribe("DiagramTypes_UserVersionSettings", {projectId: proj_id, versionId: version_id});

  //         Meteor.subscribe("ProjectsGroups", {projectId: proj_id}),

  //         //searching suggestions
  //         Deps.autorun(function () {
  //             Meteor.subscribe("Searches", Session.get("diagramsSearch"));
  //         });
  //     },

  //     onStop: function() {
  //        var no_query = Utilities.resetQuery();
  //        Session.set("diagrams", no_query);
  //        Session.set("sortBy", reset_variable());
  //     },
  // });




FlowRouter.route('/project/:projectId/diagram/:_id/type/:diagramTypeId/version/:versionId/:editMode?', {
  name: 'diagram',
  waitOn() {
    // return import('/client/js/platform/signup/signup.js');
  },

  subscriptions: function(params, queryParams) {
    var proj_id = params.projectId;
    var dgr_id = params._id;
    var type_id = params.diagramTypeId;
    var version_id = params.versionId;

    this.register('Diagram_Types', Meteor.subscribe('Diagram_Types', {
                            id: dgr_id, projectId: proj_id, versionId: version_id,
                            diagramTypeId: type_id}));

    this.register('Diagram_Palette_ElementType', Meteor.subscribe("Diagram_Palette_ElementType", {
                          id: dgr_id, projectId: proj_id, versionId: version_id,
                          diagramTypeId: type_id}));

    this.register('Diagram_Locker', Meteor.subscribe("Diagram_Locker", {projectId: proj_id,
                                                                        diagramId: dgr_id,
                                                                        versionId: version_id,
                                                                      }));
  },

  action(params, queryParams) {
    if (queryParams.plain) {
      Session.set("plain", {showPlain: "inline", showDiagram: "none",});
    }
    else {
      Session.set("plain", {showPlain: "none", showDiagram: "inline",});
    }

    var proj_id = params.projectId;
    var dgr_id = params._id;
    var type_id = params.diagramTypeId;
    var version_id = params.versionId;

  //sets panel item to activate
    Session.set("activePanelItem", "diagrams");

    console.log("params ", params)

    if (params.editMode) {
        console.log("in set edit mode")

        Session.set("editMode", true);
        Session.set("edited", true);
    }
    else {
        Session.set("editMode", reset_variable());
    }

  //sets active diagram
    Session.set("activeDiagram", dgr_id);
    Session.set("diagramType", type_id);
    Session.set("activeElement", reset_variable());

  //sets version id
    Session.set("versionId", version_id);

    BlazeLayout.render('mainLayout', {main: 'diagramTemplate', ribbon: 'diagramRibbon'});
  },
});




FlowRouter.route('/public/project/:projectId/diagram/:_id/type/:diagramTypeId/version/:versionId', {
  name: 'public-diagram',
  waitOn() {
    // return import('/client/js/platform/signup/signup.js');
  },

  subscriptions: function(params, queryParams) {
    var proj_id = params.projectId;
    var dgr_id = params._id;
    var type_id = params.diagramTypeId;
    var version_id = params.versionId;

    this.register('Diagram_Types', Meteor.subscribe('Diagram_Types', {
                            id: dgr_id, projectId: proj_id, versionId: version_id,
                            diagramTypeId: type_id}));

    this.register('Diagram_Palette_ElementType', Meteor.subscribe("Diagram_Palette_ElementType", {
                          id: dgr_id, projectId: proj_id, versionId: version_id,
                          diagramTypeId: type_id}));

    this.register('Diagram_Locker', Meteor.subscribe("Diagram_Locker", {projectId: proj_id,
                                                                        diagramId: dgr_id,
                                                                        versionId: version_id,
                                                                      }));
  },

  action(params, queryParams) {
    if (queryParams.plain) {
      Session.set("plain", {showPlain: "inline", showDiagram: "none",});
    }
    else {
      Session.set("plain", {showPlain: "none", showDiagram: "inline",});
    }

    var proj_id = params.projectId;
    var dgr_id = params._id;
    var type_id = params.diagramTypeId;
    var version_id = params.versionId;

  //sets panel item to activate
    // Session.set("activePanelItem", "diagrams");

    console.log("params ", params)

    // if (params.editMode) {
        // console.log("in set edit mode")

    Session.set("editMode", true);
    Session.set("edited", true);
    // }
    // else {
    //     Session.set("editMode", reset_variable());
    // }

  //sets active diagram
    Session.set("activeDiagram", dgr_id);
    Session.set("diagramType", type_id);
    Session.set("activeProject", proj_id);
    Session.set("activeElement", reset_variable());

  //sets version id
    Session.set("versionId", version_id);

    BlazeLayout.render('publicDiagramLayout', {main: 'publicDiagramTemplate'});
  },
});





 // this.route('diagram', {
 //      path: '/project/:projectId/diagram/:_id/type/:diagramTypeId/version/:versionId/:editMode?',
 //      template: "diagramTemplate",
 //      layoutTemplate: "mainLayout",
 //      yieldTemplates: {
 //          'diagramRibbon': {to: 'ribbon'},
 //      },

 //      onAfterAction: function() {
 //          var proj_id = this.params.projectId;
 //          var dgr_id = this.params._id;
 //          var type_id = this.params.diagramTypeId;
 //          var version_id = this.params.versionId;

 //          Deps.autorun(function () {
 //              Meteor.subscribe("Document_Sections", Session.get("documentSections"));
 //          });

 //          // Meteor.subscribe("ElementsSections_Sections", {
 //          //                                       diagramId: dgr_id, projectId: proj_id,
 //          //                                       versionId: version_id});

 //          Meteor.subscribe("ProjectsGroups", {projectId: proj_id});

 //          //loading posts dynamically depending on the limit value
 //          Deps.autorun(function () {
 //              Meteor.subscribe("DiagramLogs", Session.get("logs"));
 //          });

 //      },

 //      waitOn: function() {

 //        if (this.params.query.plain) {
 //          Session.set("plain", {showPlain: "inline", showDiagram: "none",});
 //        }
 //        else {
 //          Session.set("plain", {showPlain: "none", showDiagram: "inline",});
 //        }

 //        var proj_id = this.params.projectId;
 //        var dgr_id = this.params._id;
 //        var type_id = this.params.diagramTypeId;
 //        var version_id = this.params.versionId;

 //      //sets panel item to activate
 //        Session.set("activePanelItem", "diagrams");

 //        if (this.params.editMode) {
 //            Session.set("editMode", true);
 //            Session.set("edited", true);
 //        }
 //        else {
 //            Session.set("editMode", reset_variable());
 //        }

 //      //sets active diagram
 //        Session.set("activeDiagram", dgr_id);
 //        Session.set("diagramType", type_id);
 //        Session.set("activeElement", reset_variable());

 //      //sets version id
 //        Session.set("versionId", version_id);

 //        //reseting the editor
 //        // var stage = Interpreter.editor;
 //        // if (stage)
 //        //   stage["edit"] = reset_variable();

 //        return [

 //            Meteor.subscribe("Diagram_Types", {
 //                            id: dgr_id, projectId: proj_id, versionId: version_id,
 //                            diagramTypeId: type_id}),

 //            Meteor.subscribe("Diagram_Palette_ElementType", {
 //                          id: dgr_id, projectId: proj_id, versionId: version_id,
 //                          diagramTypeId: type_id}),

 //            Meteor.subscribe("Diagram_Locker", {projectId: proj_id,
 //                                              diagramId: dgr_id,
 //                                              versionId: version_id,
 //                                            }),
 //        ];

 //      },

 //  });








FlowRouter.route('/project/:projectId/users', {
  name: 'users',
  waitOn() {
    // return import('/client/js/platform/configurator/configurator.js');
  },

  subscriptions: function(params, queryParams) {
    // this.register('Tools', Meteor.subscribe('Tools', {}));

    var proj_id = params.projectId;

    this.register('ProjectsUsers_Users', Meteor.subscribe('ProjectsUsers_Users', {projectId: proj_id}));
    this.register('ProjectsGroups', Meteor.subscribe('ProjectsGroups', {projectId: proj_id}));


    var self = this;

    // //subscribes for project users
    Deps.autorun(function () {

    //     //subscribes for the users
    //     Meteor.subscribe("SearchNewProjectUsers", Session.get("searchUsers"));
          self.register('SearchNewProjectUsers', Meteor.subscribe('SearchNewProjectUsers', Session.get("searchUsers")));


    //     //subscribes for the searched phrases for search bar drop-down
    //     Meteor.subscribe("UserSearches", Session.get("usersSearch"));
          self.register('UserSearches', Meteor.subscribe('UserSearches', Session.get("usersSearch")));

    });




    // //subscribes for project users
    // Deps.autorun(function () {

    //     //subscribes for the users
    //     Meteor.subscribe("SearchNewProjectUsers", Session.get("searchUsers"));

    //     //subscribes for the searched phrases for search bar drop-down
    //     Meteor.subscribe("UserSearches", Session.get("usersSearch"));
    // });

  },

  action() {
    Session.set("activePanelItem", "users");
    BlazeLayout.render('mainLayout', {main: 'usersTemplate', ribbon: 'usersRibbon'});
  },
});


  // this.route('users', {
  //     path: '/project/:projectId/users',
  //     template: "usersTemplate",
  //     layoutTemplate: "mainLayout",
  //     yieldTemplates: {
  //         'usersRibbon': {to: 'ribbon'},
  //     },
  //     waitOn: function() {
  //         var proj_id = this.params.projectId;

  //       //sets panel item to activate
  //         Session.set("activePanelItem", "users");

  //         //subscribes for project users
  //         Deps.autorun(function () {

  //             //subscribes for the users
  //             Meteor.subscribe("SearchNewProjectUsers", Session.get("searchUsers"));

  //             //subscribes for the searched phrases for search bar drop-down
  //             Meteor.subscribe("UserSearches", Session.get("usersSearch"));
  //         });

  //         return [
  //             Meteor.subscribe("ProjectsUsers_Users", {projectId: proj_id}),
  //             Meteor.subscribe("ProjectsGroups", {projectId: proj_id}),
  //         ];
  //     },

  //     onStop: function() {
  //         Session.set("searchUsers", reset_variable());
  //         Session.set("membersFilter", reset_variable());
  //         Session.set("members", reset_variable());
  //         Session.set("tableView", reset_variable());
  //     },

  // });







FlowRouter.route('/configurator', {
  name: 'configurator',
  waitOn() {
    return import('/client/js/platform/configurator/configurator.js');
  },

  subscriptions: function(params, queryParams) {
    this.register('Tools', Meteor.subscribe('Tools', {}));
  },

  action() {
    Session.set("activePanelItem", "configurator");
    BlazeLayout.render('mainLayout', {main: 'configuratorTemplate', ribbon: 'configuratorRibbon'});
  },
});



FlowRouter.route('/tool/:toolId/version/:versionId/diagram/:_id/diagramType/:diagramTypeId', {
  name: 'configuratorDiagram',
  waitOn() {
    // return import('/client/js/platform/configurator/configurator.js');
  },

  subscriptions: function(params, queryParams) {
    var tool_id = params.toolId;
    var diagram_id = params._id;
    var version_id = params.versionId;
    var diagram_type_id = params.diagramTypeId;

    this.register("ConfiguratorDiagram", Meteor.subscribe("ConfiguratorDiagram", {
                                                            diagramId: diagram_id,
                                                            toolId: tool_id,
                                                            versionId: version_id,
                                                            diagramTypeId: diagram_type_id,
                                                        },
                  function() {
                    var diagram_type = DiagramTypes.findOne({diagramId: diagram_id});
                    if (diagram_type) {
                        Session.set("targetDiagramType", diagram_type["_id"]);
                    }
                  })
          );

    this.register("ConfiguratorDiagramTypes", Meteor.subscribe("ConfiguratorDiagramTypes", {
                                                                diagramId: diagram_id,
                                                                toolId: tool_id,
                                                                versionId: version_id,
                                                                diagramTypeId: diagram_type_id,
                                                            }));
  },

  action(params, queryParams) {
    var tool_id = params.toolId;
    var diagram_id = params._id;
    var version_id = params.versionId;
    var diagram_type_id = params.diagramTypeId;

  //sets panel item to activate
    Session.set("activePanelItem", "configurator");
    Session.set("editMode", true);
    Session.set("edited", true);
    Session.set("activeElement", reset_variable());

    Session.set("activeDiagram", diagram_id);
    Session.set("toolId", tool_id);

    Session.set("toolVersionId", version_id);
    Session.set("diagramType", diagram_type_id);

    BlazeLayout.render('mainLayout', {main: 'configuratorDiagramTemplate', ribbon: 'diagramRibbon'});
  },
});


FlowRouter.route('/tool/:_id/:versionId?', {
  name: 'tool',
  waitOn() {
    // return import('/client/js/platform/configurator/configurator.js');
  },

  subscriptions: function(params, queryParams) {
    this.register('ToolVersions_Diagrams_DiagramTypes', Meteor.subscribe('ToolVersions_Diagrams_DiagramTypes', {toolId: params["_id"], versionId: params["versionId"]}));
  },

  action(params, queryParams) {
    Session.set("activePanelItem", "configurator");

    var tool_id = params._id;
    Session.set("toolId", tool_id);

    var version_id = params.versionId;
    if (version_id)
      Session.set("toolVersionId", version_id);
    else
      Session.set("toolVersionId", reset_variable());

    BlazeLayout.render('mainLayout', {main: 'toolTemplate', ribbon: 'toolRibbon'});
  },
});


FlowRouter.route('/profile', {
  name: 'profile',
  waitOn() {
    // return import('/client/js/platform/configurator/configurator.js');
  },

  subscriptions: function(params, queryParams) {
    this.register('Notifications', Meteor.subscribe('Notifications', {}));
  },

  action(params, queryParams) {
    Session.set("activePanelItem", reset_variable());
    BlazeLayout.render('mainLayoutWithHeader', {main: 'profile', ribbon: 'profileRibbon', header: 'profileHeader'});
  },
});


FlowRouter.route('/dump/tool/:tool_id', {
  name: 'dump',
  waitOn() {
    // return import('/client/js/platform/configurator/configurator.js');
  },

  action(params, queryParams) {
    var tool_id = params.tool_id;
    Session.set("toolId", tool_id);

    BlazeLayout.render('dump');
  },
});


// Create 404 route (catch-all)
FlowRouter.route('*', {
  action() {
    // Show 404 error page using Blaze
    this.render('notFound');

    // Can be used with BlazeLayout,
    // and ReactLayout for React-based apps
  }
});