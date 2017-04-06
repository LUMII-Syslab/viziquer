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

   if (Schema.find().count() == 0)
   { return; }

   var data = Schema.findOne({ "Name": "Schema"}).Schema;
   //console.log(data);

   var schema = this;
   this.URI = data.URI;
	_.each(data.Classes, function(cl){
		schema.addClass( new VQ_Class(cl, schema));
	})
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
			newSchRole = new VQ_SchemaRole(asoc, schema);
			schema.addSchemaRole(newSchRole, schema);
			schema.addSchemaProperty(newSchRole, schema);
			scClass.addProperty(newSchRole);
			createLink(newRole, newSchRole, "schemaRole", "role");
			createLink(scClass, newSchRole, "outAssoc", "sourceClass");
			createLink(tClass, newSchRole, "inAssoc", "targetClass");
		})
	})
	schema.addRole( new VQ_Role({}, schema));
};

VQ_Schema.prototype = {
  constructor: VQ_Schema,
  URI:null,
  Elements: null,
  Classes: null,
  Attributes:null,
  Associations:null,
  SchemaAttributes:null,
  SchemaRoles:null,
  SchemaProperties:null,
  currentId: 0,
  getNewIdString: function(name) {
	this.currentId = this.currentId + 1;
    return "ID_" + this.currentId + "_" + name;
  },
  classExist: function (name) {
    var cl = this.findClassByName(name);
	if (cl && cl.localName == name) return true;
	else return false;
  },
  getAllClasses: function (){
    return _.map(this.Classes, function (cl) {
				return {name: cl["localName"]};
			});
  },
  findElementByName: function (name, coll) {
    var element = _.find(coll, function(el){
		if (el.localName == name) { return el; }; })
	if (element) return element;
	return _.find(coll, function(el){
		if (el.localName == " ") { return el; }; })
  },
  findClassByName: function(name) {
     return this.findElementByName(name, this.Classes);
	//return _.find(this.Classes, function(cl){
	//	if (cl.localName == name) { return cl; }; })
  },
  findAssociationByName: function(name) {
	return this.findElementByName(name, this.Associations);
	//return _.find(this.Associations, function(a){
	//	if (a.localName == name) { return a; }; })
  },
  findAttributeByName: function(name) {
	return this.findElementByName(name, this.Attributes);
	//return _.find(this.Attributes, function(a){
	//	if (a.localName == name) { return a; }; })
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
  resolveClassByName: function (className) {
    return this.findClassByName(className).getClassInfo();
  },
  resolveLinkByName: function (linkName) {
	return this.findAssociationByName(linkName).getAssociationInfo();
  },
  resolveAttributeByName: function (className, attributeName) {
    // Pagaidām klases vards netiek ņemts vērā
  	return this.findAttributeByName(attributeName).getAttributeInfo();
  },
}

VQ_Elem = function (elemInfo, schema, elemType){
    var localName = " ";
    if (elemInfo.localName) {var localName = elemInfo.localName };
	this.ID = schema.getNewIdString(localName) + " (" + elemType + ")";
	this.localName = localName;
	this.schema = schema;
};

VQ_Elem.prototype = {
  constructor: VQ_Elem,
  ID: null,
  localName: null,
  URI: null,
  schema: null,
  getID: function() { return this.ID},
  getElemInfo: function() {
    if (this.localName == " ") return {};
    var uri = null;
	if (this.URI) { uri = this.URI; }
	else { uri = this.schema.URI + "#" + this.localName;}
	var info = {localName:this.localName, URI:uri};
    return info;
  }
}

VQ_Class = function (classInfo, schema){
    VQ_Elem.call(this, classInfo, schema, "class");
	if ( classInfo.URI ){ this.URI = classInfo.URI;	}
	this.superClasses = {};
    this.subClasses = {};
    this.allSuperClasses = {};
    this.allSubClasses = {};
	this.allSuperSubClasses = {};
	this.schemaAttribute = {};
	this.inAssoc = {};
	this.outAssoc = {};
	this.properties = {};
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
VQ_Class.prototype.getAssociations = function() {
    var out_assoc =  _.map(this.outAssoc, function (a) {
				return {name: a.localName, class: a.targetClass.localName , type: "=>"}; });
    var in_assoc =  _.map(this.inAssoc, function (a) {
				return {name: a.localName, class: a.sourceClass.localName , type: "<="}; });
	return _.union(out_assoc, in_assoc);
  };
VQ_Class.prototype.getAllAssociations = function() {
	var assoc = this.getAssociations();
	_.each(this.allSuperSubClasses, function(sc){
			assoc = _.union(assoc, sc.getAssociations());
	})
	return assoc;
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
};

VQ_Attribute.prototype = Object.create(VQ_Elem.prototype);
VQ_Attribute.prototype.constructor = VQ_Attribute;
VQ_Attribute.prototype.schemaAttribute = null;
VQ_Attribute.prototype.type = null;
VQ_Attribute.prototype.getTypeInfo = function() {
  if (this.type) return {type:this.type};
  else return {};
  };
VQ_Attribute.prototype.getAttributeInfo = function() {
  return _.extend(this.getElemInfo(), this.getTypeInfo());
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
};

VQ_Role.prototype = Object.create(VQ_Elem.prototype);
VQ_Role.prototype.constructor = VQ_Role;
VQ_Role.prototype.schemaRole = null;
VQ_Role.prototype.getAssociationInfo = function() {
  return this.getElemInfo();
  };

VQ_SchemaRole = function (roleInfo, schema){
	VQ_Elem.call(this, roleInfo, schema, "schemaRole");
	this.role = {};
	this.sourceClass = {};
	this.targetClass = {};
};

VQ_SchemaRole.prototype = Object.create(VQ_Elem.prototype);
VQ_SchemaRole.prototype.constructor = VQ_SchemaRole;
VQ_SchemaRole.prototype.role = null;
VQ_SchemaRole.prototype.sourceClass = null;
VQ_SchemaRole.prototype.targetClass = null;





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
  isClass: function() {return this.obj["type"]=="Box";},
  isLink: function() {return this.obj["type"]=="Line";},
  // Determines whether the VQ_Element is the root class of the query
  isRoot: function() {
    return this.getType()=="query";
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
    return this.getName().charAt(0)=='?'
  },
  // gets class variable name (e.g. X for ?X)
  getVariableName: function() {
    if (this.isVariable()) {return this.getName().substr(1)} else { return null }
  },
  // determines whether the link is subquery link
  isSubQuery: function() {
    return this.getCompartmentValue("Subquery Link")=="true"
  },
  // determines whether the link is inverse
  isInverse: function() {
    return this.getCompartmentValue("Inverse Link")=="true"
  },
  // determines whether the link is conditional
  isConditional: function() {
    return this.getCompartmentValue("Condition Link")=="true"
  },
  // determines whether the class has distinct property
  isDistinct: function() {
    return this.getCompartmentValue("Distinct")=="true";
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
    [{title:"exp",name:"Name"},
    {title:"stereotype",name:"Stereotype"},
    {title:"alias",name:"Alias"},
    {title:"requireValues",name:"IsOptional",transformer:function(v) {return v=="false"}},
    {title:"isLocal",name:"IsSubquery",transformer:function(v) {return v=="true"}}]);
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
    return this.getMultiCompartmentValues("Having").map(function(c) {return {exp:c}});
  },
  // --> [{link:VQ_Element, start:bool}, ...]
  // returns an array of objects containing links as VQ_Elements and flag whether is has been retrieved by opposite end as start
  // start true means that the link has been retrieved from link "end"
  getLinks: function() {
    return _.union(
      Elements.find({startElement: this.obj["_id"]}).map(function(link) {
        return { link: new VQ_Element(link["_id"]), start: false };
      }),
      Elements.find({endElement: this.obj["_id"]}).map(function(link) {
        return { link: new VQ_Element(link["_id"]), start: true };
      })
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
  // Returns link's end VQ_Element
  getEndElement: function() {
    return new VQ_Element(this.obj["endElement"]);
  }
}
