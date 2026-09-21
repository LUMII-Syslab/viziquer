[![License](http://img.shields.io/:license-mit-blue.svg)](https://raw.githubusercontent.com/LUMII-Syslab/viziquer/master/LICENSE)

This tool is based upon the `ajoo` platorm which is hosted (together with the `ViziQuer` tool) in the repository [platform](https://github.com/LUMII-Syslab/viziquer)

# OWLGrEd

OWLGrEd provides a graphical notation for OWL 2, based on UML class diagrams. OWL classes are typically visualized as UML classes, data properties as class attributes, object properties as association roles, individuals as objects, cardinality restrictions on association domain class as UML cardinalities, etc.
The UML class diagrams are enriched with new extension notations, e.g.:
- fields in classes for equivalent class, superclass and disjoint class expressions written in Manchester OWL syntax;
- fields in association roles and attributes for equivalent, disjoint and super properties and fields for property characteristics, e.g., functional, transitive, etc.;
- anonymous classes containing equivalent class expression but no name;
- connectors (as lines) for visualizing binary disjoint, equivalent, etc. axioms;
- boxes with connectors for n-ary disjoint, equivalent, etc. axioms;
- connectors (lines) for visualizing object property restrictions some, only, exactly, as well as cardinality restrictions.

See the [OWLGrEd wiki](https://github.com/LUMII-Syslab/owlgred/wiki) for more documentation.

Try visual ontology editing in the [OWLGrEd Playground](LINK).

## Acknowledgements

The OWLGrEd tool has been developed at [Institute of Mathematics and Computer Science, University of Latvia](https://lumii.lv) 
with support from activity 1.1.1.9 Research application No 1.1.1.9/LZP/1/24/037 of the Activity "Post-doctoral Research" "Visual methods and tools for ontology management".

## Installation

### To setup OWLGrEd locally

1. Download and install _Meteor_ framework, follow instructions: [https://www.meteor.com/install](https://docs.meteor.com/about/install.html)
1. Perform `git clone` for this repository.
1. Change to the `./owlgred/app` directory.
1. Execute the command `meteor npm ci` to install the required _node.js_ packages.
1. Now to run the OWLGrEd tool, type `meteor` in the OWLGrEd directory.
 To run on a specific port, type, for example, `meteor --port 4000`.
1. Open the web browser and type `localhost:3000` (default port: 3000) or with the specified port `localhost:4000`

### Configuration for the first use

- The first user that signs up to the tool instance shall get administrator rights (the rights to manage tool configurations)
