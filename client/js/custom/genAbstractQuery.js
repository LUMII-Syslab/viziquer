var count = 0;

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

 // -->
  // method just prints active diagram's Abstract Query Syntax tree to the console
  GenerateAbstractQuery: async function() {
    console.log("Generate AbstractQuery called");
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });
    //console.log(elems_in_diagram_ids);
    // Print All Queries within the diagram
    _.each(await genAbstractQueryForElementList(elems_in_diagram_ids),async function(q) {
         //console.log(JSON.stringify(q,null,2));
		 var st = await resolveTypesAndBuildSymbolTable(q)
         console.log(JSON.stringify(st,null,2));
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
resolveTypesAndBuildSymbolTable = async function (query) {
	count = 0;
	var variableNamesTable = [];
  // TODO: This is not efficient to recreate schema each time
  // var schema = new VQ_Schema();
  // Adding default namespace
 /* if (schema && query && query.root) {
     query.root.defaultNamespace = schema.URI;
     query.prefixes = schema.getPrefixes();
     //console.log(schema.getPrefixes());
  };*/
  if (query && query.root) {
	// query.root.defaultNamespace = schema.URI;
	query.prefixes = await dataShapes.getNamespaces();
  }

  // string -->[IdObject]
  async function resolveClassByName(className) {
    
	if(typeof className !== "undefined" && className !== null){
		var cls = await dataShapes.resolveClassByName({name: className})
		if(cls["data"].length > 0){
			return cls["data"][0];
		} else if(typeof cls["name"] !== "undefined" && className.indexOf("[ + ]") == -1 && className.indexOf("[ ]") == -1 && className.indexOf("?") == -1) {
			var name = cls["name"];
			var prefix;
			var display_name = className;
			if(display_name.indexOf(":") !== -1){
				display_name = display_name.substring(display_name.indexOf(":")+1);
			}
			if(name.indexOf(":") !== -1){
				prefix = name.substring(0, name.indexOf(":"));
				name = name.substring(name.indexOf(":")+1);
			}
			return {
				display_name: display_name,
				local_name: name,
				prefix:prefix
			}
		}
	}
	return null;
	// return schema.resolveClassByName(className)
  };

  // string -->[IdObject]
  async function resolveLinkByName(linkName) {
	return await dataShapes.resolvePropertyByName({name: linkName})
    // return schema.resolveLinkByName(linkName)
  };

  // string, string -->[IdObject]
  async function resolveAttributeByName(className, attributeName) {
    return await dataShapes.resolvePropertyByName({name: attributeName})
	// return schema.resolveAttributeByName(className, attributeName)
  };

  var symbol_table = {};

   //JSON -->
  // function recursively modifies query by adding identification info
  async function resolveClass(obj_class, parents_scope_table) {
	var schemaName = await dataShapes.schema.schemaType;
	// for wikidata
	
	if(obj_class.instanceAlias != null && obj_class.instanceAlias.indexOf("[") !== -1 && (obj_class.instanceIsConstant == true || obj_class.instanceIsVariable == true)){
		if(schemaName.toLowerCase() == "wikidata" && obj_class.instanceAlias.indexOf(":") == -1 &&((obj_class.instanceAlias.indexOf("[") > -1 && obj_class.instanceAlias.endsWith("]")))){
			obj_class.instanceAlias = "wd:"+obj_class.instanceAlias;
		}	

		if(obj_class.instanceIsConstant == true && (isURI(obj_class.instanceAlias) == 3 || isURI(obj_class.instanceAlias) == 4)) {
			obj_class.instanceAlias = await dataShapes.getIndividualName(obj_class.instanceAlias);	
		}
	}
		  
	
    var my_scope_table = {CLASS_NAME:[], CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};
    var diagram_scope_table = {CLASS_NAME:[], CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};

	if(obj_class.identification.local_name != null) obj_class.identification.local_name = obj_class.identification.local_name.trim();
	if(obj_class.identification.local_name == "") obj_class.identification.local_name = null;

	var pr = "";
	if(schemaName.toLowerCase() == "wikidata" && typeof obj_class.identification.local_name !== "undefined" && obj_class.identification.local_name != null && ((obj_class.identification.local_name.startsWith("[") && obj_class.identification.local_name.endsWith("]")) || obj_class.identification.local_name.indexOf(":") == -1)){
		pr = "wd:";
	}
	var localName = obj_class.identification.local_name;
	
	if(typeof localName !== "undefined" && localName != null) localName = pr+localName;
		
    var resCl = await resolveClassByName(localName);

    _.extend(obj_class.identification, resCl);
	//parser need class with prefix
	var prefix = "";

	if(typeof obj_class.identification.prefix !== 'undefined' && obj_class.identification.prefix != "") prefix = obj_class.identification.prefix + ":";
	
	var display_name = prefix+obj_class.identification.display_name;
	if(typeof obj_class.identification.display_name === "undefined") display_name = obj_class.identification.local_name;
	var par = await parseExpression(display_name, "CLASS_NAME", obj_class.identification)
    _.extend(obj_class.identification, par);

    if (obj_class.linkIdentification) {
		//parser need link with prefix
		var prefix = "";
		// _.extend(obj_class.linkIdentification, resolveLinkByName(obj_class.linkIdentification.local_name));
		if(typeof obj_class.linkIdentification.prefix !== 'undefined' && obj_class.linkIdentification.prefix != "") prefix = obj_class.linkIdentification.prefix + ":";
		var pathExpression = await parsePathExpression(prefix+obj_class.linkIdentification.local_name, obj_class.identification);
        _.extend(obj_class.linkIdentification, pathExpression);
			
		//link is variable name
		if(typeof pathExpression.parsed_exp !== "undefined" && pathExpression.parsed_exp !== null
		&& typeof pathExpression.parsed_exp.PathProperty !== "undefined" && typeof pathExpression.parsed_exp.PathProperty.VariableName !== "undefined"){
			 var expr = pathExpression.parsed_exp.PathProperty.VariableName.substring(1);
			 if(expr.startsWith("?")) expr = expr.substring(1);
			 my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:expr, type:null, context:obj_class.identification._id});
		}
    };
	//class have instance alias
	if (obj_class.instanceAlias) {
		// var className = obj_class.identification.display_name;
		// if(typeof className === "undefined" || className == null || className == "") className = obj_class.identification.local_name;
		// if(typeof className !== "undefined" && className != null) className = pr+className;
		var type =  resCl;
	   if(type != null && typeof obj_class.linkIdentification !== "undefined" && typeof obj_class.linkIdentification.max_cardinality !== "undefined") {type["max_cardinality"] = obj_class.linkIdentification.max_cardinality}
	     
	   my_scope_table.CLASS_ALIAS.push({id:obj_class.instanceAlias, type:type, context:obj_class.identification._id});
	
	  //my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:obj_class.instanceAlias, type:null, context:obj_class.identification._id});
    };
	
	//class name is variable
	if(obj_class.variableName != null){
		// var className = obj_class.identification.display_name;
		// if(typeof className === "undefined" || className == null || className == "") className = obj_class.identification.local_name;
		// if(typeof className !== "undefined" && className != null) className = pr+className;
		var type =  resCl;
		my_scope_table.CLASS_ALIAS.push({id:obj_class.variableName.replace("?", ""), type:type, context:obj_class.identification._id});
	}
	
	// class name
	// if(!obj_class.instanceAlias && !obj_class.variableName){
	   // var type =  resCl;
	   // if(type != null && typeof obj_class.linkIdentification !== "undefined" && typeof obj_class.linkIdentification.max_cardinality !== "undefined") {type["max_cardinality"] = obj_class.linkIdentification.max_cardinality}
	   // my_scope_table.CLASS_NAME.push({id:localName, type:type, context:obj_class.identification._id});
	// }
	

    for (const cl of obj_class.conditionLinks) {
    // obj_class.conditionLinks.forEach(function(cl) {
      // _.extend(cl.identification,resolveLinkByName(cl.identification.local_name));
      _.extend(cl.identification, await parsePathExpression(cl.identification.local_name, obj_class.identification))
    }
	// );
	
	for(var f in obj_class.fields){
		 obj_class.fields[f]["order"] = f;
	}

     for (const f of obj_class.fields) {

    // obj_class.fields.forEach(async function(f) {
        // CAUTION .............
        // HACK: * and ** fields
        // if (f.exp=="*") {
           // var cl =schema.findClassByName(obj_class.identification.local_name);
           // if (cl) {
              // var attr_list = cl.getAllAttributes();
              // attr_list.forEach(async function(attr) {
                // var attr_info = resolveAttributeByName(cl["name"],attr["name"]);
                // var attr_is_simple = attr_info && attr_info["max_cardinality"] && attr_info["max_cardinality"]==1;
                // obj_class.fields.unshift({exp:attr["name"],alias:null,requireValues:f.requireValues,groupValues:!attr_is_simple, isInternal:false});
              // });

			  // obj_class.fields.unshift({exp:"[*sub]",alias:null, requireValues:false, groupValues:false, isInternal:false});
           // };
        // } else if (f.exp=="(*attr)") {
           // var cl =schema.findClassByName(obj_class.identification.local_name);
           // if (cl) {
              // var attr_list = cl.getAllAttributes()
              // attr_list.forEach(async function(attr) {
                // var attr_info = resolveAttributeByName(cl["name"],attr["name"]);
                // var attr_is_simple = attr_info && attr_info["max_cardinality"] && attr_info["max_cardinality"]==1;
                // obj_class.fields.unshift({exp:attr["name"],alias:null,requireValues:f.requireValues,groupValues:!attr_is_simple, isInternal:false});
              // });

           // };
        // } else if (f.exp=="(*sub)") {
           // obj_class.fields.unshift({exp:"[*sub]",alias:null, requireValues:false, groupValues:false, isInternal:false});
        // } else if (f.alias) {
				
        if (f.alias) {
             my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
			 if(f.addLabel == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"Label", type:null, context:obj_class.identification._id});
			 if(f.addAltLabel == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"AltLabel", type:null, context:obj_class.identification._id});
			 if(f.addDescription == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"Description", type:null, context:obj_class.identification._id});
			 if(f.exp.startsWith("?")){
				//atribute is variable name with alias
				var expr = f.exp.substring(1);
				if(expr.startsWith("?")) expr = expr.substring(1);
			    my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:expr, type:null, context:obj_class.identification._id});
			}
        } else if(f.exp.startsWith("?")){
			//atribute is variable name
			var expr = f.exp.substring(1);
			 if(expr.startsWith("?")) expr = expr.substring(1);
			 my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:expr, type:null, context:obj_class.identification._id});
		} else {
          // field without alias? We should somehow identify it
          // obj_id + exp
 
          my_scope_table.UNRESOLVED_NAME.push({id:obj_class.identification._id+f.exp, type:null, context:obj_class.identification._id});
        };
    }

	// );
	for (const f of obj_class.aggregations) {
    // obj_class.aggregations.forEach(function(f) {
        if (f.alias) {
          if ((obj_class.linkType == "REQUIRED" || obj_class.linkType == "OPTIONAL") && (obj_class.isSubQuery || obj_class.isGlobalSubQuery)) {
             // TODO: longer path!
             // TODO: resolve type
             parents_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id, upBySubQuery:1, distanceFromClass:1});
          } else if(typeof obj_class.linkIdentification === "undefined") {
			  diagram_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
		  };
        };
    }
	// );

	for (const ch of obj_class.children) {
    // obj_class.children.forEach(async function(ch) {
      await resolveClass(ch, my_scope_table);

    }
	// );
	
    // we should copy to parent
    if (obj_class.linkIdentification) {
       // plain required
	   if (obj_class.linkType == "REQUIRED" && !obj_class.isSubQuery && !obj_class.isGlobalSubQuery) {
     
			for (const ca of my_scope_table.CLASS_ALIAS) {
			// my_scope_table.CLASS_ALIAS.forEach(function(ca) {
                parents_scope_table.CLASS_ALIAS.push(_.clone(ca))
            }
			// );
			for (const ca of my_scope_table.AGGREGATE_ALIAS) {
            // my_scope_table.AGGREGATE_ALIAS.forEach(function(ca) {
				clone_ca = _.clone(ca);
				if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
				  if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
			    };
				if (clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
                parents_scope_table.AGGREGATE_ALIAS.push(clone_ca)
            }
			// );
       };
	   // plain optional
       if (obj_class.linkType == "OPTIONAL" && !obj_class.isSubQuery && !obj_class.isGlobalSubQuery) {
  
		 for (const ca of my_scope_table.CLASS_ALIAS) {
		 // my_scope_table.CLASS_ALIAS.forEach(function(ca) {
             clone_ca = _.clone(ca);
             clone_ca["upByOptional"] = true;
             parents_scope_table.CLASS_ALIAS.push(clone_ca)
         }
		 // );
		 for (const ca of my_scope_table.AGGREGATE_ALIAS) {
         // my_scope_table.AGGREGATE_ALIAS.forEach(function(ca) {
             clone_ca = _.clone(ca);
             clone_ca["upByOptional"] = true;
             if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
			   if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
			 }else{
				if (clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
			 }
             parents_scope_table.AGGREGATE_ALIAS.push(clone_ca)
         }
		 // );
       };

	   // subquery/global subquery required/optional
       if (obj_class.linkType !== "NOT") {

         for (const ca of  my_scope_table.CLASS_ALIAS) {
		 // my_scope_table.CLASS_ALIAS.forEach(function(ca) {
             clone_ca = _.clone(ca);
             clone_ca["upByOptional"] = true;
             parents_scope_table.CLASS_ALIAS.push(clone_ca)
         }
		 // );
		 for (const ca of   my_scope_table.UNRESOLVED_FIELD_ALIAS) {
		 // my_scope_table.UNRESOLVED_FIELD_ALIAS.forEach(function(ca) {
           clone_ca = _.clone(ca);
           if (obj_class.linkType == "OPTIONAL") {clone_ca["upByOptional"] = true; };
           if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
             if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
			 clone_ca["distanceFromClass"] = 1
           }else{
			if (clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
		   }
           parents_scope_table.UNRESOLVED_FIELD_ALIAS.push(clone_ca)
         }
		 // );
		  for (const ca of   my_scope_table.UNRESOLVED_NAME) {
         // my_scope_table.UNRESOLVED_NAME.forEach(function(ca) {
           clone_ca = _.clone(ca);
           if (obj_class.linkType == "OPTIONAL") { clone_ca["upByOptional"] = true; };
           if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
             if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {
				 clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1
			 }
			 clone_ca["distanceFromClass"] = 1
           }else{
		     if (clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
		   }
           parents_scope_table.UNRESOLVED_NAME.push(clone_ca)
		   
         }
		 // );
       };
    }



    // we should build symbol table entry for this Class.
    symbol_table[obj_class.identification._id] = {};
    _.each(my_scope_table, function(value, key) {
       _.each(value, function(entry) {
         if (!symbol_table[obj_class.identification._id][entry.id]) {
           symbol_table[obj_class.identification._id][entry.id] = [];
         };
         symbol_table[obj_class.identification._id][entry.id].push({kind:key, type:entry.type, context:entry.context, upByOptional:entry.upByOptional, upBySubQuery:entry.upBySubQuery, distanceFromClass:entry.distanceFromClass});
       })
    })

	// we should build symbol table entry for this Class.
    symbol_table["root"] = {};
    _.each(diagram_scope_table, function(value, key) {
       _.each(value, function(entry) {
         if (!symbol_table["root"][entry.id]) {
           symbol_table["root"][entry.id] = [];
         };
         symbol_table["root"][entry.id].push({kind:key, type:entry.type, context:entry.context, upByOptional:entry.upByOptional, upBySubQuery:entry.upBySubQuery, distanceFromClass:entry.distanceFromClass});
       })
    })
	

    return;
  };

  var empty_scope_table = {CLASS_NAME:[], CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};
  await resolveClass(query.root, empty_scope_table);

  // String, String, ObjectId --> JSON
  // Parses the text and returns object with property "parsed_exp"
  // Used only when parsing class name
  async function parseExpression(str_expr, exprType, context) {
    try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var schemaName = await dataShapes.schema.schemaType;

		  var parsed_exp = await vq_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, exprType:exprType, context:context});
		  parsed_exp = await getResolveInformation(parsed_exp, schemaName, symbol_table, context, exprType);
		  
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
  async function parsePathExpression(str_expr, context) {
	try {
	  if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  // var schema = new VQ_Schema();
		  // var proj = Projects.findOne({_id: Session.get("activeProject")});
		  var schemaName = await dataShapes.schema.schemaType;
		  // if (proj) {
			  // if (proj.schema) {
				// schemaName = proj.schema;
			  // };
		  // }
  
		  // var parsed_exp = vq_property_path_grammar_2.parse(str_expr, {schema:schema, schemaName:schemaName, symbol_table:symbol_table, context:context._id});
		  var parsed_exp = await vq_property_path_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, context:context._id});
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
  async function parseExpObject(exp_obj, context, exprType) {
	 
   var parse_obj = exp_obj.exp;
   if(typeof parse_obj !== 'undefined'){
	   if(parse_obj.indexOf("-") !== -1 && parse_obj.indexOf("[") === -1 && parse_obj.indexOf("]") === -1){
	   try {
		  // parse_obj = await vq_variable_grammar.parse(parse_obj, {schema:null, symbol_table:symbol_table, context:context});
		  parse_obj = await vq_variable_grammar_parser.parse(parse_obj, {schema:null, symbol_table:symbol_table, context:context});
		} catch (e) {
		  // TODO: error handling
		 // console.log(e)
		}
	   }
		if(parse_obj.startsWith("[[") == false && parse_obj.endsWith("]]") == false){
			parse_obj = replaceArithmetics(parse_obj.split("+"), "+");
			if(parse_obj.indexOf('"') == -1 && parse_obj.indexOf("'") == -1)parse_obj = replaceArithmetics(parse_obj.split("*"), "*");
		 }

		if(parse_obj != "[*sub]"){
			try {
			  // var proj = Projects.findOne({_id: Session.get("activeProject")});
			 var schemaName = await dataShapes.schema.schemaType;

			    var tt=await resolveTypeFromSchemaForAttributeAndLink(exp_obj.exp, schemaName);
				var isSimple = false;
				if(tt != null) isSimple = true;
			  var parsed_exp = await vq_grammar_parser.parse(parse_obj, {schema:null,schemaName:schemaName, symbol_table:symbol_table, context:context});
			  parsed_exp = await getResolveInformation(parsed_exp, schemaName, symbol_table, context, exprType, isSimple);
			  
			  // var parsed_exp = vq_grammar.parse(parse_obj, {schema:null, schemaName:schemaName, symbol_table:symbol_table, context:context});
			  exp_obj.parsed_exp = parsed_exp;
			} catch (e) {
			  // TODO: error handling
			  console.log(e)
			} finally {
			  //nothing
			};
	   }
   }
  };

  // String, ObjectId, String, IdObject -->
  //update all entries of identifier name from context = sets kind and type (optional)
  function updateSymbolTable(name, context, kind, type, parentType) {
      _.each(symbol_table, function(name_list, current_context) {
          if (name_list[name]) {
            name_in_context = _.find(name_list[name], function(n) {return n.context == context} );
            if (name_in_context) {
              if (kind) {
                name_in_context["kind"] = kind;
              };
              if (type) {
                name_in_context["type"] = type;
              };
              if (parentType) {
                name_in_context["parentType"] = parentType;
              }
            }
          }
      })
  };

  // String, String -->
  // rename the entry
  function renameNameInSymbolTable(name, new_name) {
      _.each(symbol_table, function(name_list, current_context) {
          if (name_list[name]) {
            if (!symbol_table[current_context][new_name]) {
              symbol_table[current_context][new_name] = name_list[name];
            } else {
              symbol_table[current_context][new_name] = symbol_table[current_context][new_name].concat(symbol_table[current_context][name]);
            };
            delete symbol_table[current_context][name];
          }
      })
  };

  // -->
  //remove all UNRESOLVED_NAME and UNRESOLVED_FIELD_ALIAS entries
  function cleanSymbolTable() {
      _.each(symbol_table, function(name_list, current_context) {
            _.each(name_list, function(entry_list, name) {
                symbol_table[current_context][name] = _.reject(entry_list, function(n) {return (n.kind == "UNRESOLVED_NAME" || n.kind == "UNRESOLVED_FIELD_ALIAS" || n.upBySubQuery > 1) } );
 
				// for(var n in symbol_table[current_context][name]){
					
					// if(typeof symbol_table[current_context][name][n]["upBySubQuery"] !== "undefined" && symbol_table[current_context][name][n]["upBySubQuery"] > 1){
						// delete symbol_table[current_context][name][n];
					// }
				// }
				if (_.isEmpty(symbol_table[current_context][name])) {
				  delete symbol_table[current_context][name];
                };

            })
      })
  };

  // JSON -->
  // Parses all expressions in the object and recursively in all children
  async function resolveClassExpressions(obj_class, parent_class) {
	  // if(obj_class.instanceAlias.indexOf("[") !== -1) obj_class.instanceAlias = await dataShapes.getIndividualName(obj_class.instanceAlias)
	
	  if(obj_class.graphs){
		  var prefixes = query.prefixes;
		  for(var g in obj_class.graphs){
			obj_class.graphs[g]["graph"] = getGraphFullForm(obj_class.graphs[g]["graph"], prefixes);
		  }
	  }

	 if(obj_class.isBlankNode == true) {
		 obj_class.instanceAlias = "_:name"+count;
		 count++;
	 }

  if (parent_class) {
	  
	  if(obj_class.graph){
		  var prefixes = query.prefixes;		
		  obj_class.graph = getGraphFullForm(obj_class.graph, prefixes);
	  }
	  
	 
	  
	  
      var pc_st = symbol_table[parent_class.identification._id];
      var oc_st = symbol_table[obj_class.identification._id];

      // copy from parent, DOWN
      _.each(pc_st, async function(entry_list, id) {
        _.each(entry_list, async function(entry) {
          if (((obj_class.linkType == "REQUIRED") && !obj_class.isSubQuery && !obj_class.isGlobalSubQuery) ||
              (entry.kind == "CLASS_ALIAS" && !((obj_class.linkType=="OPTIONAL") && entry.upByOptional))) {
            if (!oc_st[id]) { oc_st[id] = []; };
            if (!_.any(oc_st[id], async function(oc_st_id_entry) { return ((oc_st_id_entry.context == entry.context)&&(oc_st_id_entry.kind == entry.kind))})) {
                // Note that _.clone does SHALLOW copy. Thus type is not copied, but referenced.
                entry_clone = _.clone(entry);
                if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) { entry_clone["downBySubquery"] = true; };
                oc_st[id].push(entry_clone);
            };
          };

        })
      })

    }

    for (const ch of obj_class.children){ await resolveClassExpressions(ch,obj_class); }
	
	// CAUTION!!!!! Hack for * and **
    // obj_class.fields = _.reject(obj_class.fields, function(f) {return (f.exp=="*" || f.exp=="**")});
    obj_class.fields = _.reject(obj_class.fields, function(f) {return (f.exp=="*" || f.exp=="(*attr)" || f.exp=="(*sub)")});


	for (const f of obj_class.fields){
    // await obj_class.fields.forEach(async function(f) {
		
	  if(f.graph){
		  var prefixes = query.prefixes;		
		  f.graph = getGraphFullForm(f.graph, prefixes);
	  }
     
	  if(typeof f.attributeCondition !== "undefined" && f.attributeCondition != null && f.attributeCondition != ""){
		var variableName = f.exp;
		if (f.alias!=null && f.alias!="")variableName = f.alias;
		var conditionExpression = vq_attribute_condition_grammar.parse(f.attributeCondition, {"variable":variableName});
		var condition = {exp:conditionExpression};
		await parseExpObject(condition, obj_class.identification);
		obj_class.conditions.push(condition);
	  } 
	  if(typeof f.attributeConditionSelection !== "undefined" && f.attributeConditionSelection != null && f.attributeConditionSelection != ""){
		var variableName = f.exp;
		if (f.alias!=null && f.alias!="")variableName = f.alias;
		var conditionExpression = vq_attribute_condition_grammar.parse(f.attributeConditionSelection, {"variable":variableName});
		var condition = {exp:conditionExpression};
		await parseExpObject(condition, obj_class.identification);
		
		f.attributeConditionSelection = condition;
		
		// obj_class.conditions.push(condition);
	  }
	  // CAUTION!!!!! Hack for (.)
      if (f.exp=="(.)" || f.exp=="(select this)") {
        if (obj_class.instanceAlias==null) {
          if (f.alias!=null && f.alias!="") {
			  obj_class.instanceAlias=f.alias;
			  obj_class.instanceIsConstant = false;
			  obj_class.instanceIsVariable = true;
		  }
        } else{
			
          var instanceAliasIsURI = isURI(obj_class.instanceAlias);
		  
          if (instanceAliasIsURI || obj_class.instanceIsConstant == true) {
            var strURI = (instanceAliasIsURI == 3 && obj_class.instanceAlias.indexOf("<") == -1) ? "<"+obj_class.instanceAlias+">" : obj_class.instanceAlias;
			 var schemaName = await dataShapes.schema.schemaType;
			if(schemaName.toLowerCase() == "wikidata" && ((strURI.indexOf("[") > -1 && strURI.endsWith("]"))) ){
						if(strURI.indexOf(":") == -1)strURI = "wd:"+strURI;
						// var cls = await dataShapes.resolveIndividualByName({name: id})
						var cls = await dataShapes.getIndividualName(strURI)
						if(cls != null && cls != ""){
							strURI = cls;
						}

			}
			else if(strURI.indexOf("(") !== -1 || strURI.indexOf(")") !== -1 || strURI.indexOf(",") !== -1){
				var prefix = strURI.substring(0, strURI.indexOf(":"));
				var name = strURI.substring(strURI.indexOf(":")+1);
				var prefixes = query.prefixes;
				for(var kp in prefixes){
					if(prefixes[kp]["name"] == prefix) {
						strURI = "<"+prefixes[kp]["value"]+name+">";
						break;
					}
				}
			}
			
			if(obj_class.identification.local_name != null){
				obj_class.instanceAlias = obj_class.identification.display_name;
				if(typeof obj_class.instanceAlias === "undefined") obj_class.instanceAlias = obj_class.identification.local_name;
				
				if(obj_class.instanceAlias.indexOf("[") !== -1 && obj_class.instanceAlias.indexOf("]") !== -1){
					var textPart = obj_class.instanceAlias.substring(obj_class.instanceAlias.indexOf("[")+1);
					if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
					else textPart = textPart.substring(0, textPart.length - 1);
					textPart = textPart.trim();
					obj_class.instanceAlias = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
				}
				var condition = {exp:"(this) = " + strURI};
			    await parseExpObject(condition, obj_class.identification, "CLASS_NAME");
			    obj_class.conditions.push(condition);
				if(obj_class.isVariable == true) obj_class.instanceAlias = null;
			} else {
				
				if(obj_class.identification.local_name == null && (instanceAliasIsURI == 3 || instanceAliasIsURI == 4)){
					var condition = {exp:"(this) = " + strURI};
					obj_class.instanceAlias = "expr";
					await parseExpObject(condition, obj_class.identification, "CLASS_NAME");
					obj_class.conditions.push(condition);
					
					if(f.alias == "") f.alias = "expr";
					await parseExpObject(f, obj_class.identification, "CLASS_NAME");
				} else {
					if(f.alias == "") f.alias = "expr";
					await parseExpObject(f, obj_class.identification, "CLASS_NAME");
				}
			}
			// obj_class.instanceAlias = null;
          } else {
             f.exp=obj_class.instanceAlias;
          }
		    };
      };

      if (f.groupValues) {
        f.exp="GROUP_CONCAT("+f.exp+")";
      };
		if(obj_class.instanceAlias != null && obj_class.identification.local_name == null && (f.exp=="(.)" || f.exp=="(select this)")){
			
		} else{
		if(f.fulltext.indexOf("(select this)") === -1) await parseExpObject(f, obj_class.identification, "attribute");
		else await parseExpObject(f, obj_class.identification, "CLASS_NAME");
         // Here we can try to analyze something about expressiond vcvc vcokkiiiiiuukuuuuuuukl;;;lljjjhh;yyyytttttttty5690-==-0855433``````
         // if expression is just single name, then resolve its type.

         var p = f.parsed_exp;
		 
		 var pathCheck = chechIfSimplePath(p, true, false);
		 if(pathCheck["isPath"] == true && pathCheck["isSimple"] == true) f.isSimplePath = true;

         // Don't know shorter/better way to check ...
         if (p && p[1] && p[1].ConditionalOrExpression && p[1].ConditionalOrExpression[0] && p[1].ConditionalOrExpression[1] &&  p[1].ConditionalOrExpression[1].length == 0 &&
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
             
		   switch (var_obj["kind"]) {
             case "PROPERTY_NAME":
                if (f.alias) {
                  updateSymbolTable(f.alias, obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
				  if(f.addLabel == true) updateSymbolTable(f.alias+"Label", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
				  if(f.addAltLabel == true) updateSymbolTable(f.alias+"AltLabel", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
			      if(f.addDescription == true) updateSymbolTable(f.alias+"Description", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
                } else {
                  updateSymbolTable( obj_class.identification._id+f.exp, obj_class.identification._id, "PROPERTY_NAME", var_obj["type"], var_obj["parentType"]);
                  renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				  
                }
				f.isSimple = true;
                break;
             case "PROPERTY_ALIAS":
                if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			case "AGGREGATE_ALIAS":
                if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			case "BIND_ALIAS":
				if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			 case "REFERENCE_TO_ALIAS":
				if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
             case "CLASS_ALIAS":
                updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", var_obj["type"]);
                break;
             default:
                 //  - so what is it???? It is ERROR ...

           };
         } else if (p && p[1] && p[1].ConditionalOrExpression && p[1].ConditionalOrExpression[0] && p[1].ConditionalOrExpression[1] &&  p[1].ConditionalOrExpression[1].length == 0 &&
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"]
         ) {
           var var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"];

           switch (var_obj["kind"]) {
             case "PROPERTY_NAME":
                if (f.alias) {
                  updateSymbolTable(f.alias, obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
				  if(f.addLabel == true) updateSymbolTable(f.alias+"Label", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
				  if(f.addAltLabel == true) updateSymbolTable(f.alias+"AltLabel", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
			      if(f.addDescription == true) updateSymbolTable(f.alias+"Description", obj_class.identification._id, "PROPERTY_ALIAS", var_obj["type"]);
                } else {
                  updateSymbolTable( obj_class.identification._id+f.exp, obj_class.identification._id, "PROPERTY_NAME", var_obj["type"], var_obj["parentType"]);
                  renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				  
                }
				f.isSimple = true;
                break;
             case "PROPERTY_ALIAS":
                if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			case "AGGREGATE_ALIAS":
                if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			case "BIND_ALIAS":
				if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
			 case "REFERENCE_TO_ALIAS":
				if(typeof f.alias !== "undefined" && f.alias !== null && f.alias !== "")updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");
				else {
					updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "REFERENCE_TO_ALIAS");
					renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
				}
                break;
             case "CLASS_ALIAS":
                updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", var_obj["type"]);
                break;
			 case null:
                if (f.alias) {
                  updateSymbolTable(f.alias, obj_class.identification._id, "PROPERTY_ALIAS");
                } else {
                  updateSymbolTable(obj_class.identification._id+f.exp, obj_class.identification._id, "PROPERTY_NAME");
                  renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);  
                }
				f.isSimple = true;
                break;
				
             default:
                 //  - so what is it???? It is ERROR ...

           };
         } else {
           if (f.alias) {
            
			 var type = null;
			 if(countMaxExpressionCardinality(f.parsed_exp)["isMultiple"] == false) type = {max_cardinality : 1};
			  updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", type);
			  
			  if(f.exp.startsWith("?")){
				  var expr = f.exp.substring(1);
				  if(expr.startsWith("?")) expr = expr.substring(1);
				  updateSymbolTable(expr, obj_class.identification._id, "PROPERTY_ALIAS", null);
			 }
           } else {
			   
			 if(f.exp.startsWith("?")){
				  var expr = f.exp.substring(1);
				  if(expr.startsWith("?")) expr = expr.substring(1);
				  updateSymbolTable(expr, obj_class.identification._id, "PROPERTY_ALIAS", null);
			 }
             // no alias
             // remove from symbol table ...

           }
         }

		     if (f.requireValues && p && p[1] && p[1].ConditionalOrExpression && p[1].ConditionalOrExpression[0] && p[1].ConditionalOrExpression[1] &&  p[1].ConditionalOrExpression[1].length == 0 &&
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

			if (var_obj["kind"].indexOf("_ALIAS") !== -1 && obj_class.instanceAlias != f.exp) {
              var expression = f.exp;
			        if (f.alias) expression = f.alias;
			        var condition = {exp:"EXISTS(" + expression + ")"};
			        await parseExpObject(condition, obj_class.identification);
			        obj_class.conditions.push(condition);
            }
         } 
		 
		  if (f.requireValues && p && p[1] && p[1].ConditionalOrExpression && p[1].ConditionalOrExpression[0] && p[1].ConditionalOrExpression[1] &&  p[1].ConditionalOrExpression[1].length == 0 &&
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"]
         ) {
            var var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"];
			if (var_obj["kind"] !== null && var_obj["kind"].indexOf("_ALIAS") !== -1 && obj_class.instanceAlias != f.exp) {
              var expression = f.exp;
			        if (f.alias) expression = f.alias;
			        var condition = {exp:"EXISTS(" + expression + ")"};
			        await parseExpObject(condition, obj_class.identification);
			        obj_class.conditions.push(condition);
            }
         } 
		}
		
    }
	// );
	
	if(obj_class.linkIdentification && obj_class.linkIdentification.local_name && obj_class.linkIdentification.local_name.startsWith("?")){
		var expr = obj_class.linkIdentification.local_name.substring(1);
		if(expr.startsWith("?")) expr = expr.substring(1);
		updateSymbolTable(expr, obj_class.identification._id, "PROPERTY_ALIAS", null);
	}
	
	 for (const c of obj_class.conditions) {await parseExpObject(c,obj_class.identification);};
	// obj_class.conditions.forEach(async function(c) {await parseExpObject(c,obj_class.identification);});
	for (const a of obj_class.aggregations) {await parseExpObject(a,obj_class.identification);};
    // obj_class.aggregations.forEach(async function(a) {await parseExpObject(a,obj_class.identification);});

    if (obj_class.orderings) { 
		for (const c of obj_class.orderings){await parseExpObject(c,obj_class.identification);}
		// obj_class.orderings.forEach(async function(c) {await parseExpObject(c,obj_class.identification);}) 
	};
    if (obj_class.groupings) { 
		for (const c of obj_class.groupings){await parseExpObject}
		// obj_class.groupings.forEach(await parseExpObject) 
	};
    // if (obj_class.havingConditions) { obj_class.havingConditions.forEach(async function(c) {await parseExpObject(c,obj_class.identification);}) };

	
    // obj_class.children.forEach(async function(ch) { await resolveClassExpressions(ch,obj_class); });
	
	
	
    return;
  };

  await resolveClassExpressions(query.root);
  
  cleanSymbolTable();

  
  return {root:query.root, symbolTable:symbol_table, params:query.params, prefixes:query.prefixes}
};

// [string]--> JSON
// Returns query AST-s for the ajoo elements specified by an array of id-s
// element_id_list is the list of potential root elements
genAbstractQueryForElementList = async function (element_id_list, virtual_root_id_list) {
	
  // conver id-s to VQ_Elements (filter out incorrect id-s)
  var element_list = _.filter(_.map(element_id_list, function(id) {return new VQ_Element(id)}), function(v) {if (v.obj) {return true} else {return false}});
  // determine which elements are root elements
  _.each(element_list, function(e) {
    e.setVirtualRoot(_.any(virtual_root_id_list, function(id) { return id == e._id() }));
  });
  var root_elements = _.filter(element_list, function(e) {return e.isRoot();});

  // map each root element to AST
  return _.map(root_elements, function(e) {

    var visited = {};
    var condition_links = [];
	var messages = [];
	var warnings = [];
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
			  if(link.link.isConditional()){
				  return { identification: { _id: link.link._id(), local_name: link.link.getName() },
							//If link is inverse, then we got it right
							isInverse: !link.link.isInverse(),
							isNot: link.link.getType()=="NOT",
							target: visited[link.link.getStartElement()._id()]
				  };
			  } else {
				  messages.push("Query tree shape can not be identified. Mark edges as extra edges so that join and subquery edges have a tree shape structure.")
			  }
            } else {
              // if reverse path exists - register link json
              if (link.link.getStartElement().isTherePathToElement(link.link.getEndElement())) {
				if(link.link.isConditional()){
					condition_links.push({ from: link.link.getStartElement()._id(),
                                       link_info: {
                                          identification: { _id: link.link._id(), local_name: link.link.getName() },
                                          isInverse: link.link.isInverse(),
                                          isNot: link.link.getType()=="NOT",
                                          target: visited[link.link.getEndElement()._id()] }
                                     });
				} else {
				    messages.push("Query tree shape can not be identified. Mark edges as extra edges so that join and subquery edges have a tree shape structure.")
				}
              } else {
                // no path ERROR
              };
            };
          };
       } else {
          if (visited[link.link.getEndElement()._id()]) {
              // if path exists - create link json
              if (link.link.getStartElement().isTherePathToElement(link.link.getEndElement())) {
				if(link.link.isConditional()){
					return { identification: { _id: link.link._id(), local_name: link.link.getName() },
                          isInverse: link.link.isInverse(),
                          isNot: link.link.getType()=="NOT",
                          target: visited[link.link.getEndElement()._id()]
					};
				}else {
				   messages.push("Query tree shape can not be identified. Mark edges as extra edges so that join and subquery edges have a tree shape structure.")
				}
              } else {
                // if reverse path exists - register link json
                if (link.link.getEndElement().isTherePathToElement(link.link.getStartElement())) {
				  if(link.link.isConditional()){
					condition_links.push({ from: link.link.getEndElement()._id(),
                                         link_info: {
                                            identification: { _id: link.link._id(), local_name: link.link.getName() },
                                            isInverse: !link.link.isInverse(),
                                            isNot: link.link.getType()=="NOT",
                                            target: visited[link.link.getStartElement()._id()] }
                                       });
				  } else {
					    messages.push("Query tree shape can not be identified. Mark edges as extra edges so that join and subquery edges have a tree shape structure.")
				  }
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
                    linkIdentification:{_id: link.link._id(),local_name: link.link.getName()},
                    linkType: link.link.getType(),
                    isSubQuery: link.link.isSubQuery(),
                    isGlobalSubQuery: link.link.isGlobalSubQuery(),
                    isGraphToContents: link.link.isGraphToContents(),
					graph: link.link.getGraph(),
					graphInstruction: link.link.getGraphInstruction(),
                    identification: { _id: elem._id(), local_name: elem.getName()},
                    instanceAlias: replaceSymbols(elem.getInstanceAlias()),
					instanceIsConstant: checkIfInstanceIsConstantOrVariable(elem.getInstanceAlias(), "="),
					instanceIsVariable: checkIfInstanceIsConstantOrVariable(elem.getInstanceAlias(), "?"),
                    isVariable:elem.isVariable(),
                    isBlankNode:elem.isBlankNode(),
                    isUnion:elem.isUnion(),
                    isUnit:elem.isUnit(),
					selectAll:elem.isSelectAll(),
                    variableName:elem.getVariableName(),
                    groupByThis:elem.isGroupByThis(),
                    indirectClassMembership: elem.isIndirectClassMembership(),
					labelServiceLanguages: elem.isLabelServiceLanguages(),				
                    // should not add the link which was used to get to the elem
                    conditionLinks:_.filter(_.map(_.filter(elem.getLinks(),function(l) {return !l.link.isEqualTo(link.link)}), genConditionalLink), function(l) {return l}),
                    fields: elem.getFields(),
                    aggregations: elem.getAggregateFields(),
					
                    conditions: elem.getConditions(),
                    fullSPARQL: elem.getFullSPARQL(),
					comment: elem.getComment(),
                    children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l})
                  });
                if (elem.isGlobalSubQueryRoot()) {
                  _.extend(linkedElem_obj,{  orderings: elem.getOrderings(),
                                             groupings: elem.getGroupings(),
                                             distinct:elem.isDistinct(),
                                             limit:elem.getLimit(),
                                             offset:elem.getOffset() });
					if(link.link.getName() == "++" || link.link.getName() == "=="){
						 _.extend(linkedElem_obj,{ graphs: elem.getGraphs() });
					}
                } else {
					var orderingss = elem.getOrderings()
					if(orderingss.length > 0){
						for(var order in orderingss){
							warnings.push("Order by clause '" + orderingss[order]["fulltext"] + "' ignored since it is not placed in the main query node")
						}					
					}
				};
					
                if (elem.isSubQueryRoot()) {
                  _.extend(linkedElem_obj,{ distinct:elem.isDistinct(), groupings: elem.getGroupings(), });
				  if(link.link.getName() == "++" || link.link.getName() == "=="){
						 _.extend(linkedElem_obj,{ graphs: elem.getGraphs() });
					}
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
		  if (proj.simpleConditionImplementation=="true") {
            proj_params.simpleConditionImplementation = proj.simpleConditionImplementation;
          };
		  if (proj.keepVariableNames=="true") {
            proj_params.keepVariableNames = proj.keepVariableNames;
          };
          if (proj.directClassMembershipRole) {
            proj_params.directClassMembershipRole = proj.directClassMembershipRole;
          };
          if (proj.indirectClassMembershipRole) {
            proj_params.indirectClassMembershipRole = proj.indirectClassMembershipRole;
          }; 
		  if (proj.completeRDFBoxesInDatetimeFunctions) {
            proj_params.completeRDFBoxesInDatetimeFunctions = proj.completeRDFBoxesInDatetimeFunctions;
          };
		  if (proj.enableWikibaseLabelServices) {
            proj_params.enableWikibaseLabelServices = proj.enableWikibaseLabelServices;
          };
		  if (proj.showGraphServiceCompartments) {
            proj_params.showGraphServiceCompartments = proj.showGraphServiceCompartments;
          };
		  if (proj.endpointUsername) {
            proj_params.endpointUsername = proj.endpointUsername;
          };
		  if (proj.endpointPassword) {
            proj_params.endpointPassword = proj.endpointPassword;
          };
		  if (proj.schema) {
            proj_params.schema = proj.schema;
          };
		  if (proj.graphsInstructions) {
            proj_params.graphsInstructions = proj.graphsInstructions;
          };
          return proj_params;
     }
   };
   
    var query_in_abstract_syntax = { root: {
      identification: { _id: e._id(), local_name: e.getName()},
      instanceAlias:replaceSymbols(e.getInstanceAlias()),
	  instanceIsConstant: checkIfInstanceIsConstantOrVariable(e.getInstanceAlias(), "="),
	  instanceIsVariable: checkIfInstanceIsConstantOrVariable(e.getInstanceAlias(), "?"),
      isVariable:e.isVariable(),
      isBlankNode:e.isBlankNode(),
      isUnion:e.isUnion(),
      isUnit:e.isUnit(),
      variableName:e.getVariableName(),
      conditionLinks:_.filter(_.map(e.getLinks(), genConditionalLink), function(l) {return l}),
      fields: e.getFields(),
      aggregations: e.getAggregateFields(),
	  graphs: e.getGraphs(),
      conditions: e.getConditions(),
      orderings: e.getOrderings(),
      groupings: e.getGroupings(),
      indirectClassMembership: e.isIndirectClassMembership(),
      labelServiceLanguages: e.isLabelServiceLanguages(),
      distinct:e.isDistinct(),
      selectAll:e.isSelectAll(),
      groupByThis:e.isGroupByThis(),
      limit:e.getLimit(),
      offset:e.getOffset(),
      fullSPARQL:e.getFullSPARQL(),
      children: genLinkedElements(e),
	  comment: e.getComment() 
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
    _.each(element_list, function(e) {
      e.setVirtualRoot(false)
    });
	
	if(messages.length > 0)query_in_abstract_syntax["messages"] = messages;
	if(warnings.length > 0)query_in_abstract_syntax["warnings"] = warnings;
	
    return query_in_abstract_syntax;
  });
};

// string -> int
// function checks if the text is uri
// 0 - not URI, 3 - full form, 4 - short form
function isURI(text) {
  if(text.indexOf("://") != -1)
    return 3;
  else
    if(text.indexOf(":") != -1) return 4;
  return 0;
};

function replaceArithmetics(parse_obj_table, sign){
	var parse_obj = "";
	_.each(parse_obj_table, function(obj) {
        if(parse_obj == "") parse_obj = obj;
		else if(obj.startsWith(".") == false && obj != "") parse_obj =  parse_obj + " " + sign + " " +obj;
		else if(obj == "") parse_obj = parse_obj  + sign;
		else parse_obj = parse_obj  + sign + obj;
    });
	return parse_obj
}

function replaceSymbols(instanceAlias){
	if(instanceAlias != null && isURI(instanceAlias) == 4) instanceAlias = instanceAlias.replace(/,/g, '\\,');
	if(instanceAlias != null && (instanceAlias.startsWith("=") || instanceAlias.startsWith("?"))) instanceAlias = instanceAlias.substring(1);
	return instanceAlias
}

function checkIfInstanceIsConstantOrVariable(instanceAlias, instanceMode){
	if(instanceAlias != null){
		if(instanceAlias.startsWith(instanceMode)) return true;
		if(instanceMode == "="){
			//uri
			if(isURI(instanceAlias) == 3 || isURI(instanceAlias) == 4) return true;
			// number
			if(!isNaN(instanceAlias)) return true;
			// string in quotes
			if(instanceAlias.startsWith("'") && instanceAlias.endsWith("'") || instanceAlias.startsWith('"') && instanceAlias.endsWith('"')) return true;
			//display label
			if(instanceAlias.startsWith('[') && instanceAlias.endsWith(']')) return true;
		} else if(instanceMode == "?"){
			//string
			if(instanceAlias.match(/^[0-9a-z_]+$/i)) return true;
		}
	}
	return false;
}

function getGraphFullForm(graph, prefixes){

	 var proj = Projects.findOne({_id: Session.get("activeProject")});
   	 if (proj && proj.graphsInstructions) {
		
		var graphs = JSON.parse(proj.graphsInstructions)
		for(var g in graphs){
			if(graphs[g]["Graph/Service shorthand"].toLowerCase() == graph.toLowerCase()) return graph = "<"+graphs[g]["Expansion (e.g., URI)"]+">";
		}
     }
	
	var graphIsUri = isURI(graph)
	if(graphIsUri == 4){
		var prefix = graph.substring(0, graph.indexOf(":"));
		var name = graph.substring(graph.indexOf(":")+1);
		for(var kp in prefixes){
			if(prefixes[kp]["name"] == prefix) {
				graph = "<"+prefixes[kp]["value"]+name+">";
				break;
			}
		}
	} else if(graphIsUri == 3 && graph.startsWith("<") == false && graph.endsWith(">") == false){
		graph = "<"+graph+">";
	}
	
	return graph
}

async function getResolveInformation(parsed_exp, schemaName, symbol_table, context, exprType, isSimple){
	
	for(var exp in parsed_exp){
		if(exp == "var") {
			parsed_exp[exp]["type"] = await resolveType(parsed_exp[exp]["name"], exprType, context, symbol_table, schemaName, isSimple);
			parsed_exp[exp]["kind"] = await resolveKind(parsed_exp[exp]["name"], exprType, context, symbol_table, schemaName, isSimple);
		}
		
		
		if(typeof parsed_exp[exp] == 'object'){
			await getResolveInformation( parsed_exp[exp], schemaName, symbol_table, context, exprType, isSimple)
		}
		
		if(exp == "PrimaryExpression" && typeof parsed_exp[exp]["PathProperty"] !== "undefined"){
			parsed_exp[exp] = pathOrReference(parsed_exp[exp], symbol_table, context)
		}
	}
	
	return parsed_exp;
}

async function resolveTypeFromSymbolTable(id, context, symbol_table) {
    var context = context._id;

    if(typeof symbol_table[context] === 'undefined') return null;

    	var st_row = symbol_table[context][id];
    	if (st_row) {
    		if(st_row.length == 0) return null;
    		if(st_row.length == 1){
    				return st_row[0].type
    		}
    					if(st_row.length > 1){
    						for (var symbol in st_row) {
    							if(st_row[symbol]["context"] == context) return st_row[symbol].type;
    						}
    					}
    					return st_row.type
    				} else {
    					return null
    				}
    				return null
};

async function resolveTypeFromSymbolTableForContext(id, context, symbol_table) {
    var context = context._id;
	
    if(typeof symbol_table[context] === 'undefined') return null;

    var st_row = symbol_table[context][id];
    if (st_row) {
    	if(st_row.length == 0) return null;
		var type = null;
    	for (var symbol in st_row) {
			if(st_row[symbol]["context"] == context) type = st_row[symbol].type;
    	}

		return type;
    } else {
    	return null
    }
    return null
};
    			// string -> idObject
    			// returns kind of the identifier from symbol table. Null if does not exist.
async function resolveKindFromSymbolTable(id, context, symbol_table) {
    				var context = context._id;

    				if(typeof symbol_table[context] === 'undefined') return null;

    				var st_row = symbol_table[context][id];
					
    				if (st_row) {
    					if(st_row.length == 0) return null;
    					if(st_row.length == 1){
    						return st_row[0].kind
    					}
    					if(st_row.length > 1){
    						for (var symbol in st_row) {
    							if(st_row[symbol]["context"] == context) return st_row[symbol].kind;
    						}
    					}
    					return st_row[0].kind
    				} else {
    					return null
    				}
    				return null
};

async function resolveKindFromSymbolTableForContext(id, context, symbol_table) {
    var context = context._id;
	
    if(typeof symbol_table[context] === 'undefined') return null;

    var st_row = symbol_table[context][id];
    if (st_row) {
    	if(st_row.length == 0) return null;
		var kind = null;
    	for (var symbol in st_row) {
			if(st_row[symbol]["context"] == context) kind = st_row[symbol].kind;
    	}

		return kind;
    } else {
    	return null
    }
    return null
};
    			// string -> idObject
    			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
async function resolveTypeFromSchemaForClass(id, schemaName) {
    				
					if(schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
						id = "wd:"+id;
					}
					
					var cls = await dataShapes.resolveClassByName({name: id})

    				if(cls["complite"] == false) return null;
    				if(cls["data"].length > 0){
    					return cls["data"][0];
    				}  else if(typeof cls["name"] !== "undefined" && id != "[ + ]" && id != "[ ]" && !id.startsWith("?") && schemaName.toLowerCase() == "wikidata" && id.indexOf("[") != -1 && id.endsWith("]")) {
						var name = cls["name"];
						var prefix;
						var display_name = id;
						if(display_name.indexOf(":") !== -1){
							display_name = display_name.substring(display_name.indexOf(":")+1);
						}
						
						if(name.indexOf(":") !== -1){
							prefix = name.substring(0, name.indexOf(":"));
							name = name.substring(name.indexOf(":")+1);
						}
						return {
							display_name: display_name,
							local_name: name,
							prefix:prefix
						}
					}
    				
    				return null;
};
   			// string -> idObject
    			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
async function resolveTypeFromSchemaForIndividual(id, schemaName) {
					if(schemaName.toLowerCase() == "wikidata" && ((id.indexOf("[") > -1 && id.endsWith("]"))) ){
						id = "wd:"+id;
						// var cls = await dataShapes.resolveIndividualByName({name: id})
						var cls = await dataShapes.getIndividualName(id)
						if(cls != null && cls != ""){
							return {local_name: cls.substring(3), prefix: "wd"};
						}
		
					}
    				return null;
};
    			// string -> idObject
    			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
async function resolveTypeFromSchemaForAttributeAndLink(id, schemaName) {
    				if(schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
						id = "wdt:"+id;
					}

    				var aorl = await dataShapes.resolvePropertyByName({name: id})

    				if(aorl["complite"] == false) return null;
    				var res = aorl["data"][0];
    				if(res){
    					if(res["data_cnt"] > 0 && res["object_cnt"] > 0) res["property_type"] = "DATA_OBJECT_PROPERTY";
    					else if(res["data_cnt"] > 0) res["property_type"] = "DATA_PROPERTY";
    					else if(res["object_cnt"] > 0) res["property_type"] = "OBJECT_PROPERTY";
    					return res;
    				 } 
  return null
};
    			// string -> idObject
    			// returns type of the identifier from schema. Looks everywhere. First in the symbol table,
    			// then in schema. Null if does not exist
async function resolveType(id, exprType, context, symbol_table, schemaName, isSimple) {
    			  if(id !== "undefined"){
					  var t = null;
					  if(exprType == "attribute" && isSimple == true){
						   t=await resolveTypeFromSchemaForAttributeAndLink(id, schemaName);
						   if (!t) {
							  t=await resolveTypeFromSymbolTable(id, context, symbol_table);
							  if (!t) {
								 t=await resolveTypeFromSchemaForClass(id, schemaName)
							  }
							  if (!t) {
								 t=await resolveTypeFromSchemaForIndividual(id, schemaName)
							  }
						   }
					  } else {
						
						if (exprType == "CLASS_NAME"){
							t=await resolveTypeFromSymbolTable(id, context, symbol_table);
							if (!t) {
							  t= await resolveTypeFromSchemaForClass(id, schemaName);
							    if (!t) {
								    t=await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)
							    }
							}
						}else{
							t=await resolveTypeFromSymbolTableForContext(id, context, symbol_table);
							if (!t) {
								 t=await resolveTypeFromSchemaForAttributeAndLink(id, schemaName);
								 if (!t) {
									 t=await resolveTypeFromSymbolTable(id, context, symbol_table);
									  if (!t) {
										 t=await resolveTypeFromSchemaForClass(id, schemaName);
										 if (!t) {
										   t=await resolveTypeFromSchemaForIndividual(id, schemaName)
										 }
									  }
								 }
							}
						}
						
						// var t=await resolveTypeFromSymbolTable(id, context, symbol_table);
						// if (!t) {
							// if (exprType != "attribute") {
							  // t= await resolveTypeFromSchemaForClass(id, schemaName);
							  // if (!t) {
								  // t=await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)
							  // }
							// } else {
							  // t=await resolveTypeFromSchemaForAttributeAndLink(id, schemaName);
							  // if (!t) {
								  // t=await resolveTypeFromSchemaForClass(id, schemaName)
							  // }
							  // if (!t) {
								  // t=await resolveTypeFromSchemaForIndividual(id, schemaName)
							  // }
							// }

						  // }
					  }
    			  return t;}
    return null;
};
              //string -> string
        			// resolves kind of id. CLASS_ALIAS, PROPERTY_ALIAS, CLASS_NAME, CLASS_ALIAS, null
async function resolveKind(id, exprType, context, symbol_table, schemaName, isSimple) {
    				if(id !== "undefined"){
						var k = null;
						if(exprType == "attribute" && isSimple == true){
							if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        						k="PROPERTY_NAME";
        					} else {
								 k=await resolveKindFromSymbolTable(id, context, symbol_table);
								 if (!k) {
									  if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        									k="PROPERTY_NAME";
        							  } else if (await resolveTypeFromSchemaForClass(id, schemaName)) {
        									k="CLASS_NAME";
        							 }
								 }
							}
						} else {
						  if (exprType == "CLASS_NAME"){
							  k=await resolveKindFromSymbolTable(id, context, symbol_table);
							  if (!k) {
							         if (await resolveTypeFromSchemaForClass(id, schemaName)) {
        									 k="CLASS_NAME";
        							  } else if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        									 k="PROPERTY_NAME";
        							  }
							  }
						  } else {
							  k=await resolveKindFromSymbolTableForContext(id, context, symbol_table);
							  if (!k) {
								if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        						  k="PROPERTY_NAME";
        					    } else {
									k=await resolveKindFromSymbolTable(id, context, symbol_table);
									if (!k) {
									  if (await resolveTypeFromSchemaForClass(id, schemaName)) {
        									 k="CLASS_NAME";
        							  } else if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        									 k="PROPERTY_NAME";
        							  }
									}
								}
							  }
						  }
							
							
							
						   // k=await resolveKindFromSymbolTable(id, context, symbol_table);
        						// if (!k) {
        						  // if (exprType != "attribute") {
        							  // if (await resolveTypeFromSchemaForClass(id, schemaName)) {
        									 // k="CLASS_NAME";
        							  // } else if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        									 // k="PROPERTY_NAME";
        							  // }
        							// } else {
        							  // if (await resolveTypeFromSchemaForAttributeAndLink(id, schemaName)) {
        									// k="PROPERTY_NAME";
        							  // } else if (await resolveTypeFromSchemaForClass(id, schemaName)) {
        									// k="CLASS_NAME";
        							 // }
        							// }

        					  // }
						}
        				return k;
    				}
    				return null
};

function pathOrReference(o, symbol_table, context) {
    				//var classInstences = ["a", "b", "c"] // seit vajadzigas visas klases
            // It does not make sense calculate this every time function is called, but ...

    				if(typeof o["PathProperty"]["PathAlternative"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0] !== "undefined" &&
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][1].length == 1 &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"] !== "undefined" &&
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathMod"] == null &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] !== "undefined" &&
    					(o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] == "CLASS_ALIAS" ||
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] == "BIND_ALIAS" ||
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] == "UNRESOLVED_FIELD_ALIAS" ||
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] == "PROPERTY_ALIAS")
    				){
    					return {Reference:
    						{name:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["name"],
    						type:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["type"]},
    					var:o["PathProperty"]["PathAlternative"][0]["PathSequence"][1][0][1]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"],
    					Substring : o["Substring"],
    					FunctionBETWEEN : o["FunctionBETWEEN"],
    					FunctionLike : o["FunctionLike"]
    					}

    				}
    				
    				if(typeof o["PathProperty"]["PathAlternative"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0] !== "undefined" &&
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][1].length == 1 &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"] !== "undefined" &&
    					o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathMod"] == null &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"] !== "undefined" &&
    					typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["kind"] === "undefined" 
    				){
    					var simbolTable = symbol_table[context._id][o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["name"]];

    					for (var symbol in simbolTable) {
    						if(simbolTable[symbol]["kind"] == "CLASS_ALIAS" ||
    						simbolTable[symbol]["kind"] == "BIND_ALIAS" ||
    						simbolTable[symbol]["kind"] == "UNRESOLVED_FIELD_ALIAS" ||
    						simbolTable[symbol]["kind"] == "PROPERTY_ALIAS"){
								
								if(typeof o["PathProperty"]["PathAlternative"][0]["PathSequence"][1][0][1]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["PrefixedName"] !== "undefined"){
									return {Reference:
    								{name:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["name"],
    								type:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["type"]},
    								var:o["PathProperty"]["PathAlternative"][0]["PathSequence"][1][0][1]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["PrefixedName"]["var"],
    								Substring : o["Substring"],
    								FunctionBETWEEN : o["FunctionBETWEEN"],
    								FunctionLike : o["FunctionLike"]
    							}
								}
								
    							return {Reference:
    								{name:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["name"],
    								type:o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["type"]},
    								var:o["PathProperty"]["PathAlternative"][0]["PathSequence"][1][0][1]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"],
    								Substring : o["Substring"],
    								FunctionBETWEEN : o["FunctionBETWEEN"],
    								FunctionLike : o["FunctionLike"]
    							}
    						}
    					}
    					
    				}

    				return o;
    			};
				
				
function chechIfSimplePath(expressionTable, isSimple, isPath){
	for(var key in expressionTable){
		
		if(key == "PathProperty"){
			isPath = true;
			
		}

		if(key == "Alternative" ){
			isSimple = false;
		}

		if(typeof expressionTable[key] == 'object'){
			var temp = chechIfSimplePath(expressionTable[key], isSimple, isPath);
			if(temp["isSimple"]==false) isSimple = false;
			if(temp["isPath"]==true) isPath = true;
		}
	}
	return {isSimple:isSimple, isPath:isPath}
}
