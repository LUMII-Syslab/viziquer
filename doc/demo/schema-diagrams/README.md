# Queries from schema diagrams in ViziQuer

We provide a walk-through demo for working with queries from schema diagrams in ViziQuer.

## ViziQuer: Introduction

[ViziQuer](https://viziquer.lumii.lv) is a web application for visual KG data schema presentation and building visual queries over the KG data.

We demonstrate the work with the application at [ViziQuer Playground](https://viziquer.app). 

There are ways of installing ViziQuer locally, e.g. as a part of the
[ViziQuer Tools]() container system, as well. 
The local installation currently is required, if you want to work with a data set not available on the [Playground](https://viziquer.app). 
The following walk-through applies to the locally created ViziQuer instances, as well (in the context of locally available data schemas).
 
Additional information on working with ViziQuer is in
[ViziQuer wiki](https://github.com/LUMII-Syslab/viziquer/wiki).

## Accessing ViziQuer

To access ViziQuer, creation of an account is needed, followed by a log in.

To create an account, open [the app page](https://viziquer.app) and press the `Sign up` button.

![01_FormOne](https://github.com/user-attachments/assets/0eadf982-c7fb-45ef-a107-ebb42b39b434)

In the opened dialogue, fill in the data. The fields need to be filled with some textual information. The e-mail field needs to be filled with some e-mail like string. The actual e-mail checking is not done. Then press the green `Sign up` button. 

![02_SignUp](https://github.com/user-attachments/assets/b4553ba1-225c-41d1-a6fc-fb4c7407a3a5)

This leads to the log in form, where the user name and password needs to be entered.

![03_LogIn](https://github.com/user-attachments/assets/b101bb5f-5848-4732-b613-ae87ba3f98f6)

After the log in, you are brought into the main view of the projects you have (initially empty).

## Creating and Accessing a Project
If you have projects created before, you can enter a project by clicking its icon.

To create a new project, in the project list view, press the 'New project window'.

![04_NewProject_Button](https://github.com/user-attachments/assets/eec3ba4b-e2ad-4753-b76a-cbf72286081a)

This opens a dialogue, where an installed project can be chosen as a seed for your new project, or an empty project, based on an installed data schema can be created (one can create also a project without an installed schema and specify the schema later).

### Starting from installed project
To reach the schema diagram functionality faster, we start from an installed project. For the demo purposes, select `Initialise by Nobel Prize sample project`.

![05_NewProject_NP_Saved](https://github.com/user-attachments/assets/877715fa-5bdb-43d2-9118-7033ed3f763c)

In this case, there is no need to provide the project name, or choose the DSS schema (these shall be provided automatically).

### Alternative ways for project creation
If there is no available sample project you want to start with, choose `Start empty project` and select an appropriate schema from the dropdown in the `DSS schema` field. 

For projects over the Nobel Prize data, choose `Nobel_Prize_Orig` as the schema. You may wish to explore projects over other installed schemas, as well.

Installation of a schema on the ViziQuer instance that you have created yourself is more technical and is described in [Local installation guide](https://github.com/LUMII-Syslab/viziquer/wiki/Local-Installation) on [ViziQuer wiki](https://github.com/LUMII-Syslab/viziquer/wiki).

## Working with Schema Diagrams
Upon entering a project, a list of its diagrams is available as (large) icons. 

There are two possible types of diagrams in a project: the schema diagrams and the query diagrams. The button `New diagram` is recommended for visual query diagrams. To create a new data schema diagram for the preloaded data schema, start with `Data schema` button, as explained later.

### Open an existing diagram
You can open an existing diagram (either a schema, or a query diagram) by a click on its icon.
For the demo, choose the diagram, named `DataSchema (Full) - Nobel_Prizes_Orig` (selecting any other schema diagram will lead you into a similar functionality).

![06a_SchemaDiagram_NP](https://github.com/user-attachments/assets/0f8f6669-5645-4f25-952a-6e67c5099247)

This leads you into a situation, where you can see an overview of the data set schema (or some its fragment), and are able to view the data that are behind the schema in the actial data set.

## Diagram-based Data exploration capabilities

### Class-based data

To view the data corresponding to a data class, open the context menu on the node of that class and select the item `Show Data`.

The information about the data in the class :Laureate is presented in the following way:

![07_QueryFromSchema](https://github.com/user-attachments/assets/b610b2a2-b6ff-44be-bc42-70f1df0c6be2)

The command `Custom Data` opens the dialogue for attribute selection and re-ordering.

![09_CustomDataForm](https://github.com/user-attachments/assets/58ee74e0-4799-49b1-bede-6cbe3194b9b3)


The command `Generate SPARQL` creates the following SPARQL code that can be edited in place before the execution, as well as brought over to a visual query diagram, where it can be handled by full visual query means.

![08_SPARQLText](https://github.com/user-attachments/assets/c3aa6c1c-ccf3-451e-98c1-a433093778f9)

### Data based on Links and Fragments
By selecting a link in the diagram, the data corresponding to the link can be shown, as well.

By selecting a connected fragment in the diagram, the data corresponding to the fragment pattern can be shown, as well. NB! To select a fragment, click sequentially on all fragment nodes and all edges, while holding the Ctrl, or the Shift key.

![10_QueryFromFragment](https://github.com/user-attachments/assets/b9338b89-c73f-4ff3-8be2-6e003352dc6a)

The queries based on links and fragments show by default the URIs of all selected entities, as well as one presumably most characteristic property for each entity. To adjust the selection, or place further conditions on it, edit the queries in the full visual query window.

## Full Visual Queries
Having a SPARQL query generated in the data schema environment, it can be copied over to the SPARQL area of the visual query diagram (the schema diagram needs to be closed and a new visual query diagram needs to be created, or an existing query diagram needs to be opened), followed by activating the `Visualize SPARQL` command in the context of an empty space on the diagram pane. 

![12_FullVisualQueryDiagram](https://github.com/user-attachments/assets/e3e7e663-c006-418f-9328-1b4a8c091694)

After the query visualization, its elements can be edited and enriched by the means offered by the full visual query environment, as explained on [ViziQuer wiki](https://github.com/LUMII-Syslab/viziquer/wiki).

The query can then be executed or translated into SPARQL form at any point.

## Creating a New Schema Diagram
Creating of a new schema diagram is described in ViziQuer wiki section [Visual Data Schema Diagrams](https://github.com/LUMII-Syslab/viziquer/wiki/Visual-Data-Schema-Diagrams).



