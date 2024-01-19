import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects, Diagrams, Elements, ElementTypes, Compartments, CompartmentTypes } from '/imports/db/platform/collections'
import { Utilities } from '/imports/client/platform/js/utilities/utils.js'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog';

//-----------------------------------------------------------------------------

function VQ_Schema ( ) {
	console.log("***************** VQ_Schema **********************")
};

VQ_Schema.prototype = {
  classExist: function (name) {
	return false;
  },
  ontologyExist: function (name) {
    var ontology = _.find(this.Ontologies, function (ont) {
	  if (ont.namespace == name) { ont.elementCount = ont.elementCount +1; return ont}; });
    return ontology;
  },
  getAllClasses: function (){ 
	return [];
  },
  findClassByName: function(name) {
	return false;
  },
  findAssociationByName: function(name) {
	return false;
  },
  resolveClassByName: function (className) {
    return null;
  },
  resolveLinkByName: function (linkName) {
     return null;
  },
  resolveAttributeByName: function (className, attributeName) { 
	return null;
  }
 }


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
function Create_VQ_Element(func, location, isLink, source, target) {
  var active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

  if (isLink) {
    let elem_type = ElementTypes.findOne({name:"Link", diagramTypeId:active_diagram_type_id});
    let elem_style = _.find(elem_type.styles, function(style) {
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

      let compartments = Dialog.buildCopartmentDefaultValue(new_line);

      if (_.size(compartments) > 0) {
        new_line.initialCompartments = compartments;
      }

      Utilities.callMeteorMethod("insertElement", new_line, function(elem_id) {
            var vq_obj = new VQ_Element(elem_id);
            if (func) { func(vq_obj) };
      });

  } else {
    let elem_type = ElementTypes.findOne({name:"Class", diagramTypeId:active_diagram_type_id});
    let elem_style = _.find(elem_type.styles, function(style) {
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

    let compartments = Dialog.buildCopartmentDefaultValue(new_box);

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

function VQ_Element(id) {
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
    if (!this.obj) {
      console.error(this.obj);
      return;
    }

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
	if(name != null){
		const regex = /\([A-Za-z]+\) /g;
		const found = name.search(regex);
		if(found !== -1){
			name = name.substring(name.indexOf(") ")+2)
		}
	}
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
    if (this.isVariable()) {
		var name = this.getName();
		if(name != null){
			const regex = /\([A-Za-z]+\) /g;
			const found = name.search(regex);
			if(found !== -1){
				name = name.substring(name.indexOf(") ")+2)
			}
		}
		return name.substr(1)
	} else { return null }
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
    var labelServiceLanguages = this.getCompartmentValue("Label Service Languages");
	if(labelServiceLanguages == null || labelServiceLanguages.replace(/ /g, "") == "") labelServiceLanguages = "[AUTO_LANGUAGE],en";
	return labelServiceLanguages;
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
    {title:"attributeConditionSelection",name:"AttributeConditionSelection"},
	{title:"attributeCondition",name:"Attribute Condition", transformer:function(v) {return v=="true"}},
    {title:"nodeLevelCondition",name:"Node-level Condition", transformer:function(v) {return v=="true"}},
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
  addField: function(exp,alias,requireValues,groupValues,isInternal,addLabel,addAltLabel,addDescription,graph,graphInstruction, condition, isAttributeCondition, isNodeLevelCondition) {
    
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
      // {name:"AttributeCondition",value:condition},
      {name:"Attribute Condition",value:this.boolToString(isAttributeCondition)},
      {name:"Node-level Condition",value:this.boolToString(isNodeLevelCondition)},
      {name:"AttributeConditionSelection",value:condition},
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
	setCompartmentVisibility: function(compartmentName,visible, input, value) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = CompartmentTypes.findOne({name: compartmentName, elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
            a["input"] = input;
						a["value"] = value;
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
						   let root_dir =this.getRootDirection();
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
							let root_dir =this.getRootDirection();
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
						   let root_dir =this.getRootDirection();
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
						   let root_dir =this.getRootDirection();
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
										let root_dir =this.getRootDirection();
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

				// if (setNegValue == " ") {
				// 	setNegValue = "";
				// }

				// this.setCompartmentValue("Negation Link", setNeg, setNegValue);
				this.setCompartmentVisibility("Negation Link", (setNeg==true || setNeg=="true"), setNeg, setNegValue);
				this.setCompartmentValue("Optional Link", setOpt, "");
				// this.setCompartmentValue("Filter Exists", setFE, setFEValue);
				this.setCompartmentVisibility("Filter Exists", (setFE==true || setFE=="true"), setFE, setFEValue);

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
	//console.log(" VQ_element  -----setCompartmentValue------ ")

    if (!this.obj) {
      console.error(this.obj);
      return;
    }

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

// Create_VQ_Element = function(cb, location, isLink = false, source?, target?) { }
const async_Create_VQ_Element = async (location, isLink, target, source) => new Promise(resolve => { 
  Create_VQ_Element(newElem => { resolve(newElem) }, location, isLink, target, source);
});

export {
  VQ_Element,
  Create_VQ_Element,
  async_Create_VQ_Element,
  VQ_Class,
  VQ_Attribute,
  VQ_Schema,
  VQ_Role,
  VQ_SchemaRole,
  VQ_r2rml,
  VQ_SchemaAttribute,
  VQ_ontology,
}
