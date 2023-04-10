import { Interpreter } from '/client/lib/interpreter'
import { TriplesMaps, Projects, Diagrams, Elements, ElementTypes, Compartments, CompartmentTypes } from '/libs/platform/collections'


VQ_r2rml = function (schema) {
//console.log(schema);
   this.triplesMaps = {};
   this.views = {};

   if (TriplesMaps.find().count() == 0)
   { return; }

   var data = TriplesMaps.findOne();
   var r2rml = this;
   var tmpData = {};
   var tmpViews = {};

	_.each(data.Data, function(d){
        tmpData[d.subject] = [];
	})

	_.each(data.Data, function(d){
		tmpData[d.subject] = _.union( tmpData[d.subject], [d]);
		if (d.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
			r2rml.triplesMaps[d.subject] = new TriplesMap(d.subject);
	})

	_.each(data.Data, function(d){
		var name = d.subject;
		var tr = r2rml.triplesMaps[name];
		if (d.predicate == "http://www.w3.org/ns/r2rml#logicalTable")
			tr.addLogicalTable(d, tmpData);
		if (d.predicate == "http://www.w3.org/ns/r2rml#subjectMap"){
			var subjectMap = tr.addSubjectMap(d, tmpData);
			var ontClass = schema.findClassByName(subjectMap.ontClass);
			ontClass.triplesMaps = _.union(ontClass.triplesMaps, [tr]);
		}
	})

	_.each(data.Data, function(d){
		var name = d.subject;
		var tr = r2rml.triplesMaps[name];
		if (d.predicate == "http://www.w3.org/ns/r2rml#predicateObjectMap") {
			var predicateObjectMap = tr.addPredicateObjectMap(d, tmpData, r2rml);
			if (predicateObjectMap.objectMap.column){
				var ontProperty = schema.findAttributeByName(predicateObjectMap.predicate);
				ontProperty.triplesMaps = _.union(ontProperty.triplesMaps, [tr]);
			}
			else{
				var ontProperty = schema.findAssociationByName(predicateObjectMap.predicate);
				ontProperty.triplesMaps = _.union(ontProperty.triplesMaps, [tr]);
			}

		}

	})

	//console.log(r2rml.triplesMaps);
};

VQ_r2rml.prototype = {
  constructor:VQ_r2rml,
  triplesMaps: null,
  views: null,
}

TriplesMap = function(name){
	this.name = name;
	this.predicateObjectMap = [];
}

function getSubjectMapData(data){
	if ( data.predicate == "http://www.w3.org/ns/r2rml#class")
		return {ontClass: data.object }
	else
		return {templete: data.object}
}

function getJoinConditionData(data){
	if ( data.predicate == "http://www.w3.org/ns/r2rml#parent")
		return {parent: data.object }
	else
		return {child: data.object}
}

function getPredicateObjectMapData(data, tmpData, r2rml){
	if ( data.predicate == "http://www.w3.org/ns/r2rml#predicate")
		return {predicate: data.object}
	else
	{
		var rez = {};
		//console.log(tmpData[data.object]);
		_.each(tmpData[data.object], function(obj){
			if (obj.predicate == "http://www.w3.org/ns/r2rml#column")
				_.extend(rez, {column: obj.object});
			if (obj.predicate == "http://www.w3.org/ns/r2rml#parentTriplesMap")
			{
				var parentTriplesMap = r2rml.triplesMaps[obj.object];
				_.extend(rez, {parentTriplesMap: { name:parentTriplesMap.name, logicalTable:parentTriplesMap.logicalTable, subjectMap:parentTriplesMap.subjectMap}});
			}
			if (obj.predicate == "http://www.w3.org/ns/r2rml#joinCondition")
			{
				var joinRez = {}
				_.extend(joinRez, getJoinConditionData(tmpData[obj.object][0]));
				_.extend(joinRez, getJoinConditionData(tmpData[obj.object][1]));
				_.extend(rez, {joinCondition:joinRez});
			}
		})
		return {objectMap:rez};
	}
}

TriplesMap.prototype = {
	constructor: TriplesMap,
	name: null,
	logicalTable: null,
	subjectMap: null,
	predicateObjectMap: null,
	addLogicalTable: function (data, tmpData){
		var objectName  = data.object;
			var logicalTable = {};
			var obj = tmpData[objectName][0];
			if (obj.predicate == "http://www.w3.org/ns/r2rml#sqlQuery")
			{
				logicalTable.type = "view";
				logicalTable.sqlQuery = obj.object;
			}
			else
			{
				logicalTable.type = "table";
				logicalTable.table = obj.object;
			}
			this.logicalTable = logicalTable;
	},
	addSubjectMap: function (data, tmpData, schema){
		var objectName  = data.object;
		var subjectMap = {};
		_.extend(subjectMap, getSubjectMapData(tmpData[objectName][0]));
		_.extend(subjectMap, getSubjectMapData(tmpData[objectName][1]));
		this.subjectMap = subjectMap;
		return subjectMap;
	},
	addPredicateObjectMap: function (data, tmpData, r2rml){
		var objectName  = data.object;
		var predicateObjectMap = {objectMap:[]};
		_.extend(predicateObjectMap, getPredicateObjectMapData(tmpData[objectName][0], tmpData, r2rml));
		_.extend(predicateObjectMap, getPredicateObjectMapData(tmpData[objectName][1], tmpData, r2rml));
		this.predicateObjectMap = _.union( this.predicateObjectMap, [predicateObjectMap]);
		return predicateObjectMap;
	},
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
var schema = {};
var const_small_schema = 25; // Ja klašu skaits mazāks vai vienāds par šo, tad kokā neliek ontoloģijām abstraktās klases 
function collectClasses(cl, all, first){
	var superClasses = {};
	cl.isVisited = true
	if ( _.size(cl[all]) > 0){
		_.each(cl[all], function(sc){
			superClasses[sc.getID()] = sc;
			})
		}
	else {
		_.each(cl[first], function(sc){
			superClasses[sc.getID()] = sc;
			if (sc.isVisited == false)
			{
				var allSuperClasses = collectClasses(sc, all, first);
				_.extend(superClasses, allSuperClasses);
			}
			})
	}
	return superClasses;
}
function collectOriginalClasses(cl, all, first){
	var superClasses = [];
	cl.isVisited = true
	if ( _.size(cl[all]) > 0){
		superClasses = _.union(superClasses,cl[all]);	
	}
	else
	{
		_.each(cl[first], function(sc_name){
			var sc = schema.findClassByName(sc_name);
			if ( sc.localName != " ")
			{
				superClasses = _.union(superClasses, sc.getClassName());
				if (sc.isVisited == false)
				{
					var allSuperClasses = collectOriginalClasses(sc, all, first);
					superClasses = _.union(superClasses, allSuperClasses);
				}
			}
		})
	}
	return superClasses;
}
function createLink(s_class, t_class, s_role, t_role){
	s_class[s_role][t_class.ID] = t_class;
	t_class[t_role] = s_class;
	//t_class[t_role][s_class.getID()] = s_class;
}
var PrefixList =
  {
   "http://www.loc.gov/mads/rdf/v1#": "madsrdf",
    "http://id.loc.gov/ontologies/bflc/": "bflc",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://xmlns.com/foaf/0.1/": "foaf",
    "http://yago-knowledge.org/resource/": "yago",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
    "http://dbpedia.org/ontology/": "dbo",
    "http://dbpedia.org/property/": "dbp",
    "http://purl.org/dc/elements/1.1/": "dc",
    "http://purl.org/goodrelations/v1#": "gr",
    "http://www.w3.org/2002/07/owl#": "owl",
    "http://data.ordnancesurvey.co.uk/ontology/spatialrelations/": "spacerel",
    "http://www.w3.org/2004/02/skos/core#": "skos",
    "http://www.opengis.net/ont/geosparql#": "geo",
    "http://www.w3.org/ns/dcat#": "dcat",
    "http://www.w3.org/2001/XMLSchema#": "xsd",
    "http://purl.org/linked-data/cube#": "qb",
    "http://purl.org/net/ns/ontology-annot#": "ont",
    "http://rdfs.org/sioc/ns#": "sioc",
    "http://www.w3.org/ns/sparql-service-description#": "sd",
    "http://www.w3.org/ns/org#": "org",
    "http://www.w3.org/ns/prov#": "prov",
    "http://purl.org/dc/terms/": "dcterms",
    "http://www.ontotext.com/": "onto",
    "http://rdfs.org/ns/void#": "void",
    "http://www.w3.org/ns/people#": "person",
    "http://purl.org/rss/1.0/": "rss",
    "http://purl.org/ontology/bibo/": "bibo",
    "http://www.wikidata.org/entity/": "wd",
    "http://purl.org/NET/c4dm/event.owl#": "event",
    "http://www.geonames.org/ontology#": "geonames",
    "http://rdf.freebase.com/ns/": "fb",
    "http://www.w3.org/2006/vcard/ns#": "vcard",
    "http://creativecommons.org/ns#": "cc",
    "http://www.w3.org/ns/r2rml#": "rr",
    "http://schema.org/": "schema",
    "http://usefulinc.com/ns/doap#": "doap",
    "http://purl.org/vocab/vann/": "vann",
    "http://dbpedia.org/resource/": "dbr",
    "http://example.org/": "ex",
    "http://www.w3.org/2003/06/sw-vocab-status/ns#": "vs",
    "http://xmlns.com/wot/0.1/": "wot",
    "http://www.w3.org/ns/auth/cert#": "cert",
    "http://www.w3.org/2003/01/geo/wgs84_pos#": "geo",
    "http://www.w3.org/ns/oa#": "oa",
    "http://www.w3.org/ns/adms#": "adms",
    "http://purl.org/linked-data/sdmx#": "sdmx",
    "http://rdfs.org/sioc/types#": "sioct",
    "http://www.europeana.eu/schemas/edm/": "edm",
	"http://rdvocab.info/ElementsGr2/":"rdag2"
  }
  
function findPrefixFromList(uri) {
  if ( typeof PrefixList[uri] != 'undefined') { return PrefixList[uri];}
  else { return null; }
}
function findUriFromList(prefix) {
	var rez = null;
	_.each(PrefixList, function(val, key){
			if (val == prefix)
				rez = key;
	})
	//console.log(rez);
	return rez;
}
function findCardinality(card, type) {
	if (type == "MIN")
	{
		if (card == 1) return 1;
		else return 0;

	}
	if (type == "MAX")
	{
		if (card == 1) return 1;
		else return -1;
	}
}
function checkClassForTree(schema_class, prefix) {
	if ( schema_class.instanceCount < schema.treeMode.RemoveLevel  && !schema_class.isClassificator) 
		return 0;
	if ( schema.treeMode.CompressLevel == 2 && schema_class.isInTree )  
		return 0;
	if ( schema.treeMode.CompressLevel == 1 && schema_class.isInTree )  
		return 1;
	var ownClass = ( schema_class.ontology.dprefix == prefix && !schema_class.isAbstract) || ( schema_class.ontologies[prefix] && schema_class.isAbstract ) ||
					( schema_class.ontology.dprefix == prefix && schema_class.isAbstract);
	if ( schema.treeMode.CompressLevel == 2 && !ownClass )  
		return 0;	
	if ( schema.treeMode.CompressLevel < 2 && !ownClass && schema_class.isAbstract )  
		return 0;		
	if ( schema.treeMode.CompressLevel < 2 && !ownClass )  
		return 1;
	if ( schema_class.isClassificator)  
		return 1;
	return 2;
}
function makeTreeNodeLocalName(class_name, class_name2 = null) {
	function getShortName (cl) { return (cl.ontology.isDefault ? cl.localName : cl.ontology.prefix.concat(":",cl.localName));};
	var pre = "";
	var pre2 = "A=";
	var schema_class = schema.findClassByName(class_name);
	var local_name = "";
	if (!class_name2)
		local_name = getShortName (schema_class);
	else {
		var schema_class2 = schema.findClassByName(class_name2);
		local_name = getShortName(schema_class).concat(" = ",getShortName(schema_class2));
	}
	if ( _.size(schema_class.superClasses) > 1)
		pre = pre.concat("V");
	if ( _.size(schema_class.subClasses) > 0 )
		pre = pre.concat("A");
	if ( schema.treeMode.ShowSubClassCount > 0 && _.size(schema_class.allSubClasses) >  schema.treeMode.ShowSubClassCount)
		pre2 = pre2.concat(_.size(schema_class.allSubClasses));  
	//if (pre != "")  // !!! Tās tās manas dekorācijas
	//	local_name = local_name.concat("  (", pre,")")
	if ( schema_class.instanceCount > 0)
		if ( pre2 == "A=")
			local_name = local_name.concat("  (", schema_class.instanceCount,")");	
		else
			local_name = local_name.concat("  (", schema_class.instanceCount," ",pre2,")");	
	else
		if ( pre2 != "A=")
			local_name = local_name.concat("  (", pre2,")");	
	
	return local_name;
}
var ccc = 0;
function makeCycleNode(schema_class, prefix){
	var ekv = "= "; 
	var cycle_info = {children:[]};
	var first_class = _.find(schema_class.cycle, function(cl){ return cl.prefix == prefix && cl.name != schema_class.cycleName});
	if (!first_class) first_class = schema_class.cycle[1];
	cycle_info.data_id = first_class.name;	
	if (_.size(schema_class.cycle) == 3 ) {
		cycle_info.localName = makeTreeNodeLocalName(first_class.name,schema_class.cycle[(first_class.num == 1? 2:1)].name);
	}
	else {
		cycle_info.localName = makeTreeNodeLocalName(first_class.name);
		_.each(schema_class.cycle, function(c){
			if (c.num != 0 && c.num != first_class.num)
				cycle_info.children = _.union(cycle_info.children, {name:c.name, tr_name:ekv.concat(makeTreeNodeLocalName(c.name))});
		})
	}
	return cycle_info;
}
function makeSubTree(classes, deep) {
	function ownClass(schema_class, prefix) { return (schema_class.ontology.dprefix == prefix && !schema_class.isAbstract) || ( schema_class.ontologies[prefix] && schema_class.isAbstract)};
	function cycleClass(schema_class, cl) {
		if ( schema_class.cycleName == "" ) return false;
		if ( schema_class.cycleName == cl.cycleName ) return true;
		return false;
	};
	var ch_class_list = [];
	var temp_class_list = [];
	var local_list = [];
	var tree_list = [];
	_.each(classes, function(cl_info) {

		ch_class_list = [];
		var cl_name = cl_info.name;
		var node_id = schema.getNewIdString(cl_name);
		var prefix = cl_info.prefix;
		var schema_class = schema.findClassByName(cl_name);
		var classTreeMode = checkClassForTree(schema_class, prefix);
		
		if ( classTreeMode == 0 ) return tree_list;
		
		var data_id = (schema_class.isAbstract && schema_class.localName == "_" ? "": cl_name );
		if (schema_class.cycleName == "" ) schema_class.isInTree = true;
		var tree_node = {node_id:node_id,data_id:data_id, localName:cl_info.tr_name, tree_path:cl_info.parent_list.join(" > "), deep:deep, display:"none", orderNum:cl_info.orderNum};

		ccc = ccc +1
		//if ( ccc > 300 ) { console.log("DAUDZZZZZZZZZZZZZZZZZZZZZZZ makeTreeNode"); return tree_list;};
		
		schema.TreeList[node_id] = tree_node;
		tree_list = _.union(tree_list, tree_node);
		
		if ( classTreeMode == 2)
		{
			var cycleName = schema_class.cycleName;
			if (schema_class.cycleName != "" && schema_class.isAbstract)
			{
			    var cycle_info = makeCycleNode(schema_class, prefix);
				tree_node.data_id = cycle_info.data_id;
				tree_node.localName = cycle_info.localName;
					
				ch_class_list = _.map(cycle_info.children, function(cl){
						return {name:cl.name, parent_list:_.union(cl_info.parent_list,cl_name),	prefix:prefix, tr_name:cl.tr_name, orderNum:1};	
				});
				//ch_class_list = _.sortBy(ch_class_list, function(t){ return t.name;})
			} 
			if ( schema.treeMode.CompressLevel > 0 && deep == schema.treeMode.MaxDeep -1 )
			{
				temp_class_list = _.filter(schema_class.allSubClasses, function(cl){ 
					return  ownClass(cl, prefix) && !cycleClass(schema_class, cl) });  
				ch_class_list  = _.union(ch_class_list, _.map( temp_class_list, function (cl){
						return {name:cl.getClassName(), parent_list:_.union(cl_info.parent_list,cl_name),
							prefix:prefix, orderNum:1, tr_name:makeTreeNodeLocalName(cl.getClassName())};}));
				//temp_list = _.sortBy(temp_list, function(t){ return t.name;})
			}
			else
			{
				temp_class_list = _.filter(schema_class.subClasses, function(cl){ 
					return ownClass(cl, prefix) && !cycleClass(schema_class, cl) });
				ch_class_list  = _.union(ch_class_list,_.map(temp_class_list, function (cl){
						return {name:cl.getClassName(), parent_list:_.union(cl_info.parent_list,cl_name),
								prefix:prefix, orderNum:1, tr_name:makeTreeNodeLocalName(cl.getClassName())};}));
		
				//temp_list = _.sortBy(temp_list, function(t){ return t.name;})
			}
			
			temp_class_list = _.filter(schema_class.subClasses, function(cl){ return !ownClass(cl, prefix) && !cycleClass(schema_class, cl) });
			ch_class_list  = _.union(ch_class_list, _.map(temp_class_list, function (cl){ 
					return {name:cl.getClassName(), parent_list:_.union(cl_info.parent_list,cl_name),
						prefix:prefix, orderNum:2, tr_name:makeTreeNodeLocalName(cl.getClassName())};}));

				
			//temp_list = _.sortBy(temp_list, function(t){ return t.name;})
			
		}

		if (_.size(ch_class_list) > 0)
		{
			tree_node.children = makeSubTree(ch_class_list, deep+1); 
			tree_node.children = _.sortBy(tree_node.children, function(t){ return t.localName;});
			tree_node.children = _.sortBy(tree_node.children, function(t){ return t.orderNum;});
			tree_node.ch_count = _.size(tree_node.children);
		}
		else
		{
			tree_node.children = [];
			tree_node.ch_count = 0;			
		}
		//schema_class.tree_nodes = _.union(schema_class.tree_nodes, tree_node); // !!!!! vai to vajag?
	
	})

	return tree_list;
}

var druka = false;
var startTime = null;
VQ_Schema_copy = null; 	
VQ_Schema = function ( data = {}, tt = 0) {
//console.log("***************************************")
//console.log(tt.toString().concat("  - data ", _.size(data).toString()," schema  ", Schema.find().count().toString()))
   druka = false;
   if (_.size(data) > 0 )  VQ_Schema_copy = null;
   
   var isData = false;
   if (_.size(data) > 0 )
		isData = true;

   if (Schema.find().count() == 0 && _.size(data) == 0)    {
		// Teorētiski šeit dažreiz ir shēmas kopija, bet nezinu, vai vajag dot
		if (druka)  console.log("Neatrada shēmu vai datus");   
		return; 
    }
   
   if (VQ_Schema_copy && VQ_Schema_copy.projectID == Session.get("activeProject")) 
   {
	   // if (druka)  console.log("Atrada derīgu shēmu");
	   this.projectID = Session.get("activeProject");
	   this.Data = VQ_Schema_copy.Data;
	   this.Elements = VQ_Schema_copy.Elements;	
	   this.Classes = VQ_Schema_copy.Classes;
	   this.Attributes = VQ_Schema_copy.Attributes;
	   this.SchemaAttributes = VQ_Schema_copy.SchemaAttributes;
	   this.Associations = VQ_Schema_copy.Associations;
	   this.SchemaProperties = VQ_Schema_copy.SchemaProperties;
	   this.SchemaRoles = VQ_Schema_copy.SchemaRoles;
	   this.Ontologies = VQ_Schema_copy.Ontologies;
	   this.Cycles = VQ_Schema_copy.Cycles;
	   this.Tree = VQ_Schema_copy.Tree;
	   this.TreeMode = VQ_Schema_copy.TreeMode;
	   this.TreeList = VQ_Schema_copy.TreeList;
	   this.OwlFormat = VQ_Schema_copy.OwlFormat;
	   this.AllClasses = VQ_Schema_copy.AllClasses;
	   this.namespace = VQ_Schema_copy.namespace;
	   this.classCount = VQ_Schema_copy.classCount;
	   schema = this;
	   return;	
   }
   
   //var startTime = Date.now();
   startTime = Date.now();
   this.projectID = Session.get("activeProject");
   this.Elements = {};	
   this.Classes = {};
   this.Attributes = {};
   this.SchemaAttributes = {};
   this.Associations = {};
   this.SchemaProperties = {}
   this.SchemaRoles = {};
   this.Ontologies = {};
   this.Cycles = {};
   this.Tree = [];
   this.TreeList = {};
   this.OwlFormat = {};
   this.AllClasses = [];
   schema = this;
   
   if ((Schema.find().count() == 1 ))
   {
      data = Schema.findOne();
      if (data.Schema) data = data.Schema;
   } 	 

   this.Data = data;
   
   if (druka) console.log("Taisa shēmu no datiem");
   this.makeClasses(data);
   if (druka) console.log("—-------------Pēc klasēm -----------------")
   if (druka)console.log(Date.now() - startTime  )
   startTime = Date.now() 
   this.makeSchemaTree();
   if (druka) console.log("—----------Pēc koka--------------------")
   if (druka) console.log(Date.now() - startTime  )
   startTime = Date.now() 
   this.makeAttributesAndAssociations(data);
   if (druka) console.log("—-----------Pēc Asociācijām-------------------")
   if (druka) console.log(Date.now() - startTime  )
   //startTime = Date.now() 
   //this.getOwlFormat();   
   //VQ_r2rml(schema);   // Tas kaut kam bija paredzēts
   //if (druka) console.log("—----------Pēc OWL formāta--------------------")
   //if (druka) console.log(Date.now() - startTime  )  
   
   VQ_Schema_copy = schema;
   if (druka) console.log(schema);   
};

VQ_Schema.prototype = {
  constructor: VQ_Schema,
  projectID:null,
  namespace:null,
  Data:null,
  Elements: null,
  Classes: null,
  Attributes:null,
  Associations:null,
  SchemaAttributes:null,
  SchemaRoles:null,
  SchemaProperties:null,
  Ontologies:null,
  Cycles:null,
  Tree:null,
  TreeList:null,
  treeMode:null, 
  OwlFormat:null,
  AllClasses:null,
  currentId: 0,
  classCount: 0,
  getNewIdString: function(name) {
	this.currentId = this.currentId + 1;
    return "ID_" + this.currentId; // + "_" + name;
  },
  classExist: function (name) {
    //if (druka)  console.log("Funkcijas izsaukums - classExist"); 
    var cl = this.findClassByName(name);
	return findName(name, cl);
  },
  associationExist: function (name) {
    var cl = this.findAssociationByName(name);
	return findName(name, cl);
  },
  attributeExist: function (name) {
    var cl = this.findAttributeByName(name);
	return findName(name, cl);
  },
  findUriFromList: function(prefix){
	return findUriFromList(prefix)
  },
  ontologyExist: function (name) {
    var ontology = _.find(this.Ontologies, function (ont) {
	  if (ont.namespace == name) { ont.elementCount = ont.elementCount +1; return ont}; });
    return ontology;
  },
  checkOntologyPrefix: function (name){
    var ontology = _.find(this.Ontologies, function (ont) {
	  if (ont.prefix == name) { return ont}; });
	if (ontology) return this.checkOntologyPrefix(name+"1");
	else return name;
  },
  getAllClasses: function (){ 
	if (druka)  console.log("Funkcijas izsaukums - getAllClasses"); 
	if ( _.size(this.AllClasses) > 0 )
	{
		if (druka)  console.log(this.AllClasses); 
		return this.AllClasses;
	}	
    var classes = _.filter(this.Classes, function (cl){
	             return  !cl.isAbstract;  }); //( cl.localName != " " && cl.localName != "_" && cl.localName != "__" )  });	
    var classes_list =  _.map(classes, function (cl) {
				return {name:cl.getElementShortName(), prefix:cl.ontology.prefix, localName:cl.localName};});
		
	var showPrefixesForAllNonLocalNames = false;
	var proj = Projects.findOne({_id: schema.projectID});
	if (proj) { if (proj.showPrefixesForAllNonLocalNames==true) { showPrefixesForAllNonLocalNames = true ; }}
	
	if ( showPrefixesForAllNonLocalNames )
	{
		classes_list = _.sortBy(classes_list, function(c) {return c.localName;})
		classes_list = _.sortBy(classes_list, function(c) {return c.prefix;})
	}
	else
	{
		classes_list = _.sortBy(classes_list, function(c) {return c.prefix;})
		classes_list = _.sortBy(classes_list, function(c) {return c.localName;})
	}
	this.AllClasses = _.map(classes_list, function(c) { return {name:c.name};});
	if (druka)  console.log(this.AllClasses); 
	return this.AllClasses;
  },
  getAllSchemaAssociations: function (){
    if (druka)  console.log("Funkcijas izsaukums - getAllSchemaAssociations"); 
    var rez =  _.map(this.Associations, function (cl) {
				if (cl.isUnique) return {name: cl.localName};
				else  if (cl.ontology.prefix == "") return {name: cl.localName};
				      else return {name: cl.ontology.prefix + ":" + cl.localName}; });
	if (druka)  console.log(rez); 
	return rez;
  },
  findElementByName: function (name, coll) {  
    var element = _.find(coll, function(el){ if ( findName(name, el)) { return el; }; })
	if (element)
	{
		if (!element.isUnique && !name.includes(":"))
		{
			var tt = ":";
			return this.findElementByName(tt.concat(name), coll)
		}	
		else
		return element; 
	}
	return _.find(coll, function(el){ if (el.localName == " ") { return el; }; })
  },
  findClassByName: function(name) {
	//if (druka)  console.log("Funkcijas izsaukums - findClassByName"); 
	return this.findElementByName(name, this.Classes);
  },
  findClassByNameAndCycle: function(name) {
	var cl = this.findClassByName(name);
	if (_.size(cl.cycle) > 0 )  
		return this.findClassByName(cl.cycleName);
    return cl;
  },
  findAssociationByName: function(name) {
    if (druka)  console.log("Funkcijas izsaukums - findAssociationByName"); 
	return this.findElementByName(name, this.Associations);
  },
  findAttributeByName: function(name) {
	return this.findElementByName(name, this.Attributes);
  },
  findSchemaRoleByName: function(name, sourceClass, targetClass) {
    var element = _.find(this.SchemaRoles, function(el){
		if ( findName(name, el) && findName(sourceClass, el.sourceClass) && findName(targetClass, el.targetClass)) { return el; }; });
	return element;
  },
  findSchemaRoleByNameAndTarget: function(name, sourceClass, targetClass) {
    var element = _.find(this.SchemaRoles, function(el){
		if ( findName(name, el) && findName(targetClass, el.targetClass)) { return el; }; })
	return element;
  },
  getElementShortName : function (element){  
	var showPrefixesForAllNonLocalNames = false;
	var proj = Projects.findOne({_id: schema.projectID});
	var name = "";
	if (proj) {
		if (proj.showPrefixesForAllNonLocalNames==true) {
			showPrefixesForAllNonLocalNames = true ;
		}
	}

	if ( showPrefixesForAllNonLocalNames )
	{
		if (element.ontology.prefix == "") name = element.localName; 
		  else name = element.ontology.prefix + ":" + element.localName;
	}
	else
	{
		if (element.isUnique) name = element.localName; 
		else  
		{
			if (element.ontology.prefix == "") name = element.localName; 
			else name = element.ontology.prefix + ":" + element.localName; 
		}
	}
	if (name == " ")
		name = "";
	return name
  },
  addElement: function(newElement) {
	this.Elements[newElement.getID()] = newElement;
  },
  addClass: function(newClass) {
	this.Classes[newClass.getID()] = newClass;
	this.addElement(newClass);
  },
  addAttribute: function(newAttribute) {
	this.Attributes[newAttribute.getID()] = newAttribute;
	this.addElement(newAttribute);
  },
  addSchemaAttribute: function(newAttribute) {
	this.SchemaAttributes[newAttribute.getID()] = newAttribute;
	this.addElement(newAttribute);
  },
  addRole: function(newRole) {
	this.Associations[newRole.getID()] = newRole;
	this.addElement(newRole);
  },
  addSchemaRole: function(newRole) {
	this.SchemaRoles[newRole.getID()] = newRole;
	this.addElement(newRole);
  },
  addSchemaProperty: function(newProperty) {
	this.SchemaProperties[newProperty.getID()] = newProperty;
  },
  addOntology: function(newOntology) {
    this.Ontologies[newOntology.dprefix] = newOntology;
  },
  resolveClassByName: function (className) {
    if (druka)  console.log("Funkcijas izsaukums - resolveClassByName " + className);  
    if (this.classExist(className))
	{
		if (druka) console.log(this.findClassByName(className).getClassInfo());
		return this.findClassByName(className).getClassInfo();
	}
	else
        return null;
  },
  resolveLinkByName: function (linkName) {
  	if (druka)  console.log("resolveLinkByName " + linkName);
    if (this.associationExist(linkName))
		return this.findAssociationByName(linkName).getAssociationInfo();
	else
		return null;
  },
  resolveSchemaRoleByName: function (linkName, sourceClass, targetClass) {
    if (this.associationExist(linkName))
		return this.findSchemaRoleByNameAndTarget(linkName, sourceClass, targetClass).getSchemaRoleInfo();
	else
		return null;
  },
  resolveAttributeByName: function (className, attributeName) { 
    // Pagaidām klases vārds netiek ņemts vērā
	if (druka)  console.log("Funkcijas izsaukums - resolveAttributeByName " + className + " " + attributeName);
	if (this.attributeExist(attributeName))
		return this.findAttributeByName(attributeName).getAttributeInfo();
	else
		return null;
  },
  resolveAttributeByNameAndClass: function (className, attributeName) {
    if (druka)  console.log("Funkcijas izsaukums - resolveAttributeByNameAndClass " + className + " " + attributeName);
    var sc_class = this.findClassByName(className);
    if (sc_class.localName != " ") {
        var attributes = sc_class.getAttributes();
        var att_list = _.filter(attributes, function(attr) {return attr.name == attributeName || attr.short_name == attributeName });
        if (_.size(att_list) == 1) return [this.resolveAttributeByName(className,(att_list[0].short_name)), sc_class.getClassInfo()];
        else if (_.size(att_list) > 1 )  return [this.resolveAttributeByName(className, attributeName), sc_class.getClassInfo()];
		// Par nākamajiem nav skaidrs, kāpēc tie ir izņemti ārā
        //attributes = sc_class.getAllAttributes(); 
        //var att_list = _.filter(attributes, function(attr) {return attr.name == attributeName || attr.short_name == attributeName });
        //if (_.size(att_list) == 1) return [this.resolveAttributeByName(className,(att_list[0].short_name)), sc_class.getClassInfo()];
        //else if (_.size(att_list) > 1 )  return [this.resolveAttributeByName(className, attributeName), sc_class.getClassInfo()];
        else return [this.resolveAttributeByName(className, attributeName), null];
    }
    else {
        return [this.resolveAttributeByName(className, attributeName), null];
    }
  },

  getPrefixes: function() {
    var prefixes = []
	_.each(this.Ontologies, function (o){
		prefixes = _.union( prefixes, [[o.prefix, o.namespace]]);
	})
	for(var key in PrefixList){
		prefixes = _.union( prefixes, [[PrefixList[key], key]]);
	}
	return prefixes;
  },
  makeClasses: function(data) {
		var top_classes = [];
		// !! Te jātiek galā arī, ja namespace ir "" (iespējams, ka vēl nezinu, kura būs noklusētā ontoloģija)
		if (data.namespace) this.namespace = data.namespace;
	    if (data.Namespace) this.namespace = data.Namespace;
	    if (data.URI) this.namespace = data.URI;

	    if (this.namespace && !this.namespace.endsWith("#") && !this.namespace.endsWith("/"))
		   this.namespace = this.namespace + "#";

	    if (this.namespace)
		  schema.addOntology(new VQ_ontology(this.namespace));

		_.each(data.Prefixes, function(ont){
		  if (!schema.ontologyExist(ont.namespace)) 
			schema.addOntology(new VQ_ontology(ont.namespace, ont.prefix));
		})
		
		// ***************************** dbpedia.org *********************************************
		_.each(data.Classes, function(cl){
			if (data.SchemaName == "http://dbpedia.org/ontology/" && cl.localName == "Thing" || data.SchemaName == "http://dbpedia.org/ontology/" && cl.namespace == data.SchemaName)
				schema.addClass( new VQ_Class(cl));
			if (data.SchemaName != "http://dbpedia.org/ontology/")	
				schema.addClass( new VQ_Class(cl));
		})

	  // !!!! Mēdz būt virsklašu sarakstos virsklases ieliktas, kuru nav shēmā 
	  // Te sanāk stīvēšanās par to ko skaitīt un ko neskaitīt
		//top_classes = _.filter(this.Classes, function (cl) { return _.size(cl.originalSuperClasses) == 0 && !cl.isAbstract  } );
		
		_.each(this.Classes, function (cl){
			if( cl.instanceCount > 0 ) { cl.ontology.instanceCount = cl.ontology.instanceCount + cl.instanceCount; } 
		})
	
		if (!this.namespace) {
		  var defaultOntology = _.max( this.Ontologies, function(ont) {return ont.instanceCount});
		  if (defaultOntology.instanceCount == 0 )
			defaultOntology = _.max( this.Ontologies, function(ont) {return ont.classCount});
		  this.namespace = defaultOntology.namespace;
		  defaultOntology.isDefault = true;
		  defaultOntology.prefix = "";
		}
		
		schema.addClass( new VQ_Class({}, true));

		_.each(this.Classes, function(cl){ 
			var superClasses = [];
			_.each(cl.originalSuperClasses, function (sc){
				var superClass = schema.findClassByName(sc);
				if (!superClass.isAbstract && cl.getClassName() != superClass.getClassName())
				{
					superClasses = _.union(superClasses, [superClass.getClassName()]);
					superClass.originalSubClasses = _.union(superClass.originalSubClasses, [cl.getClassName()]);
				}	
			})
			cl.originalSuperClasses = superClasses;
		})	
	
		_.each(this.Classes, function (cl){
			_.each(schema.Classes, function (c){ c.isVisited = false})
			cl.originalAllSuperClasses = collectOriginalClasses(cl, "originalAllSuperClasses", "originalSuperClasses");
			_.each(schema.Classes, function (c){ c.isVisited = false})
			cl.originalAllSubClasses = collectOriginalClasses(cl, "originalAllSubClasses", "originalSubClasses");
		})

		this.makeTreeMode();
		this.getCycles();
	
		_.each(this.Classes, function (cl){
			if (cl.isAbstract && cl.localName != " ") {
				for (i = 1; i < _.size(cl.cycle); i++) { 
					cl.ontologies[cl.cycle[i].prefix] = 1;
				}
			}  
			else {
				cl.ontologies[cl.ontology.dprefix] = 1;
			}
		})
		
		function setInfo(cl,sc,key){
			var s_class = schema.findClassByName(sc); 
			var ID = s_class.getID(); 
			cl[key][ID] = s_class; 			
		};
   
		if ( _.size(schema.Cycles) == 0 )   
		{
			_.each(this.Classes, function(cl){
				_.each(cl.originalSubClasses, function(o){ setInfo(cl,o,"subClasses");	});	
				_.each(cl.originalSuperClasses, function(o){ setInfo(cl,o,"superClasses");	});
				_.each(cl.originalAllSubClasses, function(o){ setInfo(cl,o,"allSubClasses"); });
				_.each(cl.originalAllSuperClasses, function(o){ setInfo(cl,o,"allSuperClasses"); });
			})
		}
		else
		{
			_.each(this.Classes, function(cl){
				_.each(cl.fixedSuperClasses, function (sc){
					var superClass = schema.findClassByName(sc);
					if (!superClass.localName == " ") {
						superClass.addSubClass(cl);
						cl.addSuperClass(superClass);
					}
				})
			})
		
			_.each(this.Classes, function (cl){
				_.each(schema.Classes, function (c){ c.isVisited = false})
				cl.addAllSuperClasses();
				_.each(schema.Classes, function (c){ c.isVisited = false})
				cl.addAllSubClasses();
			})
		} 
		
		_.each(this.Classes, function (cl){
			var allSuperSubClasses = {};
			_.extend(allSuperSubClasses, cl.allSuperClasses);
			_.extend(allSuperSubClasses, cl.allSubClasses);
			cl.allSuperSubClasses = allSuperSubClasses;	
			
			var allSuperSubSuperClasses = {};
			_.extend(allSuperSubSuperClasses, cl.allSuperClasses);
			_.extend(allSuperSubSuperClasses, cl.allSubClasses);
			cl.allSuperSubSuperClasses = allSuperSubSuperClasses;
		})
		
		_.each(this.Classes, function (cl){
			_.each(cl.allSubClasses, function(sc){
				//if (cl.instanceCount == sc.instanceCount || ( cl.instanceCount > 0 && cl.instanceCount > 0 && sc.instanceCount > 5 && sc.instanceCount > 10*cl.instanceCount/100 ) )
				if (cl.instanceCount == sc.instanceCount || ( sc.instanceCount > cl.instanceCount ) )  // in fact, superclasses of subclasses are not considered
				{
					_.each(sc.allSuperClasses, function(ssc){
						var ID = ssc.ID;
						if ( ID != cl.getID())
							cl.allSuperSubSuperClasses[ID] = ssc;						
					})
				}
			});		
		})
		
	// !!! Te vēl arī savas ontoloģijas apakšklases un virsklases vajadzēs savākt (varbūt)
	
  },
  getCycles: function(){
     
	_.each(this.Classes, function (cl){
		var cycle = _.intersection(cl.originalAllSuperClasses,cl.originalAllSubClasses);
		cycle = _.sortBy(cycle, function(nn){ return nn; });
		cl.cycle = cycle;
	})

	if ( schema.treeMode.CompressLevel < 2 ) {
	
		var good_classes = _.filter(schema.Classes, function(cl) { return cl.instanceCount >= schema.treeMode.RemoveLevel &&  cl.instanceCount != -1; }); // !!! Varbūt tomēr jāņem visas
	   
		var inst_count_list = _.map(good_classes, function(c) {return c.instanceCount});
		inst_count_list = _.sortBy(inst_count_list, function(t) {return t});
		var uniq_inst_count_list = _.uniq(inst_count_list, true);
	   
		var cycles_list = [];
		_.each(uniq_inst_count_list, function(inst) {
			if ( _.indexOf(inst_count_list,inst) != _.lastIndexOf(inst_count_list,inst))
			{
				var inst_count_info = {inst_count:inst, class_list:[], super_class_list:[], classes_intersection:[], cycle_classes:[]};
				var inst_classes = _.filter(good_classes, function (c) { return inst == c.instanceCount})
				_.each(inst_classes, function(cl){
					inst_count_info.class_list = _.union(inst_count_info.class_list, cl.getClassName());
					inst_count_info.super_class_list = _.union(inst_count_info.super_class_list, cl.originalSuperClasses);
				})
				inst_count_info.classes_intersection = _.intersection(inst_count_info.class_list,inst_count_info.super_class_list);
				_.each(inst_classes, function(cl){
					if ( _.indexOf(inst_count_info.classes_intersection, cl.getClassName()) != -1 ||
						_.size(_.intersection(inst_count_info.classes_intersection,cl.originalSuperClasses)) > 0 ) 
							inst_count_info.cycle_classes = _.union(inst_count_info.cycle_classes,cl.getClassName())
				})
				if (_.size(inst_count_info.cycle_classes) > 1 )
					cycles_list = _.union(cycles_list,[inst_count_info.cycle_classes]);
			}	
		})
	}  

		_.each(cycles_list, function(new_cycle){
			var old_cycles = _.flatten(_.map(new_cycle, function(new_cycle_class){ return schema.findClassByName(new_cycle_class).cycle; }));
			var cycle = _.union(new_cycle,old_cycles);
			_.each(cycle, function(cc) {
				schema.findClassByName(cc).cycle = cycle;
			})
		})
	
	var tmp_cycles = {};
	_.each(this.Classes, function (cl){
		if (_.size(cl.cycle) > 1 ) {
			if (tmp_cycles[cl.cycle[0]])
				tmp_cycles[cl.cycle[0]].inst_count = _.max([tmp_cycles[cl.cycle[0]].inst_count,cl.instanceCount], function(e){ return e;}); 
			else
				tmp_cycles[cl.cycle[0]] = { cycle:cl.cycle, inst_count:cl.instanceCount};
		}			
	})

	var ii =1;
	var n = "_c";
	_.each(tmp_cycles, function(cc){
		var cycle_top_class = new VQ_Class({localName:n.concat(ii),namespace:schema.namespace,SuperClasses:[],instanceCount:cc.inst_count}, true);
		schema.addClass(cycle_top_class);
		_.each(cc.cycle, function(c) {
			c_class = schema.findClassByName(c);
			c_class.originalSuperClasses = _.union(c_class.originalSuperClasses,cycle_top_class.getClassName());
		})		
		var new_cycle = [];
		_.each(_.union(cycle_top_class.getClassName(),cc.cycle), function(c) {
			var cycle_class = schema.findClassByName(c);
			new_cycle = _.union(new_cycle,[{name:cycle_class.getClassName(),prefix:cycle_class.ontology.dprefix}])
		})
		_.each(new_cycle, function(c) {
			schema.findClassByName(c.name).cycle = new_cycle;
		})
		ii = ii + 1;
	})
	
	_.each(this.Classes, function (cl){
		if (_.size(cl.cycle) > 1 )
		{
			cl.cycleName = cl.cycle[0].name;
			var ii = 0;
			_.each(cl.cycle, function(c) { c.num = ii; ii = ii +1;});
			schema.Cycles[cl.cycleName] = cl.cycle;
		}							
	})
	
	if (_.size(schema.Cycles) > 0 ) {
		_.each(this.Classes, function(cl){     
			var cl_class = schema.findClassByNameAndCycle(cl.getClassName());
			var cl_name = cl_class.getClassName(); 
			_.each(cl.originalSuperClasses, function(cc){
				var cc_class = schema.findClassByNameAndCycle(cc);
				var cc_name = cc_class.getClassName(); 
				if (cl_class.localName != " " && cc_class.localName != " " && cl_name != cc_name)
					{ cl_class.fixedSuperClasses = _.union(cl_class.fixedSuperClasses, [cc_name]); }
				if (cl.getClassName() != cl_name && cc_name == cl_name)
					{ cl.fixedSuperClasses = _.union(cl.fixedSuperClasses, [cc_name]); }
			})
			if (_.size(cl.cycle) > 0 && !cl.isAbstract ) {
				cl.fixedSuperClasses = _.union(cl.fixedSuperClasses, [cl.cycleName]);	
			}
		})
	}
  },
  makeAttributesAndAssociations: function(data) {
	function makeAssoc(asoc, dual)
	{
		var newRole = new VQ_Role(asoc);
		newRole.dual = dual;
		schema.addRole(newRole);
		var new_cp = asoc.ClassPairs;
		var extensionMode = "none"
		if (schema.Data && schema.Data.Parameters)  
		{
			var pp = _.filter(schema.Data.Parameters, function(p){ return  p.name == "ExtensionMode" });
			if (_.size(pp) > 0 )
				extensionMode = pp[0].value;
		}
		//extensionMode = "none"  // ja grib tomēr nepaplašināto variantu
		//console.log("============== " + asoc.localName +"  =======================")
		//console.log(asoc)
		if (extensionMode== "simple" && dual == false)  // Te nav īsti skaidrs, ko darīt ar tiem, kas ir gan atribūti, gan asociācijas
		{
			if (asoc.SourceClassesDetailed && _.size(asoc.SourceClassesDetailed ) > 0)
			{
				_.each(asoc.SourceClassesDetailed, function(sc){
					var add = true		
					_.each(asoc.ClassPairs, function(cp){
						if (sc.classFullName == cp.SourceClass && sc.objectTripleCount <= cp.tripleCount)
							add = false
					})
					if (add == true && asoc.closedRange != true)
						new_cp = _.union(new_cp,{SourceClass:sc.classFullName,TargetClass:"",instanceCount:sc.tripleCount})
				})
			}

			if (asoc.TargetClassesDetailed && _.size(asoc.TargetClassesDetailed) > 0)
			{
				_.each(asoc.TargetClassesDetailed, function(sc){
					var add = true		
					_.each(asoc.ClassPairs, function(cp){
						if (sc.classFullName == cp.TargetClass && sc.tripleCount <= cp.tripleCount)
							add = false
					})
					if (add && asoc.closedDomain != true)
						new_cp = _.union(new_cp,{SourceClass:"",TargetClass:sc.classFullName,instanceCount:sc.tripleCount})
				})
			}
			//console.log("*********************", asoc.localName ,"*********************************")
			//console.log(asoc.ClassPairs)
			//console.log(new_cp)		
		}

		if (asoc.SourceClassesDetailed && _.size(asoc.SourceClassesDetailed ) > 0)
		{
			_.each(asoc.SourceClassesDetailed, function(sc){
				if ( asoc.objectTripleCount == sc.objectTripleCount)
					newRole.sourceClass = sc.classFullName
				_.each(new_cp, function(n){
					if ( n.SourceClass == sc.classFullName)
					{
						n.minCardinality = sc.minCardinality;
						n.maxCardinality = asoc.maxCardinality;
					}
				})
			})
		}
		if (asoc.TargetClassesDetailed && _.size(asoc.TargetClassesDetailed ) > 0)
		{
			_.each(asoc.TargetClassesDetailed, function(sc){
				if ( asoc.tripleCount == sc.tripleCount)
					newRole.targetClass = sc.classFullName
			})
		}
		//console.log("*********************", asoc.localName ,"*********************************")
		//console.log(newRole)
		
		//_.each(asoc.ClassPairs, function(cp){
		_.each(new_cp, function(cp){
			//var scClass = schema.findClassByNameAndCycle(cp.SourceClass);
			//var tClass = schema.findClassByNameAndCycle(cp.TargetClass);
		
			var scClass = schema.findClassByName(cp.SourceClass);
			var tClass = schema.findClassByName(cp.TargetClass);
			var newSchRole = new VQ_SchemaRole(asoc, cp, newRole);
			
			if ( !newRole.maxCardinality) { 
			  newRole.minCardinality = 0;  
			  newRole.maxCardinality = -1;
			}				

			if (cp.instanceCount)
			{
				newSchRole.instanceCount = cp.instanceCount;
				newSchRole.tripleCount = cp.instanceCount;
			}
			else if (cp.tripleCount)
			{
				newSchRole.instanceCount = cp.tripleCount;
				newSchRole.tripleCount = cp.tripleCount;
			}
				
			if (scClass.localName == tClass.localName) newSchRole.isSymmetric = true;
			schema.addSchemaRole(newSchRole);
			schema.addSchemaProperty(newSchRole);
			scClass.addProperty(newSchRole);
			createLink(newRole, newSchRole, "schemaRole", "role");
			//newRole["schemaRole"][newSchRole.ID] = newSchRole;
			createLink(scClass, newSchRole, "outAssoc", "sourceClass");
			//scClass["outAssoc"][newSchRole.ID] = newSchRole;
			//newSchRole["sourceClass"] = scClass.classInfo;
			createLink(tClass, newSchRole, "inAssoc", "targetClass");
			//tClass["inAssoc"][newSchRole.ID] = newSchRole;
			//newSchRole["targetClass"] = tClass.classInfo;
		})	
	}    
	
	_.each(data.Attributes, function(atr){
		var newAttr = new VQ_Attribute(atr);
	    schema.addAttribute(newAttr);
		//console.log("-------------------------")
		//console.log(atr)
		var uniqueSourceClasses = _.uniq(atr.SourceClasses);
		_.each(uniqueSourceClasses, function (sc){
			//var scClass = schema.findClassByNameAndCycle(sc);
			var scClass = schema.findClassByName(sc);
			var newSchAttr = new VQ_SchemaAttribute(atr);
			newSchAttr.maxCardinality = newAttr.maxCardinality;
			newSchAttr.minCardinality = newAttr.minCardinality;
			if (atr.SourceClassesDetailed && _.size(atr.SourceClassesDetailed) > 0)
			{
				var det = _.find(atr.SourceClassesDetailed, function (det) { return det.classFullName == sc || det.domain == sc })
				if ( det.minCardinality )
					newSchAttr.minCardinality = det.minCardinality;
			
				newSchAttr.instanceCount = det.tripleCount 
				if ( det.objectTripleCount )
					newSchAttr.objectTripleCount = det.objectTripleCount; 
				else
					newSchAttr.objectTripleCount = 0;
			}
			schema.addSchemaAttribute(newSchAttr);
			schema.addSchemaProperty(newSchAttr);
			scClass.addProperty(newSchAttr);
			createLink(newAttr, newSchAttr, "schemaAttribute", "attribute");
			//newAttr["schemaAttribute"][newSchAttr.ID] = newSchAttr;
			createLink(scClass, newSchAttr, "schemaAttribute", "sourceClass");
			//scClass["schemaAttribute"][newSchAttr.getID()] = newSchAttr;  
			//newSchAttr["sourceClass"] = scClass.classInfo;
		})
		if (atr.ClassPairs && _.size(atr.ClassPairs) > 0)
			makeAssoc(atr, true);
	})
	
	_.each(data.Associations, function(asoc){  
		makeAssoc(asoc, false);
	})
	
	_.each(schema.Attributes, function(attr) {
		_.each(attr.schemaAttribute, function(sc_attr) { sc_attr.isUnique = attr.isUnique; });
	})

	_.each(schema.Associations, function(assoc) {
		_.each(assoc.schemaRole, function(sc_assos) { sc_assos.isUnique = assoc.isUnique; });
	})

	_.each(data.Associations, function(asoc){
		_.each(asoc.ClassPairs, function(cp){
			if (cp.inverseRole)
			{
			  var schRole = schema.findSchemaRoleByName(asoc.localName, cp.SourceClass, cp.TargetClass);
			  var invSchRole = schema.findSchemaRoleByName(cp.inverseRole, cp.TargetClass, cp.SourceClass);
			  if (invSchRole)
				schRole.inverseSchemaRole = invSchRole;  
			}
		})
	})
	
	_.each(schema.Associations, function(asoc){
		_.each(asoc.schemaRole, function(schemaRole){
			if (!schemaRole.maxCardinality)
				schemaRole.maxCardinality = asoc.maxCardinality;
			if (!schemaRole.minCardinality)
				schemaRole.minCardinality = asoc.minCardinality;	
		})
	})

  },
  makeTreeMode: function() {
  
	var big_class_count = _.size( _.filter(schema.Classes, function (cl) { return cl.instanceCount > 4 && cl.localName != " "  }));
	if ( schema.classCount < 50 ) // !! Te varbūt jāpadomā kā drusku gudrāk atšķirot - jāpaskatās arī vidējais virsklašu skaits, ja ir zinams instanču skaits daļa iet nost
		schema.treeMode = { CompressLevel:0, RemoveLevel:-1, OwlRemoveLevel:-1, MaxDeep:10};
	else if ( schema.classCount < 100 )
		schema.treeMode = { CompressLevel:1, RemoveLevel:-1, OwlRemoveLevel:10, MaxDeep:6}; //schema.treeMode = { CompressLevel:1, RemoveLevel:5, MaxDeep:6};
	else if ( schema.classCount < 250 )
		schema.treeMode = { CompressLevel:2, RemoveLevel:-1, OwlRemoveLevel:10, MaxDeep:6};  
	else 
		schema.treeMode = { CompressLevel:2, RemoveLevel:-1, OwlRemoveLevel:-1, MaxDeep:6}; 
	 
	if (schema.Data.treeMode && schema.Data.treeMode.RemoveLevel) 
		schema.treeMode.RemoveLevel = parseInt(schema.Data.treeMode.RemoveLevel);
	if (schema.Data.treeMode && schema.Data.treeMode.MaxDeep) 
		schema.treeMode.MaxDeep = parseInt(schema.Data.treeMode.MaxDeep);
	if (schema.Data.treeMode && schema.Data.treeMode.ShowSubClassCount) 
		schema.treeMode.ShowSubClassCount = parseInt(schema.Data.treeMode.ShowSubClassCount);
	else 
		schema.treeMode.ShowSubClassCount = 0;
	//schema.treeMode = { CompressLevel:1, RemoveLevel:-1, MaxDeep:6};  // !!!! Testam   
  },
  makeSchemaTree: function() {

	ccc = 0  // Skaitītājs (tāds neinteliģents), lai koks nesanāk par lielu
	
	//Tomēr ir jāatstāj mazās klases, kurām nav virsklases (vai arī vienīgā virsklase ir rdfs:Resource vai owl:Thing), pieliku, lai nav arī apakšklašu 
	
	var classificators =  _.filter(schema.Classes, function (cl){ 
		var isGood = (_.size(cl.superClasses) == 1 && (_.toArray(cl.superClasses)[0].getClassName() == "rdfs:Resource" || _.toArray(cl.superClasses)[0].getClassName() == "owl:Thing" ) ? true:false);
		return (( _.size(cl.superClasses) == 0 || isGood ) && 
		         _.size(cl.subClasses) == 0 && cl.instanceCount < schema.treeMode.RemoveLevel && cl.instanceCount != 0 && cl.localName != " "); 
	});
	
	_.each(classificators, function(cl){cl.isClassificator = true;})

	var good_classes = _.filter(schema.Classes, function(cl) { return cl.instanceCount >= schema.treeMode.RemoveLevel &&  cl.localName != " "; });
	
	good_classes = _.union(good_classes,classificators);
	
	_.each(schema.Ontologies, function(ont) { ont.classCount = 0});
	_.each(good_classes, function(cl) { cl.ontology.classCount = cl.ontology.classCount+1;});
	var ontologies = _.filter(schema.Ontologies, function (ont) { return ont.classCount > 1 });
	
	if ( _.size(ontologies) == 1 || _.size(schema.Classes) <= const_small_schema ){
		//var ont_top_classes =  _.filter(good_classes, function (cl) { return _.size(cl.superClasses) == 0 } );
		var ont_top_classes =  _.filter(good_classes, function (cl){ 
			var ownSuperClasses = _.filter(cl.superClasses, function(c) { return  c.ontology.dprefix == cl.ontology.dprefix && !c.isAbstract || c.ontologies[cl.ontology.dprefix] && c.isAbstract;})
				return _.size(ownSuperClasses) == 0; });
		var top_classes_list = _.map(ont_top_classes, function(cl){
			return {name:cl.getClassName(), tr_name:makeTreeNodeLocalName(cl.getClassName()), parent_list:[], prefix:cl.ontology.dprefix, prefix2:cl.ontology.prefix, orderNum:2}; });
		top_classes_list = _.sortBy(top_classes_list, function(t){ return t.name;});
		top_classes_list = _.sortBy(top_classes_list, function(t){ return t.prefix2;});

		schema.Tree = makeSubTree(top_classes_list, 1);
	}
	else {
		ontologies = _.filter(schema.Ontologies, function (ont) { return ont.classCount > 1 && !ont.isDefault});
		ontologies = _.sortBy(ontologies, function(ont) {return -ont.classCount});
		ontologies = _.union(_.find(schema.Ontologies, function (ont) { return ont.isDefault}),ontologies);
		
		_.each(ontologies, function(ont){
			var tr_local_name = "";
			var ont_top_classes =  _.filter(good_classes, function (cl) { return cl.ontology.namespace == ont.namespace && !cl.isAbstract });
			ont_top_classes = _.union(ont_top_classes, _.filter(good_classes, function (cl) { return  cl.ontologies[ont.dprefix] && cl.isAbstract  }));
			
			ont_top_classes =  _.filter(ont_top_classes, function (cl){ 
				var ownSuperClasses = _.filter(cl.superClasses, function(c) { return  c.ontology.dprefix == ont.dprefix && !c.isAbstract || c.ontologies[ont.dprefix] && c.isAbstract;})
				return _.size(ownSuperClasses) == 0; });
		
			//ont_top_classes = _.union(ont_top_classes,_.filter(_.filter(good_classes, function (c) { return c.ontologies[ont.dprefix] && c.isAbstract }), function(cl) { return _.size(cl.superClasses) == 0}));	
		
			var top_class = new VQ_Class({localName:"_", namespace:ont.namespace, SuperClasses:[], instanceCount:ont.instanceCount}, true);
			schema.addClass(top_class);
			
			_.each(ont_top_classes, function(cl){
				if ( cl.cycleName == "" ){
					top_class.subClasses[cl.getID()] = cl; 
					cl.superClasses[top_class.getID()] = top_class; 
				}
				else {
					var cl_c = schema.findClassByName(cl.cycleName);
					top_class.subClasses[cl_c.getID()] = cl_c; 
					cl_c.superClasses[top_class.getID()] = top_class; 					
				}		
			})

			if (ont.isDefault) { tr_local_name = "(local):_";  }
			else { tr_local_name = ont.prefix.concat(":_");}
			var class_info = {name:top_class.getClassName(), tr_name:tr_local_name, parent_list:[], prefix:ont.dprefix, orderNum:2};
			schema.Tree =_.union(schema.Tree, makeSubTree([class_info],1));
		})

		ontologies = _.filter(schema.Ontologies, function (ont) { return ont.classCount == 1 });  // Tās tās kārnās
		if (_.size(ontologies) > 0)
		{
			var tree_node_id = schema.getNewIdString("__");
			var children = [];
			var ont_top_classes =  _.filter(good_classes, function (cl) { return cl.ontology.classCount == 1 && cl.localName != " " });
			_.each(ont_top_classes, function(cl){
				var subtree_node_id = schema.getNewIdString(cl.localName);
				var tr_local_name = makeTreeNodeLocalName(cl.getClassName());
				var class_info = {name:cl.getClassName(), tr_name:tr_local_name, parent_list:["Other classes"], prefix:cl.ontology.dprefix, orderNum:2};
				var child = makeSubTree([class_info], 2);
				children = _.union(children, child);
			})
			children = _.sortBy(children, function(c){ return c.localName; })
			var tree_node = {node_id:tree_node_id, data_id:"", localName:"Other classes", tree_path:"", deep:1, display:"none",
							children:children, ch_count:_.size(children)};
			schema.TreeList[tree_node_id] = tree_node;
			schema.Tree = _.union(schema.Tree, tree_node);
		}	
	}
	

	//schema.Tree = tree_list;
	//console.log(schema.Tree)
	//console.log(JSON.stringify(schema.Tree,0, 2))
	//Session.set("SSSS",JSON.stringify(schema.Tree,0, 2))
	//console.log(Session)
	//var tt = JSON.parse(JSON.stringify(schema.Tree,0, 2))
  },  
  getSHACL: function() {
    var pref_list = ["@prefix sh: <http://www.w3.org/ns/shacl#> .", "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> ."];
	 var newLine = "";
	_.each(this.Ontologies, function (o){
		pref_list = _.union( pref_list, newLine.concat("@prefix ", o.dprefix, ": <", o.namespace, "> ."));    
	})
	var cl_list = [];  
	
	_.each(schema.Classes, function(c){
		if (!c.isAbstract )
		{
			var c_name = c.getElementName();
			var sh_cl = [];
			
			sh_cl = _.union(sh_cl,[c_name]);
			sh_cl = _.union(sh_cl,["\ta sh:NodeShape ;"]);
			sh_cl = _.union(sh_cl,newLine.concat("\tsh:targetClass ", c_name, " ;"));
			
			var attr_list = [];
			
			 _.each(c.schemaAttribute, function(attr){  // !!! te iet pa shēmas atribūtiem
				var a = [];
				a = _.union(a,["\tsh:property ["]);
				a = _.union(a,newLine.concat("\t\tsh:path ", attr.getElementName(), " ;"));  
				a = _.union(a,newLine.concat("\t\tsh:minCount \"", attr.minCardinality, "\" ;"));
				var max = "*";
				if ( attr.maxCardinality != -1 ) max = attr.maxCardinality
				a = _.union(a,newLine.concat("\t\tsh:maxCount \"", max, "\" ;"));

				//if ( attr.objectTripleCount == 0 || attr.objectTripleCount == -1 )
				//	a = _.union(a,newLine.concat("\t\tsh:datatype \"", attr.attribute.type, "\" ;"));
				//else
				//	a = _.union(a,["\t\tsh:nodeKind sh:IRIOrLiteral ;"]);
				a = _.union(a,attr.attribute.sh_type);
				a = _.union(a,["\t\]"]);

				attr_list = _.union(attr_list,a.join("\r\n"));	
			})	

			function make_property(v1, v2, k1, k2){
				var l = [];	
				l = _.union(l,["\tsh:property ["]); 
				l = _.union(l,v1); 
				l = _.union(l,newLine.concat("\t\tsh:minCount \"", k1, "\" ;"));
				var max = "*";
				if ( k2 != -1 ) max = k2;
				l = _.union(l,newLine.concat("\t\tsh:maxCount \"", max, "\" ;"));
				l = _.union(l,v2); 
				l = _.union(l,["\t\]"]);
				return l.join("\r\n")
			}
			
			function transfom_assoc(assoc, v1_pref, v1_suf, class_poz, type){ 
				var attr_list = [];
				var link_names = {};

				_.each(assoc, function(link){ 
					if (!link_names[link.fullName] && ( type == "in" || (type == "out" && !link.role.dual ) ))
					{
						link_names[link.fullName] = 1;
						var l = [];	
						var v1 = newLine.concat(v1_pref, link.getElementName(), v1_suf);
						var k1 = link.minCardinality; 
						var k2 = link.maxCardinality;
						var v2 = "";	
						if (type == "out")
							v2 = link.role.sh_type;
						else 
							v2 = link.role.sh_inv_type;
							
						if ( v2 != "")
						{
							l = make_property(v1, v2, k1, k2);
							attr_list = _.union(attr_list,l);
						}
					}

				})				
				return attr_list;
			}
			
			attr_list = _.union(attr_list,transfom_assoc(c.outAssoc, "\t\tsh:path ", " ;", "targetClass", "out"));
			attr_list = _.union(attr_list,transfom_assoc(c.inAssoc, "\t\tsh:path \"^", "\" ;", "sourceClass", "in"));
			
			/*function transfom_assoc(assoc, v1_pref, v1_suf, class_poz, type){ 
				var attr_list = [];
				var link_names = {};

				_.each(assoc, function(link){ 
					if (!link_names[link.fullName])
					{
						link_names[link.fullName] = 1;
						var link_list = _.filter(assoc, function(o) {return o.fullName == link.fullName;});  
						var main_class = link.role[class_poz];
						if ( main_class )
							link_list  = _.filter(assoc, function(o) {return o.fullName == link.fullName && o[class_poz].fullName == main_class;}); 
						var tuksais = _.filter(link_list, function(o) {return o[class_poz].localName == " ";});

						var l = [];	
						var v1 = newLine.concat(v1_pref, link.getElementName(), v1_suf);
						var k1 = link.minCardinality; 
						var k2 = link.maxCardinality;
						var v2 = "";
						if (_.size(link_list) == 1 ) // && (type == "out" || ( type == "in" && link.isSymmetric != true)))
						{
							if (!link[class_poz].isAbstract)
								v2 = newLine.concat("\t\tsh:node ", link[class_poz].getElementName(), " ;");
							else
								v2 = ["\t\tsh:nodeKind sh:IRI ;"];  
						}
						else if ( _.size(link_list)  > 1 && _.size(tuksais) == 0 )
						{
							var cl_list = "";
							_.each(link_list, function(o){ cl_list = cl_list.concat("[sh:node ",o[class_poz].getElementName()," ] ") })
							v2 = newLine.concat("\t\tsh:or2 ( ", cl_list, ") ;");
						}
						else 
							v2 = ["\t\tsh:nodeKind sh:IRI ;"];  
							
						--else if (_.size(link_list) > 1 )
						{
							var link_list2 = _.filter(link_list, function(o) {return o[class_poz].localName != " ";});
							var tuksais = _.filter(link_list, function(o) {return o[class_poz].localName == " ";});
							var inst_c = 0;
							var cl_list = "";
							_.each(link_list2, function(o){ inst_c = inst_c + o.instanceCount; cl_list = cl_list.concat("[sh:node ",o[class_poz].getElementName()," ] ") })
							if ( _.size(tuksais) > 0 && tuksais[0].instanceCount != inst_c)  // Te skatās to summāro skaitu arī
								link_list2 = [];
							
							if ( type == "in")
							{
								var tuksais2 = _.filter(link.role.schemaRole, function(o) {return o[class_poz].localName == " ";});
								if ( _.size(tuksais2) > 0 ) 
									link_list2 = [];
							}
							
							if (_.size(link_list2) ==  1 )
								v2 = newLine.concat("\t\tsh:node ", link_list2[0][class_poz].getElementName(), " ;");
							else if (_.size(link_list2) > 1 )
								v2 = newLine.concat("\t\tsh:or ( ", cl_list, ") ;");
							else
								v2 = ["\t\tsh:nodeKind sh:IRI ;"]; 
						--} 
						if ( v2 != "")
						{
							l = make_property(v1, v2, k1, k2);
							attr_list = _.union(attr_list,l);
						}
					}

				})				
				return attr_list;
			} */
						
			if (_.size(c.superClasses) > 0 )
			{         
				var superClasses  = _.map(c.superClasses, function(sc) {  return sc.getElementName();  }).join(" ");
				attr_list = _.union(attr_list,newLine.concat("\tsh:and (\n", "\t\t", superClasses , "\n\t)"));
			}
			
			//if (link.sourceClass.getElementName() != link.targetClass.getElementName()) // Uz šo jāpaskatās, varbūt vairs nebūs būtiski (tas bija pretējam virzienam, lai nav uz sevi divas reizes)
			cl_list = _.union(cl_list,newLine.concat(sh_cl.join("\r\n"), "\n", attr_list.join(";\r\n")));
 
		}
	})
	
	var	info = newLine.concat( pref_list.join("\r\n"), "\r\n\r\n" , cl_list.join("\r\n.\r\n"), "\r\n.");
	
    var link = document.createElement("a"); 
	var file_name = _.find(schema.Ontologies, function(o) {return o.isDefault;}).dprefix.concat("_SHACL.txt")

	link.setAttribute("download", file_name);
	link.href = URL.createObjectURL(new Blob([info], {type: "application/json;charset=utf-8;"}));
	document.body.appendChild(link);
	link.click();
  },
  getOwlFormat: function() {
	var newLine = "";
	
	schema.OwlFormat["1_Ontologies"] = [];
	_.each(schema.Ontologies, function(ont){
		if (ont.isDefault) 
			schema.OwlFormat["1_Ontologies"] = _.union(schema.OwlFormat["1_Ontologies"], newLine.concat("Prefix(:=<",ont.namespace,">)"));
		else
			schema.OwlFormat["1_Ontologies"] = _.union(schema.OwlFormat["1_Ontologies"], newLine.concat("Prefix(",ont.prefix,":=<",ont.namespace,">)"));
	})
	if (!schema.Ontologies.owlc)
		schema.OwlFormat["1_Ontologies"] = _.union(schema.OwlFormat["1_Ontologies"], newLine.concat("Prefix(owlc:=<http://lumii.lv/2018/1.0/owlc#>)"));
	
	var def_ont = _.find(schema.Ontologies, function(o) {return o.isDefault});
	schema.OwlFormat["1_Ontologies"] = _.union(schema.OwlFormat["1_Ontologies"], [""]);
	schema.OwlFormat["1_Ontologies"] = _.union(schema.OwlFormat["1_Ontologies"], newLine.concat("Ontology(<", def_ont.namespace,">"));
	
	schema.OwlFormat["2_Common"] = [];
	schema.OwlFormat["3_Restriction"] = [];	
	schema.OwlFormat["4_Annotation"] = [];

	function checkInstances(cl) { return cl.instanceCount >= schema.treeMode.OwlRemoveLevel || cl.isClassificator};	
	_.each(schema.Classes, function(cl){
		if (!cl.isAbstract && checkInstances(cl))
		{
			cl_name = cl.getElementOntName();
			schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"], newLine.concat("Declaration(Class(",cl_name,"))"));
			if (cl.instanceCount > 0)
			{			
				schema.OwlFormat["4_Annotation"] = _.union(schema.OwlFormat["4_Annotation"],newLine.concat("AnnotationAssertion(owlc:instanceCount ",cl_name,' "',cl.instanceCount,'"^^xsd:integer )'));  
			}	
			if (_.size(cl.originalSubClasses) > 0)
			{
				_.each(cl.originalSubClasses, function(sc_full_name) {
					sc_name = schema.findClassByName(sc_full_name).getElementOntName();
					if (checkInstances(cl) && checkInstances(schema.findClassByName(sc_full_name)))
						schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",sc_name," ",cl_name,")"));
				}) 
			}			
		}
	})
	
	_.each(schema.Cycles, function(cycle){
		var cycle_classes = [];
		for (i = 1; i < _.size(cycle); i++) { 
			var cycle_class = schema.findClassByName(cycle[i].name)
			if (checkInstances(cycle_class))
				cycle_classes = _.union(cycle_classes, cycle_class.getElementOntName());
		}
		if (_.size(cycle_classes) > 1 )
			schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"], newLine.concat("EquivalentClasses(",cycle_classes.join(" "),")"));
	})
	
	function getOwlName(el) { return el.ontology.prefix.concat(":",el.localName)};
	
	_.each(schema.Attributes, function(el){
		if (el.localName != " ")
		{
			var atrr_source_classes = _.map( _.filter(el.schemaAttribute, function(s) {return checkInstances(s.sourceClass) }), function(e) { return getOwlName(e.sourceClass);} );
			if (_.size(atrr_source_classes) > 0 ) {
				schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("Declaration(DataProperty(",getOwlName(el),"))"));
				if (el.type)
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("DataPropertyRange(",getOwlName(el)," ",el.type,")"));
				
				var type_string = (el.type ? el.type: "");  
				// Te ir arī manas pierēķinātās vērtības, ne tikai sākotnējās.
				_.each(atrr_source_classes, function (cl) {
					if ( el.minCardinality == el.maxCardinality) {
						schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataExactCardinality(",el.minCardinality," ",getOwlName(el)," ",type_string,"))"));
					}
					else {
						schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataMinCardinality(",el.minCardinality," ",getOwlName(el)," ",type_string,"))"));
						if (el.maxCardinality!= -1)
							schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataMaxCardinality(",el.maxCardinality," ",getOwlName(el)," ",type_string,"))"));
					}					
				})				

			}	
			
			if  (_.size(atrr_source_classes) == 1 ) {
				schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("DataPropertyDomain(",getOwlName(el)," ",atrr_source_classes[0],")"));
				if (el.type){
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("DataPropertyRange(",getOwlName(el)," ",el.type,")"));
					schema.OwlFormat["4_Annotation"] = _.union(schema.OwlFormat["4_Annotation"],newLine.concat("AnnotationAssertion(Annotation(owlc:target " ,el.type,") owlc:source ",getOwlName(el)," ",atrr_source_classes[0],")"));
					//schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("SubClassOf(",atrr_source_classes[0]," DataAllValuesFrom(",getOwlName(el)," ",el.type,"))")); // !!! bija aizkomentēts
				}
			}	
			else if  (_.size(atrr_source_classes) > 1 ) { 
				schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("DataPropertyDomain(",getOwlName(el)," ObjectUnionOf(",atrr_source_classes.join(" "),"))"));
				if (el.type)
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("DataPropertyRange(",getOwlName(el)," ",el.type,")"));
					_.each(atrr_source_classes, function (cl) {
						schema.OwlFormat["4_Annotation"] = _.union(schema.OwlFormat["4_Annotation"],newLine.concat("AnnotationAssertion(Annotation(owlc:target " ,el.type,") owlc:source ",getOwlName(el)," ",cl,")"));
						//schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("SubClassOf(",cl," DataAllValuesFrom(",getOwlName(el)," ",el.type,"))")); // !!! bija aizkomentēts
					}) 
			}

			/*
			_.each(atrr_source_classes, function (cl) {
				if ( el.minCardinality == el.maxCardinality) {
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataExactCardinality(",el.minCardinality," ",getOwlName(el),"))"));
				}
				else {
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataMinCardinality(",el.minCardinality," ",getOwlName(el),"))"));
					if (el.maxCardinality!= -1)
						schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," DataMaxCardinality(",el.maxCardinality," ",getOwlName(el),"))"));
				} 
			})  */
		}			
	})
	
	var str = "";
	// !!! Ja ir vairāki klašu pāri bez target klases, tad iespējams nestrādās

	_.each(schema.Associations, function(el){
		var schemaRoles = _.filter( el.schemaRole, function(s) { return checkInstances(s.sourceClass) || checkInstances(s.targetClass)} );
		var source_classes = [];
		var target_classes = [];
		_.each(schemaRoles, function (s) {
			if ( checkInstances(s.sourceClass)) 
				source_classes = _.union(source_classes, getOwlName(s.sourceClass));
			if (s.targetClass.localName != " " && checkInstances(s.targetClass) )
				target_classes = _.union(target_classes, getOwlName(s.targetClass));
		})
		if (_.size(schemaRoles) > 0 && _.size(source_classes) && el.localName != " ") {

			schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("Declaration(ObjectProperty(",getOwlName(el),"))"));
			
			var source_classes_list = ( _.size(source_classes) == 1 ? source_classes[0] : str.concat("ObjectUnionOf(",source_classes.join(" "),")"));
			var target_classes_list = ( _.size(target_classes) == 1 ? target_classes[0] : str.concat("ObjectUnionOf(",target_classes.join(" "),")"));
			
			schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("ObjectPropertyDomain(",getOwlName(el)," ",source_classes_list,")"));
			if (target_classes_list != ": " && target_classes_list != "ObjectUnionOf()")
				schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("ObjectPropertyRange(",getOwlName(el)," ",target_classes_list,")"));
				
			_.each(source_classes, function(source_class){
				var target_cl = [];
				_.each(schemaRoles, function (s) {
					if (getOwlName(s.sourceClass) == source_class)
						if (s.targetClass.localName != " ")
							target_cl = _.union(target_cl, getOwlName(s.targetClass));
				})
				var target_cl_list = ( _.size(target_cl) == 1 ? target_cl[0] : str.concat("ObjectUnionOf(",target_cl.join(" "),")"));
				if (_.size(target_cl) > 0 )
					schema.OwlFormat["3_Restriction"] = _.union(schema.OwlFormat["3_Restriction"],newLine.concat("SubClassOf(",source_class," ObjectAllValuesFrom(",getOwlName(el)," ",target_cl_list, "))"));
			})	
			
			_.each(schemaRoles, function (s) {
				if (s.targetClass.localName != " " )
					schema.OwlFormat["4_Annotation"] = _.union(schema.OwlFormat["4_Annotation"],newLine.concat("AnnotationAssertion(Annotation(owlc:target ", getOwlName(s.targetClass),") owlc:source ",getOwlName(el)," ",getOwlName(s.sourceClass),")"));
			})
			
			// !!! Te būs jāprecizē, jasameklē sākotnējās
			_.each(source_classes, function (cl) {
				schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," ObjectMinCardinality(",el.minCardinality," ",getOwlName(el),"))"));
				if (el.maxCardinality!= -1)
					schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("SubClassOf(",cl," ObjectMaxCardinality(",el.maxCardinality," ",getOwlName(el),"))"));
			}) 
		}
	}) 
	
	schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("Declaration(AnnotationProperty(owlc:source))"));
	schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("Declaration(AnnotationProperty(owlc:target))"));
	schema.OwlFormat["2_Common"] = _.union(schema.OwlFormat["2_Common"],newLine.concat("Declaration(AnnotationProperty(owlc:instanceCount))"));

	//console.log(schema.OwlFormat)
  },
  
  printClasses: function(){
  	var newLine = "";
	var rezult = [];
	var vk = "";
	
	_.each(schema.Classes, function(c){
		if (!c.isAbstract )
		{
			if (_.size(c.originalSuperClasses)>0 &&   c.originalSuperClasses[0] =="owl:Thing")
				vk = "Thing";
			else
				vk = "Other";
			rezult = _.union(rezult,newLine.concat(c.localName,";",c.ontology.isDefault,";",c.instanceCount,";",
		     c.ontology.dprefix,";",_.size(c.inAssoc),";",_.size(c.outAssoc),";",_.size(c.properties),";",vk,";",
			 _.size(c.superClasses),";",_.size(c.allSuperClasses),";",_.size(c.subClasses),";",_.size(c.allSubClasses),";",c.fullName));
		}

	})
	var link = document.createElement("a"); 
	var file_name = "rr.csv";
	link.setAttribute("download", file_name);
	link.href = URL.createObjectURL(new Blob([rezult.join("\r\n")], {type: "application/json;charset=utf-8;"}));
	document.body.appendChild(link);
	link.click();
  },
  printOwlFormat: function(par) {
  	
	schema.getOwlFormat();
	var owl_list = "";	
	
	if ( par == 1 )
		owl_list = _.union(schema.OwlFormat["1_Ontologies"],[""],schema.OwlFormat["2_Common"],[""],schema.OwlFormat["3_Restriction"],[""],[")"]); 
	else if ( par == 2)
		owl_list = _.union(schema.OwlFormat["1_Ontologies"],[""],schema.OwlFormat["2_Common"],[""],schema.OwlFormat["4_Annotation"],[""],[")"]); 
	else
		owl_list = _.union(schema.OwlFormat["1_Ontologies"],[""],schema.OwlFormat["2_Common"],[""],schema.OwlFormat["3_Restriction"],[""],schema.OwlFormat["4_Annotation"],[""],[")"]); 	
	
	var link = document.createElement("a");
	var file_name = _.find(schema.Ontologies, function(o) {return o.isDefault;}).dprefix.concat(".owl")
	link.setAttribute("download", file_name);
	link.href = URL.createObjectURL(new Blob([owl_list.join("\r\n")], {type: "application/json;charset=utf-8;"}));
	document.body.appendChild(link);
	link.click();
  },
  FindInstancesCount: function(){
 	_.each(schema.Classes, function(c){
		if (!c.isAbstract )
		{
			var sparql = "SELECT (COUNT(?CC) AS ?AA) WHERE{ ?CC a <"+ c.fullName + ">}"
			schema.FindInstanceCount(c,sparql);
		} 	
	});
  },
  FindInstanceCount: function(class_data, sparql) {

  var paging_info = null;
  var graph_iri = "";
  var endpoint = "http://185.23.162.167:8833/sparql";

  var proj = Projects.findOne({_id: Session.get("activeProject")});

  if (proj && proj.endpoint) {
    if (proj.uri) {graph_iri = proj.uri;}
    endpoint = proj.endpoint;
  } else {
    Interpreter.showErrorMsg("Project endpoint not properly configured", -3);
    return;
  };

  var list = {projectId: Session.get("activeProject"),
              versionId: Session.get("versionId"),
              options: {
                        params: {
                               params: {
                                     "default-graph-uri": graph_iri,
                                      query: sparql,
                               },
                        },
						endPoint: endpoint,
						endpointUsername: proj.endpointUsername,
						endpointPassword: proj.endpointPassword,
                        paging_info: paging_info
              },
           };
	Utilities.callMeteorMethod("executeSparql", list, function(res) {
    if (res.status == 200) {
        var fields = _.map(res.result.sparql.head[0].variable, function(v) {
            return v["$"].name;
          });

          var csv_table = _.map(res.result.sparql.results[0].result, function(result_item) {
             var csv_row = {};
             _.forEach(fields, function(field) {
               var result_item_attr = _.find(result_item.binding, function(attr) {return attr["$"].name==field});
               var obj = {};
               if (result_item_attr) {
                 if (result_item_attr.literal) {
                   if (result_item_attr.literal[0]._) {
                      obj[field] = result_item_attr.literal[0]._;
                   } else {
                      obj[field] = result_item_attr.literal[0];
                   };

                 } else {
                   if (result_item_attr.uri) {
                     obj[field] = result_item_attr.uri[0];
                   } else {
                     obj[field] = null;
                   };
                 };
               } else {
                 obj[field] = undefined;
               };
               _.extend(csv_row,obj);
             });
            return csv_row;
          });
		  console.log(csv_table[0]["AA"]);
		  class_data.instanceCount = csv_table[0]["AA"];
    } 
  });
  },
  FindAttrCount: function(attr_data, class_info) {

  var sparql = [];

	var attr = null;
	for (i = 0; i < 50; i++) 
	{
		attr = attr_data[i];
		sparql = _.union(sparql,["{ SELECT \""+attr.name+"\" AS ?NN (COUNT(?Cl) AS ?AA) WHERE{ ?Cl a :"+class_info.localName+". ?Cl :"+attr.name+" ?attr.}}"]);
	}
	sparql = sparql.join("\r\n UNION \r\n")
	sparql = "PREFIX : <"+ class_info.ontology.namespace+"> SELECT * WHERE { " + sparql;
	sparql = sparql + "\r\n}";
	console.log(sparql);

  var paging_info = null;
  var graph_iri = "";
  var endpoint = "http://185.23.162.167:8833/sparql";

  var proj = Projects.findOne({_id: Session.get("activeProject")});

  if (proj && proj.endpoint) {
    if (proj.uri) {graph_iri = proj.uri;}
    endpoint = proj.endpoint;
  } else {
    Interpreter.showErrorMsg("Project endpoint not properly configured", -3);
    return;
  };

  var list = {projectId: Session.get("activeProject"),
              versionId: Session.get("versionId"),
              options: {
                        params: {
                               params: {
                                     "default-graph-uri": graph_iri,
                                      query: sparql,
                               },
                        },
						endPoint: endpoint,
						endpointUsername: proj.endpointUsername,
						endpointPassword: proj.endpointPassword,
                        paging_info: paging_info
              },
           };
	Utilities.callMeteorMethod("executeSparql", list, function(res) {
    if (res.status == 200) {
        var fields = _.map(res.result.sparql.head[0].variable, function(v) {
            return v["$"].name;
          });

          var csv_table = _.map(res.result.sparql.results[0].result, function(result_item) {
             var csv_row = {};
             _.forEach(fields, function(field) {
               var result_item_attr = _.find(result_item.binding, function(attr) {return attr["$"].name==field});
               var obj = {};
               if (result_item_attr) {
                 if (result_item_attr.literal) {
                   if (result_item_attr.literal[0]._) {
                      obj[field] = result_item_attr.literal[0]._;
                   } else {
                      obj[field] = result_item_attr.literal[0];
                   };

                 } else {
                   if (result_item_attr.uri) {
                     obj[field] = result_item_attr.uri[0];
                   } else {
                     obj[field] = null;
                   };
                 };
               } else {
                 obj[field] = undefined;
               };
               _.extend(csv_row,obj);
             });
            return csv_row;
          });
		  
		  console.log("******************************");
		  console.log(csv_table);
		  //var ii = 0
		  //_.each(attr_data, function(attr){
			//	attr.instanceCount = csv_table[ii]["AA"]
			//	ii = ii + 1;
		  // });
		  //console.log("******************************");
		  //console.log(attr_data);
    } 
  });
  }
 }

function findName(name, element) {
  if (element && (element.localName == name || element.fullName == name || 
     element.ontology.prefix + ":" + element.localName == name || element.ontology.dprefix + ":" + element.localName == name )) return true;
  return false;
}

function findPrefix(arr, pos) {
  if (arr[pos] == "" ) return findPrefix(arr, pos-1);
  if (!isNaN(arr[pos][0])) return findPrefix(arr, pos-1);
  return arr[pos].split("#")[0];
}

VQ_ontology = function (URI, prefix) {
  if ( URI.endsWith("/#"))
    URI = URI.substring(0, URI.length -1);
  if ( URI.endsWith(":"))
    URI = URI.substring(0, URI.length -1);
  this.namespace = URI;
  this.elementCount = 1;
  this.classCount = 0;
  this.instanceCount = 0;
  p = "";
  this.namesAreUnique = true;
  if (prefix) 
  {
    prefix = prefix.replace(":","");
    p = prefix;
  }
  else {
    p = findPrefixFromList(URI)
    if ( p == null )
	{
	  var arr = URI.split("/");
	  p = schema.checkOntologyPrefix(findPrefix(arr, _.size(arr)-1));
	  if ( p.endsWith(".owl"))
		p = p.substring(0, p.length -4 );
	  p =  p.split(".").join("_");	
	}
  }
  if (schema.namespace == URI) {
   this.isDefault = true;
   this.prefix = "";
   this.dprefix = p;
  }
  else {
    this.isDefault = false;
	this.prefix = p;
	this.dprefix = p;
  }
};

VQ_ontology.prototype = {
  constructor:VQ_ontology,
  namespace: null,
  prefix: null,
  dprefix: null,
  elementCount: null,
  classCount:null,
  instanceCount: null,
  isDefault: null,
  namesAreUnique:null
}

VQ_Elem = function (elemInfo, elemType){
    var localName = " ";
	var fullName = " ";
	this.Info = elemInfo;
	this.isUnique = true;
    if (elemInfo.localName) localName = elemInfo.localName;
	//this.ID = schema.getNewIdString(localName) + " (" + elemType + ")";
	this.localName = localName;
	this.triplesMaps = [];
	var uri = null;

	if (elemInfo.namespace && elemInfo.namespace != "" ) uri = elemInfo.namespace;
	else if (elemInfo.fullName && elemInfo.fullName != elemInfo.localName ) uri = elemInfo.fullName.substring(0, elemInfo.fullName.length- elemInfo.localName.length);
	else uri = schema.namespace;

	if (elemInfo.instanceCount)
		this.instanceCount = parseInt(elemInfo.instanceCount);
	else if (elemInfo.tripleCount)
		this.instanceCount = parseInt(elemInfo.tripleCount);
	else
		this.instanceCount = -1;
	
	if (elemInfo.tripleCount != null)
		this.tripleCount = parseInt(elemInfo.tripleCount);
	else 
		this.objectTripleCount = -1;
	
	if (elemInfo.objectTripleCount != null)
		this.objectTripleCount = parseInt(elemInfo.objectTripleCount);
	else 
		this.objectTripleCount = -1;
	
	var ontology = schema.ontologyExist(uri);
	if (ontology) { this.ontology = ontology }
	else {
	  ontology = new VQ_ontology(uri, elemInfo.prefix);
	  schema.addOntology(ontology);
	  this.ontology = ontology;
	}
	
	this.ID = ontology.prefix + ":" + localName + " (" + elemType + ") " + schema.getNewIdString();
	
		
	if (elemInfo.fullName) fullName = elemInfo.fullName;
	else fullName = this.ontology.namespace + localName;
	this.fullName = fullName;

  };

VQ_Elem.prototype = {
  constructor: VQ_Elem,
  ID: null,
  localName: null,
  fullName: null,
  ontology: null,
  isUnique: null,
  instanceCount: null,
  objectTripleCount: null,
  triplesMaps: null,
  getID: function() { return this.ID },
  getElemInfo: function() {
    if (this.localName == " ") return {};
	return {localName:this.localName, URI:this.fullName, Namespace:this.ontology.namespace,
			Prefix:this.ontology.prefix, DefaultNamespace:schema.namespace, triplesMaps:this.triplesMaps, short_name:this.getElementShortName()};  
  },
  getElementName : function (){
	return this.ontology.dprefix + ":" + this.localName; 
  },
  getElementShortName : function (){  
	return schema.getElementShortName(this);
  },
  getElementOntName : function (){
	return this.ontology.prefix + ":" + this.localName; 
  }
}

VQ_Class = function (classInfo, isAbstract = false){
    VQ_Elem.call(this, classInfo, "class");
	this.isAbstract = isAbstract;
	this.ontologies = {};
	this.superClasses = {};
	this.originalSuperClasses = classInfo.SuperClasses;
	this.originalAllSuperClasses = [];
	this.originalSubClasses = [];
	this.originalAllSubClasses = [];
	this.fixedSuperClasses = [];
    this.subClasses = {};
    this.allSuperClasses = {};
    this.allSubClasses = {};
	this.allSuperSubClasses = {};
	this.allSuperSubSuperClasses = {};
	this.schemaAttribute = {};
	this.inAssoc = {};
	this.outAssoc = {};
	this.properties = {};
	this.cycle = [];
	this.cycleName = "";
	this.tree = [];
	this.tree_nodes = [];
	this.tree_path = "";
	this.isInTree = false;
	this.isVisited = false;
	this.allAttributes = [];
	this.allAssociations = []  
	
	var named_elements = {};
	named_elements = _.extend(_.extend(_.extend(named_elements,schema.Classes),schema.Attributes),schema.Associations);
	var e = _.find(named_elements, function(el){ if ( el.localName == classInfo.localName ) { return el; }; }) 
	if ( e && e.localName == classInfo.localName ){
	  this.isUnique = false;
	  e.isUnique = false;
	  this.ontology.namesAreUnique = false;
	  e.ontology.namesAreUnigue = false;
	}
	this.ontology.classCount = this.ontology.classCount + 1;
	schema.classCount = schema.classCount +1;
};

VQ_Class.prototype = Object.create(VQ_Elem.prototype);
VQ_Class.prototype.constructor = VQ_Class;
VQ_Class.prototype.isAbstract - null;
VQ_Class.prototype.classInfo = null;
VQ_Class.prototype.ontologies = null;
VQ_Class.prototype.superClasses = null;
VQ_Class.prototype.originalSuperClasses = null;
VQ_Class.prototype.originalAllSuperClasses = null;
VQ_Class.prototype.originalSubClasses = null;
VQ_Class.prototype.originalAllSubClasses = null;
VQ_Class.prototype.fixedSuperClasses = null;
VQ_Class.prototype.subClasses = null;
VQ_Class.prototype.allSuperClasses = null;
VQ_Class.prototype.allSubClasses = null;
VQ_Class.prototype.allSuperSubClasses = null;
VQ_Class.prototype.allSuperSubSuperClasses = null;
VQ_Class.prototype.schemaAttribute = null;
VQ_Class.prototype.inAssoc = null;
VQ_Class.prototype.outAssoc = null;
VQ_Class.prototype.properties = null;
VQ_Class.prototype.cycle = null;
VQ_Class.prototype.cycleName = null;
VQ_Class.prototype.tree = null;
VQ_Class.prototype.tree_nodes = null;
VQ_Class.prototype.tree_path = null;
VQ_Class.prototype.isInTree = null;
VQ_Class.prototype.isVisited = null;
VQ_Class.prototype.allAttributes = null;
VQ_Class.prototype.allAssociations = null; 
VQ_Class.prototype.getAssociations = function() {
	var out_assoc =  _.map(this.outAssoc, function (a) {
				var maxCard = a.maxCardinality;
				if (!maxCard) maxCard = a.role.maxCardinality;
				var className = a.targetClass.localName;
				if (className == " ") className = "";
				return {name: a.localName, isUnique:a.isUnique, prefix:a.ontology.prefix, isDefOnt:a.ontology.isDefault, class: className , type: "=>", 
						maxCard: a.maxCardinality, short_name:a.getElementShortName(), short_class_name:a.targetClass.getElementShortName(), instanceCount:a.instanceCount}; });
    _.each(this.inAssoc, function (a) {
				var maxCard = a.maxCardinality;
				if (!maxCard) maxCard = a.role.maxCardinality;
				var className = a.targetClass.localName;
				if (className == " ") className = "";
				if ( _.size(a.inverseSchemaRole ) == 0 && !a.isSymmetric)
					out_assoc = _.union(out_assoc, 
					{name: a.localName, isUnique:a.isUnique, prefix:a.ontology.prefix, isDefOnt:a.ontology.isDefault, class: className , type: "<=", 
					maxCard: a.maxCardinality, short_name:a.getElementShortName(), short_class_name:a.sourceClass.getElementShortName(), instanceCount:a.instanceCount});
				});
    return out_assoc;
  };
VQ_Class.prototype.getClassName = function (){
	return this.ontology.dprefix + ":" + this.localName; 
  };
VQ_Class.prototype.getAllAssociations = function(paz = true) { 
	if (druka)  console.log("Funkcijas izsaukums - getAllAssociations" + " " + this.localName);
	if (_.size(this.allAssociations) > 0)
	{
		if (druka) console.log(this.allAssociations)
		return this.allAssociations;
	}
	var assoc = this.getAssociations();  
	_.each(this.allSuperSubSuperClasses, function(sc){
		if (paz && sc.isAbstract)
			assoc = _.union(assoc, sc.getAllAssociations(false));
		else	
			assoc = _.union(assoc, sc.getAssociations());
	})
	assoc = _.sortBy(assoc, "name");  
	assoc = assoc.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['short_name'] === obj['short_name'] &&  t['type'] === obj['type'] &&  
											t['class'] === obj['class']  && t['short_class_name'] === obj['short_class_name']});
				});
	this.allAssociations = assoc;
	if (druka) console.log(this.allAssociations)
	return assoc;
  };
VQ_Class.prototype.getAttributes = function() {  
	return _.map(this.schemaAttribute, function (a) {
		return {name:a.localName, isUnique:a.isUnique, prefix:a.ontology.prefix, isDefOnt:a.ontology.isDefault, short_name:a.getElementShortName(), instanceCount:a.instanceCount}; });
  };

VQ_Class.prototype.getAllAttributes = function(paz = true) {
	if (druka)  console.log("Funkcijas izsaukums - getAllAttributes" + " " + this.localName); 
	if (_.size(this.allAttributes) > 0)
	{
		if (druka) console.log(this.allAttributes)
		return this.allAttributes;
	}
	var attributes = this.getAttributes(); 
	_.each(this.allSuperSubSuperClasses, function(sc){
		if (paz && sc.isAbstract)
			attributes = _.union(attributes, sc.getAllAttributes(false));
		else
			attributes = _.union(attributes, sc.getAttributes());
	})
	attributes = _.sortBy(attributes, function(a) { return a.name}); 
	attributes = attributes.filter(function(obj, index, self) { 
				return index === self.findIndex(function(t) { return t['short_name'] === obj['short_name'] });
			});

	//var class_info = this;
	//_.each(attributes, function(attr){
	//	var sparql = "PREFIX : <"+class_info.ontology.namespace+"> SELECT  (COUNT(?Cl) AS ?AA) WHERE{ ?Cl a :"+class_info.localName+". ?Cl :"+ attr.name+" ?attr.}";
	//	console.log(sparql)
	//	schema.FindInstanceCount(attr,sparql);	
	// })
	// **** VQ_Schema_copy.FindAttrCount(attributes,this);
	this.allAttributes = attributes;
	if (druka) console.log(this.allAttributes)
	return attributes;
  };
VQ_Class.prototype.addSubClass = function(subClass) {
	this.subClasses[subClass.getID()] = subClass;
  };
VQ_Class.prototype.addSuperClass = function(superClass) {
	this.superClasses[superClass.getID()] = superClass;
  };
VQ_Class.prototype.addProperty = function(property) {
	this.properties[property.getID()] = property;
  };
VQ_Class.prototype.addAllSubClasses = function() {
	this.allSubClasses = collectClasses(this, "allSubClasses", "subClasses")
  };
VQ_Class.prototype.addAllSuperClasses = function() {
	this.allSuperClasses = collectClasses(this, "allSuperClasses", "superClasses")
  };
VQ_Class.prototype.getClassInfo = function() {
  return this.getElemInfo();
  };

VQ_Attribute = function (attrInfo){
	VQ_Elem.call(this, attrInfo, "attribute");
	this.schemaAttribute = {}; 
	var type = attrInfo.type;  // !!! Šeit vajadzētu tā elegantāk pārvērst
	if (type == "XSD_STRING" || type == "xsd_langString" || type == "xsd_string") type = "xsd:string";
	if (type == "XSD_DATE") type = "xsd:date";
	if (type == "XSD_DATE_TIME") type = "xsd:dateTime";

	var tripleCountSum = 0
	var sh_type = "";
	var t = "";
	if (attrInfo.dataTypes)
	{
		this.dataTypes = attrInfo.dataTypes;
		_.each(attrInfo.dataTypes, function(tt){
			tripleCountSum = tripleCountSum + tt.tripleCount;
			sh_type = sh_type.concat("[sh:datatype ",tt.dataType,"] ");
			if ( tt.tripleCount == attrInfo.tripleCount)
				type = tt.dataType;   
		})
	}
	if (type != undefined)
		this.type = type;
	if ( _.size(attrInfo.dataTypes) == 0 && type != undefined)   
		this.sh_type = t.concat("\t\tsh:datatype ",type);
	else if ( _.size(attrInfo.dataTypes) == 0 && type == undefined)   
		this.sh_type = "\t\tsh:nodeKind sh:IRI";
	else if (tripleCountSum == attrInfo.tripleCount && _.size(attrInfo.dataTypes) == 1)   
		this.sh_type = t.concat("\t\tsh:datatype ",type);
	else if (tripleCountSum == attrInfo.tripleCount && _.size(attrInfo.dataTypes) > 1)
		this.sh_type = t.concat("\t\tsh:or ( ", sh_type, ") ;");
	else if (sh_type != "")
		this.sh_type = t.concat("\t\tsh:or ( ", sh_type, "[sh:nodeKind sh:IRI]) ;");
	else
		this.sh_type = "\t\tsh:nodeKind sh:IRI";
	
			
	//console.log("--------------------------------------")
	//console.log(attrInfo.localName)
	//console.log(attrInfo.dataTypes)
	//console.log(attrInfo.tripleCount)
	//console.log(tripleCountSum)
	//console.log(this.sh_type)
		
	//var e = schema.findAttributeByName(attrInfo.localName);  
	var named_elements = {};
	named_elements = _.extend(_.extend(_.extend(named_elements,schema.Classes),schema.Attributes),schema.Associations);
	var e = _.find(named_elements, function(el){ if ( el.localName == attrInfo.localName ) { return el; }; })  	
	if ( e && e.localName == attrInfo.localName ){
	  this.isUnique = false;
	  e.isUnique = false;
	  this.ontology.namesAreUnique = false;
	  e.ontology.namesAreUnigue = false;
	}
	
	if (attrInfo.maxCardinality || attrInfo.minCardinality) {
	  this.minCardinality = findCardinality(attrInfo.minCardinality, "MIN");
	  this.maxCardinality = findCardinality(attrInfo.maxCardinality, "MAX");
	}
	else {
	  this.minCardinality = 0;
	  this.maxCardinality = 1;
	}
};

VQ_Attribute.prototype = Object.create(VQ_Elem.prototype);
VQ_Attribute.prototype.constructor = VQ_Attribute;
VQ_Attribute.prototype.schemaAttribute = null;
VQ_Attribute.prototype.type = null;
VQ_Attribute.prototype.minCardinality = null;
VQ_Attribute.prototype.maxCardinality = null;
VQ_Attribute.prototype.getAttrInfo = function() {
  var rez = {minCardinality:this.minCardinality, maxCardinality:this.maxCardinality};
  if (this.type) return _.extend( rez, {type:this.type});
  else return rez;
  };
VQ_Attribute.prototype.getAttributeInfo = function() {
  return _.extend(this.getElemInfo(), this.getAttrInfo());
  };


VQ_SchemaAttribute = function (attrInfo){
	VQ_Elem.call(this, attrInfo, "schemaAttribute");
	this.attribute = {};
	this.sourceClass = {};
};

VQ_SchemaAttribute.prototype = Object.create(VQ_Elem.prototype);
VQ_SchemaAttribute.prototype.constructor = VQ_SchemaAttribute;
VQ_SchemaAttribute.prototype.attribute = null;
VQ_SchemaAttribute.prototype.sourceClass = null;
VQ_SchemaAttribute.prototype.minCardinality = null;
VQ_SchemaAttribute.prototype.maxCardinality = null;


VQ_Role = function (roleInfo){
	VQ_Elem.call(this, roleInfo, "role");
	this.schemaRole = {};
	//var e = schema.findAssociationByName(roleInfo.localName);  
	var named_elements = {};
	named_elements = _.extend(_.extend(_.extend(named_elements,schema.Classes),schema.Attributes),schema.Associations);
	var e = _.find(named_elements, function(el){ if ( el.localName == roleInfo.localName ) { return el; }; }) 
	if ( e && e.localName == roleInfo.localName ){
	  this.isUnique = false;
	  e.isUnique = false;
	  this.ontology.namesAreUnique = false;
	  e.ontology.namesAreUnigue = false;
	}
	function concat_classes(list) {
		var sh_type = "";
		_.each(list, function(tt){
			var c_name = schema.findClassByName(tt.classFullName).getElementName();
			sh_type = sh_type.concat("[sh:node  ",c_name,"] ");
		})	
		return sh_type
	}

	var t = "";
	if (roleInfo.SourceClassesDetailed)
	{
		var mainSourceClass = "";
		var mainTargetClass = "";
		_.each(roleInfo.SourceClassesDetailed, function(sc){ if ( roleInfo.objectTripleCount == sc.objectTripleCount) mainSourceClass = sc.classFullName; })  
		_.each(roleInfo.TargetClassesDetailed, function(sc){ if ( roleInfo.tripleCount == sc.tripleCount) mainTargetClass = sc.classFullName; })
		
		if (roleInfo.closedRange == true && _.size(roleInfo.TargetClassesDetailed) == 1)
			this.sh_type = t.concat("\t\tsh:node ",schema.findClassByName(roleInfo.TargetClassesDetailed[0].classFullName).getElementName());
		else if (mainTargetClass != "")
			this.sh_type = t.concat("\t\tsh:node ",schema.findClassByName(mainTargetClass).getElementName());
		else if (roleInfo.closedRange == true && _.size(roleInfo.TargetClassesDetailed) > 1)
			this.sh_type = t.concat("\t\tsh:or ( ", concat_classes(roleInfo.TargetClassesDetailed), ") ;");
		else
			this.sh_type = "\t\tsh:nodeKind sh:IRI";
		
		if (roleInfo.closedDomain == true && _.size(roleInfo.SourceClassesDetailed) == 1)
			this.sh_inv_type = t.concat("\t\tsh:node ",schema.findClassByName(roleInfo.SourceClassesDetailed[0].classFullName).getElementName());
		else if (mainSourceClass != "")
			this.sh_inv_type = t.concat("\t\tsh:node ",schema.findClassByName(mainSourceClass).getElementName());
		else if (roleInfo.closedDomain == true && _.size(roleInfo.SourceClassesDetailed) > 1)
			this.sh_inv_type = t.concat("\t\tsh:or ( ", concat_classes(roleInfo.SourceClassesDetailed), ") ;");
		else
			this.sh_inv_type = "\t\tsh:nodeKind sh:IRI";
	}
	else
	{
		this.sh_type = "\t\tsh:nodeKind sh:IRI";
		this.sh_inv_type = "\t\tsh:nodeKind sh:IRI";
	}
		
	//console.log(roleInfo)
	//console.log(this.sh_type)
	//console.log(this.sh_inv_type)
	
	if (roleInfo.maxCardinality || roleInfo.minCardinality) {
	  this.minCardinality = findCardinality(roleInfo.minCardinality, "MIN");
	  this.maxCardinality = findCardinality(roleInfo.maxCardinality, "MAX");
	}
};

VQ_Role.prototype = Object.create(VQ_Elem.prototype);
VQ_Role.prototype.constructor = VQ_Role;
VQ_Role.prototype.schemaRole = null;
VQ_Role.prototype.minCardinality = null;
VQ_Role.prototype.maxCardinality = null;
VQ_Role.prototype.getAssocInfo = function() {
  return {minCardinality:this.minCardinality, maxCardinality:this.maxCardinality};
  };
VQ_Role.prototype.getAssociationInfo = function() {
  return _.extend(this.getElemInfo(), this.getAssocInfo());
  };

VQ_SchemaRole = function (roleInfo, cpInfo, role){
	//VQ_Elem.call(this, cpInfo, "schemaRole");
	VQ_Elem.call(this, roleInfo, "schemaRole");
	this.role = {};
	this.sourceClass = {};
	this.targetClass = {};
	this.inverseSchemaRole = {};
	this.isSymmetric = false;
	if (cpInfo.maxCardinality || cpInfo.minCardinality) {
	  this.minCardinality = findCardinality(cpInfo.minCardinality, "MIN");
	  this.maxCardinality = findCardinality(cpInfo.maxCardinality, "MAX");
	  if (role.maxCardinality) {
	    if (this.minCardinality < role.minCardinality) role.minCardinality = this.minCardinality;
		if (this.maxCardinality < role.maxCardinality) role.maxCardinality = this.maxCardinality;
	  }
	  else {
	    role.minCardinality = this.minCardinality;
	    role.maxCardinality = this.maxCardinality;
	  }
	}
};

VQ_SchemaRole.prototype = Object.create(VQ_Elem.prototype);
VQ_SchemaRole.prototype.constructor = VQ_SchemaRole;
VQ_SchemaRole.prototype.role = null;
VQ_SchemaRole.prototype.sourceClass = null;
VQ_SchemaRole.prototype.targetClass = null;
VQ_SchemaRole.prototype.inverseSchemaRole = null;
VQ_SchemaRole.prototype.isSymmetric = null;
VQ_SchemaRole.prototype.minCardinality = null;
VQ_SchemaRole.prototype.maxCardinality = null;
VQ_SchemaRole.prototype.getRoleInfo = function() {
  if (this.maxCardinality)
	return {minCardinality:this.minCardinality, maxCardinality:this.maxCardinality};
  else
    return {minCardinality:this.role.minCardinality, maxCardinality:this.role.maxCardinality}
  };
VQ_SchemaRole.prototype.getSchemaRoleInfo = function() {
  return _.extend(this.getElemInfo(), this.getRoleInfo());
  };


// VQ_Element class describes the main objects within ViziQuer diagram - Classes and links
// It is used to traverse objects and retrieve information about them. Also modify!
// It hides the ajoo platform specific details allowing to work in ViziQuer abstraction layer
// all properties (except obj) are functions and they are evaluated upon request


//  Create a new VQ_Element (class). Parameters are: //
//  - function to process the newly created element.
//  - location of the object:
//       -- the left upper corner + dimensions for class:{x:, y:, width:, height:}
//       -- an array of points for link: [x1, y1, x2, y2, ..., xn, yn] // WARNING: use just two points
//  - type of the object falsy - class, true - link
//  - source Class (for Link)
//  - target Class (for Link)
//    funtion(VQ_Element), location, bool, VQ_Element, VQ_Element  -->
Create_VQ_Element = function(func, location, isLink, source, target) {
  var active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

  if (isLink) {
    var elem_type = ElementTypes.findOne({name:"Link", diagramTypeId:active_diagram_type_id});
    var elem_style = _.find(elem_type.styles, function(style) {
                return style.name === "Default";
    });

    var new_line = {
        projectId: Session.get("activeProject"),
        versionId: Session.get("versionId"),

        diagramId: Session.get("activeDiagram"),
        diagramTypeId: elem_type["diagramTypeId"],
        elementTypeId: elem_type["_id"],

        style: {startShapeStyle: elem_style["startShapeStyle"],
            endShapeStyle: elem_style["endShapeStyle"],
            elementStyle: elem_style["elementStyle"],
            lineType: elem_type["lineType"],
          },

        styleId: elem_style["id"],
        type: "Line",
        points: location,
        startElement: source._id(),
        endElement: target._id(),
      };


      console.log("new line", new_line, new_line.style)
      console.log("")

      var compartments = Dialog.buildCopartmentDefaultValue(new_line);

      if (_.size(compartments) > 0) {
        new_line.initialCompartments = compartments;
      }

      Utilities.callMeteorMethod("insertElement", new_line, function(elem_id) {
            var vq_obj = new VQ_Element(elem_id);

            console.log("vq_obj ", vq_obj)
            console.log("func", func)

            if (func) { func(vq_obj) };
      });

  } else {
    var elem_type = ElementTypes.findOne({name:"Class", diagramTypeId:active_diagram_type_id});
    var elem_style = _.find(elem_type.styles, function(style) {
                return style.name === "Default";
    });

    var new_box = {
            projectId: Session.get("activeProject"),
            versionId: Session.get("versionId"),

            diagramId: Session.get("activeDiagram"),
            diagramTypeId: elem_type["diagramTypeId"],
            elementTypeId: elem_type["_id"],
            style: {elementStyle: elem_style["elementStyle"]},
            styleId: elem_style["id"],
            type: "Box",
            location:  location
    };

    var compartments = Dialog.buildCopartmentDefaultValue(new_box);

    if (_.size(compartments) > 0) {
      new_box.initialCompartments = compartments;
    }

    Utilities.callMeteorMethod("insertElement", new_box, function(elem_id) {
          var vq_obj = new VQ_Element(elem_id);
          if (func) { func(vq_obj) };
    });
  }

};

var VQ_Element_cache = {};

// ajoo element id --> VQ_Element

VQ_Element = function(id) {
  // obj contains correspondind ajoo Element object
 // look in the cache
 //console.log(VQ_Element_cache);
 if (VQ_Element_cache[id]) {
   // TODO: after delete - clear cache!!!!!!!!
   this.obj = VQ_Element_cache[id].obj;
   this.isVirtualRoot = VQ_Element_cache[id].isVirtualRoot;
 } else {
   var elem = Elements.findOne({_id: id});

   if (!elem) {
      //console.error("VQ element not created");
      return null;
   };

   this.obj = elem;
   VQ_Element_cache[id] = this;
 }


};


VQ_Element.prototype = {
  constructor: VQ_Element,
  // obj contains correspondind ajoo Element object
  obj: null,
  // --> ajoo object _id used also as VQ_Element identifier
  _id: function() {return this.obj["_id"]},
  // VQ_Element --> bool
  // Determines whether this VQ_Element is the same as the argument
  isEqualTo: function(e) {if (e) { return this.obj["_id"]==e.obj["_id"]} else {return false}},
  // --> string (ajoo diagram id)
  getDiagram_id: function() {return this.obj["diagramId"]},
  // string --> string
  // Returns the value (INPUT) of the given compartment by name or null if such compartment does not exist
  getCompartmentValue: function(compartment_name) {

    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["input"];
      };
    };
    return null;
  },
  // string --> string
  // Returns the value (VALUE) of the given compartment by name or null if such compartment does not exist
  getCompartmentValueValue: function(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["value"];
      };
    };
    return null;
  },
  // string --> [string]
  // Returns the array of values of the given compartment by name or [] if such compartment does not exist
  getMultiCompartmentValues: function(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      return Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id}).map(function(c){return c["input"];});
    };
    return [];
  },
  // string, [{title:string, name:string, transformer:function}, ...] --> [{fulltext:string, title1:string, ...}}]
  // Returns array of values of the given compartment together with the values of specified subcompartments
  // Arguments are:
  //    the name of the compartment
  //    an array where each object has:
  //              title - name of the property in the resulting object
  //              name  - name of the direct subcompartment
  //              transformer - an optional function which transforms the value of the compartment
  // Example:
  // return this.getMultiCompartmentSubCompartmentValues("OrderBy",
  // [
  //  {title:"exp",name:"Name"},
  //  {title:"isDescending", name:"Desc", transformer:function(v) {return v=="true"}}
  // ])
  //
  // returns : [
  //            {
  //              "fulltext": "cn DESC",
  //              "exp": "cn",
  //              "isDescending": true
  //            }
  //          ]
  getMultiCompartmentSubCompartmentValues: function(compartment_name, subcompartment_name_list) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var compartments = Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id});
      return compartments.map(function(c) {
        var res = { fulltext:c["input"], _id:c["_id"] };
        if (c.subCompartments) {
        if (c.subCompartments[compartment_name]) {
          if (c.subCompartments[compartment_name][compartment_name]) {
            _.each(subcompartment_name_list, function(sc_name) {
                if (c.subCompartments[compartment_name][compartment_name][sc_name.name]) {
                  var transformer = function(v) { return v};
                  if (sc_name["transformer"]) {
                    transformer = sc_name["transformer"];
                  };
                  res[sc_name.title]=transformer(c.subCompartments[compartment_name][compartment_name][sc_name.name]["input"]);
                };
              });
          }
        }}

        return res;
      })
    };
    return [];
  },
	// --> string
	// returns name of the VQ element's type Class, Link, Comment, CommentLink, null
	getElementTypeName: function() {
		var et = ElementTypes.findOne({_id:this.obj["elementTypeId"]});
		if (et) {
			return et["name"];
		} else {
			return null;
		}
	},
  isClass: function() {
		return this.getElementTypeName()=="Class";
	},
  isLink: function() {
		return this.getElementTypeName()=="Link";
	},
  isUnion: function() {
		return this.getName()== "[ + ]";
	},
	isUnit: function() {
		return this.getName()=="[ ]";
	},
  // Determines whether the VQ_Element is the root class of the query
  isRoot: function() {
    return this.getType()=="query" || this.isVirtualRoot;
  },
	// Determines whether the VQ_Element is the subquery root
	isSubQueryRoot: function() {
		return _.any(this.getLinks(), function(l) {
			 var dir = l.link.getRootDirection();
			 return l.link.isSubQuery() && (l.start && dir == "start" || !l.start && dir == "end")
		});
	},
	// Determines whether the VQ_Element is the global subquery root
	isGlobalSubQueryRoot: function() {
		return _.any(this.getLinks(), function(l) {
			 var dir = l.link.getRootDirection();
			 return l.link.isGlobalSubQuery() && (l.start && dir == "start" || !l.start && dir == "end")
		});
	},
  // --> string
  // gets the name of the class or link, in fact it is the classname or rolename
  getName: function() {
    // Since we need inv(name) also in the input, we should extract the name in this case
    var name = this.getCompartmentValue("Name");
    // if (name && name.substring(0,4)=="inv(") {
        // return name.substring(4,name.length-1);
    // } else {
        return name;
    // }
  },
  // --> string
  getInstanceAlias: function() {
    return this.getCompartmentValue("Instance");
  },
  // string -->
  setInstanceAlias: function(instanceAlias) {
    this.setCompartmentValue("Instance",instanceAlias, instanceAlias);
  },
  // --> string
  getStereotype: function() {
    return this.getCompartmentValue("Stereotype");
  },

  // --> string
  // Can be [if Class]: query, condition, subquery, null
  // Can be [if Link]: NOT, OPTIONAL, REQUIRED, null
  getType: function() {

    if (this.isClass()) {
       return this.getCompartmentValue("ClassType");
    } else if (this.isLink()) {
      if (this.getCompartmentValue("Negation Link")=="true") {
        return "NOT";
      } else if (this.getCompartmentValue("Optional Link")=="true") {
        return "OPTIONAL";
      } else if (this.getCompartmentValue("Filter Exists")=="true") {
        return "FILTER_EXISTS";
      } else { return "REQUIRED";};
    } else { return null;};
  },
  // determines whether a class rather than instance is searched
  isVariable: function() {
    var name = this.getName();
		return (name && name.charAt(0)=='?');
  },
  // determines whether a class rather than blank node is searched
  isBlankNode: function() {
    var alias = this.getInstanceAlias();
    var className = this.getName();
	var fields = this.getFields();
	var aggregation = this.getAggregateFields();
	
	var isOptional = false;
	
	
	
	
	for(let field in fields){
		if(typeof fields[field] !== "function" && (fields[field]["requireValues"] != true || fields[field]["exp"] == "(select this)")){
			isOptional = true;
			break;
		}
		if( aggregation.length > 0) isOptional = true;
	}
	var links = this.getLinks();
	for(let l in links){
		
		if(typeof links[l] === "object" && !links[l].start && links[l].link.getType() != "REQUIRED"){
			
			isOptional = true;
			break;
		}
	}
	return ((alias == null || alias == "") && (className == null || className == "") && isOptional == false && aggregation.length < 1);

  },
  // gets class variable name (e.g. X for ?X)
  getVariableName: function() {
    if (this.isVariable()) {return this.getName().substr(1)} else { return null }
  },
  
  getComment: function() {
    return this.getCompartmentValue("Comment")
  },
  
  setComment: function(name, input) {
      this.setCompartmentValue("Comment",name,input);
  },
  
  getGraph: function() {
    return this.getCompartmentValue("Graph")
  },
  
  setGraph: function(name, input) {
      this.setCompartmentValue("Graph",name,input);
  },
  
  getGraphInstruction: function() {
    return this.getCompartmentValue("Graph instruction")
  },
  
  setGraphInstruction: function(instruction) {
	this.setCompartmentValue("Graph instruction",instruction,instruction);
  },
  // determines whether the link is subquery link
  isSubQuery: function() {
    return this.getCompartmentValue("Subquery Link")=="true"
  },
	// determines whether the link is glogal subquery link
  isGlobalSubQuery: function() {
    return this.getCompartmentValue("Global Subquery Link")=="true"
  },
  // determines whether the link is graph to contents link
  isGraphToContents: function() {
    return this.getCompartmentValue("Graph to contents")=="true"
  },
  // determines whether the link is PLAIN
  isPlain: function() {
    return !(this.isSubQuery() || this.isGlobalSubQuery() || this.isConditional())
  },
  // determines whether the link is inverse
  isInverse: function() {
		//console.log(this.getCompartmentValue("Inverse Link")==true);
    return this.getCompartmentValue("Inverse Link")=="true"
  },
  // determines whether the link is conditional
  isConditional: function() {
    return this.getCompartmentValue("Condition Link")=="true"
  },
	// determines whether the link is negation
  isNegation: function() {
    return this.getCompartmentValue("Negation Link")=="true"
  },
	// determines whether the link is optional
  isOptional: function() {
    return this.getCompartmentValue("Optional Link")=="true"
  },
  // detemines whether the link is REQUIRED
  isRequired: function() {
    return this.getType()=="REQUIRED"
  }, 
  // detemines whether the link is FILTER_EXISTS
  isFilterExists: function() {
    return this.getCompartmentValue("Filter Exists")=="true"
  },
  // Gets link's nesting (query) type: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION,GRAPH
  getNestingType: function() {
    return this.getCompartmentValueValue("NestingType");
  },
  // string  -->
  setNestingType: function(type) {
	 
    var valueInputMap = {"PLAIN":"Join", "SUBQUERY":"Subquery","GLOBAL_SUBQUERY":"Subquery + Global", "GRAPH":"Graph to contents", "CONDITION":"Reference"};
	var nestingTypeValueOld = this.getCompartmentValue("NestingType");
	
	if(nestingTypeValueOld == "Subquery, Global" || nestingTypeValueOld == "Non-structure (extra join) link") this.setCompartmentValueAuto("NestingType", nestingTypeValueOld);
    else this.setCompartmentValueAuto("NestingType", valueInputMap[type]);
    this.setLinkQueryType(type);
  },
  isLabelServiceLanguages: function() {
    // var useLabelService = this.getCompartmentValue("Use Label Service");
    var labelServiceLanguages = this.getCompartmentValue("Label Service Languages");
	// if(useLabelService == "true"){
		if(labelServiceLanguages == null || labelServiceLanguages.replace(/ /g, "") == "") labelServiceLanguages = "[AUTO_LANGUAGE],en";
		return labelServiceLanguages;
	// }
	return null;
  },
  // determines whether the indirect class membership should be used (if configured) by translator
  isIndirectClassMembership: function() {
    return this.getCompartmentValue("indirectClassMembership")=="true";
  },
  // bool ->
  setIndirectClassMembership: function(indirect) {

	var indirectS = "false";

	if (indirect) {
		// if indirectClassMembership parameter is set, execute dynamicDefaultValue ExtensionPoint, to set default value
		if(this.getName() !== null && this.getName() !== ""){
			this.setNameValue(".. "+this.getName());	
			indirectS = "true";
		}
		else if(this.getName() !== null) this.setNameValue(this.getName());
	} else {
      if(this.getName() !== null) this.setNameValue(this.getName());
    };
    this.setCompartmentValueAuto("indirectClassMembership",indirectS)
	
  },
  setNameAndIndirectClassMembership: function(name,indirect) {
	var indirectS = "false";
	var nameValue = name;
	
	if (indirect) {
		if(name !== null && name !== ""){
			nameValue = ".. " + name;
			indirectS = "true";
		}
	} 
	
	this.setCompartmentValue("Name",name,nameValue);
	this.setCompartmentValueAuto("indirectClassMembership",indirectS)
  },
  // determines whether the class has distinct property
  isDistinct: function() {
    return this.getCompartmentValue("Distinct")=="true";
  },
  // bool  ->
  setDistinct: function(distinct) {
    var distinctS = this.boolToString(distinct)
    this.setCompartmentValueAuto("Distinct",distinctS)
  },
  //bool ->
  setUseLabelService: function(useLabelService) {
    var useLabelServiceS = this.boolToString(useLabelService)
    this.setCompartmentValueAuto("Use Label Service",useLabelServiceS)
  },
  // string -->
  setLabelServiceLanguages: function(labelServiceLanguages) {
    this.setCompartmentValueAuto("Label Service Languages",labelServiceLanguages)
  },
  // determines whether the class has select all property
  isSelectAll: function() {
    return this.getCompartmentValue("Select All")=="true";
  },
  // bool  ->
  setSelectAll: function(selectAll) {
    var selectAllS = this.boolToString(selectAll)
    this.setCompartmentValueAuto("Select All",selectAllS)
  },
  // determines whether the query should be grouped by this class
  isGroupByThis: function() {
    return this.getCompartmentValue("Group by this")=="true";
  },
  // bool  ->
  setGroupByThis: function(group) {
    var groupS = this.boolToString(group)
    this.setCompartmentValueAuto("Group by this",groupS)
  },
	// --> string
	getFullSPARQL : function() {
    return this.getCompartmentValue("FullSPARQL");
	},
  // string -->
  setFullSPARQL: function(sparql) {
    this.setCompartmentValueAuto("FullSPARQL",sparql)
  },
  // --> string
  getLimit: function() {
    return this.getCompartmentValue("Show rows");
  },
  // string -->
  setLimit: function(limit) {
    this.setCompartmentValueAuto("Show rows",limit)
  },
  // --> string
  getOffset: function() {
    return this.getCompartmentValue("Skip rows");
  },
  // string -->
  setOffset: function(offset) {
    this.setCompartmentValueAuto("Skip rows", offset)
  },
  // --> string
  getComment: function() {
    return this.getCompartmentValue("Comment");
  },
  // string -->
  setComment: function(comment) {
    this.setCompartmentValueAuto("Comment", comment)
  },
  // --> [{exp:string}]
  // returns an array of conditions' expressions
  getConditions: function() {
	 return this.getMultiCompartmentSubCompartmentValues("Conditions",
    [{title:"exp",name:"Expression"},
    {title:"allowResultMultiplication",name:"Allow result multiplication",transformer:function(v) {return v=="true"}}]);
    // return this.getMultiCompartmentValues("Conditions").map(function(c) {return {exp:c}});
  },
  // string -->
  addCondition: function(condition, allowResultMultiplication) {
    this.addCompartmentSubCompartments("Conditions",[
	  {name:"Expression", value:condition},
	  {name:"Allow result multiplication",value:this.boolToString(allowResultMultiplication)}
	])
  },
  // --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of attributes: expression, stereotype, alias, etc. ...
  getFields: function() {
    var field_list =  this.getMultiCompartmentSubCompartmentValues("Attributes",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"},
    {title:"Prefixes",name:"Prefixes"},
    {title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"},
    {title:"attributeCondition",name:"AttributeCondition"},
    {title:"attributeConditionSelection",name:"AttributeConditionSelection"},
    {title:"requireValues",name:"Require Values",transformer:function(v) {return v=="true"}},
    {title:"addLabel",name:"Add Label",transformer:function(v) {return v=="true"}},
    {title:"addAltLabel",name:"Add AltLabel",transformer:function(v) {return v=="true"}},
    {title:"addDescription",name:"Add Description",transformer:function(v) {return v=="true"}},
		{title:"groupValues",name:"GroupValues",transformer:function(v) {return v=="true"}},
	  {title:"isInternal",name:"IsInternal",transformer:function(v) {return v=="true"}}]);
	  
	var compart_type_id = CompartmentTypes.findOne({name: "Attributes", elementTypeId: this.obj.elementTypeId})["_id"];
	var compartments = Compartments.find({compartmentTypeId: compart_type_id, elementId: this.obj._id, }, {sort: {index: 1}}).fetch();
	
	var compratmentList = [];

	for(var compartment of compartments){
		for(var field of field_list){
			if(field["_id"] == compartment["_id"]) {
				compratmentList.push(field);
				break;
			}
		}
	}
	return compratmentList;
  },
  // string,string,bool,bool,bool -->
  addField: function(exp,alias,requireValues,groupValues,isInternal,addLabel,addAltLabel,addDescription,graph,graphInstruction,condition,conditionSelection) {
    
	var prefixesValue = "";
	var graphPrefixValue = "";
	if(graph != null && graph !="" && graphInstruction != null && graphInstruction != "") graphPrefixValue = "{" + graphInstruction + ": " + graph + "} ";
	if(isInternal == true) prefixesValue = "h";
	if(requireValues == true) prefixesValue = prefixesValue + "+";
	if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
	prefixesValue = graphPrefixValue + prefixesValue;
	
	this.addCompartmentSubCompartments("Attributes",[
      {name:"Expression",value:exp},
      {name:"Field Name",value:alias},
      {name:"AttributeCondition",value:condition},
      {name:"AttributeConditionSelection",value:conditionSelection},
      {name:"Graph",value:graph, input:""},
      {name:"Graph instruction",value:graphInstruction,input:""},
      {name:"Require Values",value:this.boolToString(requireValues)},
      {name:"Add Label",value:this.boolToString(addLabel)},
      {name:"Add AltLabel",value:this.boolToString(addAltLabel)},
      {name:"Add Description",value:this.boolToString(addDescription)},
      {name:"GroupValues",value:this.boolToString(groupValues)},
      {name:"IsInternal",value:this.boolToString(isInternal)},
      {name:"Prefixes",value:prefixesValue,input:prefixesValue}
    ])
  },
	// --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  getAggregateFields: function() {
    return this.getMultiCompartmentSubCompartmentValues("Aggregates",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"},
	{title:"helper",name:"Helper",transformer:function(v) {return v=="true"}},
	{title:"requireValues",name:"Require Values",transformer:function(v) {return v=="true"}}]);
  },
  // string, string -->
  addAggregateField: function(exp,alias,requireValues, helper) {
    this.addCompartmentSubCompartments("Aggregates",[
      {name:"Expression",value:exp},
      {name:"Field Name",value:alias},
	  {name:"Require Values",value:this.boolToString(requireValues)},
	  {name:"Helper",value:this.boolToString(requireValues)},
    ])
  },
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  getGraphs: function() {
    return this.getMultiCompartmentSubCompartmentValues("Graphs",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"}]);
  },
  // string, string -->
  addGraph: function(graph,graphInstruction) {
    this.addCompartmentSubCompartments("Graph",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
    ])
  },
  
  addGraphs: function(graph,graphInstruction) {
    this.addCompartmentSubCompartments("Graphs",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
    ])
  },
  // --> [{fulltext:string, exp:string, isDescending:bool},...]
  // returns an array of orderings - expression and whether is descending
  getOrderings: function() {
    return this.getMultiCompartmentSubCompartmentValues("OrderBy",
    [
      {title:"exp",name:"Name"},
      {title:"isDescending", name:"Desc", transformer:function(v) {return v=="true"}}
    ])
    //return this.getMultiCompartmentValues("OrderBy");
  },
  // string, bool -->
  addOrdering: function(exp,isDescending) {
	  
	 
	  
	this.addCompartmentSubCompartments("OrderBy",[
      {name:"Name",value:exp},
      {name:"Desc",value:this.boolToString(isDescending)},
    ]) 
  },
  // --> [{fulltext:string, exp:string},...]
  // returns an array of orderings - expression and whether is descending
  getGroupings: function() {
    return this.getMultiCompartmentSubCompartmentValues("GroupBy",
    [
      {title:"exp",name:"Name"}
    ])
  },
  // string -->
  addGrouping: function(exp) {
    this.addCompartmentSubCompartments("GroupBy",[
      {name:"Name",value:exp}
    ])
  },
  // --> [{exp:string}]
  // returns an array of having's expressions
  getHavings: function() {
    //return this.getMultiCompartmentSubValues("Having").map(function(c) {return {exp:c}});
		return this.getMultiCompartmentSubCompartmentValues("Having",
	[
		{title:"exp",name:"Expression"}
	])
  },
  // --> [{link:VQ_Element, start:bool}, ...]
  // returns an array of objects containing links as VQ_Elements and flag whether is has been retrieved by opposite end as start
  // start true means that the link has been retrieved from link "end"
  getLinks: function() {
		return _.filter(_.union(
      Elements.find({startElement: this.obj["_id"]}).map(function(link) {
        return { link: new VQ_Element(link["_id"]), start: false };
      }),
      Elements.find({endElement: this.obj["_id"]}).map(function(link) {
        return { link: new VQ_Element(link["_id"]), start: true };
      })), function(linkobj) { return linkobj.link.isLink()}
    );
  },
  // --> {link:VQ_Element, start:bool}
  // returns a link leading to the root (UP direction) or undefined if not exist
  getLinkToRoot: function() {
    return _.find(this.getLinks(), function(l) {
      var root_direction = l.link.getRootDirection();
      return (root_direction == "start" && l.start || root_direction == "end" && !l.start)
    });
  },
  // --> {start:VQ_Element, end:VQ_element}
  // Returns link's start and end VQ_Elements
  getElements: function() {
    return { start: new VQ_Element(this.obj["startElement"]), end: new VQ_Element(this.obj["endElement"])};
  },
  // --> VQ_Element
  // Returns link's start VQ_Element
  getStartElement: function() {
    return new VQ_Element(this.obj["startElement"]);
  },
  // --> VQ_Element
  // Re turns link's end VQ_Element
  getEndElement: function() {
    return new VQ_Element(this.obj["endElement"]);
  },
  // --> bool
	// returns true if "Hide default link name" checkbox is checked
  shouldHideDefaultLinkName: function() {
  	let val = this.getCompartmentValue("Hide default link name");
		return val == "true" || val == true;
	},
	// --> string
	// Determines which end of the link is towards the root
	// returns "start","end" or "none"
	getRootDirection: function() {
		var visited_elems = {};
    visited_elems[this._id()]=true;

		function findRoot(e) {
			//console.log(e);
      if (e.isRoot()) {return true};
      var res = false;
			visited_elems[e._id()]=true;
			_.each(e.getLinks(),function(link) {
				  if (!visited_elems[link.link._id()] && !link.link.isConditional()) {
						visited_elems[link.link._id()]=true;
            var next_el = null;
						if (link.start) {
							next_el=link.link.getStartElement();
						} else {
							next_el=link.link.getEndElement();
						};
						if (!visited_elems[next_el._id()]) {
							 res = res || findRoot(next_el);
						};
					};
			});
			return res;
		};

		if (findRoot(this.getStartElement())) {return "start"};
		if (findRoot(this.getEndElement())) {return "end"};
		return "none";
	},
	// bool -->
	// hides or shows link name if it is default; true - hide, false - show
  hideDefaultLinkName: function(hide, input, value) {
		if (hide) {
			   if (this.isDefaultLink()) {
				   this.setLinkNameVisibility(false, input, value);
				 }
				 else {
					 this.setLinkNameVisibility(true, input, value);
				 }
		}
		else {
		    this.setLinkNameVisibility(true, input, value);
	  }
	},
	// function which in fact should be in the schema
	// --> bool
	// Determines whether the link is the only possible option between two classes
	isDefaultLink: function() {
		 if (this.isLink()) {
			 var schema = new VQ_Schema({});
			 var assoc = schema.findAssociationByName(this.getName());
			 //console.log(assoc);
			 if (assoc) {
				 var start_class = schema.findClassByName(this.getStartElement().getName());
				 var end_class = schema.findClassByName(this.getEndElement().getName());
	       if (start_class && end_class) {
					 var all_assoc_from_start = start_class.getAllAssociations();
					 //console.log(all_assoc_from_start);
					 var all_sub_super_of_end = _.union(end_class.allSuperSubClasses,end_class);
					 //console.log(all_sub_super_of_end);
					 var possible_assoc = _.filter(all_assoc_from_start, function(a) {
							return _.find(all_sub_super_of_end, function(c) {
									return c.localName == a.class
							})
					});
          //console.log(possible_assoc);
					//console.log(_.size(possible_assoc));

					 if (_.size(possible_assoc)==1 && possible_assoc[0].name == assoc.localName) {
						 //console.log(possible_assoc[0].name);
	 					 //console.log(assoc.localName);
						 return true
					 } else {
						 return false;
					 }
				 }

			 }

			 }

	},
  // VQ_Element --> bool
  // Returns true if there is a path in the spanning tree
  // from this to toElement
  // (plain-required-unionfree UP/DOWN, otherwise UP in the tree)
  // TODO: union-free
  isTherePathToElement: function(toElement) {
    var visited_elems = {};

    function findToElem(e) {
       if (e.isEqualTo(toElement)) { return true };
       var res = false;
       visited_elems[e._id()]=true;
 			_.each(e.getLinks(),function(link) {
          if (!visited_elems[link.link._id()] && !link.link.isConditional()) {
 						visited_elems[link.link._id()]=true;
            var next_el = null;
            var UP_direction = link.link.getRootDirection();
            if (link.start) {
              if (UP_direction=="start" || (UP_direction=="end" && link.link.isPlain() && link.link.isRequired())) {
                next_el=link.link.getStartElement();
              }
 						} else {
              if (UP_direction=="end" || (UP_direction=="start" && link.link.isPlain() && link.link.isRequired())) {
                next_el=link.link.getEndElement();
              }
 						};
 						if (next_el && !visited_elems[next_el._id()]) {
 							 res = res || findToElem(next_el);
 						};
 					};
 			});
      return res;
    };

    return findToElem(this);
  },
	// bool -->
	// sets the link name compartment's visibility
	setLinkNameVisibility: function(visible, input, value) {
		if (this.isLink()) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};

					  if (_.isUndefined(input)) {
					  	input = comp["input"];
					  }

					  if (_.isUndefined(value)) {
					  	value = comp["value"];
					  }

            a["input"] = input;
						a["value"] = value;
						a["id"] = comp["_id"];
						a["projectId"] = Session.get("activeProject");
			 			a["versionId"] = Session.get("versionId");

			 			Utilities.callMeteorMethod("updateCompartment", a);
	      };
		};
	};
	},
  // string, bool -->
	// sets comartments visibility
	setCompartmentVisibility: function(compartmentName,visible) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = CompartmentTypes.findOne({name: compartmentName, elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
            // a["input"] = comp["input"];
						// a["value"] = comp["value"];
						a["id"] = comp["_id"];
						a["projectId"] = Session.get("activeProject");
			 			a["versionId"] = Session.get("versionId");

			 			Utilities.callMeteorMethod("updateCompartment", a);
	      };
		};
	},
  // sets name
	// string -->
  setName: function(name) {
    if (this.isIndirectClassMembership() && name !== null && name !== "") {
      this.setCompartmentValue("Name",name,".. "+name);
    } else {
      this.setCompartmentValue("Name",name,name);
    };
  },
  // sets name's visual appeareance
  // string -->
  setNameValue: function(value, input) {
  		if (!input) {
  			input = this.getName();
  		}

      this.setCompartmentValue("Name", input, value);
  },
  // sets type of the class: query, condition
  // string -->
  setClassType: function(type) {
      this.setCompartmentValue("ClassType", type, type)
  },

	// sets link type. Possible values: REQUIRED, NOT, OPTIONAL, FILTER EXISTS
	setLinkType: function(value) {
	//console.log("~~~~~~~~~~~"+value+"~~~~~~~~~~~~~~~~~~")
		 if (this.isLink()) {
			 //console.log(this);
        // By default link is REQUIRED
				var setNeg = "false";
				var setNegValue = "";
				var setOpt = "false";
				var setFE = "false";
				var setFEValue = "";
				if (value=="NOT") {
					  setNeg = "true";
						setNegValue = "{not}";
						setOpt = "false";
						setFEValue = "";
						setFE = "false";
						this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#ff0000"},
						                      {attrName:"elementStyle.dash",attrValue:[0,0]},
																	{attrName:"startShapeStyle.stroke", attrValue:"#ff0000"},
																	{attrName:"endShapeStyle.stroke", attrValue:"#ff0000"},
																]);
						if (this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   var root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#ff0000"},
																 ]);
							 } else if (root_dir=="end") {
								 this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#ff0000"},
																 ]);
							 };
						} else if (this.isGlobalSubQuery()) {
							var root_dir =this.getRootDirection();
							if (root_dir=="start") {
								this.setCustomStyle([
																 {attrName:"startShapeStyle.fill",attrValue:"#ffffff"},
																]);
							} else if (root_dir=="end") {
								this.setCustomStyle([
																 {attrName:"endShapeStyle.fill",attrValue:"#ffffff"},
																]);
							};
						};
				} else if (value=="OPTIONAL") {
					  setOpt = "true";
						setNeg = "false";
						setNegValue = "";
						setFEValue = "";
						setFE = "false";
						this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#18b6d1"},
						                      {attrName:"elementStyle.dash",attrValue:[6,5]},
																	{attrName:"startShapeStyle.stroke", attrValue:"#18b6d1"},
																	{attrName:"endShapeStyle.stroke", attrValue:"#18b6d1"},
																]);
						if (this.isConditional()) {
               this.setNestingType("PLAIN");

						} else if (this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   var root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																 ]);
							 } else if (root_dir=="end") {
								 this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#18b6d1"},
																 ]);
							 };

						};
				} else if (value=="FILTER_EXISTS") {
					  this.setNestingType("SUBQUERY");
					  setOpt = "false";
						setNeg = "false";
						setNegValue = "";
						setFE = "true";
						setFEValue = "{exists}";
						this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#000000"},
																{attrName:"elementStyle.dash",attrValue:[0,0]},
																{attrName:"startShapeStyle.stroke", attrValue:"#000000"},
																{attrName:"endShapeStyle.stroke", attrValue:"#000000"},
																	]);
						if (this.isConditional()) {
               this.setNestingType("PLAIN");

						} else if (this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   var root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																 ]);
							 } else if (root_dir=="end") {
								 this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																 ]);
							 };

						};
				} else {
					this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#000000"},
																{attrName:"elementStyle.dash",attrValue:[0,0]},
																{attrName:"startShapeStyle.stroke", attrValue:"#000000"},
																{attrName:"endShapeStyle.stroke", attrValue:"#000000"},
															]);
				  if (this.isSubQuery() ) {
										var root_dir =this.getRootDirection();
									  if (root_dir=="start") {
																	 this.setCustomStyle([
																										{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																									 ]);
										} else if (root_dir=="end") {
																	 this.setCustomStyle([
																										{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																									 ]);
										};
				  };
				};

				// console.log("setNeg ", setNeg)
				// console.log("")

				this.setCompartmentValue("Negation Link", setNeg, setNegValue);
				this.setCompartmentVisibility("Negation Link", (setNeg==true || setNeg=="true"));
				this.setCompartmentValue("Optional Link", setOpt, "");
				this.setCompartmentValue("Filter Exists", setFE, setFEValue);
				this.setCompartmentVisibility("Filter Exists", (setFE==true || setFE=="true"));

		 }
	},

	// sets link type. Possible values: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION, GRAPH
	setLinkQueryType: function(value) {
		 if (this.isLink()) {
        // By default link is PLAIN
				var setSub = "false";
				var setGSub = "false";
				var setCond = "false";
				var setGraph = "false";
        var root_dir =this.getRootDirection();
				if (value=="SUBQUERY") {
					  setSub = "true";
						setGSub = "false";
						setCond = "false";
						setGraph = "false";

						if (root_dir=="start") {
							this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		//{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
																		// {attrName:"startShapeStyle.radius",attrValue:6},
																		{attrName:"endShapeStyle.shape",attrValue:"Arrow"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
						  if (this.isNegation()) {
									this.setCustomStyle([
																	     {attrName:"startShapeStyle.fill",attrValue:"#ff0000"},
																	   ]);
							} else if (this.isOptional()) {
								this.setCustomStyle([
																		 {attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																	 ]);
							} else {
									this.setCustomStyle([
																			 {attrName:"startShapeStyle.fill",attrValue:"#000000"},
																		 ]);
							};
						} else if (root_dir=="end") {
							this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Circle"},
																		//{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																		{attrName:"endShapeStyle.radius",attrValue:12},
																		// {attrName:"endShapeStyle.radius",attrValue:6},
																		{attrName:"startShapeStyle.shape",attrValue:"None"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
							if (this.isNegation()) {
										this.setCustomStyle([
																				{attrName:"endShapeStyle.fill",attrValue:"#ff0000"},
																			 ]);
							} else if (this.isOptional()) {
								this.setCustomStyle([
																		 {attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																	 ]);
							} else {
									  this.setCustomStyle([
																				{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																			 ]);
							};
						};

 				} else if (value=="GLOBAL_SUBQUERY") {
					  setSub = "false";
						setGSub = "true";
						setCond = "false";
						setGraph = "false";

						if (root_dir=="start") {
							this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
																		// {attrName:"startShapeStyle.radius",attrValue:6},
																		{attrName:"endShapeStyle.shape",attrValue:"Arrow"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);

						} else if (root_dir=="end") {
							this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Circle"},
																		{attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																		// {attrName:"startShapeStyle.radius",attrValue:6},																		
																		{attrName:"endShapeStyle.radius",attrValue:12},
																		{attrName:"startShapeStyle.shape",attrValue:"None"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
						};
						//if (this.isNegation()) {
						//	this.setLinkType("REQUIRED");
						// };
				} else if (value=="CONDITION") {
					if(this.getType() == "FILTER_EXISTS") this.setLinkType("REQUIRED");
					  setSub = "false";
						setGSub = "false";
						setGraph = "false";
						setCond = "true";
						this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Diamond"},
																 {attrName:"startShapeStyle.fill",attrValue:"#ffffff"},
																 {attrName:"startShapeStyle.radius",attrValue:12},
																 {attrName:"endShapeStyle.shape",attrValue:"Diamond"},
																 {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																 {attrName:"endShapeStyle.radius",attrValue:12},
																 {attrName:"elementStyle.strokeWidth",attrValue:1},

																]);
						if (this.isOptional()) {
									this.setLinkType("REQUIRED");
						};
				} else if (value=="GRAPH") {
					if(this.getType() == "FILTER_EXISTS") this.setLinkType("REQUIRED");
					  setSub = "false";
						setGSub = "false";
						setCond = "false";
						setGraph = "true";

						if (root_dir=="start") {
							this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Diamond"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:18},
																		{attrName:"endShapeStyle.shape",attrValue:"None"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:5},
																	]);

						} else if (root_dir=="end") {
							this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Diamond"},
																		{attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"endShapeStyle.radius",attrValue:18},
																		{attrName:"startShapeStyle.shape",attrValue:"None"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:5},
																	]);
						};
						//if (this.isNegation()) {
						//	this.setLinkType("REQUIRED");
						// };
				}  else {
					if(this.getType() == "FILTER_EXISTS") this.setLinkType("REQUIRED");
					this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"None"},
															 {attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
															 {attrName:"startShapeStyle.radius",attrValue:8},
															 {attrName:"endShapeStyle.shape",attrValue:"Arrow"},
															 {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
															 {attrName:"endShapeStyle.radius",attrValue:8},
															 {attrName:"elementStyle.strokeWidth",attrValue:3},
															]);
				};

			  this.setCompartmentValue("Subquery Link",setSub," ");
				this.setCompartmentValue("Global Subquery Link",setGSub," ");
				this.setCompartmentValue("Condition Link",setCond," ");
				this.setCompartmentValue("Graph to contents",setGraph," ");
		 }
	},


	setIsInverseLink: function(value) {
		 this.setCompartmentValue("Inverse Link",value,"");
	},

	setHideDefaultLinkName: function(value) {
		 this.setCompartmentValue("Hide default link name",value,value);
	},
	//sets compartment value (input and value)
	// string, string, string, bool? -> int (0 ir update failed - no such type, 1 if compartment updated, 3 - compartment inserted)
  // If insert mode is true then new compartment is inserted regardless of existence
	setCompartmentValue: function(comp_name, input, value, insertMode) {
		var ct = CompartmentTypes.findOne({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
			var c = Compartments.findOne({elementId: this._id(), compartmentTypeId: ct["_id"]});
			if (c && !insertMode) {
				Dialog.updateCompartmentValue(ct, input, value, c["_id"]);
				return 1;
			}
			else {
				  //Dialog.updateCompartmentValue(ct, input, value);
          var c_to_create = {
										compartment: {
											projectId: Session.get("activeProject"),
											versionId: Session.get("versionId"),

											diagramId: this.getDiagram_id(),
											diagramTypeId: ct["diagramTypeId"],
											elementTypeId: ct["elementTypeId"],

											compartmentTypeId: ct._id,
											elementId: this._id(),

											index: ct.index,
											input: input,
											value: value,
											isObjectRepresentation: false,

											style: ct.styles[0]["style"],
											styleId: ct.styles[0]["id"],
										},
									};
             Utilities.callMeteorMethod("insertCompartment", c_to_create);
          return 3;
			};
		};
		return 0;
	},
  // Sets compartment value - value automatically computed depending on input
  // string, string, bool? -->
  setCompartmentValueAuto: function(comp_name, input, insertMode) {
    var ct = CompartmentTypes.findOne({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
        var value = "";
        var mapped_value = undefined;
        if (ct["inputType"]["type"] == "checkbox") {
            mapped_value = _.find(ct["inputType"]["values"], function(s) { return input == s["input"]})["value"];
        };
        if (ct["inputType"]["type"] == "radio") {
            mapped_value = _.find(ct["inputType"]["values"], function(s) { return input == s["input"]})["value"];
        };
        value = Dialog.buildCompartmentValue(ct,  input, mapped_value);
        this.setCompartmentValue(comp_name, input, value, insertMode);
    }
  },
  // adds comparment with subcompartments
  // string, [{name: string, value:string, transformer: function}]
  addCompartmentSubCompartments: function(compartment_name, subcompartment_value_list) {
    var ct = CompartmentTypes.findOne({name: compartment_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
      var c_to_create = {
                compartment: {
                  projectId: Session.get("activeProject"),
                  versionId: Session.get("versionId"),

                  diagramId: this.getDiagram_id(),
                  diagramTypeId: ct["diagramTypeId"],
                  elementTypeId: ct["elementTypeId"],

                  compartmentTypeId: ct._id,
                  elementId: this._id(),

                  index: ct.index,
                //???  input: input,
                //???  value: value,
                  subCompartments: {},
                  isObjectRepresentation: false,

                  style: ct.styles[0]["style"],
                  styleId: ct.styles[0]["id"],
                },
              };
      c_to_create["compartment"]["subCompartments"][compartment_name] = {};
      c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name] = {};

      if (ct.inputType.type == "custom" && ct.inputType.templateName == "multiField") {
           var ct_comparts_indexes = Compartments.find({compartmentTypeId: ct._id, elementId: this._id()}, {sort: {index: 1}})
                                    .map(function(c) {return c.index; });
          // search for hole in the array of indexes
           for (var idx of ct_comparts_indexes) {
             if (idx > c_to_create.compartment.index) { break; };
             c_to_create.compartment.index += 1;
           }
		  }

      var sorted_sub_compart_types = _.sortBy(ct["subCompartmentTypes"][0]["subCompartmentTypes"], function(sct) {return sct.index} );
      var value_array = [];

      _.each(sorted_sub_compart_types, function(sub_c) {
         c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};
        var sc_value = "";
        var sc = _.find(subcompartment_value_list, function(s) {return s.name == sub_c.name});
        if (sc) {

          if (sc.name && sc.value) {
             var transformer = (sc.transformer) ? sc.transformer : function(v)  {return v};

            var mapped_value = undefined;
            if (sub_c["inputType"]["type"] == "checkbox") {
                mapped_value = _.find(sub_c["inputType"]["values"], function(s) { return transformer(sc.value) == s["input"]})["value"];
            };
			if(typeof sc.input !== "undefined") mapped_value = sc.input;
             sc_value = Dialog.buildCompartmentValue(sub_c,  transformer(sc.value), mapped_value);
             c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sc.name]["input"] = transformer(sc.value);
             c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sc.name]["value"] = sc_value;
            //
          }
        } else {
          // THIS probably doesn't work
          sc_value = Dialog.buildCompartmentValue(sub_c);
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["input"] = sc_value;
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["value"] = sc_value;
        };

        if (sc_value) {
          value_array.push(sc_value);
          value_array.push(ct["concatStyle"])
        };
      });
      value_array.pop();
      c_to_create["compartment"]["value"] = value_array.join("");
      c_to_create["compartment"]["input"] = c_to_create["compartment"]["value"];
      Utilities.callMeteorMethod("insertCompartment", c_to_create);
    };
  },

	// sets style
	// Style_attr is an object, e.g., {attrName:"startShapeStyle.shape",attrValue:"Circle"}
	// Should provide a list of style_attrs
	setCustomStyle: function(style_attr_list) {
	  // console.log(style_attr_list);
     var element_id = this._id();
		 var diagram_id = this.getDiagram_id();
		 _.forEach(style_attr_list, function(a) {
			 a["elementId"] = element_id
			 a["diagramId"] = diagram_id
			 a["projectId"] = Session.get("activeProject");
			 a["versionId"] = Session.get("versionId");
			 a["styleId"] = "custom";

			 Utilities.callMeteorMethod("updateElementStyle", a);
		 })

	},

	boolToString: function(bool) {if (bool) {return "true"} else {return "false"}},

  isVirtualRoot: false,

  setVirtualRoot: function(isRoot) { this.isVirtualRoot = isRoot; VQ_Element_cache[this._id()].isVirtualRoot = isRoot},


  //Read coordinates and size of box
  getCoordinates: function(){
  	var element_id = this._id();
  	var element = Elements.findOne({_id: element_id});
	var x = element["location"]["x"];
	var y = element["location"]["y"];
	var w = element["location"]["width"];
	var h = element["location"]["height"];
  	return {x: x, y: y, width: w, height: h}
  },
	// Temporal solution: Put new element below target element, as close as possible without overlapping
	// d - step to move below after each try
	// Returns {x: x, y: y1, width: w, height: h} (the left upper corner + dimensions)
	getNewLocation: function (d = 30) {
	    //console.log(this);
	    var boxCoord = this.getCoordinates();
	    var x = boxCoord["x"];
	    var y = boxCoord["y"];     
	    var w = boxCoord["width"];
	    var h = boxCoord["height"];
	    //y1 - coordinate for a new element; 1st itteration
	    var y1 = y + h + d;

	    var elem_list = [];
	    var elem_over = []; //Potentionally - for more complex search for a better place
	    var max_y;

	    Elements.find({type: "Box"}).forEach(function(el) {
	        elem_list.push(el);
	    })

	    do{
	        elem_over.length = 0;

	        _.each(elem_list, function(el) {
	            //Check, if start point of new element could lead to overlap with existing elements
	            if (el["location"]["x"] < (x+w)){
	                if (el["location"]["y"] < (y1+h)){
	                    //Check, if end point of existing element could lead to overlap
	                    if((el["location"]["x"]+el["location"]["width"]) > x){
	                        if((el["location"]["y"])+el["location"]["height"] > y1){
	                            elem_over.push({
	                                _id: el["_id"],
	                                x: el["location"]["x"],
	                                y: el["location"]["y"],
	                                w: el["location"]["width"],
	                                h: el["location"]["height"]
	                            });
	                        }
	                    }
	                }
	            }
	        })
	        // If any disturbing element exist, find the lowest one (max y) and try new space that is lower by d
	        if (elem_over.length > 0){
	            max_y = 0;

	            _.each(elem_over, function(el){
	                if (max_y < (el["y"]+el["h"])) {
	                    max_y = el["y"]+el["h"];
	                }
	            })

	            y1 = max_y + d;
	        }
	    } while (elem_over.length > 0);

	    return {x: x, y: y1, width: w, height: h};
	},

	//Set appearence for known class styles 
    //Entry data: query, condition, subquery
    setClassStyle: function(style) {  
      
	    var elem_type = ElementTypes.findOne({_id: this.obj.elementTypeId});
	    if (!elem_type){
	    		console.error("setClassStyle: no elem_type");
	        return;
	    }
  
	    var elemData = [];
	    var elem_style = [];
	    if (style == "query"){
	    	//console.log("setClassStyle: query");
	    	elem_style = _.find(elem_type.styles, function(stl) {
	                                return stl.name === "Default";
	                            });
	    } else if (style == "condition"){
	    	// console.log("setClassStyle: condition");
	        elem_style = _.find(elem_type.styles, function(stl) {
	                                return stl.name === "ConditionClass";
	                            });
	    } else if(style == "subquery"){
	    	// console.log("setClassStyle: subquery");
	        elem_style = _.find(elem_type.styles, function(stl) {
	                                return stl.name === "SubQueryClass";
	                            });	        
	    }else{
	        console.log("setClassStyle: unknown style");
	        return;
	    }

	    if (!elem_style || !elem_style.elementStyle){
	    	console.log("setClassStyle: no style found");
	    	return;
	    }

	    elemData = [{attrName:"elementStyle.fill",attrValue:elem_style.elementStyle.fill},
	                {attrName:"elementStyle.shape",attrValue:elem_style.elementStyle.shape},
	                {attrName:"elementStyle.stroke",attrValue:elem_style.elementStyle.stroke}];

	    var element_id = this._id();
		var diagram_id = this.getDiagram_id();
		_.each(elemData, function(a) {
			 a["elementId"] = element_id
			 a["diagramId"] = diagram_id
			 a["projectId"] = Session.get("activeProject");
			 a["versionId"] = Session.get("versionId");
			 a["styleId"] = elem_style.id; //console.log(elem_style.id);

			 Utilities.callMeteorMethod("updateElementStyle", a);
		})

	    this.setCompartmentValue("ClassType", style, style);
	    // this.obj.styleId = elem_style.id;      
	    // return elem_style.id;
	    return;
    },

    // Get ID of the root element for any element
    getRootId: function (){
    	var classObj = this;
    	if (!classObj.isClass()) {return 0;}
    	if (classObj.isRoot()){console.log(classObj.obj);
    		return classObj.obj._id;
    	} else {
    		if (classObj.getLinkToRoot()){
    			var elements = classObj.getLinkToRoot().link.getElements();
    			if (classObj.getLinkToRoot().start) {
    				return elements.start.getRootId();
    			} else {
    				return elements.end.getRootId();
    			}
    		}
    	}
    },

    deleteElement: function(){
    	// elements: array of IDs; elementNames: empty or array of IDs (for logs)
    	Interpreter.extensionPoints.DeleteElementsCollection({elements: [this.obj["_id"]], elementNames: [this.obj["_id"]], diagramId: Session.get("activeDiagram"), versionId: Session.get("versionId")});    	 
    },

}
