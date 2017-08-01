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
   //console.log(data);

   var schema = this;
   if (data.namespace) this.namespace = data.namespace;
   if (data.URI) this.namespace = data.URI;

   if (this.namespace && !this.namespace.endsWith("#") && !this.namespace.endsWith("/"))
     this.namespace = this.namespace + "#";

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
		var cl = schema.findClassByName(old_cl.localName);
		_.each(old_cl.SuperClasses, function (sc){
			var superClass = schema.findClassByName(sc);
			superClass.addSubClass(cl);
			cl.addSuperClass(superClass);
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
			  newRole.maxCardinality = 2147483647;
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
  this.namesAreUnique = true;
  if (schema.namespace == URI) {
   this.isDefault = true;
   this.prefix = "";
  }
  else {
    this.isDefault = false;
	if (prefix) this.prefix = prefix;
	else {
		var arr = URI.split("/");
		this.prefix = schema.checkOntologyPrefix(findPrefix(arr, _.size(arr)-1));
	}
  }
};

VQ_ontology.prototype = {
  constructor:VQ_ontology,
  namespace: null,
  prefix: null,
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
	var uri = null;

	if (elemInfo.namespace) uri = elemInfo.namespace;
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
  getID: function() { return this.ID },
  getElemInfo: function() {
    if (this.localName == " ") return {};
	return {localName:this.localName, URI:this.fullName, Namespace:this.ontology.namespace, Prefix:this.ontology.prefix, DefaultNamespace:this.schema.namespace};
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
	  this.minCardinality = attrInfo.minCardinality;
	  this.maxCardinality = attrInfo.maxCardinality;
	}
	else {
	  this.minCardinality = 1;
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
	  this.minCardinality = roleInfo.minCardinality;
	  this.maxCardinality = roleInfo.maxCardinality;
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
	  this.minCardinality = cpInfo.minCardinality;
	  this.maxCardinality = cpInfo.maxCardinality;
	  if (role.maxCardinality) {
	    if (this.minCardinality < role.minCardinality) role.minCardinality = this.minCardinality;
		if (this.maxCardinality > role.maxCardinality) role.maxCardinality = this.maxCardinality;
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
// It is used to traverse objects and retrieve information about them. It does not modify them!
// It hides the ajoo platform specific details allowing to work in ViziQuer abstraction layer
// all properties (except obj) are functions and they are evaluated upon request

// ajoo element id --> VQ_Element
VQ_Element = function(id) {
  // obj contains correspondind ajoo Element object
  this.obj = Elements.findOne({_id:id});
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
  // Returns the value of the given compartment by name or null if such compartment does not exist
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
    return this.getType()=="query";
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
    return this.getCompartmentValue("Name");
  },
  // --> string
  getInstanceAlias: function() {
    return this.getCompartmentValue("Instance");
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
  // determines whether the link is inverse
  isInverse: function() {
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
  // determines whether the class has distinct property
  isDistinct: function() {
    return this.getCompartmentValue("Distinct")=="true";
  },
	// --> string
	getFullSPARQL : function() {
    return this.getCompartmentValue("FullSPARQL");
	},
  // --> string
  getLimit: function() {
    return this.getCompartmentValue("Show rows");
  },
  // --> string
  getOffset: function() {
    return this.getCompartmentValue("Skip rows");
  },
  // --> [{exp:string}]
  // returns an array of conditions' expressions
  getConditions: function() {
    return this.getMultiCompartmentValues("Conditions").map(function(c) {return {exp:c}});
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
	// --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  getAggregateFields: function() {
    return this.getMultiCompartmentSubCompartmentValues("Aggregates",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"}]);
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

  // sets name
	// string -->
	setName: function(name) {
		   this.setCompartmentValue("Name",name,name);
	},

	// sets link type. Possible values: REQUIRED, NOT, OPTIONAL
	setLinkType: function(value) {
		 if (this.isLink()) {
        // By default link is REQUIRED
				var setNeg = "false";
				var setNegValue = " ";
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
						setNegValue = " ";
						this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#18b6d1"},
						                      {attrName:"elementStyle.dash",attrValue:[6,5]},
																	{attrName:"startShapeStyle.stroke", attrValue:"#18b6d1"},
																	{attrName:"endShapeStyle.stroke", attrValue:"#18b6d1"},
																]);
						if (this.isConditional()) {
							 this.setLinkQueryType("PLAIN");
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
				this.setCompartmentValue("Optional Link",setOpt," ");
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
	// updates compartments value (if that compartment exists)
	// string, string, string -> int (0 ir update failed - no such type, 1 if compartment updated, 3 - compartment inserted)
	setCompartmentValue: function(comp_name, input, value) {
		var ct = CompartmentTypes.findOne({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
			var c = Compartments.findOne({elementId: this._id(), compartmentTypeId: ct["_id"]});
			if (c) {
					Dialog.updateCompartmentValue(ct, input, value, c["_id"]);
					return 1;
			} else {
				  Dialog.updateCompartmentValue(ct, input, value);
					return 3;
			};
		};
		return 0;
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

}
