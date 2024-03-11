# A Method and a Library for Visual Data Schemas

We provide the supporting material for the submission of a demonstration to the ESWC'2024 conference.

Consider the `schemas` folder for the data schemas in .SVG format.


## Schema Visualization Pipeline

### Schema Extraction

The schema extraction is performed by the OBIS Schema Extractor tool (https://github.com/LUMII-Syslab/OBIS-SchemaExtractor).
Use Services V2. 

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

### Schema Storage

1. Install / setup the Data Shape Server (DSS): https://github.com/LUMII-Syslab/data-shape-server
This includes setting up a PostGres server with a respective database. A script for database reported in the paper is available in `database` folder. 
This database can be used for storing further imported data schemas, as well.

2. Instructions and software for importing the data schema is in https://github.com/LUMII-Syslab/data-shape-server/tree/main/import-generic

### Schema Visualization

1. Set up the ViziQuer tool: https://github.com/LUMII-Syslab/viziquer (point the `.env` file to the `DSS` created above).

2. Create a new project, choose the desired DSS schema in the project creation dialogue.

3. Open the project, create a query diagram. There shall be a class tree in the right hand pane. Click on the 'Extra' tab, then choose the visualization parameters.

4. Follow the instructions given on https://github.com/LUMII-Syslab/dss-schema-explorer 
(installation of the Schema Explorer tool, generating the data in ViziQuer and copying them from ViziQuer to the Schema Explorer).

`MS Windows` is currently required for the last step (visualization inside the web-based ViziQuer tool in a new diagram is work in progress).

## Schema Visualization Experiment

The schema visualization experiment description and results involves the following folders and files:

- `shemas`: a folder with visual schema diagrams in .SVG format
- `database`: the DSS (schema server) database supporting the visual queries and schemas over the example SPARQL endpoints (the database is to be loaded into a PostGres server, pointed to from the DSS).
- `sparql_endpoints.xls`: the selection of the considered endpoints and their analysis
- `protocol.pdf`: a description of the work done within the schema visualization experiment