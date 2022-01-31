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
    var my_scope_table = {CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};
    var diagramm_scope_table = {CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};

	if(obj_class.identification.local_name != null) obj_class.identification.local_name = obj_class.identification.local_name.trim();
	if(obj_class.identification.local_name == "") obj_class.identification.local_name = null;


    var resCl = await resolveClassByName(obj_class.identification.local_name);
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
		_.extend(obj_class.linkIdentification, resolveLinkByName(obj_class.linkIdentification.local_name));
		if(typeof obj_class.linkIdentification.Prefix !== 'undefined' && obj_class.linkIdentification.Prefix != "") prefix = obj_class.linkIdentification.Prefix + ":";
        _.extend(obj_class.linkIdentification, await parsePathExpression(prefix+obj_class.linkIdentification.local_name, obj_class.identification))
    };
	
	if (obj_class.instanceAlias) {
      var type =  await resolveClassByName(obj_class.identification.local_name)
	   if(type != null && typeof obj_class.linkIdentification !== "undefined" && typeof obj_class.linkIdentification.max_cardinality !== "undefined") {type["max_cardinality"] = obj_class.linkIdentification.max_cardinality}
	  my_scope_table.CLASS_ALIAS.push({id:obj_class.instanceAlias, type:type, context:obj_class.identification._id});
	  //my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:obj_class.instanceAlias, type:null, context:obj_class.identification._id});
    };

    for (const cl of obj_class.conditionLinks) {
    // obj_class.conditionLinks.forEach(function(cl) {
      _.extend(cl.identification,resolveLinkByName(cl.identification.local_name));
      _.extend(cl.identification, await parsePathExpression(cl.identification.local_name, obj_class.identification))
    }
	// );

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
			  diagramm_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
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
             if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
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
    _.each(diagramm_scope_table, function(value, key) {
       _.each(value, function(entry) {
         if (!symbol_table["root"][entry.id]) {
           symbol_table["root"][entry.id] = [];
         };
         symbol_table["root"][entry.id].push({kind:key, type:entry.type, context:entry.context, upByOptional:entry.upByOptional, upBySubQuery:entry.upBySubQuery, distanceFromClass:entry.distanceFromClass});
       })
    })
	

    return;
  };

  var empty_scope_table = {CLASS_ALIAS:[], AGGREGATE_ALIAS:[], UNRESOLVED_FIELD_ALIAS:[], UNRESOLVED_NAME:[]};
  await resolveClass(query.root, empty_scope_table);

  // String, String, ObjectId --> JSON
  // Parses the text and returns object with property "parsed_exp"
  // Used only when parsing class name
  async function parseExpression(str_expr, exprType, context) {
    try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var proj = Projects.findOne({_id: Session.get("activeProject")});
		  var schemaName = null;
		  if (proj) {
			  if (proj.schema) {
				schemaName = proj.schema;
			  };
		  }
		  var parsed_exp = await vq_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, exprType:exprType, context:context});
		  // var parsed_exp = await vq_grammar.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, exprType:exprType, context:context});
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
		  var proj = Projects.findOne({_id: Session.get("activeProject")});
		  var schemaName = null;
		  if (proj) {
			  if (proj.schema) {
				schemaName = proj.schema;
			  };
		  }
  
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
  async function parseExpObject(exp_obj, context) {
   var parse_obj = exp_obj.exp;
   if(typeof parse_obj !== 'undefined'){
	   try {
		  // parse_obj = await vq_variable_grammar.parse(parse_obj, {schema:null, symbol_table:symbol_table, context:context});
		  parse_obj = await vq_variable_grammar_parser.parse(parse_obj, {schema:null, symbol_table:symbol_table, context:context});
		} catch (e) {
		  // TODO: error handling
		 // console.log(e)
		}

		if(parse_obj.startsWith("[") == false && parse_obj.endsWith("]") == false){
			parse_obj = replaceArithmetics(parse_obj.split("+"), "+");
			parse_obj = replaceArithmetics(parse_obj.split("*"), "*");
		 }

		if(parse_obj != "[*sub]"){
			try {
			  var proj = Projects.findOne({_id: Session.get("activeProject")});
			  var schemaName = null;
			  if (proj) {
				  if (proj.schema) {
					schemaName = proj.schema;
				  };
			  }
			  var parsed_exp = await vq_grammar_parser.parse(parse_obj, {schema:null,schemaName:schemaName, symbol_table:symbol_table, context:context});
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
                symbol_table[current_context][name] = _.reject(entry_list, function(n) {return (n.kind == "UNRESOLVED_NAME" || n.kind == "UNRESOLVED_FIELD_ALIAS") } );
                if (_.isEmpty(symbol_table[current_context][name])) {
                  delete symbol_table[current_context][name];
                };
            })
      })
  };

  // JSON -->
  // Parses all expressions in the object and recursively in all children
  async function resolveClassExpressions(obj_class, parent_class) {

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

    for (const c of obj_class.conditions) {await parseExpObject(c,obj_class.identification);};
	// obj_class.conditions.forEach(async function(c) {await parseExpObject(c,obj_class.identification);});
	for (const a of obj_class.aggregations) {await parseExpObject(a,obj_class.identification);};
    // obj_class.aggregations.forEach(async function(a) {await parseExpObject(a,obj_class.identification);});
    // CAUTION!!!!! Hack for * and **
    // obj_class.fields = _.reject(obj_class.fields, function(f) {return (f.exp=="*" || f.exp=="**")});
    obj_class.fields = _.reject(obj_class.fields, function(f) {return (f.exp=="*" || f.exp=="(*attr)" || f.exp=="(*sub)")});


	for (const f of obj_class.fields){
    // await obj_class.fields.forEach(async function(f) {
     
	  if(typeof f.attributeCondition !== "undefined" && f.attributeCondition != null && f.attributeCondition != ""){
		var variableName = f.exp;
		if (f.alias!=null && f.alias!="")variableName = f.alias;
		var conditionExpression = vq_attribute_condition_grammar.parse(f.attributeCondition, {"variable":variableName});
		var condition = {exp:conditionExpression};
		await parseExpObject(condition, obj_class.identification);
		obj_class.conditions.push(condition);
	  }
	  // CAUTION!!!!! Hack for (.)
      if (f.exp=="(.)" || f.exp=="(select this)") {
        if (obj_class.instanceAlias==null) {
          if (f.alias!=null && f.alias!="") obj_class.instanceAlias=f.alias;
        } else{
          var instanceAliasIsURI = isURI(obj_class.instanceAlias);
          if (instanceAliasIsURI) {
            var strURI = (instanceAliasIsURI == 3) ? "<"+obj_class.instanceAlias+">" : obj_class.instanceAlias;
			if(strURI.indexOf("(") !== -1 || strURI.indexOf(")") !== -1){
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
				var condition = {exp:"(this) = " + strURI};
			    await parseExpObject(condition, obj_class.identification);
			    obj_class.conditions.push(condition);
            
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
         await parseExpObject(f, obj_class.identification);
         // Here we can try to analyze something about expressiond vcvc vcokkiiiiiuukuuuuuuukl;;;lljjjhh;yyyytttttttty5690-==-0855433``````
         // if expression is just single name, then resolve its type.
		 // console.log("ffff",f,f.parsed_exp, JSON.stringify(f.parsed_exp,null,2) )

         var p = f.parsed_exp;
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
                } else {
                  updateSymbolTable( obj_class.identification._id+f.exp, obj_class.identification._id, "PROPERTY_NAME", var_obj["type"], var_obj["parentType"]);
                  renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
                }

                break;
             case "PROPERTY_ALIAS":
                updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");

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
                } else {
                  updateSymbolTable( obj_class.identification._id+f.exp, obj_class.identification._id, "PROPERTY_NAME", var_obj["type"], var_obj["parentType"]);
                  renameNameInSymbolTable(obj_class.identification._id+f.exp, f.exp);
                }

                break;
             case "PROPERTY_ALIAS":
                updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS");

                break;
             case "CLASS_ALIAS":
                updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", var_obj["type"]);
                break;
             default:
                 //  - so what is it???? It is ERROR ...

           };
         } else {
           if (f.alias) {
            
			 var type = null;
			 if(countMaxExpressionCardinality(f.parsed_exp)["isMultiple"] == false) type = {max_cardinality : 1};
			  updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", type);
           } else {
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
	
	

    if (obj_class.orderings) { 
		for (const c of obj_class.orderings){await parseExpObject(c,obj_class.identification);}
		// obj_class.orderings.forEach(async function(c) {await parseExpObject(c,obj_class.identification);}) 
	};
    if (obj_class.groupings) { 
		for (const c of obj_class.groupings){await parseExpObject}
		// obj_class.groupings.forEach(await parseExpObject) 
	};
    // if (obj_class.havingConditions) { obj_class.havingConditions.forEach(async function(c) {await parseExpObject(c,obj_class.identification);}) };

	for (const ch of obj_class.children){ await resolveClassExpressions(ch,obj_class); }
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
					graph: link.link.getGraph(),
					graphInstruction: link.link.getGraphInstruction(),
                    identification: { _id: elem._id(), local_name: elem.getName()},
                    instanceAlias: replaceSymbols(elem.getInstanceAlias()),
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
                    children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l})
                  });
                if (elem.isGlobalSubQueryRoot()) {
                  _.extend(linkedElem_obj,{  orderings: elem.getOrderings(),
                                             groupings: elem.getGroupings(),
                                             distinct:elem.isDistinct(),
                                             limit:elem.getLimit(),
                                             offset:elem.getOffset() });
                } else {
					var orderingss = elem.getOrderings()
					if(orderingss.length > 0){
						for(var order in orderingss){
							warnings.push("Order by clause '" + orderingss[order]["fulltext"] + "' ignored since it is not placed in the main query node")
						}					
					}
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
		  if (proj.simpleConditionImplementation=="true") {
            proj_params.simpleConditionImplementation = proj.simpleConditionImplementation;
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
          return proj_params;
     }
   };
   
    var query_in_abstract_syntax = { root: {
      identification: { _id: e._id(), local_name: e.getName()},
      instanceAlias:replaceSymbols(e.getInstanceAlias()),
      isVariable:e.isVariable(),
      isBlankNode:e.isBlankNode(),
      isUnion:e.isUnion(),
      isUnit:e.isUnit(),
      variableName:e.getVariableName(),
      conditionLinks:_.filter(_.map(e.getLinks(), genConditionalLink), function(l) {return l}),
      fields: e.getFields(),
      aggregations: e.getAggregateFields(),
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
	return instanceAlias
}

function getGraphFullForm(graph, prefixes){

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