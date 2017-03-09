Interpreter.customMethods({

	ExecuteSPARQL: function(resp) {

		if (!resp) {
			var sparql = new SPARQL();
			resp = sparql.generateSPARQLQuery();
		}

		if (resp.status == 200 || true) {

			var list = {projectId: Session.get("activeProject"),
						versionId: Session.get("versionId"),
						options: {
							params: {
								params: {
									"default-graph-uri": "",
									query: resp.query,
								},
							},
							endPoint: "http://85.254.199.72:8890/sparql",
						},
					};

			Utilities.callMeteorMethod("executeSparql", list, function(res) {

				if (res.status == 200) {
					Session.set("generatedSparql", resp.query);
					Session.set("executedSparql", res.result);
				}

				else {
					console.error(res);
					return;
				}

			});
		}

		else {
			sparql.showGeneratedSPARQL(resp);
		}

	},

	GenerateSPARQL: function() {

		console.log("GenerateSPARQL executed")

		var sparql = new SPARQL();
		var resp = sparql.generateSPARQLQuery();
		//sparql.showGeneratedSPARQL(resp);
	},

});


function SPARQL() {
}

SPARQL.prototype = {
//Main function	
	generateSPARQLQuery : function() {

		var self = this;
		var IDtable = self.getIDtable();
		var diagramData;
		var parsedDiagram;
		
		console.log("70", IDtable);
		if (IDtable.length > 0) {			
			diagramData = self.createDiagramTree (IDtable, 0);
			console.log("73", diagramData);
			//parsedDiagram = createSPARQLTree (diagramData);
		}

	},

//Get structure without information
	getIDtable : function() { 
		var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());
		var class_t;
		var link_t;
		var type;
		var query_count = 0;
		var elem_table = [];
		//console.log(elem_ids);


		if (elem_ids.length > 0){
		// Making table of selected elements and properties
			var ctype = ElementTypes.findOne({name: "Class"});
			var ltype = ElementTypes.findOne({name: "Link"});
			var comp_type
			//console.log("elem_ids = ", elem_ids); 
			
			if (ctype && ltype){

				class_t = ctype["_id"];
				link_t = ltype["_id"];

				var comp_type;

				_.each(elem_ids, function(el){
		//If chosen element is class-type
					comp_type = Elements.findOne({_id: el, elementTypeId: class_t});
					if (comp_type){		
							
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

						if (typeInput=="") {
							typeInput = "query";
							query_count++;
						}

						elem_table.push({
							id: el, 
							type: typeInput, 								
							visited: 0
						});						
					} else {		
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
									id: el,
									type: link_type,							
									start: act_elem["startElement"], //ID
									end: act_elem["endElement"], //ID
									visited: 0
								});
							}
						}
					}
				})

				//console.log(elem_table, query_count);

				if (query_count != 1) {
					console.error("Wrong number of queries");
					return [];
				}
				
				var start = elem_table.find(function (el) {
					return el["type"] == "query"});
				
				var top_elem_id = _.indexOf(elem_table, start);

				if (top_elem_id == -1) {
					console.error("Something went wrong");
					return [];
				}

				elem_table = this.sortID(elem_table, top_elem_id, 1);

				if (elem_table[0]["visited"] == 0) { //remove not visited elements
					while(elem_table[0]["visited"] == 0) {
						elem_table.splice(0, 1);
					};
				}

				return elem_table;
			}
		}
	},

//Sort ID according to visit
	sortID : function (elem_table, index, count){
		var self = this;
		if (elem_table[index]){				
				if (elem_table[index]["visited"] == 0 && !(elem_table[index]["type"].includes("Link"))){ //Not visited and is class type
					var next_ind;
					
					elem_table[index]["visited"] = count;
					count = count + 1;

					_.each(elem_table, function(e){ //visit Conditional links						
						if(e["type"].includes("Condition Link") && e["visited"] == 0 ){					
							next_ind = -1;
							
							if (e["start"] == elem_table[index]["id"]) {

								_.each(elem_table, function(el){
									
									if (el["id"] == e["end"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})
								
							} else if (e["end"] == elem_table[index]["id"]) {							
								
								_.each(elem_table, function(el){
									
									if (el["id"] == e["start"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})

							}
							
							if (next_ind > -1 && elem_table[next_ind]["visited"] > 0){								
								e["visited"] = count;
								count = count + 1;
							}						
						}
					})	

					_.each(elem_table, function(e){ //visit links and create tree
						
						if(e["type"].includes("Link") && e["visited"] == 0 && !e["type"].includes("Condition Link")){					
							next_ind = -1;
							
							if (e["start"] == elem_table[index]["id"]) {

								_.each(elem_table, function(el){
									
									if (el["id"] == e["end"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})
								
							} else if (e["end"] == elem_table[index]["id"]) {							
								
								_.each(elem_table, function(el){
									
									if (el["id"] == e["start"]) {
										next_ind = _.indexOf(elem_table, el);
									}
								})

							}
							
							if (next_ind > -1 && elem_table[next_ind]["visited"] == 0) {
								e["visited"] = count;
								count = count + 1;
								//console.log(elem_table, next_ind, count);
								elem_table = self.sortID(elem_table, next_ind, count);
							}						
						}
					})

									
				}

				elem_table.sort(function(a, b){
					return a["visited"]-b["visited"];
				});
			}

			return elem_table;
	},

//Read information from diargamm
	createDiagramTree : function(table, ind) {
		var self = this;
		var linkType = ElementTypes.findOne({name: "Link"});
		var classType = ElementTypes.findOne({name: "Class"});

		if (!linkType || !classType){
			console.error("Types doesn't exist");
			return [];
		}

		if (table[ind]){
		//Proceed Class
			if (!table[ind]["type"].includes("Link")){
				var i = ind + 1;
				var linkType = ElementTypes.findOne({name: "Link"});
				var condLink = [];

			//Get information from diagram
					var comparType;
					var compart;
					var name;
					var instance;
					var condition = [];
					var attribute = [];
					var orderBy;
					var stereoType;
					var showRow;
					var skipRow;
					var having;
					var order;
					var distinct;					
				//Name
					comparType = CompartmentTypes.findOne({name: "Name", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class name");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]}); 					
					if (!compart){
						name = "";
					} else {
						if (compart["input"]){
							name = compart["input"];
						} else {
							name = "";
						}
					}
					
				//Instance
					comparType = CompartmentTypes.findOne({name: "Instance", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class instance");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]});
					if (!compart){
						instance = "";
					} else {
						if (compart["input"]){
							instance = compart["input"];
						} else {
							instance = "";
						}
					}

				//StereoType
					comparType = CompartmentTypes.findOne({name: "Stereotype", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class stereotype");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]});
					if (!compart){
						stereoType = "";
					} else {
						if (compart["input"]){
							stereoType = compart["input"];
						} else {
							stereoType = "";
						}
					}

				//OrderBy
					comparType = CompartmentTypes.findOne({name: "OrderBy", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class OrderBy");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]});
					if (!compart){
						orderBy = "";
					} else {
						if (compart["input"]){
							orderBy = compart["input"];
						} else {
							orderBy = "";
						}
					}

				//Condition list
					comparType = CompartmentTypes.findOne({name: "Conditions", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class Conditions");
						return [];
					}									
					compart = Compartments.find({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]}).forEach(function(c){
						if (c["input"]){
							condition.push(c["input"]);
						}
					})
				
				//Attribute list
					comparType = CompartmentTypes.findOne({name: "Attributes", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class attribute");
						return [];
					}
					compart = Compartments.find({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]}).forEach(function(a){
						if (a["input"]){
							attribute.push(a["input"]);
						}
					})

					// //Separator
					// comparType = CompartmentTypes.findOne({name: "Separator", elementTypeId: classType["_id"]});
					// if (!comparType) {
					// 	console.error("Can't find Class attribute");
					// 	return [];
					// }
					// compart = Compartments.find({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]}).forEach(function(a){
					// 	if (a["input"]){
					// 		attribute.push(a["input"]);
					// 	}
					// })	

				//Having
					comparType = CompartmentTypes.findOne({name: "Having", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class attribute");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]})
					having = "";
					if (compart) {
						having = compart["input"];						
					}	
				
				//Distinct
					comparType = CompartmentTypes.findOne({name: "Distinct", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class attribute");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]})
					distinct = "";
					if (compart) {
						distinct = compart["input"];						
					}		
				
				//Show rows
					comparType = CompartmentTypes.findOne({name: "Show rows", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class show row attribute");
						return [];
					}
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]})
					showRow = "";
					if (compart) {
						showRow = compart["input"];						
					}

				
				//Skip rows
					comparType = CompartmentTypes.findOne({name: "Skip rows", elementTypeId: classType["_id"]});
					if (!comparType) {
						console.error("Can't find Class attribute");
						return [];
					}
					
					compart = Compartments.findOne({elementId: table[ind]["id"], compartmentTypeId: comparType["_id"]})
					skipRow = "";
					if (compart) {
						skipRow = compart["input"];						
					}									
				
			//Condition links - proceeded in this class
				while (table[i] && table[i]["type"].includes("Condition Link")){
					var nameType = CompartmentTypes.findOne({name: "Name", elementTypeId: linkType["_id"]});
					if (nameType){
						
						var condLinkName = Compartments.findOne({compartmentTypeId: nameType["_id"]});
						if (!condLinkName) {
							condLinkName = "";
						}

						condLink.push({
							id: table[i]["id"],
							name: condLinkName,
							type: table[i]["type"],
							startID: table[i]["start"],
							endID: table[i]["end"]
						})
						
						i++;
					}
				}				

			//If next element exists - it should be link+class pair at least
				var nextClass;
				if (table[i] && table[i+1]){
					nextClass = self.createDiagramTree(table, i+1);
				} else {
					nextClass = "";
				}
				
			//If not 1st element, create link description
				var link2Class;
				if (ind > 0) {
					var nameType = CompartmentTypes.findOne({name: "Name", elementTypeId: linkType["_id"]});

					var linkName = Compartments.findOne({compartmentTypeId: nameType["_id"]})["input"];
					if (!linkName) {
						linkName = "";
					}

					link2Class = {
						id: table[ind-1]["id"],
						name: linkName,
						type: table[ind-1]["type"],
						startID: table[ind-1]["start"],
						endID: table[ind-1]["end"]
					};
				} else if (table[i]){
					link2Class = "";									
				}				

				var obj = {
					id: table[ind]["id"],
					name: name,
					type: table[ind]["type"],
					classDesriptor: self.getClassInformation(name),
					instance: instance, 
					attribute: attribute,
					conditionLinks: condLink,			
					link: link2Class,
					stereotype: stereoType,
					orderBy: orderBy,
					having: having,
					showRow: showRow,
					skipRow: skipRow, 
					distinct: distinct,
					nextClass: nextClass
				};		
			} else {
		//If type is not class, see next element
				self.createDiagramTree(table, ind+1);
			}
		}
		return obj;
	},

//Get full information about class
	getClassInformation : function(className) {
		var classData = Classes.findOne({localName: className});
		
		if (!classData) {
			console.error("Class not found");
			return;
		}

		var classDescription;

		var subClass = [];
		_.each(classData.AllSubClasses, function (a) {
			subClass.push({name: a.localName, uri: a.URI});
		})

		var directSubCl = [];
		_.each(classData.DirectSubClasses, function (a) {
			directSubCl.push({name: a.localName, uri: a.URI});
		})

		var superClass = [];
		_.each(classData.AllSuperClasses, function (a) {
			superClass.push({name: a.localName, uri: a.URI});
		})

		var directSuperCl = [];
		_.each(classData.DirectSuperClasses, function (a) {
			directSuperCl.push({name: a.localName, uri: a.URI});
		})

		var attribute = [];
		_.each(classData.Attributes, function (a) {
			attribute.push({name: a.localName, uri: a.URI});
		})

		var associate = [];
		_.each(classData.Associations, function (a) {
			if (a.localName && a.URI) { associate.push({name: a.localName, uri: a.URI}); }
		})

		classDescription = {
				name: className,
				uri: classData.URI,
				namespace: classData.namespace,				
				subClasses: subClass,
				directSub: directSuperCl,
				superClasses: superClass,
				directSuper: directSuperCl,
				attributes: attribute,
				associations: associate
			};

		//console.log("Descriptor", classDescription);

		return classDescription;
	},

//Parse diagramm data and create table for SPARQL generation
	createSPARQLTree : function(diagramData){		
	},

//Create SPARQL from tree
	createSPARQL: function(IDtable) {
	},

//Function proceeding before parser
	capitalizeString: function(str) {
		// var capitalize = ["in", "not", "str", "lang", "langmatches", "datatype", "bound", "iri", "uri", "bnode", "rand", "abs", "ceil", "floor", 
		// 					"round", "concat", "strlen", "ucase", "lcase", "encode_for_uri", "contains", "strstarts", "strends", "strbefore", 
		// 					"strafter", "year", "month", "day", "timezone", "tz", "now", "uuid", "struuid", "md5", "sha1", "sha256", "sha384", 
		// 					"sha512", "coalesce", "if", "strlang", "strdt", "sameterm", "isiri", "isuri", "isblank", "isliteral", "isnumeric", 
		// 					"distinct", "regex", "substr", "replace", "exists", "count", "sum", "min", "max", "avg", "sample", "group_concat", 
		// 					"separator", "or", "and", "substring", "inv"]; 
		// var uncapitalize = ["true", "false", "days", "years", "months", "hours", "minutes", "seconds"];
		
		// var wordsInit = [];
		// var words = [];
		// var position;
		// var changed = false;
		// var nStr;

		// nStr = str;

		// wordsInit = nStr.match(/\w+/g);

		// wordsInit.forEach(function(w){
		// 	words.push(w.toLowerCase());
		// })

		// words.forEach(function(w){
		// 	uncapitalize.forEach(function(c){
		// 		if (w === c) {
		// 			position = words.indexOf(w);
		// 			nStr = nStr.replace(wordsInit[position], w.toLowerCase());
		// 			changed = true;
		// 		}
		// 	})

		// 	if (!changed) {
		// 		capitalize.forEach(function(c){
		// 			if (w === c) {
		// 				position = words.indexOf(w);
		// 				nStr = nStr.replace(wordsInit[position], w.toUpperCase());
		// 			}
		// 		})
		// 	}

		// 	changed = false;			
		// })
		// return nStr;
	},

//Display results
	showGeneratedSPARQL: function(resp) {

		var value = resp.error;
		if (resp.status == 200 || true) {
			value = resp.query;
		}

		Session.set("generatedSparql", value);
		Session.set("executedSparql", undefined);
	}

};
