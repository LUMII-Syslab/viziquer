import { Meteor } from 'meteor/meteor'
import { CompartmentTypes } from '/imports/db/platform/collections'


// import
import '/imports/server/platform/import/import_ajoo_configuration'
import '/imports/server/platform/import/import_TDA_configuration'


// server methods
import '/imports/server/platform/user_account';
import '/imports/server/platform/settings';
import '/imports/server/platform/toolVersions';

import '/imports/server/platform/methods/project/projects'
import '/imports/server/platform/methods/project/project_users'

import '/imports/server/platform/methods/diagrams/diagrams'
import '/imports/server/platform/methods/diagrams/elements'
import '/imports/server/platform/methods/diagrams/compartments'
import '/imports/server/platform/methods/diagrams/diagrams_sections'
import '/imports/server/platform/methods/diagrams/elements_sections'


import '/imports/server/platform/methods/chat/chats'
import '/imports/server/platform/methods/feed/posts'
import '/imports/server/platform/methods/forum/forum'
import '/imports/server/platform/methods/notifications/notifications'
import '/imports/server/platform/methods/search/searches'
import '/imports/server/platform/methods/users/projects_groups'
import '/imports/server/platform/methods/versions/versions'


// configurator
import '/imports/server/platform/methods/configurator/tools'
import '/imports/server/platform/methods/configurator/diagram_types'
import '/imports/server/platform/methods/configurator/element_types'
import '/imports/server/platform/methods/configurator/compartment_types'
import '/imports/server/platform/methods/configurator/dialog_tabs'
import '/imports/server/platform/methods/configurator/documentTypes'


// publish
import '/imports/server/platform/publish/publish_configurator_data'
import '/imports/server/platform/publish/publish_data_analytics'
import '/imports/server/platform/publish/publish_project_data'
import '/imports/server/platform/publish/publish_user_data'


// server custom
import '/imports/server/custom/vq/convertJson2CSV'
import '/imports/server/custom/vq/download_upload_project'
import '/imports/server/custom/vq/execute_sparql'
import '/imports/server/custom/vq/export_configruation'
import '/imports/server/custom/vq/generate_query_from_SPARQL'
import '/imports/server/custom/vq/ontology'
import '/imports/server/custom/vq/publish'
import '/imports/server/custom/vq/version_migration'
import '/imports/server/custom/vq/ontologyParams'
import '/imports/server/custom/vq/import_ontology'

// libs custom
import '/imports/db/custom/vq/collections'
import '/imports/libs/custom/mytest'
// import '/libs/custom/ontologyParams'


Meteor.startup(() => {  
    console.log("Loading server");

    Meteor.call("importConfiguration");

    //adding captcha secret key
     // reCAPTCHA.config({privatekey: '6Le-uwkTAAAAAIH3amO6eRpcjRYJw50q1uef8phe'});

      //mail server settings
      // process.env.MAIL_URL = 'smtp://postmaster@sandbox3eb2756f94924ab0838893d4c969e4e8.mailgun.org:683dbf555c8b46b4ecfd3508c8f1da39@smtp.mailgun.org:587';
      // process.env.MAIL_URL = 'smtp://postmaster@viziquer.lumii.lv:46c1183101c042354b083dd2420bfe61@smtp.mailgun.org:587';


    // checking if CompartmentTypes contains attribute label
    const compart_type = CompartmentTypes.findOne({label: { $exists: false }});
    if (compart_type) {
        CompartmentTypes.find().forEach(function(compart_type) {
            CompartmentTypes.update({_id: compart_type._id}, {$set: {label: compart_type.name,}});
        });
    }

    // if (Meteor.isServer) {
    const path = Npm.require('path');
    const dotenv = Npm.require('dotenv');
    const envFile = process.env.ENV_NAME ? `${process.env.ENV_NAME}.env` : '.env';

    let startFolder = process.cwd();
    let projectFolder = startFolder.slice(0, startFolder.indexOf('.meteor'));

    const envPath = path.resolve(projectFolder, envFile);
    console.log(`Looking for env in ${envPath}`);
    const env = dotenv.config({ path: envPath });
    if (env && env.parsed) {
        console.log('env loaded:', env.parsed)
    } else {
        console.log('no env found');
    }
    // }


    let Api = new Restivus({
        // useDefaultAuth: true,
        prettyJson: true
    });


    Api.addRoute('public-diagram', {}, {

        // get: function () {
        //     let list = {};
        //     _.extend(list, this.queryParams);

        //     let diagram = Meteor.call("addPublicDiagram", list);

        //     let url = "http://78.84.99.73:5000/public/project/" + diagram.projectId + "/diagram/" + diagram._id + "/type/" + diagram.diagramTypeId + "/version/" + diagram.versionId;

        //     return {
        //         statusCode: 200,
        //         headers: {
        //             'Content-Type': 'text/plain',
        //             'Location': url
        //         },
        //         body: 'Location: ' + url,
        //     };
        // },

        post: {
            action: function () {
                let list = {};
                // _.extend(list, this.queryParams);
                _.extend(list, this.bodyParams);

                let diagram = Meteor.call("addPublicDiagram", list);

                let url = "/public/project/" + diagram.projectId + "/diagram/" + diagram._id + "/type/" + diagram.diagramTypeId + "/version/" + diagram.versionId;

                return {
                    statusCode: 200,
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*',
                    },
                    // response: {url: url,},
                    body: { url }
                };
            }
        }
    });

    console.log("End startup");
});
