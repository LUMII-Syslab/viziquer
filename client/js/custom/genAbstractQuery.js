Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

 // -->
  // method just prints active diagram's Abstract Query Syntax tree to the console
  GenerateAbstractQuery: function() {
    console.log("Generate AbstractQuery called");
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });
    //console.log(elems_in_diagram_ids);
    // Print All Queries within the diagram
    _.each(genAbstractQueryForElementList(elems_in_diagram_ids),function(q) {
         //console.log(JSON.stringify(q,null,2));
         console.log(JSON.stringify(resolveTypesAndBuildSymbolTable(q),null,2));
         //resolveTypesAndBuildSymbolTable(q);
       })
    //_.each(genAbstractQueryForElementList(elems_in_diagram_ids),function(q) { console.log(JSON.stringify(q,null,2))});
     console.log("GenerateAbstractQuery ends");
  },
});


//[JSON] --> {root:[JSON], symbolTable:[some_name:{scope:?, type:?, elType:?} }]}
// For the query in abstract syntax
// this function resolves the types (adds to identification property what is missing)
// and creats symbol table with resolved types
resolveTypesAndBuildSymbolTable = function (query) {

  // TODO: This is not efficient to recreate schema each time
  var schema = new VQ_Schema();
  // Adding default namespace
  if (schema && query && query.root) {
     query.root.defaultNamespace = schema.URI;
  };
  // string -->[IdObject]
  function resolveClassByName(className) {
    return schema.resolveClassByName(className)
  };

  // string -->[IdObject]
  function resolveLinkByName(linkName) {
    return schema.resolveLinkByName(linkName)
  };

  // string, string -->[IdObject]
  function resolveAttributeByName(className, attributeName) {
    return schema.resolveAttributeByName(className, attributeName)
  };

  var symbol_table = {};

   //JSON -->
  // function recursively modifies query by adding identification info
  function resolveClass(obj_class) {

    _.extend(obj_class.identification, resolveClassByName(obj_class.identification.localName));
    _.extend(obj_class.identification, parseExpression(obj_class.identification.localName));

    if (obj_class.linkIdentification) {
        _.extend(obj_class.linkIdentification, resolveLinkByName(obj_class.linkIdentification.localName));
        _.extend(obj_class.linkIdentification, parsePathExpression(obj_class.linkIdentification.localName))
    };

    obj_class.conditionLinks.forEach(function(cl) {
      _.extend(cl.identification,resolveLinkByName(cl.identification.localName));
      _.extend(cl.identification, parsePathExpression(cl.identification.localName))
    });

    if (obj_class.instanceAlias) {
      if(symbol_table[obj_class.instanceAlias]) {
        console.log("Duplicate instanceAlias name " + obj_class.instanceAlias +" in " + obj_class.identification.localName)
      } else {
        symbol_table[obj_class.instanceAlias]={type:resolveClassByName(obj_class.identification.localName), kind:"CLASS_ALIAS"};
    }};

    obj_class.fields.forEach(function(f) {
        // CAUTION .............
        // HACK: * and ** fields
        if (f.exp=="*" || f.exp=="**") {
           var cl =schema.findClassByName(obj_class.identification.localName);
           if (cl) {
              var attr_list = {};
              if (f.exp=="*") { attr_list = cl.getAttributes()} else { attr_list = cl.getAllAttributes()};
              attr_list.forEach(function(attr) {
                var attr_info = resolveAttributeByName(cl["name"],attr["name"]);
                var attr_is_simple = attr_info && attr_info["maxCardinality"] && attr_info["maxCardinality"]==1;
                obj_class.fields.unshift({exp:attr["name"],alias:null,requireValues:false,groupValues:!attr_is_simple, isInternal:false});
              });
           };
        } else if (f.alias) {
          if (symbol_table[f.alias]) {
             console.log("Duplicate attribute alias name " + f.alias + " in " + obj_class.identification.localName)
          } else {
             symbol_table[f.alias]={type:null, kind:"PROPERTY_ALIAS"}
        }};
    });
    obj_class.aggregations.forEach(function(f) {
        if (f.alias) {
          if (symbol_table[f.alias]) {
             console.log("Duplicate aggregation alias name " + f.alias + " in " + obj_class.identification.localName)
          } else {
             symbol_table[f.alias]={type:null, kind:"PROPERTY_ALIAS"}
        }};
    });

    obj_class.children.forEach(resolveClass);

    return;
  };

  resolveClass(query.root);

  // String --> JSON
  // Parses the text and returns object with property "parsed_exp"
  function parseExpression(str_expr) {
    try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var parsed_exp = vq_grammar.parse(str_expr, {schema:schema, symbol_table:symbol_table});
		  return { parsed_exp: parsed_exp};
	  } else return { parsed_exp: []};
    } catch (e) {
      // TODO: error handling
      console.log(e)
    } finally {
      // nothing
    }
  }


  // String --> JSON
  // Parses the text and returns object with property "parsed_exp"
  function parsePathExpression(str_expr) {
    try {
	  if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var parsed_exp = vq_property_path_grammar.parse(str_expr, {schema:schema, symbol_table:symbol_table});
		  return { parsed_exp: parsed_exp};
	  }else return { parsed_exp: []};
    } catch (e) {
      // TODO: error handling
      console.log(e)
    } finally {
      // nothing
    }
  }

  // JSON -->
  // Parses object's property "exp" and puts the result in the "parsed_exp" property
  function parseExpObject(exp_obj) {

    try {
      var parsed_exp = vq_grammar.parse(exp_obj.exp, {schema:schema, symbol_table:symbol_table});
      exp_obj.parsed_exp = parsed_exp;
    } catch (e) {
      // TODO: error handling
      console.log(e)
    } finally {
      //nothing
    };
  };

  // JSON -->
  // Parses all expressions in the object and recursively in all children
  function resolveClassExpressions(obj_class) {

    obj_class.conditions.forEach(parseExpObject);
    obj_class.aggregations.forEach(parseExpObject);
    // CAUTION!!!!! Hack for * and **
    obj_class.fields = _.reject(obj_class.fields, function(f) {return (f.exp=="*" || f.exp=="**")});

    obj_class.fields.forEach(function(f) {
      // CAUTION!!!!! Hack for (.)
      if (f.exp=="(.)") {
        if (obj_class.instanceAlias==null) {
          if (f.alias!=null && f.alias!="") obj_class.instanceAlias=f.alias;
        } else{
		  f.exp=obj_class.instanceAlias;
		};
        //f.exp=obj_class.instanceAlias;
      };

      if (f.groupValues) {
        f.exp="GROUP_CONCAT("+f.exp+")";
      };

         parseExpObject(f)
         // Here we can try to analyze something about expressiond vcvc vcokkiiiiiuukuuuuuuukl;;;lljjjhh;yyyytttttttty5690-==-0855433``````
         // if expression is just the property name, then resolve its type.
         var p = f.parsed_exp;
         // Don't know shorter/better way to check ...
         // console.log(p);
         // console.log(f.alias);
         if (f.alias && p && p[1] && p[1].ConditionalOrExpression && p[1].ConditionalOrExpression[0] && p[1].ConditionalOrExpression[1] &&  p[1].ConditionalOrExpression[1].length == 0 &&
             p[1].ConditionalOrExpression[0].ConditionalAndExpression && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0] &&
             p[1].ConditionalOrExpression[0].ConditionalAndExpression[1] && p[1].ConditionalOrExpression[0].ConditionalAndExpression[1].length == 0 &&
             p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpressionList
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpressionList.length == 0
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpressionList
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpressionList.length == 0
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"]
         ) {
           var var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"];
           if (var_obj["kind"]=="PROPERTY_NAME") {
             symbol_table[f.alias].type = var_obj["type"];
           }
         }
    });

    if (obj_class.orderings) { obj_class.orderings.forEach(parseExpObject) };
    if (obj_class.havingConditions) { obj_class.havingConditions.forEach(parseExpObject) };

    obj_class.children.forEach(resolveClassExpressions);
    return;
  };

  resolveClassExpressions(query.root);

  //console.log(query.root);
  return {root:query.root, symbolTable:symbol_table, params:query.params}
};

// [string]--> JSON
// Returns query AST-s for the ajoo elements specified by an array of id-s
// element_id_list is the list of potential root elements
genAbstractQueryForElementList = function (element_id_list) {
  // conver id-s to VQ_Elements (filter out incorrect id-s)
  var element_list = _.filter(_.map(element_id_list, function(id) {return new VQ_Element(id)}), function(v) {if (v.obj) {return true} else {return false}});
  // determine which elements are root elements
  var root_elements = _.filter(element_list, function(e) {return e.isRoot();});

  // map each root element to AST
  return _.map(root_elements, function(e) {

    var visited = {};
    var condition_links = [];
    visited[e._id()]=e._id();

    // Next auxilary functions

    // {link:VQ_Element, start:bool}-->JSON for conditional link
    // target is coded as _id
    // It will return the result iff there is a path* to target
    // Otherwise if there is a path from target, the link is registered in the condition_links array
    // TODO: Otherwise an error
    // TODO: Optimize!!!
    var genConditionalLink = function(link) {
     if (_.any(element_list, function(li) {return li.isEqualTo(link.link)})) {
       if (link.start) {
          if (visited[link.link.getStartElement()._id()]) {
            // if path exists - create link json
            if (link.link.getEndElement().isTherePathToElement(link.link.getStartElement())) {
              return { identification: { _id: link.link._id(), localName: link.link.getName() },
                        //If link is inverse, then we got it right
                        isInverse: !link.link.isInverse(),
                        isNot: link.link.getType()=="NOT",
                        target: visited[link.link.getStartElement()._id()]
              };
            } else {
              // if reverse path exists - register link json
              if (link.link.getStartElement().isTherePathToElement(link.link.getEndElement())) {
                condition_links.push({ from: link.link.getStartElement()._id(),
                                       link_info: {
                                          identification: { _id: link.link._id(), localName: link.link.getName() },
                                          isInverse: link.link.isInverse(),
                                          isNot: link.link.getType()=="NOT",
                                          target: visited[link.link.getEndElement()._id()] }
                                     });
              } else {
                // no path ERROR
              };
            };
          };
       } else {
          if (visited[link.link.getEndElement()._id()]) {
              // if path exists - create link json
              if (link.link.getStartElement().isTherePathToElement(link.link.getEndElement())) {
                return { identification: { _id: link.link._id(), localName: link.link.getName() },
                          isInverse: link.link.isInverse(),
                          isNot: link.link.getType()=="NOT",
                          target: visited[link.link.getEndElement()._id()]
                };
              } else {
                // if reverse path exists - register link json
                if (link.link.getEndElement().isTherePathToElement(link.link.getStartElement())) {
                  condition_links.push({ from: link.link.getEndElement()._id(),
                                         link_info: {
                                            identification: { _id: link.link._id(), localName: link.link.getName() },
                                            isInverse: !link.link.isInverse(),
                                            isNot: link.link.getType()=="NOT",
                                            target: visited[link.link.getStartElement()._id()] }
                                       });
                } else {
                  // no path ERROR
                };
              };
          };
       };
     };
       return null;
    };

    // VQ_Element --> [JSON for linked class]
    // Recursive. Traverses the query via depth first search
    function genLinkedElements(current_elem) {
      // {link:VQ_Element, start:bool} --> JSON for linked class
      var genLinkedElement = function(link) {
          var elem = null;
          var linkedElem_obj = {};
          if (link.start) {
            elem = link.link.getStartElement();
            linkedElem_obj["isInverse"] = !link.link.isInverse();
          } else {
            elem = link.link.getEndElement();
            linkedElem_obj["isInverse"] = link.link.isInverse();
          };
          // generate if the element on the other end is not visited AND the link is not conditional
          // AND it is within element_list AND the link is within element_list
          if (!visited[elem._id()] && !link.link.isConditional()
              && _.any(element_list, function(el) {return el.isEqualTo(elem)})
              && _.any(element_list, function(li) {return li.isEqualTo(link.link)})) {
              visited[elem._id()]=elem._id();
              _.extend(linkedElem_obj,
                {
                    linkIdentification:{_id: link.link._id(),localName: link.link.getName()},
                    linkType: link.link.getType(),
                    isSubQuery: link.link.isSubQuery(),
                    isGlobalSubQuery: link.link.isGlobalSubQuery(),
                    identification: { _id: elem._id(), localName: elem.getName()},
                    instanceAlias: elem.getInstanceAlias(),
                    isVariable:elem.isVariable(),
                    isUnion:elem.isUnion(),
                    isUnit:elem.isUnit(),
                    variableName:elem.getVariableName(),
                    // should not add the link which was used to get to the elem
                    conditionLinks:_.filter(_.map(_.filter(elem.getLinks(),function(l) {return !l.link.isEqualTo(link.link)}), genConditionalLink), function(l) {return l}),
                    fields: elem.getFields(),
                    aggregations: elem.getAggregateFields(),
                    conditions: elem.getConditions(),
                    fullSPARQL: elem.getFullSPARQL(),
                    children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l})
                  });
                if (elem.isGlobalSubQueryRoot()) {
                  _.extend(linkedElem_obj,{  orderings: elem.getOrderings(),
                                             distinct:elem.isDistinct(),
                                             limit:elem.getLimit(),
                                             offset:elem.getOffset()  });
                };
                if (elem.isSubQueryRoot()) {
                  _.extend(linkedElem_obj,{ distinct:elem.isDistinct() });
                };
                return linkedElem_obj;
            };

      };

      return _.filter(_.map(current_elem.getLinks(), genLinkedElement), function(l) {return l})
  };

    function getProjectParams() {
     var proj = Projects.findOne({_id: Session.get("activeProject")});
   	 if (proj) {
          var proj_params = {
            useStringLiteralConversion: proj.useStringLiteralConversion,
            queryEngineType: proj.queryEngineType,
          };
          if (proj.useDefaultGroupingSeparator=="true") {
            proj_params.defaultGroupingSeparator = proj.defaultGroupingSeparator;
          };
          return proj_params;
     }
   };
    var query_in_abstract_syntax = { root: {
      identification: { _id: e._id(), localName: e.getName()},
      instanceAlias: e.getInstanceAlias(),
      isVariable:e.isVariable(),
      isUnion:e.isUnion(),
      isUnit:e.isUnit(),
      variableName:e.getVariableName(),
      conditionLinks:_.filter(_.map(e.getLinks(), genConditionalLink), function(l) {return l}),
      fields: e.getFields(),
      aggregations: e.getAggregateFields(),
      conditions: e.getConditions(),
      orderings: e.getOrderings(),
      distinct:e.isDistinct(),
      limit:e.getLimit(),
      offset:e.getOffset(),
      fullSPARQL:e.getFullSPARQL(),
      children: genLinkedElements(e)
    },
     params: getProjectParams() };
    //console.log(condition_links);
    // push all registered condition links to json
    function addConditionLinks(v) {
      _.each(condition_links, function(cl) {
        if (cl["from"]==v["identification"]["_id"]) {
          v["conditionLinks"].push(cl["link_info"]);
        }
      });
      _.each(v["children"], function(ch) {addConditionLinks(ch)});
    };

    addConditionLinks(query_in_abstract_syntax["root"]);
    return query_in_abstract_syntax;
  });
};
