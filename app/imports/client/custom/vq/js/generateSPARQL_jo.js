import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects, Elements } from '/imports/db/platform/collections'
import { Utilities } from '/imports/client/platform/js/utilities/utils.js'
import { genAbstractQueryForElementList, resolveTypesAndBuildSymbolTable } from './genAbstractQuery';
import { parse_class, parse_attrib, parse_filter, getPathFullGrammar } from './parser';
import { VQ_Element } from './VQ_Element';

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  Foo: function() { console.log("This menu item does nothing") },

  ExecuteSPARQL_from_diagram: async function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    var queries =  await genAbstractQueryForElementList(elems_in_diagram_ids);
    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
       return;
    };
    _.each(queries,async function(q) {
		if(typeof q.messages !== "undefined"){
			Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
		  }
		  else{
			 //console.log(JSON.stringify(q,null,2));
			if(typeof q.warnings !== "undefined"){
				Interpreter.showErrorMsg(q.warnings.join(" // "), -3); 
			}
			var abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 let result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"]);
			

		  if(result["blocking"] != true){
			Session.set("generatedSparql", result["SPARQL_text"]);
			setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			executeSparqlString(result["SPARQL_text"]);
		  } else {
			  if(result["showSPARQL"] == true){
				Session.set("generatedSparql", result["SPARQL_text"]);
				setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			  }
			  else {
				Session.set("generatedSparql", "");
				setText_In_SPARQL_Editor("", result);
			  }
		  }
	  }
    })
  },

  ExecuteSPARQL_from_selection: async function() {
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
    // allow single node query for every element
    var queries = (elem_ids.length == 1) ?  await genAbstractQueryForElementList(elem_ids,elem_ids) :  await genAbstractQueryForElementList(elem_ids);

    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
       return;
    };
    _.each(queries,async function(q) {
		if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
	  }
      else{
			 //console.log(JSON.stringify(q,null,2));
			 if(typeof q.warnings !== "undefined"){
				Interpreter.showErrorMsg(q.warnings.join(" // "), -3); 
			}
		 var abstractQueryTable =  await resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 var result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"], result);
			 
		 

		 if(result["blocking"] != true){
			Session.set("generatedSparql", result["SPARQL_text"]);
			setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			executeSparqlString(result["SPARQL_text"]);
		  } else {
			  if(result["showSPARQL"] == true){
				Session.set("generatedSparql", result["SPARQL_text"]);
				setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			  }
			  else {
				Session.set("generatedSparql", "");
				setText_In_SPARQL_Editor("", result);
			  }
		  }
	  }
    })
  },

  ExecuteSPARQL_from_component: async function() {
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

       var queries =  await genAbstractQueryForElementList(elem_ids);
       // ErrorHandling - just one query at a moment allowed
       if (queries.length==0) {
          Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
          return;
       } else if (queries.length>1) {
          Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
          return;
       };
       _.each(queries,async function(q) {
		   if(typeof q.messages !== "undefined"){
			Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
		  }
		  else{
            //console.log(JSON.stringify(q,null,2));
			if(typeof q.warnings !== "undefined"){
				Interpreter.showErrorMsg(q.warnings.join(" // "), -3); 
			}
		   var abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 let result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"]);

		   if(result["blocking"] != true){
			Session.set("generatedSparql", result["SPARQL_text"]);
			setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			executeSparqlString(result["SPARQL_text"]);
		  } else {
			  if(result["showSPARQL"] == true){
				Session.set("generatedSparql", result["SPARQL_text"]);
				setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			  }
			  else {
				Session.set("generatedSparql", "");
				setText_In_SPARQL_Editor("", result);
			  }
		  }
		}
       })
    } else {
      // nothing selected
    }
  },

  ExecuteSPARQL_from_query_part: async function() {
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

       var queries =  await genAbstractQueryForElementList(query_elements_ids, root_elements_ids);
       // ErrorHandling - just one query at a moment allowed
       if (queries.length==0) {
          Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
          return;
       } else if (queries.length>1) {
          Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
          return;
       };
       _.each(queries,async function(q) {
		   if(typeof q.messages !== "undefined"){
			Interpreter.showErrorMsg(q.messages.join(" // "), -3);  
		  }
		  else{
            //console.log(JSON.stringify(q,null,2));
			if(typeof q.warnings !== "undefined"){
				Interpreter.showErrorMsg(q.warnings.join(" // "), -3); 
			}
		   var abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);
			 var rootClass = abstractQueryTable["root"];
			 let result = generateSPARQLtext(abstractQueryTable);
			 // console.log(result["SPARQL_text"]);

		   Session.set("generatedSparql", result["SPARQL_text"]);
		   

		   if(result["blocking"] != true){
			Session.set("generatedSparql", result["SPARQL_text"]);
			setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			executeSparqlString(result["SPARQL_text"]);
		  } else {
			  if(result["showSPARQL"] == true){
				Session.set("generatedSparql", result["SPARQL_text"]);
				setText_In_SPARQL_Editor(result["SPARQL_text"], result);
			  }
			  else {
				Session.set("generatedSparql", "");
				setText_In_SPARQL_Editor("", result);
			  }
		  }
	  }
       })
     } else {
       // nothing selected
     }
  },

  GenerateSPARQL_from_selection: async function() {
    // get _id-s of selected elements - it serves as potential root Classes
    // and as allowed elements
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
    // allow execute single-class non-root elements
    if (elem_ids.length == 1) {  await GenerateSPARQL_for_ids(elem_ids, elem_ids) } else {  await GenerateSPARQL_for_ids(elem_ids) };

  },

  GenerateSPARQL_from_component: async function() {

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
       await GenerateSPARQL_for_ids(elem_ids);
    } else {
      // nothing selected
    }

  },

  GenerateSPARQL_from_query_part: async function() {
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

        await GenerateSPARQL_for_ids(query_elements_ids, root_elements_ids)
     } else {
       // nothing selected
     }

  },

  GenerateSPARQL_from_diagram: async function() {

	// get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

     await GenerateSPARQL_for_ids(elems_in_diagram_ids)
  },

  GenerateSPARQL_from_diagram_for_all_queries: async function() {
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
async function GenerateSPARQL_for_ids(list_of_ids, root_elements_ids) {
  Interpreter.destroyErrorMsg();
 
  
  var queries = await genAbstractQueryForElementList(list_of_ids, root_elements_ids);
    
  // ErrorHandling - just one query at a moment allowed
  if (queries.length==0) {
     Interpreter.showErrorMsg("The query has to contain a main query class (orange box).", -3);
     return;
  } else if (queries.length>1) {
     Interpreter.showErrorMsg("The query has to contain exactly one main query class (orange box). Mark all other classes as condition classes (cf. the Extra tab in property sheet).", -3);
     return;
  };
  // goes through all queries found within the list of VQ element ids
  _.each(queries, async function(q) {
	  if(typeof q.messages !== "undefined"){
		Interpreter.showErrorMsg(q.messages.join(" // "), -3);
		Session.set("generatedSparql", "");
		setText_In_SPARQL_Editor("");
	  }
      else{
		  // console.log(JSON.stringify(q,null,2));
		 if(typeof q.warnings !== "undefined"){
				Interpreter.showErrorMsg(q.warnings.join(" // "), -3); 
			}
	   var abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);
	   // console.log(abstractQueryTable, JSON.stringify(abstractQueryTable,null,2));
	   var rootClass = abstractQueryTable["root"];
	  let result = generateSPARQLtext(abstractQueryTable);
	  // console.log(result["SPARQL_text"]);
	  if(result["blocking"] != true){
		Session.set("generatedSparql", result["SPARQL_text"]);
		setText_In_SPARQL_Editor(result["SPARQL_text"]);
	  } else {
		Session.set("generatedSparql", "");
		setText_In_SPARQL_Editor("");
	  }

	   $('#vq-tab a[href="#sparql"]').tab('show');
	   // Interpreter.destroyErrorMsg();
	  }
  })
}

// string, {limit: , offset:, total_rows:} -->
// Executes the given Sparql end shows result in the GUI
function executeSparqlString(sparql, paging_info) {
	var sparqlWithoutComments = sparql.split("\n")
	 sparqlWithoutComments = sparqlWithoutComments.filter(function (el) {
		return !el.trim().startsWith("#");
	});
	sparql = sparqlWithoutComments.join("\n");
  // Default Data Set Name (Graph IRI) and SPARQL endpoint url
 Session.set("executedSparql", {limit_set:false, waiting:true, number_of_rows:0});
 $('#vq-tab a[href="#executed"]').tab('show');
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
              diagramId: Session.get("activeDiagram"),
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
		   

  Utilities.callMeteorMethod("executeSparql", list, function(res) {
    
	if (res.status == 200) {

      if (!paging_info || (paging_info && !paging_info.download)) {
        Session.set("executedSparql", res.result);
        Interpreter.destroyErrorMsg();
        $('#vq-tab a[href="#executed"]').tab('show');
      } else {

        if (paging_info && paging_info.download && res.result.sparql) {
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

          Interpreter.showErrorMsg("SPARQL execution failed" + msg.substring(0, 1000),-3);
      };

    }
  })
}

// generate SPARQL for all queries
async function GenerateSPARQL_for_all_queries(list_of_ids) {
  Interpreter.destroyErrorMsg();
  var queries =  await genAbstractQueryForElementList(list_of_ids);
	var sparqlTable = [];
  // goes through all queries found within the list of VQ element ids
  for(let q = 0; q < queries.length; q++){
	   var abstractQueryTable = await resolveTypesAndBuildSymbolTable(queries[q]);

	   let result = generateSPARQLtext(abstractQueryTable);
	   
	   if(result["comment"] != null){
		   var commentSplit = result["comment"].split(",")
		   sparqlTable[parseInt(commentSplit[0].substring(5), 10)] = result["SPARQL_text"]
		   console.log(parseInt(commentSplit[0].substring(5), 10))
	   } else {
		   sparqlTable[0] = result["SPARQL_text"]
	   }
  }
  // _.each(queries, async function(q) {

   // var abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);

   // var result = generateSPARQLtext(abstractQueryTable);
   
   // Session.set("generatedSparql", result["SPARQL_text"]);
   // setText_In_SPARQL_Editor(result["SPARQL_text"])

  // })
  
  for(let v in sparqlTable){
	  console.log("----", v, sparqlTable[v]);
  }
}

function setText_In_SPARQL_Editor(text) {
  let yasqe = Template.sparqlForm_see_results.yasqe.get();
  let yasqe3 = Template.sparqlForm.yasqe3.get();

  yasqe.setValue(text);
  yasqe3.setValue(text);
}

//generate table with unique class names in form [_id] = class_unique_name
//rootClass - abstract syntax table starting with 'rootClass' object
function generateIds(rootClass, knownPrefixes, symbolTable){
	
	var counter = 0;
	var idTable = [];
	var referenceTable = [];
	var prefixTable = [];
	var variableNamesTable = [];
	var variableNamesCounter = [];

	if(rootClass.fullSPARQL != null && rootClass.fullSPARQL != ""){
		var fullSPARQLsprlit = rootClass.fullSPARQL.split(/\s|\n|\t|\./)
		
		for(let sp = 0; sp < fullSPARQLsprlit.length; sp++){
			if(fullSPARQLsprlit[sp].startsWith("?")) {
				let alias = fullSPARQLsprlit[sp].substring(1);
				if(typeof variableNamesTable[rootClass.identification._id] === "undefined") variableNamesTable[rootClass.identification._id] = [];
				if(typeof variableNamesTable[rootClass.identification._id][alias] === "undefined") variableNamesTable[rootClass.identification._id][alias] = [];
				variableNamesTable[rootClass.identification._id][alias][rootClass.identification._id] = {name:alias, order:9999999, exp:alias, isPath:false, isAlias:true};
			}
		}
	}

	//add root class unique name
	var rootClassId = rootClass["instanceAlias"];
	// if alias is not defined
	if(rootClassId == null || rootClassId.replace(" ", "") =="") {
		if(typeof rootClass["identification"]["display_name"] !== 'undefined' && rootClass["identification"]["display_name"].startsWith("[")){
			
			let textPart = rootClass["identification"]['display_name'].substring(1);
			if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
			else textPart = textPart.substring(0, textPart.length - 1);
			textPart = textPart.trim();
			var t = textPart.match(/([\s]+)/g);

			if(textPart != "" && (t == null || t.length <3 )){
				rootClassId = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
			} else rootClassId = rootClass["identification"]["local_name"];
		
		} else {
			rootClassId = rootClass["identification"]["local_name"];
			if (checkIfIsURI(rootClassId) == "full_form") rootClassId = "expr";
			if (checkIfIsURI(rootClassId) == "prefix_form") {
				rootClassId = rootClassId.substr(rootClassId.indexOf(":")+1);
			}
		}
	}
	else rootClassId = rootClassId.replace(/ /g, '_');
	
	if(rootClassId == "") rootClassId = "expr";
	
	
	
	
	// if instance is uri in prefox form
	if (checkIfIsURI(rootClassId) == "prefix_form") {
		if(rootClassId.indexOf("(") !== -1 || rootClassId.indexOf(")") !== -1){
				
			let prefix = rootClassId.substring(0, rootClassId.indexOf(":"));
			let name = rootClassId.substring(rootClassId.indexOf(":")+1);
			for(let kp = 0; kp < knownPrefixes.length; kp++){
				if(knownPrefixes[kp]["name"] == prefix) {
					prefixTable[prefix+":"] = "<"+knownPrefixes[kp]["value"]+">";
					rootClassId = knownPrefixes[kp]["value"] + name;
					break;
				}
			}
		} else {
			let prefix = rootClassId.substring(0, rootClassId.indexOf(":"))
			for(let kp = 0; kp < knownPrefixes.length; kp++){
				if(knownPrefixes[kp]["name"] == prefix) {
					
					if(rootClassId.indexOf(",") !== -1 || rootClassId.indexOf("'") !== -1){
						rootClassId = "<"+knownPrefixes[kp]["value"]+ rootClassId.substring(rootClassId.indexOf(":")+1) +">";
					} else prefixTable[prefix+":"] = "<"+knownPrefixes[kp]["value"]+">";
					break;
				}
			}
		}
	}
	
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
	let classNameGenerated = rootClassId;
	if(typeof symbolTable[rootClass["identification"]["_id"]] !== "undefined" && typeof symbolTable[rootClass["identification"]["_id"]][rootClassId] !== "undefined"){
		let stable = symbolTable[rootClass["identification"]["_id"]][rootClassId];
		for(let st = 0; st < stable.length; st++){
			if(stable[st]["kind"] !== null && stable[st]["kind"].indexOf("_ALIAS") != -1 && stable[st]["context"] != rootClass["identification"]["_id"]) {
				classNameGenerated = classNameGenerated +"_"+ counter;
				counter++;
			}
		}
	}
	idTable[rootClass["identification"]["_id"]] = {name:classNameGenerated, unionId:null};
	
	variableNamesCounter[rootClassId] = 1;
	
	referenceTable[rootClassId] = [];
	referenceTable[rootClassId]["classes"] = [];
	
	_.each(rootClass["aggregations"],function(aggregation) {
		if(typeof aggregation["alias"] !== "undefined" && aggregation["alias"] != null && aggregation["alias"] != "") variableNamesCounter[aggregation["alias"]] = 1;
	})
	
	var aliasNames = setFieldAliases(rootClass, rootClass["fields"], variableNamesTable, variableNamesCounter, rootClass["identification"]["_id"])
	variableNamesTable = aliasNames["variableNamesTable"];
	variableNamesCounter = aliasNames["variableNamesCounter"];

	//go through all root class children classes
	_.each(rootClass["children"],function(subclazz) {
		var unionClass = null;
		if(rootClass["isUnion"] == true) unionClass = rootClass["identification"]["_id"];
		let temp = generateClassIds(subclazz, idTable, counter, rootClass["identification"]["_id"], rootClass["isUnion"], unionClass, knownPrefixes, variableNamesTable, variableNamesCounter, symbolTable);
		// variableNamesTable = temp["variableNamesTable"];
	    // variableNamesCounter = temp["variableNamesCounter"];
		counter = temp["counter"];
		idTable.concat(temp["idTable"]);

		for(let pr in temp["prefixTable"]){
			if(typeof temp["prefixTable"][pr] === "string") prefixTable[pr] = temp["prefixTable"][pr];
		}
		referenceTable[rootClassId]["classes"].push(temp["referenceTable"]);
	})
	
	var propertyNames = setFieldNamesForProperties(rootClass, rootClass["fields"], variableNamesTable, variableNamesCounter, rootClass["identification"]["_id"], knownPrefixes);
	variableNamesTable = propertyNames["variableNamesTable"];
	
	variableNamesCounter = propertyNames["variableNamesCounter"];

	var idTableTemp = [];
	for(let key in idTable) {
		if(typeof idTable[key] === "object") idTableTemp[key] = idTable[key]["name"];
	}
	
	return {idTable:idTableTemp, referenceTable:referenceTable, prefixTable:prefixTable, variableNamesTable:variableNamesTable, variableNamesCounter:variableNamesCounter};
}

// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
// parentClassId - parent class identificator
function generateClassIds(clazz, idTable, counter, parentClassId, parentClassIsUnion, unionClass, knownPrefixes, variableNamesTable, variableNamesCounter, symbolTable){
	var referenceTable = [];
	var prefixTable = [];
	
	if (checkIfIsURI(clazz["instanceAlias"]) == "prefix_form") {
		let prefix = clazz["instanceAlias"].substring(0, clazz["instanceAlias"].indexOf(":"))
		
		for(let kp = 0; kp < knownPrefixes.length; kp++){
			if(knownPrefixes[kp]["name"] == prefix) {
				prefixTable[prefix+":"] = "<"+knownPrefixes[kp]["value"]+">";
				break;
			}
		}
	}
	// if equals classes
	if(clazz["linkIdentification"]["local_name"] == "==" && typeof idTable[parentClassId] !== 'undefined') {
		if(typeof clazz["instanceAlias"] !== "undefined" && clazz["instanceAlias"] != null && clazz["instanceAlias"] != "") {
			idTable[parentClassId]["name"] = clazz["instanceAlias"];
			idTable[clazz["identification"]["_id"]] = idTable[parentClassId];
		}
		else idTable[clazz["identification"]["_id"]] = idTable[parentClassId];

	}
	// if instance is defined, use it
	else if(clazz["instanceAlias"] != null && clazz["instanceAlias"].replace(" ", "") !="") {
		var rootClassId = clazz["instanceAlias"];
		if (checkIfIsURI(rootClassId) == "prefix_form") {
			if(rootClassId.indexOf("(") !== -1 || rootClassId.indexOf(")") !== -1){
				
				let prefix = rootClassId.substring(0, rootClassId.indexOf(":"));
				let name = rootClassId.substring(rootClassId.indexOf(":")+1);
				
				for(let kp = 0; kp < knownPrefixes.length; kp++){
					if(knownPrefixes[kp]["name"] == prefix) {
						prefixTable[prefix+":"] = "<"+knownPrefixes[kp]["value"]+">";
						rootClassId = knownPrefixes[kp]["value"] + name;
						break;
					}
				}
				idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:rootClassId, unionId:unionClass};
				if(typeof variableNamesCounter[rootClassId] !== "undefined"){
					variableNamesCounter[rootClassId] = variableNamesCounter[rootClassId]+1;
				} else {
					variableNamesCounter[rootClassId] = 1;
				}
			} else {
				let className = clazz["instanceAlias"];
				if(className.indexOf(",") !== -1 || className.indexOf("'") !== -1){
					let prefix = className.substring(0, className.indexOf(":"));
					for(let kp = 0; kp < knownPrefixes.length; kp++){
						if(knownPrefixes[kp]["name"] == prefix) {
							className = knownPrefixes[kp]["value"]+ rootClassId.substring(rootClassId.indexOf(":")+1);
							break;
						}
					}
				}
				idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:className.replace(/ /g, '_'), unionId:unionClass};
				if(typeof variableNamesCounter[className] !== "undefined"){
					variableNamesCounter[className] = variableNamesCounter[className]+1;
				} else {
					variableNamesCounter[className] = 1;
				}
			}
		} else {
			idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:clazz["instanceAlias"].replace(/ /g, '_'), unionId:unionClass};
			if(typeof variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')] !== "undefined"){
				variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')] = variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')]+1;
			} else {
				variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')] = 1;
			}
		}
	}
	else if(clazz["isVariable"] == true) {
		var varName = clazz["variableName"];
		if(varName == "?") {
			varName = "class";
			let foundInIdTable = false;
			for(let key in idTable) {
				if(typeof idTable[key] === "object"){
					// if given class name is in the table, add counter to the class name
					if(idTable[key]["name"] == "_" + varName){
						foundInIdTable = true;
						idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:"_" + varName + "_"+ counter, unionId:unionClass};
						counter++;	
					}
				}
			}
			// if given class name is not in the table, use it
			if(foundInIdTable == false) idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:"_" + varName, unionId:unionClass};
			if(typeof variableNamesCounter["_" + varName] !== "undefined"){
				variableNamesCounter["_" + varName] = variableNamesCounter["_" + varName]+1;
			} else {
				variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')] = 1;
			}
		} else{
			if(varName.startsWith("?"))varName = varName.substr(1);
			idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:"_" + varName, unionId:unionClass};
		}

	}
	else if((clazz["instanceAlias"] == null || clazz["instanceAlias"].replace(" ", "") =="") && (clazz["identification"]["local_name"] == null || clazz["identification"]["local_name"] == "" || clazz["identification"]["local_name"] == "(no_class)") || typeof clazz["identification"]["iri"] === 'undefined') {
		
		if(clazz["isUnit"] == true && typeof idTable[parentClassId] !== 'undefined')idTable[clazz["identification"]["_id"]] = idTable[parentClassId];
		else idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:"expr_"+counter, unionId:unionClass};
		counter++;
	}
	else{
		let foundInIdTable = false;
		if(parentClassIsUnion == true){
			for(let key in idTable) {
				if(typeof idTable[key] === "object"){
					// if given class name is in the table, add counter to the class name
					if(idTable[key]["local_name"] == clazz["identification"]["local_name"] && idTable[key]["unionId"] == unionClass){
						foundInIdTable = true;
						idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:idTable[key]["name"], unionId:unionClass};
						
						
						if(typeof variableNamesCounter[idTable[key]["name"]] !== "undefined"){
							variableNamesCounter[idTable[key]["name"]] = variableNamesCounter[idTable[key]["name"]]+1;
						} else {
							variableNamesCounter[clazz["instanceAlias"].replace(/ /g, '_')] = 1;
						}
					}
				}
			}
		}
		if(foundInIdTable == false){
			for(let key in idTable) {
				// if given class name is in the table, add counter to the class name
				let className= clazz["identification"]["local_name"];
				// if( clazz["identification"]['display_name'].startsWith("[[")){
				if(typeof clazz["identification"]["display_name"] !== 'undefined' && clazz["identification"]['display_name'].startsWith("[")){
					let textPart = clazz["identification"]['display_name'].substring(1);
					if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
					else textPart = textPart.substring(0, textPart.length - 1);
					textPart = textPart.trim();
					
					let t = textPart.match(/([\s]+)/g);
					
					if(t == null || t.length <3 ){
						textPart = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
					} else textPart = clazz["identification"]["local_name"];
					className = textPart;
				} 
				
				if(idTable[key]["name"] == className){
					foundInIdTable = true;
					idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:className.replace(/-/g, '_') + "_"+ counter, unionId:unionClass};
					counter++;
					
					if(typeof variableNamesCounter[className.replace(/-/g, '_')] !== "undefined"){
						variableNamesCounter[className.replace(/-/g, '_')] = variableNamesCounter[className.replace(/-/g, '_')]+1;
					} else {
						variableNamesCounter[className.replace(/-/g, '_')] = 1;
					}
				}
			}
		}
		// if given class name is not in the table, use it
		if(foundInIdTable == false) {	
			// if( clazz["identification"]['display_name'].startsWith("[[")){
			if(typeof clazz["identification"]["display_name"] !== 'undefined' && clazz["identification"]['display_name'].startsWith("[")){
				let textPart = clazz["identification"]['display_name'].substring(1);
				if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
				else textPart = textPart.substring(0, textPart.length - 1);
				textPart = textPart.trim();
				let t = textPart.match(/([\s]+)/g);
					
				if(t == null || t.length <3 ){
					textPart = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
				} else textPart = clazz["identification"]["local_name"].replace(/-/g, '_');
				
				let classNameGenerated = textPart;
				if(typeof symbolTable[clazz["identification"]["_id"]] !== "undefined" && typeof symbolTable[clazz["identification"]["_id"]][classNameGenerated] !== "undefined"){
					let stable = symbolTable[clazz["identification"]["_id"]][classNameGenerated];
					for(let st = 0; st < stable.length; st++){
						if(stable[st]["kind"] !== null && stable[st]["kind"].indexOf("_ALIAS") != -1 && stable[st]["context"] != clazz["identification"]["_id"]) {
							classNameGenerated = classNameGenerated +"_"+ counter;
							counter++;
						}
					}
				}

				idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:classNameGenerated, unionId:unionClass};
				
				if(typeof variableNamesCounter[textPart] !== "undefined"){
					variableNamesCounter[textPart] = variableNamesCounter[textPart]+1;
				} else {
					variableNamesCounter[textPart] = 1;
				}
				
			} else {
				let classNameGenerated = clazz["identification"]["local_name"].replace(/-/g, '_');
				if(typeof symbolTable[clazz["identification"]["_id"]] !== "undefined" && typeof symbolTable[clazz["identification"]["_id"]][classNameGenerated] !== "undefined"){
					let stable = symbolTable[clazz["identification"]["_id"]][classNameGenerated];
					for(let st = 0; st < stable.length; st++){
						if(stable[st]["kind"] !== null && stable[st]["kind"].indexOf("_ALIAS") != -1 && (stable[st]["context"] != clazz["identification"]["_id"])) {
							classNameGenerated = classNameGenerated +"_"+ counter;
							counter++;
						}
					}
				}

				idTable[clazz["identification"]["_id"]] = {local_name:clazz["identification"]["local_name"], name:classNameGenerated, unionId:unionClass};
				
				if(typeof variableNamesCounter[clazz["identification"]["local_name"].replace(/-/g, '_')] !== "undefined"){
					variableNamesCounter[clazz["identification"]["local_name"].replace(/-/g, '_')] = variableNamesCounter[clazz["identification"]["local_name"].replace(/-/g, '_')]+1;
				} else {
					variableNamesCounter[clazz["identification"]["local_name"].replace(/-/g, '_')] = 1;
				}
			}
			
		}
	}
	
	let className = idTable[clazz["identification"]["_id"]]["name"];
	var linkType = "palin";
	if(clazz["linkType"] != "REQUIRED" || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) linkType = "notPlain";

	referenceTable[className] = [];
	referenceTable[className]["type"] = linkType;
	referenceTable[className]["underUnion"] = parentClassIsUnion;

	if(clazz["linkType"] == "OPTIONAL" && clazz["isSubQuery"] != true && clazz["isGlobalSubQuery"] != true) referenceTable[className]["optionaPlain"] = true;
	else referenceTable[className]["optionaPlain"] = false;
	
	_.each(clazz["aggregations"],function(aggregation) {
		if(typeof aggregation["alias"] !== "undefined" && aggregation["alias"] != null && aggregation["alias"] != "") variableNamesCounter[aggregation["alias"]] = 1;
	})
	
	/*var propertyNames = setFieldNamesForProperties(clazz["fields"], variableNamesTable, variableNamesCounter, clazz["identification"]["_id"], knownPrefixes);
	variableNamesTable = propertyNames["variableNamesTable"];
	variableNamesCounter = propertyNames["variableNamesCounter"];*/

	referenceTable[className]["classes"] = [];
	_.each(clazz["children"],function(subclazz) {
		var parentClassIsUnionTemp = clazz["isUnion"];
		if(parentClassIsUnion == true) parentClassIsUnionTemp = true;
		if(parentClassIsUnionTemp == true){
			if(unionClass == null) unionClass = clazz["identification"]["_id"];
		} else unionClass = null;

		let temp = generateClassIds(subclazz, idTable, counter, clazz["identification"]["_id"], parentClassIsUnionTemp, unionClass, knownPrefixes, variableNamesTable, variableNamesCounter, symbolTable);
		/*variableNamesTable = temp["variableNamesTable"];
		variableNamesCounter = temp["variableNamesCounter"];*/

		idTable.concat(temp["idTable"]);
		for(let pr in temp["prefixTable"]){
			if(typeof temp["prefixTable"][pr] === "string") prefixTable[pr] = temp["prefixTable"][pr];
		}
		referenceTable[className]["classes"].push(temp["referenceTable"]);
		counter = temp["counter"];
	})
	
	
	//return {idTable: idTable, referenceTable: referenceTable, counter:counter, prefixTable:prefixTable, variableNamesTable:variableNamesTable, variableNamesCounter:variableNamesCounter};
	return {idTable: idTable, referenceTable: referenceTable, counter:counter, prefixTable:prefixTable};
}

function setFieldAliases(clazz, fields, variableNamesTable, variableNamesCounter, classId){
	_.each(fields,function(field) {
		
		if(typeof field["alias"] !== "undefined" && field["alias"] != null && field["alias"] != "") {
			let alias = field["alias"];
			variableNamesCounter[alias] = 1;
			if(typeof variableNamesTable[classId] === "undefined") variableNamesTable[classId] = [];
			if(typeof variableNamesTable[classId][alias] === "undefined") variableNamesTable[classId][alias] = [];
			variableNamesTable[classId][alias][field["_id"]] = {name:alias, order:field.order, exp:alias, isPath:false, isAlias:true, requireValues:field.requireValues};
		}
	})
	
	_.each(clazz["children"],function(subclazz) {
		let temp = setFieldAliases(subclazz, subclazz.fields, variableNamesTable, variableNamesCounter, subclazz["identification"]["_id"]);
		variableNamesTable = temp.variableNamesTable;
		variableNamesCounter = temp.variableNamesCounter;
	})
	
	return {variableNamesTable:variableNamesTable, variableNamesCounter:variableNamesCounter};
}

function setFieldNamesForProperties(clazz, fields, variableNamesTable, variableNamesCounter, classId, knownPrefixes){
	
	
	if(clazz.isUnion == true ){
		var tempVariableNamesTable = [];
		var tempVariableNamesCounter = [];


		_.each(clazz["children"],function(subclazz) {
			var variableNamesCounterCopy = [];
			for(let vnc in variableNamesCounter){
				variableNamesCounterCopy[vnc] = variableNamesCounter[vnc];
			}
			let temp = setFieldNamesForProperties(subclazz, subclazz.fields, [], variableNamesCounterCopy, subclazz["identification"]["_id"], knownPrefixes);

			for(let vnt in temp.variableNamesTable){
				tempVariableNamesTable[vnt] = temp.variableNamesTable[vnt];
			}
			
			for(let vnc in temp.variableNamesCounter){
				tempVariableNamesCounter[vnc] = temp.variableNamesCounter[vnc];
			}
			
		})
					
		for(let vnt in tempVariableNamesTable){
			variableNamesTable[vnt] = tempVariableNamesTable[vnt];
		}
		for(let vnc in tempVariableNamesCounter){
			if(typeof variableNamesCounter[vnc] ==='undefined' || tempVariableNamesCounter[vnc] > variableNamesCounter[vnc]) variableNamesCounter[vnc] = tempVariableNamesCounter[vnc];
		}		

	} else {
		if(clazz.isUnit != true){
			_.each(fields,function(field) {
				
				if(typeof field["alias"] !== "undefined" && field["alias"] != null && field["alias"] != "") variableNamesCounter[field["alias"]] = 1;
				
				var attributeName = field["exp"];
				if(field["isSimplePath"]){		
					attributeName = field["exp"].split(/[/.\s]/).slice(-1)[0];
				}
				
				if((typeof field["alias"] === "undefined" || field["alias"] == null || field["alias"] == "") && (field["isSimple"] || field["isSimplePath"])){
					
					if(attributeName.indexOf(":") !== -1) attributeName = attributeName.substring(attributeName.indexOf(":")+1)

					if(attributeName.startsWith("[") && attributeName.endsWith("]")){
						let textPart = attributeName.substring(1);
						if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
						else textPart = textPart.substring(0, textPart.length - 1);
						textPart = textPart.trim();
						var t = textPart.match(/([\s]+)/g);
							
						if(t == null || t.length <3 ){
							textPart = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
						} else textPart = attributeName.substring(attributeName.indexOf("(")+1 , attributeName.indexOf(")"));
						
						attributeName = textPart
					}
					attributeName = attributeName.replace(/-/g, '_');
					
					var generatedName = attributeName;
					if(attributeName.startsWith("^") == true) {
						attributeName = "has_"+attributeName.substring(1);
						generatedName = generatedName.substring(1);
					}
					if(attributeName.startsWith("inv(") == true && attributeName.endsWith(")") == true) {
						attributeName = "has_"+attributeName.substring(4, attributeName.length-1);
						generatedName = generatedName.substring(4, generatedName.length-1);
					}
					
					var addName = true;
					
					if(field["kind"] == null && field["exp"].indexOf(":") !== -1){
						addName = false;
						let prefix = field["exp"].substring(0, field["exp"].indexOf(":"));
						for(let kp = 0; kp < knownPrefixes.length; kp++){
							if(knownPrefixes[kp]["name"] == prefix) {
								addName = true;
							}
						}
					}
					// add variable to the table if kind = PN or kind = null and expression is in prefix:name notation, when prefix is known
					if(addName == true){
						if(typeof variableNamesCounter[attributeName] !== "undefined"){
							
							var anCount = "_"+ variableNamesCounter[attributeName]
							variableNamesCounter[attributeName] = variableNamesCounter[attributeName]+1;
							attributeName = attributeName + anCount;
						} else {
							variableNamesCounter[attributeName] = 1;
						}
						if(typeof variableNamesTable[classId] === "undefined") variableNamesTable[classId] = [];
						if(typeof variableNamesTable[classId][generatedName] === "undefined") variableNamesTable[classId][generatedName] = [];
						var isPath = false;
						if(field["isSimplePath"]) isPath = true;
						var fieldExp = field["exp"];
						if(fieldExp.startsWith("^") == true) fieldExp = fieldExp.substring(1);
						if(fieldExp.startsWith("inv(") == true && fieldExp.endsWith(")") == true) fieldExp = fieldExp.substring(4, fieldExp.length-1);
						variableNamesTable[classId][generatedName][field["_id"]] = {name:attributeName, order:field.order, exp:fieldExp, isPath:isPath, requireValues:field.requireValues};
					}
				} 
			
			})
		}
		
		_.each(clazz["children"],function(subclazz) {
			let temp = setFieldNamesForProperties(subclazz, subclazz.fields, variableNamesTable, variableNamesCounter, subclazz["identification"]["_id"], knownPrefixes);
			variableNamesTable = temp.variableNamesTable;
			variableNamesCounter = temp.variableNamesCounter;
		})
	}

	return {variableNamesTable:variableNamesTable, variableNamesCounter:variableNamesCounter};
}

// find prefix, used most offen in query or empty prefix if it is already used
// prefixTable - table with prefixes in a query
function findEmptyPrefix(prefixTable){
	
	let prefix = "";
	return prefix
}

// generate SPARQL query text
// abstractQueryTable - abstract query sintex table
function generateSPARQLtext(abstractQueryTable){
	// console.log("abstractQueryTable", abstractQueryTable)
		 var messages = [];
		
		 // let schemaNames = setSchemaNamesForQuery(abstractQueryTable["root"], [], "");
		 // console.log("SSSSSSSSSSSSSSS", schemaNames)
		
		 var rootClass = abstractQueryTable["root"];
		 var symbolTable = abstractQueryTable["symbolTable"];

		 var parameterTable = abstractQueryTable["params"];
		 var knownPrefixes = abstractQueryTable["prefixes"];
		 
		 let knownPrefixesCombined = combineWithDefinedPrefixes(knownPrefixes, abstractQueryTable.prefixDeclarations);
		 knownPrefixes = knownPrefixesCombined.knownPrefixes;
		 messages = messages.concat(knownPrefixesCombined["messages"]);
		 
		 var classifiers = abstractQueryTable["classifiers"];
		 if(typeof classifiers !== "undefined" && classifiers != null && typeof classifiers["data"] !== "undefined" )classifiers = classifiers["data"];
		 else classifiers = [];

 		 //generate table with unique class names in form [_id] = class_unique_name
		 var generateIdsResult = generateIds(rootClass, knownPrefixes, symbolTable);
		 var idTable = generateIdsResult["idTable"];
		 
		 var referenceTable = generateIdsResult["referenceTable"];
		
		 //empty prefix in query
		 var emptyPrefix = findEmptyPrefix(knownPrefixes);
		
		 //table with unique variable names
		 var variableNamesAll = [];

		 //table with field names (attributes, aggregations)
		 var fieldNames = [];

		//counter for variables with equals names
		 var counter = 0;

		 var tempAttrNames = setAttributeNames(rootClass, idTable, symbolTable, []);
		 var attributesNames = tempAttrNames["attributeNames"];
		 messages = messages.concat(tempAttrNames["messages"]);
		 
		 let result = forAbstractQueryTable(generateIdsResult.variableNamesTable, generateIdsResult.variableNamesCounter, attributesNames, rootClass, null, idTable[rootClass["identification"]["_id"]], idTable, variableNamesAll, counter, [], false, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes, classifiers);

		 messages = messages.concat(result["messages"]);

		 let sparqlTable = result["sparqlTable"];
		  // console.log(result, JSON.stringify(sparqlTable,null,2));

		 // table with prefixes used in query
		 var prefixTable = result["prefixTable"];
		 
		 for(let pr in generateIdsResult["prefixTable"]){
			 prefixTable[pr] = generateIdsResult["prefixTable"][pr];
		 }

		 var SPARQL_text = "";
		 var SPARQL_interval = "  ";
		

		 // if root class is Union
		 if(rootClass["isUnion"] == true){
			
			var unionResult = getUNIONClasses(sparqlTable, null, null, true, referenceTable, SPARQL_interval, parameterTable);
			SPARQL_text = unionResult["result"];
			
			messages = messages.concat(unionResult["messages"]);
			//Prefixes
			let prefixes = "";
			for(let prefix in prefixTable){
				if(typeof prefixTable[prefix] === "string") prefixes = prefixes + "PREFIX " + prefix + " " + prefixTable[prefix] + "\n";
			}
			var commentPrefixes = "";
			if(typeof rootClass["comment"] !== "undefined" && rootClass["comment"] != null && rootClass["comment"] != ""){
				commentPrefixes = "# "+rootClass["comment"].split("\n").join("\n# ") + "\n";	
			}
			commentPrefixes = commentPrefixes + prefixes;
			SPARQL_text = commentPrefixes + SPARQL_text;
			 
		 } else{
			SPARQL_text = "SELECT ";

			 //DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SPARQL_text = SPARQL_text + "DISTINCT ";

			 // console.log("sparqlTable", sparqlTable);
			 var selectResult = generateSELECT(sparqlTable, false);
			 
			 var tempSelect = selectResult["select"];
			 tempSelect = tempSelect.concat(selectResult["aggregate"]);
			 
			 // if (rootClass["labelServiceLanguages"] != null) {
				tempSelect = tempSelect.concat(selectResult["selectLabels"]);
			 // }

			 var whereInfo = generateSPARQLWHEREInfo(sparqlTable, [], [], [], referenceTable, SPARQL_interval+"  ", parameterTable);
		
			 tempSelect= tempSelect.concat(whereInfo["subSelectResult"]);
			 
			 // remove duplicates
			 tempSelect = tempSelect.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			 });
			 
			 SPARQL_text = SPARQL_text + tempSelect.join(" ");
			 
			if(tempSelect.length < 1) {
				
				var listOfElementId = [];
				for(let id in idTable){
					listOfElementId.push(id);
				}
				messages.push({
					"type" : "Error",
					"message" : "Please specify at least one attribute (use (select this) to include the instance itself in the selection)",
					"listOfElementId" : listOfElementId,
					"isBlocking" : true
				});
				SPARQL_text = SPARQL_text + " *";
			 }
			
			var fromText = "";
			if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
				for(let g in rootClass["namedGraphs"]){
					if(typeof rootClass["namedGraphs"][g] === "object" && typeof rootClass["namedGraphs"][g]["graphInstruction"] !== "undefined" && typeof rootClass["namedGraphs"][g]["graph"] !== "undefined"){
						fromText =  fromText +"\n"+ rootClass["namedGraphs"][g]["graphInstruction"] + " " + rootClass["namedGraphs"][g]["graph"] ;
					}
				}
			}
			// var graphService = rootClass.graphsService;
			// if(typeof graphService.graph === "undefined")graphService = null;
			// if(graphService != null){
				// if(!graphService["graph"].startsWith("??") && graphService["graph"].startsWith("?")) SPARQL_text = SPARQL_text + " " +graphService["graph"];
			 // }
			 SPARQL_text = SPARQL_text + fromText;
			 
			 SPARQL_text = SPARQL_text + " WHERE{\n";
			 
			 // if(graphService != null){
				 // let graphName = graphService["graph"];
				 // if(graphName.startsWith("??")) graphName = graphName.substring(1);
				 // SPARQL_text = SPARQL_text + graphService["graphInstruction"] + " " + graphName + " {\n";
			 // }

			var orderBy = getOrderBy(rootClass["orderings"], result["fieldNames"], rootClass["identification"]["_id"], idTable, emptyPrefix, referenceTable, classMembership, knownPrefixes, symbolTable, generateIdsResult.variableNamesTable, generateIdsResult.variableNamesCounter);

			var groupByFromFields = getGroupBy(rootClass["groupings"], result["fieldNames"], rootClass["identification"]["_id"], idTable, emptyPrefix, referenceTable, symbolTable, classMembership, knownPrefixes, generateIdsResult.variableNamesTable, generateIdsResult.variableNamesCounter);
			 let groupByTemp = selectResult["groupBy"].concat(orderBy["orderGroupBy"]);
			 groupByTemp = groupByTemp.concat(groupByFromFields["groupings"]);

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
				
			 }

			 let temp = [];
			 // var temp = whereInfo["links"];
			 // temp = temp.concat(whereInfo["triples"]);
			 // temp = temp.concat(whereInfo["filters"]);
			 messages = messages.concat(whereInfo["messages"]);
			 
			 
			temp = temp.concat(whereInfo["classes"]);
			temp = temp.concat(whereInfo["grounding"]);
			temp = temp.concat(whereInfo["phase2"]);
			temp = temp.concat(whereInfo["graphService"]);
			temp = temp.concat(whereInfo["phase3"]);
			
			temp = temp.concat(whereInfo["filters"]);
			temp = temp.concat(whereInfo["filtersExists"]);
			temp = temp.concat(whereInfo["plainOptionalNotLinks"]);
			temp = temp.concat(whereInfo["phase4"]);
			// temp = temp.concat(whereInfo["requiredSubQueries"]);
			// temp = temp.concat(whereInfo["optionalSubQueries"]);
			// temp = temp.concat(whereInfo["directSubQueries"]);
			// temp = temp.concat(whereInfo["unions"]);
			// temp = temp.concat(whereInfo["plainRequiredLinks"]);
			// temp = temp.concat(whereInfo["attributesValues"]);
			temp = temp.concat(whereInfo["bind"]);
			// temp = temp.concat(whereInfo["minusSubQueries"]);
			// temp = temp.concat(whereInfo["directSparql"]);
			
			var classMembership;
			if(typeof rootClass["indirectClassMembership"] !== 'undefined' && rootClass["indirectClassMembership"] == true && typeof parameterTable["indirectClassMembershipRole"] !== 'undefined' && parameterTable["indirectClassMembershipRole"] != null && parameterTable["indirectClassMembershipRole"] != ""){
				classMembership =  parameterTable["indirectClassMembershipRole"];
				let prefixMembership = getPrefixFromClassMembership(classMembership);
				for(let prefix in prefixMembership) {
					if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];
				}
			}else if(typeof rootClass["indirectClassMembership"] === 'undefined' || rootClass["indirectClassMembership"] != true && typeof parameterTable["directClassMembershipRole"] !== 'undefined' && parameterTable["directClassMembershipRole"] != null && parameterTable["directClassMembershipRole"] != ""){
				classMembership =  parameterTable["directClassMembershipRole"];
				let prefixMembership = getPrefixFromClassMembership(classMembership);
				for(let prefix in prefixMembership) {
					if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];
				}
			} else {
				classMembership = "a";
				// prefixTable["rdf:"] = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
			}


			 messages = messages.concat(orderBy["messages"]);
			 messages = messages.concat(groupByFromFields["messages"]);
			 //add triples from order by
			 temp = temp.concat(orderBy["triples"]);
			 if(rootClass["aggregations"].length > 0) temp = temp.concat(groupByFromFields["triples"]);

			 temp = temp.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});
			
			
			if(temp.length == 0){
				messages.push({
							"type" : "Error",
							"message" : "Insufficient information for query generation. Add a link, an attribute, or a class name",
							"listOfElementId" : [rootClass["identification"]["_id"]],
							"isBlocking" : true
				});
			}
			
			 SPARQL_text = SPARQL_text + SPARQL_interval+ temp.join("\n"+SPARQL_interval);
			 
			  //Label Service Languages
			 // if (rootClass["labelServiceLanguages"] != null) {
			 if (selectResult["selectLabels"].length > 0) {
				SPARQL_text = SPARQL_text + '\n  SERVICE wikibase:label {bd:serviceParam wikibase:language "'+rootClass["labelServiceLanguages"]+'" .}';
				prefixTable["wikibase:"] = "<http://wikiba.se/ontology#>";
				prefixTable["bd:"] = "<http://www.bigdata.com/rdf#>";
			 }
			 
			 // if(graphService != null){
				 // SPARQL_text = SPARQL_text + "\n}";
			 // }
			 SPARQL_text = SPARQL_text + "\n}";
			 // if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + "}}";
			 //GROUP BY

			 var groupBy = groupByTemp.join(" ");
			 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

			 if(rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + groupBy;

			 //ORDER BY

			 if (orderBy["orders"] != "") SPARQL_text = SPARQL_text + "\nORDER BY " + orderBy["orders"];

			 //OFFSET
			 if (rootClass["offset"] != null && rootClass["offset"] != "") {		
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
			 if (rootClass["limit"] != null && rootClass["limit"] != "") {
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
			 let prefixes = "";
			  
			 for(let prefix in prefixTable){
				if(typeof prefixTable[prefix] === "string") prefixes = prefixes + "PREFIX " + prefix + " " + prefixTable[prefix] + "\n";
			 }
			 SPARQL_text = prefixes + SPARQL_text;
			 
			 if(typeof rootClass["comment"] !== "undefined" && rootClass["comment"] != null && rootClass["comment"] != ""){
				  SPARQL_text = "# "+rootClass["comment"].split("\n").join("\n# ") + "\n" + SPARQL_text;
			 }
			 
		 }

		 var blocking = false;
		 var showSPARQL = false;
		 if(messages.length > 0){
			 let showMessages = [];
			 for(let message in messages){
				if(typeof messages[message] === "object") {
					if(messages[message]["isBlocking"] == true){
						blocking = true;
					}
					if(typeof messages[message]["generateSPARQL"] !== "undefined" && messages[message]["generateSPARQL"] == true){
						showSPARQL = true;
					}
					showMessages.push(messages[message]["message"]);
				}
			 }
			 
			showMessages = showMessages.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});

			Interpreter.showErrorMsg(showMessages.join(" // "), -3);
		 }
		 
		 // console.log(rootClass["comment"], SPARQL_text);
		 return {"SPARQL_text":SPARQL_text, "messages":messages, "blocking":blocking, "showSPARQL":showSPARQL, "comment":rootClass["comment"]};
}

function getPrefix(emptyPrefix, givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}

function getPrefixFromClassMembership(classMembership){
	let prefixes = [];
	if(!classMembership.startsWith("<")){
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
		   "dcterms:":"http://purl.org/dc/terms/",
		   "wdt:": "http://www.wikidata.org/prop/direct/"
		}

	
		
		var splitParts = classMembership.split("/")
		for(let p = 0; p < splitParts.length; p++) {
			var part = splitParts[p];

			if(part.indexOf(":") != -1) {
				prefixes[part.substring(0, part.indexOf(":")+1)] = "<"+knownNamespaces[part.substring(0, part.indexOf(":")+1)]+">";
			}
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
function forAbstractQueryTable(variableNamesTable, variableNamesCounter, attributesNames, clazz, parentClass, rootClassId, idTable, variableNamesAll, counter, sparqlTable2, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes, classifiers){

	var messages = [];
	var prefixTable = [];
	if(clazz.instanceAlias != null && clazz.instanceIsConstant == false && clazz.instanceIsVariable == false && clazz.instanceAlias.indexOf("_:name") == -1){
		messages.push({
			"type" : "Error",
			"message" : "Instance identification '"+clazz["instanceAlias"]+"' can not be interpreted as an identifier (variable) or a constant (URI, number, string)",
			"listOfElementId" : [clazz["identification"]["_id"]],
			"isBlocking" : true
		});
	}

	var classMembership;
	if(typeof clazz["indirectClassMembership"] !== 'undefined' && clazz["indirectClassMembership"] == true && typeof parameterTable["indirectClassMembershipRole"] !== 'undefined' && parameterTable["indirectClassMembershipRole"] != null && parameterTable["indirectClassMembershipRole"] != ""){
		classMembership =  parameterTable["indirectClassMembershipRole"];
		let prefixMembership = getPrefixFromClassMembership(classMembership);
		for(let prefix in prefixMembership) {
			if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];
	
		}
	}else if(typeof clazz["indirectClassMembership"] === 'undefined' || clazz["indirectClassMembership"] != true && typeof parameterTable["directClassMembershipRole"] !== 'undefined' && parameterTable["directClassMembershipRole"] != null && parameterTable["directClassMembershipRole"] != ""){
		if(typeof clazz["identification"]["classification_property"] !== "undefined" && clazz["identification"]["classification_property"] !== "" &&  clazz["identification"]["classification_property"] != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
			var shortForm = getPropertyShortForm(clazz["identification"]["classification_property"], knownPrefixes)
			classMembership = shortForm.name;
			if(typeof shortForm.prefix !== "undefined") prefixTable[shortForm.prefix] = "<"+shortForm.namespace+">";
		} else {
			classMembership =  parameterTable["directClassMembershipRole"];
			let prefixMembership = getPrefixFromClassMembership(classMembership);
			for(let prefix in prefixMembership) {
				if(typeof prefixMembership[prefix] === 'string') prefixTable[prefix] = prefixMembership[prefix];

			}
		}
	} else {
		classMembership = "a";
		// prefixTable["rdf:"] = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";
	}

	if(clazz["instanceAlias"] != null && clazz["instanceAlias"].replace(" ", "") != "" && clazz["instanceAlias"].indexOf(" ") >= 0 && clazz["instanceAlias"].indexOf("[") == -1) {
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
		let prefix = instance.substring(0, instance.indexOf(":"));

		for(let p in knownPrefixes) {
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
	sparqlTable["filetrAsTripleTable"] = []; // filters as triples from 'Conditions'
	sparqlTable["filters"] = []; // filter expression for fields from 'Conditions'
	sparqlTable["conditionLinks"] = []; //links with condition label for given class
	sparqlTable["selectMain"] = []; // select values from given class for upper SELECT level
	sparqlTable["selectMain"]["simpleVariables"] = []; // select value for simple fields from 'Attributes'
	sparqlTable["selectMain"]["labelVariables"] = []; // select value for labels from 'Attributes'
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
	sparqlTable["getSubQueryResults"] = false; // getSubQueryResults
	sparqlTable["labelServiceLanguages"] = clazz["labelServiceLanguages"]; // labelServiceLanguages
	sparqlTable["graph"] = clazz["graphsService"]; // graph
	sparqlTable["graphLink"] = clazz["graphsServiceLink"]; // graph link
	
	// sparqlTable["graphInstruction"] = clazz["graphInstruction"]; // graphInstruction
	// sparqlTable["graphs"] = clazz["graphs"]; // graphInstruction
	var classSimpleTriples = [];
	var classExpressionTriples = [];
	var classFunctionTriples = [];


	if(clazz["isVariable"] == true) {
		
		if(clazz.identification.local_name.startsWith("?") == false){	
			var classifier = clazz.identification.local_name.substring(1, clazz.identification.local_name.indexOf(")"))
			if(classifiers.length > 0 ){	
				for(let c = 0; c < classifiers.length; c++){
	
					if(classifiers[c]["classif_prefix"] == classifier){
						classMembership = classifiers[c]["prefix"] + ":" + classifiers[c]["display_name"];
						
						for(let p = 0; p < knownPrefixes.length; p++){
							if(knownPrefixes[p]["name"] == classifiers[c]["prefix"]) {
								prefixTable[classifiers[c]["prefix"]+":"] = "<"+knownPrefixes[p]["value"]+">";
								break;
							}
							
						}
						break;
					}
				}
			}
		}
		
		var varName = clazz["variableName"];
		if(varName == "?") varName = instance;
		if(clazz["variableName"].startsWith("?")) varName = varName.substr(1);
		if(checkIfIsURI(instance) == "prefix_form") sparqlTable["classTriple"] = instance + " " + classMembership + " ?" + varName+ ".";
		if(checkIfIsURI(instance) == "full_form" ) sparqlTable["classTriple"] = "<" + instance + "> " + classMembership + " ?" + varName+ ".";
		else sparqlTable["classTriple"] = "?" + instance + " " + classMembership + " ?" + varName+ ".";
		
		if(underNotLink != true && clazz["variableName"].startsWith("?") == false)sparqlTable["variableName"] = "?" + varName;

		if(typeof fieldNames[varName] === 'undefined') fieldNames[varName] = [];
		let aliasTable = {};
		aliasTable[varName] = idTable[clazz["identification"]["_id"]];
		fieldNames[varName][clazz["identification"]["_id"]] = aliasTable;
	}
	else if(clazz["identification"]["local_name"] != "[ ]" && clazz["isUnion"] != true && clazz["isUnit"] != true && clazz["identification"]["local_name"] != "[ + ]" && clazz["identification"]["local_name"] != null && clazz["identification"]["local_name"] != "" && clazz["identification"]["local_name"] != "(no_class)") {
		var instAlias = clazz["instanceAlias"]
		if(instAlias != null && instAlias.replace(" ", "") =="") instAlias = null;
		if(instAlias != null) instAlias = instAlias.replace(/ /g, '_');
		
		
		// if(typeof clazz["identification"]["parsed_exp"] === 'undefined'){
			// messages.push({
				// "type" : "Error",
				// "message" : "Syntax error in class name " + clazz["identification"]["local_name"],
				// "listOfElementId" : [clazz["identification"]["_id"]],
				// "isBlocking" : true
			// });
		// } else{
			// var resultClass = parse_attrib(clazz, clazz["identification"]["exp"], variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], clazz["identification"]["parsed_exp"], instAlias, instance, clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership, "class", knownPrefixes);
			var resultClass = parse_class(clazz, symbolTable, parameterTable, idTable, referenceTable, classMembership, knownPrefixes)
	
			for(let prefix in resultClass["prefixTable"]) {
				if(typeof resultClass["prefixTable"][prefix] === 'string') prefixTable[prefix] = resultClass["prefixTable"][prefix];
			}

			// counter = resultClass["counter"]

			let temp = [];
			messages = messages.concat(resultClass["messages"]);

			for(let triple in resultClass["triples"]){
				if(typeof resultClass["triples"][triple] === 'string')temp.push(resultClass["triples"][triple]);
			}
			if(resultClass["isAggregate"] == true || resultClass["isExpression"] == true || resultClass["isFunction"] == true){
				sparqlTable["isSimpleClassName"] = false;
				var tempTripleTable = [];
				tempTripleTable["bind"] = "BIND(" + resultClass["exp"] + " AS ?" + instance + ")";
				//sparqlTable["expressionTriples"].push(tempTripleTable);
				classSimpleTriples.push(tempTripleTable);
			}
			sparqlTable["classTriple"] = temp.join("\n"); // triples for class name
			// sparqlTable["classTriple"] = "?" + instance + " a " + getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) + ":" + clazz["identification"]["local_name"] + ".";
			var namespace = clazz["identification"]["Namespace"]
			if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
			if(typeof clazz["identification"]["Prefix"] !== 'undefined')prefixTable[getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) +":"] = "<"+namespace+">";
		// }
	}

	
	//attributes
	_.each(clazz["fields"],function(field) {
		
		if(field["exp"] == "(select this)" && (clazz["isUnit"] == true || clazz["isUnion"] == true)){
			if(field["alias"] !== null && field["alias"] !== ""){
			messages.push({
						"type" : "Error",
						"message" : "Property (select this) can not be defined at a node without data instance",
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : false
			});
			} else {
				messages.push({
						"type" : "Error",
						"message" : "Property (select this) can not be defined at a node without data instance",
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : true
			});
			}
		}
		if(clazz["isUnit"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			
			
			
			let result = parse_attrib(clazz, field["exp"], variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable, referenceTable, classMembership, null, knownPrefixes, field["order"], field["_id"]);		
			
			for(let t in result["triples"]){
				if(result["triples"][t] === "object"){
					if(result["triples"][t].startsWith("BIND(")){
						classSimpleTriples.push({"triple":[result["triples"][t]]});
					}
				}
			}
			
			messages = messages.concat(result["messages"]);
			var refName = result["exp"]

			sparqlTable["selectMain"]["simpleVariables"].push({"alias": refName, "value" : refName});
			
			if(field["exp"].startsWith("??") == false && field["addLabel"] == true){
				sparqlTable["selectMain"]["labelVariables"].push({"alias": "?"+field["exp"]+"Label", "value" : "?"+field["exp"]+"Label"});
			}
			if(field["exp"].startsWith("??") == false && field["addAltLabel"] == true){
				sparqlTable["selectMain"]["labelVariables"].push({"alias": "?"+field["exp"]+"AltLabel", "value" : "?"+field["exp"]+"AltLabel"});	
			}
			if(field["exp"].startsWith("??") == false &&  field["addDescription"] == true){
				sparqlTable["selectMain"]["labelVariables"].push({"alias": "?"+field["exp"]+"Description", "value" : "?"+field["exp"]+"Description"});	
			}
			
		} else if(clazz["isUnion"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			let alias = field["exp"];
			if(field["alias"] != null && field["alias"] != "") alias = field["alias"]; 
			sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+alias, "value" : "?"+field["exp"]});
		} else if(field["exp"] == "[*sub]") {
			sparqlTable["getSubQueryResults"] = true;
		} else {
			if(typeof field["parsed_exp"] === 'undefined' && field["exp"] != "(select this)"){
				if(field["exp"].replace(/ /g, '') == "") {
					messages.push({
						"type" : "Error",
						"message" : "warning: empty attribute compartment in node " + clazz["identification"]["display_name"],
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
			if(field["alias"] != null && field["alias"].replace(" ", "") !="" && field["alias"].indexOf(" ") >= 0 && field["alias"].indexOf(",") == -1) {
				messages.push({
					"type" : "Error",
						"message" : "Whitespace characters not allowed in property alias " + field["alias"],
						"listOfElementId" : [clazz["identification"]["_id"]],
						"isBlocking" : false
					});
					field["alias"] = field["alias"].replace(/ /g, '_');
				}
				// console.log("parse_attrib",  JSON.stringify(field["parsed_exp"],null,2));
				let result = parse_attrib(clazz, field["exp"], variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable, referenceTable, classMembership, null, knownPrefixes, field["order"], field["_id"]);
				
				messages = messages.concat(result["messages"]);
				  // console.log("ATTRIBUTE", result, field, symbolTable[clazz["identification"]["_id"]][field["exp"]]);
				 
				 if(typeof field["attributeConditionSelection"] !== "undefined" && field["attributeConditionSelection"] !== null && field["attributeConditionSelection"] !== ""){
					var resultC = parse_filter(clazz, field["attributeConditionSelection"], variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], field["attributeConditionSelection"]["parsed_exp"], clazz["identification"]["display_name"], clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, sparqlTable["classTriple"], parameterTable, idTable, referenceTable, classMembership, knownPrefixes, field["_id"], false);
					if(field["requireValues"] !== true){
						if(field["nodeLevelCondition"] == true) result.nodeLevelCondition = "FILTER(" + resultC["exp"] + ")";
						else if(typeof result.triples[0] !== "undefined"){
							var attributeCond = " FILTER(" + resultC["exp"] + ")";
							if(result.isExpression == true || result.isFunction == true) attributeCond = " FILTER(!BOUND(" + result.variables[0] +") || (" + resultC["exp"] + ")) ";
							result.triples[0] = result.triples[0] + attributeCond;
						}
					} else {
						sparqlTable["filters"].push("FILTER(" + resultC["exp"] + ")")
					}
				 }
				 
				sparqlTable["variableReferenceCandidate"].concat(result["referenceCandidateTable"]);
				for(let reference in result["referenceCandidateTable"]){
					if(typeof result["referenceCandidateTable"][reference] === 'string') sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
				}
				for(let reference in result["references"]){
					if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
				}

				counter = result["counter"]

				for(let prefix in result["prefixTable"]) {
					if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
				}

				let alias = field["alias"];
				if(alias == null || alias == "") {
					alias = "expr_" + counter;
					counter++;
				} else {
					if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
					let aliasTable = {};
					aliasTable[alias] =  alias;
					fieldNames[alias][clazz["identification"]["_id"]] = aliasTable;
				}

				//agregation in class
				if(result["isAggregate"] == true) {
					
					if(typeof field.attributeConditionSelection !== "undefined" && field.attributeConditionSelection !== null && field.attributeConditionSelection !== ""){
						messages.push({
							"type" : "Error",
							"message" : "The attribute condition '" + field.attributeConditionSelection.exp +"' is not allowed with local aggregation " + field.exp,
							"listOfElementId" : [clazz["identification"]["_id"]],
							"isBlocking" : true
						});
					}
					
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

								let classes = [];
								if(typeof variableNamesAll[tempAlias]["classes"] !== 'undefined') classes = variableNamesAll[tempAlias]["classes"];
								let aliasTable = {};
								aliasTable[tempAlias] =  tempAlias + "_" + count;
								classes[clazz["identification"]["_id"]] = aliasTable;
								variableNamesAll[tempAlias]["classes"] = classes;
							}
							else {
								alias = tempAlias;
								let classes = []
								let aliasTable = {};
								aliasTable[tempAlias] =  tempAlias;
								classes[clazz["identification"]["_id"]] = aliasTable;
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
					for(let triple in result["triples"]){
						if(typeof result["triples"][triple] === 'string') tempTripleTable.push(result["triples"][triple]);
					}

					var uniqueTriples = tempTripleTable.filter(function (el, i, arr) {
						return arr.indexOf(el) === i;
					});
					var rootClass = "?" + idTable[clazz["identification"]["_id"]] + " ";
					var clTriple = sparqlTable["classTriple"];
					if(clazz["isUnion"] == true || clazz["isUnit"] == true) {
						rootClass = "";
						if(parentClass != null && parentClass["identification"] != null && parentClass["identification"]["local_name"] !== null){
							clTriple = "?" + idTable[parentClass["identification"]["_id"]] + " " + classMembership + " " + parentClass["identification"]["prefix"] + ":" + parentClass["identification"]["local_name"]
						}
					}
					var localAggregation = "{SELECT " + rootClass + "(" + result["exp"] + " AS ?" + alias + ") WHERE{";

					if(field["requireValues"] != true && clazz["identification"]["local_name"] != "(no_class)" && typeof clTriple !== "undefined") {
						localAggregation = localAggregation + clTriple; 
						if(uniqueTriples.length > 0 ) localAggregation = localAggregation +" OPTIONAL{";
					}
					else if(field["requireValues"] != true && clazz["identification"]["local_name"] != "(no_class)" && typeof clTriple === "undefined") localAggregation = "OPTIONAL"+localAggregation;

					localAggregation = localAggregation + uniqueTriples.join(" ");

					if(field["requireValues"] != true && typeof clTriple !== "undefined" && uniqueTriples.length > 0) localAggregation = localAggregation + "}";

					localAggregation = localAggregation +"} GROUP BY ?" + idTable[clazz["identification"]["_id"]] +"}";
					sparqlTable["localAggregateSubQueries"].push(localAggregation);
					
					//requireValues
				}

				//function in expression
				else if(result["isFunction"] == true) {
					
					
					//functionTriples

					let tripleTemp = getTriple(result, alias, field["requireValues"], true);
					
					// if(typeof field["graph"] !== "undefined" && typeof field["graphInstruction"] !== "undefined" && field["graph"] !== null && field["graphInstruction"] !== null && field["graph"] !== "" && field["graphInstruction"] !== ""){
								// tripleTemp["graph"] = field["graph"];
								// tripleTemp["graphInstruction"] = field["graphInstruction"];
							// }
							
					if(field["requireValues"] == true) tripleTemp["requireValues"] = true;
					else tripleTemp["requireValues"] = false;
					
					classSimpleTriples.push(tripleTemp);
					
					//MAIN SELECT function variables (not undet NOT link and is not internal)
					if(underNotLink != true && field["isInternal"] != true){
						sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						for(let variable in result["variables"]){
							if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
						}
					}
					if(underNotLink != true && field["addLabel"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"Label", "value" : alias+"Label"});	
					}
					if(underNotLink != true && field["addAltLabel"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"AltLabel", "value" : alias+"AltLabel"});	
					}
					if(underNotLink != true && field["addDescription"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"Description", "value" : alias+"Description"});	
					}
				}

				//expression in expression
				else if(result["isExpression"] == true) {
					//expressionTriples
					let tripleTemp = getTriple(result, alias, field["requireValues"], true);
					// if(typeof field["graph"] !== "undefined" && typeof field["graphInstruction"] !== "undefined" && field["graph"] !== null && field["graphInstruction"] !== null && field["graph"] !== "" && field["graphInstruction"] !== ""){
						// tripleTemp["graph"] = field["graph"];
						// tripleTemp["graphInstruction"] = field["graphInstruction"];
					// }	
					
					if(field["requireValues"] != true && typeof tripleTemp["triple"] !== "undefined" && tripleTemp["triple"].length > 0 ){	
						for(let t = 0; t < tripleTemp["triple"].length; t++){
							tripleTemp["triple"][t] = "OPTIONAL{" + tripleTemp["triple"][t] + "}";
						}
					}

					classSimpleTriples.push(tripleTemp);

					// MAIN SELECT expression variables (not undet NOT link and is not internal)
					if(underNotLink != true && field["isInternal"] != true){
						//sparqlTable["selectMain"]["expressionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
						for(let variable in result["variables"]){
							if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
						}
					}
					if(underNotLink != true && field["addLabel"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"Label", "value" : alias+"Label"});
					}
					if(underNotLink != true && field["addAltLabel"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"AltLabel", "value" : alias+"AltLabel"});	
					}
					if(underNotLink != true && field["addDescription"] == true){
						sparqlTable["selectMain"]["labelVariables"].push({"alias": alias+"Description", "value" : alias+"Description"});	
					}
				}
				//simple triples
				else {
						alias = result["exp"];
						var tempTripleTable = [];

						if(field["requireValues"] == true) tempTripleTable["requireValues"] = true;
						tempTripleTable["triple"] = [];
						for(let triple in result["triples"]){
							if(typeof result["triples"][triple] === 'string')tempTripleTable["triple"].push(result["triples"][triple]);
							// if(typeof field["graph"] !== "undefined" && typeof field["graphInstruction"] !== "undefined" && field["graph"] !== null && field["graphInstruction"] !== null && field["graph"] !== "" && field["graphInstruction"] !== ""){
								// tempTripleTable["graph"] = field["graph"];
								// tempTripleTable["graphInstruction"] = field["graphInstruction"];
							// }
						}
						if(typeof result.nodeLevelCondition !== "undefined") tempTripleTable["nodeLevelCondition"] = result.nodeLevelCondition;	
						//sparqlTable["simpleTriples"].push(tempTripleTable);
						classSimpleTriples.push(tempTripleTable);				

						// MAIN SELECT simple variables (not undet NOT link and is not internal)
						if(underNotLink != true && (field["isInternal"] != true || field["exp"].startsWith("?"))){
							if(field["exp"].startsWith("??") == false ){
								sparqlTable["selectMain"]["simpleVariables"].push({"alias": alias, "value" : alias});
								for(let variable in result["variables"]){
									if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
								}
							}
						}
						if(underNotLink != true){
							var aliasLTemp = alias;
							if(alias.indexOf(" ?") != -1) aliasLTemp = alias.substring(alias.indexOf(" ?") + 1);
							if(field["exp"].startsWith("??") == false && field["addLabel"] == true){
								sparqlTable["selectMain"]["labelVariables"].push({"alias": aliasLTemp+"Label", "value" : aliasLTemp+"Label"});
							}
							if(field["exp"].startsWith("??") == false && field["addAltLabel"] == true){
								sparqlTable["selectMain"]["labelVariables"].push({"alias": aliasLTemp+"AltLabel", "value" : aliasLTemp+"AltLabel"});	
							}
							if(field["exp"].startsWith("??") == false &&  field["addDescription"] == true){
								sparqlTable["selectMain"]["labelVariables"].push({"alias": aliasLTemp+"Description", "value" : aliasLTemp+"Description"});	
							}
						}
				}
			}
		}
	})
	// classSimpleTriples = classSimpleTriples.concat(classExpressionTriples);
	classSimpleTriples = classSimpleTriples.concat(classFunctionTriples);
	
	if(clazz["isBlankNode"] != true)sparqlTable["simpleTriples"] = classSimpleTriples;
	else {
		
		var isBlankNode = true;
		for(let v in classSimpleTriples){
			for(let triple in classSimpleTriples[v]["triple"]){
				if(typeof classSimpleTriples[v]["triple"][triple] !=="function" && classSimpleTriples[v]["triple"][triple].indexOf("<") !== -1 && classSimpleTriples[v]["triple"][triple].indexOf(">") != -1) {
					isBlankNode = false;
					break;
				}
			}
		}
		if(isBlankNode == true){
			sparqlTable["blankNodeTriples"] = classSimpleTriples;
			if(typeof clazz.children !== "undefined" && clazz.children.length > 0){
				sparqlTable["isParentBlankNode"] = true;
			}
		} else {sparqlTable["simpleTriples"] = classSimpleTriples;}
	}
	
	var isMultipleAllowedAggregation = false;
	var isMultipleAllowedCardinality = false;
	
	if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
		
		 var aggregationInFragment = getAggregationFromFragment(clazz, []);
		 if(aggregationInFragment.length > 1){
			 for(let agr = 0; agr < aggregationInFragment.length; agr++){
				var aggregation = aggregationInFragment[agr];
				let aggregationParseResult = parseAggregationMultiple(aggregation["aggregation"]["parsed_exp"], symbolTable[aggregation["classId"]]);
				if(aggregationParseResult["isMultipleAllowedAggregation"] == true) {
						isMultipleAllowedAggregation = true;
						for(let agr2 = 0; agr2 < aggregationInFragment.length; agr2++){
							var  aggregation2 = aggregationInFragment[agr2]["aggregation"];
							if(aggregation != aggregation2){
								let aggregationParseResult = parseAggregationMultiple(aggregation2["parsed_exp"], symbolTable[aggregation2["classId"]]);
								if(aggregationParseResult["isMultipleAllowedCardinality"] == true) isMultipleAllowedCardinality = true;
							}
						}
				}
			}
		}
		if(isMultipleAllowedAggregation == true && isMultipleAllowedCardinality == true){
			messages.push({
				"type" : "Error",
				"message" : "Ambiguous aggregation scope due to multiple aggregation expressions in a single node. Place each aggregation expression into a separate node, or ensure that each aggregation body is single-valued (max cardinality 1) with respect to its node in the query.",
				"listOfElementId" : [clazz["identification"]["_id"]],
				"isBlocking" : true
			});
		}  
	}

	
	// if(clazz["aggregations"].length > 1){
		// _.each(clazz["aggregations"],function(field) {
			
			// var aggregationParseResult = parseAggregationMultiple(field["parsed_exp"], symbolTable[clazz["identification"]["_id"]]);
			// if(aggregationParseResult["isMultipleAllowedAggregation"] == true) {
				// isMultipleAllowedAggregation = true;
				// _.each(clazz["aggregations"],function(field2) {
					// if(field != field2){
						// var aggregationParseResult = parseAggregationMultiple(field2["parsed_exp"], symbolTable[clazz["identification"]["_id"]]);
						// if(aggregationParseResult["isMultipleAllowedCardinality"] == true) isMultipleAllowedCardinality = true;
					// }
				// })
			// }
		// })
	// }

	
	

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
				let result;
				
				if(clazz["isUnit"] != true){
					result = parse_attrib(clazz, field["exp"], variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership,  "aggregation", knownPrefixes);
					
					counter = result["counter"];

				} else {
					result = parse_attrib(clazz, field["exp"], variableNamesTable, variableNamesCounter, [], clazz["identification"]["_id"], field["parsed_exp"], field["alias"], instance, clazz["identification"]["display_name"], [], [], counter, emptyPrefix, symbolTable, false, parameterTable, idTable, referenceTable, classMembership,  "aggregation", knownPrefixes);
				}
				messages = messages.concat(result["messages"]);
				for(let prefix in result["prefixTable"]) {
					if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
				}
				let alias = field["alias"];
				if(alias == null || alias == "") {
					if(result["isExpression"] == false && result["isFunction"] == false) {

						var indexCole = result["exp"].indexOf(";");
						var endIndex = result["exp"].indexOf(")");
						if(indexCole != -1 && indexCole < endIndex) endIndex = indexCole;

						var tempAlias = result["exp"].substring(result["exp"].indexOf("?")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
						if(result["exp"].indexOf("?") == -1) tempAlias = result["exp"].substring(result["exp"].indexOf(":")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
						if(result["exp"].indexOf("?") == -1 && result["exp"].indexOf("*") != -1) {tempAlias = result["exp"].substring(0, result["exp"].indexOf("(")) + "_all";}
						
						if(typeof variableNamesAll[tempAlias] !== 'undefined') {
							var count = variableNamesAll[tempAlias]["counter"] + 1;
							variableNamesAll[tempAlias]["counter"]  = count;
							alias = tempAlias + "_" + count;

							let classes = [];
							if(typeof variableNamesAll[tempAlias]["classes"] !== 'undefined') classes = variableNamesAll[tempAlias]["classes"];
							
							let aliasTable = {};
							aliasTable[tempAlias] =  alias;
							classes[clazz["identification"]["_id"]] = aliasTable;
							variableNamesAll[tempAlias]["classes"] = classes;
							
						}
						else {
							alias = tempAlias;
							let classes = []
							let aliasTable = {};
							aliasTable[tempAlias] =  tempAlias;
							classes[clazz["identification"]["_id"]] = aliasTable;
							variableNamesAll[tempAlias] = {"alias":tempAlias, "nameIsTaken":true, counter:0, "isVar" : false, "classes" : classes};
						}

					} else {
						alias = "expr_" + counter;
						counter++;
					}
				}
				if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
				let aliasTable = {};
				aliasTable[alias] =  alias;
				fieldNames[alias][clazz["identification"]["_id"]] = aliasTable;

				//aggregateTriples only in main class or subselect main class
				// if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
					sparqlTable["agregationInside"] = true;
					let triple = getTriple(result, alias, field["requireValues"], false);
					if(field["requireValues"] != true){
						for(let t = 0; t < triple["triple"].length; t++){
							triple["triple"][t] = "OPTIONAL{" + triple["triple"][t] + "}";
						}
					}
					// if(field["requireValues"] != true) triple = "OPTIONAL{" + triple "}";
					sparqlTable["aggregateTriples"].push(triple);
					//MAIN SELECT agregate variables
					if(result["exp"] != "" && field["helper"] != true)sparqlTable["selectMain"]["aggregateVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					//hidden aggregation as bind
					if(result["exp"] != "" && field["helper"] == true){
						var aggrExpr = "BIND(" + result["exp"] + " AS ?" + alias + ")";
						let triple = [];
						triple["triple"] = [];
						triple["triple"].push(aggrExpr);
						sparqlTable["aggregateTriples"].push(triple);
					}
					
					for(let variable in result["variables"]){
						if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["aggregateVariables"].push(result["variables"][variable]);
					}
					
				// } else {
					// messages.push({
						// "type" : "Error",
						// "message" : "Aggregate functions are not allowed in '" + clazz["identification"]["local_name"] + "' class. Use aggregate functions in query main class or subquery main class.",
						// "listOfElementId" : [clazz["identification"]["_id"]],
						// "isBlocking" : true
					// });
				// }
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
			
			let result = parse_filter(clazz, condition, variableNamesTable, variableNamesCounter, attributesNames, clazz["identification"]["_id"], condition["parsed_exp"], instance, clazz["identification"]["display_name"], variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, sparqlTable["classTriple"], parameterTable, idTable, referenceTable, classMembership, knownPrefixes, condition["_id"]);
			messages = messages.concat(result["messages"]);
			// console.log("FILTER", result, condition["exp"]);
			for(let reference in result["referenceCandidateTable"]){
				if(typeof result["referenceCandidateTable"][reference] === 'string')sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
			};
			for(let reference in result["references"]){
				if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
			}

			counter = result["counter"]

			for(let prefix in result["prefixTable"]) {
				if(typeof result["prefixTable"][prefix] === 'string')  prefixTable[prefix] = result["prefixTable"][prefix];
			}

			var tempTripleTable = [];
			tempTripleTable["triple"] = [];
			for(let triple in result["triples"]){
				if(typeof result["triples"][triple] === 'string') {
					if(!result["triples"][triple].startsWith("BIND(")) tempTripleTable["triple"].unshift(result["triples"][triple]);
					else tempTripleTable["triple"].push(result["triples"][triple]);
				}
			}
			sparqlTable["filterTriples"].push(tempTripleTable);
			sparqlTable["filetrAsTripleTable"] = sparqlTable["filetrAsTripleTable"].concat(result["filetrAsTripleTable"]);
			if(result["exp"] != "") sparqlTable["filters"].push("FILTER(" + result["exp"] + ")");

		}
		// console.log("CONDITION", result["exp"], result, instance, sparqlTable["classTriple"]);
	})
	
	if(clazz["isBlankNode"] == true && parentClass == null){
		
		var blankNodeName = idTable[clazz["identification"]["_id"]];
		var object = "[";
						let blankNodes = [];
						for(let triple in  sparqlTable["blankNodeTriples"]){
							for(let t = 0; t < sparqlTable["blankNodeTriples"][triple]["triple"].length; t++){
								blankNodes.push(sparqlTable["blankNodeTriples"][triple]["triple"][t].replace(blankNodeName, "").replace(".", ""));
							}
						}
						
						for(let triple in  sparqlTable["filterTriples"]){
							for(let t = 0; t < sparqlTable["filterTriples"][triple]["triple"].length; t++){
								blankNodes.push(sparqlTable["filterTriples"][triple]["triple"][t].replace(blankNodeName, "").replace(".", ""));		
							}
						}
						object = object + blankNodes.join(";");
						object = object+ "]";
		if(object != "[]")sparqlTable["classTriple"] = object;
		
	}
	
											
	//subClasses
	if(clazz["children"].length > 0){
		sparqlTable["subClasses"] = []; // class all sub classes
	};

	_.each(clazz["children"],function(subclazz) {
		var tempUnderNotLink = underNotLink;
		
		if(subclazz["linkType"] == 'NOT') underNotLink = true;

		let temp = forAbstractQueryTable(variableNamesTable, variableNamesCounter, attributesNames, subclazz, clazz, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable, referenceTable, knownPrefixes, classifiers);
		if(subclazz.linkIdentification.local_name == "==") temp["sparqlTable"]["linkNameType"] = "sameDataLink";
		else if(subclazz.linkIdentification.local_name == "++") temp["sparqlTable"]["linkNameType"] = "freeLink";
		else if(subclazz.linkIdentification.local_name.startsWith("?")) temp["sparqlTable"]["linkNameType"] = "propertyVariableLink";
		else temp["sparqlTable"]["linkNameType"] = "singleProperty";
		messages = messages.concat(temp["messages"]);
		counter = temp["counter"];

		for(let prefix in temp["prefixTable"]) {
			if(typeof temp["prefixTable"][prefix] === 'string') prefixTable[prefix] = temp["prefixTable"][prefix];
		}
		underNotLink = tempUnderNotLink;
		//link triple
		//if(typeof subclazz["linkIdentification"]["local_name"] !== 'undefined'){
			// if((subclazz["linkIdentification"]["local_name"] == null || subclazz["linkIdentification"]["local_name"] == "") && subclazz["identification"]["local_name"] != "[ ]" && subclazz["isUnion"] != true && subclazz["isUnit"] != true && subclazz["identification"]["local_name"] != "[ + ]") {
			if((subclazz["linkIdentification"]["local_name"] == null || subclazz["linkIdentification"]["local_name"] == "") && subclazz["isGraphToContents"] != true && subclazz["isUnion"] !== true) {
				
				messages.push({
					"type" : "Error",
					"message" : "Empty link between nodes ("+ clazz["identification"]["local_name"] +") and ("+  subclazz["identification"]["local_name"] +"). Please specify the link property or ++ for the link without property.",
					"listOfElementId" : [subclazz["linkIdentification"]["_id"]],
					"isBlocking" : false
				});
			}
			
			if(subclazz["isUnion"] === true && (subclazz["linkIdentification"]["local_name"] != null && subclazz["linkIdentification"]["local_name"] != "" && subclazz["linkIdentification"]["local_name"] !== "++" && subclazz["linkIdentification"]["local_name"] != "==")){
				messages.push({
					"type" : "Error",
					"message" : "Edges incoming into UNION nodes can not correspond to properties or variables; they have to be same-data (label ==) edges. Create a data node above the UNION node and link the property/variable edge there",
					"listOfElementId" : [subclazz["linkIdentification"]["_id"]],
					"isBlocking" : false
				});
			}

			if(subclazz["linkIdentification"]["local_name"] != null && subclazz["linkIdentification"]["local_name"] != "++"){
				var subject, preditate, object;
				if(subclazz["linkIdentification"]["local_name"].startsWith('?')) {
					if(subclazz["linkIdentification"]["local_name"].startsWith('??') == true) {
						if(subclazz["linkIdentification"]["local_name"] == "??") {
							preditate = " ?property";

							var tempAlias = "?property_";

							var vn = "property";
							// if(typeof variableNamesClass[vn]=== 'undefined'){
							// if(typeof variableNamesTable[clazz["identification"]["_id"]] ==='undefined' || typeof variableNamesTable[clazz["identification"]["_id"]][vn]=== 'undefined'){
								// if(typeof variableNamesAll[vn]=== 'undefined'){
								if(typeof variableNamesCounter[vn]=== 'undefined'){
									//expressionLevelNames[vn] = vn;
									preditate = " ?" + vn;
									variableNamesCounter[vn] = 1;
									// var aliasTable = {};
									// aliasTable[vn] =  tempAlias;
									// variableNamesClass[vn] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
									// var classes = [];
									// classes[clazz["identification"]["_id"]] = aliasTable;
									// variableNamesAll[vn] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false, "classes" : classes};
									//alias = tempAlias;
								} else {
									var count = variableNamesCounter[vn] + 1;
									//expressionLevelNames[vn] = vn + "_" +count;
									preditate = " ?" + vn + "_" +count;
									variableNamesCounter[vn] = variableNamesCounter[vn]+ 1;
									// variableNamesAll[vn]["counter"] = count;
									
									// var aliasTable = {};
									// aliasTable[vn] =  tempAlias + "_" +count;
									
									// var classes = [];
									// if(typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
									// classes[clazz["identification"]["_id"]] = aliasTable;
									// variableNamesAll[vn]["classes"] = classes;

									
									// variableNamesClass[vn] = {"alias" : aliasTable, "nameIsTaken" : variableNamesAll[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[vn]["isVar"]};
									//alias = tempAlias + "_" +count;
								}
							// } else {
								// var count = variableNamesClass[vn]["counter"] + 1;

								// preditate = " ?" + vn + "_" +count;
								// variableNamesClass[vn]["counter"] = count;
								
								// var aliasTable = {};
								// aliasTable[vn] =  tempAlias + "_" +count;
								
								// var classes = [];
								// if(typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
								// classes[clazz["identification"]["_id"]] = aliasTable;

								// variableNamesAll[vn] = {"alias" : tempAlias + "_" +count, "nameIsTaken" : variableNamesClass[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[vn]["isVar"], "classes" : classes};

							// }
							//preditate = "?"+expressionLevelNames[vn];
							// if(isInternal !=true) SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn] + " " + tempAlias;
							// else SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn];
							// tripleTable.push({"var":alias, "prefixedName":"?"+expressionLevelNames[vn], "object":className, "inFilter":false});


						}
						else preditate = " " + subclazz["linkIdentification"]["local_name"].substring(1);
					}
					else preditate = " " + subclazz["linkIdentification"]["local_name"];
					if(subclazz["linkType"] != 'NOT' && subclazz["linkIdentification"]["local_name"].startsWith('??') != true) temp["sparqlTable"]["linkVariableName"] = subclazz["linkIdentification"]["local_name"];
				} else {
					preditate = " " + getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"]) +":" + subclazz["linkIdentification"]["local_name"];
					
					if(typeof subclazz["linkIdentification"]["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in link expression " + subclazz["linkIdentification"]["local_name"],
							"listOfElementId" : [clazz["identification"]["_id"]],
							"isBlocking" : true
						});
					} else{
						// if(typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] !== 'undefined' && subclazz["linkIdentification"]["local_name"] != "=="){
						if(typeof subclazz["linkIdentification"]["parsed_exp"]["PathProperty"] !== 'undefined' && subclazz["linkIdentification"]["local_name"] != "=="){
							// var path = getPath(subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"]);
							var path = getPathFullGrammar(subclazz["linkIdentification"]["parsed_exp"]);
							
							if(path["messages"].length > 0){
								messages = messages.concat(path["messages"]);
							} 
								for(let prefix in path["prefixTable"]) {
									if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
								}
								preditate = " " + path["path"];
						}
						var namespace = subclazz["linkIdentification"]["Namespace"];
						if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
						// if(subclazz["linkIdentification"]["local_name"] != "==" && typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] === 'undefined') prefixTable[getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"])+":"] = "<"+namespace+">";
					}
				}
				if(subclazz["isInverse"] == true) {
					if(clazz["isUnion"] != true) object = instance;
					else if (clazz["isUnion"] == true && parentClass == null) object = null;
					else object = idTable[parentClass["identification"]["_id"]];					
					subject = idTable[subclazz["identification"]["_id"]];
				} else if(subclazz["isBlankNode"] == true){

					if(clazz["isUnion"] != true) subject = instance;
					else if (clazz["isUnion"] == true && parentClass == null) subject = null;
					else subject = idTable[parentClass["identification"]["_id"]];
					blankNodeName = idTable[subclazz["identification"]["_id"]];

					if(typeof temp["sparqlTable"]["isParentBlankNode"] !== "undefined") {
						object = temp["sparqlTable"]["class"];
						if(object.startsWith("?_:name"))object = object.substring(1);
						let blankNodes = [];
						for(let triple in temp["sparqlTable"]["blankNodeTriples"]){
							if(typeof temp["sparqlTable"]["blankNodeTriples"][triple] !== "function"){
								for(let t = 0; t < temp["sparqlTable"]["blankNodeTriples"][triple]["triple"].length; t++){
									blankNodes.push(object + temp["sparqlTable"]["blankNodeTriples"][triple]["triple"][t].replace(blankNodeName, "").replace(".", ""));
								}
							}
						}
						
						for(let triple in temp["sparqlTable"]["filterTriples"]){
							if(typeof temp["sparqlTable"]["filterTriples"][triple] !== "function"){
								for(let t = 0; t < temp["sparqlTable"]["filterTriples"][triple]["triple"].length; t++){
									blankNodes.push(object + temp["sparqlTable"]["filterTriples"][triple]["triple"][t]);
								}
							}
						}
						
						if(blankNodes.length > 0) object = object + ". " + blankNodes.join(". ");	
						
					}
					else{
						object = "[";
						let blankNodes = [];
						for(let triple in  temp["sparqlTable"]["blankNodeTriples"]){
							if(typeof temp["sparqlTable"]["blankNodeTriples"][triple] !== "function"){
								for(let t = 0; t < temp["sparqlTable"]["blankNodeTriples"][triple]["triple"].length; t++){
									blankNodes.push(temp["sparqlTable"]["blankNodeTriples"][triple]["triple"][t].replace(blankNodeName, "").replace(".", ""));
								}
							}
						}
						
						for(let triple in  temp["sparqlTable"]["filterTriples"]){
							if(typeof temp["sparqlTable"]["filterTriples"][triple] !== "function"){
								for(let t = 0; t < temp["sparqlTable"]["filterTriples"][triple]["triple"].length; t++){

									for(let filter = 0; filter < temp["sparqlTable"]["filters"].length; filter++){
										if(temp["sparqlTable"]["filters"][filter].startsWith("FILTER(?") && temp["sparqlTable"]["filters"][filter].indexOf(" = ") !== -1){
											let variableName = temp["sparqlTable"]["filters"][filter].substring(7, temp["sparqlTable"]["filters"][filter].indexOf(" = "));
											if(temp["sparqlTable"]["filterTriples"][triple]["triple"][t].endsWith(variableName + ".")){
												temp["sparqlTable"]["filterTriples"][triple]["triple"][t] = temp["sparqlTable"]["filterTriples"][triple]["triple"][t].replace(variableName, temp["sparqlTable"]["filters"][filter].substring(temp["sparqlTable"]["filters"][filter].indexOf(" = ")+3, temp["sparqlTable"]["filters"][filter].length-1));
												delete temp["sparqlTable"]["filters"][filter];
											}
										}
									}
									
									blankNodes.push(temp["sparqlTable"]["filterTriples"][triple]["triple"][t].replace(blankNodeName, "").replace(".", ""));		
								}
							}
						}
						
						temp["sparqlTable"]["filterTriples"] = [];
						object = object + blankNodes.join(";");
						object = object+ "]";
					}
				}else {
					if(clazz["isUnion"] != true) subject = instance;
					else if (clazz["isUnion"] == true && parentClass == null) subject = null;
					else subject = idTable[parentClass["identification"]["_id"]];
					object = idTable[subclazz["identification"]["_id"]];
				}
				// if is global subQuery then no need in link between classes
				if(subclazz["linkIdentification"]["local_name"] != "==" && subject != null && object != null && preditate != null && preditate.replace(" ", "") !=""){
					var subjectName = subject;
					if(subjectName.indexOf("://") != -1 && !subjectName.startsWith("<")) subjectName = "<" + subjectName + ">";
					else if(subjectName.indexOf(":") != -1){
						//TODO add prefix
					} else subjectName = "?" + subjectName;

					var objectName = object;
					if(objectName.indexOf("://") != -1 && !objectName.startsWith("<")) objectName = "<" + objectName + ">";
					else if(objectName.indexOf(":") != -1){
						//TODO add prefix
					} else if(subclazz["isBlankNode"] != true) objectName = "?" + objectName;
					if(subclazz["isBlankNode"] == true && objectName.startsWith("?_:name")){
						objectName = objectName.substring(1);
					} else if(!objectName.startsWith("?") && objectName != "[]" && objectName.indexOf(":") == -1) objectName = "?" + objectName;
					
					temp["sparqlTable"]["linkTriple"] = subjectName +  preditate + " " + objectName + ".";
				} else{
					if(preditate == null || preditate.replace(" ", "") =="") {
						//Interpreter.showErrorMsg("Unknown property '" + subclazz["linkIdentification"]["local_name"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unrecognized link property or property path '" + subclazz["linkIdentification"]["local_name"] + "'. Please specify link property or property path from ontology.",
							"listOfElementId" : [subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
					else if(subject == null && clazz["isUnion"] != true) {
						//Interpreter.showErrorMsg("Unknown subject class '" + subclazz["identification"]["local_name"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unknown subject class '" + subclazz["identification"]["local_name"] + "'",
							"listOfElementId" : [subclazz["identification"]["_id"], subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
					else if(object == null) {
						//Interpreter.showErrorMsg("Unknown object class '" + parentClass["identification"]["local_name"] + "'", -3);
						messages.push({
							"type" : "Error",
							"message" : "Unknown object class '" + parentClass["identification"]["local_name"] + "'",
							"listOfElementId" : [parentClass["identification"]["_id"], subclazz["linkIdentification"]["_id"]],
							"isBlocking" : true
						});
					}
				}
				// if(subclazz["linkIdentification"]["local_name"] == "==") sparqlTable["filters"].push("FILTER(" + "?" + subject + " = " + "?" + object +")");
				if(subclazz["linkIdentification"]["local_name"] == "==") {
					temp["sparqlTable"]["equalityLink"] = true;
				}
			}

			temp["sparqlTable"]["linkType"] = subclazz["linkType"];
			// if(subclazz["identification"]["local_name"] == "(no_class)" || (subclazz["instanceAlias"] == null && (subclazz["identification"]["local_name"] == "" || subclazz["identification"]["local_name"] == null))) temp["sparqlTable"]["linkType"] = "REQUIRED";
			temp["sparqlTable"]["isSubQuery"] = subclazz["isSubQuery"];
			temp["sparqlTable"]["isGlobalSubQuery"] = subclazz["isGlobalSubQuery"];
			temp["sparqlTable"]["isGraphToContents"] = subclazz["isGraphToContents"];

			if(subclazz["isSubQuery"] == true || subclazz["isGlobalSubQuery"] == true){

				//ORDER BY
				temp["sparqlTable"]["order"] = getOrderBy(subclazz["orderings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix, referenceTable, subclazz["classMembership"], knownPrefixes, symbolTable, variableNamesTable, variableNamesCounter);

				//GROUP BY

				temp["sparqlTable"]["groupBy"] = getGroupBy(subclazz["groupings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix, referenceTable, symbolTable, subclazz["classMembership"], knownPrefixes, variableNamesTable, variableNamesCounter);

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
			target = idTable[clazz["identification"]["_id"]];
			if(target.indexOf(":") == -1) target = "?" + target;
			sourse = idTable[condLink["target"]];
			if(sourse.indexOf(":") == -1) sourse = "?" + sourse;
		} else {
			target = idTable[condLink["target"]];
			if(target.indexOf(":") == -1) target = "?" + target;
			sourse = idTable[clazz["identification"]["_id"]];
			if(sourse.indexOf(":") == -1) sourse = "?" + sourse;
		}
		
		let triple = "";
		
		if(typeof condLink["identification"]["parsed_exp"]["PathProperty"] !== 'undefined' && condLink["identification"]["local_name"] != "=="){
			if(typeof condLink["identification"]["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in condition link expression " + condLink["identification"]["local_name"],
							"listOfElementId" : [clazz["identification"]["_id"]],
							"isBlocking" : true
						});
			} else {
				var path = getPathFullGrammar(condLink["identification"]["parsed_exp"]);
				if(path["messages"].length > 0){
					messages = messages.concat(path["messages"]);
				} else {
					for(let prefix in path["prefixTable"]) {
						if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
					}
					triple = sourse + " " + path["path"] + " " + target + ".";
				}
			}
		} else {
			triple = sourse + " " + getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) + ":" + condLink["identification"]["local_name"] + " " + target + ".";
			var namespace = condLink["identification"]["Namespace"]
			if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
			prefixTable[getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) +":"] = "<"+namespace+">";
		}
		
		
		if(condLink["isNot"] == true) triple = "FILTER NOT EXISTS{" + triple + "}";
		sparqlTable["conditionLinks"].push(triple);
		
	})
	


	// console.log("sparqlTable", JSON.stringify(sparqlTable,null,2), sparqlTable)
	return {variableNamesAll:variableNamesAll, sparqlTable:sparqlTable, prefixTable:prefixTable, counter:counter, fieldNames:fieldNames, messages:messages};
}

function getOrderBy(orderings, fieldNames, rootClass_id, idTable, emptyPrefix, referenceTable, classMembership, knownPrefixes, symbolTable, variableNamesTable, variableNamesCounter){
	
	var messages = [];
	var orderTable = [];
	var orderTripleTable = [];
	var orderGroupBy = [];
	_.each(orderings,function(order) {
		if(order["exp"] != null && order["exp"].replace(" ", "") !=""){
			if(order["exp"].startsWith("?")){
				if(typeof fieldNames[order["exp"].substring(1)] !== "undefined"){
					let descendingStart = "";
					let descendingEnd = "";
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
				let descendingStart = "";
				let descendingEnd = "";
				if(order["isDescending"] == true) {
					descendingStart = "DESC("
					descendingEnd = ")"
				}
				var orderName = order["exp"];
				if(orderName.search(":") != -1) orderName = orderName.substring(orderName.search(":")+1);
				var reserverNames = ["constructor", "length", "prototype"];
				
				var orderNameRep = orderName;
				if(reserverNames.indexOf(orderNameRep) != -1) orderNameRep = orderNameRep + " ";
				
				if(typeof fieldNames[orderNameRep] !== 'undefined'){

					// var result = fieldNames[orderName][rootClass_id][order["exp"]];
					let result = fieldNames[orderNameRep][rootClass_id];
					if(typeof result === 'undefined'){
						if(typeof symbolTable[rootClass_id] !== 'undefined' && typeof symbolTable[rootClass_id][orderName] !== 'undefined'){
							for(let attrName = 0; attrName < symbolTable[rootClass_id][orderName].length; attrName++){
							// for(var attrName in symbolTable[rootClass_id][orderName]){
								if(typeof symbolTable[rootClass_id][orderName][attrName]["upBySubQuery"] !== "undefined" && symbolTable[rootClass_id][orderName][attrName]["upBySubQuery"] == 1){
									result =  fieldNames[orderNameRep][symbolTable[rootClass_id][orderName][attrName]["context"]][order["exp"]];
									break;
								}
							}
						}
						if(typeof result === 'undefined'){
							for(let ordr in fieldNames[orderNameRep]){
								if(typeof fieldNames[orderNameRep][ordr] !== "function"){
									result = fieldNames[orderNameRep][ordr][order["exp"]];
									break;
								}
							}
						}
						
					} else result = fieldNames[orderNameRep][rootClass_id][order["exp"]];
					
					
					
					if(!result.startsWith("?")) result = "?" + result;
					orderTable.push(descendingStart +  result + descendingEnd + " ");

					var isAgretedAlias = false;
					if(typeof symbolTable["root"] !== 'undefined' && typeof symbolTable["root"][orderName] !== 'undefined'){
						for(let attrName = 0; attrName < symbolTable["root"][orderName].length; attrName++){
							if(symbolTable["root"][orderName][attrName]["kind"] == "AGGREGATE_ALIAS") isAgretedAlias = true;
						}
					}
					
					
					if(typeof symbolTable[rootClass_id][orderName] !== "undefined"){
						for(let attrName in symbolTable[rootClass_id][orderName]){
							if(typeof symbolTable[rootClass_id][orderName][attrName] !== "undefined" && typeof symbolTable[rootClass_id][orderName][attrName] !== "function" && symbolTable[rootClass_id][orderName][attrName]["kind"] == "PROPERTY_ALIAS") isAgretedAlias = true;
						}
					}
					
					if(isAgretedAlias!=true)orderGroupBy.push(result);
					
				} else if(typeof symbolTable[rootClass_id][orderName] !== 'undefined'){
					let result = parse_attrib(null, order["exp"], variableNamesTable, variableNamesCounter, [], rootClass_id, order["parsed_exp"], null, idTable[rootClass_id], idTable[rootClass_id], [], [], 0, emptyPrefix, symbolTable, false, [], idTable, referenceTable, classMembership, null, knownPrefixes, 99999999);
					descendingStart = "";
							 descendingEnd = "";
							 if(order["isDescending"] == true) {
								descendingStart = "DESC("
								descendingEnd = ")"
							 }
							 
					orderTable.push(descendingStart + result["exp"] + descendingEnd + " ");
					orderGroupBy.push(result["exp"]);
					
				} else if((orderName.endsWith("Label") && typeof symbolTable[rootClass_id][orderName.substring(0, orderName.length - 5)] !== 'undefined')
					||(orderName.endsWith("AltLabel") && typeof symbolTable[rootClass_id][orderName.substring(0, orderName.length - 8)] !== 'undefined')
					||(orderName.endsWith("Description") && typeof symbolTable[rootClass_id][orderName.substring(0, orderName.length - 11)] !== 'undefined')){
					descendingStart = "";
							 descendingEnd = "";
							 if(order["isDescending"] == true) {
								descendingStart = "DESC("
								descendingEnd = ")"
							 }
							
					orderTable.push(descendingStart + "?"+orderName + descendingEnd + " ");
					orderGroupBy.push("?"+orderName);
				} else {
					if(typeof order["parsed_exp"] === 'undefined'){
						messages.push({
							"type" : "Error",
							"message" : "Syntax error in order expression " + order["fulltext"],
							"listOfElementId" : [rootClass_id],
							"isBlocking" : true
						});
					}else{
						let result = parse_attrib(null, order["exp"], variableNamesTable, variableNamesCounter, [], rootClass_id, order["parsed_exp"], null, idTable[rootClass_id], idTable[rootClass_id], [], [], 0, emptyPrefix, symbolTable, false, [], idTable, referenceTable, classMembership, null, knownPrefixes, 99999999);
						if(order["exp"].indexOf("Label") == -1 && order["exp"].indexOf("AltLabel") == -1 && order["exp"].indexOf("Description") == -1)messages = messages.concat(result["messages"]); 
		
						 if(result["isAggregate"] == false && result["isExpression"] == false && result["isFunction"] == false && result["triples"].length > 0){
							let orederExp = result["exp"];
							if(result["triples"].length == 1 && result["triples"][0].startsWith("BIND(") && result["triples"][0].endsWith(result["exp"]+")")){
								orederExp = result["triples"][0].substring(5, result["triples"][0].length-result["exp"].length-5);
								result["triples"] = [];
							}
							orderTable.push(descendingStart +  orederExp + descendingEnd + " ");
							orderGroupBy.push(orederExp);
							if(typeof symbolTable[rootClass_id][order["exp"]] === "undefined") orderTripleTable.push(result["triples"]);
						 } else if(order["exp"] == "(select this)"){
							 descendingStart = "";
							 descendingEnd = "";
							 if(order["isDescending"] == true) {
								descendingStart = "DESC("
								descendingEnd = ")"
							 }
							 
							 orderTable.push(descendingStart + result["exp"] + descendingEnd + " ");
						 }else {
							 descendingStart = "(";
							 descendingEnd = ")";
							 if(order["isDescending"] == true) {
								descendingStart = "DESC("
								descendingEnd = ")"
							 }
							 
							 let orederExp = result["exp"];
							 if(result["triples"].length == 1 && result["triples"][0].startsWith("BIND(") && result["triples"][0].endsWith(result["exp"]+")")){
								orederExp = result["triples"][0].substring(5, result["triples"][0].length-result["exp"].length-5);
								result["triples"] = [];
							 }
							 orderTable.push(descendingStart + orederExp + descendingEnd + " ");
							 //orderGroupBy.push(result["exp"]);
							 orderTripleTable.push(result["triples"]);
							var isExplicitSelectionFields = true;
							
							for(let field = 0; field < result["variables"].length; field++){
								if(typeof referenceTable[result["variables"][field].substring(1)] === "undefined"){
									isExplicitSelectionFields = field;
									break;
								}
							}
							if(isExplicitSelectionFields != true && typeof symbolTable[rootClass_id][result["variables"][isExplicitSelectionFields].substring(1)] === "undefined"){
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
		}
	})

	//if(messages.length > 0) Interpreter.showErrorMsg(messages.join("\n"), -3);

	orderTable = orderTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	return {"orders":orderTable.join(" "), "triples":orderTripleTable, "messages":messages, "orderGroupBy":orderGroupBy};
}

function getGroupBy(groupings, fieldNames, rootClass_id, idTable, emptyPrefix, referenceTable, symbolTable, classMembership, knownPrefixes, variableNamesTable, variableNamesCounter){
	var messages = [];
	//var orderTable = [];
	var groupTripleTable = [];
	var orderGroupBy = [];

	_.each(groupings,function(group) {
		if(group["exp"] != null && group["exp"].replace(" ", "") !=""){
			var groupName = group["exp"];
			if(groupName.search(":") != -1) groupName = groupName.substring(groupName.search(":")+1);
			var groupNameOrig = groupName;
			
			var reserverNames = ["constructor", "length", "prototype"];
			if(reserverNames.indexOf(groupName) !== -1) groupName = groupName + " ";
			
			if(typeof fieldNames[groupName] !== 'undefined'){
				let result = fieldNames[groupName][rootClass_id];
				if(typeof result === 'undefined'){
					for(let ordr = 0; ordr < fieldNames[groupName].length; ordr++){
						result = fieldNames[groupName][ordr][group["exp"]];
						break;
					}
				} else result = fieldNames[groupName][rootClass_id][group["exp"]];
				//orderTable.push(descendingStart +  "?" + result + descendingEnd + " ");
				orderGroupBy.push("?" + result);
			} else if(typeof symbolTable[rootClass_id][groupNameOrig] !== 'undefined'){
				let result =  groupNameOrig;
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
					let result = parse_attrib(null, group["exp"], variableNamesTable, variableNamesCounter, [], rootClass_id, group["parsed_exp"], null, idTable[rootClass_id],idTable[rootClass_id], [], [], 0, emptyPrefix, [], false, [], idTable, referenceTable, classMembership, null, knownPrefixes, 99999999);
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

function getTriple(result, alias, required, notAgrageted){

	var tempTripleTable = [];
	if(notAgrageted == true && result["exp"] != "?"+ alias){
		tempTripleTable["bind"] = "BIND(" + result["exp"] + " AS ?" + alias + ")";
	}
	if(required == true && notAgrageted == true)tempTripleTable["bound"] = "FILTER(BOUND(?" + alias + "))";
	tempTripleTable["triple"] = [];
	for(let triple = 0; triple < result["triples"].length; triple++){
		tempTripleTable["triple"].push(result["triples"][triple]);
	}
	if(result["isTimeFunction"] == true) tempTripleTable["isTimeFunction"] = true;
	tempTripleTable["requireValues"] = true;
	
	return tempTripleTable;
}

function generateSPARQLWHEREInfoPhase1(sparqlTable, ws, fil, lin, referenceTable, SPARQL_interval, parameterTable){
	var messages = [];
	var whereInfo = [];
	
	//link
	if(typeof sparqlTable["linkTriple"] === 'string'){
		whereInfo.push(sparqlTable["linkTriple"]);
	}
	
	//class triple
	if(typeof sparqlTable["classTriple"] !== 'undefined') whereInfo.push(sparqlTable["classTriple"]);
	
	if(typeof sparqlTable["subClasses"] !=='undefined'){
		var singleProperty = [];
		var propertyPath = [];
		var propertyVariable = [];
		var freeLink = [];
		var sameDataLink = [];
		
		for(let subclass = 0; subclass < sparqlTable["subClasses"].length; subclass++){
			if(sparqlTable["subClasses"][subclass]["isSubQuery"] == false &&
			sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == false &&
			sparqlTable["subClasses"][subclass]["isUnion"] == false &&
			sparqlTable["subClasses"][subclass]["linkType"] == "REQUIRED"
			){	
				let temp = generateSPARQLWHEREInfoPhase1(sparqlTable["subClasses"][subclass], ws, fil, lin, referenceTable, SPARQL_interval, parameterTable);
				
				messages = messages.concat(temp["messages"]);
				if(sparqlTable["subClasses"][subclass]["linkNameType"] == "singleProperty") singleProperty = singleProperty.concat(temp["phase1"]);
				else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyPath") propertyPath = propertyPath.concat(temp["phase1"]);
				else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "freeLink") freeLink = freeLink.concat(temp["phase1"]);
				else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "sameDataLink") sameDataLink = sameDataLink.concat(temp["phase1"]);
				else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyVariableLink") propertyVariable = propertyVariable.concat(temp["phase1"]);
			}
		}
		whereInfo = whereInfo.concat(singleProperty);
		whereInfo = whereInfo.concat(propertyPath);
		whereInfo = whereInfo.concat(propertyVariable);
		whereInfo = whereInfo.concat(sameDataLink);
		whereInfo = whereInfo.concat(freeLink);
	}
	
	
	return{
		"messages":messages,
		"phase1":whereInfo
	}
}

function generateSPARQLWHEREInfoPhase2(sparqlTable, ws, fil, lin, referenceTable, SPARQL_interval, parameterTable){
	let phase2 = [];
	let requiredSubQueries = [];
	let optionalSubQueries = [];	
	let requiredGlobalSubQueries = [];
	let optionalGlobalSubQueries = [];
	let directSubQueries = [];
	
	
	var messages = [];

	var whereInfo = [];
	var links = [];
	var subSelectResult = [];

	//full SPARQL starts with SELECT
	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) directSubQueries.push("{" + sparqlTable["fullSPARQL"] + "}");
	}

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for(let subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				 if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true || sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) {
					//sub selects
					var selectResult = generateSELECT(sparqlTable["subClasses"][subclass], false);
					
					if(sparqlTable["getSubQueryResults"] == true) {
						subSelectResult = subSelectResult.concat(selectResult["select"]);
						subSelectResult = subSelectResult.concat(selectResult["aggregateAliases"]);	
					}

					//reference candidates
					var refTable = [];
					for(let ref in selectResult["variableReferenceCandidate"]){
						if(typeof selectResult["variableReferenceCandidate"][ref] === 'string'){
							if(checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
						}
					}

					var wheresubInfo = generateSPARQLWHEREInfoPhase2(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval+"  ", parameterTable);
					if(sparqlTable["getSubQueryResults"] == true) subSelectResult = subSelectResult.concat(wheresubInfo["subSelectResult"]);

					let temp = [];

					temp = temp.concat(wheresubInfo["phase2"]);

					messages = messages.concat(wheresubInfo["messages"]);

					var tempSelect = refTable;
					tempSelect= tempSelect.concat(selectResult["select"]);
					tempSelect= tempSelect.concat(selectResult["aggregate"]);
					
					tempSelect = tempSelect.concat(selectResult["selectLabels"]);

					tempSelect= tempSelect.concat(wheresubInfo["subSelectResult"]);

					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						
						var tempTable = selectResult["select"];
						tempTable = tempTable.concat(selectResult["aggregate"]);
						if(tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true){

							let subQuery = "{SELECT " ;

							//DISTINCT	
							if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS" && (
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true || sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) &&
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							// if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true && sparqlTable["subClasses"][subclass]["selectAll"] != true) subQuery = subQuery + "DISTINCT ";
							else if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							var parentClass = "";

							// if(sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
							if(sparqlTable["isUnion"] == false && sparqlTable["isUnit"] == false && sparqlTable["class"].indexOf(":") == -1) {
								parentClass = sparqlTable["class"] //+ " ";

								selectResult["groupBy"].unshift(sparqlTable["class"]);
							}
							if(sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true || sparqlTable["class"].indexOf(":") != -1) parentClass = "";
							else tempSelect.unshift(parentClass);
								
							tempSelect = tempSelect.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});

							// subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
							
							var SPARQL_interval_sub = SPARQL_interval.substring(2);
	
							subQuery = subQuery + tempSelect.join(" ");
							
							// if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								// if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									// for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										// if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM NAMED"){
											// subQuery = subQuery + "\n"+ SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + "\n" + SPARQL_interval.substring(2);
										// }
									// }
								// }
							// }
							
							subQuery = subQuery +" WHERE{\n";
							
							var graphFound = false;
							if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "GRAPH" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "SERVICE"){
											subQuery = subQuery + SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + " {"+ "\n";
											graphFound = true;
											break;
										}
									}
								}
							}

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

							temp = temp.filter(function (el, i, arr) {
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


							subQuery = subQuery +SPARQL_interval_sub_temp+temp.join("\n"+SPARQL_interval_sub_temp);
							
							 //Label Service Languages
							 // if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
							 if (selectResult["selectLabels"].length > 0){
								subQuery = subQuery + '\n'+SPARQL_interval_sub_temp+'SERVICE wikibase:label {bd:serviceParam wikibase:language "'+sparqlTable["subClasses"][subclass]["labelServiceLanguages"]+'" .}\n'+SPARQL_interval_sub_temp;
							 }
							
							if(graphFound == true) subQuery = subQuery+"\n"+ SPARQL_interval.substring(2)+ "}";
							
							subQuery = subQuery + "}";


							if(groupBy != "") groupBy = "\n"+SPARQL_interval+"GROUP BY " + groupBy;

							// if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


							//ORDER BY
							 if (orderBy["orders"] != "") subQuery = subQuery + "\n"+SPARQL_interval+"ORDER BY " + orderBy["orders"];

							 //OFFSET
							 if (sparqlTable["subClasses"][subclass]["offset"] != null && sparqlTable["subClasses"][subclass]["offset"] != "") {
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
							if (sparqlTable["subClasses"][subclass]["limit"] != null && sparqlTable["subClasses"][subclass]["limit"] != "") {
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
							
							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") {
								if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true) optionalSubQueries.push(subQuery);
								else optionalGlobalSubQueries.push(subQuery);
							}
							else {
								if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true) requiredSubQueries.push(subQuery);
								else requiredGlobalSubQueries.push(subQuery);
							}
							
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
						}

					} 
				}
			}
		}
	}
	
	phase2 = phase2.concat(requiredGlobalSubQueries);
	phase2 = phase2.concat(directSubQueries);
	phase2 = phase2.concat(requiredSubQueries);
	phase2 = phase2.concat(optionalGlobalSubQueries);
	phase2 = phase2.concat(optionalSubQueries);
	
	phase2 = phase2.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	return {
		"phase2" : phase2, 
		"messages":messages
	}
}


// genrerate SPARQL WHERE info
// sparqlTable - table with sparql parts
function generateSPARQLWHEREInfo(sparqlTable, ws, fil, lin, referenceTable, SPARQL_interval, parameterTable){

	let phase2 = [];
	let phase3 = [];
	let phase4 = [];
	
	let graphService = [];
	
	let grounding = [];
	
	let classes = [];//phase 1
	let requiredSubQueries = [];
	let requiredGlobalSubQueries = [];
	let optionalSubQueries = [];
	let optionalGlobalSubQueries = [];
	let directSubQueries = [];
	let unions = [];
	let plainRequiredLinks = []; // condition links
	let attributesValues = [];
	let filterTriples = [];
	let aggregateTriples = [];
	let plainOptionalNotLinks = []; // not links
	let plainOptionalLinks = []; // optional links
	let bind = [];
	let minusSubQueries = [];
	let directSparql = [];
	let filters = [];
	let filtersExists = [];
	
	let messages = [];

	let whereInfo = [];
	let links = [];

	let subSelectResult = [];

	//full SPARQL starts with SELECT. Phase 1
	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) directSubQueries.push("{" + sparqlTable["fullSPARQL"] + "}");
	}
	// simpleTriples. Phase 3
	for(let expression = 0; expression < sparqlTable["simpleTriples"].length; expression++){
			
		var generateTimeFunctionForVirtuoso = false;
		if(generateTimeFunctionForVirtuoso == true && sparqlTable["simpleTriples"][expression]["isTimeFunction"] == true){
			
			var classTriple = sparqlTable["classTriple"];
			if(typeof classTriple === 'undefined') classTriple = "";
			else classTriple = classTriple + "\n" +SPARQL_interval;
			
			var timeExpression = [];
			
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				for(let triple in sparqlTable["simpleTriples"][expression]["triple"]){
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ')) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					}
				}
			}
			if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bind"]);
			if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bound"]);
			if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable["simpleTriples"][expression]["graph"] !== "undefined" && typeof sparqlTable["simpleTriples"][expression]["graphInstruction"] !== "undefined"){
				attributesValues.push(sparqlTable["simpleTriples"][expression]["graphInstruction"] + " " + sparqlTable["simpleTriples"][expression]["graph"] + " {"+ "OPTIONAL{" + "\n"+SPARQL_interval + classTriple  + timeExpression.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}" + "}");
			}
			else attributesValues.push("OPTIONAL{" + "\n"+SPARQL_interval + classTriple  + timeExpression.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}");
		}
		else {
			var attributeTripleTemp = [];
			
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				
				for(let triple in sparqlTable["simpleTriples"][expression]["triple"]){
					
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ')){ 
							attributeTripleTemp.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						} else if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(')){ 
							// bind.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
							attributeTripleTemp.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
							// attributeTripleTemp = null;
						}else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) {
							attributeTripleTemp.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						}else {
							var nodeLevelCondition = "";
							if(typeof sparqlTable["simpleTriples"][expression]["nodeLevelCondition"] !== "undefined") nodeLevelCondition = sparqlTable["simpleTriples"][expression]["nodeLevelCondition"]
							attributeTripleTemp.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "} " + nodeLevelCondition);
						}
					} 
				}	
			}	
			
			if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable["simpleTriples"][expression]["graph"] !== "undefined" && typeof sparqlTable["simpleTriples"][expression]["graphInstruction"] !== "undefined"){
				// tripleTebleTemp = tripleTebleTemp.concat(attributeTripleTemp);
				tripleTebleTemp = attributeTripleTemp;
				if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') tripleTebleTemp.push(sparqlTable["simpleTriples"][expression]["bind"]);
				if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') tripleTebleTemp.push(sparqlTable["simpleTriples"][expression]["bound"]);
				attributesValues.push(sparqlTable["simpleTriples"][expression]["graphInstruction"] + " " + sparqlTable["simpleTriples"][expression]["graph"] + " {"+ tripleTebleTemp.join(" ") + "}");
			} else{
			
				if(attributeTripleTemp != null) attributesValues = attributesValues.concat(attributeTripleTemp);
				var tripleTebleTemp = [];
				if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') attributesValues.push(sparqlTable["simpleTriples"][expression]["bind"]);
				if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') attributesValues.push(sparqlTable["simpleTriples"][expression]["bound"]);
			}
			
		}
	}

	// aggregateTriples. Phase 3
	for(let expression in sparqlTable["aggregateTriples"]){
		if(typeof sparqlTable["aggregateTriples"][expression] === 'object'){
			for(let triple in sparqlTable["aggregateTriples"][expression]["triple"]){
				if(typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') aggregateTriples.push(sparqlTable["aggregateTriples"][expression]["triple"][triple]);
			}
		}
	}
	
	// localAggregateSubQueries. phase 2
	for(let expression in sparqlTable["localAggregateSubQueries"]){
		if(typeof sparqlTable["localAggregateSubQueries"][expression] === 'string'){
			// attributesValues.push(sparqlTable["localAggregateSubQueries"][expression]);
			if(sparqlTable["localAggregateSubQueries"][expression].indexOf("OPTIONAL{") !== -1)  optionalSubQueries.push(sparqlTable["localAggregateSubQueries"][expression]);
			else requiredSubQueries.push(sparqlTable["localAggregateSubQueries"][expression]);
		}
	}

	//phase 3
	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") != true) directSparql.push(sparqlTable["fullSPARQL"]);
	}
	
	// filterTriples. Phase 3
	for(let expression in sparqlTable["filterTriples"]){
	
			if(typeof sparqlTable["filterTriples"][expression] === 'object'){
				for(let triple in sparqlTable["filterTriples"][expression]["triple"]){
					if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string'){
						if( !sparqlTable["filterTriples"][expression]["triple"][triple].startsWith("BIND(") && !sparqlTable["filterTriples"][expression]["triple"][triple].startsWith("BOUND(")) filterTriples.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
						else filterTriples.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
					}
				}
			}
			if(typeof sparqlTable["filterTriples"][expression]["bind"]  === 'string') filterTriples.push(sparqlTable["filterTriples"][expression]["bind"]);
			if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') filterTriples.push(sparqlTable["filterTriples"][expression]["bound"]);
			
	}

	//filters. Phase 3
	for(let expression in sparqlTable["filters"]){
			if(typeof sparqlTable["filters"][expression] === 'string'){
				if(sparqlTable["filters"][expression].indexOf("EXISTS{") !== -1) filtersExists.push(sparqlTable["filters"][expression].replace(/\n/g, '\n'+SPARQL_interval));
				else filters.push(sparqlTable["filters"][expression].replace(/\n/g, '\n'+SPARQL_interval));
			}
	}
	// }
	
	//link phase 1
	if(typeof sparqlTable["linkTriple"] === 'string' && typeof sparqlTable.graph.graph === "undefined"){
		// plainRequiredLinks.push(sparqlTable["linkTriple"]);
		classes.push(sparqlTable["linkTriple"]);
	}
	
	//class triple. phase 1
	if(typeof sparqlTable["classTriple"] !== 'undefined') classes.push(sparqlTable["classTriple"]);
	
	//conditionLinks. phase 1, phase 3
	for(let expression in sparqlTable["conditionLinks"]){
		if(typeof sparqlTable["conditionLinks"][expression] === 'string'){
			if(sparqlTable["conditionLinks"][expression].indexOf("FILTER NOT EXISTS") !== -1) plainOptionalNotLinks.push(sparqlTable["conditionLinks"][expression]);
			else classes.push(sparqlTable["conditionLinks"][expression]);		
		}
	}
	
	//filter as triples. phase 1, phase 3
	for(let expression in sparqlTable["filetrAsTripleTable"]){
		if(typeof sparqlTable["filetrAsTripleTable"][expression] === 'object'){
			var triplePrefix = "";
			var tripleSufix = "";
			if(sparqlTable["filetrAsTripleTable"][expression]["applyExists"] == true){
				triplePrefix = "FILTER EXISTS{";
				tripleSufix = "}";
			}
			if(sparqlTable["filetrAsTripleTable"][expression]["isConstant"] != true ) classes.push(triplePrefix + "?" + sparqlTable["filetrAsTripleTable"][expression]["object"] + " " + sparqlTable["filetrAsTripleTable"][expression]["prefixedName"]+ " " + sparqlTable["filetrAsTripleTable"][expression]["var"] + "."+ tripleSufix);
			else if(sparqlTable["filetrAsTripleTable"][expression]["object"].startsWith("<") == true)filterTriples.push(triplePrefix + sparqlTable["filetrAsTripleTable"][expression]["object"] + " " + sparqlTable["filetrAsTripleTable"][expression]["prefixedName"]+ " " + sparqlTable["filetrAsTripleTable"][expression]["var"] + "." + tripleSufix);	
			else filterTriples.push(triplePrefix + "?" + sparqlTable["filetrAsTripleTable"][expression]["object"] + " " + sparqlTable["filetrAsTripleTable"][expression]["prefixedName"]+ " " + sparqlTable["filetrAsTripleTable"][expression]["var"] + "." + tripleSufix);	
		}
	}
	
	// grounding. phase 1.
	
	if(classes.length == 0 && typeof sparqlTable["linkTriple"] !== "undefined"){
		var groundingTemp = [];
		
		for(let triple = 0; triple < sparqlTable["simpleTriples"].length; triple++){
			if(sparqlTable["simpleTriples"][triple]["requireValues"] == true 
			  && typeof sparqlTable["simpleTriples"][triple]["bind"] === "undefined" 
			  && typeof sparqlTable["simpleTriples"][triple]["bound"] === "undefined" 
			  && sparqlTable["simpleTriples"][triple]["triple"].length == 1
			 ){
				groundingTemp.push(sparqlTable["simpleTriples"][triple]["triple"][0]);
				delete sparqlTable["simpleTriples"][triple];
				break;
			}
		}
		
		if(groundingTemp.length == 0){
			for(let triple = 0; triple < sparqlTable["simpleTriples"].length; triple++){
				if( typeof sparqlTable["simpleTriples"][triple]["bind"] === "undefined" 
				  && typeof sparqlTable["simpleTriples"][triple]["bound"] === "undefined"
				  && sparqlTable["simpleTriples"][triple]["triple"].length == 1
				 ){
					groundingTemp.push("OPTIONAL{"+ sparqlTable["simpleTriples"][triple]["triple"][0] + "}");
					delete sparqlTable["simpleTriples"][triple];
					break;
				}
			}
		}
		if(groundingTemp.length == 0){
			messages.push({
				"type" : "Warning",
				"message" : " Please ensure that each node in the query has either a class name or a required link, or its field list starts with a required property.",
				"isBlocking" : false,
				"generateSPARQL": true
			});
			
		} else {
			grounding = grounding.concat(groundingTemp);
		}
	}

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		
		var singleProperty = [];
		var propertyPath = [];
		var propertyVariable = [];
		var freeLink = [];
		var sameDataLink = [];
		
		var singlePropertyOptional = [];
		var propertyPathOptional = [];
		var propertyVariableOptional = [];
		var freeLinkOptional = [];
		var sameDataLinkOptional = [];
		
		for(let subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				//union
				if(sparqlTable["subClasses"][subclass]["isUnion"] == true) {
					var unionResult = getUNIONClasses(sparqlTable["subClasses"][subclass], sparqlTable["class"], sparqlTable["classTriple"], false, referenceTable, SPARQL_interval, parameterTable)

					if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == false && sparqlTable["subClasses"][subclass]["isSubQuery"] == false){
						if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") unionResult["result"] = "OPTIONAL{\n" + unionResult["result"] + "\n}";
						if(sparqlTable["subClasses"][subclass]["linkType"] == "NOT") unionResult["result"] = "FILTER NOT EXISTS{\n" + unionResult["result"] + "\n}";
					}
					unions.push(unionResult["result"]);
					messages = messages.concat(unionResult["messages"]);
				}
				//graph to contents
				else if (sparqlTable["subClasses"][subclass]["isGraphToContents"] == true){
					
					let SPARQL_interval_temp = SPARQL_interval;
					if(typeof sparqlTable["subClasses"][subclass]["linkType"] === 'string' && (sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL" || sparqlTable["subClasses"][subclass]["linkType"] == "NOT")) {SPARQL_interval_temp = SPARQL_interval_temp+"  ";}
					if(typeof sparqlTable["linkType"] === 'string' && (sparqlTable["linkType"] == "OPTIONAL" || sparqlTable["linkType"] == "NOT")) {SPARQL_interval_temp = SPARQL_interval_temp+"  ";}
					var graphString = "GRAPH " + sparqlTable["class"] + "{\n"+ SPARQL_interval;
					
					let temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable, SPARQL_interval_temp, parameterTable);
		
					graphString = graphString + temp["classes"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["grounding"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["phase2"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["graphService"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["phase3"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["filters"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["filtersExists"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["plainOptionalNotLinks"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["phase4"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["requiredSubQueries"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["optionalSubQueries"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["directSubQueries"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["unions"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["plainRequiredLinks"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["attributesValues"].join("\n"+SPARQL_interval);
					
					// graphString = graphString + temp["bind"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["minusSubQueries"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["directSparql"].join("\n"+SPARQL_interval);
					
		

					messages = messages.concat(temp["messages"]);
					graphString = graphString + "\n"+SPARQL_interval.substring(2)+"}";
					graphService.push(graphString);
					
				}
				//plain links
				else if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
						
					let SPARQL_interval_temp = SPARQL_interval;
					if(typeof sparqlTable["linkType"] === 'string' && (sparqlTable["linkType"] == "OPTIONAL" || sparqlTable["linkType"] == "NOT")) SPARQL_interval_temp = SPARQL_interval_temp+"  ";
					
					let temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable, SPARQL_interval_temp, parameterTable);
					//phase 1
					if(sparqlTable["subClasses"][subclass]["linkType"] == "REQUIRED"){	
						if(sparqlTable["subClasses"][subclass]["linkNameType"] == "singleProperty") singleProperty = singleProperty.concat(temp["classes"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyPath") propertyPath = propertyPath.concat(temp["classes"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "freeLink") freeLink = freeLink.concat(temp["classes"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "sameDataLink") sameDataLink = sameDataLink.concat(temp["classes"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyVariableLink") propertyVariable = propertyVariable.concat(temp["classes"]);
						else classes = classes.concat(temp["classes"]);
					//phase 3
					} else if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL"){
						if(sparqlTable["subClasses"][subclass]["linkNameType"] == "singleProperty") singlePropertyOptional = singlePropertyOptional.concat(temp["plainOptionalLinks"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyPath") propertyPathOptional = propertyPathOptional.concat(temp["plainOptionalLinks"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "freeLink") freeLinkOptional = freeLinkOptional.concat(temp["plainOptionalLinks"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "sameDataLink") sameDataLinkOptional = sameDataLinkOptional.concat(temp["plainOptionalLinks"]);
						else if(sparqlTable["subClasses"][subclass]["linkNameType"] == "propertyVariableLink") propertyVariableOptional = propertyVariableOptional.concat(temp["plainOptionalLinks"]);
					} else {
						classes = classes.concat(temp["classes"]);
					}
					
					
					grounding = grounding.concat(temp["grounding"]);
					phase2 = phase2.concat(temp["phase2"]);
					phase3 = phase3.concat(temp["phase3"]);
					phase4 = phase4.concat(temp["phase4"]);
					graphService = graphService.concat(temp["graphService"]);
					
					// requiredSubQueries = requiredSubQueries.concat(temp["requiredSubQueries"]);
					// optionalSubQueries = optionalSubQueries.concat(temp["optionalSubQueries"]);
					// directSubQueries = directSubQueries.concat(temp["directSubQueries"]);
					// unions = unions.concat(temp["unions"]);
					// plainRequiredLinks = plainRequiredLinks.concat(temp["plainRequiredLinks"]);
					// attributesValues = attributesValues.concat(temp["attributesValues"]);
					plainOptionalNotLinks = plainOptionalNotLinks.concat(temp["plainOptionalNotLinks"]);
					bind = bind.concat(temp["bind"]);
					// minusSubQueries = minusSubQueries.concat(temp["minusSubQueries"]);
					// directSparql = directSparql.concat(temp["directSparql"]);
					filters = filters.concat(temp["filters"]);
					filtersExists = filtersExists.concat(temp["filtersExists"]);
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
					for(let ref in selectResult["variableReferenceCandidate"]){
						if(typeof selectResult["variableReferenceCandidate"][ref] === 'string'){
							if(checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
						}
					}

					var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval+"  ", parameterTable);
					if(sparqlTable["getSubQueryResults"] == true) subSelectResult = subSelectResult.concat(wheresubInfo["subSelectResult"]);
					
					
					
					let temp = [];
					// var temp = wheresubInfo["links"];
					// temp = temp.concat(wheresubInfo["triples"]);
					// temp = temp.concat(wheresubInfo["filters"]);
					
					
					
					
					if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL"){
						if(typeof sparqlTable["classTriple"] !== "undefined" && sparqlTable["classTriple"]!= null && sparqlTable["classTriple"] != "") temp = temp.concat("OPTIONAL{\n  "+ SPARQL_interval +wheresubInfo["plainOptionalLinks"] + "}");
						else temp = temp.concat(wheresubInfo["plainOptionalLinks"]);
					} 
					temp = temp.concat(wheresubInfo["classes"]);
					temp = temp.concat(wheresubInfo["grounding"]);
					temp = temp.concat(wheresubInfo["phase2"]);
					temp = temp.concat(wheresubInfo["graphService"]);
					temp = temp.concat(wheresubInfo["phase3"]);
					temp = temp.concat(wheresubInfo["filters"]);
					temp = temp.concat(wheresubInfo["filtersExists"]);
					temp = temp.concat(wheresubInfo["plainOptionalNotLinks"]);
					temp = temp.concat(wheresubInfo["phase4"]);
					// temp = temp.concat(wheresubInfo["requiredSubQueries"]);
					// temp = temp.concat(wheresubInfo["optionalSubQueries"]);
					// temp = temp.concat(wheresubInfo["directSubQueries"]);
					// temp = temp.concat(wheresubInfo["unions"]);
					// temp = temp.concat(wheresubInfo["plainRequiredLinks"]);
					// temp = temp.concat(wheresubInfo["attributesValues"]);
					
					temp = temp.concat(wheresubInfo["bind"]);
					// temp = temp.concat(wheresubInfo["minusSubQueries"]);
					// temp = temp.concat(wheresubInfo["directSparql"]);
					
					messages = messages.concat(wheresubInfo["messages"]);

					var tempSelect = refTable;
					tempSelect= tempSelect.concat(selectResult["select"]);
					tempSelect= tempSelect.concat(selectResult["aggregate"]);
					
					// if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
							tempSelect = tempSelect.concat(selectResult["selectLabels"]);
					// }
					
					tempSelect= tempSelect.concat(wheresubInfo["subSelectResult"]);
					//required / optional sub select
					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						
						var tempTable = selectResult["select"];
						tempTable = tempTable.concat(selectResult["aggregate"]);
						if(tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true){

							let subQuery = "{SELECT " ;

							//DISTINCT	
							if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS" && (
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true || sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) &&
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							// if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true && sparqlTable["subClasses"][subclass]["selectAll"] != true) subQuery = subQuery + "DISTINCT ";
							else if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							var parentClass = "";

							// if(sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
							if(sparqlTable["isUnion"] == false && sparqlTable["isUnit"] == false && sparqlTable["class"].indexOf(":") == -1) {
								parentClass = sparqlTable["class"] //+ " ";

								selectResult["groupBy"].unshift(sparqlTable["class"]);
							}
							if(sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true || sparqlTable["class"].indexOf(":") != -1) parentClass = "";
							else tempSelect.unshift(parentClass);
								
							tempSelect = tempSelect.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});

							// subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
							
							var SPARQL_interval_sub = SPARQL_interval.substring(2);
	
							subQuery = subQuery + tempSelect.join(" ");
							
							// if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								// if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									// for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										// if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM NAMED"){
											// subQuery = subQuery + "\n"+ SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + "\n" + SPARQL_interval.substring(2);
										// }
									// }
								// }
							// }
							
							subQuery = subQuery +" WHERE{\n";
							
							var graphFound = false;
							if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "GRAPH" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "SERVICE"){
											subQuery = subQuery + SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + " {"+ "\n";
											graphFound = true;
											break;
										}
									}
								}
							}

							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL" && typeof sparqlTable["classTriple"] !== "undefined"){
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

							temp = temp.filter(function (el, i, arr) {
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


							subQuery = subQuery +SPARQL_interval_sub_temp+temp.join("\n"+SPARQL_interval_sub_temp);
							
							 //Label Service Languages
							 // if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
							 if (selectResult["selectLabels"].length > 0){
								subQuery = subQuery + '\n'+SPARQL_interval_sub_temp+'SERVICE wikibase:label {bd:serviceParam wikibase:language "'+sparqlTable["subClasses"][subclass]["labelServiceLanguages"]+'" .}\n'+SPARQL_interval_sub_temp;
							 }
							
							if(graphFound == true) subQuery = subQuery+"\n"+ SPARQL_interval.substring(2)+ "}";
							
							subQuery = subQuery + "}";


							if(groupBy != "") groupBy = "\n"+SPARQL_interval+"GROUP BY " + groupBy;

							// if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


							//ORDER BY
							 if (orderBy["orders"] != "") subQuery = subQuery + "\n"+SPARQL_interval+"ORDER BY " + orderBy["orders"];

							 //OFFSET
							 if (sparqlTable["subClasses"][subclass]["offset"] != null && sparqlTable["subClasses"][subclass]["offset"] != "") {
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
							if (sparqlTable["subClasses"][subclass]["limit"] != null && sparqlTable["subClasses"][subclass]["limit"] != "") {
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
							
							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") {
								if(typeof sparqlTable["classTriple"] === "undefined"){
									subQuery = "OPTIONAL" + subQuery;
								}
								
								if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) optionalGlobalSubQueries.push(subQuery);
								else optionalSubQueries.push(subQuery);
							}
							else {
								if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) requiredGlobalSubQueries.push(subQuery);
								else requiredSubQueries.push(subQuery);
							}
							
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
								
								//no select fields
								let subQuery = "";
								//FILTER EXISTS
								if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS" && sparqlTable["subClasses"][subclass]["distinct"] != true && sparqlTable["subClasses"][subclass]["isSubQuery"] == true){
									subQuery = "FILTER(EXISTS{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"})";
									filtersExists.push(subQuery);
								} else {
									
									//var subQuery = "FILTER(EXISTS{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"})"
									// sparqlTable["subClasses"][subclass]["selectAll"] != true
									var distinct = "";
									if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS") distinct = "DISTINCT ";
									// if(sparqlTable["subClasses"][subclass]["selectAll"] != true)distinct = "DISTINCT ";
									temp = temp.filter(function (el, i, arr) {
										return arr.indexOf(el) === i;
									});
									subQuery = "{SELECT " + distinct + sparqlTable["class"]+ " WHERE{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2);
									//Label Service Languages
									 // if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
									 if (selectResult["selectLabels"].length > 0){
										subQuery = subQuery + '\n'+SPARQL_interval+'SERVICE wikibase:label {bd:serviceParam wikibase:language "'+sparqlTable["subClasses"][subclass]["labelServiceLanguages"]+'" .}\n'+SPARQL_interval;
									 }
						
									subQuery = subQuery + "}}";
									// whereInfo.unshift(subQuery);
									
									if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") {
										if(typeof sparqlTable["classTriple"] !== "undefined") optionalSubQueries.push(subQuery);
										else {optionalSubQueries.push("OPTIONAL"+subQuery);}
									}
									else requiredSubQueries.push(subQuery);
								}
							}
						}

					} else if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true){
						//not + global subquery
						//phase 4
						minusSubQueries.push("MINUS{" + temp.join("\n")+ "\n"+ SPARQL_interval.substring(2) +"}");
					} else {
						// not + subquery
						plainOptionalNotLinks.push(temp.join("\n"));
					}
				}
			}
		}
		//phase 1
		classes = classes.concat(singleProperty);
		classes = classes.concat(propertyPath);
		classes = classes.concat(propertyVariable);
		classes = classes.concat(sameDataLink);
		classes = classes.concat(freeLink);
		// classes = classes.concat(plainRequiredLinks);
		
		
		//phase 3
		phase3 = phase3.concat(singlePropertyOptional);
		phase3 = phase3.concat(propertyPathOptional);
		phase3 = phase3.concat(propertyVariableOptional);
		phase3 = phase3.concat(sameDataLinkOptional);
		phase3 = phase3.concat(freeLinkOptional);

	}

	//if(typeof sparqlTable["classTriple"] !== 'undefined')whereInfo.unshift(sparqlTable["classTriple"]);

	// whereInfo = whereInfo.concat(attributesAggerations);

	// remove duplicates
	// var whereInfo = whereInfo.filter(function (el, i, arr) {
		// return arr.indexOf(el) === i;
	// });

	filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	classes = classes.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	requiredSubQueries = requiredSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	optionalSubQueries = optionalSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	directSubQueries = directSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	unions = unions.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	plainRequiredLinks = plainRequiredLinks.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	attributesValues = attributesValues.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	plainOptionalNotLinks = plainOptionalNotLinks.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	bind = bind.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	minusSubQueries = minusSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	directSparql = directSparql.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	phase2 = phase2.concat(requiredGlobalSubQueries);
	phase2 = phase2.concat(directSubQueries);
	phase2 = phase2.concat(requiredSubQueries);
	phase2 = phase2.concat(optionalGlobalSubQueries);
	phase2 = phase2.concat(optionalSubQueries);
	
	
	phase2 = phase2.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	graphService = graphService.concat(graphService);
	
	
	phase3 = phase3.concat(unions);
	phase3 = phase3.concat(attributesValues);
	phase3 = phase3.concat(directSparql);
	phase3 = phase3.concat(filterTriples);
	
	//phase 4
	phase4 = phase4.concat(minusSubQueries);
	phase4 = phase4.concat(aggregateTriples);
	
	// graph / service from class
	if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable.graph.graph !== "undefined" && sparqlTable.graph.graphInstruction !== "undefined"){
		
		let tempWhereInfo = [];
		
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(grounding);
		tempWhereInfo = tempWhereInfo.concat(phase2);
		tempWhereInfo = tempWhereInfo.concat(graphService);
		tempWhereInfo = tempWhereInfo.concat(phase3);
		tempWhereInfo = tempWhereInfo.concat(filters);
		tempWhereInfo = tempWhereInfo.concat(filtersExists);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);
		tempWhereInfo = tempWhereInfo.concat(phase4);
		tempWhereInfo = tempWhereInfo.concat(bind);

		classes = [];
		classes.push(sparqlTable["linkTriple"]);
		grounding = [];
		phase2 = [];
		phase3 = [];
		phase4 = [];
		graphService = [];
		plainRequiredLinks = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		filters = [];
		
		SPARQL_interval = SPARQL_interval + "  ";
		let tempString = sparqlTable.graph.graphInstruction + " "+ sparqlTable.graph.graph + " {"+ "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";
		graphService.push(tempString);
	}

	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		// var tempWhereInfo = links;
		
		// tempWhereInfo = tempWhereInfo.concat(whereInfo);
		// tempWhereInfo = tempWhereInfo.concat(filters);
		
		
		let tempWhereInfo = [];
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(grounding);
		tempWhereInfo = tempWhereInfo.concat(phase2);
		tempWhereInfo = tempWhereInfo.concat(graphService);
		tempWhereInfo = tempWhereInfo.concat(phase3);
		tempWhereInfo = tempWhereInfo.concat(filters);
		tempWhereInfo = tempWhereInfo.concat(filtersExists);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks)
		tempWhereInfo = tempWhereInfo.concat(phase4)
		// tempWhereInfo = tempWhereInfo.concat(requiredSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(optionalSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(directSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(unions);
		// tempWhereInfo = tempWhereInfo.concat(plainRequiredLinks);
		// tempWhereInfo = tempWhereInfo.concat(attributesValues);
		;
		tempWhereInfo = tempWhereInfo.concat(bind);
		// tempWhereInfo = tempWhereInfo.concat(minusSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(directSparql);
			

		classes = [];
		grounding = [];
		phase2 = [];
		phase3 = [];
		phase4 = [];
		graphService = [];
		
		// requiredSubQueries = [];
		// optionalSubQueries = [];
		// directSubQueries = [];
		// unions = [];
		plainRequiredLinks = [];
		// attributesValues = [];
		plainOptionalNotLinks = [];
		plainOptionalLinks = [];
		bind = [];
		// minusSubQueries = [];
		// directSparql = [];
		filters = [];
		
		if(sparqlTable["isSimpleClassName"] == true){
			if(sparqlTable["isSubQuery"] !== true && sparqlTable["isGlobalSubQuery"] !== true){
				let tempString = "OPTIONAL{"+"\n"+SPARQL_interval+ tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+"}";
				plainOptionalLinks = [];
				plainOptionalLinks.push(tempString);
			} else {
				let tempString = tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2);
				plainOptionalLinks = [];
				plainOptionalLinks.push(tempString);
			}

		} else {console.log("OPTIONAL subselect replaced with required")}
		// filters = [];
		// links = [];
		
		
		
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		let tempWhereInfo = [];
		
		// var tempWhereInfo = links;
		// tempWhereInfo = tempWhereInfo.concat(whereInfo);
		// tempWhereInfo = tempWhereInfo.concat(filters);
		
		
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(grounding);
		tempWhereInfo = tempWhereInfo.concat(phase2);
		tempWhereInfo = tempWhereInfo.concat(graphService);
		tempWhereInfo = tempWhereInfo.concat(phase3);
		tempWhereInfo = tempWhereInfo.concat(filters);		
		tempWhereInfo = tempWhereInfo.concat(filtersExists);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);		
		tempWhereInfo = tempWhereInfo.concat(phase4);		
		// tempWhereInfo = tempWhereInfo.concat(requiredSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(optionalSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(directSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(unions);
		// tempWhereInfo = tempWhereInfo.concat(plainRequiredLinks);
		// tempWhereInfo = tempWhereInfo.concat(attributesValues);
		tempWhereInfo = tempWhereInfo.concat(bind);
		// tempWhereInfo = tempWhereInfo.concat(minusSubQueries);
		// tempWhereInfo = tempWhereInfo.concat(directSparql);
		
		
		
		
		// whereInfo = [];
		// whereInfo.push(tempString);
		// filters = [];
		// links = [];
		
		classes = [];
		grounding = [];
		phase2 = [];
		phase3 = [];
		phase4 = [];
		graphService = [];
		// requiredSubQueries = [];
		// optionalSubQueries = [];
		// directSubQueries = [];
		// unions = [];
		plainRequiredLinks = [];
		// attributesValues = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		// directSparql = [];
		filters = [];
		
		tempWhereInfo = tempWhereInfo.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});		
		
		let tempString = "FILTER NOT EXISTS{"+ "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";
		if(sparqlTable["isGlobalSubQuery"] == true)tempString = "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval);
		plainOptionalNotLinks.push(tempString);

	}
	
	// graph / service from link
	if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable.graphLink !== "undefined" && typeof sparqlTable.graphLink.graph !== "undefined" && sparqlTable.graphLink.graphInstruction !== "undefined"){	
		let tempWhereInfo = [];
		
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(grounding);
		tempWhereInfo = tempWhereInfo.concat(phase2);
		tempWhereInfo = tempWhereInfo.concat(graphService);
		tempWhereInfo = tempWhereInfo.concat(phase3);
		tempWhereInfo = tempWhereInfo.concat(filters);
		tempWhereInfo = tempWhereInfo.concat(filtersExists);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);
		tempWhereInfo = tempWhereInfo.concat(phase4);
		tempWhereInfo = tempWhereInfo.concat(bind);

		classes = [];
		grounding = [];
		phase2 = [];
		phase3 = [];
		phase4 = [];
		graphService = [];
		plainRequiredLinks = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		filters = [];
		
		SPARQL_interval = SPARQL_interval + "  ";
		let graphName = sparqlTable.graphLink.graph;
		if(graphName.startsWith("??")) graphName = graphName.substring(1);
		let tempString = sparqlTable.graphLink.graphInstruction + " "+ graphName + " {"+ "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";

		graphService.push(tempString);
	}

	return {
		"classes" : classes, 
		"grounding" : grounding, 
		"phase2" : phase2, 
		"phase3" : phase3, 
		"phase4" : phase4, 
		"graphService" : graphService, 
		// "requiredSubQueries" : requiredSubQueries, 
		// "optionalSubQueries":optionalSubQueries, 
		// "directSubQueries":directSubQueries, 
		// "unions":unions,
		// "plainRequiredLinks":plainRequiredLinks,
		// "attributesValues":attributesValues,
		"plainOptionalNotLinks":plainOptionalNotLinks,
		"plainOptionalLinks":plainOptionalLinks,
		"bind":bind,
		// "minusSubQueries":minusSubQueries,
		// "directSparql":directSparql,
		"filters":filters,
		"filtersExists":filtersExists,
		"subSelectResult":subSelectResult,
		"messages":messages
	}
}

function generateSPARQLWHEREInfo2(sparqlTable, ws, fil, lin, referenceTable, SPARQL_interval, parameterTable){
	var classes = [];
	let requiredSubQueries = [];
	var requiredGlobalSubQueries = [];
	let optionalSubQueries = [];
	var optionalGlobalSubQueries = [];
	let directSubQueries = [];
	var unions = [];
	var plainRequiredLinks = [];
	var attributesValues = [];
	var plainOptionalNotLinks = [];
	var bind = [];
	var minusSubQueries = [];
	var directSparql = [];
	let filters = [];
	
	var messages = [];

	var whereInfo = [];
	// var filters = [];
	var links = [];
	// var bind = [];
	// var messages = [];
	// var attributesAggerations = [];
	var subSelectResult = [];

	//full SPARQL starts with SELECT
	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) directSubQueries.push("{" + sparqlTable["fullSPARQL"] + "}");
	}

	// simpleTriples
	for(let expression = 0; expression < sparqlTable["simpleTriples"].length; expression++){
		var generateTimeFunctionForVirtuoso = false;
		if(generateTimeFunctionForVirtuoso == true && sparqlTable["simpleTriples"][expression]["isTimeFunction"] == true){
			
			var classTriple = sparqlTable["classTriple"];
			if(typeof classTriple === 'undefined') classTriple = "";
			else classTriple = classTriple + "\n" +SPARQL_interval;
			
			var timeExpression = [];
			
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				for(let triple in sparqlTable["simpleTriples"][expression]["triple"]){
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ')) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						else timeExpression.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					}
				}
			}
			if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bind"]);
			if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') timeExpression.push(sparqlTable["simpleTriples"][expression]["bound"]);
			if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable["simpleTriples"][expression]["graph"] !== "undefined" && typeof sparqlTable["simpleTriples"][expression]["graphInstruction"] !== "undefined"){
				attributesValues.push(sparqlTable["simpleTriples"][expression]["graphInstruction"] + " " + sparqlTable["simpleTriples"][expression]["graph"] + " {"+ "OPTIONAL{" + "\n"+SPARQL_interval + classTriple  + timeExpression.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}" + "}");
			}
			else attributesValues.push("OPTIONAL{" + "\n"+SPARQL_interval + classTriple  + timeExpression.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"}");
		}
		else {
			var attributeTripleTemp = [];
			
			if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
				
				for(let triple in sparqlTable["simpleTriples"][expression]["triple"]){
					
					if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
						if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ')){ 
							attributeTripleTemp.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						} else if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(')){ 
							bind.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
							// attributeTripleTemp = null;
						}else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) {
							attributeTripleTemp.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
						}else {
							attributeTripleTemp.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
						}
					} 
				}	
			}	
			
			if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable["simpleTriples"][expression]["graph"] !== "undefined" && typeof sparqlTable["simpleTriples"][expression]["graphInstruction"] !== "undefined"){
				// tripleTebleTemp = tripleTebleTemp.concat(attributeTripleTemp);
				tripleTebleTemp = attributeTripleTemp;
				if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') tripleTebleTemp.push(sparqlTable["simpleTriples"][expression]["bind"]);
				if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') tripleTebleTemp.push(sparqlTable["simpleTriples"][expression]["bound"]);
				attributesValues.push(sparqlTable["simpleTriples"][expression]["graphInstruction"] + " " + sparqlTable["simpleTriples"][expression]["graph"] + " {"+ tripleTebleTemp.join(" ") + "}");
			} else{
			
				if(attributeTripleTemp != null) attributesValues = attributesValues.concat(attributeTripleTemp);
				var tripleTebleTemp = [];
				if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bind"]);
				if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bound"]);
			}
			
		}
	}

	// aggregateTriples
	for(let expression in sparqlTable["aggregateTriples"]){
		if(typeof sparqlTable["aggregateTriples"][expression] === 'object'){
			for(let triple in sparqlTable["aggregateTriples"][expression]["triple"]){
				if(typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') attributesValues.push(sparqlTable["aggregateTriples"][expression]["triple"][triple]);
			}
		}
	}

	// localAggregateSubQueries
	for(let expression in sparqlTable["localAggregateSubQueries"]){
		if(typeof sparqlTable["localAggregateSubQueries"][expression] === 'string'){
			attributesValues.push(sparqlTable["localAggregateSubQueries"][expression]);
		}
	}

	// attributesAggerations = attributesAggerations.concat(bind);

	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") != true) directSparql.push(sparqlTable["fullSPARQL"]);
	}
	
	// filterTriples
	// if(sparqlTable["class"].startsWith("?_") != true || typeof sparqlTable["variableName"] !== "undefined"){
		for(let expression in sparqlTable["filterTriples"]){
			if(typeof sparqlTable["filterTriples"][expression] === 'object'){
				for(let triple in sparqlTable["filterTriples"][expression]["triple"]){
					if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string'){
						if( !sparqlTable["filterTriples"][expression]["triple"][triple].startsWith("BIND(") && !sparqlTable["filterTriples"][expression]["triple"][triple].startsWith("BOUND(")) attributesValues.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
						else bind.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
					}
				}
			}
			if(typeof sparqlTable["filterTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["filterTriples"][expression]["bind"]);
			if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') bind.push(sparqlTable["filterTriples"][expression]["bound"]);
			
		}

		//filters
		for(let expression in sparqlTable["filters"]){
			if(typeof sparqlTable["filters"][expression] === 'string'){
				filters.push(sparqlTable["filters"][expression].replace(/\n/g, '\n'+SPARQL_interval));
			}
		}
	// }
	
	//link
	if(typeof sparqlTable["linkTriple"] === 'string'){
		// plainRequiredLinks.push(sparqlTable["linkTriple"]);
		classes.push(sparqlTable["linkTriple"]);
	}
	
	//class triple
	if(typeof sparqlTable["classTriple"] !== 'undefined') classes.push(sparqlTable["classTriple"]);
	
	//conditionLinks
	for(let expression in sparqlTable["conditionLinks"]){
		if(typeof sparqlTable["conditionLinks"][expression] === 'string'){
			plainRequiredLinks.push(sparqlTable["conditionLinks"][expression]);
		}
	}

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for(let subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				if(sparqlTable["subClasses"][subclass]["isUnion"] == true) {
					var unionResult = getUNIONClasses(sparqlTable["subClasses"][subclass], sparqlTable["class"], sparqlTable["classTriple"], false, referenceTable, SPARQL_interval, parameterTable)

					if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == false && sparqlTable["subClasses"][subclass]["isSubQuery"] == false){
						if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") unionResult["result"] = "OPTIONAL{\n" + unionResult["result"] + "\n}";
						if(sparqlTable["subClasses"][subclass]["linkType"] == "NOT") unionResult["result"] = "FILTER NOT EXISTS{\n" + unionResult["result"] + "\n}";
					}
					unions.push(unionResult["result"]);
					messages = messages.concat(unionResult["messages"]);
				}
				else if (sparqlTable["subClasses"][subclass]["isGraphToContents"] == true){
					
					let SPARQL_interval_temp = SPARQL_interval;
					if(typeof sparqlTable["subClasses"][subclass]["linkType"] === 'string' && (sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL" || sparqlTable["subClasses"][subclass]["linkType"] == "NOT")) {SPARQL_interval_temp = SPARQL_interval_temp+"  ";}
					if(typeof sparqlTable["linkType"] === 'string' && (sparqlTable["linkType"] == "OPTIONAL" || sparqlTable["linkType"] == "NOT")) {SPARQL_interval_temp = SPARQL_interval_temp+"  ";}
					var graphString = "GRAPH " + sparqlTable["class"] + "{\n"+ SPARQL_interval;
					
					let temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable, SPARQL_interval_temp, parameterTable);
					
					// graphString = graphString + temp["links"].join("\n"+SPARQL_interval);
					// graphString = graphString + temp["triples"].join("\n" +SPARQL_interval);
					// graphString = graphString + temp["filters"].join("\n"+SPARQL_interval);
							
					graphString = graphString + temp["classes"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["requiredSubQueries"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["optionalSubQueries"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["directSubQueries"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["unions"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["plainRequiredLinks"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["attributesValues"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["plainOptionalNotLinks"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["bind"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["minusSubQueries"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["directSparql"].join("\n"+SPARQL_interval);
					graphString = graphString + temp["filters"].join("\n"+SPARQL_interval);
		

					messages = messages.concat(temp["messages"]);
					graphString = graphString + "\n"+SPARQL_interval.substring(2)+"}";
					unions.push(graphString);
					
				}
				else if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
						
					let SPARQL_interval_temp = SPARQL_interval;
					if(typeof sparqlTable["linkType"] === 'string' && (sparqlTable["linkType"] == "OPTIONAL" || sparqlTable["linkType"] == "NOT")) SPARQL_interval_temp = SPARQL_interval_temp+"  ";
					
					let temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable, SPARQL_interval_temp, parameterTable);

					// filters = filters.concat(temp["filters"]);
					// links = links.concat(temp["links"]);
					// whereInfo = whereInfo.concat(temp["triples"]);
					// messages = messages.concat(temp["messages"]);
						
					classes = classes.concat(temp["classes"]);
					requiredSubQueries = requiredSubQueries.concat(temp["requiredSubQueries"]);
					optionalSubQueries = optionalSubQueries.concat(temp["optionalSubQueries"]);
					directSubQueries = directSubQueries.concat(temp["directSubQueries"]);
					unions = unions.concat(temp["unions"]);
					plainRequiredLinks = plainRequiredLinks.concat(temp["plainRequiredLinks"]);
					attributesValues = attributesValues.concat(temp["attributesValues"]);
					plainOptionalNotLinks = plainOptionalNotLinks.concat(temp["plainOptionalNotLinks"]);
					bind = bind.concat(temp["bind"]);
					minusSubQueries = minusSubQueries.concat(temp["minusSubQueries"]);
					directSparql = directSparql.concat(temp["directSparql"]);
					filters = filters.concat(temp["filters"]);
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
					for(let ref in selectResult["variableReferenceCandidate"]){
						if(typeof selectResult["variableReferenceCandidate"][ref] === 'string'){
							if(checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
						}
					}

					var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval+"  ", parameterTable);
					if(sparqlTable["getSubQueryResults"] == true) subSelectResult = subSelectResult.concat(wheresubInfo["subSelectResult"]);

					let temp = [];
					// var temp = wheresubInfo["links"];
					// temp = temp.concat(wheresubInfo["triples"]);
					// temp = temp.concat(wheresubInfo["filters"]);
					
					
					
					
					temp = temp.concat(wheresubInfo["classes"]);
					temp = temp.concat(wheresubInfo["requiredSubQueries"]);
					temp = temp.concat(wheresubInfo["optionalSubQueries"]);
					temp = temp.concat(wheresubInfo["directSubQueries"]);
					temp = temp.concat(wheresubInfo["unions"]);
					temp = temp.concat(wheresubInfo["plainRequiredLinks"]);
					temp = temp.concat(wheresubInfo["attributesValues"]);
					temp = temp.concat(wheresubInfo["plainOptionalNotLinks"]);
					temp = temp.concat(wheresubInfo["bind"]);
					temp = temp.concat(wheresubInfo["minusSubQueries"]);
					temp = temp.concat(wheresubInfo["directSparql"]);
					temp = temp.concat(wheresubInfo["filters"]);
					messages = messages.concat(wheresubInfo["messages"]);
					
					
					// messages = messages.concat(wheresubInfo["messages"]);

					var tempSelect = refTable;
					tempSelect= tempSelect.concat(selectResult["select"]);
					tempSelect= tempSelect.concat(selectResult["aggregate"]);
					
					// if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
							tempSelect = tempSelect.concat(selectResult["selectLabels"]);
					// }
					
					tempSelect= tempSelect.concat(wheresubInfo["subSelectResult"]);

					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						
						var tempTable = selectResult["select"];
						tempTable = tempTable.concat(selectResult["aggregate"]);
						if(tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true){

							let subQuery = "{SELECT " ;

							//DISTINCT	
							if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS" && (
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true || sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true) &&
							sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							// if(sparqlTable["subClasses"][subclass]["isSubQuery"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true && sparqlTable["subClasses"][subclass]["selectAll"] != true) subQuery = subQuery + "DISTINCT ";
							else if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							var parentClass = "";

							// if(sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
							if(sparqlTable["isUnion"] == false && sparqlTable["isUnit"] == false && sparqlTable["class"].indexOf(":") == -1) {
								parentClass = sparqlTable["class"] //+ " ";

								selectResult["groupBy"].unshift(sparqlTable["class"]);
							}
							if(sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true || sparqlTable["class"].indexOf(":") != -1) parentClass = "";
							else tempSelect.unshift(parentClass);
								
							tempSelect = tempSelect.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});

							// subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
							
							var SPARQL_interval_sub = SPARQL_interval.substring(2);
	
							subQuery = subQuery + tempSelect.join(" ");
							
							// if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								// if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									// for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										// if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "FROM NAMED"){
											// subQuery = subQuery + "\n"+ SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + "\n" + SPARQL_interval.substring(2);
										// }
									// }
								// }
							// }
							
							subQuery = subQuery +" WHERE{\n";
							
							var graphFound = false;
							if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true){
								if(typeof sparqlTable["subClasses"][subclass]["graphs"] !== "undefined"){
									for(let g = 0; g < sparqlTable["subClasses"][subclass]["graphs"].length; g++){
										if(sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "GRAPH" || sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] == "SERVICE"){
											subQuery = subQuery + SPARQL_interval.substring(2) +sparqlTable["subClasses"][subclass]["graphs"][g]["graphInstruction"] + " "+ sparqlTable["subClasses"][subclass]["graphs"][g]["graph"] + " {"+ "\n";
											graphFound = true;
											break;
										}
									}
								}
							}

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

							temp = temp.filter(function (el, i, arr) {
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


							subQuery = subQuery +SPARQL_interval_sub_temp+temp.join("\n"+SPARQL_interval_sub_temp);
							
							 //Label Service Languages
							 // if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
							 if (selectResult["selectLabels"].length > 0){
								subQuery = subQuery + '\n'+SPARQL_interval_sub_temp+'SERVICE wikibase:label {bd:serviceParam wikibase:language "'+sparqlTable["subClasses"][subclass]["labelServiceLanguages"]+'" .}\n'+SPARQL_interval_sub_temp;
							 }
							
							if(graphFound == true) subQuery = subQuery+"\n"+ SPARQL_interval.substring(2)+ "}";
							
							subQuery = subQuery + "}";


							if(groupBy != "") groupBy = "\n"+SPARQL_interval+"GROUP BY " + groupBy;

							// if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


							//ORDER BY
							 if (orderBy["orders"] != "") subQuery = subQuery + "\n"+SPARQL_interval+"ORDER BY " + orderBy["orders"];

							 //OFFSET
							 if (sparqlTable["subClasses"][subclass]["offset"] != null && sparqlTable["subClasses"][subclass]["offset"] != "") {
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
							if (sparqlTable["subClasses"][subclass]["limit"] != null && sparqlTable["subClasses"][subclass]["limit"] != "") {
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
							
							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") optionalSubQueries.push(subQuery);
							else requiredSubQueries.push(subQuery);
							
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
								let subQuery = "";
								//no select fields
								if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS" && sparqlTable["subClasses"][subclass]["distinct"] != true && sparqlTable["subClasses"][subclass]["isSubQuery"] == true){
									subQuery = "FILTER(EXISTS{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"})";
									requiredSubQueries.push(subQuery);
								} else {
									
									//var subQuery = "FILTER(EXISTS{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2)+"})"
									// sparqlTable["subClasses"][subclass]["selectAll"] != true
									var distinct = "";
									if(sparqlTable["subClasses"][subclass]["linkType"] == "FILTER_EXISTS") distinct = "DISTINCT ";
									// if(sparqlTable["subClasses"][subclass]["selectAll"] != true)distinct = "DISTINCT ";
									temp = temp.filter(function (el, i, arr) {
										return arr.indexOf(el) === i;
									});
									subQuery = "{SELECT " + distinct + sparqlTable["class"]+ " WHERE{\n" +SPARQL_interval+ temp.join("\n"+SPARQL_interval) + "\n"+SPARQL_interval.substring(2);
									//Label Service Languages
									 // if (sparqlTable["subClasses"][subclass]["labelServiceLanguages"] != null) {
									 if (selectResult["selectLabels"].length > 0){
										subQuery = subQuery + '\n'+SPARQL_interval+'SERVICE wikibase:label {bd:serviceParam wikibase:language "'+sparqlTable["subClasses"][subclass]["labelServiceLanguages"]+'" .}\n'+SPARQL_interval;
									 }
						
									subQuery = subQuery + "}}";
									// whereInfo.unshift(subQuery);
									
									if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL") optionalSubQueries.push(subQuery);
									else requiredSubQueries.push(subQuery);
								}
							}
						}

					} else if(sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] == true){
						//not + global subquery
						minusSubQueries.push("MINUS{" + temp.join("\n")+ "\n"+ SPARQL_interval.substring(2) +"}");
					} else {
						// not + subquery
						plainOptionalNotLinks.push(temp.join("\n"));
					}
				}
			}
		}
	}

	//if(typeof sparqlTable["classTriple"] !== 'undefined')whereInfo.unshift(sparqlTable["classTriple"]);

	// whereInfo = whereInfo.concat(attributesAggerations);

	// remove duplicates
	// var whereInfo = whereInfo.filter(function (el, i, arr) {
		// return arr.indexOf(el) === i;
	// });

	filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	classes = classes.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	requiredSubQueries = requiredSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	optionalSubQueries = optionalSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	directSubQueries = directSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	unions = unions.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	plainRequiredLinks = plainRequiredLinks.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	attributesValues = attributesValues.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	plainOptionalNotLinks = plainOptionalNotLinks.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	bind = bind.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	minusSubQueries = minusSubQueries.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	directSparql = directSparql.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});


	// var links = links.filter(function (el, i, arr) {
		// return arr.indexOf(el) === i;
	// });

	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		// var tempWhereInfo = links;
		
		// tempWhereInfo = tempWhereInfo.concat(whereInfo);
		// tempWhereInfo = tempWhereInfo.concat(filters);
		
		
		let tempWhereInfo = [];
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(requiredSubQueries);
		tempWhereInfo = tempWhereInfo.concat(optionalSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSubQueries);
		tempWhereInfo = tempWhereInfo.concat(unions);
		tempWhereInfo = tempWhereInfo.concat(plainRequiredLinks);
		tempWhereInfo = tempWhereInfo.concat(attributesValues);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);
		tempWhereInfo = tempWhereInfo.concat(bind);
		tempWhereInfo = tempWhereInfo.concat(minusSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSparql);
		tempWhereInfo = tempWhereInfo.concat(filters);	

		classes = [];
		requiredSubQueries = [];
		optionalSubQueries = [];
		directSubQueries = [];
		unions = [];
		plainRequiredLinks = [];
		attributesValues = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		directSparql = [];
		filters = [];
		
		if(sparqlTable["isSimpleClassName"] == true){
			let tempString = "OPTIONAL{"+"\n"+SPARQL_interval+ tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+"}";
			plainOptionalNotLinks = [];
			plainOptionalNotLinks.push(tempString);
		} else {console.log("OPTIONAL subselect replaced with required")}
		// filters = [];
		// links = [];
		
		
		
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		let tempWhereInfo = [];
		
		// var tempWhereInfo = links;
		// tempWhereInfo = tempWhereInfo.concat(whereInfo);
		// tempWhereInfo = tempWhereInfo.concat(filters);
		
		
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(requiredSubQueries);
		tempWhereInfo = tempWhereInfo.concat(optionalSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSubQueries);
		tempWhereInfo = tempWhereInfo.concat(unions);
		tempWhereInfo = tempWhereInfo.concat(plainRequiredLinks);
		tempWhereInfo = tempWhereInfo.concat(attributesValues);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);
		tempWhereInfo = tempWhereInfo.concat(bind);
		tempWhereInfo = tempWhereInfo.concat(minusSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSparql);
		tempWhereInfo = tempWhereInfo.concat(filters);		
		
		
		
		// whereInfo = [];
		// whereInfo.push(tempString);
		// filters = [];
		// links = [];
		
		classes = [];
		requiredSubQueries = [];
		optionalSubQueries = [];
		directSubQueries = [];
		unions = [];
		plainRequiredLinks = [];
		attributesValues = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		directSparql = [];
		filters = [];
		
		let tempString = "FILTER NOT EXISTS{"+ "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";
		if(sparqlTable["isGlobalSubQuery"] == true)tempString = "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval);
		plainOptionalNotLinks.push(tempString);

	}
	
	if(typeof parameterTable["showGraphServiceCompartments"] !== "undefined" && parameterTable["showGraphServiceCompartments"] == true && typeof sparqlTable["graph"] === 'string' && sparqlTable["graph"] != "" && typeof sparqlTable["graphInstruction"] === 'string' && sparqlTable["graphInstruction"] != "" ){	
		let tempWhereInfo = [];
		
		tempWhereInfo = tempWhereInfo.concat(classes);
		tempWhereInfo = tempWhereInfo.concat(requiredSubQueries);
		tempWhereInfo = tempWhereInfo.concat(optionalSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSubQueries);
		tempWhereInfo = tempWhereInfo.concat(unions);
		tempWhereInfo = tempWhereInfo.concat(plainRequiredLinks);
		tempWhereInfo = tempWhereInfo.concat(attributesValues);
		tempWhereInfo = tempWhereInfo.concat(plainOptionalNotLinks);
		tempWhereInfo = tempWhereInfo.concat(bind);
		tempWhereInfo = tempWhereInfo.concat(minusSubQueries);
		tempWhereInfo = tempWhereInfo.concat(directSparql);
		tempWhereInfo = tempWhereInfo.concat(filters);
		
		classes = [];
		requiredSubQueries = [];
		optionalSubQueries = [];
		directSubQueries = [];
		unions = [];
		plainRequiredLinks = [];
		attributesValues = [];
		plainOptionalNotLinks = [];
		bind = [];
		minusSubQueries = [];
		directSparql = [];
		filters = [];
		
		SPARQL_interval = SPARQL_interval + "  ";
		let tempString = sparqlTable["graphInstruction"] + " "+ sparqlTable["graph"] + " {"+ "\n"+SPARQL_interval + tempWhereInfo.join("\n"+SPARQL_interval) + "\n"+ SPARQL_interval.substring(2)+ "}";

		unions.push(tempString);

	}
	// whereInfo.concat(ws);
	// filters.concat(fil);
	// links.concat(lin);
	
	// return {"triples" : whereInfo, "filters" : filters, "links":links, "messages":messages, "subSelectResult":subSelectResult}
	
	return {
		"classes" : classes, 
		"requiredSubQueries" : requiredSubQueries, 
		"optionalSubQueries":optionalSubQueries, 
		"directSubQueries":directSubQueries, 
		"unions":unions,
		"plainRequiredLinks":plainRequiredLinks,
		"attributesValues":attributesValues,
		"plainOptionalNotLinks":plainOptionalNotLinks,
		"bind":bind,
		"minusSubQueries":minusSubQueries,
		"directSparql":directSparql,
		"filters":filters,
		"subSelectResult":subSelectResult,
		"messages":messages
	}
}


function checkIfReference(reference, referenceTable, subQueryMainClass, isPlain){

	for(let ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			if(typeof referenceTable[ref]["type"] !== 'undefined' && referenceTable[ref]["type"] == "notPlain") isPlain = false;
			if(reference == ref){
				if(isPlain == true) return true;
				else {
					if(findSubQueryMainClass(referenceTable[ref]["classes"], subQueryMainClass) == true) return true;
				}
			}else {
				let result  = false;
				for(let r in referenceTable[ref]["classes"]){
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
	let result = false;
	for(let ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			for(let r in referenceTable[ref]){
				if(typeof referenceTable[ref][r] === 'object'){
					if("?"+r == subQueryMainClass) result = true;
					else{
						let temp = findSubQueryMainClass(referenceTable[ref][r]["classes"], subQueryMainClass);
						if(temp == true) result = true;
					}
				}
			}
		}
	}
	return result;
}

function getUNIONClasses(sparqlTable, parentClassInstance, parentClassTriple, generateUpperSelect, referenceTable, SPARQL_interval, parameterTable){
	var whereInfo = [];
	var unionsubSELECTstaterents = [];
	var unionGroupStaterents = [];
	var messages = [];
	var isSubSelect = false;
	
	var unionSelectResult = generateSELECT(sparqlTable, false);
	unionsubSELECTstaterents= unionsubSELECTstaterents.concat(unionSelectResult["select"]);
	unionsubSELECTstaterents= unionsubSELECTstaterents.concat(unionSelectResult["aggregate"]);

	if(generateUpperSelect == true || sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true || sparqlTable["linkType"] == "NOT") SPARQL_interval = SPARQL_interval+"  ";

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		var unionSELECT = generateSELECT(sparqlTable, true);
		// console.log("unionSELECT", unionSELECT);
		// var unionWheresubInfo = generateSPARQLWHEREInfo(sparqlTable, [], [], [], referenceTable);
		for(let subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				var selectResult = generateSELECT(sparqlTable["subClasses"][subclass], false);

				var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable, SPARQL_interval, parameterTable);
				let temp = [];
				temp = temp.concat(wheresubInfo["classes"]);
				temp = temp.concat(wheresubInfo["grounding"]);
				temp = temp.concat(wheresubInfo["phase2"]);
				temp = temp.concat(wheresubInfo["graphService"]);
				temp = temp.concat(wheresubInfo["phase3"]);
				temp = temp.concat(wheresubInfo["filters"]);
				temp = temp.concat(wheresubInfo["filtersExists"]);
				temp = temp.concat(wheresubInfo["plainOptionalNotLinks"]);
				temp = temp.concat(wheresubInfo["phase4"]);
				// temp = temp.concat(wheresubInfo["requiredSubQueries"]);
				// temp = temp.concat(wheresubInfo["optionalSubQueries"]);
				// temp = temp.concat(wheresubInfo["directSubQueries"]);
				// temp = temp.concat(wheresubInfo["unions"]);
				// temp = temp.concat(wheresubInfo["plainRequiredLinks"]);
				// temp = temp.concat(wheresubInfo["attributesValues"]);
				
				temp = temp.concat(wheresubInfo["bind"]);
				// temp = temp.concat(wheresubInfo["minusSubQueries"]);
				// temp = temp.concat(wheresubInfo["directSparql"]);
				
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
					let subQuery = "{\n";
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
						let subQuery = "{SELECT " ;

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
						if (sparqlTable["subClasses"][subclass]["offset"] != null && sparqlTable["subClasses"][subclass]["offset"] != "") {
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
						if (sparqlTable["subClasses"][subclass]["limit"] != null && sparqlTable["subClasses"][subclass]["limit"] != "") {
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
	
	returnValue = returnValue + "\n"+SPARQL_interval.substring(2) + sparqlTable.filters.join("\n")
	
	if(generateUpperSelect == true) {
		if(sparqlTable["selectMain"]["simpleVariables"].length > 0) {
			for(let selectVar = 0; selectVar < sparqlTable["selectMain"]["simpleVariables"].length; selectVar++){
				let sel = sparqlTable["selectMain"]["simpleVariables"][selectVar]["value"];
				if(typeof sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] +")"
				unionsubSELECTstaterents.push(sel)
			}
		}
		if(sparqlTable["selectMain"]["aggregateVariables"].length > 0) {
			for(let selectVar = 0; selectVar < sparqlTable["selectMain"]["aggregateVariables"].length; selectVar++){
				let sel = sparqlTable["selectMain"]["aggregateVariables"][selectVar]["value"];
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
				for(let selectVar = 0; selectVar < sparqlTable["selectMain"]["simpleVariables"].length; selectVar++){
					let sel = sparqlTable["selectMain"]["simpleVariables"][selectVar]["value"];
					if(typeof sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] !== 'undefined' && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != null && sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] != sel) sel = "("+ sel + " AS " + sparqlTable["selectMain"]["simpleVariables"][selectVar]["alias"] +")"
					unionsubSELECTstaterents.push(sel)
				}
			}
			if(sparqlTable["selectMain"]["aggregateVariables"].length > 0) {
				for(let selectVar = 0; selectVar < sparqlTable["selectMain"]["aggregateVariables"].length; selectVar++){
					let sel = sparqlTable["selectMain"]["aggregateVariables"][selectVar]["value"];
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
	selectLabels = [];
	variableReferenceInfo = [];
	aggregateSelectInfo = [];
	aggregateAliases = [];
	innerDistinctInfo = [];
	variableReferenceCandidate = [];
	groupBy = [];

	if(sparqlTable["groupByThis"] == true) groupBy.push(sparqlTable["class"]);
	// selectMAIN
	// simpleVariables
	for(let number in sparqlTable["selectMain"]["simpleVariables"]){
		if(typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') {
			selectInfo.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
		}
	}
	for(let number in sparqlTable["selectMain"]["labelVariables"]){
		if(typeof sparqlTable["selectMain"]["labelVariables"][number]["alias"] === 'string') {
			selectLabels.push(sparqlTable["selectMain"]["labelVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["labelVariables"][number]["alias"])
		}
	}
	for(let number in sparqlTable["innerDistinct"]["simpleVariables"]){
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
	for(let number in sparqlTable["selectMain"]["aggregateVariables"]){
		if(typeof sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] === 'string') {
			aggregateSelectInfo.push("("+ sparqlTable["selectMain"]["aggregateVariables"][number]["value"] + " AS " + sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] + ")");
			aggregateAliases.push(sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] );
		}
	}
	for(let number in sparqlTable["innerDistinct"]["aggregateVariables"]){
		if(typeof sparqlTable["innerDistinct"]["aggregateVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["aggregateVariables"][number]);
		}
	}

	//subQuery references
	for(let number in sparqlTable["selectMain"]["referenceVariables"]){
		if(typeof sparqlTable["selectMain"]["referenceVariables"][number] === 'string') {
			variableReferenceInfo.push(sparqlTable["selectMain"]["referenceVariables"][number]);
		}
	}

	//referenceCandidates
	for(let number in sparqlTable["variableReferenceCandidate"]){
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
	var selectLabels = selectLabels.filter(function (el, i, arr) {
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
		for(let subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object' && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
				let temp = generateSELECT(sparqlTable["subClasses"][subclass], forSingleClass);
				selectInfo = selectInfo.concat(temp["select"]);
				selectLabels = selectLabels.concat(temp["selectLabels"]);
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

	return {"select":selectInfo, "innerDistinct":innerDistinctInfo, "selectLabels":selectLabels, "aggregate":aggregateSelectInfo, "groupBy":groupBy, "variableReference":variableReferenceInfo, "variableReferenceCandidate":variableReferenceCandidate, "aggregateAliases":aggregateAliases};
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
		let temp = checkIfIsSimpleAttribute(field["parsed_exp"], true);
		if(temp["isSimpleVariable"] == true && temp["kind"] == "PROPERTY_NAME"){

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
		let temp = setAttributeNames(subclazz, idTable, symbolTable, attributeNames);
		attributeNames = temp;
	})
	return {attributeNames:attributeNames, messages:messages}
}

function checkIfOptionalReferenceParse(field, expressionTable, isSimpleVariable, aliasFieldsOptional){
	var messages = [];
	for(let key in expressionTable){

		if(key == "Reference" && aliasFieldsOptional.includes(expressionTable[key]["name"])){
			messages.push({
					"type" : "Error",
					"message" : "Reference to optional field " + expressionTable[key]["name"] + " from a field expression " + field.fulltext + " not allowed. To use the reference, mark " + expressionTable[key]["name"] + " as required (check the 'Require Values' box)",
					// "listOfElementId" : listOfElementId,
					"isBlocking" : true
				});
		}


		if(key == "var" && (typeof expressionTable[key]["type"] !== "undefined" && expressionTable[key]["type"] !== null && typeof expressionTable[key]["type"]["property_type"] !== "undefined" && expressionTable[key]["type"]["property_type"].indexOf("CLASS") != -1) && isSimpleVariable != true && aliasFieldsOptional.includes(expressionTable[key]["name"])){
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
	for(let key in expressionTable){

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
			let temp = checkIfIsSimpleAttribute(expressionTable[key], isSimpleVariable);
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

	for(let key in expressionTable){
		if(key == "Aggregate" && typeof expressionTable[key] === "object"){
			var aggregation = expressionTable[key]["Aggregate"].toLowerCase();
			if(aggregation != "min" && aggregation != "max" && aggregation != "sample" && expressionTable[key]["DISTINCT"] != "DISTINCT") isMultipleAllowedAggregation = true;
		}
		
		if(key == "var") {
			//if type information is known
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined') {
				//if max_cardinality is known
				if(typeof expressionTable[key]['type']['max_cardinality'] !== 'undefined' && expressionTable[key]['type']['max_cardinality'] != null){
					if(expressionTable[key]['type']['max_cardinality'] == -1 || expressionTable[key]['type']['max_cardinality'] > 1) {
						isMultipleAllowedCardinality = true;
					}
				//if max_cardinality not known
				} else {
					isMultipleAllowedCardinality = true;
				}
			//symbolTable has max_cardinality
			}else if (typeof symbolTable[expressionTable[key]["name"]] !== 'undefined'){
				var symbolUsage = symbolTable[expressionTable[key]["name"]];
				var found = false;
				
				for(let symbol = 0; symbol < symbolUsage.length; symbol++){
					if(typeof symbolUsage[symbol]["type"] !== "undefined" && symbolUsage[symbol]["type"] !== null && typeof symbolUsage[symbol]["type"]["max_cardinality"] !== "undefined" && symbolUsage[symbol]["type"]["max_cardinality"] != null){ 
						if(symbolUsage[symbol]['type']['max_cardinality'] == -1 || symbolUsage[symbol]['type']['max_cardinality'] > 1){
							isMultipleAllowedCardinality = true;							
						}
						
						found = true;
					}
				}
				if(found == false){
					if(typeof symbolUsage[0] !== "undefined" && symbolUsage[0]['kind'].indexOf("_ALIAS") == -1) isMultipleAllowedCardinality = true;
				}
			// if type information not known
			} else if(typeof expressionTable[key]['type'] === 'undefined' || expressionTable[key]['type'] == null )  {
				isMultipleAllowedCardinality = true;
			}
		}

		if(typeof expressionTable[key] == 'object'){
			let temp = parseAggregationMultiple(expressionTable[key], symbolTable);
			if(temp["isMultipleAllowedAggregation"]==true) isMultipleAllowedAggregation = true;
			if(temp["isMultipleAllowedCardinality"]==true) isMultipleAllowedCardinality = true;
		}
	}

	return {isMultipleAllowedAggregation:isMultipleAllowedAggregation, isMultipleAllowedCardinality:isMultipleAllowedCardinality}
}

function getPropertyShortForm(classM, knownNamespaces){
	
	if(classM.lastIndexOf("/") != -1){
		let prefix = classM.substring(0, classM.lastIndexOf("/")+1)
		let name = classM.substring(classM.lastIndexOf("/")+1)
		for(let kp in knownNamespaces){
			if(knownNamespaces[kp]["value"] == prefix) return {name:knownNamespaces[kp]["name"]+":"+name, namespace:knownNamespaces[kp]["value"], prefix:knownNamespaces[kp]["name"]+":"};
		}
	}
	return {name:"<"+ classM + ">"}
}

function getAggregationFromFragment(clazz){
	var aggregation = [];
	if(clazz["aggregations"].length > 0){
		_.each(clazz["aggregations"],function(field) {
			aggregation.push({"aggregation":field, "classId":clazz.identification._id})
		})
	}
	_.each(clazz["children"],function(subclazz) {
		var aggregationTemp = getAggregationFromFragment(subclazz);
		aggregation = aggregation.concat(aggregationTemp);
	})
	
	return aggregation;
}

function setSchemaNamesForQuery(abstractQueryTable, schemaNamesTable, parentSchemaName){
	let schemaName = parentSchemaName;
	if(typeof abstractQueryTable["graphsService"] !== "undefined" && abstractQueryTable["graphsService"] !== null && abstractQueryTable["graphsService"]["schema"] !== null && abstractQueryTable["graphsService"]["schema"] !== ""){
		schemaNamesTable[abstractQueryTable.identification._id] = abstractQueryTable["graphsService"]["schema"];
		schemaName = abstractQueryTable["graphsService"]["schema"];
	} else {
		schemaNamesTable[abstractQueryTable.identification._id] = parentSchemaName;
	}
	if(typeof abstractQueryTable["graphsServiceLink"] !== "undefined" && abstractQueryTable["graphsServiceLink"] !== null && abstractQueryTable["graphsServiceLink"]["schema"] !== null && abstractQueryTable["graphsServiceLink"]["schema"] !== ""){
		schemaNamesTable[abstractQueryTable.linkIdentification._id] = abstractQueryTable["graphsServiceLink"]["schema"];
		schemaNamesTable[abstractQueryTable.identification._id] = abstractQueryTable["graphsServiceLink"]["schema"];
		schemaName = abstractQueryTable["graphsServiceLink"]["schema"];
	} else {
		schemaNamesTable[abstractQueryTable.identification._id] = parentSchemaName;
	}
	for(let c = 0; c < abstractQueryTable.children.length; c++){
		schemaNamesTable = setSchemaNamesForQuery(abstractQueryTable.children[c], schemaNamesTable, parentSchemaName)
	}
	return schemaNamesTable;
}

function combineWithDefinedPrefixes(knownPrefixes, prefixDeclarations){
	messages = [];
	for(let pr in prefixDeclarations){
		if(typeof prefixDeclarations[pr] !== "function"){
			let prefixExists = false;
			for(let kpr = 0; kpr < knownPrefixes.length; kpr++){
				if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] !== prefixDeclarations[pr]){
					messages.push({
						"type" : "Warning",
						"message" : "Prefix name '" + pr + "' already exists in the schema. Prefix '" + pr + ": <" + prefixDeclarations[pr] +">' ignored",
						"isBlocking" : false
					});
					prefixExists = true;
					break;
				} else if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] !== prefixDeclarations[pr]){
					prefixExists = true;
					break;
				}
			}
			if(prefixExists === false){
				knownPrefixes.push({
					is_local: false,
					name: pr,
					value: prefixDeclarations[pr]
				})
			}
		}
		console.log("PRRRRRRPPPPPPP", pr, prefixDeclarations[pr]);
	}
	return {knownPrefixes:knownPrefixes, messages:messages};
}