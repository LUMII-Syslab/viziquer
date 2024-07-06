# Towards Visual Federated SPARQL Queries

We provide the supporting material for a submission of a demo paper to the Semantics'2024 conference.

Consult the main page of the ViziQuer tool (https://viziquer.lumii.lv) for further information about it.

[ViziQuer wiki](https://github.com/LUMII-Syslab/viziquer/wiki) contains additional information on installing and using ViziQuer.

The star_wars_example.json file contains the example project information and can be loaded into the visual tool project also after the project creation. To do this, press the Upload Project icon at the top of the ViziQuer project diagrams view.

## Running the demo in ViziQuer Playground

The ViziQuer Playground available at https://viziquer.app contains a list of data schemas, including the StarWars data schema, as well as schemas for Wikidata and DBPedia, and can be used for repeating the experiments described in the paper.

After opening https://viziquer.app, register a user (anonymous e-mail formatted usernames are accepted), then proceed to create a new project (use the 'Initialize by the StarWars example project' option from the project creation dialogue).

The process for exploring pre-defined ViziQuer projects such as this demo is described in [Exploring ViziQuer Projects](https://github.com/LUMII-Syslab/viziquer/wiki/Exploring-ViziQuer-Projects).

## Schema Visualization

Within a project environment, activate the `Data Schema` button. Then choose the intial class and property lists and switch to the tab `Class Merging parameters` to choose the options for configuring the class merging strength and other visualization parameters.

Resulting data schema visualization:

![StarWars data schema visualization](data_schema.png)

## (Federated) Visual Queries

ToDo: The visual query creation is described in ..

ToDo: Describe specifics for federated visual query creation

StarWars federated visual query examples:
![StarWars visual query examples](visual_queries.png)

## Local ViziQuer Tool Suite installation

The ViziQuer tool suite consists of the ViziQuer visual query environment itself and the Data Shape Server (DSS) for serving data schemas to ViziQuer. DSS stores its data in a PostgreSQL database which also needs to be present.

Data schemas are collected from SPARQL servers using the OBIS Schema Extractor tool.

See also the wiki page on [Local Installation of ViziQuer](https://github.com/LUMII-Syslab/viziquer/wiki/Local-Installation).

### ViziQuer

Follow the instructions from https://github.com/LUMII-Syslab/viziquer

### Data Shape server

1. Install / setup the Data Shape Server (DSS): https://github.com/LUMII-Syslab/data-shape-server

This includes setting up a Postgres server with a respective database. The folder `database` contains a (large) dump of the ViziQuer Playground database that can be used to initialize the locally installed Postgres server with a data suitable for the use in the visual tool.
This database can be used for storing further imported data schemas, as well.

2. Instructions and software for importing the data schema is in https://github.com/LUMII-Syslab/data-shape-server/tree/main/import-generic
(the schemas from OBIS Schema Explorer are expected).

### OBIS Schema Explorer

The schema extraction is performed by the OBIS Schema Extractor tool (https://github.com/LUMII-Syslab/OBIS-SchemaExtractor).
Use Services V2. 

To install and run, follow the (simple) instructions from the tool's GitHub repository.

The schema extractor calculates class-to-property relations, as well as other schema aspects, if instructed so by the parameters (to be entered in the swagger environment). 
Some hints regarding the parameter usage:

- `calculateSubclassRelations`: recommended to enable to obtain the subclassing hierarchy
- `calculateMultipleInheritanceSubclasses`: recommended to enable on endpoints with small class sizes
- `calculatePropertyPropertyRelations`: provides finer-grained code completion; not essential for schema drawing
- `calculateSourceAndTargetPairs`: can provide further statistics in data schemas 
- `calculateDomainsAndRanges`: recommended for both code completion and schema information
- `calculateImportanceIndexes`: important for property placement in schema at the most relevant class
- `calculateClosedClassSets`: can be skipped; potential for use in SHACL shape generation (not supported currently)
- `calculateCardinalitiesMode`: how detailed cardinality information is to be collected (currently not essential for schemas)
- `calculateDataTypes`: how detailed cardinality information is to be collected (currently not essential for schemas)
- `sampleLimitForDataTypeCalculation`: sample size for data type estimates (place a small number, e.g. 100000 to avoid delays on larger schemas)
- `sampleLimitForPropertyClassRelationCalculation`: ignore
- `sampleLimitForPropertyToPropertyRelationCalculation`: ignore
- `checkInstanceNamespaces`: used in advanced query environment tuning, can be set to false
- `addedLabels`: keep default (can be used in advanced query environment tuning)
- `minimalAnalyzedClassSize`: for very large data sets can restrict the detailed analysis of smaller classes
- `addIntersectionClasses`: possibility to include information about the class intersection in the data schema (currently not further utilized)
- `exactCountCalculations`: use DISTINCT operator in queries; more precise statistics, but can be slower (recommendation: false)
- `excludedNamespaces`: recommended to add http://www.openlinksw.com/schemas/virtrdf# (to avoid collecting Virtuoso system classes)
