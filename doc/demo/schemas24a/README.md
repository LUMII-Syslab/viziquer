# A Method and a Library for Visual Data Schemas

We provide the data set and other supporting material for 
[a demonstration at ESWC'2024 conference](https://2024.eswc-conferences.org/wp-content/uploads/2024/05/77770246.pdf), 
with [official publication at Springer](https://link.springer.com/chapter/10.1007/978-3-031-78952-6_37).

This includes a set of both data schemas and their visual presentations for 44 selected data sets from LOD data cloud and other related resources.

Consider the `schemas` folder for the data schemas in .SVG format and `database` folder for the schema database definitions.

The schemas can be accessed also from [ViziQuer Playground](https://viziquer.app) (free sign-up required), where the schema visualization can be performed either by 
the [original external visualizer](https://github.com/LUMII-Syslab/dss-schema-explorer), or by a newer in-tool visualization module. The general tool description is at 
[ViziQuer main page](https://viziquer.lumii.lv) and [its GitHub wiki](https://github.com/LUMII-Syslab/viziquer/wiki), 

The schema database can be loaded into the database of [ViziQuer Tools](https://github.com/LUMII-Syslab/viziquer-tools) environment, as well.

## Acknowledgements

The Method and Library for Visual Data Schemas has been developed at [Institute of Mathematics and Computer Science, University of Latvia](https://lumii.lv) 
with support from Latvian Science Council grant lzp-2021/1-0389 "Visual Queries in Distributed Knowledge Graphs".

Please cite the paper as: Lāce, L., Romāne, A., Fedotova, J., Grasmanis, M., Čerāns, K. (2025). 
A Method and a Library for Visual Data Schemas. In: Meroño Peñuela, A., et al. The Semantic Web: ESWC 2024 Satellite Events. ESWC 2024. 
Lecture Notes in Computer Science, vol 15344., pp.254-258. Springer, Cham. https://doi.org/10.1007/978-3-031-78952-6_37

## Schema Visualization Pipeline

In what follows, we describe the process of obtaining and using the provided data set. 
The `Schema Visualization` section explains the possibilities that apply to creating new diagrams for the existing schemata.

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

3. Open the project, click on the 'Data Schema' button, then choose the visualization parameters.

4. New! Create a schema diagram within the visual tool itself (the diagram is created and need to be clicked on to open). Choose 'Layout as Graph' from the context menu, then adjust the visual positioning of items.

5. Alternatively, export the schema diagram and follow the instructions given on https://github.com/LUMII-Syslab/dss-schema-explorer 
(installation of the Schema Explorer tool, generating the data in ViziQuer and copying them from ViziQuer to the Schema Explorer). 
`MS Windows` is required for this step, if the external visualization is chosen (alternatively, use in-tool visualization, as described in the previous step).

## Schema Visualization Experiment

The schema visualization experiment description and results involves the following folders and files:

- `schemas`: a folder with visual schema diagrams in .SVG format
- `database`: Enriched with new endpoint schemas! The DSS (schema server) database supporting the visual queries and schemas over the example SPARQL endpoints (the database is to be loaded into a PostGres server, pointed to from the DSS).
- `sparql_endpoints.xls`: the selection of the considered endpoints and their analysis
- `protocol.pdf`: a description of the work done within the schema visualization experiment

A sample environment with the experiment schemas loaded is available at https://schemas24a.viziquer.app
