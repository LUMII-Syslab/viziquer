

Router.configure({
    waitOn: function () {
        var user = Meteor.user();
        if (user) {
            var system_id = user["_id"];
            Session.set("userSystemId", system_id);

            var user = Users.findOne({systemId: system_id});
            if (user) {

                var proj_id = user["activeProject"];
                Session.set("activeProject", proj_id);
                Session.set("versionId", user["activeVersion"]);

                Meteor.subscribe('navbar_projects', {projectId: proj_id});

                var lang = user["language"];
                if (!lang)
                  lang = "en";

                TAPi18n.setLanguage(lang);

                //starting monitoring user status if it hasn't started for some reason
                if (!UserStatus.isMonitoring())
                  UserStatus.startMonitor();
            }

            else {

                //stopping monitoring user events if there it hasn't stopped for some reason
                if (UserStatus.isMonitoring())
                  UserStatus.stopMonitor();
            }

            Meteor.subscribe('navbar_user', {});
            Meteor.subscribe('Notifications', {limit: 6});
            // Meteor.subscribe('Chats', {unseen: true});
        }
    },

    notFoundTemplate: 'notFound',

});


Router.map( function () {


//these are homepage routes

//home
  this.route('index', {
      path: '/',
      template: "index",
  });


//these are system routes


//register
  this.route('signup', {
      path: '/signup',
      template: "signup",
  });


  this.route('enrollAccount', {
    path: '/enroll-account/:token',
    template: "enrollAccountTemplate",

    waitOn: function() {
        var token = this.params.token;
        Session.set("token", token);
    },
  });

  this.route('enroll', {
    path: '/verify-email/:token',
    template: "enrollTemplate",

    waitOn: function() {
      // Meteor.logout();

        var token = this.params.token;
        Session.set("token", token);

        //this.next();
    },
  });

  this.route('resetPasswordPage', {
    path: '/reset-password-page',
    template: "resetPasswordPageTemplate",
  });

  this.route('resetPassword', {
    path: '/reset-password/:token',
    template: "resetPasswordTemplate",

    waitOn: function() {

      //Meteor.logout();

      var token = this.params.token;
      Session.set("token", token);
    },
  });

  this.route('goToEmail', {
    path: '/go-to-your-email',
    template: "goToEmailTemplate",
  });


//project routes
  this.route('structure', {
      path: '/structure',
      template: "structureTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'structureRibbon': {to: 'ribbon'},
      },

      waitOn: function() {

        //sets panel item to activate
          Session.set("activePanelItem", "structure");

          Meteor.subscribe("Structure_Tools", {});
      },

      onStop: function() {
          Session.set("activePost", reset_variable());
          Session.set("editPostId", reset_variable());
      },

  });

  this.route('project', {
      path: '/project/:projectId',
      template: "projectTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'projectRibbon': {to: 'ribbon'},
      },

      waitOn: function() {
        //sets panel item to activate
          Session.set("activePanelItem", "feed");

          var proj_id = this.params.projectId;

          Session.set("posts", {projectId: proj_id, limit: 50});

          //loading posts dynamically depending on the limit value
          Deps.autorun(function () {
            Meteor.subscribe("Posts_Users", Session.get("posts"));
          });

         return [Meteor.subscribe("postsCount", {projectId: proj_id})];
      },

      onStop: function() {
          Session.set("activePost", reset_variable());
          Session.set("editPostId", reset_variable());
      },

  });

//diagram routes
  this.route('diagrams', {
      path: '/project/:projectId/version/:versionId/diagrams/:phrase?',
      template: "diagramsTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'diagramsRibbon': {to: 'ribbon'},
      },

      waitOn: function() {
        //sets panel item to activate
          Session.set("activePanelItem", "diagrams");

          Session.set("sortBy", {name: 1});

          var proj_id = this.params.projectId;
          var version_id = this.params.versionId;
          Session.set("versionId", version_id);

          var diagrams_query = {projectId: proj_id, versionId: version_id};
          var phrase = this.params.phrase;
          if (phrase)
              diagrams_query["text"] = phrase;

          Session.set("diagrams", diagrams_query);

          Meteor.subscribe("Diagrams", Session.get("diagrams"));
          Meteor.subscribe("FoundDiagrams", Session.get("diagrams"));

          Meteor.subscribe("DiagramTypes_UserVersionSettings", {projectId: proj_id, versionId: version_id});

          Meteor.subscribe("ProjectsGroups", {projectId: proj_id}),

          //searching suggestions
          Deps.autorun(function () {
              Meteor.subscribe("Searches", Session.get("diagramsSearch"));
          });
      },

      onStop: function() {
         var no_query = Utilities.resetQuery();
         Session.set("diagrams", no_query);
         Session.set("sortBy", reset_variable());
      },
  });

  this.route('diagram', {
      path: '/project/:projectId/diagram/:_id/type/:diagramTypeId/version/:versionId/:editMode?',
      template: "diagramTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'diagramRibbon': {to: 'ribbon'},
      },

      onAfterAction: function() {
          var proj_id = this.params.projectId;
          var dgr_id = this.params._id;
          var type_id = this.params.diagramTypeId;
          var version_id = this.params.versionId;

          Deps.autorun(function () {
              Meteor.subscribe("Document_Sections", Session.get("documentSections"));
          });

          // Meteor.subscribe("ElementsSections_Sections", {
          //                                       diagramId: dgr_id, projectId: proj_id,
          //                                       versionId: version_id});

          Meteor.subscribe("ProjectsGroups", {projectId: proj_id});

          //loading posts dynamically depending on the limit value
          Deps.autorun(function () {
              Meteor.subscribe("DiagramLogs", Session.get("logs"));
          });

      },

      waitOn: function() {

        if (this.params.query.plain) {
          Session.set("plain", {showPlain: "inline", showDiagram: "none",});
        }
        else {
          Session.set("plain", {showPlain: "none", showDiagram: "inline",});
        }

        var proj_id = this.params.projectId;
        var dgr_id = this.params._id;
        var type_id = this.params.diagramTypeId;
        var version_id = this.params.versionId;

      //sets panel item to activate
        Session.set("activePanelItem", "diagrams");

        if (this.params.editMode) {
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

        //reseting the editor
        // var stage = Interpreter.editor;
        // if (stage)
        //   stage["edit"] = reset_variable();

        return [

            Meteor.subscribe("Diagram_Types", {
                            id: dgr_id, projectId: proj_id, versionId: version_id,
                            diagramTypeId: type_id}),

            Meteor.subscribe("Diagram_Palette_ElementType", {
                          id: dgr_id, projectId: proj_id, versionId: version_id,
                          diagramTypeId: type_id}),

            Meteor.subscribe("Diagram_Locker", {projectId: proj_id,
                                              diagramId: dgr_id,
                                              versionId: version_id,
                                            }),
        ];

      },

  });

// // no diagram route
// this.route('plain', {
//     path: 'plain/project/:projectId/diagram/:_id/type/:diagramTypeId/version/:versionId/',
//     template: "noDiagramTemplate",
//     layoutTemplate: "mainLayout",
//     yieldTemplates: {
//         'diagramRibbon': {to: 'ribbon'},
//     },

//     onAfterAction: function() {
//         var proj_id = this.params.projectId;
//         var dgr_id = this.params._id;
//         var type_id = this.params.diagramTypeId;
//         var version_id = this.params.versionId;

//         Deps.autorun(function () {
//             Meteor.subscribe("Document_Sections", Session.get("documentSections"));
//         });

//         // Meteor.subscribe("ElementsSections_Sections", {
//         //                                       diagramId: dgr_id, projectId: proj_id,
//         //                                       versionId: version_id});

//         Meteor.subscribe("ProjectsGroups", {projectId: proj_id});

//         //loading posts dynamically depending on the limit value
//         Deps.autorun(function () {
//             Meteor.subscribe("DiagramLogs", Session.get("logs"));
//         });


//     },

//     waitOn: function() {

//       var proj_id = this.params.projectId;
//       var dgr_id = this.params._id;
//       var type_id = this.params.diagramTypeId;
//       var version_id = this.params.versionId;


//     //sets panel item to activate
//       Session.set("activePanelItem", "diagrams");

//       Session.set("editMode", reset_variable());
//     //sets active diagram
//       Session.set("activeDiagram", dgr_id);
//       Session.set("diagramType", type_id);
//       Session.set("activeElement", reset_variable());

//     //sets version id
//       Session.set("versionId", version_id);

//       //reseting the editor
//       // var stage = Interpreter.editor;
//       // if (stage)
//       //   stage["edit"] = reset_variable();

//       return [

//           Meteor.subscribe("Diagram_Types", {
//                           id: dgr_id, projectId: proj_id, versionId: version_id,
//                           diagramTypeId: type_id}),

//           Meteor.subscribe("Diagram_Palette_ElementType", {
//                         id: dgr_id, projectId: proj_id, versionId: version_id,
//                         diagramTypeId: type_id}),

//           Meteor.subscribe("Diagram_Locker", {projectId: proj_id,
//                                             diagramId: dgr_id,
//                                             versionId: version_id,
//                                           }),
//       ];

//     },

// });

//user routes

  this.route('users', {
      path: '/project/:projectId/users',
      template: "usersTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'usersRibbon': {to: 'ribbon'},
      },
      waitOn: function() {
          var proj_id = this.params.projectId;

        //sets panel item to activate
          Session.set("activePanelItem", "users");

          //subscribes for project users
          Deps.autorun(function () {

              //subscribes for the users
              Meteor.subscribe("SearchNewProjectUsers", Session.get("searchUsers"));

              //subscribes for the searched phrases for search bar drop-down
              Meteor.subscribe("UserSearches", Session.get("usersSearch"));
          });

          return [
              Meteor.subscribe("ProjectsUsers_Users", {projectId: proj_id}),
              Meteor.subscribe("ProjectsGroups", {projectId: proj_id}),
          ];
      },

      onStop: function() {
          Session.set("searchUsers", reset_variable());
          Session.set("membersFilter", reset_variable());
          Session.set("members", reset_variable());
          Session.set("tableView", reset_variable());
      },

  });

  this.route('userProfile', {
      path: '/user-profile/:systemId',
      template: "userProfile",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'userProfileRibbon': {to: 'ribbon'},
      },
      waitOn: function() {

        //sets panel item to activate
          Session.set("activePanelItem", "users");

        //   var proj_id = this.params.projectId;
        //   var user_id = this.params.id;
        //   return [Meteor.subscribe("Users", {id: user_id})];
      },
      data: function() {
       //   var user_id = this.params.id;
          //return {users: Users.find({_id: user_id})};
      },
  });

  this.route('configurator', {
      path: '/configurator',
      template: "configuratorTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'configuratorRibbon': {to: 'ribbon'},
      },
      waitOn: function() {

        //sets panel item to activate
          Session.set("activePanelItem", "configurator");

          return Meteor.subscribe("Tools", {});
      },
  });

  this.route('tool', {
      path: '/tool/:_id/:versionId?',
      template: "toolTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'toolRibbon': {to: 'ribbon'},
      },
      waitOn: function() {

          //sets panel item to activate
          Session.set("activePanelItem", "configurator");

          var tool_id = this.params._id;
          Session.set("toolId", tool_id);

          var version_id = this.params.versionId;
          if (version_id)
            Session.set("toolVersionId", version_id);
          else
            Session.set("toolVersionId", reset_variable());

          return Meteor.subscribe("ToolVersions_Diagrams_DiagramTypes",
                                    {toolId: tool_id, versionId: version_id});
      },

      onStop: function() {
          var no_query = Utilities.resetQuery();

          Session.set("toolVersionId", reset_variable());
      },
  });


  this.route('configuratorDiagram', {
      path: '/tool/:toolId/version/:versionId/diagram/:_id/diagramType/:diagramTypeId',
      template: "configuratorDiagramTemplate",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'diagramRibbon': {to: 'ribbon'},
      },

      onAfterAction: function() {
          var tool_id = this.params.toolId;
          var diagram_id = this.params._id;
          var version_id = this.params.versionId;
          var diagram_type_id = this.params.diagramTypeId;

          Meteor.subscribe("ConfiguratorDiagramTypes", {
                                                        diagramId: diagram_id,
                                                        toolId: tool_id,
                                                        versionId: version_id,
                                                        diagramTypeId: diagram_type_id,
                                                    });
      },

      waitOn : function() {

          var tool_id = this.params.toolId;
          var diagram_id = this.params._id;
          var version_id = this.params.versionId;
          var diagram_type_id = this.params.diagramTypeId;

        //sets panel item to activate
          Session.set("activePanelItem", "configurator");
          Session.set("editMode", true);
          Session.set("edited", true);
          Session.set("activeElement", reset_variable());

          Session.set("activeDiagram", diagram_id);
          Session.set("toolId", tool_id);

          Session.set("toolVersionId", version_id);
          Session.set("diagramType", diagram_type_id);


          //Meteor.subscribe("elementsCount", {toolId: tool_id,
          //                                  diagramId: diagram_id,
          //                                   versionId: version_id});

          return [
            Meteor.subscribe("ConfiguratorDiagram", {
                                                    diagramId: diagram_id,
                                                    toolId: tool_id,
                                                    versionId: version_id,
                                                    diagramTypeId: diagram_type_id,
                                                },
              function() {
                var diagram_type = DiagramTypes.findOne({diagramId: diagram_id});
                if (diagram_type)
                    Session.set("targetDiagramType", diagram_type["_id"]);
              })
          ];
      },
  });


  this.route('archive', {
      path: '/project/:projectId/archive',
      template: "archiveTemplate",
      layoutTemplate: "mainLayoutWithoutRibbon",
      yieldTemplates: {
          'archiveRibbon': {to: 'ribbon'},
      },
      waitOn: function() {
          var proj_id = this.params.projectId;

        //sets panel item to activate
          Session.set("activePanelItem", "archive");

          return Meteor.subscribe("Versions", {projectId: proj_id});
      },

  });


//dashboard route

  this.route('analytics', {
      path: '/project/:projectId/analytics',
      template: "dashboardTemplate",
      layoutTemplate: "mainLayoutWithHeader",
      yieldTemplates: {
          'dashboardRibbon': {to: 'ribbon'},
          'dashboardHeader': {to: 'header'},
      },

      waitOn: function() {
          //sets panel item to activate
          Session.set("activePanelItem", "analytics");

      },

  });


//personal pages

//profile
  this.route('profile', {
      path: '/profile',
      template: "profile",
      layoutTemplate: "mainLayoutWithHeader",
      yieldTemplates: {
          'profileRibbon': {to: 'ribbon'},
          'profileHeader': {to: 'header'},
      },

      waitOn: function() {

        //sets panel item to activate
          Session.set("activePanelItem", reset_variable());

          Meteor.subscribe("Notifications", {});
      },

      onStop: function() {
          Session.set("lang", reset_variable());
      },

  });

//inbox
  this.route('noProject', {
      path: '/no-project',
      template: "noProject",
      layoutTemplate: "mainLayoutWithoutRibbon",

      waitOn: function() {
          return [];
      },
  });


//contacts
  this.route('contacts', {
      path: '/add-contacts',
      template: "addContacts",
      layoutTemplate: "mainLayoutWithoutRibbon",

      waitOn: function() {
          Meteor.subscribe("Contacts_Users", {});

          Deps.autorun(function () {

              //searching for the new users
              Meteor.subscribe("SearchNewContacts", Session.get("searchContacts"));

              //searching for suggestions
              Meteor.subscribe("ContactsSuggestions", Session.get("contactsSearches"));
          });
      },

      onStop: function() {
          Session.set("searchContacts", reset_variable());
      },

  });

  this.route('forum', {
      path: '/forum/:nr?/:tag?/:project?',
      template: "forum",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          'forumRibbon': {to: 'ribbon'},
      },
      waitOn: function() {

        Session.set("activePanelItem", "forum");

        var nr = this.params.nr;
        if (!nr)
          nr = 1;
        nr = Number(nr);

        var tag = this.params.tag;
        if (tag == "no-tag")
          tag = reset_variable();
        else
          tag = remove_hash_tag(tag);

        var proj_id = this.params.project;
        var project_ids = [];

        if (proj_id == "all-projects" || proj_id === undefined) {
          proj_id = reset_variable();

          project_ids = ProjectsUsers.find({userSystemId: Session.get("userSystemId")}).map(
            function(proj_user) {
                return proj_user["projectId"];
            });
        }

        else {
            Session.set("selectedProject", proj_id);
            project_ids.push(proj_id);
        }

        Session.set("tag", tag);
        Session.set("nr", nr);

        var posts_per_page = 7;
        Session.set("postsPerPage", posts_per_page);

        Meteor.subscribe("forumPostsCount", {tag: tag, projectIds: project_ids});

        return [
          Meteor.subscribe("Forum_Posts", {tag: tag, step: posts_per_page, nr: nr, projectId: proj_id}),
          Meteor.subscribe("Forum_Tags", {projectId: proj_id}),
        ];

      },

      onStop: function() {

          Session.set("tag", reset_variable());
          Session.set("nr", reset_variable());
          Session.set("selectedProject", reset_variable());
      },

  });

  this.route('forumPost', {
      path: '/forum-post/:_id/project/:projectId',
      template: "forumPost",
      layoutTemplate: "mainLayout",
      yieldTemplates: {
          //'userRibbon': {to: 'ribbon'},
      },
      waitOn: function() {

        Session.set("activePanelItem", "forum");

        var id = this.params._id;
        var proj_id = this.params.projectId;

        Session.set("forumPostId", id);
        Session.set("forumPostProjectId", proj_id);

        Meteor.subscribe("Forum_Posts", {postId: id, projectId: proj_id});
        Meteor.subscribe("Forum_PostComments", {postId: id, projectId: proj_id});
      },

      onStop: function() {
        Session.set("forumPostId", reset_variable());
        Session.set("forumPostProjectId", reset_variable());
      },

  });

  this.route('dump', {
      path: '/dump/tool/:tool_id',
      template: "dump",
      // layoutTemplate: "mainLayoutWithoutRibbon",

      waitOn: function() {

          var tool_id = this.params.tool_id;
          Session.set("toolId", tool_id);

          return [];
      },
  });


});
