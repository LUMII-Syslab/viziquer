
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
			sc = schema.findClassByName(sc_name);
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
function findPrefixFromList(uri) {
  PrefixList =
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
    "http://www.europeana.eu/schemas/edm/": "edm"
  }
  if ( typeof PrefixList[uri] != 'undefined') { return PrefixList[uri];}
  else { return null; }
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
function findChildrenList(schema_class,parent_list){
	var cycle = [];
	var cl_name = schema_class.getClassName();
	if (_.indexOf(parent_list, cl_name) == -1 )
	{
		var subClasses = _.filter(schema.Classes, function(cl){ return _.indexOf(cl.fixedSuperClasses,cl_name) != -1 ; })
		if (_.size(subClasses) == 1 && _.size(subClasses[0].fixedSuperClasses) == 1 && _.size(subClasses[0].cycle) == 0 )  
			cycle = findChildrenList(subClasses[0],_.union(parent_list,cl_name));
		else
			cycle = _.union(parent_list,cl_name);
	}
	else
	{ 
		cycle = parent_list;
	}	
	return cycle;
}
function checkClassForTree(schema_class, deep) {
	if ( schema.treeMode == "Remove" && schema_class.instanceCount < 6 ) // !!!!!! Te arī konstante, nav īsti labi
		return false;
	if ( schema.treeMode == "Compact" && schema_class.isInTree )
		return false;
	return true;
}
var ccc = 0;
function makeTreeList(classes, deep) {
    var ekv = "= ";
	var class_list = [];
	var small_class_list = [];
	var tree_list = [];
	_.each(classes, function(cl_info) {
 ccc = ccc +1
 if ( ccc > 300 ) { console.log("DAUDZZZZZZZZZZZZZZZZZZZZZZZ makeTreeNode"); return tree_list;};
		var cl_name = cl_info.name;
		var data_id = cl_name;
		var node_id = schema.getNewIdString(cl_name);
		small_class_list = [];
		var schema_class = schema.findClassByName(cl_name);
		var local_name =  schema_class.getClassName(); // !!!!!!!cl_name;
		if (schema_class.localName == "_")
		{
			local_name =  schema_class.ontology.dprefix.concat(":All classes"); // !!!!!!!cl_name;
			data_id = "";
		}	
		if (schema_class.localName == "__")
		{
			local_name =  "Other classes"; // !!!!!!!cl_name;	
			data_id = "";
		}	
		if ( _.size(schema_class.cycle) > 0 && cl_name != schema_class.cycle[0] && schema_class.localName != schema_class.cycle[0])
			local_name = ekv.concat(local_name);
		if ( schema_class.instanceCount > 0)
			local_name = local_name.concat("  (", schema_class.instanceCount,")");		
		var tree_node = {node_id:node_id,data_id:data_id, localName:local_name, parent:cl_info.parent, tree_path:cl_info.parent_list.join(" > "), parent_list:cl_info.parent_list, deep:deep};
	
		tree_list = _.union(tree_list, tree_node);
		//schema_class.tree_nodes = _.union(schema_class.tree_nodes, tree_node); // !!!!! vai to vajag
		if ( schema.treeMode == "Compact" && deep == 5 )
		{
			_.each (schema_class.allSubClasses, function (sc){
				if (checkClassForTree(sc, deep))
				{
					small_class_list  = _.union(small_class_list , {name:sc.getClassName(), inst_count:sc.instanceCount,parent:node_id,parent_list:_.union(cl_info.parent_list,cl_name)});		
					sc.isInTree = true;
				}	
			})
		}
		else
		{
			_.each (schema_class.subClasses, function (sc){
				if ( checkClassForTree(sc, deep))
				{
					small_class_list  = _.union(small_class_list , {name:sc.getClassName(),inst_count:sc.instanceCount,parent:node_id,parent_list:_.union(cl_info.parent_list,cl_name)});	
					sc.isInTree = true;
				}		
			})
		}
		
		class_list = _.union(class_list , small_class_list);
		class_list = _.sortBy(class_list, function(c) {return c.localName});
		class_list = _.sortBy(class_list, function(c) {return -c.inst_count});
		
	})
	
	if (_.size(class_list) > 0 )
		tree_list = _.union(tree_list, makeTreeList(class_list, deep + 1));	
	
	return tree_list;
}
function makeTree(tree_list, parent, deep) {
	var Tree = [];
	_.each(_.filter(tree_list, function(t){ return t.deep == deep && t.parent == parent; }), function(tr_node){
		var children = makeTree(tree_list, tr_node.node_id, deep + 1);
		tr_node.children = children;
		tr_node.ch_count = _.size(children)
		Tree = _.union(Tree,tr_node);
	})
	return Tree;
}
	
VQ_Schema = function ( data = {}, tt = 0) {
//console.log("***************************************")
//console.log(tt.toString().concat("  - data ", _.size(data).toString()," schema  ", Schema.find().count().toString()))

   if (Schema.find().count() == 0 && _.size(data) == 0)
   {
		//console.log("Neatrada shēmu vai datus");  
		return; 
    }
   
   var startTime = Date.now()
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
   this.OwlFormat = {};   
   schema = this;
   
   if ((Schema.find().count() == 1 ))
   {
      data = Schema.findOne();
      if (data.Schema) data = data.Schema;
   } 	  
   
   if (_.size(data.NewClasses) == 0 )
   {
	   //console.log("Taisa visu no jauna")
	   this.makeClassesAndTree(data);
	   this.makeAttributesAndAssociations(data);
   }
   else
   {
	   //console.log("Atjauno esošo")
	   this.restoreClassesAndTree(data);
	   //console.log(Date.now() - startTime)
       this.makeAttributesAndAssociations(data);  
   }
  
   //console.log(schema)
   VQ_r2rml(schema); 	// !!! To varbūt jāatstāj dzīvajā

	//console.log("44444")
	//console.log(Date.now() - startTime)
};

VQ_Schema.prototype = {
  constructor: VQ_Schema,
  namespace:null,
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
  treeMode:null, 
  OwlFormat:null,
  currentId: 0,
  classCount: 0,
  getNewIdString: function(name) {
	this.currentId = this.currentId + 1;
    return "ID_" + this.currentId; // + "_" + name;
  },
  classExist: function (name) {
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
    var classes = _.filter(this.Classes, function (cl){
	             return ( cl.localName != " " && cl.localName != "_" && cl.localName != "__" )  });	
    return _.map(classes, function (cl) {
				return {name:cl.getClassShortName()};});
  },
  getAllSchemaAssociations: function (){
    return _.map(this.Associations, function (cl) {
				if (cl.isUnique) return {name: cl.localName};
				else  if (cl.ontology.prefix == "") return {name: cl.localName};
				      else return {name: cl.ontology.prefix + ":" + cl.localName}; });
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
	return this.findElementByName(name, this.Classes);
  },
  findClassByNameAndCycle: function(name) {
	var cl = this.findClassByName(name);
	if (_.size(cl.cycle) > 0 )
		return this.findClassByName(cl.cycle[0]);
    return cl;
  },
  findAssociationByName: function(name) {
	return this.findElementByName(name, this.Associations);
  },
  findAttributeByName: function(name) {
	return this.findElementByName(name, this.Attributes);
  },
  findSchemaRoleByName: function(name, sourceClass, targetClass) {
    var element = _.find(this.SchemaRoles, function(el){
		if ( findName(name, el) && findName(sourceClass, el.sourceClass) && findName(targetClass, el.targetClass)) { return el; }; })
	return element;
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
    if (this.classExist(className))
		return this.findClassByName(className).getClassInfo();
	else
        return null;
  },
  resolveLinkByName: function (linkName) {
    if (this.associationExist(linkName))
		return this.findAssociationByName(linkName).getAssociationInfo();
	else
		return null;
  },
  resolveSchemaRoleByName: function (linkName, sourceClass, targetClass) {
    if (this.associationExist(linkName))
	{    
		return this.findSchemaRoleByName(linkName, sourceClass, targetClass).getSchemaRoleInfo();
	}
	else
		return null;
  },
  resolveAttributeByName: function (className, attributeName) {
    // Pagaidām klases vārds netiek ņemts vērā
	if (this.attributeExist(attributeName))
		return this.findAttributeByName(attributeName).getAttributeInfo();
	else
		return null;
  },
  getPrefixes: function() {
    var prefixes = []
	_.each(this.Ontologies, function (o){
		prefixes = _.union( prefixes, [[o.prefix, o.namespace]]);
	})
	return prefixes;
  },
  makeClassesAndTree: function(data) {
		var top_classes = [];
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
		
		_.each(data.Classes, function(cl){
		  schema.addClass( new VQ_Class(cl));
		})
	
	  // !!!! Mēdz būt virsklases ieliktas, kuru nav shēmā 
		top_classes = _.filter(this.Classes, function (cl) { return _.size(cl.originalSuperClasses) == 0 && cl.localName != " "  } );
		
		_.each(top_classes, function (cl){
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
		
		schema.addClass( new VQ_Class({}));
		
		_.each(this.Classes, function(cl){
			cl.classInfo = new VQ_ClassInfo(cl);
		})
	
		_.each(this.Classes, function(cl){ 
			var superClasses = [];
			_.each(cl.originalSuperClasses, function (sc){
				var superClass = schema.findClassByName(sc);
				if (superClass.localName != " " && cl.getClassName() != superClass.getClassName())
				{
					superClasses = _.union(superClasses, [superClass.getClassName()]);
					superClass.originalSubClasses = _.union(superClass.originalSubClasses, [cl.getClassName()]);
				}	
			})
			cl.originalSuperClasses = superClasses;
		})	

		top_classes = _.filter(this.Classes, function (cl) { return _.size(cl.originalSuperClasses) == 0 && cl.localName != " "  } );
	
		_.each(top_classes, function (cl){
			cl.ontology.topClassCount = cl.ontology.topClassCount + 1 ;
		})	
	
		_.each(this.Classes, function (cl){
			_.each(schema.Classes, function (c){ c.isVisited = false})
			cl.originalAllSuperClasses = collectOriginalClasses(cl, "originalAllSuperClasses", "originalSuperClasses");
			_.each(schema.Classes, function (c){ c.isVisited = false})
			cl.originalAllSubClasses = collectOriginalClasses(cl, "originalAllSubClasses", "originalSubClasses");
		})
	
		_.each(this.Classes, function (cl){
			var cycle = _.intersection(cl.originalAllSuperClasses,cl.originalAllSubClasses);
			cycle = _.sortBy(cycle, function(nn){ return nn; });
			cl.cycle = cycle;
		})

		_.each(this.Classes, function (cl){
			if (_.size(cl.cycle) > 1 )
				schema.Cycles[cl.cycle[0]] = cl.cycle;		
		})
	

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
		})
	
		top_classes = _.filter(this.Classes, function (cl) { return _.size(cl.fixedSuperClasses) == 0 && cl.localName != " "  } );
		_.each(top_classes, function(cl) {
			var top_cycle = findChildrenList(cl,[]);
			if (_.size(top_cycle) > 2)
			{	
				_.each(top_cycle, function(cc){
					cc_class = schema.findClassByName(cc);
					cc_class.cycle = top_cycle;
					if (cc_class.getClassName() != top_cycle[0])
						cc_class.fixedSuperClasses = [top_cycle[0]];
				})
			}
		})

		//console.log("22222")
		//console.log(Date.now() - startTime)

		if ( _.size(schema.Cycles) == 0 )
		{
			_.each(this.Classes, function(cl){
				_.each(cl.originalSubClasses, function(o){ 
					var o_class = schema.findClassByName(o); 
					var ID = o_class.getID(); 
					cl.subClasses[ID] = o_class.classInfo; 
				});	
				_.each(cl.originalSuperClasses, function(o){ 
					var o_class = schema.findClassByName(o); 
					var ID = o_class.getID();
					cl.superClasses[ID] = o_class.classInfo; 
				});
				_.each(cl.originalAllSubClasses, function(o){ 
					var o_class = schema.findClassByName(o); 
					var ID = o_class.getID();
					cl.allSubClasses[ID] = o_class.classInfo; 
				});
				_.each(cl.originalAllSuperClasses, function(o){ 
					var o_class = schema.findClassByName(o); 
					var ID = o_class.getID();
					cl.allSuperClasses[ID] = o_class.classInfo; 
				});
				var allSuperSubClasses = {};
				_.extend(allSuperSubClasses, cl.allSuperClasses);
				_.extend(allSuperSubClasses, cl.allSubClasses);
				cl.allSuperSubClasses = allSuperSubClasses;	
				
				var allSuperSubSuperClasses = {};
				_.extend(allSuperSubSuperClasses, cl.allSuperClasses);
				_.extend(allSuperSubSuperClasses, cl.allSubClasses);
				cl.allSuperSubSuperClasses = allSuperSubSuperClasses;					
			})
		}
		else
		{
			_.each(this.Classes, function(cl){
				_.each(cl.fixedSuperClasses, function (sc){
					var superClass = schema.findClassByName(sc);
					if (superClass.localName != " ")
					{
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
				var allSuperSubClasses = {};
				_.extend(allSuperSubClasses, cl.allSuperClasses);
				_.extend(allSuperSubClasses, cl.allSubClasses);
				cl.allSuperSubClasses = allSuperSubClasses;	
				var allSuperSubSuperClasses = {};
				_.extend(allSuperSubSuperClasses, cl.allSuperClasses);
				_.extend(allSuperSubSuperClasses, cl.allSubClasses);
				cl.allSuperSubSuperClasses = allSuperSubSuperClasses;					
			})
			
			_.each(this.Classes, function(cl){
				_.each(cl.subClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.subClasses[ID] = o_class.classInfo; });	
				_.each(cl.superClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.superClasses[ID] = o_class.classInfo; });
				_.each(cl.allSubClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.allSubClasses[ID] = o_class.classInfo; });
				_.each(cl.allSuperClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.allSuperClasses[ID] = o_class.classInfo; });
				_.each(cl.allSuperSubClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.allSuperSubClasses[ID] = o_class.classInfo; });	
				_.each(cl.allSuperSubSuperClasses, function(o_class){ 
					var ID = o_class.getID();
					cl.allSuperSubSuperClasses[ID] = o_class.classInfo; });						
			})		
		} 
		
		_.each(this.Classes, function (cl){
			_.each(cl.allSubClasses, function(sc){
				if (cl.instanceCount == sc.instanceCount || ( cl.instanceCount > 0 && cl.instanceCount > 0 && sc.instanceCount > 5*cl.instanceCount/100 ) )
				{
					var sc_class = schema.findClassByName(sc.shortName)
					_.each(sc_class.allSuperClasses, function(ssc){
						var ID = ssc.ID;
						if ( ID != cl.getID())
							cl.allSuperSubSuperClasses[ID] = ssc;						
					})
				}
			});		
		})
		
		
	this.makeSchemaTree();	
	//console.log(this.Tree)	
  },
  restoreClassesAndTree: function(data) {
  	this.namespace = data.namespace;
	this.Ontologies = data.Ontologies;
    this.Cycles = data.Cycles;
	this.Tree = data.Tree;
	_.each(data.NewClasses, function(obj){
		var newObj = new VQ_Class(obj.Info)
		schema.addClass(newObj);
		obj.NewClass = newObj;
		newObj.fullName = obj.fullName;
		newObj.classInfo = obj.classInfo;
		newObj.instanceCount = obj.instanceCount;
		newObj.isUnique = obj.isUnique;
		newObj.ontology = obj.ontology;
	})
	
	_.each(data.NewClasses, function(obj){
		var newObj = obj.NewClass; 
		_.each(obj.subClasses, function(o){ var ID = o.ID; newObj.subClasses[ID] = schema.findClassByName(o.shortName); });  
		_.each(obj.superClasses, function(o){ var ID = o.ID; newObj.superClasses[ID] = schema.findClassByName(o.shortName); });  
		_.each(obj.allSubClasses, function(o){ var ID = o.ID; newObj.allSubClasses[ID] = schema.findClassByName(o.shortName); }); 
		_.each(obj.allSuperClasses, function(o){ var ID = o.ID; newObj.allSuperClasses[ID] = schema.findClassByName(o.shortName); }); 
		_.each(obj.allSuperSubClasses, function(o){ var ID = o.ID; newObj.allSuperSubClasses[ID] = schema.findClassByName(o.shortName); }); 
		_.each(obj.allSuperSubSuperClasses, function(o){ var ID = o.ID; newObj.allSuperSubSuperClasses[ID] = schema.findClassByName(o.shortName); }); 
	})
  },
  makeAttributesAndAssociations: function(data) {
	_.each(data.Attributes, function(atr){
		var newAttr = new VQ_Attribute(atr);
	    schema.addAttribute(newAttr);
		_.each(atr.SourceClasses, function (sc){
			var scClass = schema.findClassByNameAndCycle(sc);
			var newSchAttr = new VQ_SchemaAttribute(atr);
			schema.addSchemaAttribute(newSchAttr);
			schema.addSchemaProperty(newSchAttr);
			scClass.addProperty(newSchAttr);
			//createLink(newAttr, newSchAttr, "schemaAttribute", "attribute");
			newAttr["schemaAttribute"][newSchAttr.ID] = newSchAttr;
			//createLink(scClass, newSchAttr, "schemaAttribute", "sourceClass");
			scClass["schemaAttribute"][newSchAttr.getID()] = newSchAttr;  
			newSchAttr["sourceClass"] = scClass.classInfo;
		})
	})
	
	_.each(data.Associations, function(asoc){
		var newRole = new VQ_Role(asoc);
		schema.addRole(newRole);
		_.each(asoc.ClassPairs, function(cp){
			var scClass = schema.findClassByNameAndCycle(cp.SourceClass);
			var tClass = schema.findClassByNameAndCycle(cp.TargetClass);
			var newSchRole = new VQ_SchemaRole(asoc, cp, newRole);
			if ( !newRole.maxCardinality) {
			  newRole.minCardinality = 0;
			  newRole.maxCardinality = -1;
			}
			if (scClass.localName == tClass.localName) newSchRole.isSymmetric = true;
			schema.addSchemaRole(newSchRole);
			schema.addSchemaProperty(newSchRole);
			scClass.addProperty(newSchRole);
			//createLink(newRole, newSchRole, "schemaRole", "role");
			newRole["schemaRole"][newSchRole.ID] = newSchRole;
  		    //createLink(scClass, newSchRole, "outAssoc", "sourceClass");
			scClass["outAssoc"][newSchRole.ID] = newSchRole;
			newSchRole["sourceClass"] = scClass.classInfo;
         	//createLink(tClass, newSchRole, "inAssoc", "targetClass");
			tClass["inAssoc"][newSchRole.ID] = newSchRole;
			newSchRole["targetClass"] = tClass.classInfo;
		})
	})

	_.each(data.Associations, function(asoc){
		_.each(asoc.ClassPairs, function(cp){
			if (cp.inverseRole)
			{
			  var schRole = schema.findSchemaRoleByName(asoc.localName, cp.SourceClass, cp.TargetClass);
			  var invSchRole = schema.findSchemaRoleByName(cp.inverseRole, cp.TargetClass, cp.SourceClass);
			  if (invSchRole)
				schRole.inverseSchemaRole = invSchRole.ID;  
			}
		})
	})
  },
  makeSchemaTree: function() {
	var top_classes = [];
	
	var big_class_count = _.size( _.filter(schema.Classes, function (cl) { return cl.instanceCount > 4 && cl.localName != " "  }));
	if ( schema.classCount < 100 ) // !! Te varbūt jāpadomā kā drusku gudrāk atšķirot - jāpaskatās arī vidējais virsklašu skaits, ja ir zinams instanču skaits daļa iet nost
		schema.treeMode = "Full";
	else if ( big_class_count > 0 && big_class_count < 100 )
		schema.treeMode = "Remove";
	else
		schema.treeMode = "Compact";
		
	//schema.treeMode = "Compact" // Tas ir testam
	
	top_classes = _.filter(schema.Classes, function (cl) { return _.size(cl["superClasses"]) == 0 && cl.localName != " " && checkClassForTree(cl, 1) } );
	var top_ontologies = _.filter(schema.Ontologies, function (ont) { return ont.topClassCount > 0 } );
	top_ontologies = _.sortBy(top_ontologies, function(ont) {return -ont.topClassCount});

// !!!! Te atkal ir konstante nu jau divas 
	if (_.size(top_classes) > 10 || _.size(top_ontologies) > 2 )
	{
		//console.log(top_ontologies)
		// !!!! To vajag darīt ne vienmēr, atkal kādu konstanti vajag izdomāt
		_.each(top_ontologies, function(ont){
			var top_class = _.find(schema.Classes, function(cl){ if (cl.localName == "Thing" && cl.ontology.namespace == ont.namespace ) return true;});
			var t_name = "Thing";
			if ( ont.topClassCount > 1 )
			{
				if ( ! top_class )
				{
					top_class = new VQ_Class({localName:"_",namespace:ont.namespace,SuperClasses:[],instanceCount:ont.instanceCount});
					schema.addClass(top_class);
					top_class.classInfo = new VQ_ClassInfo(top_class);
					t_name = "_";  // !!! Jāizdomā, kā labak nosaukt ko klasi 
				}
			}
			else
			{
				top_class = schema.findClassByName("__");
				t_name = "__";
				if (top_class.localName == " ")
				{								
					top_class = new VQ_Class({localName:"__",namespace:schema.namespace,SuperClasses:[],instanceCount:0});
					schema.addClass(top_class);	
					top_class.classInfo = new VQ_ClassInfo(top_class);
				}
			}
			
			var ont_top_classes =  _.filter(schema.Classes, function (cl) { return _.size(cl.superClasses) == 0 && cl.ontology.namespace == ont.namespace && cl.localName != t_name && cl.localName != " "  } );
			_.each(ont_top_classes, function(cl){
				top_class.subClasses[cl.getID()] = cl.classInfo; //top_class.addSubClass(cl); 
				cl.superClasses[top_class.getID()] = top_class.classInfo; //cl.addSuperClass(top_class);
			})
			
		})

	}
	
	ccc = 0
    top_classes = _.filter(schema.Classes, function (cl) { return _.size(cl["superClasses"]) == 0 && cl.localName != " " && checkClassForTree(cl, 1) && cl.localName != "__" } );

	top_classes = _.map(top_classes, function(cl) { return {name:cl.getClassName(),inst_count:cl.instanceCount,parent:"",parent_list:[]}});
	top_classes = _.sortBy(top_classes, function(cl) {return cl.name});  // !!! Te sakārtot pec klašu skaita ontoloģijā
	top_classes = _.sortBy(top_classes, function(cl) {return - cl.inst_count});
	
	tmpClass = schema.findClassByName("__");
	if (tmpClass.localName != " ")
		top_classes = _.union(top_classes, [{name:tmpClass.getClassName(),inst_count:tmpClass.instanceCount,parent:"",parent_list:[]}])
		
	var tree_list = makeTreeList(top_classes, 1)
	
	//console.log(tree_list)
	
	schema.Tree = makeTree(tree_list, "", 1);
	//console.log(JSON.stringify(schema.Tree,0, 2))
	//Session.set("SSSS",JSON.stringify(schema.Tree,0, 2))
	//console.log(Session)
	var ttt = JSON.parse(JSON.stringify(schema.Tree,0, 2))
  },  
  getOwlFormat: function() {
	// !!!! Jāpaskatās, vai nav jau sarēķināts
	var newLine = "\n";
	
	schema.OwlFormat["1_Ontologies"] = "";
	_.each(schema.Ontologies, function(ont){
		if (ont.isDefault)
			schema.OwlFormat["1_Ontologies"] = schema.OwlFormat["1_Ontologies"].concat(newLine,"Prefix(:=<",ont.namespace,">)");
		else
			schema.OwlFormat["1_Ontologies"] = schema.OwlFormat["1_Ontologies"].concat(newLine,"Prefix(",ont.prefix,":=<",ont.namespace,">)");
	})
	
	schema.OwlFormat["2_Declarations"] = "";
	schema.OwlFormat["3_DeclarationsWithAnnot"] = "";
	schema.OwlFormat["4_SubClassOf"] = "";
	schema.OwlFormat["5_Cardinalities"] = "";
	var list1 = [];
	var a = ""
	
	
	_.each(schema.Classes, function(cl){
		if (cl.localName != " ")
		{
			cl_name = cl.getClassName();
			schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(Class(",cl_name,"))");
			//if (cl.instanceCount > 4)
			  //console.log(a.concat("Declaration(Class(",cl_name,"))"));
			schema.OwlFormat["3_DeclarationsWithAnnot"] = schema.OwlFormat["3_DeclarationsWithAnnot"].concat(newLine,"Declaration(Class(",cl_name,"))");
			if (cl.instanceCount > 0)
			{			
				schema.OwlFormat["3_DeclarationsWithAnnot"] = schema.OwlFormat["3_DeclarationsWithAnnot"].concat(newLine,"AnnotationAssertion(owlc:instanceCount ",cl_name,' "',cl.instanceCount,'"^^xsd:integer )');  
			    //if (cl.instanceCount > 4)
				//console.log(a.concat("AnnotationAssertion(owlc:instanceCount ",cl_name,' "',cl.instanceCount,'"^^xsd:integer )'));
			}	
			if (_.size(cl.subClasses) > 0)
			{
				_.each(cl.subClasses, function(sc) {
					sc_name = sc.getClassName();
					schema.OwlFormat["4_SubClassOf"] = schema.OwlFormat["4_SubClassOf"].concat(newLine,"SubClassOf(",sc_name," ",cl_name,")");
					
					//if (cl.instanceCount > 4 && sc.instanceCount > 4 )
					//	console.log(a.concat("SubClassOf(",sc_name," ",cl_name,")"));		
			
				}) 
			}			
		}
	})
	//console.log(list1);
	
	//SubClassOf(:AA ObjectMinCardinality(1 :p1))

	_.each(schema.Associations, function(el){
		if (el.localName != " ")
		{   el_name = el.getElementName(); 
			schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(ObjectProperty(",el_name,"))");
			if (el.maxCardinality != -1)
				schema.OwlFormat["5_Cardinalities"] = schema.OwlFormat["5_Cardinalities"].concat(newLine,"Declaration(ObjectProperty(",el_name,"))");
			
		}
	})

	_.each(schema.Attributes, function(el){
		if (el.localName != " ")
		{
			schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(DataProperty(",el.getElementName(),"))");
		}			
	})

	schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(AnnotationProperty(owlc:source))");
	schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(AnnotationProperty(owlc:target))");
	schema.OwlFormat["2_Declarations"] = schema.OwlFormat["2_Declarations"].concat(newLine,"Declaration(AnnotationProperty(owlc:instanceCount))");
	
	//console.log(schema.OwlFormat)
	   			//	var link = document.createElement("a");
				//link.setAttribute("download", "data.json");
				//link.href = URL.createObjectURL(new Blob([JSON.stringify(schema.OwlFormat, 0, 4)], {type: "application/json;charset=utf-8;"}));
				//document.body.appendChild(link);
				//link.click();	
  },
 }

function findName(name, element) {
  if (element && (element.localName == name || element.fullName == name || 
     element.ontology.prefix + ":" + element.localName == name || element.ontology.dprefix + ":" + element.localName == name )) return true;
  return false
}

function findPrefix(arr, pos) {
  if (arr[pos] == "" ) return findPrefix(arr, pos-1);
  if (!isNaN(arr[pos][0])) return findPrefix(arr, pos-1);
  return arr[pos].split("#")[0];
}

VQ_ontology = function (URI, prefix) {
  if ( URI.endsWith("/#"))
    URI = URI.substring(0, URI.length -1);
  this.namespace = URI;
  this.elementCount = 1;
  this.classCount = 0;
  this.topClassCount = 0;
  this.instanceCount = 0;
  p = "";
  this.namesAreUnique = true;
  if (prefix) p = prefix;
  else {
    p = findPrefixFromList(URI)
    if ( p == null )
	{
	  var arr = URI.split("/");
	  p = schema.checkOntologyPrefix(findPrefix(arr, _.size(arr)-1));
	  if ( p.endsWith(".owl"))
		p = p.substring(0, p.length -4 );
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
  topClassCount:null,
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
	this.ID = schema.getNewIdString(localName) + " (" + elemType + ")";
	this.localName = localName;
	this.triplesMaps = [];
	var uri = null;

	if (elemInfo.namespace) uri = elemInfo.namespace;
	else if (elemInfo.fullName) uri = elemInfo.fullName.substring(0, elemInfo.fullName.length- elemInfo.localName.length);
	else uri = schema.namespace;

	if (elemInfo.instanceCount)
		this.instanceCount = elemInfo.instanceCount;
	else 
		this.instanceCount = -1
	
	var ontology = schema.ontologyExist(uri);
	if (ontology) { this.ontology = ontology }
	else {
	  ontology = new VQ_ontology(uri, elemInfo.prefix);
	  schema.addOntology(ontology);
	  this.ontology = ontology;
	}
		
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
  triplesMaps: null,
  getID: function() { return this.ID },
  getElemInfo: function() {
    if (this.localName == " ") return {};
	return {localName:this.localName, URI:this.fullName, Namespace:this.ontology.namespace,
			Prefix:this.ontology.prefix, DefaultNamespace:schema.namespace, triplesMaps:this.triplesMaps};  
  },
  getElementName : function (){
	return this.ontology.dprefix + ":" + this.localName; 
  }
}

VQ_Class = function (classInfo){
    VQ_Elem.call(this, classInfo, "class");
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
	this.tree = [];
	this.tree_deep = 0;
	this.tree_nodes = [];
	this.tree_path = "";
	this.isInTree = false;
	this.isVisited = false;
	
	var e = _.find(schema.Classes, function(el){ if ( el.localName == classInfo.localName ) { return el; }; })
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
VQ_Class.prototype.classInfo = null;
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
VQ_Class.prototype.tree = null;
VQ_Class.prototype.tree_deep = null;
VQ_Class.prototype.tree_nodes = null;
VQ_Class.prototype.tree_path = null;
VQ_Class.prototype.isInTree = null;
VQ_Class.prototype.isVisited = null;
VQ_Class.prototype.getAssociations = function() {
    var out_assoc =  _.map(this.outAssoc, function (a) {
				return {name: a.localName, isUnique:a.isUnique, prefix:a.ontology.dprefix, isDefOnt:a.ontology.isDefault, class: a.targetClass.localName , type: "=>"}; });
    _.each(this.inAssoc, function (a) {
				 if ( _.size(a.inverseSchemaRole ) == 0 && !a.isSymmetric)
					out_assoc = _.union(out_assoc, 
					{name: a.localName, isUnique:a.isUnique, prefix:a.ontology.dprefix, isDefOnt:a.ontology.isDefault, class: a.sourceClass.localName , type: "<="});
				});
    return out_assoc;
  };
VQ_Class.prototype.getClassShortName = function (){
	if (this.isUnique) return this.localName;
	else  if (this.ontology.prefix == "") return this.localName;
		  else return this.ontology.prefix + ":" + this.localName; 
  };
VQ_Class.prototype.getClassName = function (){
	return this.ontology.dprefix + ":" + this.localName; 
  };
VQ_Class.prototype.getAllAssociations = function() {
	var assoc = this.getAssociations();
	_.each(this.allSuperSubSuperClasses, function(sc){
		//sc_class = schema.findClassByName(sc.shortName);		
		assoc = _.union(assoc, sc.getAssociations());
	})
	return _.sortBy(assoc, "name");
  };
VQ_Class.prototype.getAttributes = function() {
	return _.map(this.schemaAttribute, function (a) {
		return {name: a.localName, isUnique:a.isUnique, prefix:a.ontology.dprefix, isDefOnt:a.ontology.isDefault,}; });
  };
VQ_Class.prototype.getAllAttributes = function() {
	var attributes = this.getAttributes();
	_.each(this.allSuperSubSuperClasses, function(sc){
		//sc_class = schema.findClassByName(sc.shortName);
		attributes = _.union(attributes, sc.getAttributes());
	})
	attributes = _.sortBy(attributes, function(a) { return a.name});
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

VQ_ClassInfo = function (cl) {
  this.ID = cl.ID;
  this.localName = cl.localName;
  this.shortName = cl.ontology.dprefix.concat(":",cl.localName); 
  this.isUnique = cl.isUnique;
  this.ontology = cl.ontology; 
  this.instanceCount = cl.instanceCount;  
};

VQ_ClassInfo.prototype = {
  constructor:VQ_ClassInfo,
  ID: null,
  localName: null,
  shortName: null,
  isUnique: null,   
  ontology: null,
  instanceCount: null,
  getClassName : function() { return this.ontology.dprefix.concat(":",this.localName); }
};

VQ_Attribute = function (attrInfo){
	VQ_Elem.call(this, attrInfo, "attribute");
	this.schemaAttribute = {};
	this.type = attrInfo.type;
	
	var e = schema.findAttributeByName(attrInfo.localName);  
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


VQ_Role = function (roleInfo){
	VQ_Elem.call(this, roleInfo, "role");
	this.schemaRole = {};
	var e = schema.findAssociationByName(roleInfo.localName);  
	if ( e && e.localName == roleInfo.localName ){
	  this.isUnique = false;
	  e.isUnique = false;
	  this.ontology.namesAreUnique = false;
	  e.ontology.namesAreUnigue = false;
	}
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

      var compartments = Dialog.buildCopartmentDefaultValue(new_line);

      if (_.size(compartments) > 0) {
        new_line.initialCompartments = compartments;
      }

      Utilities.callMeteorMethod("insertElement", new_line, function(elem_id) {
            var vq_obj = new VQ_Element(elem_id);
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
        var res = { fulltext:c["input"] };
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
    if (name && name.substring(0,4)=="inv(") {
        return name.substring(4,name.length-1);
    } else {
        return name;
    }
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
      } else { return "REQUIRED";};
    } else { return null;};
  },
  // determines whether a class rather than instance is searched
  isVariable: function() {
    var name = this.getName();
		return (name && name.charAt(0)=='?');
  },
  // gets class variable name (e.g. X for ?X)
  getVariableName: function() {
    if (this.isVariable()) {return this.getName().substr(1)} else { return null }
  },
  // determines whether the link is subquery link
  isSubQuery: function() {
    return this.getCompartmentValue("Subquery Link")=="true"
  },
	// determines whether the link is glogal subquery link
  isGlobalSubQuery: function() {
    return this.getCompartmentValue("Global Subquery Link")=="true"
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
  // Gets link's nesting (query) type: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION
  getNestingType: function() {
    return this.getCompartmentValueValue("NestingType");
  },
  // string  -->
  setNestingType: function(type) {
    var valueInputMap = {"PLAIN":"Join", "SUBQUERY":"Nested Query","GLOBAL_SUBQUERY":"Global Nested Query", "CONDITION":"Extra"};
    this.setCompartmentValueAuto("NestingType", valueInputMap[type]);
    this.setLinkQueryType(type);
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
		var ct = CompartmentTypes.findOne({name: "indirectClassMembership", elementTypeId: this.obj["elementTypeId"]});
		var proc_name = Interpreter.getExtensionPointProcedure("dynamicDefaultValue", ct);
		if (proc_name && proc_name != "") {
			if(Interpreter.execute(proc_name, [""])) {
				this.setNameValue(".. "+this.getName());
				indirectS = "true";
			}
			else this.setNameValue(this.getName());
		}
		else {
			this.setNameValue(this.getName());
		}
	} else {
      this.setNameValue(this.getName());
    };
	// if (indirect) {
      // this.setNameValue(".. "+this.getName());
    // } else {
      // this.setNameValue(this.getName());
    // };
    // var indirectS = this.boolToString(indirect)
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
  // --> [{exp:string}]
  // returns an array of conditions' expressions
  getConditions: function() {
    return this.getMultiCompartmentValues("Conditions").map(function(c) {return {exp:c}});
  },
  // string -->
  addCondition: function(condition) {
    this.addCompartmentSubCompartments("Conditions",[{name:"Expression", value:condition}])
  },
  // --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of attributes: expression, stereotype, alias, etc. ...
  getFields: function() {
    return this.getMultiCompartmentSubCompartmentValues("Attributes",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"},
    {title:"requireValues",name:"Require Values",transformer:function(v) {return v=="true"}},
		{title:"groupValues",name:"GroupValues",transformer:function(v) {return v=="true"}},
	  {title:"isInternal",name:"IsInternal",transformer:function(v) {return v=="true"}}]);
  },
  // string,string,bool,bool,bool -->
  addField: function(exp,alias,requireValues,groupValues,isInternal) {
    this.addCompartmentSubCompartments("Attributes",[
      {name:"Expression",value:exp},
      {name:"Field Name",value:alias},
      {name:"Require Values",value:this.boolToString(requireValues)},
      {name:"GroupValues",value:this.boolToString(groupValues)},
      {name:"IsInternal",value:this.boolToString(isInternal)}
    ])
  },
	// --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  getAggregateFields: function() {
    return this.getMultiCompartmentSubCompartmentValues("Aggregates",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"}]);
  },
  // string, string -->
  addAggregateField: function(exp,alias) {
    this.addCompartmentSubCompartments("Aggregates",[
      {name:"Expression",value:exp},
      {name:"Field Name",value:alias},
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
		 return this.getCompartmentValue("Hide default link name")=="true";
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
  hideDefaultLinkName: function(hide) {
		if (hide) {
			   if (this.isDefaultLink()) {
				   this.setLinkNameVisibility(false);
				 } else {
					 this.setLinkNameVisibility(true);
				 }
		} else {
		    this.setLinkNameVisibility(true);
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
	setLinkNameVisibility: function(visible) {
		if (this.isLink()) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
            a["input"] = comp["input"];
						a["value"] = comp["value"];
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
            a["input"] = comp["input"];
						a["value"] = comp["value"];
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
    if (this.isIndirectClassMembership()) {
      this.setCompartmentValue("Name",name,".. "+name);
    } else {
      this.setCompartmentValue("Name",name,name);
    };

	},
  // sets name's visual appeareance
  // string -->
  setNameValue: function(value) {
       this.setCompartmentValue("Name",this.getName(),value);
  },
  // sets type of the class: query, condition
  // string -->
  setClassType: function(type) {
      this.setCompartmentValue("ClassType", type, type)
  },

	// sets link type. Possible values: REQUIRED, NOT, OPTIONAL
	setLinkType: function(value) {
		 if (this.isLink()) {
			 //console.log(this);
        // By default link is REQUIRED
				var setNeg = "false";
				var setNegValue = "";
				var setOpt = "false";
				if (value=="NOT") {
					  setNeg = "true";
						setNegValue = "{not}";
						setOpt = "false";
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

			  this.setCompartmentValue("Negation Link",setNeg,setNegValue);
				this.setCompartmentVisibility("Negation Link", setNeg=="true");
				this.setCompartmentValue("Optional Link",setOpt,"");
		 }
	},

	// sets link type. Possible values: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION
	setLinkQueryType: function(value) {
		 if (this.isLink()) {
        // By default link is PLAIN
				var setSub = "false";
				var setGSub = "false";
				var setCond = "false";
        var root_dir =this.getRootDirection();
				if (value=="SUBQUERY") {
					  setSub = "true";
						setGSub = "false";
						setCond = "false";

						if (root_dir=="start") {
							this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		//{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
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

						if (root_dir=="start") {
							this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
																		{attrName:"endShapeStyle.shape",attrValue:"Arrow"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);

						} else if (root_dir=="end") {
							this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Circle"},
																		{attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"endShapeStyle.radius",attrValue:12},
																		{attrName:"startShapeStyle.shape",attrValue:"None"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
						};
						//if (this.isNegation()) {
						//	this.setLinkType("REQUIRED");
						//};
				} else if (value=="CONDITION") {
					  setSub = "false";
						setGSub = "false";
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
				} else {
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
			} else {
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
	    	console.log("setClassStyle: no elem_type");
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
			 a["styleId"] = elem_style.id; console.log(elem_style.id);

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
    }

}
