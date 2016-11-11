Interpreter.customMethods({

	ExecuteSPARQL: function() {

		// var sparql = new SPARQL();
		// var table_sparql = sparql.generateSPARQLQuery();

		var query = "select distinct ?Concept where {[] a ?Concept} LIMIT 100";

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					options: {
						params: {
							params: {
								"default-graph-uri": "",
								query: query,
							},
						},
						endPoint: "http://85.254.199.72:8890/sparql/get",
					},
			};

		Utilities.callMeteorMethod("executeSparql", list, function(res) {

			if (res.status == 200) {
				console.log(res.result)
				Session.set("executedSparql", res.result);
			}

			else {
				console.error(res);
				return;
			}

		});

	},

	GenerateSPARQL: function() {

		console.log("GenerateSPARQL executed")

		var sparql = new SPARQL();
		var table_sparql = sparql.generateSPARQLQuery();
		sparql.showGeneratedSPARQL(table_sparql);
	},

});



function SPARQL() {


}


SPARQL.prototype = {

	generateSPARQLQuery: function() {

		var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
		var elem_table = []; 
		var class_t;
		var link_t;
		var comp_t;
		var name;
		var type;
		var typeInput;
		var attribute_list = [];
		var all_attributes = [];
		var cont_list = [];
		var link_type = "";	
		var valid_start;
		var valid_end;	
		var query_count = 0;
		var top_elem_id;
		var count = 1; 
		var inst_val;
		var att_list = [];
		var instance_list = [];
		var instanceUsed = [];
		var uri_list = [];
		var cl_elem;
		var class_uri; 
		var uri_exist;
		var sparql_code = [];
		var structureTable=[];
		var nClass = [];
		var visitNum;
		var alias_list = [];
		var stereotypeCount = 0;
		var instList = "";		

//========================================================================================================
//========================================================================================================

// F U N C T I O N S		

//========================================================================================================
//========================================================================================================	

	//Creates list of instance names for all classes
		function generateInstTab (list) {
			var inst_type = CompartmentTypes.findOne({name: "Instance", elementTypeId: class_t});
			var inst;
			var inst_name;
			
			if (inst_type) {
				list.forEach(function(n){	

					inst = Compartments.findOne({elementId: n, compartmentTypeId: inst_type["_id"]})
					
					if (inst) {
						inst_name = inst["input"];						
						instance_list.push(inst_name);
					}
				})

				if (instance_list.length > 0) {
					instance_list = _.uniq(instance_list);
				}
			}
		}


	//All possible Class attributes
		function getClassAttributes (name) {
			var attName = [];

			if (!name) {
				return [];
			}

		//Read attribute values from DB
			//direct
			var klass = Classes.findOne({name: name});

			if (!klass) {
				return [];
			}

			_.each(klass["Attributes"], function(att){
				attName.push(att["localName"]);
			})
				
			//from Super Class
			var cs_val;
			var cs_list;	

			_.each(klass["AllSuperClasses"], function(supC){

				cs_val = supC["localName"];
				cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						attName.push(sca["localName"]);						
					})
				}
			})
			

			//from Sub Class		
			_.each(klass["AllSubClasses"], function(supC){

				cs_val = supC["localName"];
				cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						attName.push(sca["localName"]);
					})
				}
			})

			return attName;
		}

	//Function proceeding before parser
		function capitalizeString (str) {
			var capitalize = ["in", "not", "str", "lang", "langmatches", "datatype", "bound", "iri", "uri", "bnode", "rand", "abs", "ceil", "floor", 
								"round", "concat", "strlen", "ucase", "lcase", "encode_for_uri", "contains", "strstarts", "strends", "strbefore", 
								"strafter", "year", "month", "day", "timezone", "tz", "now", "uuid", "struuid", "md5", "sha1", "sha256", "sha384", 
								"sha512", "coalesce", "if", "strlang", "strdt", "sameterm", "isiri", "isuri", "isblank", "isliteral", "isnumeric", 
								"distinct", "regex", "substr", "replace", "exists", "count", "sum", "min", "max", "avg", "sample", "group_concat", 
								"separator", "or", "and", "substring", "inv"]; 
			var uncapitalize = ["true", "false", "days", "years", "months", "hours", "minutes", "seconds"];
			
			var wordsInit = [];
			var words = [];
			var position;
			var changed = false;
			var nStr;

			nStr = str;

			wordsInit = nStr.match(/\w+/g);

			wordsInit.forEach(function(w){
				words.push(w.toLowerCase());
			})

			words.forEach(function(w){
				uncapitalize.forEach(function(c){
					if (w === c) {
						position = words.indexOf(w);
						nStr = nStr.replace(wordsInit[position], w.toLowerCase());
						changed = true;
					}
				})

				if (!changed) {
					capitalize.forEach(function(c){
						if (w === c) {
							position = words.indexOf(w);
							nStr = nStr.replace(wordsInit[position], w.toUpperCase());
						}
					})
				}

				changed = false;			
			})
			return nStr;
		}

//-----------------------------------------------------------------------
//-----------------------------------------------------------------------
//Simple table
//-----------------------------------------------------------------------
//-----------------------------------------------------------------------

	//Read attributes as pure atribute or part of expression 
		function getAttributes (elem) {
			var a_list = [];

			if (Elements.findOne({_id: elem})) {
				var e_type = CompartmentTypes.findOne({name: "Attributes"});
				
				if (e_type) {
					var a_name;
					var al_name;
					var all_att=[];
					var has_att;
					var word_count;

					var nType = CompartmentTypes.findOne({name: "Name", elementTypeId: class_t});

					if (nType) {

						var c_name = Compartments.findOne({compartmentTypeId: nType["_id"], elementId: elem});

						if (c_name) {

							all_att = getClassAttributes(c_name["input"]);
							
							Compartments.find({elementId: elem, compartmentTypeId: e_type["_id"]}).forEach(function (ea){								

								al_name = ea["subCompartments"]["Attributes"]["Attributes"]["Alias"]["input"];
								a_name = ea["subCompartments"]["Attributes"]["Attributes"]["Name"]["input"];					

								if (a_name && a_name != "" && a_name != " "){

									word_count = a_name.match(/\w+/gi);									

									has_att = _.find(all_att, function(a){										

										if (a_name.includes(a)) {

											if (a_name == a && (!al_name || al_name == "")) {
												al_name = "_".concat(a);
											}

											a_name = a;
											return true;
										} else return false;
									})

									att_list.push(a_name);

									//Attribute contains function - save value for proceeding
									if (ea["subCompartments"]["Attributes"]["Attributes"]["IsOptional"]["input"] == "true") {
											
										a_list.push({alias: al_name, expression: a_name, 
														condition: "{o}".concat(ea["subCompartments"]["Attributes"]["Attributes"]["Name"]["input"])});											
									
									} else if (ea["subCompartments"]["Attributes"]["Attributes"]["IsNegation"]["input"] == "true") {
										
										a_list.push({alias: al_name, expression: a_name, 
														condition: "{n}".concat(ea["subCompartments"]["Attributes"]["Attributes"]["Name"]["input"])});
									
									} else if (word_count.length > 1) {
										
										a_list.push({alias: al_name, expression: a_name, 
													condition: ea["subCompartments"]["Attributes"]["Attributes"]["Name"]["input"]});

									} else {
										a_list.push({alias: al_name, expression: a_name});
									}									
									
								}
							})
						}
					}
				}
			}

			return a_list;
		}

	//Read Conditions for classes
		function getConditions (elem) {
			var c_list = [];

			if (Elements.findOne({_id: elem})) {
				var e_type = CompartmentTypes.findOne({name: "Conditions"});
				
				if (e_type) {

					Compartments.find({elementId: elem, compartmentTypeId: e_type["_id"]}).forEach(function (ea){
						c_list.push(ea["input"]);
					})
				}
			}
			return c_list;
		}

	//Determines instance name of given element or creates one
		function generateInst (elem) {
			var inst;
			var iName;
			var inst_type;
			var exists

			inst_type =  CompartmentTypes.findOne({name: "Instance", elementTypeId: class_t});

			if (inst_type) {

				inst = Compartments.findOne({elementId: elem, compartmentTypeId: inst_type["_id"]});
				
				if (inst) {
					iName = inst["input"];
				}

				exists = _.find(instanceUsed, function(n){
					return n === iName;
				})
			}

			//If instance name not given: create new name from Class name
			if (!iName) {
				inst_type =  CompartmentTypes.findOne({name: "Name", elementTypeId: class_t});
				if (inst_type){
					var cl_name = Compartments.findOne({elementId: elem, compartmentTypeId: inst_type["_id"]}); 
					
					if (cl_name){						
						iName = cl_name["input"];
					}
				}
				//If class name is already used as instance given by user
				exists = _.find(instance_list, function(n){
					return n === iName;
				})
			}			
					
			if (!iName || iName == "") {
				console.error("No Class");
				return "";
			}			

			if (exists) {						
				var i = 0;
				var lname = iName;;

				do {
					i++;							
					iName = lname.concat(i);

					exists = _.find(instanceUsed, function(n){
						return n === iName;
					})						
				} while (exists)				
			}

			instanceUsed.push(iName);
			return iName;			
		}

	//Visit every element from top element
		function elementCheck (ind) {
			
			if (elem_table[ind]){
				
				if (elem_table[ind]["visited"] == 0 && !(elem_table[ind]["type"].includes("Link"))){ //Not visited and is class type
					var next_ind;
					
					elem_table[ind]["visited"] = count;
					count = count + 1;
					
					elem_table.forEach(function(e){
						
						if(e["type"].includes("Link") && e["visited"] == 0 ){					
							next_ind = -1;
							
							if (e["start"] == elem_table[ind]["id"]) {

								elem_table.forEach(function(el){
									
									if (el["id"] == e["end"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})
								
							} else if (e["end"] == elem_table[ind]["id"]) {							
								
								elem_table.forEach(function(el){
									
									if (el["id"] == e["start"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})

							}
							
							if (next_ind > -1 && elem_table[next_ind]["visited"] == 0 && !e["type"].includes("Condition Link")) {								
								
								e["visited"] = count;
								count = count + 1;
								elementCheck(next_ind);	

							} else if (next_ind > -1 && elem_table[next_ind]["visited"] > 0 && e["type"].includes("Condition Link")){								
								
								e["visited"] = count;
								count = count + 1;
							}							
						}
					})					
				}
			}
		}

//-----------------------------------------------------------------------
//-----------------------------------------------------------------------
// Structure
//-----------------------------------------------------------------------
//-----------------------------------------------------------------------		

		function createStructureTable (table, i) {
			var att = []; // alias, expression, number, e.g. ["alias"] = "?n", ["expression"] = "?studentName", ["number"] = 1 from n=studentName
			var attTriples = []; // string, nr, e.g. ["?student :studentName ?n."] = 2
			var condList = []; //e.g. '?personID ="1234"'
			var nextClass = [];		
			var stereotype = "";
			var orderBy = [];
			var cl;
			var cLink;
			var condLink = [];
			var backLink;		

			if (!table) {
				console.error("no table");
				return ;
			}
			
			var index = table.findIndex(function(t){
				return t["visited"] == i;
			})

			cl = table[index];
			if (!cl) {
				console.error("No element for given index");
				return;
			}

			if (cl["type"].includes("Link") && i == 1) {
				console.error("Start should be class-type element");
				return;
			}

			if (cl["type"].includes("Link")) {
				console.error("Link as object");
				return ;
			}			
			
		//Class element describing variables
			var c_type = CompartmentTypes.findOne({name: "Stereotype"});

			if (c_type) {
				var st_value = Compartments.findOne({compartmentTypeId: c_type["_id"], elementId: cl["id"]});

				if (st_value) {
					stereotype = st_value["input"];
				}
			}

			c_type = CompartmentTypes.findOne({name: "OrderBy"});

			if (c_type) {
				var st_value = Compartments.findOne({compartmentTypeId: c_type["_id"], elementId: cl["id"]});

				if (st_value) {
					orderBy.push({value: st_value["subCompartments"]["OrderBy"]["OrderBy"]["Name"]["value"], 
									type: st_value["subCompartments"]["OrderBy"]["OrderBy"]["Desc"]["value"]});
				}
			}			

			var j = 1;
			var str;

			cl["attribute"].forEach(function (a){
				var newAlias;
				var aliasExist = "";
				var c;

				if (!a["alias"] || a["alias"] == "") {
					var c = 1;

					do {
						newAlias = "exp_".concat(c);
						c++;
						aliasExist = cl["attribute"].find(function (a) {
							return a["alias"] == newAlias;
						});
					} while (aliasExist == newAlias);

				} else {
					var c = 1;
					var aname = a["alias"];

					aliasExist = alias_list.find(function (ae) {
							return a["alias"] == ae;
						});

					while (aliasExist == a["alias"]) {
						a["alias"] = aname.concat("_", c);
						c++;

						aliasExist = alias_list.find(function (ae) {
							return a["alias"] == ae;
						});
					};

					alias_list.push(a["alias"]);
				}

				if (!newAlias) {
					newAlias = a["alias"];
				}

				if (newAlias.startsWith("_")) {
					newAlias = newAlias.slice(1);
				}				

				if (a["condition"]) {
										

					if (a["condition"].slice(0, 3) == "{o}") {

						att.push({alias: "?".concat(newAlias), expression: "?".concat(a["expression"]), number: j});
						j++;					

						if (a["alias"].startsWith("_")) {
													
							condList.push("OPTIONAL{ ?".concat(cl["instance"], " :", a["expression"], " ?", a["expression"], ".\n", 
											"?", cl["instance"], " :", a["expression"], " ?", newAlias, ".}" ));

						} else {
							
							var aString = capitalizeString(a["condition"].slice(3));
							condList.push("OPTIONAL{?".concat(cl["instance"], " :", a["expression"], " ?", a["expression"], ".\n",
											"BIND(", parse_attribute(aString), " as ?", newAlias, ")}"));
							
						}

					} else if (a["condition"].slice(0, 3) == "{n}") {

						att.push({alias: "?".concat(newAlias), expression: "?".concat(a["expression"]), number: j});
						j++;
						
						if (a["alias"].startsWith("_")) {													
							condList.push("FILTER NOT EXISTS{ ?".concat(cl["instance"], " :", a["expression"], " ?", a["expression"], ".\n",
											"?", cl["instance"], " :", a["expression"], " ?", newAlias, ".}" ));							
						} else {

							var aString = capitalizeString(a["condition"].slice(3));
							condList.push("FILTER NOT EXISTS{?".concat(cl["instance"], " :", a["expression"], " ?", a["expression"], ".\n", 
											"BIND(", parse_attribute(aString), " as ?", newAlias, ")}"));
						}

					} else {

						var aString = capitalizeString(a["condition"]);	
						// condList.push("BIND(".concat(parse_attribute(aString), " as ?", newAlias, ")"));

						att.push({alias: "(".concat(parse_attribute(aString), " as ?", newAlias, ")"), expression: "?".concat(a["expression"]), number: j});
						j++;

					}					
				} else {

					str = "?".concat(cl["instance"], " :", a["expression"], " ?", newAlias, "." );
					attTriples.push(str);

					att.push({alias: "?".concat(newAlias), expression: "?".concat(a["expression"]), number: j});
					j++;
					
				}

			})

			cl["condition"].forEach(function(a){
				var aString = capitalizeString(a);
				condList.push(parse_attribute(aString));
			})				
			
			if (condList.length == 0) {
				condList.push("");
			}

			//Check if conditions contain undefined attribute triple
			if (condList[0] != "") {
				var s;
				var e;
				var word = [];
				var words = [];
				var attNames = getClassAttributes(cl["name"]);
				var attExist;

				_.each(condList, function (a){					
					word = a.match(/\w+/gi);			//w(ord) consists of A-Z, a-z, 0-9

					for (var j = word.length - 1; j >= 0; j -= 1) {
						
						attExist = attNames.find(function(a){
							return word[j] == a; 
						})

						if (!attExist) {
							word.splice(j, 1);
						}						
					}

					words = words.concat(word);				
				})

				words = _.uniq(words, false);
					
				if (words.length > 0) {
					var attExists;

					words.forEach(function(w){

						attExists = false;						

						_.each(att, function(at){

							if (w == at["alias"].slice(1)) {
								attExists = true;
							}
						})

						if (!attExists){
										
							str = "?".concat(cl["instance"], " :", w, " ?", w, "." );
							attTriples.push(str);
							j++;
						}
					})
				}
			}

		//1st element
			if (i == 1) {

			//All outgoing links
				elem_table.forEach(function(a){

					if (a["type"].includes("Link") && a["visited"] > i && 
						(a["start"] == cl["id"] || a["end"] == cl["id"])) {
						
						var elem;

						elem = _.some(table, function (e){						
							return (e["visited"] == a["visited"] + 1);
						})						
						
						if (elem) {
							nextClass.push(createStructureTable(table, a["visited"] + 1))
						}
					}
				})

				obj = {
							name: cl["name"],
							instance: cl["instance"], 
							aggregateAttribute: "", 
							selectMain: {simpleAttributes: att},
							attributeTriples: attTriples,
							classTriple: "?".concat(cl["instance"], " a :", cl["name"], "."),
							conditionLinks: condLink,			
							filters: condList,
							link: "",
							linkType: "",
							stereotype: stereotype,
							orderBy: orderBy, 
							nextClass:	nextClass		
						};
				
				return obj;

		//Other elements
			} else {
			//All untreated links from this Class 
				elem_table.forEach(function(a){	

					if (a["type"].includes("Link") && a["visited"] > i && 
						(a["start"] == cl["id"] || a["end"] == cl["id"])) {

						var elem;			

						elem = _.some(table, function (e){						
							return (e["visited"] == a["visited"] + 1);
						})

						if (elem) {
							nextClass.push(createStructureTable(table, a["visited"] + 1));
						} 
					}
				})

			//Link to this Class proceeding
				var link;
				var linkTo;
				var linkFrom;				

				//If class has Condition link
				condLink.length = 0;
				link = _.find(table, function (a){

						if (a["visited"] > i && a["type"].includes("Condition Link") && 
							(a["start"] == cl["id"] || a["end"] == cl["id"]) ){

							return true;
						} else {
							return false;
						}
					})

				if (link) {

					linkFrom = table.find(function(a) {
						return a["id"] == link["start"];
					});

					linkTo = table.find(function(a) {
						return a["id"] == link["end"];
					});

					if (linkTo && linkFrom){
						if (link["type"].includes("Inverse Link")) {
							cLink = "?".concat(linkTo["instance"], " :", link["name"], " ?", linkFrom["instance"], ".");
						} else {
							cLink = "?".concat(linkFrom["instance"], " :", link["name"], " ?", linkTo["instance"], ".");
						}			

						if (link["type"].includes("Condition Link")) {

							if (link["type"].includes("Negation Link")) {
								condLink.push({value: cLink, filter: "FILTER NOT EXISTS"});
							} else if (link["type"].includes("Optional Link")) {
								condLink.push({value: cLink, filter: "OPTIONAL"});
							}else {
								condLink.push({value: "", filter: ""});								
							}
						}						
					}
				} else {
					condLink.push({value: "", filter: ""});
				}

				//Not condition links
				link = _.find(table, function (a){
								return (a["visited"] == i - 1);
							})

				if (link) {

					linkFrom = table.find(function(a) {
						return a["id"] == link["start"];
					});

					linkTo = table.find(function(a) {
						return a["id"] == link["end"];
					});

					if (linkTo && linkFrom){
						
						if (link["type"].includes("Inverse Link")) {
							cLink = "?".concat(linkTo["instance"], " :", link["name"], " ?", linkFrom["instance"], ".");
						} else {
							cLink = "?".concat(linkFrom["instance"], " :", link["name"], " ?", linkTo["instance"], ".");
						}

						if (link["type"].includes("Negation Link")) {
							backLink = {link: cLink, type: "FILTER NOT EXISTS"};
						} else if (link["type"].includes("Optional Link")) {
							backLink = {link: cLink, type: "OPTIONAL"};
						} else {
							backLink = {link: cLink, type: ""};
						// } else if (link["type"] == "Subquery Link") {
						// 	;
						}
					}
				}

				//Error treating links
				if (!backLink) {
					console.error("Error with link to class");
				}

				obj = {
						name: cl["name"],
						instance: cl["instance"], 
						aggregateAttribute: "", 
						selectMain: {simpleAttributes: att},
						attributeTriples: attTriples,
						classTriple: "?".concat(cl["instance"], " a :", cl["name"], "."),
						conditionLinks: condLink,			
						filters: condList,
						link: backLink["link"],
						linkType: backLink["type"],
						stereotype: stereotype,
						orderBy: orderBy, 
						nextClass:	nextClass		
					};
				
				return obj;
			}
		}

//-----------------------------------------------------------------------
//-----------------------------------------------------------------------
//SPARQL generation
//-----------------------------------------------------------------------
//-----------------------------------------------------------------------

		function createSPARQL (table) {
			var strSPARQL;
			var attributeStr ;
			var classStr;
			var order;

			if (!table){
				console.error("No table");
				return ;
			}

			//TEMPORAL - include only 1 URI
			if (uri_list[0]) {

				strSPARQL = "PREFIX : <".concat(uri_list[0], ">", "\n\n");		

				attributeStr = createAtt(table);
				classStr = createClass(table);

				if (stereotypeCount == 0) {
					strSPARQL = strSPARQL.concat("SELECT", attributeStr, " WHERE {", "\n", classStr, "}");
				} else {
					
					var countStr = countSELECT(table, classStr, attributeStr);

					strSPARQL = strSPARQL.concat("SELECT", attributeStr, " WHERE {", "\n");
					strSPARQL = strSPARQL.concat(countStr, "}");
				}

				order = createOrderBy(table);

				if (order != "") {
					strSPARQL = strSPARQL.concat("\n", "ORDER BY ", order);
				}


			} else {
				strSPARQL = "no uri";							
			}
			
			return strSPARQL;
		}

	//Creates list of values to show
		function createAtt (t) {
			var str = "";

			if (!t){
				console.error("No table for instance");
				return ;
			}

			_.each(t, function(table){

				if (table["stereotype"] && table["stereotype"] != "") {
					str = str.concat(" ?count_of_", table["instance"]);
				}

				_.each(table["selectMain"]["simpleAttributes"], function(a){
					str = str.concat(" ", a["alias"]);
				})

				if (table["nextClass"] && table["nextClass"].length > 0) {
						str = str.concat(" ", createAtt(table["nextClass"]));
				}
			})

			return str;
		}

	//Creates SPARQL code for class
		function createClass (t) {
			var str = "";

			if (!t){
				console.error("No table for Class generation");
				return ;
			}

			_.each(t, function(table){

				if (table["stereotype"] == "count") {
					stereotypeCount++;
				}

				//No link to class (1st class-element)
				if (table["link"] == "") {

					str = str.concat(table["classTriple"], "\n");
					
					_.each(table["attributeTriples"], function(a){
						str = str.concat(a, ("\n"));
					})

					if (table["filters"][0] != ""){

						_.each(table["filters"], function(a){
							if (a.includes("BIND") || a.includes("OPTIONAL") || a.includes("FILTER NOT EXISTS")) {
								str = str.concat(a, "\n");
							} else {
								str = str.concat("FILTER (", a, ")", "\n");
							}
						})
					}

					if (table["nextClass"].length > 0) {
						str = str.concat(" ", createClass(table["nextClass"]));
					}	
				}					
				
				//Class with link to it
				if (table["link"] && table["link"] != ""){

					if (table["linkType"] != ""){
						str = str.concat(table["linkType"], "{", "\n");
					}					

					str = str.concat(table["classTriple"], "\n");
					
					_.each(table["attributeTriples"], function(a){
						str = str.concat(a, "\n");
					})

					str = str.concat(table["link"], "\n");

					if (table["filters"][0] != ""){

						_.each(table["filters"], function(a){
							if (a.includes("BIND") || a.includes("OPTIONAL") || a.includes("FILTER NOT EXISTS")) {
								str = str.concat(a, "\n");						
							} else {
								str = str.concat("FILTER (", a, ")", "\n");
							}
						})
					}					

					if (table["nextClass"].length > 0) {
						str = str.concat(" ", createClass(table["nextClass"]));
					}

					_.each(table["conditionLinks"], function (c){

						if (c["value"] != "") {
							str = str.concat(c["filter"], "{", c["value"], "}");
						}
					})
					
					if (table["linkType"] != "") {
						str = str.concat("}", "\n");
					}					
				}
			})

			return str;
		}

	//SELECT-s for count
		function countSELECT(t, classStr, attributeStr) {
			var str = "";
			var onlyAtt = [];		

			if (!t){
				console.error("No table");
				return ;
			}

			if (!attributeStr) {
				console.error("No attributes to show");
				return ;
			}

			if (!classStr) {
				console.error("Nothing to search for");
				return ;
			}

			if (stereotypeCount <= 0) {
				return ;
			}

			onlyAtt = attributeStr.match(/\w+/gi);

			for (var c = onlyAtt.length -1; c >= 0; c--) {
				if (onlyAtt[c].includes("count")) {
					onlyAtt.splice(c, 1);
				}
			}
			
			onlyAtt.forEach(function(a){
				if (onlyAtt.indexOf(a) == 0) {
					onlyAtt[0] = "?".concat(a);
				} else {
					onlyAtt[0] = onlyAtt[0].concat(" ?", a);
				}
			})			

			_.each(t, function (table) {

				if (!instList.includes("?".concat(table["instance"], " ")) ){
					instList = instList.concat("?", table["instance"], " ");
				}

				if (table["stereotype"] == "count") {					
					
					str = str.concat("{SELECT (COUNT(?", table["instance"], ") as ?count_of_", table["instance"], ") ", onlyAtt[0], " WHERE{", "\n");
					str = str.concat("{SELECT DISTINCT ", onlyAtt[0], " ", instList, "WHERE{", "\n");
					str = str.concat(classStr, "}}}","\n");
					str = str.concat("GROUP BY ", onlyAtt[0], "\n", "}", "\n");

					stereotypeCount--;

					if (stereotypeCount > 0) {
						str = str.concat(countSELECT(table["nextClass"], classStr, attributeStr))
					}						
					
				} else if (stereotypeCount > 0 && table["nextClass"]) {
					str = str.concat(countSELECT(table["nextClass"], classStr, attributeStr));
				}
			})

			return str;
		}

	//Creates order By
		function createOrderBy (t) {
			var str = "";

			if (!t){
				console.error("No table for instance");
				return ;
			}

			_.each(t, function(table){
				
				_.each(table["orderBy"], function(a){
					
					if (a["type"] == "DESC") {
						str = str.concat("DESC(?", a["value"], ")");
					} else {
						str = str.concat("?", a["value"]);
					}

					if (table["nextClass"] && table["nextClass"].length > 0) {
						str = str.concat(" ", createOrderBy(table["nextClass"]));
				}
				})
				
			})

			return str;
		}

//========================================================================================================
//========================================================================================================

// M A I N   B O D Y

//========================================================================================================
//========================================================================================================
		
	if (elem_ids.length > 0){
		// Making table of selected elements and properties
		var ctype = ElementTypes.findOne({name: "Class"});
		var ltype = ElementTypes.findOne({name: "Link"});

		if (ctype && ltype){

			class_t = ctype["_id"];
			link_t = ltype["_id"];

			generateInstTab	(elem_ids);	
			var comp_type;

			_.each(elem_ids, function(el){
				//If chosen element is class-type
				comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: class_t});
				
				if (comp_type){
					name = Compartments.findOne({elementId: el, compartmentTypeId: comp_type["_id"]}); 
					if (name){							
						
						comp_type = CompartmentTypes.findOne({name: "ClassType", elementTypeId: class_t});
						
						if (comp_type){
							
							type = Compartments.findOne({elementId: el, compartmentTypeId: comp_type["_id"]});
							
							if (!type){
								
								typeInput = "query";
								query_count++;
							} else {
								
								typeInput = type["input"];
								
								if (type["input"] == "query") {
									query_count++;
								}
							}
						}

						inst_val = generateInst(el);
						cond_list = getConditions(el);
						attribute_list = getAttributes(el);	

						comp_type = CompartmentTypes.findOne({name: "Conditions"});							
						if (comp_type) {

							elem_table.push({
								name: name["input"], 
								type: typeInput, 
								id: el,
								instance: inst_val,
								attribute: attribute_list,
								condition: cond_list, 
								visited: 0
							});
						} else {

							elem_table.push({
								name: name["input"], 
								type: typeInput, 
								id: el,
								instance: inst_val,
								attribute: attribute_list,
								visited: 0
							});
						}

						all_attributes = _.union(all_attributes, attribute_list);
						//attribute_list = attribute_list.splice(0);

						

						cl_elem = Classes.findOne({name: name["input"]});
						if (cl_elem) {

							class_uri = cl_elem["URI"];
							// console.log("URI def: ", class_uri);
							class_uri = class_uri.slice(0, class_uri.indexOf("#") + 1);

							uri_exist = _.find(uri_list, function(n){
								return n === class_uri;
							})

							if (!uri_exist) {
								uri_list.push(class_uri);
							}
						}
						
					}						
				}					
				
				//If chosen element is link-type
				comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: link_t});
				if (comp_type){			

					name = Compartments.findOne({elementId: el, compartmentTypeId: comp_type["_id"]});
					if (name){

						link_type = "";
						var act_elem = Elements.findOne({_id: el});

						Compartments.find({elementId: el}).forEach(function(c){
							CompartmentTypes.find({elementTypeId: act_elem["elementTypeId"]}).forEach(function(t){

								if (c["compartmentTypeId"] == t["_id"] && c["input"] == "true"){
									link_type = link_type.concat(t["name"]);
								}
							})
						})

						if (link_type == "") {
							link_type = "Link"; 
						}						

						elem_table.push({
							name: name["input"], 
							type: link_type, 
							id: el,
							start: act_elem["startElement"], //ID
							end: act_elem["endElement"], //ID
							visited: 0
						});
					}
				}
			})

			console.log(query_count)
			//Only one possible top element			
			if (query_count != 1) {

				console.error("Wrong number of queries");
				Session.set("SPARQL", "Wrong number of queries");
				$("#SPARQL-form").modal("show");
			} else {						
				var i;			
				
				for (i = elem_table.length-1; i >= 0; i--) {

					if(elem_table[i]["type"].includes("Link")){

						valid_start = false;
						valid_end = false;

						elem_table.forEach(function(e){ //element to compare with					
							
							if(e["id"] != elem_table[i]["id"]) {

								if (elem_table[i]["start"] == e["id"]) {
									valid_start = true;
								}

								if (elem_table[i]["end"] == e["id"]) {
									valid_end = true;
								}
							}
						})

						if (!valid_end || !valid_start) {
							elem_table.splice(i, 1); 
						}
					}

					elem_table.forEach(function(e){

						if(e["type"] == "query") {
							top_elem_id = _.indexOf(elem_table, e);
						}
					})
				}			
					
				//Checking if all classes are valid
				if(elem_table.length > 1){

					for (i = elem_table.length-1; i >= 0; i--) {

						if(!(elem_table[i]["type"].includes("Link"))){

							valid_end = false;
							
							elem_table.forEach(function(e){ //element to compare with					
								
								if(e["id"] != elem_table[i]["id"] && e["type"].includes("Link")) {
									
									if (e["start"] == elem_table[i]["id"] || e["end"] == elem_table[i]["id"]) {
										valid_end = true;
									}
								}
							})							

							if (!valid_end && i != top_elem_id) { // No links from/to top class
								
								elem_table.splice(i, 1);

								if (top_elem_id > i) {
									
									elem_table.forEach(function(e){
										
										if(e["type"] == "query") {
											top_elem_id = _.indexOf(elem_table, e);
										}										
									})									
								} 
							}
						}
					}
				}

				elementCheck(top_elem_id);			

				// console.log("Table after visit");
				// elem_table.forEach(function(s) {
				// 	console.log("Name: ", s["name"], ", type: ", s["type"], ", instance:", s["instance"], 
				// 		", attribute: ", s["attribute"], ", start: ", s["start"], ", visited: ", s["visited"]);
				// });

				var tableLUA = [];
				tableLUA.push(createStructureTable(elem_table, 1));
				console.log("result table:", tableLUA);	
				
				var tableSPARQL = createSPARQL(tableLUA);

			}
		}
	}
	},

	showGeneratedSPARQL: function(table_sparql) {
		Session.set("SPARQL", table_sparql);

		console.log("table sqarql ", table_sparql)

		$("#SPARQL-form").modal("show");	
	},

};
