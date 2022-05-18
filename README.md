[![License](http://img.shields.io/:license-mit-blue.svg)](https://raw.githubusercontent.com/LUMII-Syslab/viziquer/master/LICENSE)
# ViziQuer

The aim of the ViziQuer project is to provide visual/diagrammatic environment for ontology-based data query definition and execution.

See http://viziquer.lumii.lv for the tool description.

## Context

For the use with the data shape server (DSS), the DSS server needs to be installed/accessible, as well (put the link in .env file, 
following the pattern given in sample.env).

See https://github.com/LUMII-Syslab/data-shape-server

The DSS shall need a link to a PostGres SQL database, holding the data schemas for the endpoints to be queried. 

The sample schemas are available and means for their creation are described at http://viziquer.lumii.lv

## Installation

You can choose between running ViziQuer locally (from source) and running ViziQuer within a Docker environment (upcoming for the DSS version)

### To setup ViziQuer locally

1. Download and install _Meteor_ framework, follow instructions: https://www.meteor.com/install
1. Create a directory for ViziQuer on your computer and then perform git clone for this repository
1. To run Meteor, type `meteor` in the ViziQuer directory.
 To run on a specific port, type, for example, `meteor --port 4000`.
1. Open browser and type `localhost:3000` (default port: 3000) or with the specified port `localhost:4000`



## Configuration for the first use

1. The first user that signs up to the tool instance shall get administrator rights (the rights to manage tool configurations)


## Docker Environment Notes (currently applies to ViziQuer/web classic only)

### To run ViziQuer within a Docker environment on MacOs or Linux

1. Download, install and start Docker: https://docs.docker.com/install/
1. Start the tool by `docker-compose -f docker-compose-public.yml up`.
1. Open browser and type `localhost:80`.

### To run ViziQuer within a Docker environment on Windows

1. Download, install and start Docker: https://docs.docker.com/install/
1. Create a volume for Mongo DB before the first use: `docker volume create --name=vqdata` (to avoid issues of Mongo DB not working from a shared Windows folder).
1. Start the tool by `docker-compose -f docker-compose-windows.yml up`.
1. Open browser and type `localhost:80`.