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


## Old Sample Texts

Choose the `nobel_prizes_simple` data schema for the data query environment 
and `nobel_prizes_schema` for the schema environment. 
Note: switch between schemas in the Parameters dialogue (gear icon in the Diagrams view).

Upload the project `np_meta_schemas_project.json` into the visual tool environment 
to access live versions of the schema and query diagrams presented in the paper.
Note: create a project, then enter the Diagrams view and use the upload icon 
(a cloud image, with an up arrow) for uploading.
 
