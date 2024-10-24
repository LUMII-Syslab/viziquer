import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects, Elements, ElementTypes } from '/imports/db/platform/collections'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'
import { checkIfIsSimpleVariable, findINExpressionTable } from './parserCommon';
import { countMaxExpressionCardinality } from './parser.js';
import { VQ_Element } from './VQ_Element';

import * as vq_grammar_parser from '/imports/client/custom/vq/js/vq_grammar_parser'
import * as vq_variable_grammar_parser from '/imports/client/custom/vq/js/vq_variable_grammar_parser'
import * as vq_property_path_grammar_parser from '/imports/client/custom/vq/js/vq_property_path_grammar_parser'
import * as vq_attribute_condition_grammar_parser from '/imports/client/custom/vq/js/vq_attribute_condition_grammar_parser'

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

function getDeclarations(){
	const diagramId = Session.get("activeDiagram");
	const elem_type = ElementTypes.findOne({name: "Declaration"});
	let declarationPrefixes = [];
	let declarationSchemas = [];
	if(typeof elem_type !== "undefined"){
		var elems_in_diagram_ids = Elements.find({diagramId:diagramId, elementTypeId: elem_type["_id"]}).map(function(e) {
		  return e["_id"]
		});
		
		for(let d = 0; d < elems_in_diagram_ids.length; d++){
			let declaration = new VQ_Element(elems_in_diagram_ids[d]);
			let prefixes = declaration.getPrefixDeclarations();
			let schemas = declaration.getSchemaDeclarations();
			for(let p = 0; p < prefixes.length; p++){
				if(typeof declarationPrefixes[prefixes[p]["prefix"]] === "undefined") {
					declarationPrefixes[prefixes[p]["prefix"]] = prefixes[p]["namespace"];
				} else {
					// console.log("ERROR declarationPrefixes")
				}
			}
			for(let s = 0; s < schemas.length; s++){
				if(typeof declarationSchemas[schemas[s]["schema"]] === "undefined") {
					declarationSchemas[schemas[s]["schema"]] = schemas[s]["endpointURI"];
				} else {
					// console.log("ERROR declarationSchemas")
				}
			}
		}
	}
	return {prefixes:declarationPrefixes, schemas:declarationSchemas}
}

//[JSON] --> {root:[JSON], symbolTable:[some_name:{scope:?, type:?, elType:?} }]}
// For the query in abstract syntax
// this function resolves the types (adds to identification property what is missing)
// and creats symbol table with resolved types
async function resolveTypesAndBuildSymbolTable(query) {
	count = 0;
  // TODO: This is not efficient to recreate schema each time
  // Adding default namespace
  if (query && query.root) {
	// query.root.defaultNamespace = schema.URI;
	query.prefixes = await dataShapes.getNamespaces();
	if(typeof query.prefixes.error !== "undefined" && query.prefixes.complete === false) query.prefixes = [];
	query.classifiers = await dataShapes.getClassifiers();
	let declarations = getDeclarations();
	query.prefixDeclarations = declarations.prefixes;
	query.schemaDeclarations = declarations.schemas;
  }

  // string -->[IdObject]
  async function resolveClassByName(className, schemaName) {
	// if(typeof schemaName !== "undefined" && schemaName !== null && schemaName !== "")dataShapes.schema.schema = schemaName;
	if(typeof className !== "undefined" && className !== null){
		let params = {name: className};
		if(typeof schemaName !== "undefined" && schemaName !== null && schemaName !== "" && dataShapes.schema.schema !== schemaName)params.schema = schemaName;
		let cls = await dataShapes.resolveClassByName(params);
		if(cls["data"].length > 0){
			return cls["data"][0];
		} else if(typeof cls["name"] !== "undefined" && className.indexOf("[ + ]") == -1 && className.indexOf("[ ]") == -1 && className.indexOf("?") == -1) {
			let name = cls["name"];
			let prefix;
			let display_name = className;
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
  };

  // string -->[IdObject]
  // async function resolveLinkByName(linkName) {
	// return await dataShapes.resolvePropertyByName({name: linkName})
  // };

  // string, string -->[IdObject]
  // async function resolveAttributeByName(className, attributeName) {
    // return await dataShapes.resolvePropertyByName({name: attributeName})
  // };

  var symbol_table = {};

   //JSON -->
  // function recursively modifies query by adding identification info
  async function resolveClass(obj_class, parents_scope_table) {
	var schemaName = await dataShapes.schema.schema;
	if(typeof obj_class.identification.schemaName !== "undefined" && obj_class.identification.schemaName !== "") {
		schemaName = obj_class.identification.schemaName;
		// dataShapes.schema.schema = schemaName;
	}
	if(typeof schemaName === "undefined") schemaName = "";
	// for wikidata
	
	if(obj_class.instanceAlias != null && obj_class.instanceAlias.indexOf("[") !== -1 && (obj_class.instanceIsConstant == true || obj_class.instanceIsVariable == true)){
		if(schemaName.toLowerCase() == "wikidata" && obj_class.instanceAlias.indexOf(":") == -1 &&((obj_class.instanceAlias.indexOf("[") > -1 && obj_class.instanceAlias.endsWith("]")))){
			obj_class.instanceAlias = "wd:"+obj_class.instanceAlias;
		}	

		if(obj_class.instanceIsConstant == true && (isURI(obj_class.instanceAlias) == 3 || isURI(obj_class.instanceAlias) == 4)) {
			obj_class.instanceAlias = await dataShapes.getIndividualName(obj_class.instanceAlias,true);	
			// console.log("getIndividualName", obj_class.instanceAlias, schemaName, dataShapes.schema.schema);
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
	//obj_class.identification.classes = [];
	var localName = obj_class.identification.local_name;
	
	if(typeof localName !== "undefined" && localName != null) localName = pr+localName;
		
    var resCl = await resolveClassByName(localName, schemaName);

	// obj_class.identification.classes.push(resCl)
    _.extend(obj_class.identification, resCl);
	//parser need class with prefix
	let prefix = "";

	if(typeof obj_class.identification.prefix !== 'undefined' && obj_class.identification.prefix != "") prefix = obj_class.identification.prefix + ":";
	
	var display_name = prefix+obj_class.identification.display_name;
	if(typeof obj_class.identification.display_name === "undefined") display_name = obj_class.identification.local_name;
	// var par = await parseExpression(display_name, "CLASS_NAME", obj_class.identification)
    // _.extend(obj_class.identification, par);

    if (obj_class.linkIdentification) {
		//parser need link with prefix
		let prefix = "";
		// _.extend(obj_class.linkIdentification, resolveLinkByName(obj_class.linkIdentification.local_name));
		if(typeof obj_class.linkIdentification.prefix !== 'undefined' && obj_class.linkIdentification.prefix != "") prefix = obj_class.linkIdentification.prefix + ":";
		if(obj_class.linkIdentification.local_name.startsWith(":")) obj_class.linkIdentification.local_name = obj_class.linkIdentification.local_name.substring(1);
		var pathExpression = await parsePathExpression(prefix+obj_class.linkIdentification.local_name, obj_class.identification);
        _.extend(obj_class.linkIdentification, pathExpression);
			
		//link is variable name
		
		if(typeof pathExpression.parsed_exp !== "undefined" && pathExpression.parsed_exp !== null
		&& typeof pathExpression.parsed_exp.PathProperty !== "undefined" && typeof pathExpression.parsed_exp.PathProperty.VariableName !== "undefined"){
			 let expr = pathExpression.parsed_exp.PathProperty.VariableName.substring(1);
			 if(expr.startsWith("?")) expr = expr.substring(1);
			 my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:expr, type:null, context:obj_class.identification._id});
		}
    };
	//class have instance alias
	if (obj_class.instanceAlias) {
		// var className = obj_class.identification.display_name;
		// if(typeof className === "undefined" || className == null || className == "") className = obj_class.identification.local_name;
		// if(typeof className !== "undefined" && className != null) className = pr+className;
		let type =  resCl;
	   if(type != null && typeof obj_class.linkIdentification !== "undefined" && typeof obj_class.linkIdentification.max_cardinality !== "undefined") {type["max_cardinality"] = obj_class.linkIdentification.max_cardinality}
	     
	   my_scope_table.CLASS_ALIAS.push({id:obj_class.instanceAlias, type:type, context:obj_class.identification._id});
	
	  //my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:obj_class.instanceAlias, type:null, context:obj_class.identification._id});
    };
	
	//class name is variable
	if(obj_class.variableName != null){
		// var className = obj_class.identification.display_name;
		// if(typeof className === "undefined" || className == null || className == "") className = obj_class.identification.local_name;
		// if(typeof className !== "undefined" && className != null) className = pr+className;
		let type =  resCl;
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
	  if(cl.identification.local_name.startsWith(":")) cl.identification.local_name = cl.identification.local_name.substring(1);
      _.extend(cl.identification, await parsePathExpression(cl.identification.local_name, obj_class.identification))
    }
	// );
	
	
	for(let f = 0; f < obj_class.fields.length; f++){
		 obj_class.fields[f]["order"] = f;
	}

     for (const f of obj_class.fields) {

        if (f.alias) {
             my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
			 if(f.addLabel == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"Label", type:null, context:obj_class.identification._id});
			 if(f.addAltLabel == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"AltLabel", type:null, context:obj_class.identification._id});
			 if(f.addDescription == true) my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:f.alias+"Description", type:null, context:obj_class.identification._id});
			 if(f.exp.startsWith("?")){
				//atribute is variable name with alias
				let expr = f.exp.substring(1);
				if(expr.startsWith("?")) expr = expr.substring(1);
			    my_scope_table.UNRESOLVED_FIELD_ALIAS.push({id:expr, type:null, context:obj_class.identification._id});
			}
        } else if(f.exp.startsWith("?")){
			//atribute is variable name
			let expr = f.exp.substring(1);
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
          my_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
		  if ((obj_class.linkType == "REQUIRED" || obj_class.linkType == "OPTIONAL") && (obj_class.isSubQuery || obj_class.isGlobalSubQuery)) {
             // TODO: longer path!
             // TODO: resolve type
             // parents_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id, upBySubQuery:1, distanceFromClass:1});
          } else if(typeof obj_class.linkIdentification === "undefined") {
			  diagram_scope_table.AGGREGATE_ALIAS.push({id:f.alias, type:null, context:obj_class.identification._id});
		  };
        };
    }
	// );

	for (const ch of obj_class.children) {
    // obj_class.children.forEach(async function(ch) {
	 //console.log("obj_class", obj_class.identification, obj_class.identification.local_name, obj_class.identification.schemaName)
	  if(typeof ch.graphsService !== "undefined" && ch.graphsService.graphInstruction === "SERVICE" && ch.graphsService.schema !== "") ch.identification.schemaName = ch.graphsService.schema;
	  else if(typeof ch.graphsServiceLink !== "undefined" && ch.graphsServiceLink.graphInstruction === "SERVICE" && ch.graphsServiceLink.schema !== "") ch.identification.schemaName = ch.graphsServiceLink.schema;
	  else ch.identification.schemaName = obj_class.identification.schemaName;
	  
	  if(typeof ch.graphsServiceLink !== "undefined" && ch.graphsServiceLink.graphInstruction === "SERVICE" && ch.graphsServiceLink.schema !== "") ch.linkIdentification.schemaName = ch.graphsServiceLink.schema;
	  else ch.linkIdentification.schemaName = obj_class.identification.schemaName;
	  
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
				let clone_ca = _.clone(ca);
				if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
				  if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
			    };
				if (clone_ca["upBySubQuery"] && clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
                parents_scope_table.AGGREGATE_ALIAS.push(clone_ca)
            }
			// );
       };
	   // plain optional
       if (obj_class.linkType == "OPTIONAL" && !obj_class.isSubQuery && !obj_class.isGlobalSubQuery) {
  
		 for (const ca of my_scope_table.CLASS_ALIAS) {
		 // my_scope_table.CLASS_ALIAS.forEach(function(ca) {
             let clone_ca = _.clone(ca);
             clone_ca["upByOptional"] = true;
             parents_scope_table.CLASS_ALIAS.push(clone_ca)
         }
		 // );
		 for (const ca of my_scope_table.AGGREGATE_ALIAS) {
         // my_scope_table.AGGREGATE_ALIAS.forEach(function(ca) {
             let clone_ca = _.clone(ca);
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
	   
	   if (obj_class.linkType == "REQUIRED" && (obj_class.isSubQuery || obj_class.isGlobalSubQuery)) {
			for (const ca of my_scope_table.AGGREGATE_ALIAS) {
				let clone_ca = _.clone(ca);
				if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
				if (clone_ca["upBySubQuery"] && clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
                parents_scope_table.AGGREGATE_ALIAS.push(clone_ca)
            }
       };
	   
       if (obj_class.linkType == "OPTIONAL"  && (obj_class.isSubQuery || obj_class.isGlobalSubQuery)) {
		   for (const ca of my_scope_table.AGGREGATE_ALIAS) {
             let clone_ca = _.clone(ca);
             clone_ca["upByOptional"] = true;
             if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
				if (clone_ca["upBySubQuery"] && clone_ca["distanceFromClass"]) {clone_ca["distanceFromClass"] = clone_ca["distanceFromClass"] + 1}
                parents_scope_table.AGGREGATE_ALIAS.push(clone_ca)
		  }
       };

	   // subquery/global subquery required/optional
       if (obj_class.linkType !== "NOT") {

         for (const ca of  my_scope_table.CLASS_ALIAS) {
		 // my_scope_table.CLASS_ALIAS.forEach(function(ca) {
             let clone_ca = _.clone(ca);
             if(obj_class.linkType == "OPTIONAL") clone_ca["upByOptional"] = true;
			 if (obj_class.isSubQuery || obj_class.isGlobalSubQuery) {
             if (!clone_ca["upBySubQuery"]) {clone_ca["upBySubQuery"] = 1} else {clone_ca["upBySubQuery"] = clone_ca["upBySubQuery"] + 1}
			   clone_ca["distanceFromClass"] = 1
             }
             parents_scope_table.CLASS_ALIAS.push(clone_ca)
         }
		 // );
		 for (const ca of   my_scope_table.UNRESOLVED_FIELD_ALIAS) {
		 // my_scope_table.UNRESOLVED_FIELD_ALIAS.forEach(function(ca) {
           let clone_ca = _.clone(ca);
           if (obj_class.linkType == "OPTIONAL") {clone_ca["upByOptional"] = true;};
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
           let clone_ca = _.clone(ca);
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
  let class_schema_name = "";
  if(query.root.graphsService.graphInstruction === "SERVICE" && query.root.graphsService.schema !== "")class_schema_name = query.root.graphsService.schema;
  query.root.identification.schemaName = class_schema_name;
  await resolveClass(query.root, empty_scope_table);

  // String, String, ObjectId --> JSON
  // Parses the text and returns object with property "parsed_exp"
  // Used only when parsing class name
  /*async function parseExpression(str_expr, exprType, context) {
	try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var schemaName = await dataShapes.schema.schemaType;
		  if(typeof schemaName === "undefined") schemaName = "";

		  var parsed_exp = await vq_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, exprType:exprType, context:context});
		  parsed_exp = await getResolveInformation(parsed_exp, schemaName, symbol_table, context, exprType);
		  
		  return { parsed_exp: parsed_exp};
	  } else return { parsed_exp: []};
    } catch (e) {
      // TODO: error handling
      Interpreter.showErrorMsg("Syntax error in attribute expression " + str_expr, -3);  
    } finally {
      // nothing
    }
  }*/


  // String --> JSON
  // Parses the text and returns object with property "parsed_exp"
  async function parsePathExpression(str_expr, context) {
	try {
	  if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  // var proj = Projects.findOne({_id: Session.get("activeProject")});
		  var schemaName = await dataShapes.schema.schema;
		  if(typeof context.schemaName !== "undefined" && context.schemaName !== "") schemaName = context.schemaName;
		  if(typeof schemaName === "undefined") schemaName = "";
  
		  // var parsed_exp = vq_property_path_grammar_2.parse(str_expr, {schema:schema, schemaName:schemaName, symbol_table:symbol_table, context:context._id});
		//  console.log("parsePathExpression",str_expr, schemaName)
		  var parsed_exp = await vq_property_path_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:symbol_table, context:context._id});
		  return { parsed_exp: parsed_exp};
	  }else return { parsed_exp: []};
    } catch (e) {
      Interpreter.showErrorMsg("Syntax error in path expression " + str_expr, -3);  
    } finally {
      // nothing
    }
  }

  // JSON -->
  // Parses object's property "exp" and puts the result in the "parsed_exp" property
  async function parseExpObject(exp_obj, context, exprType) {
   // console.log("parseExpObject",  exp_obj, context, exprType)
   if(exp_obj.exp.startsWith(":")) exp_obj.exp = exp_obj.exp.substring(1);
   var parse_obj = exp_obj.exp;
   if(typeof parse_obj !== 'undefined'){
	   let schemaName = await dataShapes.schema.schema;
	   if(typeof context.schemaName !== "undefined" && context.schemaName !== "") schemaName = context.schemaName;
	   if(typeof schemaName === "undefined") schemaName = "";
	   if(parse_obj.indexOf("-") !== -1 && parse_obj.indexOf("[") === -1 && parse_obj.indexOf("]") === -1){
	   try {
		  // parse_obj = await vq_variable_grammar.parse(parse_obj, {schema:null, symbol_table:symbol_table, context:context});
		  
		  parse_obj = await vq_variable_grammar_parser.parse(parse_obj, {schema:schemaName, symbol_table:symbol_table, context:context});
		} catch (e) {
		  Interpreter.showErrorMsg("Syntax error in attribute expression " + exp_obj.exp, -3);  
		}
	   }
		if(parse_obj.startsWith("[[") == false && parse_obj.endsWith("]]") == false){
			parse_obj = replaceArithmetics(parse_obj.split("+"), "+");
			if(parse_obj.indexOf('"') == -1 && parse_obj.indexOf("'") == -1)parse_obj = replaceArithmetics(parse_obj.split("*"), "*");
		 }

		if(parse_obj != "[*sub]"){
			try {
			  // var proj = Projects.findOne({_id: Session.get("activeProject")});
			    var tt=await resolveTypeFromSchemaForAttributeAndLink(exp_obj.exp, schemaName);
				var isSimple = false;
				if(tt != null) isSimple = true;
			  var parsed_exp = await vq_grammar_parser.parse(parse_obj, {schema:null,schemaName:schemaName, symbol_table:symbol_table, context:context});
			  parsed_exp = await getResolveInformation(parsed_exp, schemaName, symbol_table, context, exprType, isSimple);
			  
			  // var parsed_exp = vq_grammar.parse(parse_obj, {schema:null, schemaName:schemaName, symbol_table:symbol_table, context:context});
			  exp_obj.parsed_exp = parsed_exp;
			} catch (e) {
			  // TODO: error handling
			  // console.log(e)
			  Interpreter.showErrorMsg("Syntax error in attribute expression " + exp_obj.exp, -3);  
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
            let name_in_context = _.find(name_list[name], function(n) {return n.context == context} );
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
	// console.log('---resolveClassExpressions--')
	// console.log(obj_class)
	  if(obj_class.graphs){
		  let prefixes = query.prefixes;
		  for (let g = 0; g < obj_class.graphs.length; g++) {
			obj_class.graphs[g]["graph"] = getGraphFullForm(obj_class.graphs[g]["graph"], prefixes);
		  }
	  }

	 if(obj_class.isBlankNode == true) {
		 obj_class.instanceAlias = "_:name"+count;
		 count++;
	 }

  if (parent_class) {
	  
	  if(obj_class.graph){
		  let prefixes = query.prefixes;		
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
                let entry_clone = _.clone(entry);
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
		  let prefixes = query.prefixes;		
		  f.graph = getGraphFullForm(f.graph, prefixes);
	  }
      
	  if(typeof f.attributeConditionSelection !== "undefined" && f.attributeConditionSelection != null && f.attributeConditionSelection != ""){
		var variableName = f.exp;
		if (f.alias!=null && f.alias!="")variableName = f.alias;
		let conditionExpression = await vq_attribute_condition_grammar_parser.parse(f.attributeConditionSelection, {"variable":variableName});
		let condition = {exp:conditionExpression};
		await parseExpObject(condition, obj_class.identification);
		
		f.attributeConditionSelection = condition;
		
		// obj_class.conditions.push(condition);
	  }
	  // CAUTION!!!!! Hack for (.)
      if (f.exp=="(.)" || f.exp=="(select this)") {
		if (obj_class.instanceAlias==null || obj_class.instanceAlias=="") {
          if (f.alias!=null && f.alias!="") {
			  obj_class.instanceAlias=f.alias;
			  obj_class.instanceIsConstant = false;
			  obj_class.instanceIsVariable = true;
		  }
        } else{
			
          var instanceAliasIsURI = isURI(obj_class.instanceAlias);
		  if (instanceAliasIsURI || obj_class.instanceIsConstant == true) {
            var strURI = (instanceAliasIsURI == 3 && obj_class.instanceAlias.indexOf("<") == -1) ? "<"+obj_class.instanceAlias+">" : obj_class.instanceAlias;
			 var schemaName = await dataShapes.schema.schema;
			 if(typeof obj_class.identification.schemaName !== "undefined" && obj_class.identification.schemaName !== "") schemaName = obj_class.identification.schemaName;
			 if(typeof schemaName === "undefined") schemaName = "";

			if(schemaName.toLowerCase() == "wikidata" && ((strURI.indexOf("[") > -1 && strURI.endsWith("]"))) ){
						if(strURI.indexOf(":") == -1)strURI = "wd:"+strURI;
						// var cls = await dataShapes.resolveIndividualByName({name: id})
					//	console.log("getIndividualName", strURI, schemaName)
					dataShapes.schema.schema = schemaName;
						var cls = await dataShapes.getIndividualName(strURI,true)
						if(cls != null && cls != ""){
							strURI = cls;
						}

			}
			else if(strURI.indexOf("(") !== -1 || strURI.indexOf(")") !== -1 || strURI.indexOf(",") !== -1){
				let prefix = strURI.substring(0, strURI.indexOf(":"));
				let name = strURI.substring(strURI.indexOf(":")+1);
				let prefixes = query.prefixes;
				for(let kp = 0; kp < prefixes.length; kp++){
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
				let condition = {exp:"(this) = " + strURI};
			    await parseExpObject(condition, obj_class.identification, "CLASS_NAME");
			    obj_class.conditions.push(condition);
				if(obj_class.isVariable == true) obj_class.instanceAlias = null;
			} else {
				
				if(obj_class.identification.local_name == null && (instanceAliasIsURI == 3 || instanceAliasIsURI == 4)){
					if(obj_class.children.length == 0 && obj_class.fields.length == 1 && obj_class.fields[0]["exp"] == "(select this)"){
						obj_class.distinct = true;
						var field = {
							"fulltext": "val<-??prop",
							"exp": "??prop",
							"alias": "val",
							"Prefixes": "{h+} ",
							"attributeConditionSelection": "",
							"requireValues": true,
							"addLabel": false,
							"addAltLabel": false,
							"addDescription": false,
							"groupValues": false,
							"isInternal": true,
							"order": 2,
							"_id": "fychWpy7uuiqiNHGQ"
						}
						await parseExpObject(field, obj_class.identification, "attribute");
						obj_class.fields.push(field);
					}
					let condition = {exp:"(this) = " + strURI};
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"].PropertyReference !== "true"
         ) {
           let var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"];
             
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
			 case "DIRECT_PROPERTY":
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"].PropertyReference !== "true"
         ) {
           let var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"];

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
			case "DIRECT_PROPERTY":
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
            
			 let type = null;
			 if(countMaxExpressionCardinality(f.parsed_exp)["isMultiple"] == false) type = {max_cardinality : 1};
			  updateSymbolTable(f.alias, obj_class.identification._id, "BIND_ALIAS", type);
			  
			  if(f.exp.startsWith("?")){
				  let expr = f.exp.substring(1);
				  if(expr.startsWith("?")) expr = expr.substring(1);
				  updateSymbolTable(expr, obj_class.identification._id, "PROPERTY_ALIAS", null);
			 }
           } else {
			   
			 if(f.exp.startsWith("?")){
				  let expr = f.exp.substring(1);
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"].PropertyReference !== "true"
         ) {
            let var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression["var"];
			if (var_obj["kind"].indexOf("_ALIAS") !== -1 && obj_class.instanceAlias != f.exp) {
              let expression = f.exp;
			        if (f.alias) expression = f.alias;
			        let condition = {exp:"EXISTS(" + expression + ")"};
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
             && p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"].PropertyReference !== "true"
         ) {
            let var_obj = p[1].ConditionalOrExpression[0].ConditionalAndExpression[0].RelationalExpression.NumericExpressionL.AdditiveExpression.MultiplicativeExpression.UnaryExpression.PrimaryExpression.iri.PrefixedName["var"];
			if (var_obj["kind"] !== null && var_obj["kind"].indexOf("_ALIAS") !== -1 && obj_class.instanceAlias != f.exp) {
              let expression = f.exp;
			        if (f.alias) expression = f.alias;
			        let condition = {exp:"EXISTS(" + expression + ")"};
			        await parseExpObject(condition, obj_class.identification);
			        obj_class.conditions.push(condition);
            }
         } 
		}
		
    }
	
	// );
	
	if(obj_class.linkIdentification && obj_class.linkIdentification.local_name && obj_class.linkIdentification.local_name.startsWith("?")){
		let expr = obj_class.linkIdentification.local_name.substring(1);
		if(expr.startsWith("?")) expr = expr.substring(1);
		updateSymbolTable(expr, obj_class.identification._id, "PROPERTY_ALIAS", null);
	}
	
	 for (const c of obj_class.conditions) {
		await parseExpObject(c,obj_class.identification);
		if(obj_class.isBlankNode == true ){
			if(c.exp.indexOf("=") === -1 && c.exp.indexOf("->") === -1){
				obj_class.isBlankNode = false;
				obj_class.instanceAlias = "expr_"+count;
				obj_class.instanceIsVariable = true;
				count++;
			}else{
				var rel = findINExpressionTable(c["parsed_exp"], "RelationalExpression");
				var left = findINExpressionTable(rel["NumericExpressionL"], "PrimaryExpression");
				var right = findINExpressionTable(rel["NumericExpressionR"], "PrimaryExpression");
				var temp = checkIfIsSimpleVariable(c["parsed_exp"], true, null, true, false, false, false);
				let isSimpleFilter = temp["isSimpleFilter"];
				
				//filter as triple
				if(typeof rel['Relation'] !== 'undefined' 
						&& (rel['Relation'] == "=" || rel['Relation'] == "->") && isSimpleFilter == true &&
							(
							   (((typeof left["var"] !== 'undefined' && typeof left["var"]["kind"] !== 'undefined' && left["var"]["kind"] == "PROPERTY_NAME" && left["var"]["ref"] == null) 
								|| typeof left["Path"] !== 'undefined' 
								|| typeof left["Reference"] !== 'undefined'
								|| (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] !== 'undefined')
								) && typeof right["var"] === 'undefined' 
								&& typeof right["Path"] === 'undefined' 
								&& typeof right["Reference"] === 'undefined'
								&& typeof right["iri"] === 'undefined'
								)
								||(((typeof right["var"] !== 'undefined' && typeof right["var"]["kind"] !== 'undefined' && right["var"]["kind"] == "PROPERTY_NAME") 
								|| typeof right["Path"] !== 'undefined' 
								|| typeof right["Reference"] !== 'undefined'
								)
								&& typeof left["var"] === 'undefined' 
								&& typeof left["Path"] === 'undefined' 
								&& typeof left["Reference"] === 'undefined'
								&& (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] === 'undefined')
								)
							))
				{
					rel['Relation'] = "=";
				} else {
					obj_class.isBlankNode = false;
					obj_class.instanceAlias = "expr_"+count;
					obj_class.instanceIsVariable = true;
					count++;
				}
			}
		}
	 };

	for (const a of obj_class.aggregations) {await parseExpObject(a,obj_class.identification);};

    if (obj_class.orderings) { 
		for (const c of obj_class.orderings){await parseExpObject(c,obj_class.identification);}
	};
    if (obj_class.groupings) { 
		for (const c of obj_class.groupings){
			await parseExpObject(c,obj_class.identification);
		}
	};
	if (obj_class.having) { 
		obj_class.having = {exp:obj_class.having};
		await parseExpObject(obj_class.having, obj_class.identification);
	};
	
    return;
  };

  await resolveClassExpressions(query.root);
  
  cleanSymbolTable();

  return {root:query.root, symbolTable:symbol_table, params:query.params, prefixes:query.prefixes, classifiers:query.classifiers, prefixDeclarations:query.prefixDeclarations, schemaDeclarations: query.schemaDeclarations}
};

// [string]--> JSON
// Returns query AST-s for the ajoo elements specified by an array of id-s
// element_id_list is the list of potential root elements
const genAbstractQueryForElementList = async function (element_id_list, virtual_root_id_list) {
	var classAccessTable = [];
	
  // conver id-s to VQ_Elements (filter out incorrect id-s)
  var element_list = _.filter(_.map(element_id_list, function(id) {return new VQ_Element(id)}), function(v) {if (v.obj) {return true} else {return false}});
  // determine which elements are root elements
  _.each(element_list, function(e) {
	  if(e.obj.type == "Box"){
		  classAccessTable[e.obj._id] = [];
	  }
    e.setVirtualRoot(_.any(virtual_root_id_list, function(id) { return id == e._id() }));
  });
  
  for(let clazz in classAccessTable){
	  if(typeof classAccessTable[clazz] !== "function"){
		for(let clazzc in classAccessTable){
			if(typeof classAccessTable[clazzc] !== "function" && clazzc != clazz) classAccessTable[clazz][clazzc] = null;
		}
	  }
  }

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
		  var parentElem = null;
          var linkedElem_obj = {};
          if (link.start) {
            elem = link.link.getStartElement();
            parentElem = link.link.getEndElement();
            linkedElem_obj["isInverse"] = !link.link.isInverse();
          } else {
            elem = link.link.getEndElement();
            parentElem = link.link.getStartElement();
            linkedElem_obj["isInverse"] = link.link.isInverse();
          };
		  
		  
		  
          // generate if the element on the other end is not visited AND the link is not conditional
          // AND it is within element_list AND the link is within element_list
          if (!visited[elem._id()] && !link.link.isConditional()
              && _.any(element_list, function(el) {return el.isEqualTo(elem)})
              && _.any(element_list, function(li) {return li.isEqualTo(link.link)})) {
				  var isUnionUP = false;
				  if(parentElem.getName() == "[ + ]"){
					  isUnionUP = true;
				  } 
				  var isUnionDOWN = false;
				  if(elem.getName() == "[ + ]"){
					  isUnionDOWN = true;
				  }
				  
				  classAccessTable[elem._id()][parentElem._id()] = [];
				  classAccessTable[elem._id()][parentElem._id()].push({
					  linkType:link.link.getType(), 
					  isSubQuery: link.link.isSubQuery(),
					  isGlobalSubQuery: link.link.isGlobalSubQuery(),
                      isGraphToContents: link.link.isGraphToContents(),
					  direction:"up",
					  name:parentElem.getName(),
					  alias:parentElem.getInstanceAlias(),
					  isUnion:isUnionUP,
				  })
				  
				  classAccessTable[parentElem._id()][elem._id()] = [];
				  classAccessTable[parentElem._id()][elem._id()].push({
					  linkType:link.link.getType(), 
					  isSubQuery: link.link.isSubQuery(),
					  isGlobalSubQuery: link.link.isGlobalSubQuery(),
                      isGraphToContents: link.link.isGraphToContents(),
					  direction:"down",
					  name:elem.getName(),
					  alias:elem.getInstanceAlias(),
					  isUnion:isUnionDOWN,
				  })  
				  
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
					graphsService: getSchemaNameFromGraphService(elem.getGraphsServices()),
					graphsServiceLink: getSchemaNameFromGraphService(link.link.getGraphsServices()),
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
					isDelayedLink: link.link.isDelayedLink(),
                    conditions: elem.getConditions(),
                    fullSPARQL: elem.getFullSPARQL(),
					comment: elem.getComment(),
                    children: _.filter(_.map(elem.getLinks(), genLinkedElement), function(l) {return l})
                  });
                if (elem.isGlobalSubQueryRoot()) {
                  _.extend(linkedElem_obj,{  orderings: elem.getOrderings(),
                                             groupings: elem.getGroupings(),
                                             having: elem.getHaving(),
                                             distinct:elem.isDistinct(),
                                             limit:elem.getLimit(),
                                             offset:elem.getOffset() });
					if(link.link.getName() == "++" || link.link.getName() == "=="){
						 _.extend(linkedElem_obj,{ graphs: elem.getGraphs() });
					}
                } else {
					var orderingss = elem.getOrderings()
					if(orderingss.length > 0){
						for(let order = 0; order < orderingss.length; order++){
							warnings.push("Order by clause '" + orderingss[order]["fulltext"] + "' ignored since it is not placed in the main query node")
						}					
					}
				};
					
                if (elem.isSubQueryRoot()) {
                  _.extend(linkedElem_obj,{ distinct:elem.isDistinct(), groupings: elem.getGroupings(), having: elem.getHaving(),});
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
          if (proj.useDefaultGroupingSeparator==true) {
            proj_params.defaultGroupingSeparator = proj.defaultGroupingSeparator;
          };
		  if (proj.simpleConditionImplementation==true) {
            proj_params.simpleConditionImplementation = proj.simpleConditionImplementation;
          };
		  if (proj.keepVariableNames==true) {
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
		  if (proj.allowTopDownNamesInBINDs) {
            proj_params.allowTopDownNamesInBINDs = proj.allowTopDownNamesInBINDs;
          };
		  // if (proj.showGraphServiceCompartments) {
            // proj_params.showGraphServiceCompartments = proj.showGraphServiceCompartments;
          // };
		  proj_params.showGraphServiceCompartments = true;
		  if (proj.endpointUsername) {
            proj_params.endpointUsername = proj.endpointUsername;
          };
		  if (proj.endpointPassword) {
            proj_params.endpointPassword = proj.endpointPassword;
          };
		  if (proj.schema) {
            proj_params.schema = proj.schema;
          };
		  // if (proj.graphsInstructions) {
            // proj_params.graphsInstructions = proj.graphsInstructions;
          // };
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
	  graphsService: getSchemaNameFromGraphService(e.getGraphsServices()),
	  namedGraphs: e.getNamedGraphs(),
      conditions: e.getConditions(),
      orderings: e.getOrderings(),
      groupings: e.getGroupings(),
      indirectClassMembership: e.isIndirectClassMembership(),
      labelServiceLanguages: e.isLabelServiceLanguages(),
      distinct:e.isDistinct(),
      selectAll:e.isSelectAll(),
      groupByThis:e.isGroupByThis(),
	  having: e.getHaving(),
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
	// getConnectedClasses(classAccessTable);
	// query_in_abstract_syntax["classAccessTable"] = classAccessTable;
	// printClassAccessTable(classAccessTable, "");
    return query_in_abstract_syntax;
  });
};

function printClassAccessTable(classT, interval){
	for(let clazz in classT){
		if(typeof classT[clazz] !== "function"){
			let c = new VQ_Element(clazz);
			var cName = c.getName();
			if(cName == null) cName = c.getInstanceAlias();
			console.log(interval+ cName);
			let intervalA = "  ";
			for(let clazzA in classT[clazz]){
				if(typeof classT[clazz][clazzA] !== "function"){
					let c = new VQ_Element(clazzA);	
					var path = "";
					for(let p in classT[clazz][clazzA]){
						if(typeof classT[clazz][clazzA][p] !== "function"){
							var pp = classT[clazz][clazzA][p];
							var name = pp.name;
							if(name == null) name = pp.alias;
							
							path = path + pp.direction + "-" + name + "(union=" + pp.isUnion +")" +", ";
						}
					}
					console.log(intervalA+  path, );
				}
			}
			
		}
	}
}

function getConnectedClasses(classAccessTable){
	for(let classM in classAccessTable){
		if(typeof classAccessTable[classM] !== "function"){	
			for(let classC in classAccessTable[classM]){
				if(typeof classAccessTable[classM][classC] !== "function" && classAccessTable[classM][classC] !== null){
				  for(let classCC in classAccessTable[classC]){
						if(typeof classAccessTable[classC][classCC] !== "function" && classAccessTable[classC][classCC] !== null &&  classCC !== classM){
						  if(classAccessTable[classM][classCC] == null){
							  classAccessTable[classM][classCC] = [];
							  for(let classMC in classAccessTable[classM][classC]){
								 if(typeof classAccessTable[classM][classC][classMC] !== "function") classAccessTable[classM][classCC].push(classAccessTable[classM][classC][classMC]);
							  } 
							  for(let classMC in classAccessTable[classC][classCC]){
								 if(typeof classAccessTable[classC][classCC][classMC] !== "function") classAccessTable[classM][classCC].push(classAccessTable[classC][classCC][classMC]);
							  }  
						  } else {
							  
							  var tempPath = [];
							  for(let classMC in classAccessTable[classM][classC]){
								 if(typeof classAccessTable[classM][classC][classMC] !== "function") tempPath.push(classAccessTable[classM][classC][classMC]);
							  } 
							  for(let classMC in classAccessTable[classC][classCC]){
								 if(typeof classAccessTable[classC][classCC][classMC] !== "function") tempPath.push(classAccessTable[classC][classCC][classMC]);
							  }  
							  
							  if(classAccessTable[classM][classCC].length > tempPath.length) classAccessTable[classM][classCC] = tempPath;
						  }
						}
				  }
				}
			}
		}
	}
	var notAll = false;
	for(let classM in classAccessTable){
		if(typeof classAccessTable[classM] !== "function"){	
			for(let classC in classAccessTable[classM]){
				if(typeof classAccessTable[classM][classC] !== "function" && classAccessTable[classM][classC] === null){
				 notAll = true;
				 break;
				}
			}
		}
	}
	if(notAll == true) getConnectedClasses(classAccessTable);
	
	return classAccessTable
}

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

	 // var proj = Projects.findOne({_id: Session.get("activeProject")});
   	 // if (proj && proj.graphsInstructions) {
		
		// var graphs = JSON.parse(proj.graphsInstructions)
		// for (let g = 0; g < graphs.length; g++) {
			// if(graphs[g]["Graph/Service shorthand"].toLowerCase() == graph.toLowerCase()) return graph = "<"+graphs[g]["Expansion (e.g., URI)"]+">";
		// }

     // }
	
	var graphIsUri = isURI(graph)
	if(graphIsUri == 4){
		let prefix = graph.substring(0, graph.indexOf(":"));
		let name = graph.substring(graph.indexOf(":")+1);
		for (let kp = 0; kp < prefixes.length; kp++) {
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
	
	for(let exp in parsed_exp){
		if(typeof parsed_exp[exp] === "object"){
			if(exp == "var") {
				parsed_exp[exp]["type"] = await resolveType(parsed_exp[exp]["name"], exprType, context, symbol_table, schemaName, isSimple);
				parsed_exp[exp]["kind"] = await resolveKind(parsed_exp[exp]["name"], exprType, context, symbol_table, schemaName, isSimple);
			}
			
			
			if(typeof parsed_exp[exp] === 'object'){
				await getResolveInformation( parsed_exp[exp], schemaName, symbol_table, context, exprType, isSimple)
			}
			
			if((exp == "PrimaryExpression" || exp == "PrimaryExpressionL" || exp == "PrimaryExpressionR") && typeof parsed_exp[exp]["PathProperty"] !== "undefined"){
				parsed_exp[exp] = pathOrReference(parsed_exp[exp], symbol_table, context)
			}
		}
	}
	
	return parsed_exp;
}

async function resolveTypeFromSymbolTable(id, cont, symbol_table) {
    let context = cont._id;

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
};

async function resolveTypeFromSymbolTableForContext(id, cont, symbol_table) {
    let context = cont._id;
	
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
};
    			// string -> idObject
    			// returns kind of the identifier from symbol table. Null if does not exist.
async function resolveKindFromSymbolTable(id, cont, symbol_table) {
    				let context = cont._id;

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
};

async function resolveKindFromSymbolTableForContext(id, cont, symbol_table) {
    let context = cont._id;
	
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
};
    			// string -> idObject
    			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
async function resolveTypeFromSchemaForClass(id, schemaName) {
    				
					if(schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
						id = "wd:"+id;
					}
					// if(schemaName !== "" && schemaName !== null) dataShapes.schema.schema = schemaName;
					let params = {name: id};
					if(schemaName !== "" && schemaName !== null && dataShapes.schema.schema !== schemaName) params.schema = schemaName;
						
					var cls = await dataShapes.resolveClassByName(params);

    				if(cls["complete"] == false) return null;
    				if(cls["data"].length > 0){
    					return cls["data"][0];
    				}  else if(typeof cls["name"] !== "undefined" && id != "[ + ]" && id != "[ ]" && !id.startsWith("?") && schemaName.toLowerCase() == "wikidata" && id.indexOf("[") != -1 && id.endsWith("]")) {
						var name = cls["name"];
						let prefix;
						let display_name = id;
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
						// if(schemaName !== "" && schemaName !== null) dataShapes.schema.schema = schemaName;
						var cls = await dataShapes.getIndividualName(id,true)
						if(cls != null && cls != ""){
							return {local_name: cls.substring(3), prefix: "wd"};
						}
		
					}
    				return null;
};
    			// string -> idObject
    			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
async function resolveTypeFromSchemaForAttributeAndLink(id, schemaName) {
    				let properties = {name: id};
					if(schemaName !== "" && schemaName !== null && dataShapes.schema.schema !== schemaName) {
						// schemaName = dataShapes.schema.schema;
						properties.schema = schemaName;
						// dataShapes.schema.schemaType = schemaName;
					}
					if(schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
						id = "wdt:"+id;
					}
					var aorl = await dataShapes.resolvePropertyByName(properties);
					
    				if(aorl["complete"] == false) return null;
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
	//console.log("resolveType", id, schemaName);
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
        						k="DIRECT_PROPERTY";
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
	for(let key in expressionTable){
		if(typeof expressionTable[key] === "object"){
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
	}
	return {isSimple:isSimple, isPath:isPath}
}

function getSchemaNameFromGraphService(getGraphsServices){
	let ontologies = dataShapes.getOntologiesSync();
	let declarations = getDeclarations();
	if(typeof declarations.schemas[getGraphsServices.graph] !== "undefined") getGraphsServices.graph = declarations.schemas[getGraphsServices.graph];
	if(typeof ontologies !== "undefined"){
		for(let o = 0; o < ontologies.length; o++){	
			if(ontologies[o]["display_name"] === getGraphsServices.schema){
				getGraphsServices.schema = ontologies[o]["db_schema_name"];
				break;
			}
		}
	}
	return getGraphsServices;
}

export {
  resolveTypesAndBuildSymbolTable,
  genAbstractQueryForElementList,
  getResolveInformation,
  getDeclarations
}
