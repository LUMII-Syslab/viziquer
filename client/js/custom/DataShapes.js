// ***********************************************************************************
const SCHEMA_SERVER_URL = 'http://localhost:3344/api';
const callWithPost = async (funcName, data = {}) => {
	try {
		const response = await window.fetch(`${SCHEMA_SERVER_URL}/${funcName}`, {
			method: 'POST',
			mode: 'cors',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		//console.log(response)
		return await response.json();
	}
	catch(err) {
		console.log("-------error-----------")
		return {complete: false, data: [], error: err};  
    }	
}

const callWithGet = async (funcName) => {
	try {
		const response = await window.fetch(`${SCHEMA_SERVER_URL}/${funcName}`, {
			method: 'GET',
			mode: 'cors',
			cache: 'no-cache'
		});
		// console.log(response)
		return await response.json();
	}
	catch(err) {
        console.error(err)
		return {};  
    }
}
// ***********************************************************************************

dataShapes = {
	schema : {},
	getOntologies : async function() {
		var rr = await callWithGet('info/');
		var rr2 = rr.info;
		rr2.unshift({name:""});
		
		//rr =  _.map(rr, function(n){ return n.name; });
		//rr.unshift("");
		//var rr2 =  _.map(rr, function(n){ return {name:n}; });
		return await rr2;		
	},
	changeActiveProject : async function(proj_id) {
		var proj = Projects.findOne({_id: proj_id});
		console.log(proj)
		this.schema = {};
		if (proj !== undefined) {
			if ( proj.schema !== undefined && proj.schema !== "") {
				this.schema.schema =  proj.schema;
				this.schema.ontologies = {};
				var ont_list = await this.getOntList(proj.schema);
				var list = {projectId: proj_id, set:{ filters:{list:ont_list}}};
				Utilities.callMeteorMethod("updateProject", list);
				this.schema.ontologies.list = ont_list;
			}
		}
	},
	getOntList : async function(schema) {
		var rr = await callWithGet('ontologies/' + schema + '/ns');
		var rr2 =  _.map(rr.ns, function(n){ return {dprefix:n.name+" ("+n.cl_count+")", id:String(n.id), priority:n.priority}; });
		rr2 = _.sortBy(rr2, function(a) { return -a.priority});
		console.log(rr2)
		return await rr2;		
	},
	getProjOntList : async function() {
			//var proj = Projects.findOne({_id: Session.get("activeProject")});
			var s = this.schema.schema;
			var rr = [];
			if (s !== "" && s !== undefined )
			{
			    rr = this.getOntList(s);
				//var rr = await callWithGet('ontologies/'+s+'/ns');
				//rr2 =  _.map(rr.ns, function(n){ return {dprefix:n.name+" ("+n.cl_count+")", uri:n.name, id:String(n.id), priority:n.priority}; });
				//rr2 = _.sortBy(rr2, function(a) { return -a.priority});

			}
		return await rr;		
	},
	getClassList : async function(text = "") {
		var s = this.schema.schema;
		console.log("------------getClassList------------------")
		var rr2 = [];
		if (s !== "" && s !== undefined )
		{
			var rr = [];
			if (text === "")
				rr = await callWithGet('ontologies/' + s + '/classes');
			else
				rr = await callWithGet('ontologies/' + s + '/classes-filtered/' + text);
			console.log(rr)
			rr2 =  _.map(rr.data, function(n){ return {fullName:n.display_name + " (" + n.cnt + ")"}; });
			console.log(rr2)
			//return await rr2;
		}
		return await rr2;
	},
	getClasses : async function(par = {}) {
		var s = this.schema.schema;
		console.log("------------GetClasses------------------")
		console.log(par)
		var rr = {complete: false, data: [], error: "DSS parameter not found"};
		if (s !== "" && s !== undefined )
		{
			rr = await callWithPost('ontologies/' + s + '/getClasses', par);
		}
		console.log(rr)
		return await rr;
	},
	getProperties : async function(par = {}) {
		var s = this.schema.schema;
		console.log("------------GetProperties------------------")
		console.log(par)
		var rr = {complete: false, data: [], error: "DSS parameter not found"};
		if (s !== "" && s !== undefined )
		{
			rr = await callWithPost('ontologies/' + s + '/getProperties', par);
		}
		console.log(rr)
		return await rr;
	},
};

// ***********************************************************************************
// ****************************Šo man pagaidām nevajag, bet drīz vajadzēs**************************************************
VQ_Schema_New = function () {
  // Te būs jāsaprot, kurā projektā atrodamies un kāda ir zināmā informācija
	var schema = new VQ_Schema();
    this.Classes = schema.Classes;
    this.Ontologies = schema.Ontologies;
    this.Tree = schema.Tree;
};

VQ_Schema_New.prototype = {
  constructor: VQ_Schema_New,
  Classes: null,
  Ontologies:null,
  Tree:null,
  getOntList: function() {
	var ont_list =  _.map(this.Ontologies, function (o) {
		return {dprefix:o.dprefix};});
	return 	ont_list;		
  },
  getAllClasses: function () { 
	var cl_list =  _.map(this.Classes, function (c) {
		return {localName:c.localName, dprefix:c.ontology.dprefix}; });
	return 	cl_list;
  },
  getAllClassesF: function (filter) { 
	var cl_list =  this.getAllClasses();
	cl_list = _.filter(cl_list, function(c){ 
				return  c.localName.indexOf(filter) != -1 });	
	return 	cl_list;
  },
  getAllClassesFO: function (filter, ont) { 
	var cl_list =  this.getAllClasses();
	cl_list = _.filter(cl_list, function(c){ 
				return  c.localName.indexOf(filter) != -1 && c.dprefix == ont });	
	return 	cl_list;
  }
 }
