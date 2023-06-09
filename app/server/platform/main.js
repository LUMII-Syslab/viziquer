import { Meteor } from 'meteor/meteor'
import { CompartmentTypes } from '/libs/platform/collections'


// import
import '/server/platform/import/import_ajoo_configuration'
import '/server/platform/import/import_TDA_configuration'


// server methods
import '/server/platform/user_account';
import '/server/platform/settings';
import '/server/platform/toolVersions';

import '/server/platform/methods/project/projects'
import '/server/platform/methods/project/project_users'

import '/server/platform/methods/diagrams/diagrams'
import '/server/platform/methods/diagrams/elements'
import '/server/platform/methods/diagrams/compartments'
import '/server/platform/methods/diagrams/diagrams_sections'
import '/server/platform/methods/diagrams/elements_sections'

import '/server/platform/methods/chat/chats'
import '/server/platform/methods/feed/posts'
import '/server/platform/methods/forum/forum'
import '/server/platform/methods/notifications/notifications'
import '/server/platform/methods/search/searches'
import '/server/platform/methods/users/projects_groups'
import '/server/platform/methods/versions/versions'


// configurator
import '/server/platform/methods/configurator/tools'
import '/server/platform/methods/configurator/diagram_types'
import '/server/platform/methods/configurator/element_types'
import '/server/platform/methods/configurator/compartment_types'
import '/server/platform/methods/configurator/dialog_tabs'
import '/server/platform/methods/configurator/documentTypes'


// publish
import '/server/platform/publish/publish_configurator_data'
import '/server/platform/publish/publish_data_analytics'
import '/server/platform/publish/publish_project_data'
import '/server/platform/publish/publish_user_data'


// server custom
import '/server/custom/convertJson2CSV'
import '/server/custom/download_upload_project'
import '/server/custom/execute_sparql'
import '/server/custom/export_configruation'
import '/server/custom/generate_query_from_SPARQL'
import '/server/custom/ontology'
import '/server/custom/publish'
import '/server/custom/version_migration'
import '/server/custom/ontologyParams'


// libs custom
import '/libs/custom/collections'
import '/libs/custom/mytest'
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
                _.extend(list, this.queryParams);

                let diagram = Meteor.call("addPublicDiagram", list);

                let url = "/public/project/" + diagram.projectId + "/diagram/" + diagram._id + "/type/" + diagram.diagramTypeId + "/version/" + diagram.versionId;

                return {
                    statusCode: 200,
                    response: {url: url,}
                };
            }
        }
    });

    console.log("End startup");
});
