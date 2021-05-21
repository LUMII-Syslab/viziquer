Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  Foo: function() { console.log("This menu item does nothing") },

  ExecuteSPARQL_from_diagram: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    var queries = genAbstractQueryForElementList(elems_in_diagram_ids);
    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
       return;
    };
    _.each(queries,function(q) {
		if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
	  }
      else{
         //console.log(JSON.stringify(q,null,2));
     var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		 var rootClass = abstractQueryTable["root"];
		 var result = generateSPARQLtext(abstractQueryTable);
		 // console.log(result["SPARQL_text"]);
		 Session.set("generatedSparql", result["SPARQL_text"]);
     setText_In_SPARQL_Editor(result["SPARQL_text"], result);

	  if(result["blocking"] != true)executeSparqlString(result["SPARQL_text"]);
	  }
    })
  },

  ExecuteSPARQL_from_selection: function() {
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
    // allow single node query for every element
    var queries = (elem_ids.length == 1) ? genAbstractQueryForElementList(elem_ids,elem_ids) : genAbstractQueryForElementList(elem_ids);

    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
       return;
    };
    _.each(queries,function(q) {
		if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
	  }
      else{
			 //console.log(JSON.stringify(q,null,2));
		 var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 var result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"], result);
			 Session.set("generatedSparql", result["SPARQL_text"]);
		 setText_In_SPARQL_Editor(result["SPARQL_text"]);

		 if(result["blocking"] != true)executeSparqlString(result["SPARQL_text"]);
	  }
    })
  },

  ExecuteSPARQL_from_component: function() {
    var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());

    //TODO: Code optimization needed - this block copied ...
    if (elem) {
       var selected_elem = new VQ_Element(elem[0]);
       var visited_elems = {};

       function GetComponentIds(vq_elem) {
           visited_elems[vq_elem._id()]=true;
           _.each(vq_elem.getLinks(),function(link) {
               if (!visited_elems[link.link._id()]) {
                 visited_elems[link.link._id()]=true;
                 var next_el = null;
                 if (link.start) {
                   next_el=link.link.getStartElement();
                 } else {
                   next_el=link.link.getEndElement();
                 };
                 if (!visited_elems[next_el._id()]) {
                    GetComponentIds(next_el);
                 };
               };
           });
       };

       GetComponentIds(selected_elem);

       var elem_ids = _.keys(visited_elems);

       var queries = genAbstractQueryForElementList(elem_ids);
       // ErrorHandling - just one query at a moment allowed
       if (queries.length==0) {
          Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
          return;
       } else if (queries.length>1) {
          Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
          return;
       };
       _.each(queries,function(q) {
		   if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
	  }
      else{
            //console.log(JSON.stringify(q,null,2));
		   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 var result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"]);

		   Session.set("generatedSparql", result["SPARQL_text"]);
		   setText_In_SPARQL_Editor(result["SPARQL_text"], result);

		   if(result["blocking"] != true)executeSparqlString(result["SPARQL_text"]);
	  }
       })
    } else {
      // nothing selected
    }
  },

  ExecuteSPARQL_from_query_part: function() {
    var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());


    if (elem) {
       var visited_elems = {};
       var root_elements_ids = [ elem[0] ];
       var query_elements_ids = [];

       var selected_elem = new VQ_Element(elem[0]);

       _.each(selected_elem.getLinks(),function(link) {
           if (!link.link.isConditional()) {
             var UP_direction = link.link.getRootDirection();
             if ((link.start &&  UP_direction == "start") || (!link.start &&  UP_direction == "end")) {
               visited_elems[link.link._id()] = true;
             };
           };
       });

       function GetComponentIds(vq_elem) {
           visited_elems[vq_elem._id()]=true;
           query_elements_ids.push(vq_elem._id());
           _.each(vq_elem.getLinks(),function(link) {
               if (!visited_elems[link.link._id()]) {
                 visited_elems[link.link._id()]=true;
                 query_elements_ids.push(link.link._id());
                 // If link is conditional we register it, but dont follow ...
                 if (!link.link.isConditional()) {
                   var next_el = null;
                   if (link.start) {
                     next_el=link.link.getStartElement();
                   } else {
                     next_el=link.link.getEndElement();
                   };
                   if (!visited_elems[next_el._id()]) {
                      GetComponentIds(next_el);
                   };
                 };
               };
           });
       };

       GetComponentIds(selected_elem);

       var queries = genAbstractQueryForElementList(query_elements_ids, root_elements_ids);
       // ErrorHandling - just one query at a moment allowed
       if (queries.length==0) {
          Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
          return;
       } else if (queries.length>1) {
          Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
          return;
       };
       _.each(queries,function(q) {
		   if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
	  }
      else{
            //console.log(JSON.stringify(q,null,2));
		   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 var result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"]);

		   Session.set("generatedSparql", result["SPARQL_text"]);
		   setText_In_SPARQL_Editor(result["SPARQL_text"], result);

		   if(result["blocking"] != true)executeSparqlString(result["SPARQL_text"]);
	  }
       })
     } else {
       // nothing selected
     }
  },

  GenerateSPARQL_from_selection: function() {
    // get _id-s of selected elements - it serves as potential root Classes
    // and as allowed elements
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
    // allow execute single-class non-root elements
    if (elem_ids.length == 1) { GenerateSPARQL_for_ids(elem_ids, elem_ids) } else { GenerateSPARQL_for_ids(elem_ids) };

  },

  GenerateSPARQL_from_component: function() {

	var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());

    // now we should find the connected classes ...
    if (elem) {
       var selected_elem = new VQ_Element(elem[0]);
       var visited_elems = {};

       function GetComponentIds(vq_elem) {
           visited_elems[vq_elem._id()]=true;
           _.each(vq_elem.getLinks(),function(link) {
               if (!visited_elems[link.link._id()]) {
                 visited_elems[link.link._id()]=true;
                 var next_el = null;
                 if (link.start) {
                   next_el=link.link.getStartElement();
                 } else {
                   next_el=link.link.getEndElement();
                 };
                 if (!visited_elems[next_el._id()]) {
                    GetComponentIds(next_el);
                 };
               };
           });
       };

       GetComponentIds(selected_elem);

       var elem_ids = _.keys(visited_elems);
       GenerateSPARQL_for_ids(elem_ids);
    } else {
      // nothing selected
    }

  },

  GenerateSPARQL_from_query_part: function() {
    var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());


    if (elem) {
       var visited_elems = {};
       var root_elements_ids = [ elem[0] ];
       var query_elements_ids = [];

       var selected_elem = new VQ_Element(elem[0]);

       _.each(selected_elem.getLinks(),function(link) {
           if (!link.link.isConditional()) {
             var UP_direction = link.link.getRootDirection();
             if ((link.start &&  UP_direction == "start") || (!link.start &&  UP_direction == "end")) {
               visited_elems[link.link._id()] = true;
             };
           };
       });

       function GetComponentIds(vq_elem) {
           visited_elems[vq_elem._id()]=true;
           query_elements_ids.push(vq_elem._id());
           _.each(vq_elem.getLinks(),function(link) {
               if (!visited_elems[link.link._id()]) {
                 visited_elems[link.link._id()]=true;
                 query_elements_ids.push(link.link._id());
                 // If link is conditional we register it, but dont follow ...
                 if (!link.link.isConditional()) {
                   var next_el = null;
                   if (link.start) {
                     next_el=link.link.getStartElement();
                   } else {
                     next_el=link.link.getEndElement();
                   };
                   if (!visited_elems[next_el._id()]) {
                      GetComponentIds(next_el);
                   };
                 };
               };
           });
       };

       GetComponentIds(selected_elem);

       GenerateSPARQL_for_ids(query_elements_ids, root_elements_ids)
     } else {
       // nothing selected
     }

  },

  GenerateSPARQL_from_diagram: function() {

	// get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSPARQL_for_ids(elems_in_diagram_ids)
  },

  GenerateSPARQL_from_diagram_for_all_queries: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSPARQL_for_all_queries(elems_in_diagram_ids)
  },

  ExecuteSPARQL_from_text: function(text, paging_info) {
      executeSparqlString(text, paging_info);
  },
});

// generate SPARQL for given id-s
function GenerateSPARQL_for_ids(list_of_ids, root_elements_ids) {
  Interpreter.destroyErrorMsg();
 
  
  var queries = genAbstractQueryForElementList(list_of_ids, root_elements_ids);
  // ErrorHandling - just one query at a moment allowed
  if (queries.length==0) {
     Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
     return;
  } else if (queries.length>1) {
     Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
     return;
  };
  // goes through all queries found within the list of VQ element ids
  _.each(queries, function(q) {
	  if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);
		Session.set("generatedSparql", "");
		setText_In_SPARQL_Editor("");
	  }
      else{
		  // console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
   // console.log(abstractQueryTable, JSON.stringify(abstractQueryTable,null,2));
   var rootClass = abstractQueryTable["root"];
  var result = generateSPARQLtext(abstractQueryTable);
  // console.log(result["SPARQL_text"]);

   Session.set("generatedSparql", result["SPARQL_text"]);
   setText_In_SPARQL_Editor(result["SPARQL_text"]);

   $('#vq-tab a[href="#sparql"]').tab('show');
   // Interpreter.destroyErrorMsg();
  }
  })
}

// string, {limit: , offset:, total_rows:} -->
// Executes the given Sparql end shows result in the GUI
function executeSparqlString(sparql, paging_info) {
  // Default Data Set Name (Graph IRI) and SPARQL endpoint url
  var graph_iri = "";
  var endpoint = "http://185.23.162.167:8833/sparql";

  var proj = Projects.findOne({_id: Session.get("activeProject")});

  if (proj && proj.endpoint) {
  //if (proj && proj.uri && proj.endpoint) {
    if (proj.uri) {graph_iri = proj.uri;}
    endpoint = proj.endpoint;
  } else {
    Interpreter.showErrorMsg("Project endpoint not properly configured", -3);
    return;
  };

  var list = {projectId: Session.get("activeProject"),
              versionId: Session.get("versionId"),
              options: {
                        params: {
                               params: {
                                     "default-graph-uri": graph_iri,
                                      query: sparql,
                               },
                        },
						endPoint: endpoint,
						endpointUsername: proj.endpointUsername,
						endpointPassword: proj.endpointPassword,
						// httpRequestProfileName: "P1", // use the specified http request profile for executing SPARQL queries
                        paging_info: paging_info
              },
           };
  //console.log(list);
  Utilities.callMeteorMethod("executeSparql", list, function(res) {
    if (res.status == 200) {
      //console.log(res.result);
      if (!paging_info || (paging_info && !paging_info.download)) {
        Session.set("executedSparql", res.result);
        Interpreter.destroyErrorMsg();
        $('#vq-tab a[href="#executed"]').tab('show');
      } else {
        //console.log(paging_info);
        if (paging_info && paging_info.download && res.result.sparql) {
          //console.log(paging_info);
          // here - parse res.result
          var fields = _.map(res.result.sparql.head[0].variable, function(v) {
            return v["$"].name;
          });

          var csv_table = _.map(res.result.sparql.results[0].result, function(result_item) {
             var csv_row = {};
             _.forEach(fields, function(field) {
               var result_item_attr = _.find(result_item.binding, function(attr) {return attr["$"].name==field});
               var obj = {};
               if (result_item_attr) {
                 if (result_item_attr.literal) {
                   if (result_item_attr.literal[0]._) {
                      obj[field] = result_item_attr.literal[0]._;
                   } else {
                      obj[field] = result_item_attr.literal[0];
                   };
                   // data_item.literal[0]._

                 } else {
                   if (result_item_attr.uri) {
                     obj[field] = result_item_attr.uri[0];
                   } else {
                     obj[field] = null;
                   };
                 };
               } else {
                 obj[field] = undefined;
               };
               _.extend(csv_row,obj);
             });
            return csv_row;
          });
          var list = {fields:fields, json:csv_table};
          Utilities.callMeteorMethod("json2csv", list, function(csv) {
            //console.log(csv);
            var csv_data = "text/csv;charset=utf-8," + encodeURIComponent(csv);
            var link = $('<a href="data:' + csv_data + '" download="result.csv">download Results</a>');
            link.appendTo('#download-hack');
            link[0].click();
          });

        }
      }


    } else {
      Session.set("executedSparql", {limit_set:false, number_of_rows:0});
      // console.error(res);
      if (res.status==503) {
          Interpreter.showErrorMsg("SPARQL execution failed: most probably the endpoint is not reachable.",-3)
      } else if (res.status==504) {
          var errorMessage = "";
		  if(typeof errorMessage === "string") errorMessage =  res.error;
		  Interpreter.showErrorMsg("SPARQL execution results unreadable. " + errorMessage,-3)
      } else {
          var msg = ".";
          if (res.error && res.error.response) {
             msg = ": "+res.error.response.content;
          };
          Interpreter.showErrorMsg("SPARQL execution failed" + msg,-3);
      };

    }
  })
}


// generate SPARQL for all queries
function GenerateSPARQL_for_all_queries(list_of_ids) {
  Interpreter.destroyErrorMsg();
  var queries = genAbstractQueryForElementList(list_of_ids);

  // goes through all queries found within the list of VQ element ids
  _.each(queries, function(q) {
       //console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);

   var result = generateSPARQLtext(abstractQueryTable);
   // console.log(result["SPARQL_text"]);

   Session.set("generatedSparql", result["SPARQL_text"]);
   setText_In_SPARQL_Editor(result["SPARQL_text"])
   // Interpreter.destroyErrorMsg();
  })
}

function setText_In_SPARQL_Editor(text) {
  yasqe.setValue(text);
  yasqe3.setValue(text);
}

//generate table with unique class names in form [_id] = class_unique_name
//rootClass - abstract syntax table starting with 'rootClass' object
function generateIds(rootClass){
	var counter = 0;
	var idTable = [];
	var referenceTable = [];

	//add root class unique name
	var rootClassId = rootClass["instanceAlias"];
	if(rootClassId == null || rootClassId.replace(" ", "") =="") {
		rootClassId = rootClass["identification"]["localName"];
		if (checkIfIsURI(rootClassId) == "full_form") rootClassId = "expr";
		if (checkIfIsURI(rootClassId) == "prefix_form") rootClassId = rootClassId.substr(rootClassId.indexOf(":")+1);
	}
	else rootClassId = rootClassId.replace(/ /g, '_');

	//set rootClassId to "expr" if no class name
	if(rootClassId == null || rootClassId == "(no_class)") rootClassId = "expr";
	if (checkIfIsURI(rootClassId) == "not_uri") rootClassId = rootClassId.replace(/-/g, '_');
	if(rootClass["isVariable"] == true && (rootClass["instanceAlias"] == null || rootClass["instanceAlias"].replace(" ", "") =="")) {

		var varName = rootClass["variableName"];
		if(varName == "?") varName = "?class";
		if(varName.startsWith("?"))rootClassId = "_" + varName.substr(1);
		else rootClassId = "_" + varName;
	}
	// idTable[rootClass["identification"]["_id"]] = rootClassId;
	idTable[rootClass["identification"]["_id"]] = {name:rootClassId, unionId:null};



	referenceTable[rootClassId] = [];
	referenceTable[rootClassId]["classes"] = [];

	//go through all root class children classes
	_.each(rootClass["children"],function(subclazz) {
		var unionClass = null;
		if(rootClass["isUnion"] == true) unionClass = rootClass["identification"]["_id"];
		var temp = generateClassIds(subclazz, idTable, counter, rootClass["identification"]["_id"], rootClass["isUnion"], unionClass);
		idTable.concat(temp["idTable"]);
		referenceTable[rootClassId]["classes"].push(temp["referenceTable"]);
	})

	var idTableTemp = [];
	for(var key in idTable) {
		idTableTemp[key] = idTable[key]["name"];
	}

	return {idTable:idTableTemp, referenceTable:referenceTable};
}



// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
// parentClassId - parent class identificator
function generateClassIds(clazz, idTable, counter, parentClassId, parentClassIsUnion, unionClass){
	var referenceTable = [];
	
	if(clazz["linkIdentification"]["localName"] == "==" && typeof idTable[parentClassId] !== 'undefined') {
		if(typeof clazz["instanceAlias"] !== "undefined" && clazz["instanceAlias"] != null && clazz["instanceAlias"] != "") {
			idTable[parentClassId]["name"] = clazz["instanceAlias"];
			idTable[clazz["identification"]["_id"]] = idTable[parentClassId];
		}
		else idTable[clazz["identification"]["_id"]] = idTable[parentClassId];

	}
	// if instance is defined, use it
	else if(clazz["instanceAlias"] != null && clazz["instanceAlias"].replace(" ", "") !="") {
		idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:clazz["instanceAlias"].replace(/ /g, '_'), unionId:unionClass};
	}
	else if(clazz["isVariable"] == true) {
		var varName = clazz["variableName"];
		if(varName == "?") {
			varName = "class";
			var foundInIdTable = false;
			for(var key in idTable) {
				// if given class name is in the table, add counter to the class name
				if(idTable[key]["name"] == "_" + varName){
					foundInIdTable = true;
					idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:"_" + varName + "_"+ counter, unionId:unionClass};
					counter++;
				}
			}
			// if given class name is not in the table, use it
			if(foundInIdTable == false) idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:"_" + varName, unionId:unionClass};
		} else{
			if(varName.startsWith("?"))varName = varName.substr(1);
			idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:"_" + varName, unionId:unionClass};
		}

	}
	else if((clazz["instanceAlias"] == null || clazz["instanceAlias"].replace(" ", "") =="") && (clazz["identification"]["localName"] == null || clazz["identification"]["localName"] == "" || clazz["identification"]["localName"] == "(no_class)") || typeof clazz["identification"]["URI"] === 'undefined') {
		idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:"expr_"+counter, unionId:unionClass};
		counter++;
	}
	else{
		//TODO container name
		var foundInIdTable = false;
		if(parentClassIsUnion == true){
			for(var key in idTable) {
				// if given class name is in the table, add counter to the class name
				if(idTable[key]["localName"] == clazz["identification"]["localName"] && idTable[key]["unionId"] == unionClass){
					foundInIdTable = true;
					idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:idTable[key]["name"], unionId:unionClass};
				}
			}
		}
		if(foundInIdTable == false){
			for(var key in idTable) {
				// if given class name is in the table, add counter to the class name
				if(idTable[key]["name"] == clazz["identification"]["localName"]){
					foundInIdTable = true;
					idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:clazz["identification"]["localName"].replace(/-/g, '_') + "_"+ counter, unionId:unionClass};
					counter++;
				}
			}
		}
		// if given class name is not in the table, use it
		if(foundInIdTable == false) idTable[clazz["identification"]["_id"]] = {localName:clazz["identification"]["localName"], name:clazz["identification"]["localName"].replace(/-/g, '_'), unionId:unionClass};
	}
	var className = idTable[clazz["identification"]["_id"]]["name"];
	var linkType = "palin";
	if(clazz["linkType"] != "REQUIRED" || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) linkType = "notPlain";

	referenceTable[className] = [];
	referenceTable[className]["type"] = linkType;
	referenceTable[className]["underUnion"] = parentClassIsUnion;

	if(clazz["linkType"] == "OPTIONAL" && clazz["isSubQuery"] != true && clazz["isGlobalSubQuery"] != true) referenceTable[className]["optionaPlain"] = true;
	else referenceTable[className]["optionaPlain"] = false;

	referenceTable[className]["classes"] = [];
	_.each(clazz["children"],function(subclazz) {
		var parentClassIsUnionTemp = clazz["isUnion"];
		if(parentClassIsUnion == true) parentClassIsUnionTemp = true;
		if(parentClassIsUnionTemp == true){
			if(unionClass == null) unionClass = clazz["identification"]["_id"];
		} else unionClass = null;

		var temp = generateClassIds(subclazz, idTable, counter, clazz["identification"]["_id"], parentClassIsUnionTemp, unionClass);
		idTable.concat(temp["idTable"]);
		referenceTable[className]["classes"].push(temp["referenceTable"]);
		counter = temp["counter"];
	})
	return {idTable: idTable, referenceTable: referenceTable, counter:counter};
}

// find all prefixes used it a SPARQL query
// expressionTable - query abstract syntex table
// prefixTable - table with prefixes find so far
function findUsedPrefixes(expressionTable, prefixTable){

	for(var key in expressionTable){
		if(key == 'Prefix') {
			if(typeof prefixTable[expressionTable[key]] === 'undefined') prefixTable[expressionTable[key]] = 1;
			else prefixTable[expressionTable[key]] = prefixTable[expressionTable[key]] +1;
		}
		if(typeof expressionTable[key] == 'object') prefixTable = findUsedPrefixes(expressionTable[key], prefixTable);
	}
	return prefixTable;
}

// find prefix, used most offen in query or empty prefix if it is already used
// prefixTable - table with prefixes in a query
function findEmptyPrefix(prefixTable){
	var prefix = null;

	if(typeof prefixTable[""] === 'undefined' && typeof prefixTable[":"] === 'undefined'){
		for(var key in prefixTable){
			if(typeof prefixTable[key] === 'number'){
				if(prefix == null) prefix = key;
				else if(prefixTable[key] > prefixTable[prefix]) prefix = key;
			}
		}
	} else prefix = "";
	return prefix
}

// generate SPARQL query text
// abstractQueryTable - abstract query sintex table
function generateSPARQLtext(abstractQueryTable){
	console.log("abstractQueryTable", abstractQueryTable)
		 var messages = [];

		 var rootClass = abstractQueryTable["root"];
		 var symbolTable = abstractQueryTable["symbolTable"];

		 var parameterTable = abstractQueryTable["params"];
		 var knownPrefixes = abstractQueryTable["prefixes"];

 		 //generate table with unique class names in form [_id] = class_unique_name
		 var generateIdsResult = generateIds(rootClass);
		 var idTable = generateIdsResult["idTable"];
		 var referenceTable = generateIdsResult["referenceTable"];

		 //empty prefix in query
		 var emptyPrefix = findEmptyPrefix(findUsedPrefixes(rootClass, []));

		 //table with unique variable names
		 var variableNamesAll = [];

		 //table with field names (attributes, aggregations)
		 var fieldNames = [];

		//counter for variables with equals names
		 var counter = 0;

		 var tempAttrNames = setAttributeNames(rootClass, idTable, symbolTable, []);
		 var attributesNames = tempAttrNames["attributeNames"];
		 messages = messages.concat(tempAttrNames["messages"]);

		 var result = forAbstractQueryTable(attributesNames, rootClass, null, idTable[rootClass["identification"]["_id"]], idTable, variableNamesAll, counter, [], false, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes);

		 messages = messages.concat(result["messages"]);

		 sparqlTable = result["sparqlTable"];
		 // console.log(result, JSON.stringify(sparqlTable,null,2));

		 // table with prefixes used in query
		 var prefixTable = result["prefixTable"];

		 var SPARQL_text = "";
		 var SPARQL_interval = "  ";

		 // if root class is Union
		 if(rootClass["isUnion"] == true){
			
			var unionResult = getUNIONClasses(sparqlTable, null, null, true, referenceTable, SPARQL_interval);
			SPARQL_text = unionResult["result"];
	
			messages = messages.concat(unionResult["messages"]);
			//Prefixes
			var prefixes = "";
			for (var prefix in prefixTable){
				if(typeof prefixTable[prefix] === "string") prefixes = prefixes + "PREFIX " + prefix + " " + prefixTable[prefix] + "\n";
			}
			SPARQL_text = prefixes + SPARQL_text;
		 } else{
			SPARQL_text = "SELECT ";

			 //DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SPARQL_text = SPARQL_text + "DISTINCT ";

			 // console.log("sparqlTable", sparqlTable);
			 var selectResult = generateSELECT(sparqlTable, false);
			 var tempSelect = selectResult["select"];
			 tempSelect = tempSelect.concat(selectResult["aggregate"]);

			 var whereInfo = generateSPARQLWHEREInfo(sparqlTable, [], [], [], referenceTable, SPARQL_interval+"  ");
			  
			 tempSelect= tempSelect.concat(whereInfo["subSelectResult"]);
			 
			 // remove duplicates
			 tempSelect = tempSelect.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			 });
			 
			 SPARQL_text = SPARQL_text + tempSelect.join(" ");

			if(tempSelect.length < 1) {
				
				var listOfElementId = [];
				for(var id in idTable){
					listOfElementId.push(id);
				}
				messages.push({
					"type" : "Error",
					"message" : "Please specify at least one attribute (use (select this) to include the instance itself in the selection)",
					"listOfElementId" : listOfElementId,
					"isBlocking" : true
				});messages.push({
					"type" : "Error",
					"message" : "Please specify at least one attribute (use (select this) to include the instance itself in the selection)",
					"listOfElementId" : listOfElementId,
					"isBlocking" : true
				});
			 }

			 SPARQL_text = SPARQL_text + " WHERE{\n";

			var orderBy = getOrderBy(rootClass["orderings"], result["fieldNames"], rootClass["identification"]["_id"], idTable, emptyPrefix, referenceTable, classMembership, knownPrefixes, symbolTable);

			var groupByFromFields = getGroupBy(rootClass["groupings"], result["fieldNames"], rootClass["identification"]["_id"], idTable, emptyPrefix, referenceTable, symbolTable, classMembership, knownPrefixes);
			 var groupByTemp = selectResult["groupBy"].concat(orderBy["orderGroupBy"]);
			 var groupByTemp = groupByTemp.concat(groupByFromFields["groupings"]);

			 groupByTemp = groupByTemp.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});

			 //SELECT DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0){
				messages.push({
						"type" : "Warning",
						"message" : "Select distinct not available for values included in aggregate functions. To aggregate over distinct values, include distinct modifier inside the aggregate function (or select the values in this node and aggregate in outer query (Re-shape Query -> Add outer query)).",
						"listOfElementId" : [rootClass["identification"]["_id"]],
						"isBlocking" : true
				});
				
				// var groupBySelectDistinct = [];
				// if(rootClass["aggregations"].length > 0) groupBySelectDistinct = groupByTemp;
				// var groupBySelectDistinct = groupBySelectDistinct.concat(selectResult["innerDistinct"]);
				// groupBySelectDistinct = groupBySelectDistinct.filter(function (el, i, arr) {
					// return arr.indexOf(el) === i;
				// });

				 // SPARQL_text = SPARQL_text + "{SELECT DISTINCT " +groupBySelectDistinct.join(" ") + " WHERE{\n";
			 }

			  //HAVING
			 // var having = getHaving(rootClass["havingConditions"]);
			 // if(having != "") SPARQL_text = SPARQL_text + having + "\n";


			 var temp = whereInfo["triples"];
			 temp = temp.concat(whereInfo["filters"]);
			 temp = temp.concat(whereInfo["links"]);
			 messages = messages.concat(whereInfo["messages"]);

			 var classMembership;
			if(typeof rootClass["indirectClassMembership"] !== 'undefined' && rootClass["indirectClassMembership"] == true && typeof parameterTable["indirectClassMembershipRole"] !== 'undefined' && parameterTable["indirectClassMembershipRole"] != null && parameterTable["indirectClassMembershipRole"] != ""){
				classMembership =  parameterTable["indirectClassMembershipRole"];
				//todo prefix
			}else if(typeof rootClass["indirectClassMembership"] === 'undefined' || rootClass["indirectClassMembership"] != true && typeof parameterTable["directClassMembershipRole"] !== 'undefined' && parameterTable["directClassMembershipRole"] != null && parameterTable["directClassMembershipRole"] != ""){
				classMembership =  parameterTable["directClassMembershipRole"];
				//todo prefix
			} else {
				classMembership = "a";
				// prefixTable["rdf:"] = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
			}


			 messages = messages.concat(orderBy["messages"]);
			 messages = messages.concat(groupByFromFields["messages"]);
			 //add triples from order by
			 temp = temp.concat(orderBy["triples"]);
			 if(rootClass["aggregations"].length > 0) temp = temp.concat(groupByFromFields["triples"]);

			 var temp = temp.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});

			 SPARQL_text = SPARQL_text + SPARQL_interval+ temp.join("\n"+SPARQL_interval)  + "\n}";
			 // if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + "}}";
			 //GROUP BY

			 var groupBy = groupByTemp.join(" ");
			 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

			 if(rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + groupBy;

			 //ORDER BY

			 if (orderBy["orders"] != "") SPARQL_text = SPARQL_text + "\nORDER BY " + orderBy["orders"];

			 //OFFSET
			 if (rootClass["offset"] != null) {
				if(!isNaN(rootClass["offset"])) SPARQL_text = SPARQL_text + "\nOFFSET " + rootClass["offset"];
				else {
					//Interpreter.showErrorMsg("OFFSET should contain only numeric values");
					messages.push({
						"type" : "Warning",
						"message" : "OFFSET should contain only numeric values",
						"listOfElementId" : [rootClass["identification"]["_id"]],
						"isBlocking" : false
					});
				}
			 }

			 //LIMIT
			 if (rootClass["limit"] != null) {
				if(!isNaN(rootClass["limit"]))SPARQL_text = SPARQL_text + "\nLIMIT " + rootClass["limit"];
				else {
					//Interpreter.showErrorMsg("LIMIT should contain only numeric values");
					messages.push({
						"type" : "Warning",
						"message" : "LIMIT should contain only numeric values",
						"listOfElementId" : [rootClass["identification"]["_id"]],
						"isBlocking" : false
					});
				}
			 }

			 //Prefixes
			 var prefixes = "";
			 for (var prefix in prefixTable){
				if(typeof prefixTable[prefix] === "string") prefixes = prefixes + "PREFIX " + prefix + " " + prefixTable[prefix] + "\n";
			 }
			 SPARQL_text = prefixes + SPARQL_text;
		 }

		 var blocking = false;
		 if(messages.length > 0){
			 var showMessages = [];
			 for (var message in messages){
				if(typeof messages[message] === "object") {
					if(messages[message]["isBlocking"] == true){
						blocking = true;
					}
					showMessages.push(messages[message]["message"]);
				}
			 }
			 
			var showMessages = showMessages.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});

			Interpreter.showErrorMsg(showMessages.join(" // "), -3);
		 }
		 return {"SPARQL_text":SPARQL_text, "messages":messages, "blocking":blocking};
}

function getPrefix(emptyPrefix, givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}

function getPrefixFromClassMembership(classMembership){

	var knownNamespaces = {
	"foaf:":"http://xmlns.com/foaf/0.1/",
       "owl:":"http://www.w3.org/2002/07/owl#",
       "rdf:":"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
       "rdfs:":"http://www.w3.org/2000/01/rdf-schema#",
       "dbp:":"http://dbpedia.org/property/",
       "skos:":"http://www.w3.org/2004/02/skos/core#",
       "xsd:":"http://www.w3.org/2001/XMLSchema#",
       "geo:":"http://www.w3.org/2003/01/geo/wgs84_pos#",
       "sioc:":"http://rdfs.org/sioc/ns#",
       "d2rq:":"http://www.wiwiss.fu-berlin.de/suhl/bizer/D2RQ/0.1#",
       "rss:":"http://purl.org/rss/1.0/",
       "test2:":"http://this.invalid/test2#",
       "swrc:":"http://swrc.ontoware.org/ontology#",
       "dbpedia:":"http://dbpedia.org/resource/",
       "content:":"http://purl.org/rss/1.0/modules/content/",
       "nie:":"http://www.semanticdesktop.org/ontologies/2007/01/19/nie#",
       "gen:":"http://www.w3.org/2006/gen/ont#",
       "dbo:":"http://dbpedia.org/ontology/",
       "xhtml:":"http://www.w3.org/1999/xhtml/vocab#",
       "dbpprop:":"http://dbpedia.org/property/",
       "dcterms:":"http://purl.org/dc/terms/"
}

	var prefixes = [];
	var splitParts = classMembership.split("/")
	for(var p in  splitParts){
		var part = splitParts[p];

		if(part.indexOf(":") != -1) {
			prefixes[part.substring(0, part.indexOf(":")+1)] = "<"+knownNamespaces[part.substring(0, part.indexOf(":")+1)]+">";
		}
	}
	return prefixes;
}

// generate SPARQL structure table
// clazz - abstract syntax table for given class
// rootClassId - root class unique name
// idTable - table with unique class names, generated so far
// variableNamesAll - table with unique variable names for all query
// counter - counter for variables with equals names
// sparqlTable - table with SPARQL structure generated so far
// underNotLink - label, that class is under NOT link
// emptyPrefix - prefix that is uset as a empty in a query
// fieldNames - all field names in a query
// symbolTable - table with symbols presented in a query
// parameterTable - table with user set SPARQL generation parameters
function forAbstractQueryTable(attributesNames, clazz, parentClass, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes){

	var messages = [];
	var prefixTable = [];

	var classMembership;
	if(typeof clazz["indirectClassMembership"] !== 'undefined' && clazz["indirectClassMembership"] == true && typeof parameterTable["indirectClassMembershipRole"] !== 'undefined' && parameterTable["indirectClassMembershipRole"] != null && parameterTable["indirectClassMembershipRole"] != ""){
		classMembership =  parameterTable["indirectClassMembershipRole"];
		var prefixMembership = getPrefixFromClassMembership(classMembership);
		for (var prefix in prefixMembership) {
			if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];
		}
	}else if(typeof clazz["indirectClassMembership"] === 'undefined' || clazz["indirectClassMembership"] != true && typeof parameterTable["directClassMembershipRole"] !== 'undefined' && parameterTable["directClassMembershipRole"] != null && parameterTable["directClassMembershipRole"] != ""){
		classMembership =  parameterTable["directClassMembershipRole"];
		var prefixMembership = getPrefixFromClassMembership(classMembership);
		for (var prefix in prefixMembership) {
			if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];
		}
	} else {
		classMembership = "a";
		// prefixTable["rdf:"] = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
	}

	if(clazz["instanceAlias"] != null && clazz["instanceAlias"].replace(" ", "") != "" && clazz["instanceAlias"].indexOf(" ") >= 0) {
		messages.push({
			"type" : "Error",
			"message" : "Whitespace characters not allowed in instance alias " + clazz["instanceAlias"],
			"listOfElementId" : [clazz["identification"]["_id"]],
			"isBlocking" : false
		});
	}

	var variableNamesClass = [];


	var instance = idTable[clazz["identification"]["_id"]];
	
	if(instance.indexOf(":") != -1) {
		var prefix = instance.substring(0, instance.indexOf(":"));

		for (var p in knownPrefixes) {
			if(knownPrefixes[p][0] == prefix) {
				prefixTable[prefix+":"] = "<"+knownPrefixes[p][1]+">";
				break;
			}
		}
		
	}
 
	var sparqlTable = {};
	sparqlTable["class"] = "?" + instance; // unique class name
	sparqlTable["isSimpleClassName"] = true; // if class name is simple name = true, if class name contains expression = false
	sparqlTable["distinct"] = clazz["distinct"]; //value from class 'Distinct' field
	sparqlTable["agregationInside"] = false; // if class contains agregations in 'Aggregates' field and class is main class or subquery main class = true
	sparqlTable["simpleTriples"] = []; // triples for simple (field contains static attribute name) fields from 'Attributes'
	sparqlTable["aggregateTriples"] = [];// triples for fields from 'Aggregates'
	sparqlTable["localAggregateSubQueries"] = []; // triples for fields from 'Attributes' with aggregation expression inside, like 'SUM(courseCredits)'
	sparqlTable["filterTriples"] = []; // triples for fields from 'Conditions'
	sparqlTable["filters"] = []; // filter expression for fields from 'Conditions'
	sparqlTable["conditionLinks"] = []; //links with condition label for given class
	sparqlTable["selectMain"] = []; // select values from given class for upper SELECT level
	sparqlTable["selectMain"]["simpleVariables"] = []; // select value for simple fields from 'Attributes'
	sparqlTable["selectMain"]["aggregateVariables"] = []; // select value for fields from 'Aggregates'
	sparqlTable["selectMain"]["referenceVariables"] = []; // list with candidates to reference
	sparqlTable["innerDistinct"] = []; // select values from given class for upper DISTINCT level
	sparqlTable["innerDistinct"]["simpleVariables"] = []; // select value for simple fields from 'Attributes'
	sparqlTable["innerDistinct"]["aggregateVariables"] = []; // select value for fields from 'Aggregates'
	sparqlTable["fullSPARQL"] = clazz["fullSPARQL"]; // SPARQL from 'FullSPARQL' field
	sparqlTable["isUnion"] = clazz["isUnion"]; // label if class is union
	sparqlTable["isUnit"] = clazz["isUnit"]; // label if class in unit
	sparqlTable["selectAll"] = clazz["selectAll"]; // label if class is selectAll
	sparqlTable["variableReferenceCandidate"] = []; // list with candidates to reference
	sparqlTable["classMembership"] = classMembership; // class Membership role
	sparqlTable["groupByThis"] = clazz["groupByThis"]; // group By This class
	sparqlTable["getSubQueryResults"] = false; // group By This class

	var classSimpleTriples = [];
	var classExpressionTriples = [];
	var classFunctionTriples = [];


	if(clazz["isVariable"] == true) {
		var varName = clazz["variableName"];
		// if(varName == "?") varName = "?class";
		if(varName == "?") varName = instance;
		if(clazz["variableName"].startsWith("?")) varName = varName.substr(1);
		sparqlTable["classTriple"] = "?" + instance + " " + classMembership + " ?" + varName+ ".";
		if(underNotLink != true && clazz["variableName"].startsWith("?") == false)sparqlTable["variableName"] = "?" + varName;

		if(typeof fieldNames[attrname] === 'undefined') fieldNames[varName] = [];
		fieldNames[varName][clazz["identification"]["_id"]] = idTable[clazz["identification"]["_id"]];
	}
	else if(clazz["identification"]["localName"] != "[ ]" && clazz["isUnion"] != true && clazz["isUnit"] != true && clazz["identification"]["localName"] != "[ + ]" && clazz["identification"]["localName"] != null && clazz["identification"]["localName"] != "" && clazz["identification"]["localName"] != "(no_class)") {
		var instAlias = clazz["instanceAlias"]
		if(instAlias != null && instAlias.replace(" ", "") =="") instAlias = null;
		if(instAlias != null) instAlias = instAlias.replace(/ /g, '_');

		if(typeof clazz["identification"]["parsed_exp"] === 'undefined'){
			messages.push({
				"type" : "Error",
				"message" : "Syntax error in class name " + clazz["identification"]["localName"],
				"listOfElementId" : [clazz["identification"]["_id"]],
				"isBlocking" : true
			});
		} else{
			var resultClass = parse_attrib(clazz["identification"]["exp"], attributesNames, clazz["identification"]["_id"], clazz["identification"]["parsed_exp"], instAlias, instance, clazz["identification"]["short_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership, "class", knownPrefixes);
			
			for (var prefix in resultClass["prefixTable"]) {
				if(typeof resultClass["prefixTable"][prefix] === 'string') prefixTable[prefix] = resultClass["prefixTable"][prefix];
			}
			counter = resultClass["counter"]
			var temp = [];
			messages = messages.concat(resultClass["messages"]);

			for (var triple in resultClass["triples"]){
				if(typeof resultClass["triples"][triple] === 'string')temp.push(resultClass["triples"][triple]);
			}
			if(resultClass["isAggregate"] == true || resultClass["isExpression"] == true || resultClass["isFunction"] == true){
				sparqlTable["isSimpleClassName"] = false;
				var tempTripleTable = [];
				tempTripleTable["bind"] = "BIND(" + resultClass["exp"] + " AS ?" + instance + ")";
				//sparqlTable["expressionTriples"].push(tempTripleTable);
				classExpressionTriples.push(tempTripleTable);
			}
			sparqlTable["classTriple"] = temp.join("\n"); // triples for class name

			// sparqlTable["classTriple"] = "?" + instance + " a " + getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) + ":" + clazz["identification"]["localName"] + ".";
			var namespace = clazz["identification"]["Namespace"]
			if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
			if(typeof clazz["identification"]["Prefix"] !== 'undefined')prefixTable[getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) +":"] = "<"+namespace+">";
		}
	}

	//attributes
	_.each(clazz["fields"],function(field) {
		if(clazz["isUnit"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+field["exp"], "value" : "?"+field["exp"]});
		} else if(clazz["isUnion"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			var alias = field["exp"];
			if(field["alias"] != null && field["alias"] != "") alias = field["alias"]; 
			sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+alias, "value" : "?"+field["exp"]});
		} else if(field["exp"] == "[*sub]") {
			sparqlTable["getSubQueryResults"] = true;
		} else {
			if(typeof field["parsed_exp"] === 'undefined'){
				if(field["exp"].replace(/ /g, '') == "") {
					messages.push({
						"type" : "Error",
						"message" : "warning: empty attribute compartment in node " + clazz["identification"]["short_name"],
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : false
					});
				} else {
					messages.push({
						"type" : "Error",
						"message" : "Syntax error in attribute expression " + field["fulltext"],
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : true
					});
				}
			} else{
			if(field["alias"] != null && field["alias"].replace(" ", "") !="" && field["alias"].indexOf(" ") >= 0) {
				messages.push({
					"type" : "Error",
						"message" : "Whitespace characters not allowed in property alias " + field["alias"],
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : false
					});
					field["alias"] = field["alias"].replace(/ /g, '_');
				}
				// console.log("parse_attrib",  JSON.stringify(field["parsed_exp"],null,2));
				var result = parse_attrib(field["exp"], attributesNames, clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["short_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable, referenceTable, classMembership, null, knownPrefixes);

				messages = messages.concat(result["messages"]);
				// console.log("ATTRIBUTE", result);
				sparqlTable["variableReferenceCandidate"].concat(result["referenceCandidateTable"]);
				for (var reference in result["referenceCandidateTable"]){
					if(typeof result["referenceCandidateTable"][reference] === 'string') sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
				}
				for (var reference in result["references"]){
					if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
				}

				counter = result["counter"]

				for (var attrname in result["variableNamesClass"]) {
					if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname];
					if(typeof fieldNames[attrname] === 'undefined') fieldNames[attrname] = [];
					if(typeof result["variableNamesClass"][attrname] === 'object')fieldNames[attrname][clazz["identification"]["_id"]] = result["variableNamesClass"][attrname]["alias"];
				}
				for (var prefix in result["prefixTable"]) {
					if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
				}

				// console.log("variableNamesClass", variableNamesClass);
				// console.log("variableNamesAll", variableNamesAll);

				var alias = field["alias"];
				if(alias == null || alias == "") {
					alias = "expr_" + counter;
					counter++;
				} else {
					if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
					fieldNames[alias][clazz["identification"]["_id"]] = alias;
				}

				//agregation in class
				if(result["isAggregate"] == true) {
					if(field["alias"] == null || field["alias"] == "") {
						if(result["isExpression"] == false && result["isFunction"] == false) {

							var indexCole = result["exp"].indexOf(";");
							var endIndex = result["exp"].indexOf(")");
							if(indexCole != -1 && indexCole < endIndex) endIndex = indexCole;

							var tempAlias = result["exp"].substring(result["exp"].indexOf("?")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
							if(typeof variableNamesAll[tempAlias] !== 'undefined') {
								var count = variableNamesAll[tempAlias]["counter"] + 1;
								variableNamesAll[tempAlias]["counter"]  = count;
								alias = tempAlias + "_" + count;

								var classes = [];
								if(typeof variableNamesAll[tempAlias]["classes"] !== 'undefined') classes = variableNamesAll[tempAlias]["classes"];
								classes[clazz["identification"]["_id"]] = tempAlias + "_" + count;
								variableNamesAll[tempAlias]["classes"] = classes;
							}
							else {
								alias = tempAlias;
								var classes = []
								classes[clazz["identification"]["_id"]] = tempAlias;
								variableNamesAll[tempAlias] = {"alias":tempAlias, "nameIsTaken":true, counter:0, "isVar" : false, "classes":classes};
							}

						} else {
							alias = "expr_" + counter;
							counter++;
						}
					}

					if(field["isInternal"] != true)sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					
					//local Aggregation
					tempTripleTable = []
					for (var triple in result["triples"]){
						if(typeof result["triples"][triple] === 'string') tempTripleTable.push(result["triples"][triple]);
					}

					var uniqueTriples = tempTripleTable.filter(function (el, i, arr) {
						return arr.indexOf(el) === i;
					});
					var rootClass = "?" + idTable[clazz["identification"]["_id"]] + " ";
					if(clazz["isUnion"] == true || clazz["isUnit"] == true) rootClass = "";
					var localAggregation = "{SELECT " + rootClass + "(" + result["exp"] + " AS ?" + alias + ") WHERE{";

					if(field["requireValues"] != true && clazz["identification"]["localName"] != "(no_class)") localAggregation = localAggregation + sparqlTable["classTriple"] + " OPTIONAL{";

					localAggregation = localAggregation + uniqueTriples.join(" ");

					if(field["requireValues"] != true) localAggregation = localAggregation + "}";

					localAggregation = localAggregation +"} GROUP BY ?" + idTable[clazz["identification"]["_id"]] +"}";
					sparqlTable["localAggregateSubQueries"].push(localAggregation);
					
					//requireValues
				}

				//function in expression
				else if(result["isFunction"] == true) {
					//functionTriples
					//sparqlTable["functionTriples"].push(getTriple(result, alias, field["requireValues"], true));
					classFunctionTriples.push(getTriple(result, alias, field["requireValues"], true));

					//MAIN SELECT function variables (not undet NOT link and is not internal)
					if(underNotLink != true && field["isInternal"] != true){
						sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						//sparqlTable["selectMain"]["functionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						for (var variable in result["variables"]){
							//if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["functionVariables"].push(result["variables"][variable]);
							if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
						}
					}
				}

				//expression in expression
				else if(result["isExpression"] == true) {
					//expressionTriples
					//sparqlTable["expressionTriples"].push(getTriple(result, alias, field["requireValues"], true));
					classExpressionTriples.push(getTriple(result, alias, field["requireValues"], true));

					// MAIN SELECT expression variables (not undet NOT link and is not internal)
					if(underNotLink != true && field["isInternal"] != true){
						//sparqlTable["selectMain"]["expressionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						for (var variable in result["variables"]){
							//if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["expressionVariables"].push(result["variables"][variable]);
							if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
						}
					}
				}
				//simple triples
				else {
						alias = result["exp"];
						var tempTripleTable = [];

						if(field["requireValues"] == true) tempTripleTable["requireValues"] = true;
						tempTripleTable["triple"] = [];
						for (var triple in result["triples"]){
							if(typeof result["triples"][triple] === 'string')tempTripleTable["triple"].push(result["triples"][triple]);
						}
						//sparqlTable["simpleTriples"].push(tempTripleTable);
						classSimpleTriples.push(tempTripleTable);

						// MAIN SELECT simple variables (not undet NOT link and is not internal)
						if(underNotLink != true && (field["isInternal"] != true || field["exp"].startsWith("?"))){
							if(field["exp"].startsWith("??") == false){
								sparqlTable["selectMain"]["simpleVariables"].push({"alias": alias, "value" : alias});
								for (var variable in result["variables"]){
									if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
								}
							}
						}
				}
			}
		}
	})
	classSimpleTriples = classSimpleTriples.concat(classExpressionTriples);
	classSimpleTriples = classSimpleTriples.concat(classFunctionTriples);
	sparqlTable["simpleTriples"] = classSimpleTriples;

	var isMultipleAllowedAggregation = false;
	var isMultipleAllowedCardinality = false;

	if(clazz["aggregations"].length > 1){
		_.each(clazz["aggregations"],function(field) {
			
			var aggregationParseResult = parseAggregationMultiple(field["parsed_exp"], symbolTable[clazz["identification"]["_id"]]);
				
			if(aggregationParseResult["isMultipleAllowedAggregation"] == true) {
				isMultipleAllowedAggregation = true;
				_.each(clazz["aggregations"],function(field2) {
					if(field != field2){
						var aggregationParseResult = parseAggregationMultiple(field2["parsed_exp"], symbolTable[clazz["identification"]["_id"]]);
						if(aggregationParseResult["isMultipleAllowedCardinality"] == true) isMultipleAllowedCardinality = true;
					}
				})
			}
		})

		// console.log(isMultipleAllowedAggregation, isMultipleAllowedCardinality)
	}

	if(isMultipleAllowedAggregation == true && isMultipleAllowedCardinality == true){
		messages.push({
			"type" : "Error",
			"message" : "Ambiguous aggregation scope due to multiple aggregation expressions in a single node. Place each aggregation expression into a separate node, or ensure that each aggregation body is single-valued (max cardinality 1) with respect to its node in the query.",
			"listOfElementId" : [clazz["identification"]["_id"]],
			"isBlocking" : true
		});
	}

	//aggregations
	_.each(clazz["aggregations"],function(field) {
		if(field["exp"] != ""){
			if(field["alias"] != null && field["alias"].replace(" ", "") !="" && field["alias"].indexOf(" ") >= 0) {
				messages.push({
					"type" : "Error",
					"message" : "Whitespace characters not allowed in aggregation alias " + field["alias"],
					"listOfElementId" : [clazz["identification"]["_id"]],
					"isBlocking" : false
				});
				field["alias"] = field["alias"].replace(/ /g, '_');
			}
			
			if(typeof field["parsed_exp"] === 'undefined'){
				messages.push({
					"type" : "Error",
					"message" : "Syntax error in aggregations expression " + field["fulltext"],
					"listOfElementId" : [clazz["identification"]["_id"]],
					"isBlocking" : true
				});
			} else {
				var result;
				
				if(clazz["isUnit"] != true){
				result = parse_attrib(field["exp"], attributesNames, clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["short_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership,  "aggregation", knownPrefixes);
				
				counter = result["counter"];
				for (var attrname in result["variableNamesClass"]) {
					if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname];
				}} else {
					result = parse_attrib(field["exp"], [], clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["short_name"], [], [], counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership,  "aggregation", knownPrefixes);
				}
				messages = messages.concat(result["messages"]);
				for (var prefix in result["prefixTable"]) {
					if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
				}
				var alias = field["alias"];
				if(alias == null || alias == "") {
					if(result["isExpression"] == false && result["isFunction"] == false) {

						var indexCole = result["exp"].indexOf(";");
						var endIndex = result["exp"].indexOf(")");
						if(indexCole != -1 && indexCole < endIndex) endIndex = indexCole;

						var tempAlias = result["exp"].substring(result["exp"].indexOf("?")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
						if(typeof variableNamesAll[tempAlias] !== 'undefined') {
							var count = variableNamesAll[tempAlias]["counter"] + 1;
							variableNamesAll[tempAlias]["counter"]  = count;
							alias = tempAlias + "_" + count;

							var classes = [];
							if(typeof variableNamesAll[tempAlias]["classes"] !== 'undefined') classes = variableNamesAll[tempAlias]["classes"];
							classes[clazz["identification"]["_id"]] = alias;
							variableNamesAll[tempAlias]["classes"] = classes;
						}
						else {
							alias = tempAlias;
							var classes = []
							classes[clazz["identification"]["_id"]] = tempAlias;
							variableNamesAll[tempAlias] = {"alias":tempAlias, "nameIsTaken":true, counter:0, "isVar" : false, "classes" : classes};
						}

					} else {
						alias = "expr_" + counter;
						counter++;
					}
				}
				if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
				fieldNames[alias][clazz["identification"]["_id"]] = alias;

				//aggregateTriples only in main class or subselect main class
				if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
					sparqlTable["agregationInside"] = true;
					var triple = getTriple(result, alias, field["requireValues"], false);
					if(field["requireValues"] != true){
						for(var t in triple["triple"]){
							triple["triple"][t] = "OPTIONAL{" + triple["triple"][t] + "}";
						}
					}
					// if(field["requireValues"] != true) triple = "OPTIONAL{" + triple "}";
					sparqlTable["aggregateTriples"].push(triple);
					//MAIN SELECT agregate variables
					if(result["exp"] != "")sparqlTable["selectMain"]["aggregateVariables"].push({"alias": "?" + alias, "value" : result["exp"]});

					for (var variable in result["variables"]){
						if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["aggregateVariables"].push(result["variables"][variable]);
					}
					
				} else {
					//Interpreter.showErrorMsg("Aggregate functions are not allowed in '" + clazz["identification"]["localName"] + "' class. Use aggregate functions in query main class or subquery main class.", -3);
					messages.push({
						"type" : "Error",
						"message" : "Aggregate functions are not allowed in '" + clazz["identification"]["localName"] + "' class. Use aggregate functions in query main class or subquery main class.",
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : true
					});
				}
			}
		}
	})

	//conditions
	_.each(clazz["conditions"],function(condition) {
		if(typeof condition["parsed_exp"] === 'undefined'){
				messages.push({
					"type" : "Error",
					"message" : "Syntax error in condition expression " + condition["exp"],
					"listOfElementId" : [clazz["identification"]["_id"]],
					"isBlocking" : true
				});
		} else { 
			console.log("ccccccccccc", condition)
			var result = parse_filter(condition, attributesNames, clazz["identification"]["_id"], condition["parsed_exp"], instance, clazz["identification"]["short_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, sparqlTable["classTriple"], parameterTable, idTable, referenceTable, classMembership, knownPrefixes);
			messages = messages.concat(result["messages"]);
			// console.log("FILTER", result);
			for (var reference in result["referenceCandidateTable"]){
				if(typeof result["referenceCandidateTable"][reference] === 'string')sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
			};
			for (var reference in result["references"]){
				if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
			}

			counter = result["counter"]
			// for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
			for (var attrname in result["variableNamesClass"]) {
				if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname];
			}
			for (var attrname in result["expressionLevelNames"]) {
				if(typeof result["expressionLevelNames"][attrname] === 'string') {
					if(typeof variableNamesAll[attrname] === 'undefined') {
						var classes = []
						classes[clazz["identification"]["_id"]] = result["expressionLevelNames"][attrname];
						variableNamesAll[attrname] = {"alias": result["expressionLevelNames"][attrname], "nameIsTaken": true, counter:0, "isVar" : false, "classes":classes};
					}
				}
			}
			for (var prefix in result["prefixTable"]) {
				if(typeof result["prefixTable"][prefix] === 'string')  prefixTable[prefix] = result["prefixTable"][prefix];
			}

			var tempTripleTable = [];
			tempTripleTable["triple"] = [];
			for (var triple in result["triples"]){
				if(typeof result["triples"][triple] === 'string') tempTripleTable["triple"].push(result["triples"][triple]);
			}
			sparqlTable["filterTriples"].push(tempTripleTable);
			if(result["exp"] != "") sparqlTable["filters"].push("FILTER(" + result["exp"] + ")");
		}
		// console.log("CONDITION", result["exp"], result, instance, sparqlTable["classTriple"]);
	})

	//subClasses
	if(clazz["children"].length > 0){
		sparqlTable["subClasses"] = []; // class all sub classes
	};
	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string') {
			//if(typeof variableNamesAll[attrname] === 'undefined')
				var classes = [];
				classes[clazz["identification"]["_id"]] = variableNamesClass[attrname]["alias"];
				variableNamesAll[attrname] = {"alias": variableNamesClass[attrname]["alias"], "nameIsTaken": variableNamesClass[attrname]["nameIsTaken"], "counter":variableNamesClass[attrname]["counter"], "isVar" : variableNamesClass[attrname]["isVar"], "classes" : classes};
		}
	}
	_.each(clazz["children"],function(subclazz) {
		var tempUnderNotLink = underNotLink;
		
		if(subclazz["linkType"] == 'NOT') underNotLink = true;

		var temp = forAbstractQueryTable(attributesNames, subclazz, clazz, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes);

		messages = messages.concat(temp["messages"]);
		counter = temp["counter"];
		for (var attrname in temp["variableNamesAll"]) {
			if(typeof temp["variableNamesAll"][attrname] === 'string') {
				variableNamesClass[attrname] = {"alias": temp["variableNamesAll"][attrname]["alias"], "nameIsTaken": temp["variableNamesAll"][attrname]["nameIsTaken"], "counter":temp["variableNamesAll"][attrname]["counter"], "isVar" : temp["variableNamesAll"][attrname]["isVar"]};
				//variableNamesClass[attrname] = {"alias":temp["variableNamesAll"][attrname], "isvar" : false};
			}
		}
		for (var prefix in temp["prefixTable"]) {
			if(typeof temp["prefixTable"][prefix] === 'string') prefixTable[prefix] = temp["prefixTable"][prefix];
		}
		underNotLink = tempUnderNotLink;
		//link triple
		//if(typeof subclazz["linkIdentification"]["localName"] !== 'undefined'){

			// if((subclazz["linkIdentification"]["localName"] == null || subclazz["linkIdentification"]["localName"] == "") && subclazz["identification"]["localName"] != "[ ]" && subclazz["isUnion"] != true && subclazz["isUnit"] != true && subclazz["identification"]["localName"] != "[ + ]") {
			if(subclazz["linkIdentification"]["localName"] == null || subclazz["linkIdentification"]["localName"] == "") {
				//console.log(subclazz, clazz);
				// clazz["identification"]["_id"]
				//Interpreter.showErrorMsg("Empty link label in the query.\nUse label '++' for query link without instance relation.\nTo hide the default link name, use Extra->'Hide default link name' check box.")
				messages.push({
					"type" : "Error",
					// "message" : "Empty link label in the query.\nUse label '++' for query link without instance relation.\nTo hide the default link name, use Extra->'Hide default link name' check box.",
					"message" : "Empty link between nodes ("+ clazz["identification"]["localName"] +") and ("+  subclazz["identification"]["localName"] +"). Please specify the link property or ++ for the link without property.",
					"listOfElementId" : [subclazz["linkIdentification"]["_id"]],
					"isBlocking" : false
				});
			}

			if(subclazz["linkIdentification"]["localName"] != null && subclazz["linkIdentification"]["localName"] != "++"){
				var subject, preditate, object;
				if(subclazz["linkIdentification"]["localName"].startsWith('?')) {
					if(subclazz["linkIdentification"]["localName"].startsWith('??') == true) {
						if(subclazz["linkIdentification"]["localName"] == "??") {
							preditate = " ?property";

							var tempAlias = "?property_";

							var vn = "property";
							if(typeof variableNamesClass[vn]=== 'undefined'){
								if(typeof variableNamesAll[vn]=== 'undefined'){
									//expressionLevelNames[vn] = vn;
									preditate = " ?" + vn;
									variableNamesClass[vn] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
									var classes = [];
									classes[clazz["identification"]["_id"]] = tempAlias;
									variableNamesAll[vn] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false, "classes" : classes};
									//alias = tempAlias;
								} else {
									var count = variableNamesAll[vn]["counter"] + 1;
									//expressionLevelNames[vn] = vn + "_" +count;
									preditate = " ?" + vn + "_" +count;
									variableNamesAll[vn]["counter"] = count;

									var classes = [];
									if(typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
									classes[clazz["identification"]["_id"]] = tempAlias + "_" +count;
									variableNamesAll[vn]["classes"] = classes;

									variableNamesClass[vn] = {"alias" : tempAlias + "_" +count, "nameIsTaken" : variableNamesAll[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[vn]["isVar"]};
									//alias = tempAlias + "_" +count;
								}
							} else {
								var count = variableNamesClass[vn]["counter"] + 1;
								//expressionLevelNames[vn] = vn + "_" +count;
								preditate = " ?" + vn + "_" +count;
								variableNamesClass[vn]["counter"] = count;

								var classes = [];
								if(typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
								classes[clazz["identification"]["_id"]] = tempAlias + "_" +count;

								variableNamesAll[vn] = {"alias" : tempAlias + "_" +count, "nameIsTaken" : variableNamesClass[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[vn]["isVar"], "classes" : classes};
								//alias = tempAlias + "_" +count;
							}
							//preditate = "?"+expressionLevelNames[vn];
							// if(isInternal !=true) SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn] + " " + tempAlias;
							// else SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn];
							// tripleTable.push({"var":alias, "prefixedName":"?"+expressionLevelNames[vn], "object":className, "inFilter":false});


						}
						else preditate = " " + subclazz["linkIdentification"]["localName"].substring(1);
					}
					else preditate = " " + subclazz["linkIdentification"]["localName"];
					if(subclazz["linkType"] != 'NOT' && subclazz["linkIdentification"]["localName"].startsWith('??') != true) temp["sparqlTable"]["linkVariableName"] = subclazz["linkIdentification"]["localName"];
				} else {
					preditate = " " + getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"]) +":" + subclazz["linkIdentification"]["localName"];
					if(typeof subclazz["linkIdentification"]["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in link expression " + subclazz["linkIdentification"]["localName"],
							"listOfElementId" : [clazz["identification"]["_id"]],
							"isBlocking" : true
						});
					} else{
						// if(typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] !== 'undefined' && subclazz["linkIdentification"]["localName"] != "=="){
						if(typeof subclazz["linkIdentification"]["parsed_exp"]["PathProperty"] !== 'undefined' && subclazz["linkIdentification"]["localName"] != "=="){
							// var path = getPath(subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"]);
							var path = getPathFullGrammar(subclazz["linkIdentification"]["parsed_exp"]);

							if(path["messages"].length > 0){
								messages = messages.concat(path["messages"]);
							} else {
								for (var prefix in path["prefixTable"]) {
									if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
								}
								preditate = " " + path["path"];
							}
						}
						var namespace = subclazz["linkIdentification"]["Namespace"];
						if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
						// if(subclazz["linkIdentification"]["localName"] != "==" && typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] === 'undefined') prefixTable[getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"])+":"] = "<"+namespace+">";
					}
				}
				if(subclazz["isInverse"] == true) {
					if(clazz["isUnion"] != true) object = instance;
					else if (clazz["isUnion"] == true && parentClass == null) object = null;
					else object = idTable[parentClass["identification"]["_id"]];
					subject = idTable[subclazz["identification"]["_id"]];
				} else {
					if(clazz["isUnion"] != true) subject = instance;
					else if (clazz["isUnion"] == true && parentClass == null) subject = null;
					else subject = idTable[parentClass["identification"]["_id"]];
					object = idTable[subclazz["identification"]["_id"]];
				}
				// if is global subQuery then no need in link between classes
				if(subclazz["linkIdentification"]["localName"] != "==" && subject != null && object != null && preditate != null && preditate.replace(" ", "") !=""){
					var subjectName = subject;
					if(subjectName.indexOf("://") != -1) subjectName = "<" + subjectName + ">";
					else if(subjectName.indexOf(":") != -1){
						//TODO add prefix
					} else subjectName = "?" + subjectName;

					var objectName = object;
					if(objectName.indexOf("://") != -1) objectName = "<" + objectName + ">";
					else if(objectName.indexOf(":") != -1){
						//TODO add prefix
					} else objectName = "?" + objectName;

					temp["sparqlTable"]["linkTriple"] = subjectName +  preditate + " " + objectName + ".";
				} else{
					if(preditate == null || preditate.replace(" ", "") =="") {
						//Interpreter.showErrorMsg("Unknown property '" + subclazz["linkIdentification"]["localName"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unrecognized link property or property path '" + subclazz["linkIdentification"]["localName"] + "'. Please specify link property or property path from ontology.",
							"listOfElementId" : [subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
					else if(subject == null && clazz["isUnion"] != true) {
						//Interpreter.showErrorMsg("Unknown subject class '" + subclazz["identification"]["localName"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unknown subject class '" + subclazz["identification"]["localName"] + "'",
							"listOfElementId" : [subclazz["identification"]["_id"], subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
					else if(object == null) {
						//Interpreter.showErrorMsg("Unknown object class '" + parentClass["identification"]["localName"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unknown object class '" + parentClass["identification"]["localName"] + "'",
							"listOfElementId" : [parentClass["identification"]["_id"], subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
				}
				// if(subclazz["linkIdentification"]["localName"] == "==") sparqlTable["filters"].push("FILTER(" + "?" + subject + " = " + "?" + object +")");
				if(subclazz["linkIdentification"]["localName"] == "==") {
					temp["sparqlTable"]["equalityLink"] = true;
				}
			}

			temp["sparqlTable"]["linkType"] = subclazz["linkType"];
			// if(subclazz["identification"]["localName"] == "(no_class)" || (subclazz["instanceAlias"] == null && (subclazz["identification"]["localName"] == "" || subclazz["identification"]["localName"] == null))) temp["sparqlTable"]["linkType"] = "REQUIRED";
			temp["sparqlTable"]["isSubQuery"] = subclazz["isSubQuery"];
			temp["sparqlTable"]["isGlobalSubQuery"] = subclazz["isGlobalSubQuery"];

			if(subclazz["isSubQuery"] == true || subclazz["isGlobalSubQuery"] == true){
				 //HAVING
				// temp["sparqlTable"]["having"] = getHaving(subclazz["havingConditions"]);

				//ORDER BY
				temp["sparqlTable"]["order"] = getOrderBy(subclazz["orderings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix, referenceTable, subclazz["classMembership"], knownPrefixes, symbolTable);

				//GROUP BY

				temp["sparqlTable"]["groupBy"] = getGroupBy(subclazz["groupings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix, referenceTable, symbolTable, subclazz["classMembership"], knownPrefixes);

				messages = messages.concat(temp["sparqlTable"]["order"]["messages"]);
				messages = messages.concat(temp["sparqlTable"]["groupBy"]["messages"]);

				//OFFSET
				temp["sparqlTable"]["offset"] = subclazz["offset"];

				 //LIMIT
				 temp["sparqlTable"]["limit"] = subclazz["limit"];
			}
		//}

		sparqlTable["subClasses"].push(temp["sparqlTable"]);
	})

	//conditionLinks
	_.each(clazz["conditionLinks"],function(condLink) {
		if(clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + idTable[condLink["target"]], "value" : "?" + idTable[condLink["target"]]});
		var sourse, target;
		if(condLink["isInverse"] == true) {
			target = "?" + idTable[clazz["identification"]["_id"]];
			sourse = "?" + idTable[condLink["target"]];
		} else {
			target = "?" + idTable[condLink["target"]];
			sourse = "?" + idTable[clazz["identification"]["_id"]];
		}
		
		var triple = "";
		
		if(typeof condLink["identification"]["parsed_exp"]["PathProperty"] !== 'undefined' && condLink["identification"]["localName"] != "=="){
			if(typeof condLink["identification"]["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in condition link expression " + condLink["identification"]["localName"],
							"listOfElementId" : [clazz["identification"]["_id"]],
							"isBlocking" : true
						});
			} else {
				var path = getPathFullGrammar(condLink["identification"]["parsed_exp"]);
				// console.log(path);
				if(path["messages"].length > 0){
					messages = messages.concat(path["messages"]);
				} else {
					for (var prefix in path["prefixTable"]) {
						if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
					}
					triple = sourse + " " + path["path"] + " " + target + ".";
				}
			}
		} else {
			triple = sourse + " " + getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) + ":" + condLink["identification"]["localName"] + " " + target + ".";
			var namespace = condLink["identification"]["Namespace"]
			if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
			prefixTable[getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) +":"] = "<"+namespace+">";
		}
		
		
		if(condLink["isNot"] == true) triple = "FILTER NOT EXISTS{" + triple + "}";
		sparqlTable["conditionLinks"].push(triple);
		
	})

	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string'){
			//variableNamesAll[attrname] = variableNamesClass[attrname]["alias"];

			var classes = [];
			if(typeof variableNamesAll[attrname]["classes"] !== 'undefined') classes = variableNamesAll[attrname]["classes"];
			classes[clazz["identification"]["_id"]] = variableNamesClass[attrname]["alias"];

			variableNamesAll[attrname] = {"alias": variableNamesClass[attrname]["alias"], "nameIsTaken":variableNamesClass[attrname]["nameIsTaken"], "counter":variableNamesClass[attrname]["counter"], "isVar":variableNamesClass[attrname]["isVar"], "classes" : classes};
		}
	}

	/*_.each(clazz["fields"],function(field) {
		if(field["exp"] == "[*sub]"){
			var st = symbolTable[clazz["identification"]["_id"]];
			for (var symbol in st) {
				for (var s in st[symbol]) {
					if(typeof st[symbol][s]["upBySubQuery"] !== 'undefined' && st[symbol][s]["upBySubQuery"] == true) {
						if(typeof variableNamesAll[symbol] !== 'undefined' && typeof variableNamesAll[symbol]["classes"] !== 'undefined' && typeof variableNamesAll[symbol]["classes"][st[symbol][s]["context"]] !== "undefined") sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+variableNamesAll[symbol]["classes"][st[symbol][s]["context"]], "value" : "?"+variableNamesAll[symbol]["classes"][st[symbol][s]["context"]]});
						else sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+symbol, "value" : "?"+symbol});
					}
				}
			}

		}
	})*/
	// console.log("variableNamesAll", variableNamesAll, variableNamesClass)
	// console.log("sparqlTable", JSON.stringify(sparqlTable,null,2), sparqlTable)
	return {variableNamesAll:variableNamesAll, sparqlTable:sparqlTable, prefixTable:prefixTable, counter:counter, fieldNames:fieldNames, messages:messages};
}

function getOrderBy(orderings, fieldNames, rootClass_id, idTable, emptyPrefix, referenceTable, classMembership, knownPrefixes, symbolTable){

	//console.log("orderings", orderings)
	// console.log("fieldNames", fieldNames)
	 // console.log("symbolTable", symbolTable)

	var messages = [];
	var orderTable = [];
	var orderTripleTable = [];
	var orderGroupBy = [];
	_.each(orderings,function(order) {
		if(order["exp"] != null && order["exp"].replace(" ", "") !=""){
			if(order["exp"].startsWith("?")){
				if(typeof fieldNames[order["exp"].substring(1)] !== "undefined"){
					var descendingStart = "";
					var descendingEnd = "";
					if(order["isDescending"] == true) {
						descendingStart = "DESC("
						descendingEnd = ")"
					}
					orderTable.push(descendingStart +  order["exp"] + descendingEnd + " ");
				} else {
					messages.push({
						"type" : "Warning",
						"message" : "Order by field can not contain new explicit variables (e.g. " + order["exp"] + "). Use the form without ? (e.g. " + order["exp"].substring(1) + ") to refer to variable introduced elsewhere.",
						"listOfElementId":[rootClass_id],
						"isBlocking" : true
					});
				}
			} else {
				var descendingStart = "";
				var descendingEnd = "";
				if(order["isDescending"] == true) {
					descendingStart = "DESC("
					descendingEnd = ")"
				}
				var orderName = order["exp"];
				if(orderName.search(":") != -1) orderName = orderName.substring(orderName.search(":")+1);
				if(typeof fieldNames[orderName] !== 'undefined'){
					var result = fieldNames[orderName][rootClass_id];
					if(typeof result === 'undefined'){
						if(typeof symbolTable[rootClass_id] !== 'undefined' && typeof symbolTable[rootClass_id][orderName] !== 'undefined'){
							for(var attrName in symbolTable[rootClass_id][orderName]){
								if(typeof symbolTable[rootClass_id][orderName][attrName]["upBySubQuery"] !== "undefined" && symbolTable[rootClass_id][orderName][attrName]["upBySubQuery"] == 1){
									result =  fieldNames[orderName][symbolTable[rootClass_id][orderName][attrName]["context"]];
									break;
								}
							}
						}
						if(typeof result === 'undefined'){
							for (var ordr in fieldNames[orderName]) {
								result = fieldNames[orderName][ordr];
								break;
							}
						}
					}



					if(!result.startsWith("?")) result = "?" + result;
					orderTable.push(descendingStart +  result + descendingEnd + " ");

					var isAgretedAlias = false;
					if(typeof symbolTable["root"] !== 'undefined' && typeof symbolTable["root"][orderName] !== 'undefined'){
							for(var attrName in symbolTable["root"][orderName]){
								if(symbolTable["root"][orderName][attrName]["kind"] == "AGGREGATE_ALIAS") isAgretedAlias = true;
							}
						}

					if(isAgretedAlias!=true)orderGroupBy.push(result);
				} else {
					if(typeof order["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in order expression " + order["fulltext"],
							"listOfElementId" : [rootClass_id],
							"isBlocking" : true
						});
					}else{
						var result = parse_attrib(order["exp"], [], rootClass_id, order["parsed_exp"], null, idTable[rootClass_id], idTable[rootClass_id], [], [], 0, emptyPrefix, [], false, [], idTable, referenceTable, classMembership, null, knownPrefixes);
						 messages = messages.concat(result["messages"]);
						 if(result["isAggregate"] == false && result["isExpression"] == false && result["isFunction"] == false && result["triples"].length > 0){
							 orderTable.push(descendingStart +  result["exp"] + descendingEnd + " ");
							 orderGroupBy.push(result["exp"]);
							 orderTripleTable.push(result["triples"]);
						 } else {
							 descendingStart = "(";
							 descendingEnd = ")";
							 if(order["isDescending"] == true) {
								descendingStart = "DESC("
								descendingEnd = ")"
							 }
							 
							 orderTable.push(descendingStart + result["exp"] + descendingEnd + " ");
							 //orderGroupBy.push(result["exp"]);
							 orderTripleTable.push(result["triples"]);
							 console.log("ccccccccc", result)
							 messages.push({
								"type" : "Warning",
								"message" : "ORDER BY allowed only over explicit selection fields, " + order["exp"] + " is not a selection field",
								"listOfElementId":[rootClass_id],
								"isBlocking" : false
							 });
						 }
					}
				}
			}
		}
	})

	//if(messages.length > 0) Interpreter.showErrorMsg(messages.join("\n"), -3);

	orderTable = orderTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return {"orders":orderTable.join(" "), "triples":orderTripleTable, "messages":messages, "orderGroupBy":orderGroupBy};
}

function getGroupBy(groupings, fieldNames, rootClass_id, idTable, emptyPrefix, referenceTable, symbolTable, classMembership, knownPrefixes){
	var messages = [];
	//var orderTable = [];
	var groupTripleTable = [];
	var orderGroupBy = [];

	_.each(groupings,function(group) {
		if(group["exp"] != null && group["exp"].replace(" ", "") !=""){
			var groupName = group["exp"];
			if(groupName.search(":") != -1) groupName = groupName.substring(groupName.search(":")+1);
			if(typeof fieldNames[groupName] !== 'undefined'){
				var result = fieldNames[groupName][rootClass_id];
				if(typeof result === 'undefined'){
					for (var ordr in fieldNames[groupName]) {
						result = fieldNames[groupName][ordr];
						break;
					}
				}
				//orderTable.push(descendingStart +  "?" + result + descendingEnd + " ");
				orderGroupBy.push("?" + result);
			} else if(typeof symbolTable[rootClass_id][groupName] !== 'undefined'){
				var result =  groupName;
				orderGroupBy.push("?" + result);
			} else {
				if(typeof group["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in group expression " + group["fulltext"],
							"listOfElementId" : [rootClass_id],
							"isBlocking" : true
						});
				} else{
					var result = parse_attrib(group["exp"], [], rootClass_id, group["parsed_exp"], null, idTable[rootClass_id],idTable[rootClass_id], [], [], 0, emptyPrefix, [], false, [], idTable, referenceTable, classMembership, null, knownPrefixes);
					 messages = messages.concat(result["messages"]);
					 if(result["isAggregate"] == false && result["isExpression"] == false && result["isFunction"] == false && result["triples"].length > 0){
						 //orderTable.push(descendingStart +  result["exp"] + descendingEnd + " ");
						 orderGroupBy.push(result["exp"]);
						 groupTripleTable = groupTripleTable.concat(result["triples"]);
					 } else {
						 messages.push({
							"type" : "Warning",
							"message" : "GROUP BY allowed only over explicit selection fields, " + group["exp"] + " is not a selection field",
							"listOfElementId":[rootClass_id],
							"isBlocking" : false
						 });
					 }
				}
			}
		}
	})

	//if(messages.length > 0) Interpreter.showErrorMsg(messages.join("\n"), -3);

	orderGroupBy = orderGroupBy.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return {"triples":groupTripleTable, "messages":messages, "groupings":orderGroupBy};
}

// generete HAVING info
function getHaving(havingConditions){
	var havingTable = [];

	_.each(havingConditions,function(having) {
		//TODO dabut izparseto izteiksmi
		havingTable.push("FILTER(" + having["exp"] + ")");
	})

	// remove duplicates
	var uniqueTriples = havingTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return uniqueTriples.join("\n");
}

function getTriple(result, alias, required, notAgrageted){

	var tempTripleTable = [];
	if(notAgrageted == true)tempTripleTable["bind"] = "BIND(" + result["exp"] + " AS ?" + alias + ")";
	if(required == true && notAgrageted == true)tempTripleTable["bound"] = "FILTER(BOUND(?" + alias + "))";
	tempTripleTable["triple"] = [];
	for (var triple in result["triples"]){
		tempTripleTable["triple"].push(result["triples"][triple]);
	}
	if(result["isTimeFunction"] == true) tempTripleTable["isTimeFunction"] = true;

	return tempTripleTable;
}

// genrerate SPARQL WHERE info
// sparqlTable - table with sparql parts
function generateSPARQLWHEREInfo(sparqlTable, ws, fil, lin, referenceTable, SPARQL_interval){

	var whereInfo = [];
	var filters = [];
	var links = [];
	var bind = [];
	var messages = [];
	var attributesAggerations = [];
	var subSelectResult = [];

	//full SPARQL starts with SELECT
	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) attributesAggerations.unshift("{" + sparqlTable["fullSPARQL"] + "}");
	}

	// simpleTriples
	for (var expression in sparqlTable["simpleTriples"]){
		var generateTimeFunctionForVirtuoso = true;
		if(generateTimeFunctionForVirtuoso == true && sparqlTable["simpleTriples"][expression]["isTimeFunction"] == true){
			var timeExpression = [];
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				for (var triple in sparqlTable["simpleTriples"][expression]["triple"]){
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					}
				}
			}
			if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bind"]);
			if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bound"]);
			attributesAggerations.push("OPTIONAL{" + "\n"+SPARQL_interval + sparqlTable["classTriple"] + "\n"+SPARQL_interval + timeExpression.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}");
		}
		else {
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				for (var triple in sparqlTable["simpleTriples"][expression]["triple"]){
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')){ 
							attributesAggerations.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						}else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) {
							attributesAggerations.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						}else {
							attributesAggerations.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
						}
					}
				}
			}
			if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bind"]);
			if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bound"]);
		}
	}

	// aggregateTriples
	for (var expression in sparqlTable["aggregateTriples"]){
		if(typeof sparqlTable["aggregateTriples"][expression] === 'object'){
			for (var triple in sparqlTable["aggregateTriples"][expression]["triple"]){
				if(typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') attributesAggerations.push(sparqlTable["aggregateTriples"][expression]["triple"][triple]);
			}
		}
	}

	// localAggregateSubQueries
	for (var expression in sparqlTable["localAggregateSubQueries"]){
		if(typeof sparqlTable["localAggregateSubQueries"][expression] === 'string'){
			attributesAggerations.push(sparqlTable["localAggregateSubQueries"][expression]);
		}
	}

	attributesAggerations = attributesAggerations.concat(bind);

	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") != true) attributesAggerations.push(sparqlTable["fullSPARQL"]);
	}

	// filterTriples
	for (var expression in sparqlTable["filterTriples"]){
		if(typeof sparqlTable["filterTriples"][expression] === 'object'){
			for (var triple in sparqlTable["filterTriples"][expression]["triple"]){
				if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') attributesAggerations.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
			}
		}
		if(typeof sparqlTable["filterTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["filterTriples"][expression]["bind"]);
		if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') bind.push(sparqlTable["filterTriples"][expression]["bound"]);
	}

	//filters
	for (var expression in sparqlTable["filters"]){
		if(typeof sparqlTable["filters"][expression] === 'string'){
			filters.push(sparqlTable["filters"][expression].replace(/\n/g, '\n'+SPARQL_interval));
		}
	}

	//link
	if(typeof sparqlTable["linkTriple"] === 'string'){
		links.push(sparqlTable["linkTriple"]);
	}

	//conditionLinks
	for (var expression in sparqlTable["conditionLinks"]){
		if(typeof sparqlTable["conditionLinks"][expression] === 'string'){
			links.push(sparqlTable["conditionLinks"][expression]);
		}
	}

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				if(sparqlTable["subClasses"][subclass]["isUnion"] == true) {
					var unionResult = getUNIONClasses(sparqlTable["subClasses"][subclass], sparqlTable["class"], sparqlTable["classTriple"], false, referenceTable, SPARQL_interval)

					if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == false && sparqlTable["subClasses"][subclass]["isSubQuery"] == false){
						if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") unionResult["result"] = "OPTIONAL{\n" + unionResult["result"] + "\n}";
						if(sparqlTable["subClasses"][subclass]["linkType"] == "NOT") unionResult["result"] = "FILTER NOT EXISTS{\n" + unionResult["result"] + "\n}";
					}
					whereInfo.push(unionResult["result"]);
					messages = messages.concat(unionResult["messages"]);
				}
				else if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var SPARQL_interval_temp = SPARQL_interval;
					if(typeof sparqlTable["linkType"] === 'string' && (sparqlTable["linkType"] == "OPTIONAL" || sparqlTable["linkType"] == "NOT")) SPARQL_interval_temp = SPARQL_interval_temp+"  ";
					
					var temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable, SPARQL_interval_temp);
					filters = filters.concat(temp["filters"]);
					links = links.concat(temp["links"]);
					whereInfo = whereInfo.concat(temp["triples"]);
					messages = messages.concat(temp["messages"]);
				}else {
					//sub selects
					var selectResult = generateSELECT(sparqlTable["subClasses"][subclass], false);
					
					if(sparqlTable["getSubQueryResults"] == true) {
						subSelectResult = subSelectResult.concat(selectResult["select"]);
						subSelectResult = subSelectResult.concat(selectResult["aggregateAliases"]);
					}

					//reference candidates
					var refTable = [];
					for (var ref in selectResult["variableReferenceCandidate"]){
						if(typeof selectResult["variableReferenceCandidate"][ref] === 'string'){
							if(checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
						}
					}

					var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval+"  ");
					if(sparqlTable["getSubQueryResults"] == true) subSelectResult = subSelectResult.concat(wheresubInfo["subSelectResult"]);

					var temp = wheresubInfo["triples"];
					temp = temp.concat(wheresubInfo["filters"]);
					temp = temp.concat(wheresubInfo["links"]);
					messages = messages.concat(wheresubInfo["messages"]);

					var tempSelect = refTable;
					tempSelect= tempSelect.concat(selectResult["select"]);
					tempSelect= tempSelect.concat(selectResult["aggregate"]);
					tempSelect= tempSelect.concat(wheresubInfo["subSelectResult"]);

					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						var tempTable = selectResult["select"];
						tempTable = tempTable.concat(selectResult["aggregate"]);
						if(tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true){

							var subQuery = "{SELECT " ;

							//DISTINCT	
							if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true && sparqlTable["subClasses"][subclass]["selectAll"] != true) subQuery = subQuery + "DISTINCT ";
							else if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							var parentClass = "";

							// if(sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
							if(sparqlTable["isUnion"] == false && sparqlTable["isUnit"] == false) {
								parentClass = sparqlTable["class"] //+ " ";

								selectResult["groupBy"].unshift(sparqlTable["class"]);
							}
							if(sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true) parentClass = "";
							else tempSelect.unshift(parentClass);

							tempSelect = tempSelect.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});

							// subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
							
							var SPARQL_interval_sub = SPARQL_interval.substring(2);
							subQuery = subQuery + tempSelect.join(" ") + " WHERE{\n";


							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL"){
								// temp.push(sparqlTable["subClasses"][subclass]["classTriple"]);
								temp.unshift(sparqlTable["classTriple"]);
							}

							//ORDER BY
							var orderBy = sparqlTable["subClasses"][subclass]["order"];
							//ad triples from order by
							temp = temp.concat(orderBy["triples"])

							//GROUP BY
							var groupByFromFields = sparqlTable["subClasses"][subclass]["groupBy"];
							//ad triples from group by
							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) {
								temp = temp.concat(groupByFromFields["triples"])
							}

							var temp = temp.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});



							selectResult["groupBy"] = selectResult["groupBy"].concat(refTable);
							selectResult["groupBy"] = selectResult["groupBy"].concat(orderBy["orderGroupBy"]);
							selectResult["groupBy"] = selectResult["groupBy"].concat(groupByFromFields["groupings"]);

							selectResult["groupBy"] = selectResult["groupBy"].filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});

							var groupBy = selectResult["groupBy"].join(" ");

							var SPARQL_interval_sub_temp = SPARQL_interval;
							
							//SELECT DISTINCT
							if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) {
								// var selectDistinct = selectResult["groupBy"];
								// selectDistinct = selectDistinct.concat(selectResult["innerDistinct"]);
								// selectDistinct = selectDistinct.filter(function (el, i, arr) {
									// return arr.indexOf(el) === i;
								// });
								
								// subQuery = subQuery +SPARQL_interval+"SELECT DISTINCT " + selectDistinct.join(" ") + " WHERE{\n";
								// SPARQL_interval_sub_temp = SPARQL_interval+"  ";
								
								messages.push({
									"type" : "Warning",
									"message" : "Select distinct not available for values included in aggregate functions. To aggregate over distinct values, include distinct modifier inside the aggregate function (or select the values in this node and aggregate in outer query (Re-shape Query -> Add outer query)).",
									// "listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
									"isBlocking" : true
								});
							}


							subQuery = subQuery +SPARQL_interval_sub_temp+temp.join("\n"+SPARQL_interval_sub_temp)  + "}";


							if(groupBy != "") groupBy = "\n"+SPARQL_interval+"GROUP BY " + groupBy;

							// if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


							//ORDER BY
							 if (orderBy["orders"] != "") subQuery = subQuery + "\n"+SPARQL_interval+"ORDER BY " + orderBy["orders"];

							 //OFFSET
							 if (sparqlTable["subClasses"][subclass]["offset"] != null) {
								if(!isNaN(sparqlTable["subClasses"][subclass]["offset"])) subQuery = subQuery + "\n"+SPARQL_interval+"OFFSET " + sparqlTable["subClasses"][subclass]["offset"];
								else {
									//Interpreter.showErrorMsg("OFFSET should contain only numeric values");
									 messages.push({
										"type" : "Warning",
										"message" : "OFFSET should contain only numeric values",
										"listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
										"isBlocking" : false
									 });
								}
							 }
							 //LIMIT
							if (sparqlTable["subClasses"][subclass]["limit"] != null) {
								if(!isNaN(sparqlTable["subClasses"][subclass]["limit"])) subQuery = subQuery + "\n"+SPARQL_interval+"LIMIT " + sparqlTable["subClasses"][subclass]["limit"];
								else {
									//Interpreter.showErrorMsg("LIMIT should contain only numeric values");
									 messages.push({
										"type" : "Warning",
										"message" : "LIMIT should contain only numeric values",
										"listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
										"isBlocking" : false
									 });
								}
							}
							subQuery = subQuery + "\n"+SPARQL_interval_sub+"}";

							whereInfo.unshift(subQuery);
						} else {
							var isMessage = false;
							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL"){
								isMessage = true;
								messages.push({
									"type" : "Warning",
									"message" : "A subquery can be optional only if it returns a value (Subqueries without return values act as filters. Filters can not be optional).",
									//"listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
									"isBlocking" : true
								});
							}
							if(isMessage == false){
								//var subQuery = "FILTER(EXISTS{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"})"
								// sparqlTable["subClasses"][subclass]["selectAll"] != true
								var distinct = "";
								if(sparqlTable["subClasses"][subclass]["selectAll"] != true)distinct = "DISTINCT ";
								
								var subQuery = "{SELECT " + distinct + sparqlTable["class"]+ " WHERE{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}}"
								whereInfo.unshift(subQuery);
							}
						}

					} else if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true){
						whereInfo.push("MINUS{" + temp.join("\n")+ "\n"+"}");
					} else {
						whereInfo.push(temp.join("\n"));
					}
				}
			}
		}
	}

	if(typeof sparqlTable["classTriple"] !== 'undefined')whereInfo.unshift(sparqlTable["classTriple"]);

	whereInfo = whereInfo.concat(attributesAggerations);

	// remove duplicates
	var whereInfo = whereInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var links = links.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		if(sparqlTable["isSimpleClassName"] == true){
			var tempString = "OPTIONAL{"+"\n"+SPARQL_interval+ whereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+"}";
			whereInfo = [];
			whereInfo.push(tempString);
		} else {console.log("OPTIONAL subselect replaced with required")}
		filters = [];
		links = [];
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		var tempString = "FILTER NOT EXISTS{"+ "\n"+SPARQL_interval + whereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";
		whereInfo = [];
		whereInfo.push(tempString);
		filters = [];
		links = [];
	}
	whereInfo.concat(ws);
	filters.concat(fil);
	links.concat(lin);

	return {"triples" : whereInfo, "filters" : filters, "links":links, "messages":messages, "subSelectResult":subSelectResult}
}

function checkIfReference(reference, referenceTable, subQueryMainClass, isPlain){

	for(var ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			if(typeof referenceTable[ref]["type"] !== 'undefined' && referenceTable[ref]["type"] == "notPlain") isPlain = false;
			if(reference == ref){
				if(isPlain == true) return true;
				else {
					if(findSubQueryMainClass(referenceTable[ref]["classes"], subQueryMainClass) == true) return true;
				}
			}else {
				var result  = false;
				for(var r in referenceTable[ref]["classes"]){
					if(typeof referenceTable[ref]["classes"][r] === 'object'){
						var tempResult = checkIfReference(reference, referenceTable[ref]["classes"][r], subQueryMainClass, isPlain);
						if(tempResult == true) result = true;
					}
				}
				if(result == true) return true;
			}
		}
	}
	return false;
}

function findSubQueryMainClass(referenceTable, subQueryMainClass){
	var result = false;
	for(var ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			for(var r in referenceTable[ref]){
				if(typeof referenceTable[ref][r] === 'object'){
					if("?"+r == subQueryMainClass) result = true;
					else{
						var temp = findSubQueryMainClass(referenceTable[ref][r]["classes"], subQueryMainClass);
						if(temp == true) result = true;
					}
				}
			}
		}
	}
	return result;
}

function getUNIONClasses(sparqlTable, parentClassInstance, parentClassTriple, generateUpperSelect, referenceTable, SPARQL_interval){
	var whereInfo = [];
	var unionsubSELECTstaterents = [];
	var unionGroupStaterents = [];
	var messages = [];
	var isSubSelect = false;
	
	var unionSelectResult = generateSELECT(sparqlTable, false);
	unionsubSELECTstaterents= unionsubSELECTstaterents.concat(unionSelectResult["select"]);
	unionsubSELECTstaterents= unionsubSELECTstaterents.concat(unionSelectResult["aggregate"]);
	
	// console.log("sparqlTable",sparqlTable);
	
	if(generateUpperSelect == true || sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true || sparqlTable["linkType"] == "NOT") SPARQL_interval = SPARQL_interval+"  ";

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		var unionSELECT = generateSELECT(sparqlTable, true);
		// console.log("unionSELECT", unionSELECT);
		// var unionWheresubInfo = generateSPARQLWHEREInfo(sparqlTable, [], [], [], referenceTable);
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				var selectResult = generateSELECT(sparqlTable["subClasses"][subclass], false);
				//console.log("QQQQQQQQQQQQQQQ", selectResult, parentClassInstance);
				var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval);

				var temp = wheresubInfo["triples"];
				temp = temp.concat(wheresubInfo["filters"]);
				temp = temp.concat(wheresubInfo["links"]);
				messages = messages.concat(wheresubInfo["messages"]);

				var tempSelect = selectResult["select"];
				
				tempSelect= tempSelect.concat(selectResult["aggregate"]);
				if(generateUpperSelect != true && sparqlTable["isSubQuery"] != true && sparqlTable["isGlobalSubQuery"] != true && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					tempSelect= tempSelect.concat(unionSELECT["select"]);
					tempSelect= tempSelect.concat(unionSELECT["aggregate"]);
				}
				
				if((sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true) && (sparqlTable["subClasses"][subclass]["isSubQuery"] == true || sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true)){
					isSubSelect = true;
				}

				unionGroupStaterents = unionGroupStaterents.concat(selectResult["groupBy"])

				if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var subQuery = "{\n";
					if(parentClassInstance == null) SPARQL_interval = SPARQL_interval.substring(2);
					//union parent triple
					if(parentClassTriple != null) subQuery = subQuery + SPARQL_interval+ parentClassTriple + "\n";

					//triples
					subQuery = subQuery + SPARQL_interval+temp.join("\n"+SPARQL_interval);

					subQuery = subQuery + "\n"+SPARQL_interval.substring(2)+"}";

					whereInfo.push(subQuery);

					unionsubSELECTstaterents= unionsubSELECTstaterents.concat(tempSelect);
				}else {
					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						var subQuery = "{SELECT " ;

						//DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";

						if(parentClassInstance != null){
							subQuery = subQuery + parentClassInstance + " ";
						}
						subQuery = subQuery +  tempSelect.join(" ") + " WHERE{\n";

						var inner = selectResult["innerDistinct"].filter(function (el, i, arr) {
							return arr.indexOf(el) === i;
						});

						//SELECT DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) {
							// subQuery = subQuery + SPARQL_interval+"SELECT DISTINCT "+parentClassInstance + " " + inner.join(" ") + " WHERE{\n";
							messages.push({
								"type" : "Warning",
								"message" : "Select distinct not available for values included in aggregate functions. To aggregate over distinct values, include distinct modifier inside the aggregate function (or select the values in this node and aggregate in outer query (Re-shape Query -> Add outer query)).",
								// "listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
								"isBlocking" : true
							});
						}

						//union parent triple
						if(parentClassTriple != null) subQuery = subQuery + SPARQL_interval+parentClassTriple + "\n";

						var orderBy = sparqlTable["subClasses"][subclass]["order"];
						//add triples from order by
						temp = temp.concat(orderBy["triples"]);

						subQuery = subQuery + SPARQL_interval+temp.join("\n"+SPARQL_interval)  + "}";

						var groupBy = selectResult["groupBy"].join(" ");
						if(parentClassInstance != null){
							groupBy = groupBy + " "+ parentClassInstance;
						}
						if(groupBy != "") groupBy = "\n"+SPARQL_interval+"GROUP BY " + groupBy;
						
						// if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

						if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;

						
						//ORDER BY

						if (orderBy["orders"] != "") subQuery = subQuery + SPARQL_interval+"\nORDER BY " + orderBy["orders"];

						//OFFSET
						if (sparqlTable["subClasses"][subclass]["offset"] != null) {
							if(!isNaN(sparqlTable["subClasses"][subclass]["offset"])) subQuery = subQuery + SPARQL_interval+"\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];
							else {
								//Interpreter.showErrorMsg("OFFSET should contain only numeric values");
								 messages.push({
										"type" : "Warning",
										"message" : "OFFSET should contain only numeric values",
										"listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
										"isBlocking" : false
									 });
							}
						}
						//LIMIT
						if (sparqlTable["subClasses"][subclass]["limit"] != null) {
							if(!isNaN(sparqlTable["subClasses"][subclass]["limit"])) subQuery = subQuery + SPARQL_interval+"\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];
							else {
								//Interpreter.showErrorMsg("LIMIT should contain only numeric values");
								messages.push({
										"type" : "Warning",
										"message" : "LIMIT should contain only numeric values",
										"listOfElementId" : [sparqlTable["subClasses"][subclass]["identification"]["_id"]],
										"isBlocking" : false
							   });
							}
						}
						subQuery = subQuery + "\n"+SPARQL_interval.substring(2)+"}";

						whereInfo.push(subQuery);
					} else if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true){
						whereInfo.push("{MINUS{" + temp.join("\n")+ "}}");
					} else {
						whereInfo.push("{"+temp.join("\n")+"}");
					}
				}
			}
		}
	}

	unionsubSELECTstaterents = unionsubSELECTstaterents.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	unionGroupStaterents = unionGroupStaterents.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var returnValue = whereInfo.join("\n"+SPARQL_interval.substring(2)+"UNION\n"+SPARQL_interval.substring(2));
	
	if(generateUpperSelect == true) {
		if(sparqlTable["selectMain"]["simpleVariables"].length > 0) {
			for(var selectVar in sparqlTable["selectMain"]["simpleVariables"]){
				var sel = sparqlTable["selectMain"]["simpleVariables"][selectVar]["value"];
				if(typeof sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] +")"
				unionsubSELECTstaterents.push(sel)
			}
		}
		if(sparqlTable["selectMain"]["aggregateVariables"].length > 0) {
			for(var selectVar in sparqlTable["selectMain"]["aggregateVariables"]){
				var sel = sparqlTable["selectMain"]["aggregateVariables"][selectVar]["value"];
				if(typeof sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] +")"
				unionsubSELECTstaterents.push(sel)
			}
		}
		
		unionsubSELECTstaterents = unionsubSELECTstaterents.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		
		returnValue = "SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n" + returnValue + "}\n" + SPARQL_interval.substring(2);
	}
	else if(sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true){
		
		// SPARQL_interval = SPARQL_interval + "  ";
		if(unionsubSELECTstaterents.length > 0 || isSubSelect == true) {

			if(parentClassInstance != null){
				unionsubSELECTstaterents.push(parentClassInstance);
				unionGroupStaterents.push(parentClassInstance);
			}
			
			if(sparqlTable["selectMain"]["simpleVariables"].length > 0) {
				for(var selectVar in sparqlTable["selectMain"]["simpleVariables"]){
					var sel = sparqlTable["selectMain"]["simpleVariables"][selectVar]["value"];
					if(typeof sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] +")"
					unionsubSELECTstaterents.push(sel)
				}
			}
			if(sparqlTable["selectMain"]["aggregateVariables"].length > 0) {
				for(var selectVar in sparqlTable["selectMain"]["aggregateVariables"]){
					var sel = sparqlTable["selectMain"]["aggregateVariables"][selectVar]["value"];
					if(typeof sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["aggregateVariables"][selectVar]["alias"] +")"
					unionsubSELECTstaterents.push(sel)
				}
			}
			
			unionsubSELECTstaterents = unionsubSELECTstaterents.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});
			
			returnValue = "{SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n"+SPARQL_interval.substring(2) + returnValue + "}";
			
			if(sparqlTable["agregationInside"]== true) returnValue = returnValue + "\n"+SPARQL_interval.substring(2)+"GROUP BY " + unionGroupStaterents.join(" ");
			returnValue = returnValue + "\n"+SPARQL_interval.substring(4)+"}";
			if(sparqlTable["linkType"] == "OPTIONAL") returnValue = "OPTIONAL" + returnValue;

		}
		else if(sparqlTable["linkType"] == "NOT") {
			if(sparqlTable["isGlobalSubQuery"] == true)returnValue = "MINUS{FILTER NOT EXISTS{" + returnValue + "}}";
			else returnValue = "FILTER NOT EXISTS{" + SPARQL_interval.substring(2)+returnValue + "}";
		}
	}

	return {"result":returnValue, "messages":messages};
}

function generateSELECT(sparqlTable, forSingleClass){
	selectInfo = [];
	variableReferenceInfo = [];
	aggregateSelectInfo = [];
	aggregateAliases = [];
	innerDistinctInfo = [];
	variableReferenceCandidate = [];
	groupBy = [];

	if(sparqlTable["groupByThis"] == true) groupBy.push(sparqlTable["class"]);
	// selectMAIN
	// simpleVariables
	for (var number in sparqlTable["selectMain"]["simpleVariables"]){
		if(typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') {
			selectInfo.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["innerDistinct"]["simpleVariables"]){
		if(typeof sparqlTable["innerDistinct"]["simpleVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["simpleVariables"][number]);
		}
	}

	//variable names
	if(typeof sparqlTable["variableName"] !== 'undefined') {
		var varName = sparqlTable["variableName"]

		if(sparqlTable["variableName"].startsWith("??") == false) {
			selectInfo.push(varName);
		} else {
			varName = varName.substr(1);
		}
		groupBy.push(varName);
		innerDistinctInfo.push(varName);
	}
	if(typeof sparqlTable["linkVariableName"] !== 'undefined') {
		selectInfo.push(sparqlTable["linkVariableName"]);
		groupBy.push(sparqlTable["linkVariableName"]);
	}

	// aggregateVariables
	for (var number in sparqlTable["selectMain"]["aggregateVariables"]){
		if(typeof sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] === 'string') {
			aggregateSelectInfo.push("("+ sparqlTable["selectMain"]["aggregateVariables"][number]["value"] + " AS " + sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] + ")");
			aggregateAliases.push(sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] );
		}
	}
	for (var number in sparqlTable["innerDistinct"]["aggregateVariables"]){
		if(typeof sparqlTable["innerDistinct"]["aggregateVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["aggregateVariables"][number]);
		}
	}

	//subQuery references
	for (var number in sparqlTable["selectMain"]["referenceVariables"]){
		if(typeof sparqlTable["selectMain"]["referenceVariables"][number] === 'string') {
			variableReferenceInfo.push(sparqlTable["selectMain"]["referenceVariables"][number]);
		}
	}

	//referenceCandidates
	for (var number in sparqlTable["variableReferenceCandidate"]){
		if(typeof sparqlTable["variableReferenceCandidate"][number] === 'string') {
			variableReferenceCandidate.push(sparqlTable["variableReferenceCandidate"][number]);
		}
	}

	// remove duplicates
	var groupBy = groupBy.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var selectInfo = selectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var aggregateSelectInfo = aggregateSelectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var aggregateAliases = aggregateAliases.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var innerDistinctInfo = innerDistinctInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var variableReferenceInfo = variableReferenceInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var variableReferenceCandidate = variableReferenceCandidate.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	if(typeof sparqlTable["subClasses"] !=='undefined' && forSingleClass == false){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object' && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
				var temp = generateSELECT(sparqlTable["subClasses"][subclass], forSingleClass);
				selectInfo = selectInfo.concat(temp["select"]);
				variableReferenceCandidate = variableReferenceCandidate.concat(temp["variableReferenceCandidate"]);
				variableReferenceInfo = variableReferenceInfo.concat(temp["variableReference"]);
				innerDistinctInfo = innerDistinctInfo.concat(temp["innerDistinct"]);
				aggregateSelectInfo = aggregateSelectInfo.concat(temp["aggregate"]);
				aggregateAliases = aggregateAliases.concat(temp["aggregate"]);
				groupBy = groupBy.concat(temp["groupBy"]);
				// selectClasses = selectClasses.concat(temp["classes"]);
			}
		}
	}

	return {"select":selectInfo, "innerDistinct":innerDistinctInfo, "aggregate":aggregateSelectInfo, "groupBy":groupBy, "variableReference":variableReferenceInfo, "variableReferenceCandidate":variableReferenceCandidate, "aggregateAliases":aggregateAliases};
}

function checkIfIsURI(text){
	if(text == null) return "not_uri";
	if(text.indexOf("://") != -1) return "full_form";
	else if(text.indexOf(":") != -1) return "prefix_form";
	return "not_uri";
}

function setAttributeNames(clazz, idTable, symbolTable, attributeNames){
	var aliasFieldsOptional = [];
	var messages = [];
	//attributes
	_.each(clazz["fields"],function(field) {

		var attributeName = field["exp"];
		var temp = checkIfIsSimpleAttribute(field["parsed_exp"], true);
		if(temp["isSimpleVariable"] == true && temp["kind"] == "PROPERTY_NAME"){
			//console.log(attributeNames, attributeName, attributeNames[attributeName])
			if(typeof attributeNames[attributeName] === 'undefined' && temp["parentType"] != null) {
				attributeNames[attributeName] = [];
				attributeNames[attributeName]["counter"] = 0;
				attributeNames[attributeName]["classes"] = [];
				attributeNames[attributeName]["classes"][clazz["identification"]["_id"]] = {name:attributeName, parentType:temp["parentType"]};
			} else if(temp["parentType"] != null) {
				if(typeof attributeNames[attributeName]["classes"][clazz["identification"]["_id"]] === 'undefined'){
					attributeNames[attributeName]["counter"] = attributeNames[attributeName]["counter"] + 1;
					var attrName= attributeName+"_"+attributeNames[attributeName]["counter"];
					attributeNames[attributeName]["classes"][clazz["identification"]["_id"]] = {name:attrName, parentType:temp["parentType"]};
				}
			}
		}
		if(aliasFieldsOptional.length > 0) messages = messages.concat(checkIfOptionalReferenceParse(field, field["parsed_exp"], temp["isSimpleVariable"], aliasFieldsOptional));
		if(field.alias != null && field.alias != "" && field.requireValues == false){
			aliasFieldsOptional.push(field.alias);
		}


	})

	//subClasses
	_.each(clazz["children"],function(subclazz) {
		var temp = setAttributeNames(subclazz, idTable, symbolTable, attributeNames);
		attributeNames = temp;
	})
	return {attributeNames:attributeNames, messages:messages}
}


function checkIfOptionalReferenceParse(field, expressionTable, isSimpleVariable, aliasFieldsOptional){
	var messages = [];
	for(var key in expressionTable){

		if(key == "Reference" && aliasFieldsOptional.includes(expressionTable[key]["name"])){
			messages.push({
					"type" : "Error",
					"message" : "Reference to optional field " + expressionTable[key]["name"] + " from a field expression " + field.fulltext + " not allowed. To use the reference, mark " + expressionTable[key]["name"] + " as required (check the 'Require Values' box)",
					// "listOfElementId" : listOfElementId,
					"isBlocking" : true
				});
		}


		if(key == "var" &&  isSimpleVariable != true && aliasFieldsOptional.includes(expressionTable[key]["name"])){
			messages.push({
					"type" : "Error",
					"message" : "Reference to optional field " + expressionTable[key]["name"] + " from a field expression " + field.fulltext + " not allowed. To use the reference, mark " + expressionTable[key]["name"] + " as required (check the 'Require Values' box)",
					// "listOfElementId" : listOfElementId,
					"isBlocking" : true
				});
		}

		if(typeof expressionTable[key] == 'object'){
			messages = messages.concat(checkIfOptionalReferenceParse(field, expressionTable[key], isSimpleVariable, aliasFieldsOptional));

		}
	}
	return messages;
}

function checkIfIsSimpleAttribute(expressionTable, isSimpleVariable){
	var kind = null;
	var parentType = null;
	for(var key in expressionTable){

		if(key == "Concat" || key == "Additive" || key == "Unary"  || (key == "Function" && expressionTable[key] != "langmatchesShort" && expressionTable[key] != "langmatchesShortMultiple") || key == "RegexExpression" || key == "Aggregate" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "IRIREF" || key == "FunctionTime"
		|| key == "Comma" || key == "OROriginal" || key == "ANDOriginal"  || key == "ValueScope"  || key == "Filter"  || key == "NotExistsExpr"
		|| key == "ExistsExpr" || key == "notBound" || key == "Bound" || key == "ArgListExpression" || key == "ExpressionList" || key == "FunctionExpression" || key == "classExpr"
		|| key == "NotExistsFunc" || key == "ExistsFunc" || key == "BrackettedExpression" || key == "VariableName"){
			isSimpleVariable = false;
		}

		if(key == "var"){
			if(expressionTable[key]["kind"] != null){
				kind = expressionTable[key]["kind"];
			}
			if(typeof expressionTable[key]["type"] !== 'undefined' && expressionTable[key]["type"] != null && typeof expressionTable[key]["type"]["parentType"] !== 'undefined' ){
				parentType = expressionTable[key]["type"]["parentType"]
			}

		}

		if(typeof expressionTable[key] == 'object'){
			var temp = checkIfIsSimpleAttribute(expressionTable[key], isSimpleVariable);
			if(temp["isSimpleVariable"]==false) isSimpleVariable = false;
			if(temp["kind"]!=null) kind = temp["kind"];
			if(temp["parentType"]!=null) parentType = temp["parentType"];
		}
	}
	return {isSimpleVariable:isSimpleVariable, kind:kind, parentType:parentType}
}

function parseAggregationMultiple(expressionTable, symbolTable){
	var isMultipleAllowedAggregation = null;
	var isMultipleAllowedCardinality = null;

	for(var key in expressionTable){
		if (key == "Aggregate" && typeof expressionTable[key] === "string"){
			var aggregation = expressionTable[key].toLowerCase();
			if(aggregation != "min" && aggregation != "max" && aggregation != "sample") isMultipleAllowedAggregation = true;
		}

		if(key == "var") {
			//if type information is known
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined') {
				//if maxCardinality is known
				if(typeof expressionTable[key]['type']['maxCardinality'] !== 'undefined' && expressionTable[key]['type']['maxCardinality'] != null){
					if(expressionTable[key]['type']['maxCardinality'] == -1 || expressionTable[key]['type']['maxCardinality'] > 1) {
						isMultipleAllowedCardinality = true;
					}
				//if maxCardinality not known
				} else {
					isMultipleAllowedCardinality = true;
				}
			//symbolTable has maxCardinality
			}else if (typeof symbolTable[expressionTable[key]["name"]] !== 'undefined'){
				var symbolUsage = symbolTable[expressionTable[key]["name"]];
				var found = false;
				for(var symbol in symbolUsage){
					if(typeof symbolUsage[symbol]["type"] !== "undefined" && typeof symbolUsage[symbol]["type"]["maxCardinality"] !== "undefined" && symbolUsage[symbol]["type"]["maxCardinality"] != null){ 
						if(symbolUsage[symbol]['type']['maxCardinality'] == -1 || symbolUsage[symbol]['type']['maxCardinality'] > 1){
							isMultipleAllowedCardinality = true;
						}
						found = true;
					}
				}
				if(found == false)isMultipleAllowedCardinality = true;
			// if type information not known
			} else if(typeof expressionTable[key]['type'] === 'undefined' || expressionTable[key]['type'] == null )  {
				isMultipleAllowedCardinality = true;
			}
		}

		if(typeof expressionTable[key] == 'object'){
			var temp = parseAggregationMultiple(expressionTable[key], symbolTable);
			if(temp["isMultipleAllowedAggregation"]==true) isMultipleAllowedAggregation = true;
			if(temp["isMultipleAllowedCardinality"]==true) isMultipleAllowedCardinality = true;
		}
	}

	return {isMultipleAllowedAggregation:isMultipleAllowedAggregation, isMultipleAllowedCardinality:isMultipleAllowedCardinality}
}
