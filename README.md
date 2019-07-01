[![License](http://img.shields.io/:license-mit-blue.svg)](https://raw.githubusercontent.com/LUMII-Syslab/viziquer/master/LICENSE)
# ViziQuer

The aim of the ViziQuer project is to provide visual/diagrammatic environment for ontology-based data query definition and execution.

See http://viziquer.lumii.lv for the tool description.


## Installation and Configuration

To setup ViziQuer

1. Download and install _Meteor_ framework, follow instructions: https://www.meteor.com/install
1. Create a directory for ViziQuer on your computer and then perform git clone for this repository
1. To run Meteor, type `meteor` in the ViziQuer directory.
 To run on a specific port, type, for example, `meteor --port 4000`.
1. Open browser and type `localhost:3000` (default port: 3000) or with the specified port `localhost:4000`
1. The first user that signs up to the tool instance shall have administrator rights (the rights to manage tool configurations)
1. To create a tool and load ViziQuer configuration, go to Configurator (in panel on left) and create a tool, for example, ViziQuer and then click button _Import_.
   Then choose the VQ tool configuration file (e.g. `vq_configuration_dump_vnn.json`) to upload from `./jsons` directory.

To run ViziQuer from a Docker environment

1. Download, install and start Docker: https://docs.docker.com/install/
1. On Linux or Mac, start `docker-compose -f docker-compose-public.yml up`. 
1. On Windows, create a volume for Mongo DB before the first use: `docker volume create --name=mongodata` (to avoid issues of Mongo DB not working from a shared Windows folder).
Then, every time before the container start, mount the volume: `docker run -d -p 27017:27017 -v mongodata:/data/db mongo`.
Start the container by `docker-compose -f docker-compose-windows.yml up`.
1. Open browser and type `localhost:80`.
1. Follow the instructions for the user sign-up, ViziQuer tool creation and configuration loading from the ViziQuer Setup description.