[![License](http://img.shields.io/:license-mit-blue.svg)](https://raw.githubusercontent.com/LUMII-Syslab/viziquer/master/LICENSE)
# ViziQuer

The aim of the ViziQuer project is to provide visual/diagrammatic environment for ontology-based data query definition and execution.

See http://viziquer.lumii.lv for the tool description.


## Installation

You can choose between running ViziQuer locally (from source) and running ViziQuer within a Docker environment

### To setup ViziQuer locally

1. Download and install _Meteor_ framework, follow instructions: https://www.meteor.com/install
1. Create a directory for ViziQuer on your computer and then perform git clone for this repository
1. To run Meteor, type `meteor` in the ViziQuer directory.
 To run on a specific port, type, for example, `meteor --port 4000`.
1. Open browser and type `localhost:3000` (default port: 3000) or with the specified port `localhost:4000`

### To run ViziQuer within a Docker environment on MacOs or Linux

1. Download, install and start Docker: https://docs.docker.com/install/
1. Start the tool by `docker-compose -f docker-compose-public.yml up`.
1. Open browser and type `localhost:80`.

### To run ViziQuer within a Docker environment on Windows

1. Download, install and start Docker: https://docs.docker.com/install/
1. Create a volume for Mongo DB before the first use: `docker volume create --name=vqdata` (to avoid issues of Mongo DB not working from a shared Windows folder).
1. Start the tool by `docker-compose -f docker-compose-windows.yml up`.
1. Open browser and type `localhost:80`.

## Configuration for the first use

1. The first user that signs up to the tool instance shall get administrator rights (the rights to manage tool configurations)
1. (Not necessary since 0.2.4) To create a tool and load ViziQuer configuration, go to Configurator (in panel on left) and create a tool, for example, ViziQuer and then click button _Import_.
   Then choose the VQ tool configuration file (e.g. `vq_configuration_dump_vnn.json`) to upload from `./jsons` directory.
   Since version 0.2.4, the tool configuration is loaded automatically from `jsons/VQ_configuration_latest.json`.
