

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
      options = arguments[1];
        			//console.log(options);
        			
		  var continuations = {};
          
          function makeArray(value){
          	if (continuations[value]==null) {
          		continuations[value] = {};
          	}
          	return continuations;
          }
          
          async function addContinuation(place, continuation, priority, type, start_end){
          	var position = "start";
          	if(start_end != null)position = start_end;
          	makeArray(place[position]["offset"]);
          	continuations[place[position]["offset"]][continuation]={name:continuation, priority:priority, type:type};
          }
          async function returnContinuation(){
          	return JSON.stringify(continuations,null,2);
          }

          function makeVar(o) {return makeString(o);};
          
          
          async function pathOrReference(o) {
      		var pathPrimary = o.PathEltOrInverse.PathElt.PathPrimary;
			
          	var propertyName = "";
          	if(typeof pathPrimary.var !== 'undefined') propertyName = pathPrimary.var.name;
          	if(typeof pathPrimary.PrefixedName !== 'undefined') propertyName = pathPrimary.PrefixedName.Prefix + pathPrimary.PrefixedName.var.name;
          	var targetSourceClass = "targetClass";
          	if(o.PathEltOrInverse.inv == "^")targetSourceClass = "sourceClass";

      		var params = {propertyKind:'Object'};
          	// if (fullText != "") params.filter = fullText;
          	// var selected_elem_id = Session.get("activeElement");	
          	// var elFrom=options.link.getStartElement();
          	// var elTo=options.link.getEndElement();
          	// if (varibleName != "") params.filter=varibleName;
      		
      		var p = {main:{propertyKind:'ObjectExt',"limit": 30}, element: {"pList": {"in": [{"name": propertyName, "type": "in"}]}}}
			if(o.PathEltOrInverse.inv == "^") p = {main:{propertyKind:'ObjectExt',"limit": 30}, element: {"pList": {"out": [{"name": propertyName, "type": "out"}]}}}
      		var props= await dataShapes.getPropertiesFull(p)
			
			var proj = Projects.findOne({_id: Session.get("activeProject")});
			var schemaName = null;
			if (proj) {
				if (proj.schema) {
					schemaName = proj.schema;
				};
			}

          	// var props = await dataShapes.getProperties(params, elFrom, elTo);
          	props = props["data"];
          	for(let pr in props){
				if(typeof props[pr] !== "function"){
					var prefix;
					if((props[pr]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
						|| (schemaName.toLowerCase() == "wikidata" && props[pr]["prefix"] == "wdt"))prefix = "";
					else prefix = props[pr]["prefix"]+":";
						
					var propName = prefix+props[pr]["display_name"];
					if ( props[pr].mark === 'in'){
						propName = "^"+propName;
					}
					await addContinuation(await location(), propName, 100, 2, "end");
				}
          	}
          	return o;
          };
          
          async function afterVar(o) {
			var loc = await location();
			var textEnd = loc.end.offset;
			var pathParts = options.text.substring(0, textEnd).split(/[.\/]/);
      		var varibleName = makeVar(o);
      		var params = {main:{propertyKind:'ObjectExt',"limit": 30}}
      		var isInv = false;
    						
      		if(pathParts.length > 1){
      			params.element = {"pList": {"in": [{"name": pathParts[pathParts.length-2], "type": "in"}]}}
    			params.main.filter=pathParts[pathParts.length-1];
    			if(pathParts[pathParts.length-1].startsWith("^")){
    				isInv = true;
    				params.main.filter=pathParts[pathParts.length-1].substr(1);
					// params.element = {"pList": {"in": [{"name": pathParts[pathParts.length-2], "type": "in"}]}}
				} else if(pathParts[pathParts.length-1].toLowerCase().startsWith("inv(")){
					isInv = true;
    				params.main.filter=pathParts[pathParts.length-1].substr(4);
					// params.element = {"pList": {"in": [{"name": pathParts[pathParts.length-2], "type": "in"}]}}
				}
      		} else {

      			if(typeof options.link !== "undefined"){
					var elFrom=options.link.getStartElement().getName();
					var elTo=options.link.getEndElement().getName();
									
					if(typeof elFrom !== 'undefined' && elFrom !== null && elFrom !== "") params.element = {className: elFrom};
					if(typeof elTo !== 'undefined' && elTo !== null && elTo !== "")   { params.elementOE = {className: elTo};  params.main.propertyKind = 'Connect'; }
				} else if (typeof options.className !== 'undefined') params.element = {className: options.className};
      			
      			if (varibleName != "") params.main.filter=varibleName;
    	
    			if(pathParts[0].startsWith("^"))isInv = true;
      		}
          	var props = await dataShapes.getPropertiesFull(params);
			
			var proj = Projects.findOne({_id: Session.get("activeProject")});
			var schemaName = null;
			if (proj) {
				if (proj.schema) {
					schemaName = proj.schema;
				};
			}

          	props = props["data"];
      		
          	for(let pr in props){
				if(typeof props[pr] !== "function"){
					var prefix;
					if((props[pr]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
						|| (schemaName.toLowerCase() == "wikidata" && props[pr]["prefix"] == "wdt"))prefix = "";
					else prefix = props[pr]["prefix"]+":";
						
					var propName = prefix+props[pr]["display_name"];
					if ( props[pr].mark === 'in' && isInv == false){
						propName = "^"+propName;
					}
					if(isInv == false || (isInv == true && props[pr].mark === 'in'))await addContinuation(await location(), propName, 100, 2);
				}
          	}
          						
              return o;
          };
          
          async function getInverseAssociations(o){
			var loc = await location();
			var textEnd = loc.end.offset;
      		var pathParts = options.text.substring(0, textEnd).split(/[.\/]/);
      		var params = {main:{propertyKind:'ObjectExt',"limit": 30}}
      		if(pathParts.length > 1){
      			 params.element = {"pList": {"in": [{"name": pathParts[pathParts.length-2], "type": "in"}]}}
      		} else {
      			if(typeof options.link !== "undefined"){
					var elFrom=options.link.getStartElement().getName();
					var elTo=options.link.getEndElement().getName();
									
					if(typeof elFrom !== 'undefined' && elFrom !== null && elFrom !== "") params.element = {className: elFrom};
					if(typeof elTo !== 'undefined' && elTo !== null && elTo !== "")  { params.elementOE = {className: elTo};  params.main.propertyKind = 'Connect'; }
				} else if (typeof options.className !== 'undefined') params.element = {className: options.className};
      		}

          	var props = await dataShapes.getPropertiesFull(params);
			
			var proj = Projects.findOne({_id: Session.get("activeProject")});
			var schemaName = null;
			if (proj) {
				if (proj.schema) {
					schemaName = proj.schema;
				};
			}

          	props = props["data"];
          	for(let pr in props){
				if(typeof props[pr] !== "function"){
					var prefix;
					if((props[pr]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
						|| (schemaName.toLowerCase() == "wikidata" &&  props[pr]["prefix"] == "wdt"))prefix = "";
					else prefix = props[pr]["prefix"]+":";
						
					var propName = prefix+props[pr]["display_name"];
					if ( props[pr].mark === 'in'){
						if(o == "^")propName = "^"+propName;
						else propName = "inv("+propName+")";
					}
					await addContinuation(await location(), propName, 100, 2);
				}
          	}				
            return;
		  }
      	
          async function getAssociations(place, priority){
				var pathParts = options.text.split(/[.\/]/);
				if(pathParts.length <= 1){
					var params = {propertyKind:'ObjectExt'};
					// if (fullText != "") params.filter = fullText;
					var selected_elem_id = Session.get("activeElement");	
					var props;
					if(typeof options.link !== "undefined"){
						var elFrom=options.link.getStartElement();
						var elTo=options.link.getEndElement();

						props = await dataShapes.getProperties(params, elFrom, elTo);
					} else {
						var params = {main:{propertyKind:'ObjectExt',"limit": 30}};
						if (typeof options.className !== 'undefined') params.element = {className: options.className};
							props = await dataShapes.getPropertiesFull(params);
					}
					props = props["data"];
					
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					var schemaName = null;
					if (proj) {
						if (proj.schema) {
							schemaName = proj.schema;
						};
					}
	
					for(let pr in props){
						if(typeof props[pr] !== "function"){
							var prefix;
							if((props[pr]["is_local"] == true && await dataShapes.schema.showPrefixes === "false")
								|| (schemaName.toLowerCase() == "wikidata" && props[pr]["prefix"] == "wdt"))prefix = "";
							else prefix = props[pr]["prefix"]+":";
											
							var propName = prefix+props[pr]["display_name"];
							if ( props[pr].mark === 'in'){
								propName = "^"+propName;
							}
							await addContinuation(place, propName, 100, 2);
						}
					}
				}
          }
          
          // string -> idObject
          // returns type of the identifier from symbol table. Null if does not exist.
          async function resolveTypeFromSymbolTable(id) {
			var context = options.context._id;
              			
            if(typeof options.symbol_table === 'undefined' || typeof options.symbol_table[context] === 'undefined') return null;

            var st_row = options.symbol_table[context][id];
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
		  
          // string -> idObject
          // returns kind of the identifier from symbol table. Null if does not exist.
          async function resolveKindFromSymbolTable(id) {
             var context = options.context._id;

             if(typeof options.symbol_table === 'undefined' || typeof options.symbol_table[context] === 'undefined') return null;

             var st_row = options.symbol_table[context][id];
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
                return st_row.kind
             } else {
               return null
             }
               return null
          };
          // string -> idObject
          // returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
          async function resolveTypeFromSchemaForClass(id) {
            var cls = await dataShapes.resolveClassByName({name: id})
            if(cls["complite"] == false) return null;
            if(cls["data"].length > 0){
                 return cls["data"][0];
            }
            return null;
         };
         // string -> idObject
         // returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
         async function resolveTypeFromSchemaForAttributeAndLink(id) {
                      	
            var aorl = await dataShapes.resolvePropertyByName({name: id})
            // var aorl = options.schema.resolveAttributeByNameAndClass(options.context["localName"], id);
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
         async function resolveType(id) {
            if(id !== "undefined"){
				var t=await resolveTypeFromSymbolTable(id);
				if (!t) {
					if (options.exprType) {
                      	t= await resolveTypeFromSchemaForClass(id);
          				if (!t) {
          					t=await resolveTypeFromSchemaForAttributeAndLink(id)
                      	}
					} else {
                      	t=await resolveTypeFromSchemaForAttributeAndLink(id);
                      	if (!t) {
          					t=await resolveTypeFromSchemaForClass(id)
          				}
          			}
				}
				return t;}
           return null;
        };
         
		//string -> string
        // resolves kind of id. CLASS_ALIAS, PROPERTY_ALIAS, CLASS_NAME, CLASS_ALIAS, null
        async function resolveKind(id) {
			if(id !== "undefined"){
				var k=await resolveKindFromSymbolTable(id);
					if (!k) {
						if (options.exprType) {
							if (await resolveTypeFromSchemaForClass(id)) {
								k="CLASS_NAME";
							} else if (await resolveTypeFromSchemaForAttributeAndLink(id)) {
								k="PROPERTY_NAME";
							}
                        } else {
                          if (await resolveTypeFromSchemaForAttributeAndLink(id)) {
                          	k="PROPERTY_NAME";
                          } else if (await resolveTypeFromSchemaForClass(id)) {
                          	k="CLASS_NAME";
                          }
                       }
					}
          		return k;
				}
                return null
       }

		}

			    
			
			Path = (space (PathAlternative / VAR / (plusplus "++") / ( equalequal "==")) space)? end {return {PathProperty:PathProperty}}
			PathAlternative = PathAlternative:(PathSequence (space VERTICAL space PathSequence)*) {return {PathAlternative:PathAlternative}}
			

			PathSequence = PathSequenceA / PathSequenceB
			PathSequenceA = PathSequence:(PEPS)+ PathEltOrInverse {return {PathSequence:PathSequence}}
			PathSequenceB = PathEltOrInverse_c Var: PathEltOrInverse 
		
			//PathSequence = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)* ){return {PathSequence:PathSequence}}
			PathEltOrInverse = PathEltOrInverse:(PathElt3 / PathElt1 / PathElt2) {return {PathEltOrInverse:PathEltOrInverse}}
			PathElt1 = PathElt:PathElt {return {inv:"", PathElt:PathElt}}
			PathElt2 = Check PathElt:PathElt {return {inv:"^", PathElt:PathElt}}
			PathElt3 = Inv br_open "(" (PathElt:PathElt) br_close ")" {return {inv:"^", PathElt:PathElt}}
			PathElt = PathPrimary:PathPrimary PathMod:PathMod? {return {PathPrimary:PathPrimary, PathMod:PathMod}}
			PathPrimary =  (exclamation "!" PathNegatedPropertySet)/ DoubleSquareBracketName / iri / (br_open BRACKET:"(" space Path space br_close ")") / LName/ (a_c "a" )
			PathNegatedPropertySet = PathNegatedPropertySet:(PathNegatedPropertySet2 / PathNegatedPropertySet1){return {PathNegatedPropertySet:PathNegatedPropertySet}}
			PathNegatedPropertySet1 = PathOneInPropertySet:PathOneInPropertySet {return {PathOneInPropertySet:PathOneInPropertySet}}
			PathNegatedPropertySet2 = PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted {return {PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted}}
			PathNegatedPropertySetBracketted = (br_open"(" (space PathOneInPropertySet (space VERTICAL space PathOneInPropertySet)*)? space br_close")")
			PathOneInPropertySet = PathOneInPropertySet3 / PathOneInPropertySet1 / PathOneInPropertySet2
			PathOneInPropertySet1 = iriOra:(DoubleSquareBracketName / iri  / LName/ (a_c 'a')) {return {inv:"", iriOra:iriOra}}
			PathOneInPropertySet2 = Check iriOra:(DoubleSquareBracketName / iri  / LName/ (a_c 'a')) {return {inv:"^", iriOra:iriOra}}
			PathOneInPropertySet3 = Inv br_open"(" iriOra:(DoubleSquareBracketName / iri / LName/ (a_c 'a') ) br_close ")" {return {inv:"^", iriOra:iriOra}}
			PathMod = ((question "?") / (mult "*") / (plus "+"))
			Check = check_c "^" {return getInverseAssociations("^")}
			Inv = inv_c "inv"i {return getInverseAssociations("inv")}
			
			iri = IRIREF / PrefixedName
			PrefixedName = PrefixedName:(PNAME_LN / PNAME_NS) {return {PrefixedName:PrefixedName}}
			IRIREF  = IRIREF:( less "<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])* more ">") {return {IRIREF:makeVar(IRIREF)}}
			PNAME_NS = Prefix:(PN_PREFIX?  colon ':') {return makeVar(Prefix)}
			PNAME_LN = (PNAME_NS:PNAME_NS  LName:Chars_String_variable) {return {var:{name:makeVar(LName),type:resolveType(makeVar(PNAME_NS)+makeVar(LName)), kind:resolveKind(makeVar(PNAME_NS)+makeVar(LName))}, Prefix:PNAME_NS}}
			LName = (LName:(Chars_String_variable)) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			PN_PREFIX = Chars_String_prefix
		 
			DoubleSquareBracketName = Var:(squarePrefix? squareVariable) {return afterVar(Var)}
			squarePrefix = Chars_String_prefix colon ":"
			squareVariable = double_squere_br_open "["  Chars_String_square  double_squere_br_close "]"
			Chars_String_square = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "." / " "/ "/" / "-" / "(" / ")" / [0-9])*)
			
			VAR = Var:(((questionquestion "??") / (question "?") ) VARNAME){return {VariableName:makeVar(Var)}}
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			Chars_String_variable = Var:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*) {return afterVar(Var)}
			space = (space_c (" ")*) {return }
			
			VERTICAL = vertical_c "|" {return {Alternative:"|"}}
			PATH_SYMBOL = ((dot ".") / (div "/")) {return {PathSymbol :"/"}} 
			PEPS = (PathEltOrInverse:PathEltOrInverse PATH_SYMBOL)  {return pathOrReference(PathEltOrInverse)}

			PathEltOrInverse_c = "" {getAssociations(location(), 90, 4);}
			plusplus = "" {addContinuation(location(), "++", 50, 4);}
			equalequal = "" {addContinuation(location(), "==", 50, 4);}
			check_c = "" {addContinuation(location(), "", 50, 4);}
			inv_c = "" {addContinuation(location(), "", 50, 4);}
			br_open = "" {addContinuation(location(), "(", 50, 4);}
			br_close = "" {addContinuation(location(), ")", 50, 4);}
			exclamation = "" {addContinuation(location(), "!", 50, 4);}
			a_c = "" {addContinuation(location(), "a", 50, 4);}
			question = "" {addContinuation(location(), "?", 50, 4);}
			mult = "" {addContinuation(location(), "*", 50, 4);}
			plus = "" {addContinuation(location(), "+", 50, 4);}
			dot = "" {addContinuation(location(), ".", 50, 4);}
			div = "" {addContinuation(location(), "/", 50, 4);}
			vertical_c = "" {addContinuation(location(), "|", 50, 4);}
			questionquestion = "" {addContinuation(location(), "??", 50, 4);}
			less = "" {addContinuation(location(), "<", 50, 4);}
			more = "" {addContinuation(location(), ">", 50, 4);}
			colon = "" {addContinuation(location(), ":", 50, 4);}
			space_c = "" {addContinuation(location(), " ", 10, 4);}
			double_squere_br_open = "" {addContinuation(location(), "[", 50, 4);}
			double_squere_br_close = "" {addContinuation(location(), "]", 50, 4);}
			
			end = "" {error(returnContinuation()); return;}
