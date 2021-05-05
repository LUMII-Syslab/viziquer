Template.testDBP.Classes = new ReactiveVar("");

Template.testDBP.rendered = function() {
	//console.log("-----rendered----")
		var schema = new VQ_Schema_New();
		//console.log(schema.Tree)
		Template.testDBP.Classes.set(schema.getAllClasses());
}

Template.testDBP.helpers({
	classes: function() {
		return Template.testDBP.Classes.get();
	},
	ont: function() {
		var schema = new VQ_Schema_New();
		return schema.getOntList();
	},
});

Template.testDBP.events({

	'click #filter': function(e) {

		var text = $('#find_text').val();
		var ont = $('input[name=stack-radio]:checked').val();
		var schema = new VQ_Schema_New();
		var cl = {};
		if ( ont == "All" )
			cl = schema.getAllClassesF(text);
		else
			cl = cl = schema.getAllClassesFO(text, ont);

		console.log(text)
		console.log(ont)
		console.log(cl)
		Template.testDBP.Classes.set(cl);

	}
});

// ***********************************************************************************
// ***********************************************************************************
// ***********************************************************************************
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
