
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
function collectClasses(cl, all, first){
	var superClasses = {};
	if ( _.size(cl[all]) > 0){
		_.each(cl[all], function(sc){
			superClasses[sc.getID()] = sc;
			})
		}
	else {
		_.each(cl[first], function(sc){
			superClasses[sc.getID()] = sc;
			var allSuperClasses = collectClasses(sc, all, first);
			_.extend(superClasses, allSuperClasses);
			})
	}
	return superClasses;
}
function createLink(s_class, t_class, s_role, t_role){
	s_class[s_role][t_class.getID()] = t_class;
	t_class[t_role] = s_class;
	//t_class[t_role][s_class.getID()] = s_class;
}
function findPrefixFromList(uri)
{
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
function findCardinality(card, type)
{
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
VQ_Schema = function () {

   this.Classes = {};
   this.Elements = {};
   this.Attributes = {};
   this.SchemaAttributes = {};
   this.SchemaProperties = {};
   this.Associations = {};
   this.SchemaRoles = {};
   this.Ontologies = {};

   if (Schema.find().count() == 0)
   { return; }

   var data = Schema.findOne();
   if (data.Schema) data = data.Schema;

   var schema = this;
   if (data.namespace) this.namespace = data.namespace;
   if (data.Namespace) this.namespace = data.Namespace;
   if (data.URI) this.namespace = data.URI;

   if (this.namespace && !this.namespace.endsWith("#") && !this.namespace.endsWith("/"))
     this.namespace = this.namespace + "#";

   if (this.namespace)
	  schema.addOntology(new VQ_ontology(schema, this.namespace));


	_.each(data.Prefixes, function(ont){
	  if (!schema.ontologyExist(ont.namespace))
	    schema.addOntology(new VQ_ontology(schema, ont.namespace, ont.prefix));
	})

	_.each(data.Classes, function(cl){
		schema.addClass( new VQ_Class(cl, schema));
	})

	if (!this.namespace) {
	  defaultOntology = _.max( this.Ontologies, function(ont) {return ont.count});
	  this.namespace = defaultOntology.namespace;
	  defaultOntology.isDefault = true;
	  defaultOntology.prefix = "";
	}

	schema.addClass( new VQ_Class({}, schema));

	_.each(data.Classes, function(old_cl){
		var c_name = "";
	    if (old_cl.fullName) c_name = old_cl.fullName;
		else c_name = old_cl.localName;
		var cl = schema.findClassByName(c_name);
		_.each(old_cl.SuperClasses, function (sc){
			var superClass = schema.findClassByName(sc);
			if (superClass.localName != " ")
			{
				superClass.addSubClass(cl);
				cl.addSuperClass(superClass);
			}
		})
	})

	_.each(this.Classes, function (cl){
	    cl.addAllSuperClasses();
		cl.addAllSubClasses();
		var allSuperSubClasses = {};
		_.extend(allSuperSubClasses, cl.allSuperClasses);
		_.extend(allSuperSubClasses, cl.allSubClasses);
		cl.allSuperSubClasses = allSuperSubClasses;
	})

	_.each(data.Attributes, function(atr){
		var newAttr = new VQ_Attribute(atr, schema);
	    schema.addAttribute(newAttr);
		_.each(atr.SourceClasses, function (sc){
			var scClass = schema.findClassByName(sc);
			var newSchAttr = new VQ_SchemaAttribute(atr, schema);
			schema.addSchemaAttribute(newSchAttr, schema);
			schema.addSchemaProperty(newSchAttr, schema);
			scClass.addProperty(newSchAttr);
			createLink(newAttr, newSchAttr, "schemaAttribute", "attribute");
			createLink(scClass, newSchAttr, "schemaAttribute", "sourceClass");
		})
	})

	schema.addAttribute( new VQ_Attribute({}, schema));

	_.each(data.Associations, function(asoc){
		var newRole = new VQ_Role(asoc, schema);
		schema.addRole(newRole, schema);
		_.each(asoc.ClassPairs, function(cp){
			var scClass = schema.findClassByName(cp.SourceClass);
			var tClass = schema.findClassByName(cp.TargetClass);
			newSchRole = new VQ_SchemaRole(asoc, cp, newRole, schema);
			if ( !newRole.maxCardinality) {
			  newRole.minCardinality = 0;
			  newRole.maxCardinality = -1;
			}
			if (scClass.localName == tClass.localName) newSchRole.isSymmetric = true;
			schema.addSchemaRole(newSchRole, schema);
			schema.addSchemaProperty(newSchRole, schema);
			scClass.addProperty(newSchRole);
			createLink(newRole, newSchRole, "schemaRole", "role");
  		    createLink(scClass, newSchRole, "outAssoc", "sourceClass");
         	createLink(tClass, newSchRole, "inAssoc", "targetClass");
		})
	})

	_.each(data.Associations, function(asoc){
		_.each(asoc.ClassPairs, function(cp){
			if (cp.inverseRole)
			{
			  var schRole = schema.findSchemaRoleByName(asoc.localName, cp.SourceClass, cp.TargetClass);
			  var invSchRole = schema.findSchemaRoleByName(cp.inverseRole, cp.TargetClass, cp.SourceClass);
			  schRole.inverseSchemaRole = invSchRole;
			}
		})
	})
	schema.addRole( new VQ_Role({}, schema));
	VQ_r2rml(schema);
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
  currentId: 0,
  getNewIdString: function(name) {
	this.currentId = this.currentId + 1;
    return "ID_" + this.currentId + "_" + name;
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
	  if (ont.namespace == name) { ont.count = ont.count +1;  return ont}; });
    return ontology;
  },
  checkOntologyPrefix: function (name){
    var ontology = _.find(this.Ontologies, function (ont) {
	  if (ont.prefix == name) { return ont}; });
	if (ontology) return this.checkOntologyPrefix(name+"1");
	else return name;
  },
  getAllClasses: function (){
    return _.map(this.Classes, function (cl) {
				if (cl.isUnique) return {name: cl.localName};
				else  if (cl.ontology.prefix == "") return {name: cl.localName};
				      else return {name: cl.ontology.prefix + ":" + cl.localName}; });
  },
  findElementByName: function (name, coll) {
    var element = _.find(coll, function(el){
		if ( findName(name, el)) { return el; }; })
	if (element) return element;
	return _.find(coll, function(el){
		if (el.localName == " ") { return el; }; })
  },
  findClassByName: function(name) {
     return this.findElementByName(name, this.Classes);
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
    this.Ontologies[newOntology.namespace] = newOntology;
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
  resolveAttributeByName: function (className, attributeName) {
    // Pagaidām klases vārds netiek ņemts vērā
	if (this.attributeExist(attributeName))
		return this.findAttributeByName(attributeName).getAttributeInfo();
	else
		return null;
  },
  getPrefixes: function() {
    prefixes = []
	_.each(this.Ontologies, function (o){

		prefixes = _.union( prefixes, [[o.prefix, o.namespace]]);
	})
	return prefixes;
  },
}

function findName(name, element) {
  if (element && (element.localName == name || element.fullName == name || element.ontology.prefix + ":" + element.localName == name )) return true;
  return false
}

function findPrefix(arr, pos) {
  if (arr[pos] == "" ) return findPrefix(arr, pos-1);
  if (!isNaN(arr[pos][0])) return findPrefix(arr, pos-1);
  return arr[pos].split("#")[0];
}

VQ_ontology = function (schema, URI, prefix) {
  this.namespace = URI;
  this.count = 1;
  p = "";
  this.namesAreUnique = true;
  if (prefix) p = prefix;
  else {
    p = findPrefixFromList(URI)
    if ( p == null )
	{
	  var arr = URI.split("/");
	  p = schema.checkOntologyPrefix(findPrefix(arr, _.size(arr)-1));
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
	//if (prefix) this.prefix = prefix;
	//else {
	//	var arr = URI.split("/");
	//	this.prefix = schema.checkOntologyPrefix(findPrefix(arr, _.size(arr)-1));
	//}
  }
};

VQ_ontology.prototype = {
  constructor:VQ_ontology,
  namespace: null,
  prefix: null,
  dprefix: null,
  count: null,
  isDefault: null,
  namesAreUnique:null
}

VQ_Elem = function (elemInfo, schema, elemType){
    var localName = " ";
	var fullName = " ";
    if (elemInfo.localName) localName = elemInfo.localName;
	this.ID = schema.getNewIdString(localName) + " (" + elemType + ")";
	this.localName = localName;
	this.schema = schema;
	this.triplesMaps = [];
	var uri = null;

	if (elemInfo.namespace) uri = elemInfo.namespace;
	else if (elemInfo.fullName) uri = elemInfo.fullName.substring(0, elemInfo.fullName.length- elemInfo.localName.length);
	else uri = schema.namespace;

	var ontology = schema.ontologyExist(uri);
	if (ontology) { this.ontology = ontology }
	else {
	  ontology = new VQ_ontology(schema, uri, elemInfo.prefix);
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
  schema: null,
  triplesMaps: null,
  getID: function() { return this.ID },
  getElemInfo: function() {
    if (this.localName == " ") return {};
	return {localName:this.localName, URI:this.fullName, Namespace:this.ontology.namespace,
			Prefix:this.ontology.prefix, DefaultNamespace:this.schema.namespace, triplesMaps:this.triplesMaps};
  }
}

VQ_Class = function (classInfo, schema){
    VQ_Elem.call(this, classInfo, schema, "class");
	this.superClasses = {};
    this.subClasses = {};
    this.allSuperClasses = {};
    this.allSubClasses = {};
	this.allSuperSubClasses = {};
	this.schemaAttribute = {};
	this.inAssoc = {};
	this.outAssoc = {};
	this.properties = {};
	this.isUnique = true;
	var e = schema.findClassByName(classInfo.localName);
	if ( e && e.localName == classInfo.localName ){
	  this.isUnique = false;
	  e.isUnique = false;
	  this.ontology.namesAreUnique = false;
	  e.ontology.namesAreUnigue = false;
	}
};

VQ_Class.prototype = Object.create(VQ_Elem.prototype);
VQ_Class.prototype.constructor = VQ_Class;
VQ_Class.prototype.superClasses = null;
VQ_Class.prototype.subClasses = null;
VQ_Class.prototype.allSuperClasses = null;
VQ_Class.prototype.allSubClasses = null;
VQ_Class.prototype.allSuperSubClasses = null;
VQ_Class.prototype.schemaAttribute = null;
VQ_Class.prototype.inAssoc = null;
VQ_Class.prototype.outAssoc = null;
VQ_Class.prototype.properties = null;
VQ_Class.prototype.isUnique = null;
VQ_Class.prototype.getAssociations = function() {
    var out_assoc =  _.map(this.outAssoc, function (a) {
				return {name: a.localName, class: a.targetClass.localName , type: "=>"}; });
    _.each(this.inAssoc, function (a) {
				 if ( _.size(a.inverseSchemaRole ) == 0 && !a.isSymmetric)
					out_assoc = _.union(out_assoc, {name: a.localName, class: a.sourceClass.localName , type: "<="});
				});
    return out_assoc;
  };
VQ_Class.prototype.getAllAssociations = function() {
	var assoc = this.getAssociations();
	_.each(this.allSuperSubClasses, function(sc){
			assoc = _.union(assoc, sc.getAssociations());
	})
	return _.sortBy(assoc, "name");
  };
VQ_Class.prototype.getAttributes = function() {
	return _.map(this.schemaAttribute, function (a) {
				return {name: a["localName"]}; });
  };
VQ_Class.prototype.getAllAttributes = function() {
	var attributes = this.getAttributes();
	_.each(this.allSuperSubClasses, function(sc){
			attributes = _.union(attributes, sc.getAttributes());
	})
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


VQ_Attribute = function (attrInfo, schema){
	VQ_Elem.call(this, attrInfo, schema, "attribute");
	this.schemaAttribute = {};
	this.type = attrInfo.type;
	if (attrInfo.maxCardinality) {
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


VQ_SchemaAttribute = function (attrInfo, schema){
	VQ_Elem.call(this, attrInfo, schema, "schemaAttribute");
	this.attribute = {};
	this.sourceClass = {};
};

VQ_SchemaAttribute.prototype = Object.create(VQ_Elem.prototype);
VQ_SchemaAttribute.prototype.constructor = VQ_SchemaAttribute;
VQ_SchemaAttribute.prototype.attribute = null;
VQ_SchemaAttribute.prototype.sourceClass = null;


VQ_Role = function (roleInfo, schema){
	VQ_Elem.call(this, roleInfo, schema, "role");
	this.schemaRole = {};
	if (roleInfo.maxCardinality) {
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

VQ_SchemaRole = function (roleInfo, cpInfo, role, schema){
	VQ_Elem.call(this, roleInfo, schema, "schemaRole");
	this.role = {};
	this.sourceClass = {};
	this.targetClass = {};
	this.inverseSchemaRole = {};
	this.isSymmetric = false;
	if (cpInfo.maxCardinality) {
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
			 var schema = new VQ_Schema();
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


	// Temporal solution: Put new element below target element, as close as possible without overlapping
	// d - step to move below after each try
	// Returns {x: x, y: y1, width: w, height: h} (the left upper corner + dimensions)
	getNewLocation: function (d = 30) {
	    //console.log(this);
	    var x = this.obj["location"]["x"];
	    var y = this.obj["location"]["y"];      
	    var w = this.obj["location"]["width"];
	    var h = this.obj["location"]["height"];
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

}
