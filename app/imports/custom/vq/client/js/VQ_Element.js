import { Interpreter } from '../../../../client/lib/interpreter.js'
import { Projects, Diagrams, Elements, ElementTypes, Compartments, CompartmentTypes } from '../../../../db/platform/collections.js'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'
import { Dialog } from '../../../../platform/client/js/interpretator/Dialog.js'

//-----------------------------------------------------------------------------
/*
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
*/

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
/*function Create_VQ_Element(func, location, isLink, source, target) {

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
*/

async function Create_Any_VQ_Element_Async(location, elementType, isLine, source, target) {
  const activeDiagram = await Diagrams.findOneAsync({_id:Session.get("activeDiagram")});
  const active_diagram_type_id = activeDiagram["diagramTypeId"];

  if (isLine) {
    let elem_type = await ElementTypes.findOneAsync({name:elementType, diagramTypeId:active_diagram_type_id});
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
	  
	  const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_line);
	  const vq_obj = await createVQ_Element(elem_id);
	  return vq_obj;

  } else {
    let elem_type = await ElementTypes.findOneAsync({name:elementType, diagramTypeId:active_diagram_type_id});
    
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

	const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_box);
	const vq_obj = await createVQ_Element(elem_id);
	  return vq_obj;
  }

};

async function Create_VQ_Element_Async(location, isLink, source, target) {
  const activeDiagram = await Diagrams.findOneAsync({_id:Session.get("activeDiagram")});
  const active_diagram_type_id = activeDiagram["diagramTypeId"];

  if (isLink) {
    let elem_type = await ElementTypes.findOneAsync({name:"Link", diagramTypeId:active_diagram_type_id});
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

	  const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_line);
	  const vq_obj = await createVQ_Element(elem_id);
	  return vq_obj;
	  // if (func) {
		// func(vq_obj);
	  // }

  } else {
    let elem_type = await ElementTypes.findOneAsync({name:"Class", diagramTypeId:active_diagram_type_id});
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

	const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_box);
	const vq_obj = await createVQ_Element(elem_id);
	  return vq_obj;
    // if (func) {
		// func(vq_obj);
	// }
  }

};

async function Create_VQ_Element_Declaration(func, location) {
  var active_diagram_type_id = await Diagrams.findOneAsync({_id:Session.get("activeDiagram")})["diagramTypeId"];

    let elem_type = await ElementTypes.findOneAsync({name:"Declaration", diagramTypeId:active_diagram_type_id});
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


	const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_box);
	const vq_obj = await createVQ_Element(elem_id);
	return vq_obj;
	// if (func) {
		// func(vq_obj);
	// }

    // Utilities.callMeteorMethod("insertElement", new_box, function(elem_id) {
          // var vq_obj = new VQ_Element(elem_id);
          // if (func) { func(vq_obj) };
    // });


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

async function createVQ_Element(id) {
	if (VQ_Element_cache[id]) {
		const cached = new VQ_Element_Async(VQ_Element_cache[id].obj);
		cached.isVirtualRoot = VQ_Element_cache[id].isVirtualRoot;
		return cached;
	} else {
		const elem = await Elements.findOneAsync({ _id: id });
		if (!elem) {
			console.error("VQ element not created");
			return null;
		}
		const instance = new VQ_Element_Async(elem);
		VQ_Element_cache[id] = instance;
		return instance;
	}
}


VQ_Element.prototype = {
  constructor: VQ_Element,
  // obj contains correspondind ajoo Element object
  obj: null,
  // --> ajoo object _id used also as VQ_Element identifier
  _id: function() {return this.obj["_id"]},
  // VQ_Element --> bool
  // Determines whether this VQ_Element is the same as the argument
 /* isEqualTo: function(e) {if (e) { return this.obj["_id"]==e.obj["_id"]} else {return false}},
  // --> string (ajoo diagram id)
  getDiagram_id: function() {return this.obj["diagramId"]},
  // string --> string
  // Returns the value (INPUT) of the given compartment by name or null if such compartment does not exist*/
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
  // getCompartmentValueValue: function(compartment_name) {
    // var elem_type_id = this.obj["elementTypeId"];
    // var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    // if (comp_type) {
      // var comp_type_id = comp_type["_id"];
      // var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
      // if (comp) {
          // return comp["value"];
      // };
    // };
    // return null;
  // },
  // string --> [string]
  // Returns the array of values of the given compartment by name or [] if such compartment does not exist
  // getMultiCompartmentValues: function(compartment_name) {
    // var elem_type_id = this.obj["elementTypeId"];
    // var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    // if (comp_type) {
      // var comp_type_id = comp_type["_id"];
      // return Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id}).map(function(c){return c["input"];});
    // };
    // return [];
  // },
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
  // getMultiCompartmentSubCompartmentValues: function(compartment_name, subcompartment_name_list) {
    // var elem_type_id = this.obj["elementTypeId"];
    // var comp_type = CompartmentTypes.findOne({name: compartment_name, elementTypeId: elem_type_id});
    // if (comp_type) {
      // var comp_type_id = comp_type["_id"];
      // var compartments = Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id});
      // return compartments.map(function(c) {
        // var res = { fulltext:c["input"], _id:c["_id"] };
        // if (c.subCompartments) {
        // if (c.subCompartments[compartment_name]) {
          // if (c.subCompartments[compartment_name][compartment_name]) {
            // _.each(subcompartment_name_list, function(sc_name) {
                // if (c.subCompartments[compartment_name][compartment_name][sc_name.name]) {
                  // var transformer = function(v) { return v};
                  // if (sc_name["transformer"]) {
                    // transformer = sc_name["transformer"];
                  // };
                  // res[sc_name.title]=transformer(c.subCompartments[compartment_name][compartment_name][sc_name.name]["input"]);
                // };
              // });
          // }
        // }}

        // return res;
      // })
    // };
    // return [];
  // },
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
  // isLink: function() {
		// return this.getElementTypeName()=="Link";
	// },
  // isUnion: function() {
		// return this.getName()== "[ + ]";
	// },
	// isUnit: function() {
		// return this.getName()=="[ ]";
	// },
  // Determines whether the VQ_Element is the root class of the query
  // isRoot: function() {
    // return this.getType()=="query" || this.isVirtualRoot;
  // },
	// Determines whether the VQ_Element is the subquery root
	// isSubQueryRoot: function() {
		// return _.any(this.getLinks(), function(l) {
			 // var dir = l.link.getRootDirection();
			 // return l.link.isSubQuery() && (l.start && dir == "start" || !l.start && dir == "end")
		// });
	// },
	// Determines whether the VQ_Element is the global subquery root
	// isGlobalSubQueryRoot: function() {
		// return _.any(this.getLinks(), function(l) {
			 // var dir = l.link.getRootDirection();
			 // return l.link.isGlobalSubQuery() && (l.start && dir == "start" || !l.start && dir == "end")
		// });
	// },
  // --> string
  // gets the name of the class or link, in fact it is the classname or rolename
  /*getName: function() {
    // Since we need inv(name) also in the input, we should extract the name in this case
    var name = this.getCompartmentValue("Name");
    // if (name && name.substring(0,4)=="inv(") {
        // return name.substring(4,name.length-1);
    // } else {
        return name;
    // }
  },*/
  // --> string
  // getInstanceAlias: function() {
    // return this.getCompartmentValue("Instance");
  // },
  // string -->
  // setInstanceAlias: function(instanceAlias) {
    // this.setCompartmentValue("Instance",instanceAlias, instanceAlias);
  // },

  // --> string
  // getStereotype: function() {
    // return this.getCompartmentValue("Stereotype");
  // },

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
 /* // determines whether a class rather than instance is searched
  isVariable: function() {
    var name = this.getName();
	if(name !== null){
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
	var graphs = this.getGraphsServices();


	var isOptional = false;




	for(let field in fields){
		if(typeof fields[field] !== "function" && (fields[field]["requireValues"] !== true || fields[field]["exp"] == "(select this)")){
			isOptional = true;
			break;
		}
		if( aggregation.length > 0) isOptional = true;
	}
	var links = this.getLinks();
	for(let l in links){

		if(typeof links[l] === "object" && !links[l].start && links[l].link.getType() !== "REQUIRED"){

			isOptional = true;
			break;
		}
	}
	return ((alias == null || alias == "") && (className == null || className == "") && graphs.length === 0 && isOptional == false && aggregation.length < 1);

  },
  // gets class variable name (e.g. X for ?X)
  getVariableName: function() {
    if (this.isVariable()) {
		var name = this.getName();
		if(name !== null){
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

  // setGraph: function(name, input) {
      // this.setCompartmentValue("Graph",name,input);
  // },

  getGraphInstruction: function() {
    return this.getCompartmentValue("Graph instruction")
  },

  // setGraphInstruction: function(instruction) {
	// this.setCompartmentValue("Graph instruction",instruction,instruction);
  // },
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
  setIndirectClassMembership: async function(indirect) {

	var indirectS = "false";

	if (indirect) {
		// if indirectClassMembership parameter is set, execute dynamicDefaultValue ExtensionPoint, to set default value
		if(this.getName() !== null && this.getName() !== ""){
			await this.setNameValue(".. "+this.getName());
			indirectS = "true";
		}
		else if(this.getName() !== null)await this.setNameValue(this.getName());
	} else {
      if(this.getName() !== null)await this.setNameValue(this.getName());
    };
    await this.setCompartmentValueAuto("indirectClassMembership",indirectS)

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

  isDelayedLink: function() {
	return this.getCompartmentValue("IsDelayedLink")=="true";
  },
  // bool  ->
  setIsDelayedLink: function(delayedLink) {
    var distinctS = this.boolToString(delayedLink)
    this.setCompartmentValueAuto("IsDelayedLink",distinctS)
  },

  //bool ->
  // setUseLabelService: function(useLabelService) {
    // var useLabelServiceS = this.boolToString(useLabelService)
    // this.setCompartmentValueAuto("Use Label Service",useLabelServiceS)
  // },
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
  getHaving: function() {
    return this.getCompartmentValue("Having");
  },
  // string -->
  setHaving: function(having) {
    this.setCompartmentValueAuto("Having",having)
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
	if(graph !== null && graph !="" && graphInstruction !== null && graphInstruction !== "") graphPrefixValue = "{" + graphInstruction + ": " + graph + "} ";
	if(isInternal == true) prefixesValue = "h";
	if(requireValues == true) prefixesValue = prefixesValue + "+";
	if(prefixesValue !== "") prefixesValue = "{" + prefixesValue + "} ";
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

  getGraphsServices: function() {
    let gs = this.getMultiCompartmentSubCompartmentValues("Graph/Service",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"},
    {title:"schema",name:"Schema"}]);
	if(gs.length > 0) return gs[0];
	return gs
  },

  getNamedGraphs: function() {
    return this.getMultiCompartmentSubCompartmentValues("Named Graphs",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"}]);
  },

  addNamedGraph: function(graph,graphInstruction) {
    this.addCompartmentSubCompartments("Named Graphs",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
    ])
  },

  getPrefixDeclarations: function() {
    return this.getMultiCompartmentSubCompartmentValues("Prefix Declarations",
    [{title:"prefix",name:"Prefix"},
    {title:"namespace",name:"Namespace"}]);
  },

  addPrefixDeclarations: function(prefix, namespace) {
	this.addCompartmentSubCompartments("Prefix Declarations",[
      {name:"Prefix",value:prefix},
      {name:"Namespace",value:namespace},
    ])
  },

  getSchemaDeclarations: function() {
    return this.getMultiCompartmentSubCompartmentValues("Schema Declarations",
    [{title:"schema",name:"Schema"},
    {title:"endpointURI",name:"Endpoint URI"}]);
  },

  addSchemaDeclarations: function(schema, endpointURI) {
	this.addCompartmentSubCompartments("Schema Declarations",[
      {name:"Schema",value:schema},
      {name:"Endpoint URI",value:endpointURI},
    ])
  },

  // string, string -->
  // addGraph: function(graph,graphInstruction) {
    // this.addCompartmentSubCompartments("Graph",[
      // {name:"Graph",value:graph},
      // {name:"Graph instruction",value:graphInstruction},
    // ])
  // },

  // addGraphs: function(graph,graphInstruction) {
    // this.addCompartmentSubCompartments("Graphs",[
      // {name:"Graph",value:graph},
      // {name:"Graph instruction",value:graphInstruction},
    // ])
  // },

  addGraphsServices: function(graph,graphInstruction,schema) {
    this.addCompartmentSubCompartments("Graph/Service",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
      {name:"Schema",value:schema},
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
  // shouldHideDefaultLinkName: function() {
  	// let val = this.getCompartmentValue("Hide default link name");
		// return val == "true" || val == true;
	// },
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
	// hideDefaultLinkName: function(hide, input, value) {
		// if (hide) {
			// if (this.isDefaultLink()) {
				// this.setLinkNameVisibility(false, input, value);
			// } else {
				// this.setLinkNameVisibility(true, input, value);
			// }
		// } else {
			// this.setLinkNameVisibility(true, input, value);
		// }
	// },
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
	// setLinkNameVisibility: function(visible, input, value) {
		// if (this.isLink()) {
			// var elem_type_id = this.obj["elementTypeId"];
	    // var comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type_id});
	    // if (comp_type) {
	      // var comp_type_id = comp_type["_id"];
	      // var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      // if (comp) {
					  // var a = { "compartmentStyleUpdate": {"style.visible":visible}};

					  // if (_.isUndefined(input)) {
					  	// input = comp["input"];
					  // }

					  // if (_.isUndefined(value)) {
					  	// value = comp["value"];
					  // }

            // a["input"] = input;
						// a["value"] = value;
						// a["id"] = comp["_id"];
						// a["projectId"] = Session.get("activeProject");
			 			// a["versionId"] = Session.get("versionId");

			 			// Utilities.callMeteorMethod("updateCompartment", a);
	      // };
		// };
	// };
	// },
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
  // setClassType: function(type) {
      // this.setCompartmentValue("ClassType", type, type)
  // },

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
					if(this.getType() == "FILTER_EXISTS")  this.setLinkType("REQUIRED");
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
					if(this.getType() == "FILTER_EXISTS")  this.setLinkType("REQUIRED");
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

	// setIsInverseLink: function(value) {
		 // this.setCompartmentValue("Inverse Link",value,"");
	// },

	// setHideDefaultLinkName: function(value) {
		 // this.setCompartmentValue("Hide default link name",value,value);
	// },
	//sets compartment value (input and value)
	// string, string, string, bool? -> int (0 ir update failed - no such type, 1 if compartment updated, 3 - compartment inserted)
  // If insert mode is true then new compartment is inserted regardless of existence
	setCompartmentValue: function(comp_name, input, value, insertMode) {
	//console.log(" VQ_element  -----setCompartmentValue------ ")

    if (!this.obj) {
      console.error(this.obj);
      return;
    }

    var elem_id = this._id();
		var ct = CompartmentTypes.findOne({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
			var c = Compartments.findOne({elementId: elem_id, compartmentTypeId: ct["_id"]});
			if (c && !insertMode) {
				Dialog.updateCompartmentValue(ct, elem_id, input, value, c["_id"]);
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
		let prefix = ct["prefix"] || "";
		let sufix = ct["sufix"] || "";
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

      if (ct.inputType.type == "custom") {
      // if (ct.inputType.type == "custom" && ct.inputType.templateName == "multiField") {
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
	  c_to_create["compartment"]["value"] = value_array.join("");
	  if(!c_to_create["compartment"]["value"].startsWith(prefix)) c_to_create["compartment"]["value"] = prefix + c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].endsWith(sufix)) c_to_create["compartment"]["value"] = c_to_create["compartment"]["value"] + sufix;
	  // c_to_create["compartment"]["value"] = prefix + value_array.join("") + sufix;

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
    	if (classObj.isRoot()){
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
*/
}


class VQ_Element_Async{
  constructor(elem) {
		this.obj = elem;
		this.isVirtualRoot = false;
	}

  // --> ajoo object _id used also as VQ_Element identifier
  _id() { return this.obj["_id"];}
  // VQ_Element --> bool
  // Determines whether this VQ_Element is the same as the argument
  isEqualTo(e) {return e ? this.obj["_id"] === e.obj["_id"] : false;}
  // --> string (ajoo diagram id)
   getDiagram_id() {return this.obj["diagramId"];}
  // string --> string
  // Returns the value (INPUT) of the given compartment by name or null if such compartment does not exist
  async getCompartmentValue(compartment_name) {

	if (!this.obj) {
      console.error(this.obj);
      return;
    }
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
	//console.log("compartment_name", compartment_name,comp_type)
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["input"];
      };
    };
    return null;
  }
  // string --> string
  // Returns the value (VALUE) of the given compartment by name or null if such compartment does not exist
  async getCompartmentValueValue(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["value"];
      };
    };
    return null;
  }
  // string --> [string]
  // Returns the array of values of the given compartment by name or [] if such compartment does not exist
  async getMultiCompartmentValues(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      return Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id}).map(function(c){return c["input"];});
    };
    return [];
  }
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
  async getMultiCompartmentSubCompartmentValues(compartment_name, subcompartment_name_list) {
    const elem_type_id = this.obj["elementTypeId"];
    const comp_type = await CompartmentTypes.findOneAsync({
      name: compartment_name,
      elementTypeId: elem_type_id
    });

    if (!comp_type) return [];

    const comp_type_id = comp_type["_id"];
    const compartments = Compartments.find({
      elementId: this._id(),
      compartmentTypeId: comp_type_id
    });

    return compartments.map(c => {
      const res = { fulltext: c["input"], _id: c["_id"] };

      const subs1 = c.subCompartments?.[compartment_name]?.[compartment_name];
      if (subs1) {
        for (let sc_name of subcompartment_name_list) {
          const sc = subs1[sc_name.name];
          if (sc) {
            const transformer = sc_name.transformer || (v => v);
            res[sc_name.title] = transformer(sc["input"]);
          }
        }
      }

      return res;
    });
  }
	// --> string
	// returns name of the VQ element's type Class, Link, Comment, CommentLink, null
	async getElementTypeName() {
		var et = await ElementTypes.findOneAsync({_id:this.obj["elementTypeId"]});
		if (et) {
			return et["name"];
		} else {
			return null;
		}
	}
  async isClass() {
		return await this.getElementTypeName()=="Class";
	}
  async isLink() {
		return await this.getElementTypeName()=="Link";
	}
  async isUnion() {
		return await this.getName()== "[ + ]";
	}
	async isUnit() {
		return await this.getName()=="[ ]";
	}
  // Determines whether the VQ_Element is the root class of the query
  async isRoot() {
	return await this.getType()=="query" || this.isVirtualRoot;
  }
	// Determines whether the VQ_Element is the subquery root
	async isSubQueryRoot() {
		const links = await this.getLinks();
		for (const l of links) {
			const dir = l.link.getRootDirection();
			if (
				l.link.isSubQuery() &&
				((l.start && dir === "start") || (!l.start && dir === "end"))
			) {
				return true;
			}
		}
		return false;
	}

	// Determines whether the VQ_Element is the global subquery root
	async isGlobalSubQueryRoot() {
		const links = await this.getLinks();
		for (const l of links) {
			const dir = l.link.getRootDirection();
			if (
				l.link.isGlobalSubQuery() &&
				((l.start && dir === "start") || (!l.start && dir === "end"))
			) {
				return true;
			}
		}
		return false;
	}

  // --> string
  // gets the name of the class or link, in fact it is the classname or rolename
  async getName() {
    // Since we need inv(name) also in the input, we should extract the name in this case
    var name = await this.getCompartmentValue("Name");
    // if (name && name.substring(0,4)=="inv(") {
        // return name.substring(4,name.length-1);
    // } else {
        return name;
    // }
  }

  async getClassList() {
    return await this.getCompartmentValue("ClassList");
  }

  // --> string
  async getInstanceAlias() {
    return await this.getCompartmentValue("Instance");
  }
  // string -->
  async setInstanceAlias(instanceAlias) {
    await this.setCompartmentValue("Instance",instanceAlias, instanceAlias);
  }

  // --> string
  // Can be [if Class]: query, condition, subquery, null
  // Can be [if Link]: NOT, OPTIONAL, REQUIRED, null
  async getType() {

    if (await this.isClass()) {
	  return await this.getCompartmentValue("ClassType");
    } else if (await this.isLink()) {
      if (await this.getCompartmentValue("Negation Link")=="true") {
        return "NOT";
      } else if (await this.getCompartmentValue("Optional Link")=="true") {
        return "OPTIONAL";
      } else if (await this.getCompartmentValue("Filter Exists")=="true") {
        return "FILTER_EXISTS";
      } else { return "REQUIRED";};
    } else { return null;};
  }
  // determines whether a class rather than instance is searched
  async isVariable() {
    var name = await this.getName();
	if(name !== null){
		const regex = /\([A-Za-z]+\) /g;
		const found = name.search(regex);
		if(found !== -1){
			name = name.substring(name.indexOf(") ")+2)
		}
	}
	return (name && name.charAt(0)=='?');
  }
  // determines whether a class rather than blank node is searched
  async isBlankNode() {
    var alias = await this.getInstanceAlias();
    var className = await this.getName();
	var fields = await this.getFields();
	var aggregation = await this.getAggregateFields();
	var graphs = await this.getGraphsServices();

	var isOptional = false;

	for(let field in fields){
		if(typeof fields[field] !== "function" && (fields[field]["requireValues"] !== true || fields[field]["exp"] == "(select this)")){
			isOptional = true;
			break;
		}
		if( aggregation.length > 0) isOptional = true;
	}
	var links = this.getLinks();
	for(let l in links){

		if(typeof links[l] === "object" && !links[l].start && await links[l].link.getType() !== "REQUIRED"){

			isOptional = true;
			break;
		}
	}
	return ((alias == null || alias == "") && (className == null || className == "") && graphs.length === 0 && isOptional == false && aggregation.length < 1);

  }
  // gets class variable name (e.g. X for ?X)
  async getVariableName() {
    if (await this.isVariable()) {
		var name = await this.getName();
		if(name !== null){
			const regex = /\([A-Za-z]+\) /g;
			const found = name.search(regex);
			if(found !== -1){
				name = name.substring(name.indexOf(") ")+2)
			}
		}
		return name.substr(1)
	} else { return null }
  }

  async getGraph() {
    return await this.getCompartmentValue("Graph")
  }

  async getGraphInstruction() {
    return await this.getCompartmentValue("Graph instruction")
  }
  // determines whether the link is subquery link
  async isSubQuery() {
    return await this.getCompartmentValue("Subquery Link")=="true"
  }
	// determines whether the link is glogal subquery link
  async isGlobalSubQuery() {
    return await this.getCompartmentValue("Global Subquery Link")=="true"
  }
  // determines whether the link is graph to contents link
  async isGraphToContents() {
    return await this.getCompartmentValue("Graph to contents")=="true"
  }
  // determines whether the link is PLAIN
  async isPlain() {
    return !(await this.isSubQuery() || await this.isGlobalSubQuery() || await this.isConditional())
  }
  // determines whether the link is inverse
  async isInverse() {
		//console.log(this.getCompartmentValue("Inverse Link")==true);
    return await this.getCompartmentValue("Inverse Link")=="true"
  }
  // determines whether the link is conditional
  async isConditional() {
    return await this.getCompartmentValue("Condition Link")=="true"
  }
	// determines whether the link is negation
  async isNegation() {
    return await this.getCompartmentValue("Negation Link")=="true"
  }
	// determines whether the link is optional
  async isOptional() {
    return await this.getCompartmentValue("Optional Link")=="true"
  }
  // detemines whether the link is REQUIRED
  async isRequired() {
    return await this.getType()=="REQUIRED"
  }
  // detemines whether the link is FILTER_EXISTS
  async isFilterExists() {
    return await this.getCompartmentValue("Filter Exists")=="true"
  }
  // Gets link's nesting (query) type: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION,GRAPH
  async getNestingType() {
    return await this.getCompartmentValueValue("NestingType");
  }
  // string  -->
  async setNestingType(type) {

    var valueInputMap = {"PLAIN":"Join", "SUBQUERY":"Subquery","GLOBAL_SUBQUERY":"Subquery + Global", "GRAPH":"Graph to contents", "CONDITION":"Reference"};
	var nestingTypeValueOld = await this.getCompartmentValue("NestingType");

	if(nestingTypeValueOld == "Subquery, Global" || nestingTypeValueOld == "Non-structure (extra join) link") await this.setCompartmentValueAuto("NestingType", nestingTypeValueOld);
    else await this.setCompartmentValueAuto("NestingType", valueInputMap[type]);
    await this.setLinkQueryType(type);
  }
  async isLabelServiceLanguages() {
    var labelServiceLanguages = await this.getCompartmentValue("Label Service Languages");
	if(labelServiceLanguages == null || labelServiceLanguages.replace(/ /g, "") == "") labelServiceLanguages = "[AUTO_LANGUAGE],en";
	return labelServiceLanguages;
  }
  // determines whether the indirect class membership should be used (if configured) by translator
  async isIndirectClassMembership() {
    return await this.getCompartmentValue("indirectClassMembership")=="true";
  }
  // bool ->
  async setIndirectClassMembership(indirect) {
	  var indirectS = "false";

	  if (indirect) {
		// if indirectClassMembership parameter is set, execute dynamicDefaultValue ExtensionPoint, to set default value
		const name = await this.getName();
		if (name !== null && name !== "") {
		  await this.setNameValue(".. " + name);
		  indirectS = "true";
		} else if (name !== null) {
		  await this.setNameValue(name);
		}
	  } else {
		const name = await this.getName();
		if (name !== null) {
		  await this.setNameValue(name);
		}
	  }

	  await this.setCompartmentValueAuto("indirectClassMembership", indirectS);
	}


  async setNameAndIndirectClassMembership(name,indirect) {
	var indirectS = "false";
	var nameValue = name;

	if (indirect) {
		if(name !== null && name !== ""){
			nameValue = ".. " + name;
			indirectS = "true";
		}
	}

	await this.setCompartmentValue("Name",name,nameValue);
	await this.setCompartmentValueAuto("indirectClassMembership",indirectS)
  }
  // determines whether the class has distinct property
  async isDistinct() {
    return await this.getCompartmentValue("Distinct")=="true";
  }
  // bool  ->
  async setDistinct(distinct) {
    var distinctS = this.boolToString(distinct)
    await this.setCompartmentValueAuto("Distinct",distinctS)
  }

  async isDelayedLink() {
	return await this.getCompartmentValue("IsDelayedLink")=="true";
  }
  // bool  ->
  async setIsDelayedLink(delayedLink) {
    var distinctS = this.boolToString(delayedLink)
    await this.setCompartmentValueAuto("IsDelayedLink",distinctS)
  }

  //bool ->
  // setUseLabelService: function(useLabelService) {
    // var useLabelServiceS = this.boolToString(useLabelService)
    // this.setCompartmentValueAuto("Use Label Service",useLabelServiceS)
  // },
  // string -->
  async setLabelServiceLanguages(labelServiceLanguages) {
    await this.setCompartmentValueAuto("Label Service Languages",labelServiceLanguages)
  }
  // determines whether the class has select all property
  async isSelectAll() {
    return await this.getCompartmentValue("Select All")=="true";
  }
  // bool  ->
  async setSelectAll(selectAll) {
    var selectAllS = this.boolToString(selectAll)
    await this.setCompartmentValueAuto("Select All",selectAllS)
  }
  // determines whether the query should be grouped by this class
  async isGroupByThis() {
    return await this.getCompartmentValue("Group by this")=="true";
  }
  // bool  ->
  async setGroupByThis(group) {
    var groupS = this.boolToString(group)
    await this.setCompartmentValueAuto("Group by this",groupS)
  }
	// --> string
  async getFullSPARQL() {
    return await this.getCompartmentValue("FullSPARQL");
	}
  // string -->
  async setFullSPARQL(sparql) {
    await this.setCompartmentValueAuto("FullSPARQL",sparql)
  }
  async getHaving() {
    return await this.getCompartmentValue("Having");
  }
  // string -->
  async setHaving(having) {
    await this.setCompartmentValueAuto("Having",having)
  }
  // --> string
  async getLimit() {
    return await this.getCompartmentValue("Show rows");
  }
  // string -->
  async setLimit(limit) {
    await this.setCompartmentValueAuto("Show rows",limit)
  }
  // --> string
  async getOffset() {
    return await this.getCompartmentValue("Skip rows");
  }
  // string -->
  async setOffset(offset) {
    await this.setCompartmentValueAuto("Skip rows", offset)
  }
  // --> string
  async getComment() {
    return await this.getCompartmentValue("Comment");
  }
  // string -->
  async setComment(comment) {
    await this.setCompartmentValueAuto("Comment", comment)
  }
  // --> [{exp:string}]
  // returns an array of conditions' expressions
  async getConditions() {
	 return await this.getMultiCompartmentSubCompartmentValues("Conditions",
    [{title:"exp",name:"Expression"},
    {title:"allowResultMultiplication",name:"Allow result multiplication",transformer:function(v) {return v=="true"}}]);
    // return this.getMultiCompartmentValues("Conditions").map(function(c) {return {exp:c}});
  }
  // string -->
  async addCondition(condition, allowResultMultiplication) {
    await this.addCompartmentSubCompartments("Conditions",[
	  {name:"Expression", value:condition},
	  {name:"Allow result multiplication",value:this.boolToString(allowResultMultiplication)}
	])
  }
  // --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of attributes: expression, stereotype, alias, etc. ...
  async getFields() {
    var field_list =  await this.getMultiCompartmentSubCompartmentValues("Attributes",
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

    var compratmentList = [];

    const compart_type = await CompartmentTypes.findOneAsync({ name: "Attributes", elementTypeId: this.obj.elementTypeId })
    if (compart_type) {
      const compart_type_id = compart_type["_id"];
      var compartments = await Compartments.find({ compartmentTypeId: compart_type_id, elementId: this.obj._id, }, { sort: { index: 1 } }).fetchAsync();

      for (var compartment of compartments) {
        for (var field of field_list) {
          if (field["_id"] == compartment["_id"]) {
            compratmentList.push(field);
            break;
          }
        }
      }
    }

	  return compratmentList;
  }

  async addField(exp,alias,requireValues,groupValues,isInternal,addLabel,addAltLabel,addDescription,graph,graphInstruction, condition, isAttributeCondition, isNodeLevelCondition) {

	var prefixesValue = "";
	var graphPrefixValue = "";
	if(typeof graph !== "undefined" && graph !== null && graph !="" && graphInstruction !== null && graphInstruction !== "" && typeof graphInstruction !== "undefined") graphPrefixValue = "{" + graphInstruction + ": " + graph + "} ";
	if(isInternal == true) prefixesValue = "h";
	if(requireValues == true) prefixesValue = prefixesValue + "+";
	if(prefixesValue !== "") prefixesValue = "{" + prefixesValue + "} ";
	prefixesValue = graphPrefixValue + prefixesValue;

	await this.addCompartmentSubCompartments("Attributes",[
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
  }
	// --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  async getAggregateFields() {
    return await this.getMultiCompartmentSubCompartmentValues("Aggregates",
    [{title:"exp",name:"Expression"},
    {title:"alias",name:"Field Name"},
	{title:"helper",name:"Helper",transformer:function(v) {return v=="true"}},
	{title:"requireValues",name:"Require Values",transformer:function(v) {return v=="true"}}]);
  }
  // string, string -->
  async addAggregateField(exp,alias,requireValues, helper) {
    await this.addCompartmentSubCompartments("Aggregates",[
      {name:"Expression",value:exp},
      {name:"Field Name",value:alias},
	  {name:"Require Values",value:this.boolToString(requireValues)},
	  {name:"Helper",value:this.boolToString(requireValues)},
    ])
  }
  // returns an array of aggregate attributes: expression, stereotype, alias, etc. ...
  async getGraphs() {
    return await this.getMultiCompartmentSubCompartmentValues("Graphs",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"}]);
  }

  async getGraphsServices() {
    let gs = await this.getMultiCompartmentSubCompartmentValues("Graph/Service",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"},
    {title:"schema",name:"Schema"}]);
	if(gs.length > 0) return gs[0];
	return gs
  }

  async getNamedGraphs() {
    return await this.getMultiCompartmentSubCompartmentValues("Named Graphs",
    [{title:"graph",name:"Graph"},
    {title:"graphInstruction",name:"Graph instruction"}]);
  }

  async addNamedGraph(graph,graphInstruction) {
    await this.addCompartmentSubCompartments("Named Graphs",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
    ])
  }

  async getPrefixDeclarations() {
    return await this.getMultiCompartmentSubCompartmentValues("Prefix Declarations",
    [{title:"prefix",name:"Prefix"},
    {title:"namespace",name:"Namespace"}]);
  }

  async addPrefixDeclarations(prefix, namespace) {
	await this.addCompartmentSubCompartments("Prefix Declarations",[
      {name:"Prefix",value:prefix},
      {name:"Namespace",value:namespace},
    ])
  }

  async getSchemaDeclarations() {
    return await this.getMultiCompartmentSubCompartmentValues("Schema Declarations",
    [{title:"schema",name:"Schema"},
    {title:"endpointURI",name:"Endpoint URI"}]);
  }

  async addSchemaDeclarations(schema, endpointURI) {
	await this.addCompartmentSubCompartments("Schema Declarations",[
      {name:"Schema",value:schema},
      {name:"Endpoint URI",value:endpointURI},
    ])
  }

  async addGraphsServices(graph,graphInstruction,schema) {
    await this.addCompartmentSubCompartments("Graph/Service",[
      {name:"Graph",value:graph},
      {name:"Graph instruction",value:graphInstruction},
      {name:"Schema",value:schema},
    ])
  }
  // --> [{fulltext:string, exp:string, isDescending:bool},...]
  // returns an array of orderings - expression and whether is descending
  async getOrderings() {
    return await this.getMultiCompartmentSubCompartmentValues("OrderBy",
    [
      {title:"exp",name:"Name"},
      {title:"isDescending", name:"Desc", transformer:function(v) {return v=="true"}}
    ])
    //return this.getMultiCompartmentValues("OrderBy");
  }
  // string, bool -->
  async addOrdering(exp,isDescending) {
	await this.addCompartmentSubCompartments("OrderBy",[
      {name:"Name",value:exp},
      {name:"Desc",value:this.boolToString(isDescending)},
    ])
  }
  // --> [{fulltext:string, exp:string},...]
  // returns an array of orderings - expression and whether is descending
  async getGroupings() {
    return await this.getMultiCompartmentSubCompartmentValues("GroupBy",
    [
      {title:"exp",name:"Name"}
    ])
  }
  // string -->
  async addGrouping(exp) {
   await this.addCompartmentSubCompartments("GroupBy",[
      {name:"Name",value:exp}
    ])
  }

  // --> [{exp:string}]
  // returns an array of having's expressions
  async getHavings() {
    //return this.getMultiCompartmentSubValues("Having").map(function(c) {return {exp:c}});
		return await this.getMultiCompartmentSubCompartmentValues("Having",
	[
		{title:"exp",name:"Expression"}
	])
  }
  // --> [{link:VQ_Element, start:bool}, ...]
  // returns an array of objects containing links as VQ_Elements and flag whether is has been retrieved by opposite end as start
  // start true means that the link has been retrieved from link "end"
  // async getLinks() {
    // const startLinks = await Promise.all(
		// Elements.find({ startElement: this.obj["_id"] }).map(async (link) => {
		  // return { link: await createVQ_Element(link["_id"]), start: false };
		// })
	  // );

	  // const endLinks = await Promise.all(
		// Elements.find({ endElement: this.obj["_id"] }).map(async (link) => {
		  // return { link: await createVQ_Element(link["_id"]), start: true };
		// })
	  // );

	  // return _.filter(_.union(startLinks, endLinks), async function (linkobj) {
		// return await linkobj.link.isLink();
	  // });
  // }

  async getLinks() {
    const startLinks = await Promise.all(
      Elements.find({ startElement: this.obj["_id"] }).map(async (link) => {
        return { link: await createVQ_Element(link["_id"]), start: false };
      })
    );

    const endLinks = await Promise.all(
      Elements.find({ endElement: this.obj["_id"] }).map(async (link) => {
        return { link: await createVQ_Element(link["_id"]), start: true };
      })
    );

    const combinedLinks = startLinks.concat(endLinks);

    // Perform async filtering manually
    const results = await Promise.all(
      combinedLinks.map(async (linkobj) => ({
        linkobj,
        isLink: await linkobj.link.isLink()
      }))
    );

    return results
      .filter(res => res.isLink)
      .map(res => res.linkobj);
  }

  // --> {link:VQ_Element, start:bool}
  // returns a link leading to the root (UP direction) or undefined if not exist
  async getLinkToRoot() {
	  let links = await this.getLinks();
	  for (const l of links) {
		const root_direction = await l.link.getRootDirection();
		if ((root_direction == "start" && l.start) || (root_direction == "end" && !l.start)) {
		  return l;
		}
	  }
	  return null; // if no matching link found
  }

  // --> {start:VQ_Element, end:VQ_element}
  // Returns link's start and end VQ_Elements
  async getElements() {
    return { start: await createVQ_Element(this.obj["startElement"]), end: await createVQ_Element(this.obj["endElement"])};
  }
  // --> VQ_Element
  // Returns link's start VQ_Element
  async getStartElement() {
    return await createVQ_Element(this.obj["startElement"]);
  }
  // --> VQ_Element
  // Re turns link's end VQ_Element
  async getEndElement() {
    return await createVQ_Element(this.obj["endElement"]);
  }
  // --> bool
	// returns true if "Hide default link name" checkbox is checked
  // shouldHideDefaultLinkName() {
  	// let val = this.getCompartmentValue("Hide default link name");
		// return val == "true" || val == true;
	// }
	// --> string
	// Determines which end of the link is towards the root
	// returns "start","end" or "none"
  async getRootDirection() {
	const visited_elems = {};
	visited_elems[this._id()] = true;

	const findRoot = async (e) => {
		if (await e.isRoot()) return true;

		visited_elems[e._id()] = true;
		const links = await e.getLinks();

		for (const link of links) {
			if (!visited_elems[link.link._id()] && !(await link.link.isConditional())) {
				visited_elems[link.link._id()] = true;
				let next_el = link.start
					? await link.link.getStartElement()
					: await link.link.getEndElement();

				if (!visited_elems[next_el._id()]) {
					const result = await findRoot(next_el);
					if (result) return true;
				}
			}
		}
		return false;
	};

	if (await findRoot(await this.getStartElement())) return "start";
	if (await findRoot(await this.getEndElement())) return "end";
	return "none";
  }

	// bool -->
	// hides or shows link name if it is default; true - hide, false - show
	// async hideDefaultLinkName(hide, input, value) {
		// if (hide) {
			// if (await this.isDefaultLink()) {
				// await this.setLinkNameVisibility(false, input, value);
			// } else {
				// await this.setLinkNameVisibility(true, input, value);
			// }
		// } else {
			// await this.setLinkNameVisibility(true, input, value);
		// }
	// }
	// function which in fact should be in the schema
	// --> bool
	// Determines whether the link is the only possible option between two classes
	// Šo izskatās vairs neizsauc, paslēpu, lai nav VQ_Schema
	//async isDefaultLink() {
	//	 if (await this.isLink()) {
	//		 var schema = new VQ_Schema({});
	//		 var assoc = schema.findAssociationByName(this.getName());
	//		 //console.log(assoc);
	//		 if (assoc) {
	//			 var start_class = schema.findClassByName(this.getStartElement().getName());
	//			 var end_class = schema.findClassByName(this.getEndElement().getName());
	//       if (start_class && end_class) {
	//				 var all_assoc_from_start = start_class.getAllAssociations();
	//				 //console.log(all_assoc_from_start);
	//				 var all_sub_super_of_end = _.union(end_class.allSuperSubClasses,end_class);
	//				 //console.log(all_sub_super_of_end);
	//				 var possible_assoc = _.filter(all_assoc_from_start, function(a) {
	//						return _.find(all_sub_super_of_end, function(c) {
	//								return c.localName == a.class
	//						})
	//				});
    //    //console.log(possible_assoc);
	//				//console.log(_.size(possible_assoc));
	//				 if (_.size(possible_assoc)==1 && possible_assoc[0].name == assoc.localName) {
	//					 //console.log(possible_assoc[0].name);
	// 					 //console.log(assoc.localName);
	//					 return true
	//				 } else {
	//					 return false;
	//				 }
	//			 }
	//		 }
	//		 }
	//}
  // VQ_Element --> bool
  // Returns true if there is a path in the spanning tree
  // from this to toElement
  // (plain-required-unionfree UP/DOWN, otherwise UP in the tree)
  // TODO: union-free
  async isTherePathToElement(toElement) {
      const visited_elems = {};

      async function findToElem(e) {
        if (e.isEqualTo(toElement)) return true;

        visited_elems[e._id()] = true;
        let res = false;

        const links = await e.getLinks(); // wait for links if it's async
        for (let link of links) {
          if (!visited_elems[link.link._id()] && !(await link.link.isConditional())) {
            visited_elems[link.link._id()] = true;

            let next_el = null;
            const UP_direction = link.link.getRootDirection();

            if (link.start) {
              if (
                UP_direction === "start" ||
                (UP_direction === "end" && await link.link.isPlain() && await link.link.isRequired())
              ) {
                next_el = await link.link.getStartElement();
              }
            } else {
              if (
                UP_direction === "end" ||
                (UP_direction === "start" && await link.link.isPlain() && await link.link.isRequired())
              ) {
                next_el = await link.link.getEndElement();
              }
            }

            if (next_el && !visited_elems[next_el._id()]) {
              res = res || await findToElem(next_el);
            }
          }
        }

        return res;
      }

      return await findToElem(this);
    }

	// bool -->
	// sets the link name compartment's visibility
	// async setLinkNameVisibility(visible, input, value) {
		// if (this.isLink()) {
			// var elem_type_id = this.obj["elementTypeId"];
	    // var comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: elem_type_id});
	    // if (comp_type) {
	      // var comp_type_id = comp_type["_id"];
	      // var comp = Compartments.findOne({elementId: this._id(), compartmentTypeId: comp_type_id});
	      // if (comp) {
					  // var a = { "compartmentStyleUpdate": {"style.visible":visible}};

					  // if (_.isUndefined(input)) {
					  	// input = comp["input"];
					  // }

					  // if (_.isUndefined(value)) {
					  	// value = comp["value"];
					  // }

            // a["input"] = input;
						// a["value"] = value;
						// a["id"] = comp["_id"];
						// a["projectId"] = Session.get("activeProject");
			 			// a["versionId"] = Session.get("versionId");

			 			// await Utilities.callMeteorMethodAsync("updateCompartment", a);
	      // };
		// };
	// };
	// }
  // string, bool -->
	// sets comartments visibility
	async setCompartmentVisibility(compartmentName,visible, input, value) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = await CompartmentTypes.findOneAsync({name: compartmentName, elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
            a["input"] = input;
						a["value"] = value;
						a["id"] = comp["_id"];
						a["projectId"] = Session.get("activeProject");
			 			a["versionId"] = Session.get("versionId");

			 			await Utilities.callMeteorMethodAsync("updateCompartment", a);
	      };
		};
	}
  // sets name
	// string -->

  async setName(name) {
    if (await this.isIndirectClassMembership() && name !== null && name !== "") {
      await this.setCompartmentValue("Name",name,".. "+name);
    } else {
      await this.setCompartmentValue("Name",name,name);
    };
  }
  // sets name's visual appeareance
  // string -->
  async setNameValue(value, input) {
  		if (!input) {
  			input = await this.getName();
  		}

     await this.setCompartmentValue("Name", input, value);
  }
  // sets type of the class: query, condition
  // string -->
  // setClassType: function(type) {
      // this.setCompartmentValue("ClassType", type, type)
  // },

	// sets link type. Possible values: REQUIRED, NOT, OPTIONAL, FILTER EXISTS
	async setLinkType(value) {
	//console.log("~~~~~~~~~~~"+value+"~~~~~~~~~~~~~~~~~~")
		 if (await this.isLink()) {
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
						await this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#ff0000"},
						                      {attrName:"elementStyle.dash",attrValue:[0,0]},
																	{attrName:"startShapeStyle.stroke", attrValue:"#ff0000"},
																	{attrName:"endShapeStyle.stroke", attrValue:"#ff0000"},
																]);
						if (await this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   let root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 await this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#ff0000"},
																 ]);
							 } else if (root_dir=="end") {
								 await this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#ff0000"},
																 ]);
							 };
						} else if (await this.isGlobalSubQuery()) {
							let root_dir =this.getRootDirection();
							if (root_dir=="start") {
								await this.setCustomStyle([
																 {attrName:"startShapeStyle.fill",attrValue:"#ffffff"},
																]);
							} else if (root_dir=="end") {
								await this.setCustomStyle([
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
						await this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#18b6d1"},
						                      {attrName:"elementStyle.dash",attrValue:[6,5]},
																	{attrName:"startShapeStyle.stroke", attrValue:"#18b6d1"},
																	{attrName:"endShapeStyle.stroke", attrValue:"#18b6d1"},
																]);
						if (await this.isConditional()) {
               await this.setNestingType("PLAIN");

						} else if (await this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   let root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 await this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																 ]);
							 } else if (root_dir=="end") {
								 await this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#18b6d1"},
																 ]);
							 };

						};
				} else if (value=="FILTER_EXISTS") {
					  await this.setNestingType("SUBQUERY");
					  setOpt = "false";
						setNeg = "false";
						setNegValue = "";
						setFE = "true";
						setFEValue = "{exists}";
						await this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#000000"},
																{attrName:"elementStyle.dash",attrValue:[0,0]},
																{attrName:"startShapeStyle.stroke", attrValue:"#000000"},
																{attrName:"endShapeStyle.stroke", attrValue:"#000000"},
																	]);
						if (await this.isConditional()) {
               await this.setNestingType("PLAIN");

						} else if (await this.isSubQuery() ) {
						//	 this.setLinkQueryType("PLAIN");
						   let root_dir =this.getRootDirection();
               if (root_dir=="start") {
								 await this.setCustomStyle([
																	{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																 ]);
							 } else if (root_dir=="end") {
								 await this.setCustomStyle([
																	{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																 ]);
							 };

						};
				} else {
					await this.setCustomStyle([{attrName:"elementStyle.stroke",attrValue:"#000000"},
																{attrName:"elementStyle.dash",attrValue:[0,0]},
																{attrName:"startShapeStyle.stroke", attrValue:"#000000"},
																{attrName:"endShapeStyle.stroke", attrValue:"#000000"},
															]);
				  if (await this.isSubQuery() ) {
										let root_dir =this.getRootDirection();
									  if (root_dir=="start") {
																	 await this.setCustomStyle([
																										{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																									 ]);
										} else if (root_dir=="end") {
																	 await this.setCustomStyle([
																										{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																									 ]);
										};
				  };
				};

				// if (setNegValue == " ") {
				// 	setNegValue = "";
				// }

				// this.setCompartmentValue("Negation Link", setNeg, setNegValue);
				await this.setCompartmentVisibility("Negation Link", (setNeg==true || setNeg=="true"), setNeg, setNegValue);
				await this.setCompartmentValue("Optional Link", setOpt, "");
				// this.setCompartmentValue("Filter Exists", setFE, setFEValue);
				await this.setCompartmentVisibility("Filter Exists", (setFE==true || setFE=="true"), setFE, setFEValue);

		 }
	}

	// sets link type. Possible values: PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION, GRAPH
	async setLinkQueryType(value) {
		 if (await this.isLink()) {
        // By default link is PLAIN
				var setSub = "false";
				var setGSub = "false";
				var setCond = "false";
				var setGraph = "false";
        var root_dir =await this.getRootDirection();
				if (value=="SUBQUERY") {
					  setSub = "true";
						setGSub = "false";
						setCond = "false";
						setGraph = "false";

						if (root_dir=="start") {
							await this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		//{attrName:"startShapeStyle.fill",attrValue:"#000000"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
																		// {attrName:"startShapeStyle.radius",attrValue:6},
																		{attrName:"endShapeStyle.shape",attrValue:"Arrow"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
						  if (await this.isNegation()) {
									await this.setCustomStyle([
																	     {attrName:"startShapeStyle.fill",attrValue:"#ff0000"},
																	   ]);
							} else if (await this.isOptional()) {
								await this.setCustomStyle([
																		 {attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																	 ]);
							} else {
									await this.setCustomStyle([
																			 {attrName:"startShapeStyle.fill",attrValue:"#000000"},
																		 ]);
							};
						} else if (root_dir=="end") {
							await this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Circle"},
																		//{attrName:"endShapeStyle.fill",attrValue:"#000000"},
																		{attrName:"endShapeStyle.radius",attrValue:12},
																		// {attrName:"endShapeStyle.radius",attrValue:6},
																		{attrName:"startShapeStyle.shape",attrValue:"None"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);
							if (await this.isNegation()) {
										await this.setCustomStyle([
																				{attrName:"endShapeStyle.fill",attrValue:"#ff0000"},
																			 ]);
							} else if (await this.isOptional()) {
								await this.setCustomStyle([
																		 {attrName:"startShapeStyle.fill",attrValue:"#18b6d1"},
																	 ]);
							} else {
									  await this.setCustomStyle([
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
							await this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Circle"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:12},
																		// {attrName:"startShapeStyle.radius",attrValue:6},
																		{attrName:"endShapeStyle.shape",attrValue:"Arrow"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:3},
																	]);

						} else if (root_dir=="end") {
							await this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Circle"},
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
					if(await this.getType() == "FILTER_EXISTS") await this.setLinkType("REQUIRED");
					  setSub = "false";
						setGSub = "false";
						setGraph = "false";
						setCond = "true";
						await this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Diamond"},
																 {attrName:"startShapeStyle.fill",attrValue:"#ffffff"},
																 {attrName:"startShapeStyle.radius",attrValue:12},
																 {attrName:"endShapeStyle.shape",attrValue:"Diamond"},
																 {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																 {attrName:"endShapeStyle.radius",attrValue:12},
																 {attrName:"elementStyle.strokeWidth",attrValue:1},

																]);
						if (await this.isOptional()) {
									await this.setLinkType("REQUIRED");
						};
				} else if (value=="GRAPH") {
					if(await this.getType() == "FILTER_EXISTS") await this.setLinkType("REQUIRED");
					  setSub = "false";
						setGSub = "false";
						setCond = "false";
						setGraph = "true";

						if (root_dir=="start") {
							await this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"Diamond"},
																		{attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
																		{attrName:"startShapeStyle.radius",attrValue:18},
																		{attrName:"endShapeStyle.shape",attrValue:"None"},
																	  {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
																	  {attrName:"endShapeStyle.radius",attrValue:8},
																		{attrName:"elementStyle.strokeWidth",attrValue:5},
																	]);

						} else if (root_dir=="end") {
							await this.setCustomStyle([{attrName:"endShapeStyle.shape",attrValue:"Diamond"},
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
					if(await this.getType() == "FILTER_EXISTS") await this.setLinkType("REQUIRED");
					await this.setCustomStyle([{attrName:"startShapeStyle.shape",attrValue:"None"},
															 {attrName:"startShapeStyle.fill",attrValue:"#FFFFFF"},
															 {attrName:"startShapeStyle.radius",attrValue:8},
															 {attrName:"endShapeStyle.shape",attrValue:"Arrow"},
															 {attrName:"endShapeStyle.fill",attrValue:"#FFFFFF"},
															 {attrName:"endShapeStyle.radius",attrValue:8},
															 {attrName:"elementStyle.strokeWidth",attrValue:3},
															]);
				};

			    await this.setCompartmentValue("Subquery Link",setSub," ");
				await this.setCompartmentValue("Global Subquery Link",setGSub," ");
				await this.setCompartmentValue("Condition Link",setCond," ");
				await this.setCompartmentValue("Graph to contents",setGraph," ");
		 }
	}


	// setIsInverseLink: function(value) {
		 // this.setCompartmentValue("Inverse Link",value,"");
	// },

	// setHideDefaultLinkName(value) {
		 // this.setCompartmentValue("Hide default link name",value,value);
	// }
	//sets compartment value (input and value)
	// string, string, string, bool? -> int (0 ir update failed - no such type, 1 if compartment updated, 3 - compartment inserted)
  // If insert mode is true then new compartment is inserted regardless of existence
	async setCompartmentValue(comp_name, input, value, insertMode) {
	//console.log(" VQ_element  -----setCompartmentValue------ ")

		if (!this.obj) {
		  console.error(this.obj);
		  return;
		}

		var elem_id = this._id();
		var ct = await CompartmentTypes.findOneAsync({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
			var c = await Compartments.findOneAsync({elementId: elem_id, compartmentTypeId: ct["_id"]});
			if (c && !insertMode) {
				Dialog.updateCompartmentValue(ct, elem_id, input, value, c["_id"]);
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
             await Utilities.callMeteorMethodAsync("insertCompartment", c_to_create);
          return 3;
			};
		};
		return 0;
	}
  // Sets compartment value - value automatically computed depending on input
  // string, string, bool? -->
  async setCompartmentValueAuto(comp_name, input, insertMode) {
    var ct =  await CompartmentTypes.findOneAsync({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
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
        await this.setCompartmentValue(comp_name, input, value, insertMode);
    }
  }
  // adds comparment with subcompartments
  // string, [{name: string, value:string, transformer: function}]
  async addCompartmentSubCompartments(compartment_name, subcompartment_value_list) {
    var ct =  await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
		let prefix = ct["prefix"] || "";
		let sufix = ct["sufix"] || "";
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

      if (ct.inputType.type == "custom") {
      // if (ct.inputType.type == "custom" && ct.inputType.templateName == "multiField") {
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

      for (let sub_c of sorted_sub_compart_types) {
        c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};

        let sc_value = "";
        const sc = subcompartment_value_list.find(s => s.name === sub_c.name);

        if (sc) {
          if (sc.name && sc.value) {
            const transformer = sc.transformer || (v => v);

            let mapped_value = undefined;
            if (sub_c["inputType"]["type"] === "checkbox") {
              const matched = sub_c["inputType"]["values"].find(s => transformer(sc.value) === s["input"]);
              if (matched) {
                mapped_value = matched["value"];
              }
            }

            if (typeof sc.input !== "undefined") {
              mapped_value = sc.input;
            }

            sc_value = Dialog.buildCompartmentValue(sub_c, transformer(sc.value), mapped_value);

            const target = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sc.name];
            target["input"] = transformer(sc.value);
            target["value"] = sc_value;
          }
        } else {
          // THIS probably doesn't work
          sc_value = Dialog.buildCompartmentValue(sub_c);
          const target = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name];
          target["input"] = sc_value;
          target["value"] = sc_value;
        }

        if (sc_value) {
          value_array.push(sc_value);
          value_array.push(ct["concatStyle"]);
        }
      }

      value_array.pop();

      c_to_create["compartment"]["value"] = value_array.join("");
      c_to_create["compartment"]["input"] = c_to_create["compartment"]["value"];
	  c_to_create["compartment"]["value"] = value_array.join("");
	  if(!c_to_create["compartment"]["value"].startsWith(prefix)) c_to_create["compartment"]["value"] = prefix + c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].endsWith(sufix)) c_to_create["compartment"]["value"] = c_to_create["compartment"]["value"] + sufix;
	  // c_to_create["compartment"]["value"] = prefix + value_array.join("") + sufix;

	  await Utilities.callMeteorMethodAsync("insertCompartment", c_to_create);
    };
  }

	// sets style
	// Style_attr is an object, e.g., {attrName:"startShapeStyle.shape",attrValue:"Circle"}
	// Should provide a list of style_attrs
	async setCustomStyle(style_attr_list) {
		// console.log(style_attr_list);
		const element_id = this._id();
		const diagram_id = this.getDiagram_id();

		for (const a of style_attr_list) {
			a["elementId"] = element_id;
			a["diagramId"] = diagram_id;
			a["projectId"] = Session.get("activeProject");
			a["versionId"] = Session.get("versionId");
			a["styleId"] = "custom";

			await Utilities.callMeteorMethodAsync("updateElementStyle", a);
		}
	}

  setNewExploreFillColor(init_color) {
    let currentColor = init_color ?? this.obj.style.elementStyle.fill
    var [r, g, b] = currentColor.match(/\d+/g).map(Number);
    r = (r - 60) % 256;
    b = (b + 80) % 256;
    this.setCustomStyle([{ attrName: "elementStyle.fill", attrValue: `rgb(${r}, ${g}, ${b})` }]);
  }


  boolToString(bool) { if (bool) { return "true" } else { return "false" } }

  // isVirtualRoot: false,

  setVirtualRoot(isRoot) { this.isVirtualRoot = isRoot; VQ_Element_cache[this._id()].isVirtualRoot = isRoot}


  //Read coordinates and size of box
  async getCoordinates(){
  	var element_id = this._id();
  	var element = await Elements.findOneAsync({_id: element_id});
	var x = element["location"]["x"];
	var y = element["location"]["y"];
	var w = element["location"]["width"];
	var h = element["location"]["height"];
  	return {x: x, y: y, width: w, height: h}
  }
	// Temporal solution: Put new element below target element, as close as possible without overlapping
	// d - step to move below after each try
	// Returns {x: x, y: y1, width: w, height: h} (the left upper corner + dimensions)
   async getNewLocation(d = 30) {
    const boxCoord = await this.getCoordinates();
    const x = boxCoord["x"];
    const y = boxCoord["y"];
    const w = boxCoord["width"];
    const h = boxCoord["height"];

    let y1 = y + h + d;
    const elem_list = [];
    const elem_over = [];
    let max_y;

    Elements.find({ type: "Box" }).forEach(el => {
      elem_list.push(el);
    });

    do {
      elem_over.length = 0;

      for (let el of elem_list) {
        // Check if the new element at (x, y1) would overlap with existing one
        if (el["location"]["x"] < (x + w) &&
            el["location"]["y"] < (y1 + h) &&
            (el["location"]["x"] + el["location"]["width"]) > x &&
            (el["location"]["y"] + el["location"]["height"]) > y1) {

          elem_over.push({
            _id: el["_id"],
            x: el["location"]["x"],
            y: el["location"]["y"],
            w: el["location"]["width"],
            h: el["location"]["height"]
          });
        }
      }

      // If overlapping elements exist, shift y1 below the lowest one
      if (elem_over.length > 0) {
        max_y = 0;
        for (let el of elem_over) {
          const bottom = el["y"] + el["h"];
          if (max_y < bottom) {
            max_y = bottom;
          }
        }
        y1 = max_y + d;
      }

    } while (elem_over.length > 0);

    return { x: x, y: y1, width: w, height: h };
  }


	//Set appearence for known class styles
    //Entry data: query, condition, subquery
   	async setClassStyle(style) {

	    var elem_type = await ElementTypes.findOneAsync({_id: this.obj.elementTypeId});
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
		for (const a of elemData) {
			a["elementId"] = element_id;
			a["diagramId"] = diagram_id;
			a["projectId"] = Session.get("activeProject");
			a["versionId"] = Session.get("versionId");
			a["styleId"] = elem_style.id;

			await Utilities.callMeteorMethodAsync("updateElementStyle", a);
		}

	    await this.setCompartmentValue("ClassType", style, style);
	    // this.obj.styleId = elem_style.id;
	    // return elem_style.id;
	    return;
    }

    // Get ID of the root element for any element
    async getRootId(){
    	var classObj = this;
    	if (!(await classObj.isClass())) {return 0;}
    	if (await classObj.isRoot()){
    		return classObj.obj._id;
    	} else {
    		if (await classObj.getLinkToRoot()){
    			var elements = await classObj.getLinkToRoot().link.getElements();
    			if (await classObj.getLinkToRoot().start) {
    				return await elements.start.getRootId();
    			} else {
    				return await elements.end.getRootId();
    			}
    		}
    	}
    }

    deleteElement(){
    	// elements: array of IDs; elementNames: empty or array of IDs (for logs)
    	Interpreter.extensionPoints.DeleteElementsCollection({elements: [this.obj["_id"]], elementNames: [this.obj["_id"]], diagramId: Session.get("activeDiagram"), versionId: Session.get("versionId")});
    }

}

// Create_VQ_Element = function(cb, location, isLink = false, source?, target?) { }
// const async_Create_VQ_Element = async (location, isLink, target, source) => new Promise(resolve => {
  // Create_VQ_Element(newElem => { resolve(newElem) }, location, isLink, target, source);
// });

export {
  VQ_Element,
  createVQ_Element,
  // Create_VQ_Element,
  Create_VQ_Element_Async,
  Create_Any_VQ_Element_Async,
  // async_Create_VQ_Element,
  Create_VQ_Element_Declaration,
}
