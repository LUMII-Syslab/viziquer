import { Meteor } from "meteor/meteor";

import path from "path";
import dotenv from "dotenv";

import express from "express";
import bodyParser from "body-parser";
// import { Meteor } from 'meteor/meteor';
import { WebApp } from "meteor/webapp";

import { CompartmentTypes } from "/imports/db/platform/collections";

// import
import "/imports/platform/server/import/import_ajoo_configuration";
import "/imports/platform/server/import/import_TDA_configuration";

// server methods
import "/imports/platform/server/user_account";
import "/imports/platform/server/settings";
import "/imports/platform/server/toolVersions";

import "/imports/platform/server/methods/project/projects";
import "/imports/platform/server/methods/project/project_users";

import "/imports/platform/server/methods/diagrams/diagrams";
import "/imports/platform/server/methods/diagrams/elements";
import "/imports/platform/server/methods/diagrams/compartments";
import "/imports/platform/server/methods/diagrams/diagrams_sections";
import "/imports/platform/server/methods/diagrams/elements_sections";

import "/imports/platform/server/methods/notifications/notifications";
import "/imports/platform/server/methods/search/searches";
import "/imports/platform/server/methods/users/projects_groups";
import "/imports/platform/server/methods/versions/versions";

// configurator
import "/imports/platform/server/methods/configurator/tools";
import "/imports/platform/server/methods/configurator/diagram_types";
import "/imports/platform/server/methods/configurator/element_types";
import "/imports/platform/server/methods/configurator/compartment_types";
import "/imports/platform/server/methods/configurator/dialog_tabs";
import "/imports/platform/server/methods/configurator/documentTypes";

// publish
import "/imports/platform/server/publish/publish_configurator_data";
import "/imports/platform/server/publish/publish_data_analytics";
import "/imports/platform/server/publish/publish_project_data";
import "/imports/platform/server/publish/publish_user_data";
import "/imports/platform/server/publish/publish_services";

// server custom
import "/imports/custom/vq/server/convertJson2CSV";
import "/imports/custom/vq/server/download_upload_project";
import "/imports/custom/vq/server/execute_sparql";
import "/imports/custom/vq/server/export_configruation";
import "/imports/custom/vq/server/generate_query_from_SPARQL";
import "/imports/custom/vq/server/version_migration";
import "/imports/custom/vq/server/ontologyParams";
import "/imports/custom/vq/server/import_ontology";
import "/imports/custom/vq/server/brp_standard_properties";


import "/imports/custom/owlgred/server/import_ontology";
import "/imports/custom/owlgred/server/OWLGrEdontologyParams";
import "/imports/custom/owlgred/server/OWLGrEdImportOntologyRDFlib";
import "/imports/custom/owlgred/server/parseOwl";
import "/imports/custom/owlgred/server/parseOwlImportOwlgred";

// libs custom
import "/imports/db/custom/vq/collections";
import "/imports/libs/custom/mytest";
// import '/libs/custom/ontologyParams'

Meteor.startup(async () => {
  console.log("Loading server");

  await Meteor.callAsync("importConfiguration");

  //adding captcha secret key
  // reCAPTCHA.config({privatekey: '6Le-uwkTAAAAAIH3amO6eRpcjRYJw50q1uef8phe'});

  //mail server settings
  // process.env.MAIL_URL = 'smtp://postmaster@sandbox3eb2756f94924ab0838893d4c969e4e8.mailgun.org:683dbf555c8b46b4ecfd3508c8f1da39@smtp.mailgun.org:587';
  // process.env.MAIL_URL = 'smtp://postmaster@viziquer.lumii.lv:46c1183101c042354b083dd2420bfe61@smtp.mailgun.org:587';

  // checking if CompartmentTypes contains attribute label
  const compart_type = await CompartmentTypes.findOneAsync({
    label: { $exists: false },
  });
  if (compart_type) {
    CompartmentTypes.find().forEachAsync(async function (compart_type) {
      await CompartmentTypes.updateAsync(
        { _id: compart_type._id },
        { $set: { label: compart_type.name } },
      );
    });
  }

  // if (Meteor.isServer) {
  // const path = Npm.require('path');
  // const dotenv = Npm.require('dotenv');
  const envFile = process.env.ENV_NAME ? `${process.env.ENV_NAME}.env` : ".env";

  let startFolder = process.cwd();
  let projectFolder = startFolder.slice(0, startFolder.indexOf(".meteor"));

  const envPath = path.resolve(projectFolder, envFile);
  console.log(`Looking for env in ${envPath}`);
  const env = dotenv.config({ path: envPath });
  if (env && env.parsed) {
    console.log("env loaded:", env.parsed);
  } else {
    console.log("no env found");
  }
  // console.log('Effective environment:', process.env);
  // }

  const app = express();
  app.use(bodyParser.json());

  app.post("/public-diagram", async (req, res) => {
    try {
      const list = req.body;

      // Call Meteor method asynchronously
      const diagram = await Meteor.callAsync("addPublicDiagram", list);

      const url = `/public/project/${diagram.projectId}/diagram/${diagram._id}/type/${diagram.diagramTypeId}/version/${diagram.versionId}`;

      res.status(200).json({ url });
    } catch (error) {
      console.error("Error in /public-diagram:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount it under /api
  WebApp.connectHandlers.use("/api", app);

  console.log("End startup");
});
