[![License](http://img.shields.io/:license-mit-blue.svg)](https://raw.githubusercontent.com/LUMII-Syslab/viziquer/master/LICENSE)
# ViziQuer

The aim of the ViziQuer project is to provide visual/diagrammatic environment for ontology-based data query definition and execution.

See https://viziquer.lumii.lv for the tool description.

See the [ViziQuer wiki](https://github.com/LUMII-Syslab/viziquer/wiki) for information on getting started and using ViziQuer.

## Acknowledgements

The ViziQuer tool has been developed at Institute of Mathematics and Computer Science, University of Latvia, https://lumii.lv, 
with partial support from Latvian Science Council project lzp-2021/1-0389 "Visual Queries in Distributed Knowledge Graphs" (since 2022).

## Installation

You can choose between running ViziQuer locally (from source) and running ViziQuer within a Docker environment.

### To run ViziQuer in Docker

Go to the [ViziQuer Tools repository](https://github.com/LUMII-Syslab/viziquer-tools/) and follow the instructions there.

### To setup ViziQuer locally

1. Download and install _Meteor_ framework, follow instructions: https://www.meteor.com/install
1. Perform `git clone` for this repository.
1. Change to the `./viziquer/app` directory.
1. Execute the command `meteor npm ci` to install the required _node_ packages.
1. Now to run the ViziQuer tool, type `meteor` in the ViziQuer directory.
 To run on a specific port, type, for example, `meteor --port 4000`.
1. Open the web browser and type `localhost:3000` (default port: 3000) or with the specified port `localhost:4000`

### Configuration for the first use

- The first user that signs up to the tool instance shall get administrator rights (the rights to manage tool configurations)

## Context

For the use with the data shape server (DSS), the DSS server needs to be installed/accessible, as well (put the link in .env file, 
following the pattern given in sample.env).

See https://github.com/LUMII-Syslab/data-shape-server

The DSS shall need a link to a PostgreSQL database, holding the data schemas for the endpoints to be queried. 

The sample schemas are available; means for their creation are described at https://viziquer.lumii.lv
