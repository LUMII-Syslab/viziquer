

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
			
			function addContinuation(place, continuation, priority, type, start_end){
				var position = "start";
				if(start_end != null)position = start_end;
				makeArray(place[position]["offset"]);
				continuations[place[position]["offset"]][continuation]={name:continuation, priority:priority, type:type};
			}
			function returnContinuation(){
				return JSON.stringify(continuations,null,2);
			}

			function makeVar(o) {return makeString(o);};
			
			
			function pathOrReference(o) {
				var pathPrimary = o.PathEltOrInverse.PathElt.PathPrimary;
				var propertyName = "";
				if(typeof pathPrimary.var !== 'undefined') propertyName = pathPrimary.var.name;
				if(typeof pathPrimary.PrefixedName !== 'undefined') propertyName = pathPrimary.PrefixedName.Prefix + pathPrimary.PrefixedName.var.name;
				var targetSourceClass = "targetClass";
				if(o.PathEltOrInverse.inv == "^")targetSourceClass = "sourceClass";
				
				for (var k in options.schema.findAssociationByName(propertyName).schemaRole) {
					var targetClass = options.schema.findAssociationByName(propertyName).schemaRole[k][""+targetSourceClass+""]["localName"];
					
					var prop = options.schema.findClassByName(targetClass).getAllAssociations();
					
					for(var key in prop){
						var propName= prop[key]["short_name"];
						if(prop[key]["type"] == "<=") {
							addContinuation(location(), "^" + propName, 100, 2, "end")
							addContinuation(location(), "INV(" + propName + ")", 100, 2, "end")
						}
						else addContinuation(location(), propName, 100, 2, "end");
					}
				}

				return o;
			};
			
			function getAssociations(place, priority){

				var myschema = new VQ_Schema();
				
				//all
				var getAllSchemaAssociations = myschema.getAllSchemaAssociations();
				for (var role in getAllSchemaAssociations) {
					var prop = getAllSchemaAssociations[role];
					//var assoc_name = getAllSchemaAssociations[role]["name"];
					var propName= prop["short_name"];
					addContinuation(place, propName, 1, 3);
				}
				
				var start_class = myschema.findClassByName(options.link.getStartElement().getName());
				var end_class = myschema.findClassByName(options.link.getEndElement().getName());
				if (start_class) {
					var all_assoc_from_start = start_class.getAllAssociations();
					var all_sub_super_of_end = _.union(end_class.allSuperSubClasses,end_class);
						
					//start
					for (var role in all_assoc_from_start) {
						var assoc_name= all_assoc_from_start[role]["short_name"];
						
						// var assoc_name = all_assoc_from_start[role]["name"];
						if (all_assoc_from_start[role]["type"] == "<=") {
							assoc_name = "inv("+assoc_name+")";
						};
						addContinuation(place, assoc_name, 99, 2);
					}
					//start - end
					if (end_class){
						var possible_assoc_list = _.filter(all_assoc_from_start, function(a) {
							return _.find(all_sub_super_of_end, function(c) {
									return c.localName == a.class
							})
						});
						
						for (var role in possible_assoc_list) {
							var assoc_name = possible_assoc_list[role]["short_name"];
							if (possible_assoc_list[role]["type"] == "<=") {
								assoc_name = "inv("+assoc_name+")";
							};
							addContinuation(place, assoc_name, 100, 2);
						}
					}		
				};	
			}
			
			// string -> idObject
			// returns type of the identifier from symbol table. Null if does not exist.
			function resolveTypeFromSymbolTable(id) {

				var context = options.context._id;
				
				if(typeof options.symbol_table[context] === 'undefined') return null;
				
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
			};
			// string -> idObject
			// returns kind of the identifier from symbol table. Null if does not exist.
			function resolveKindFromSymbolTable(id) { 

				var context = options.context._id;
				
				if(typeof options.symbol_table[context] === 'undefined') return null;
				
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
			};
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
			function resolveTypeFromSchemaForClass(id) {return options.schema.resolveClassByName(id) };
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
			function resolveTypeFromSchemaForAttributeAndLink(id) {var aorl = options.schema.resolveAttributeByName(null,id); if (!aorl) { aorl = options.schema.resolveLinkByName(id)}; return aorl};
			// string -> idObject
			// returns type of the identifier from schema. Looks everywhere. First in the symbol table,
			// then in schema. Null if does not exist
			function resolveType(id) {var t=resolveTypeFromSymbolTable(id); if (!t) {t=resolveTypeFromSchemaForClass(id); if (!t) {t=resolveTypeFromSchemaForAttributeAndLink(id)}} return t;};
			//string -> string
			// resolves kind of id. CLASS_ALIAS, PROPERTY_ALIAS, CLASS_NAME, CLASS_ALIAS, null
			function resolveKind(id) {
				    var k=resolveKindFromSymbolTable(id);
						if (!k) {
							if (resolveTypeFromSchemaForAttributeAndLink(id)) {
							    k="PROPERTY_NAME";
						  } else if (resolveTypeFromSchemaForClass(id)) {
								  k="CLASS_NAME";
							}
					  }
						return k;
			};
		}

			    
			
			Path = (space (PathAlternative / VAR / (plusplus "++") / ( equalequal "==")) space)? end {return {PathProperty:PathProperty}}
			PathAlternative = PathAlternative:(PathSequence (space VERTICAL space PathSequence)*) {return {PathAlternative:PathAlternative}}
			

			PathSequence = PathSequenceA / PathSequenceB
			PathSequenceA = PathSequence:(PEPS)+ PathEltOrInverse {return {PathSequence:PathSequence}}
			PathSequenceB = PathEltOrInverse_c PathEltOrInverse
		
			//PathSequence = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)* ){return {PathSequence:PathSequence}}
			PathEltOrInverse = PathEltOrInverse:(PathElt3 / PathElt1 / PathElt2) {return {PathEltOrInverse:PathEltOrInverse}}
			PathElt1 = PathElt:PathElt {return {inv:"", PathElt:PathElt}}
			PathElt2 = check "^" PathElt:PathElt {return {inv:"^", PathElt:PathElt}}
			PathElt3 = inv_c "inv"i br_open "(" (PathElt:PathElt) br_close ")" {return {inv:"^", PathElt:PathElt}}
			PathElt = PathPrimary:PathPrimary PathMod:PathMod? {return {PathPrimary:PathPrimary, PathMod:PathMod}}
			PathPrimary =  (exclamation "!" PathNegatedPropertySet)/ iri / (br_open BRACKET:"(" space Path space br_close ")") / LName/ (a_c "a" )
			PathNegatedPropertySet = PathNegatedPropertySet:(PathNegatedPropertySet2 / PathNegatedPropertySet1){return {PathNegatedPropertySet:PathNegatedPropertySet}}
			PathNegatedPropertySet1 = PathOneInPropertySet:PathOneInPropertySet {return {PathOneInPropertySet:PathOneInPropertySet}}
			PathNegatedPropertySet2 = PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted {return {PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted}}
			PathNegatedPropertySetBracketted = (br_open"(" (space PathOneInPropertySet (space VERTICAL space PathOneInPropertySet)*)? space br_close")")
			PathOneInPropertySet = PathOneInPropertySet3 / PathOneInPropertySet1 / PathOneInPropertySet2
			PathOneInPropertySet1 = iriOra:(iri  / LName/ (a_c 'a')) {return {inv:"", iriOra:iriOra}}
			PathOneInPropertySet2 = check "^" iriOra:(iri  / LName/ (a_c 'a')) {return {inv:"^", iriOra:iriOra}}
			PathOneInPropertySet3 = inv_c "inv"i br_open"(" iriOra:(iri / LName/ (a_c 'a') ) br_close ")" {return {inv:"^", iriOra:iriOra}}
			PathMod = ((question "?") / (mult "*") / (plus "+"))
			
			iri = IRIREF / PrefixedName
			PrefixedName = PrefixedName:(PNAME_LN / PNAME_NS) {return {PrefixedName:PrefixedName}}
			IRIREF  = IRIREF:( less "<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])* more ">") {return {IRIREF:makeVar(IRIREF)}}
			PNAME_NS = Prefix:(PN_PREFIX?  colon ':') {return makeVar(Prefix)}
			PNAME_LN = (PNAME_NS:PNAME_NS  LName:Chars_String_prefix) {return {var:{name:makeVar(LName),type:resolveType(makeVar(PNAME_NS)+makeVar(LName)), kind:resolveKind(makeVar(PNAME_NS)+makeVar(LName))}, Prefix:PNAME_NS}}
			LName = (LName:(Chars_String_prefix)) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			PN_PREFIX = Chars_String_prefix
			
			VAR = Var:(((questionquestion "??") / (question "?") ) VARNAME){return {VariableName:makeVar(Var)}}
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			space = (space_c (" ")*) {return }
			
			VERTICAL = vertical_c "|" {return {Alternative:"|"}}
			PATH_SYMBOL = ((dot ".") / (div "/")) {return {PathSymbol :"/"}} 
			PEPS = (PathEltOrInverse:PathEltOrInverse PATH_SYMBOL)  {return pathOrReference(PathEltOrInverse)}

			PathEltOrInverse_c = "" {getAssociations(location(), 90, 4);}
			plusplus = "" {addContinuation(location(), "++", 50, 4);}
			equalequal = "" {addContinuation(location(), "==", 50, 4);}
			check = "" {addContinuation(location(), "^", 50, 4);}
			inv_c = "" {addContinuation(location(), "inv", 50, 4);}
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
			
			end = "" {error(returnContinuation()); return;}
