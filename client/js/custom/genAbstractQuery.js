Interpreter.customMethods({
  // This method can be called by ajoo editor, e.g., context menu

 // -->
  // method just prints active diagram's Abstract Query Syntax tree to the console
  GenerateAbstractQuery: function() {
    //console.log("GenerateAbstractQuery called");
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    // Print All Queries within the diagram
    _.each(genAbstractQueryForElementList(elems_in_diagram_ids),function(q) { console.log(JSON.stringify(q,null,2))});
    // console.log("GenerateAbstractQuery ends");
  },
});


// [string]--> JSON
// Returns query AST-s for the ajoo elements specified by an array of id-s
function genAbstractQueryForElementList(element_id_list) {
  // conver id-s to VQ_Elements (filter out incorrect id-s)
  var element_list = _.filter(_.map(element_id_list, function(id) {return new VQ_Element(id)}), function(v) {if (v.obj) {return true} else {return false}});
  // determine which elements are root elements
  var root_elements = _.filter(element_list, function(e) {return e.isRoot();});

  // map each root element to AST
  return _.map(root_elements, function(e) {

    var visited = {};
    visited[e._id()]=e._id();

    // Next auxilary functions

    // {link:VQ_Element, start:bool}-->JSON for conditional link
    // target is coded as _id
    // TODO: Optimize!!!
    var genConditionalLink = function(link) {
       if (link.start) {
          if (visited[link.link.getStartElement()._id()]) {
            return { identification: { _id: link.link._id(), localName: link.link.getName() },
                      isInverse: true,
                      isNot: link.link.getType()=="NOT",
                      target: visited[link.link.getStartElement()._id()]
            };
          };
       } else {
          if (visited[link.link.getEndElement()._id()]) {
            return { identification: { _id: link.link._id(), localName: link.link.getName() },
                      isInverse: false,
                      isNot: link.link.getType()=="NOT",
                      target: visited[link.link.getEndElement()._id()]
            };
          };
       };
       return null;
    };

    // VQ_Element --> [JSON for linked class]
    // Recursive. Traverses the query via deep first search
    // TODO: Optimize!!!!
    function genLinkedElements(current_elem) {
      // {link:VQ_Element, start:bool} --> JSON for linked class
      var genLinkedElement = function(link) {
          if (link.start) {
            var elem = link.link.getStartElement();
            // generate if the element on the other end is not visited AND the link is not conditional
            if (!visited[elem._id()] && !link.link.isConditional()) {
                visited[elem._id()]=elem._id();
                return {
                  linkIdentification:{_id: link.link._id(),localName: link.link.getName()},
                  linkType: link.link.getType(),
                  // not really correct because of isInverse option
                  isInverse:true,
                  isSubQuery:link.link.isSubQuery(),
                  identification: { _id: elem._id(), localname: elem.getName()},
                  stereotype: elem.getStereotype(),
                  instanceAlias: elem.getInstanceAlias(),
                  //"isVariable":false,
                  //"variableName":null,
                  // should not add the link which was used to get to the elem
                  conditionLinks:_.filter(_.map(_.filter(elem.getLinks(),function(l) {return !l.link.isEqualTo(link.link)}), genConditionalLink), function(l) {return l}),
                  fields: elem.getFields(),
                  conditions: elem.getConditions(),
                  children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l}),
                }
            }
          } else {
            var elem = link.link.getEndElement();
            // generate if the element on the other end is not visited AND the link is not conditional
            if (!visited[elem._id()] && !link.link.isConditional()) {
                visited[elem._id()]=elem._id();
                return {
                  linkIdentification:{_id: link.link._id(),localName: link.link.getName()},
                  linkType: link.link.getType(),
                  // not really correct because of isInverse option
                  isInverse:false,
                  isSubQuery:link.link.isSubQuery(),
                  identification: { _id: elem._id(), localname: elem.getName()},
                  stereotype: elem.getStereotype(),
                  instanceAlias: elem.getInstanceAlias(),
                  //"isVariable":false,
                  //"variableName":null,
                  // should not add the link which was used to get to the elem
                  conditionLinks:_.filter(_.map(_.filter(elem.getLinks(),function(l) {return !l.link.isEqualTo(link.link)}), genConditionalLink), function(l) {return l}),
                  fields: elem.getFields(),
                  conditions: elem.getConditions(),
                  children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l}),
                }
            }
          };
      };

      return _.filter(_.map(current_elem.getLinks(), genLinkedElement), function(l) {return l})
  };

    return { root: {
      identification: { _id: e._id(), localname: e.getName()},
      stereotype: e.getStereotype(),
      instanceAlias: e.getInstanceAlias(),
      //"isVariable":false,
      //"variableName":null,
      conditionLinks:_.filter(_.map(e.getLinks(), genConditionalLink), function(l) {return l}),
      fields: e.getFields(),
      conditions: e.getConditions(),
      orderings: e.getOrderings(),
      distinct:e.isDistinct(),
      limit:e.getLimit(),
      offset:e.getOffset(),
      havingConditions:e.getHavings(),
      children: genLinkedElements(e)
    }}
  });
};

// VQ_Element class describes the main objects within ViziQuer diagram - Classes and links
// It is used to traverse objects and retrieve information about them. It does not modify them!
// It hides the ajoo platform specific details allowing to work in ViziQuer abstraction layer
// all properties (except obj) are functions and they are evaluated upon request

// ajoo element id --> VQ_Element
function VQ_Element(id) {
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
  //isVariable: function() {},
  //getVariableName: function() {},
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
  // --> [string]
  // returns an array of conditions' expressions
  getConditions: function() {
    return this.getMultiCompartmentValues("Conditions");
  },
  // --> [{fulltext:string + see the structure below - title1:value1, title2:value2, ...}},...]
  // returns an array of attributes: expression, stereotype, alias, etc. ...
  getFields: function() {
    return this.getMultiCompartmentSubCompartmentValues("Attributes",
    [{title:"exp",name:"Name"},
    {title:"stereotype",name:"Stereotype"},
    {title:"alias",name:"Alias"},
    {title:"requiredValues",name:"IsOptional",transformer:function(v) {return v=="false"}},
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
  // --> [string]
  // returns an array of having's expressions
  getHavings: function() {
    return this.getMultiCompartmentValues("Having");
  },
  // --> [{link:VQ_Element, start:bool}, ...]
  // returns an array of obects containing links as VQ_Elements and flag whether is has been retrieved by opposite end as start
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
