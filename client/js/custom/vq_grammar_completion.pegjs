

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
      options = arguments[1];
	  //console.log(options)
			//////////////////////////////////////////////
			var continuations = {};
			
			function makeArray(value){
				if (continuations[value]==null) {
					continuations[value] = {};
				}
				return continuations;
			}
			
			function getClasses(place, priority){
				var cls = options.schema.getAllClasses();
				for(var key in cls){
					addContinuation(place, cls[key]["name"], priority, false, 3);
				}
			}
			function getReferences(place, priority){
				for(var key in options["symbol_table"]){
					for(var k in options["symbol_table"][key]){
						if(options["symbol_table"][key][k]["kind"] == "CLASS_ALIAS") addContinuation(place, key, priority, false, 3);
					}
				};
			}
			function getProperties(place, priority){
				var prop = options.schema.findClassByName(options.className).getAllAttributes()
				for(var key in prop){
					var propName= prop[key]["short_name"];
					addContinuation(place, propName, 100, false, 1);
				}
				getAssociations(place, 95);
				//getClasses(place, 94);
				getPropertyAlias(place, 93);
			}
			function getPropertyAlias(place, priority){

				var selected_elem_id = Session.get("activeElement");
				for (var  key in options["symbol_table"]) {	
					for (var symbol in options["symbol_table"][key]) {
						if(options["symbol_table"][key][symbol]["context"] != selected_elem_id){
							if(options["symbol_table"][key][symbol]["upBySubQuery"] == 1 && (typeof options["symbol_table"][key][symbol]["distanceFromClass"] === "undefined" || options["symbol_table"][key][symbol]["distanceFromClass"] <= 1 ))addContinuation(place, key, priority, false, 3);;
						}
					}	
				}
			}
			
			function getAssociations(place, priority){
				var prop = options.schema.findClassByName(options.className).getAllAssociations()

				for(var key in prop){
					var propName= prop[key]["short_name"];
					if(prop[key]["type"] == "<=") {
						addContinuation(place, "^" + propName, priority, false, 2)
						// addContinuation(place, "INV(" + propName + ")", priority, false, 2)
					}
					else addContinuation(place, propName, priority, false, 2);
				}
			}
			
			function getAttrSub(place, priority){
				if(options.type == "attribute"){
					addContinuation(place, "(*attr)", priority, false, 3);
					addContinuation(place, "(*sub)", priority, false, 3);
				}
			}
			
			function addContinuation(place, continuation, priority, spaceBefore, type, start_end){
				var position = "start";
				if(start_end != null)position = start_end;
				makeArray(place[position]["offset"]);
				if(typeof continuations[place[position]["offset"]][continuation] === "undefined" || continuations[place[position]["offset"]][continuation]["priority"] > priority) 
				{
					continuations[place[position]["offset"]][continuation]={name:continuation, priority:priority, type:type, spaceBefore:spaceBefore};
				}
			}
			
			function returnContinuation(){
				return JSON.stringify(continuations,null,2);
			}

			function makeVar(o) {return makeString(o);};

			// string -> idObject
			// returns type of the identifier from symbol table. Null if does not exist.
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
							if (resolveTypeFromSchemaForClass(id)) {
							    k="CLASS_NAME";
						  } else if (resolveTypeFromSchemaForAttributeAndLink(id)) {
								  k="PROPERTY_NAME";
							}
					  }
				return k;
		    };
			function pathOrReference(o) {	
				
				
				
				var pathPrimary = o.PathEltOrInverse.PathElt.PathPrimary;
				var propertyName = "";
				if(typeof pathPrimary.var !== 'undefined') propertyName = pathPrimary.var.name;
				if(typeof pathPrimary.PrefixedName !== 'undefined') propertyName = pathPrimary.PrefixedName.Prefix + pathPrimary.PrefixedName.var.name;
				
				var targetSourceClass = "targetClass";
				if(o.PathEltOrInverse.inv == "^")targetSourceClass = "sourceClass";
				
				if(typeof options.schema.findAssociationByName(propertyName) !== 'undefined'){
						var schemaAssociationClassPairs = options.schema.findAssociationByName(propertyName)["Info"]["ClassPairs"];
						for(var classPair in schemaAssociationClassPairs){
								
							var targetClass = schemaAssociationClassPairs[classPair]["TargetClass"];
							var prop = options.schema.findClassByName(targetClass).getAllAttributes();
								
							for(var key in prop){
								addContinuation(location(), prop[key]["name"], 100, false, 1, "end");
							}
								
							prop = options.schema.findClassByName(targetClass).getAllAssociations();
								
							for(var key in prop){
								var propName= prop[key]["short_name"];
								if(prop[key]["type"] == "<=") {
									addContinuation(location(), "^" + propName, 100, false, 2, "end")
									// addContinuation(location(), "INV(" + propName + ")", 100, false, 2, "end")
								}
								else addContinuation(location(), propName, 100, false, 2, "end");
							}
						}
    				}
				return o;
			};
			
			function ifObjectDataProperty(o){
				
				var varibleName;
				
				if(typeof o.var !== "undefined") varibleName = makeVar(o.Prefix) + makeVar(o.var.name);
				else  varibleName = makeVar(o);
				if(options.schema.resolveLinkByName(varibleName) != null) addContinuation(location(), ".", 99, false, 4, "end");
				if(resolveTypeFromSchemaForAttributeAndLink(varibleName) == null) addContinuation(location(), ":", 30, false, 4, "end");
				
				//console.log(o, varibleName, resolveTypeFromSchemaForAttributeAndLink(varibleName));
				
				return o;
			}
			
			function referenceNames(o) {
				var classAliasTable = [];
				for(var key in options["symbol_table"]){
					for(var k in options["symbol_table"][key]){
						if(options["symbol_table"][key][k]["kind"] == "CLASS_ALIAS") classAliasTable[key] = options["symbol_table"][key][k]["type"]["localName"]
					}
				};
				
				if(typeof classAliasTable[o] !== 'undefined')continuations[location()["end"]["offset"]] = {};
			
				var prop = options.schema.findClassByName(classAliasTable[o]).getAllAttributes();
				for(var key in prop){
					addContinuation(location(), prop[key]["name"], 100, false, 1, "end");
				}
					
				prop = options.schema.findClassByName(classAliasTable[o]).getAllAssociations();
				for(var key in prop){
					addContinuation(location(), prop[key]["short_name"], 99, false, 2, "end");
				}

				return o;
			};
			function transformExpressionIntegerScopeToList(start, end){
				var s = parseInt(start["Number"]);
				var e = parseInt(end["Number"]);
				var expressionList = [];
				for (var i = s; i <= e; i++) {
					expressionList.push({"NumericLiteral": {"Number": i}});
					if(i!=e) expressionList.push({"Comma": ","});
				} 
				return expressionList;
			}
		}

			Main = (space  ((("(*attr)" / "(*sub)")) / Expression) space)? end
			Expression = (unit"[ ]") / (union "[ + ]") / (no_class "(no_class)")  / ValueScope / ConditionalOrExpressionA / classExpr
			ValueScope = (curv_br_open "{" (ValueScopeA / (NumericLiteral (Comma space NumericLiteral)*)) curv_br_close "}")
			ValueScopeA = (INTEGER two_dots ".." INTEGER)

			classExpr = ((dot ".") / ("(.)") / (select_this"(select this)" / this_c "(this)"))

			ConditionalOrExpressionA = (ConditionalOrExpression)

			ConditionalOrExpression = (ConditionalAndExpression  ( space OROriginal spaceObl ConditionalAndExpression )*)

			OROriginal = or ("||" / "OR"i)

			ConditionalAndExpression = (ValueLogicalA)

			ValueLogicalA = (ValueLogical (space ANDOriginal spaceObl ValueLogical )*)

			ANDOriginal = and ("&&" / "AND"i) 

			ValueLogical = (RelationalExpression)

			RelationalExpression = RelationalExpressionC / RelationalExpressionC1 / RelationalExpressionB1/ RelationalExpressionB2/ RelationalExpressionB / RelationalExpressionA

			RelationalExpressionA = (NumericExpression) 

			RelationalExpressionB = (NumericExpression (space Relation space NumericExpression)) 
			
			RelationalExpressionB1 = (classExpr (space Relation space NumericExpression)) 
			RelationalExpressionB2 = (NumericExpression (space Relation space classExpr)) 

			RelationalExpressionC = (NumericExpression (space (IN / NOTIN) space ExpressionList2)) 
			RelationalExpressionC1 = (NumericExpression (space (IN / NOTIN) space (ExpressionList3/ ExpressionList4))) 

			IN = in_c "IN"i
			
			NOT = not_c "NOT"i 
			
			NOTIN = notIn_c ("NOT"i space "IN"i) 

			NumericExpression =  AdditiveExpression 

			AdditiveExpression = (MultiplicativeExpression MultiplicativeExpressionListA) 

			MultiplicativeExpressionListA = (MultiplicativeExpressionList)*

			MultiplicativeExpressionList = (Concat / Additive / NumericLiteralPositive / NumericLiteralNegative)

			Concat = (space concat_c Concat: "++"  space MultiplicativeExpression) 

			Additive = (space ((plus "+") / (minus "-")) space MultiplicativeExpression) 

			MultiplicativeExpression = (UnaryExpression (space UnaryExpressionListA))

			UnaryExpression = UnaryExpressionA / UnaryExpressionB

			UnaryExpressionA = (space ((exclamation "!") / (minus "-") ) space PrimaryExpression) 

			UnaryExpressionB = (space PrimaryExpression) 

			UnaryExpressionListA = (UnaryExpressionList*)

			UnaryExpressionList = space ((mult "*") / (div "/")) space UnaryExpression 

			PrimaryExpression = BooleanLiteral / BuiltInCall /  RDFLiteral / BrackettedExpression / iriOrFunction / NumericLiteral / Var / QName / LN
			PrimaryExpression2 = BooleanLiteral / BuiltInCall2 /  RDFLiteral / BrackettedExpression / iriOrFunction / NumericLiteral / Var / QName / LN

			BooleanLiteral = (TRUE / FALSE) 
			
			TRUE = true_c "true"i 
			FALSE = false_c "false"i 

			RDFLiteral = (RDFLiteralA/RDFLiteralB/RDFLiteralC)

			RDFLiteralA = StringQuotes LANGTAG 

			RDFLiteralB = StringQuotes double_check "^^" iri 

			BrackettedExpression = (br_open "(" space  Expression space br_close")") 

			BuiltInCall = Aggregate / FunctionExpression / HASMAX / HASRANK / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc
			BuiltInCall2 = Aggregate  / HASMAX / HASRANK / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc

			Aggregate = (AggregateAO / AggregateA / AggregateB / AggregateC / AggregateD / AggregateE / AggregateF) 

			AggregateAO =  COUNT_DISTINCT br_open"(" space Expression: Expression space br_close ")" 
			AggregateA =  (COUNT / SUM / MIN / MAX / AVG / SAMPLE) br_open"(" DISTINCT spaceObl Expression space br_close")" 

			AggregateB = (COUNT / SUM / MIN / MAX / AVG / SAMPLE) br_open"(" space Expression space br_close")" 

			AggregateC = (GROUP_CONCAT) br_open"(" DISTINCT spaceObl Expression space SEPARATOR br_close")" 

			AggregateD = (GROUP_CONCAT) br_open"(" space Expression space SEPARATOR:SEPARATOR br_close")" 

			AggregateE = Aggregate: (GROUP_CONCAT) br_open"(" DISTINCT spaceObl  Expression space br_close")" 

			AggregateF = Aggregate: (GROUP_CONCAT) br_open"(" space  Expression space br_close")" 

			COUNT_DISTINCT = count_distinct_c "COUNT_DISTINCT"i
			DISTINCT = distinct_c "DISTINCT"i 
			COUNT = count_c"COUNT"i
			SUM = sum_c "SUM"i 
			MIN = min_c "MIN"i 
			MAX = max_c "MAX"i 
			AVG = avg_c "AVG"i 
			SAMPLE = sample_c "SAMPLE"i 
			GROUP_CONCAT = group_concat_c "GROUP_CONCAT"i 
			SEPARATORTer = separator_c "SEPARATOR"i 
			
			SEPARATOR = (semi_colon ";" space SEPARATORTer space equal "=" StringQuotes ) / (comma_c comma:"," space StringQuotes) 
			
			FunctionExpression = (FunctionExpressionC / FunctionExpressionA / FunctionExpressionB / IFFunction / FunctionExpressionD / FunctionExpressionLANGMATCHES / FunctionCOALESCE / BOUNDFunction / NilFunction / BNODEFunction)

			STR = str_c "STR"i 
			LANG = lang_c "LANG"i 
			DATATYPE = datatype_c "DATATYPE"i 
			IRI = iri_c "IRI"i 
			URI = uri_c"URI"i 
			ABS = abs_c "ABS"i 
			CEIL = ceil_c "CEIL"i 
			FLOOR = floor_c "FLOOR"i 
			ROUND = round_c "ROUND"i 
			STRLEN = strlen_c "STRLEN"i 
			UCASE = ucase_c "UCASE"i 
			LCASE = lcase_c "LCASE"i 
			ENCODE_FOR_URI = encode_for_uri_c "ENCODE_FOR_URI"i 
			YEAR = year_c "YEAR"i 
			MONTH = month_c "MONTH"i 
			DAY = day_c "DAY"i 
			TIMEZONE = time_zone_c "TIMEZONE"i 
			TZ = tz_c "TZ"i 
			MD5 = md5_c "MD5"i 
			SHA1 = sha1_c "SHA1"i 
			SHA256 = SHA256_c "SHA256"i
			SHA384 = SHA384_c "SHA384"i			
			SHA512 = SHA512_c "SHA512"i 
			isIRI = isIRI_c "isIRI"i 
			isURI = isURI_c "isURI"i 
			isBLANK = isBLANK_c "isBLANK"i 
			dateTime = dateTime_c "dateTime"i 
			date = date_c "date"i 
			isLITERAL = isLITERAL_c "isLITERAL"i 
			isNUMERIC = isNUMERIC_c "isNUMERIC"i 
			LANGMATCHES = LANGMATCHES_c "LANGMATCHES"i 
			CONTAINS = CONTAINS_c "CONTAINS"i 
			STRSTARTS = STRSTARTS_c "STRSTARTS"i 
			STRENDS = STRENDS_c "STRENDS"i 
			STRBEFORE = STRBEFORE_c"STRBEFORE"i 
			STRAFTER = STRAFTER_c "STRAFTER"i 
			STRLANG = STRLANG_c "STRLANG"i 
			STRDT = STRDT_c "STRDT"i 
			sameTerm = sameTerm_c "sameTerm"i 
			days = days_c "days"i 
			years = years_c "years"i 
			months = months_c "months"i 
			HOURS2 = hours_c "hours"i 
			hours = hours_c "hours"i 
			minutes = minutes_c "minutes"i 
			MINUTES2 = minutes_c "minutes"i 
			seconds = seconds_c "seconds"i 
			SECONDS2 = seconds_c "seconds"i 
			IF = if_c "IF"i 
			COALESCE = COALESCE_c "COALESCE"i
			BOUND = BOUND_c "BOUND"i
			BNODE = BNODE_c "BNODE"i
			RAND = RAND_c"RAND"i 
			CONCAT = CONCAT_c "CONCAT"i 
			NOW = NOW_c "NOW"i 
			UUID = UUID_c "UUID"i 
			STRUUID = STRUUID_c"STRUUID"i 

			FunctionExpressionA = (STR / LANG / DATATYPE / IRI / URI / ABS / CEIL / FLOOR / ROUND / STRLEN / UCASE /
					 LCASE / ENCODE_FOR_URI / YEAR / MONTH  / DAY/ HOURS2 / MINUTES2 / SECONDS2 / TIMEZONE / TZ / MD5 / SHA1 / SHA256 / SHA384 / SHA512 / isIRI /
					isURI / isBLANK / dateTime / date / isLITERAL / isNUMERIC) br_open "(" space  Expression space br_close ")" 

			FunctionExpressionB = (LANGMATCHES / CONTAINS / STRSTARTS / STRENDS / STRBEFORE / STRAFTER / STRLANG / STRDT / sameTerm) br_open"(" space Expression space comma_c "," space Expression space br_close")"

			FunctionExpressionC =  (days / years / months / hours / minutes / seconds ) br_open "(" space  PrimaryExpression space minus "-" space  PrimaryExpression space br_close")" 
			
			FunctionExpressionD = (COALESCE / CONCAT) ExpressionList2 
			
			FunctionCOALESCE = PrimaryExpression2 space dubble_question "??" space PrimaryExpression2 
			
			FunctionExpressionLANGMATCHES = FunctionExpressionLANGMATCHESA / FunctionExpressionLANGMATCHESB
			FunctionExpressionLANGMATCHESA = (QName / LN) LANGTAG_MUL 
			FunctionExpressionLANGMATCHESB = (QName / LN) LANGTAG 
			
			
			BOUNDFunction =  BOUND br_open "(" space PrimaryExpression space br_open ")"
			NilFunction = (RAND / NOW / UUID / STRUUID) NIL 
			BNODEFunction = BNODEFunctionA / BNODEFunctionB
			BNODEFunctionA = BNODE br_open "(" space  Expression space br_open ")" 
			BNODEFunctionB =  BNODE NIL 
			
			IFFunction =  IF br_open "(" space Expression space comma_c "," space Expression space comma_c "," space Expression space br_close")"
			
			HASMAX = ('HASMAX' '(' space  SpecialExpression space ')') 
			HASRANK = ('HASRANK' '(' space  SpecialExpression space ')') 

			SpecialExpression = (PrimaryExpression space "DESC"? (space "|" space ("GLOBAL" / ("FOR" / "BY")? space Expression) (space "|" space "WHERE" space Expression)?)?)

			RegexExpression = (RegexExpressionA / RegexExpressionB) 

			RegexExpressionA = (REGEX br_open"(" space Expression space  Comma space Expression ( Comma space Expression ) space br_close")")

			RegexExpressionB = (REGEX br_open"(" space Expression space  Comma space Expression space br_close")")

			REGEX = REGEX_c "REGEX"i 
			SUBSTRING = SUBSTRING_c "SUBSTRING"i 
			SUBSTR = SUBSTR_c "SUBSTR"i 
			bifSUBSTRING = bif_SUBSTRING_c "bif:SUBSTRING"i 
			bifSUBSTR = bif_SUBSTR_c "bif:SUBSTR"i 
			REPLACE = REPLACE_c "REPLACE"i 
			EXISTS = EXISTS_c "EXISTS"i 
			
			SubstringExpression = (SubstringExpressionA/SubstringExpressionB) 

			SubstringExpressionA = ((SUBSTRING / SUBSTR ) br_open"(" space Expression space comma_c "," space Expression  comma_c "," space Expression  space br_close")") 

			SubstringExpressionB = ((SUBSTRING / SUBSTR ) br_open"(" space Expression space  comma_c"," space Expression space br_close")") 

			SubstringBifExpression = (SubstringBifExpressionA/SubstringBifExpressionB) 

			SubstringBifExpressionA = ((bifSUBSTRING / bifSUBSTR ) br_open"(" space Expression space  comma_c"," space Expression comma_c "," space Expression space br_close")") 

			SubstringBifExpressionB = ((bifSUBSTRING / bifSUBSTR ) br_open"(" space Expression space comma_c "," space Expression space br_close")") 

			StrReplaceExpression = (StrReplaceExpressionA/StrReplaceExpressionB) 

			StrReplaceExpressionA = (REPLACE br_open"(" space Expression space  comma_c"," space Expression comma_c "," space Expression space br_close")") 

			StrReplaceExpressionB = (REPLACE br_open"(" space Expression space  comma_c"," space Expression space br_close")")  

			ExistsFunc = (ExistsFuncA1 / ExistsFuncA /ExistsFuncB) 
			ExistsFuncA1 = EXISTS space br_open "(" space GroupGraphPattern br_close")" 
			ExistsFuncA = EXISTS  spaceObl GroupGraphPattern 

			ExistsFuncB = curv_br_open "{" space GroupGraphPattern space curv_br_close "}"
			GroupGraphPattern = (Expression)

			NotExistsFunc = (NotExistsFuncA / NotExistsFuncB1 /NotExistsFuncB / NotExistsFuncC1/ NotExistsFuncC) 

			NotExistsFuncA = NOT space  curv_br_open "{" space GroupGraphPattern space curv_br_close "}" 

			NotExistsFuncB = NOT spaceObl EXISTS  spaceObl GroupGraphPattern 
			NotExistsFuncB1 = NOT  spaceObl  EXISTS space br_open"(" space GroupGraphPattern br_close")" 

			NotExistsFuncC = NOT  spaceObl GroupGraphPattern 
			NotExistsFuncC1 = NOT  space br_open"(" space GroupGraphPattern br_close")" 

			ExpressionList2 = (NIL / br_open "(" space Expression space  ( Comma space Expression )* space br_close ")" )
			ExpressionList3 = (curv_br_open "{" space Expression space  ( Comma space Expression )* space curv_br_close "}" )
			ExpressionList4 = (curv_br_open "{" space INTEGER space two_dots ".." space INTEGER space curv_br_close"}" ) 
			
			Comma = comma_c "," 

			LANGTAG =  at "@" string
			LANGTAG_MUL = at "@" br_open "(" (string2 (LANGTAG_LIST)*) br_close ")"
			LANGTAG_LIST = (Comma space string2)

			RDFLiteralC = StringQuotes 

			iri = ( IRIREF /  PrefixedName)

			IRIREF = (less "<" string_c ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / "%" / [0-9])* more ">") 

			PrefixedName = (PNAME_LN) 

			PNAME_NS = (PN_PREFIX? colon ":") 

			PNAME_LN = LName:PNAME_LN2 {return ifObjectDataProperty(LName)} 
			PNAME_LN2 = ((PropertyReference? PNAME_NS  (Chars_String_variables / (string_c Chars_String_prefix))) Substring  BetweenExpression?  LikeExpression?) 

			PN_PREFIX = string_c Chars_String_prefix

			PN_LOCAL = variables_c Var:Chars_String 

			PropertyReference = PropertyReference_c "`"

			iriOrFunction = iriOrFunctionA / iriOrFunctionB

			iriOrFunctionA = iri ArgList:ArgList 

			iriOrFunctionB = iri 

			ArgList = ArgListA / ArgListB / NIL

			ArgListA = (br_open"(" space DISTINCT spaceObl  ArgListExpression space br_close")" ) 

			ArgListB = (br_open"(" space  ArgListExpression space br_close")") 
			NIL = br_open"(" space  br_close")" 

			ArgListExpression =  (Expression ( Comma space Expression )*)

			NumericLiteral = (NumericLiteralUnsigned / NumericLiteralPositive / NumericLiteralNegative) 

			NumericLiteralUnsigned = DOUBLE / DECIMAL / INTEGER
			NumericLiteralPositive = DECIMAL_POSITIVE / DOUBLE_POSITIVE / INTEGER_POSITIVE
			NumericLiteralNegative = DECIMAL_NEGATIVE / DOUBLE_NEGATIVE / INTEGER_NEGATIVE
			DECIMAL = ([0-9]* dot "." [0-9]+) 
			DOUBLE = (([0-9]+ dot"." [0-9]* [eE] [+-]? [0-9]+) / ("." ([0-9])+ [eE] [+-]? [0-9]+) / (([0-9])+ [eE] [+-]? [0-9]+)) 
			INTEGER = int_c [0-9]+ 
			INTEGER_POSITIVE = (plus "+" INTEGER) 
			DECIMAL_POSITIVE = (plus "+" DECIMAL)
			DOUBLE_POSITIVE = (minus "-" DOUBLE)
			INTEGER_NEGATIVE = (minus "-" INTEGER)
			DECIMAL_NEGATIVE = (minus "-" DECIMAL)
			DOUBLE_NEGATIVE = (minus "-" DOUBLE)
			Var = Var:(VAR1 /VAR2 / VAR3) 
			VAR1 = dubble_question "??" VARNAME?
			VAR2 = question "?" VARNAME
			VAR3 = dollar "$" VARNAME
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			StringQuotes = STRING_LITERAL1  / STRING_LITERAL2
			STRING_LITERAL1 = quote "'" string_c stringQ quote "'"
			STRING_LITERAL2 = dubble_quote '"' string_c stringQ dubble_quote '"'
	
			QName = Path:(Path / PathBr / QNameReference) 
			
			////////////////////////////////////////////////////////////////
			Path = (space PathProperty:(PathAlternative) Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?)
			PathBr = squere_br_open "[" space PathProperty:(PathAlternativeBr) Substring:Substring space squere_br_close "]" space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression? 
			PathAlternative = PathAlternative:(PathSequence (space VERTICAL space PathSequence)*) {return {PathAlternative:PathAlternative}}
			PathAlternativeBr = PathAlternative:(PathSequenceBr (space VERTICAL space PathSequenceBr)*) {return {PathAlternative:PathAlternative}}
			PathSequence = PathSequence:(PEPS)+ PathEltOrInverse {return {PathSequence:PathSequence}}
			PathSequenceBr = PathSequence:(PEPS)* PathEltOrInverse{return {PathSequence:PathSequence}}
			//PathSequence = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)+ ){return {PathSequence:PathSequence}}
			//PathSequenceBr = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)* ){return {PathSequence:PathSequence}}
			PathEltOrInverse = PathEltOrInverse:(PathElt3 / PathElt1 / PathElt2) {return {PathEltOrInverse:PathEltOrInverse}}
			PathElt1 = PathElt:PathElt {return {inv:"", PathElt:PathElt}}
			PathElt2 = check "^" PathElt:PathElt {return {inv:"^", PathElt:PathElt}}
			PathElt3 = inv_c "inv"i br_open "(" space PathElt:PathElt space br_close ")" {return {inv:"^", PathElt:PathElt}}
			PathElt = PathPrimary:PathPrimary PathMod:PathMod? {return {PathPrimary:PathPrimary, PathMod:PathMod}}
			PathPrimary =  (exclamation "!" PathNegatedPropertySet)/ iriP / (br_open "(" space Path space br_close ")") / LNameP/ (a_c "a") 
			PathNegatedPropertySet = PathNegatedPropertySet:(PathNegatedPropertySet2 / PathNegatedPropertySet1){return {PathNegatedPropertySet:PathNegatedPropertySet}}
			PathNegatedPropertySet1 = PathOneInPropertySet:PathOneInPropertySet {return {PathOneInPropertySet:PathOneInPropertySet}}
			PathNegatedPropertySet2 = PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted {return {PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted}}
			PathNegatedPropertySetBracketted = (br_open "(" (space PathOneInPropertySet (space VERTICAL space PathOneInPropertySet)*)? space br_close ")")
			PathOneInPropertySet = PathOneInPropertySet3 / PathOneInPropertySet1 / PathOneInPropertySet2
			PathOneInPropertySet1 = iriOra:(iriP  / LNameP/ (a_c "a")'a') {return {inv:"", iriOra:iriOra}}
			PathOneInPropertySet2 = check "^" iriOra:(iriP  / LNameP/ (a_c "a")'a') {return {inv:"^", iriOra:iriOra}}
			PathOneInPropertySet3 = inv_c "inv"i br_open "(" iriOra:(iriP / LNameP/ (a_c "a")'a' ) br_close ")" {return {inv:"^", iriOra:iriOra}}
			
			iriP = IRIREF / PrefixedNameP
			PrefixedNameP = PrefixedName:(PNAME_LNP / PNAME_NSP) {return {PrefixedName:PrefixedName}}
			PNAME_NSP = Prefix:(PN_PREFIX? colon_c ':') {return makeVar(Prefix)}
			PNAME_LNP = LName:PNAME_LNP2 {return ifObjectDataProperty(LName)}
			PNAME_LNP2 = (PNAME_NS:PNAME_NSP  LName:( Chars_String_prefix)) {return {var:{name:makeVar(LName),type:resolveType(makeVar(PNAME_NS)+makeVar(LName)), kind:resolveKind(makeVar(PNAME_NS)+makeVar(LName))}, Prefix:PNAME_NS}}
			LNameP = (LName:(( Chars_String_prefix_LName))) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			
			VERTICAL = vertical_c "|" {return {Alternative:"|"}}
			PATH_SYMBOL = ((dot_path ".") / (div_path "/")) {return {PathSymbol :"/"}} 
			
			PEPS = (PathEltOrInverse:PathEltOrInverse PATH_SYMBOL)  {return pathOrReference(PathEltOrInverse)}

			QNameReference = QNameA:(QNameC  / QNameA)
			QNameA = ReferenceDot PrimaryExpression:(Chars_String_variables / (Chars_String_prefix_LName)) Substring:Substring  space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?
			QNameC = squere_br_open "[" space ReferenceDot PrimaryExpression:(Chars_String_variables / (Chars_String_prefix))  Substring:Substring space squere_br_close "]" space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?
			ReferenceDot =  Reference: Reference dot_path "." {return referenceNames(Reference)}
			Reference= references_c Chars_String:Chars_String {return makeVar(Chars_String)} 
			
			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			Chars_String_prefix_LName = LName:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*) {return ifObjectDataProperty(LName)}
			Chars_String_variables = (squere_br_open "[" variables_c Chars_String_prefix squere_br_close "]")
			
																																																			//atributs vai associacija
			LN =((LNameINV / LNameINV2 / LName) )
			
			PathMod = PathMod:((question "?") / (mult "*") / (plus "+"))
			
			LNameSimple = (Chars_String_variables / (variables_c Chars_String_prefix_LName))

			LNameINV = (PropertyReference? INV: inv_c "INV"i br_open "(" LName:LNameSimple  br_close")"  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:INV, name:makeVar(LName), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName))}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LNameINV2 = (PropertyReference? INV: check "^" LName:LNameSimple  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:"INV", name:makeVar(LName), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName))}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			Substring = (squere_br_open "[" (INTEGER (comma_c "," space INTEGER)?) squere_br_close "]")?
			LName = (PropertyReference? LName:(Chars_String_variables / (variables_c Chars_String_prefix_LName)) PathMod:PathMod?  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) 
			
			
			Relation = relations ("=" / "!=" / "<>" / "<=" / ">=" /"<" / ">")
			space = ((" ")*) 
			spaceObl = space_c (" ")+
			string =  string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$/])+)
			stringQ = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$()/])+) {return {string: string.join("")}}
			string2 = space_c (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ])+)
			

			LikeExpression = (space like_c 'LIKE'i space (likeString1 / likeString2)) 
			likeString1 = (dubble_quote '"' percent "%"? ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+  percent"%"? dubble_quote '"') 
			likeString2 = (quote "'" percent "%"? ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+  percent"%"? quote "'") 

			BetweenExpression = (space between_c 'BETWEEN'i space br_open'(' space NumericExpression space Comma space NumericExpression br_close')') 

			
			unit = "" {addContinuation(location(), "[ ]", 10, false, 4);}
			
			union = "" {addContinuation(location(), "[ + ]", 10, false, 4);}
			no_class = "" {addContinuation(location(), " ", 1, false, 4);}
			curv_br_open = "" {addContinuation(location(), "{", 10, false, 4);/*}*/}
            curv_br_close = "" {addContinuation(location(), /*{*/"}", 10, false, 4);}
			two_dots = "" {addContinuation(location(), "..", 10, false, 4);}
			dot = "" {addContinuation(location(), ".", 32, false, 4);}
			dot_path = "" {addContinuation(location(), "", 32, false, 4);}
			dot_in_br = "" {addContinuation(location(), "", 1, false, 4);}
			select_this = "" {if(options.type=="attribute") addContinuation(location(), "(select this)", 10, false, 4); else addContinuation(location(), "", 1, false, 4);}
			this_c = "" {if(options.type!="attribute") addContinuation(location(), "(this)", 85, false, 4); else addContinuation(location(), "", 1, false, 4);}
			or = "" {addContinuation(location(), "||", 10, true, 4); addContinuation(location(), "OR", 10, true, 4);}
			and = "" {addContinuation(location(), "&&", 10, true, 4); addContinuation(location(), "AND", 10, true, 4);}
			in_c = "" {addContinuation(location(), "IN", 30, true, 4);}
			not_c = "" {addContinuation(location(), "NOT", 90, false, 4);}
			notIn_c = "" {addContinuation(location(), "NOT IN", 30, true, 4);}
			concat_c = "" {addContinuation(location(), "++", 25, true, 4);}
			plus = "" {addContinuation(location(), "+", 25, true, 4);}
			minus = "" {addContinuation(location(), "-", 25, true, 4);}
			exclamation = "" {addContinuation(location(), "!", 75, false, 4);}
			a_c = "" {addContinuation(location(), "a", 10, false, 4);}
			mult = "" {addContinuation(location(), "*", 25, true, 4);}
			div = "" {addContinuation(location(), "/", 25, false, 4);}
			div_path = "" {addContinuation(location(), "/", 25, true, 4);}
			true_c = "" {addContinuation(location(), "true", 10, false, 4);}
			false_c = "" {addContinuation(location(), "false", 10, false, 4);}
			double_check = "" {addContinuation(location(), "^^", 10, false, 4);}
			check = "" {addContinuation(location(), "", 10, false, 4);}
			br_open = "" {addContinuation(location(), "(", 90, false, 4);}
			br_close = "" {addContinuation(location(), ")", 10, false, 4);}
			count_distinct_c = "" {if(options.type=="attribute") addContinuation(location(), "COUNT_DISTINCT", 35, false, 4); else addContinuation(location(), "", 1, false, 4);}
			distinct_c = "" {addContinuation(location(), "DISTINCT", 90, false, 4);}
			count_c = "" {if(options.type=="attribute") addContinuation(location(), "COUNT", 35, false, 4); else addContinuation(location(), "", 1, false, 4);}
			sum_c = "" {if(options.type=="attribute")addContinuation(location(), "SUM", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			min_c = "" {if(options.type=="attribute")addContinuation(location(), "MIN", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			max_c = "" {if(options.type=="attribute")addContinuation(location(), "MAX", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			avg_c = "" {if(options.type=="attribute")addContinuation(location(), "AVG", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			sample_c = "" {if(options.type=="attribute")addContinuation(location(), "SAMPLE", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			group_concat_c = "" {if(options.type=="attribute")addContinuation(location(), "GROUP_CONCAT", 35, false, 4);else addContinuation(location(), "", 1, false, 4);}
			separator_c = "" {addContinuation(location(), "SEPARATOR", 10, false, 4);}
			semi_colon = "" {addContinuation(location(), ";", 10, false, 4);}
			equal = "" {addContinuation(location(), "=", 90, false, 4);}
			comma_c = "" {addContinuation(location(), ",", 10, false, 4);}
			str_c = "" {addContinuation(location(), "STR", 65, false, 4);}
			lang_c = "" {addContinuation(location(), "LANG", 55, false, 4);}
			datatype_c = "" {addContinuation(location(), "DATATYPE", 55, false, 4);}
			iri_c = "" {addContinuation(location(), "IRI", 10, false, 4);}
			uri_c = "" {addContinuation(location(), "URI", 10, false, 4);}
			abs_c = "" {addContinuation(location(), "ABS", 10, false, 4);}
			ceil_c = "" {addContinuation(location(), "CEIL", 10, false, 4);}
			floor_c = "" {addContinuation(location(), "FLOOR", 10, false, 4);}
			round_c = "" {addContinuation(location(), "ROUND", 10, false, 4);}
			strlen_c = "" {addContinuation(location(), "STRLEN", 10, false, 4);}
			ucase_c = "" {addContinuation(location(), "UCASE", 10, false, 4);}
			lcase_c = "" {addContinuation(location(), "LCASE", 10, false, 4);}
			encode_for_uri_c = "" {addContinuation(location(), "ENCODE_FOR_URI", 10, false, 4);}
			year_c = "" {addContinuation(location(), "YEAR", 45, false, 4);}
			month_c = "" {addContinuation(location(), "MONTH", 45, false, 4);}
			day_c = "" {addContinuation(location(), "DAY", 45, false, 4);}
			time_zone_c = "" {addContinuation(location(), "TIMEZONE", 10, false, 4);}
			tz_c = "" {addContinuation(location(), "TZ", 10, false, 4);}
			md5_c = "" {addContinuation(location(), "MD5", 10, false, 4);}
			sha1_c = "" {addContinuation(location(), "SHA1", 10, false, 4);}
			SHA256_c = "" {addContinuation(location(), "SHA256", 10, false, 4);}
			SHA384_c = "" {addContinuation(location(), "SHA384", 10, false, 4);}
			SHA512_c = "" {addContinuation(location(), "SHA512", 10, false, 4);}
			isIRI_c = "" {addContinuation(location(), "isIRI", 10, false, 4);}
			isURI_c = "" {addContinuation(location(), "isURI", 10, false, 4);}
			isBLANK_c = "" {addContinuation(location(), "isBLANK", 10, false, 4);}
			dateTime_c = "" {addContinuation(location(), "dateTime", 60, false, 4);}
			date_c = "" {addContinuation(location(), "date", 60, false, 4);}
			isLITERAL_c = "" {addContinuation(location(), "isLITERAL", 10, false, 4);}
			isNUMERIC_c  = "" {addContinuation(location(), "isNUMERIC", 10, false, 4);}
			LANGMATCHES_c = "" {addContinuation(location(), "LANGMATCHES", 55, false, 4);}
			CONTAINS_c = "" {addContinuation(location(), "CONTAINS", 50, false, 4);}
			STRSTARTS_c = "" {addContinuation(location(), "STRSTARTS", 10, false, 4);}
			STRENDS_c = "" {addContinuation(location(), "STRENDS", 10, false, 4);}
			STRBEFORE_c = "" {addContinuation(location(), "STRBEFORE", 10, false, 4);}
			STRAFTER_c = "" {addContinuation(location(), "STRAFTER", 10, false, 4);}
			STRLANG_c = "" {addContinuation(location(), "STRLANG", 10, false, 4);}
			STRDT_c  = "" {addContinuation(location(), "STRDT", 10, false, 4);}
			sameTerm_c = "" {addContinuation(location(), "sameTerm", 10, false, 4);}
			days_c  = "" {addContinuation(location(), "days", 40, false, 4);}
			years_c  = "" {addContinuation(location(), "years", 40, false, 4);}
			months_c = "" {addContinuation(location(), "months", 40, false, 4);}
			hours_c = "" {addContinuation(location(), "hours", 40, false, 4);}
			minutes_c = "" {addContinuation(location(), "minutes", 40, false, 4);}
			seconds_c = "" {addContinuation(location(), "seconds", 40, false, 4);}
			if_c  = "" {addContinuation(location(), "IF", 70, false, 4);}
			COALESCE_c  = "" {addContinuation(location(), "COALESCE", 70, false, 4);}
			BOUND_c  = "" {addContinuation(location(), "BOUND", 80, false, 4);}
			BNODE_c  = "" {addContinuation(location(), "BNODE", 10, false, 4);}
			RAND_c  = "" {addContinuation(location(), "RAND", 10, false, 4);}
			CONCAT_c  = "" {addContinuation(location(), "CONCAT", 55, false, 4);}
			NOW_c  = "" {addContinuation(location(), "NOW", 10, false, 4);}
			UUID_c  = "" {addContinuation(location(), "UUID", 10, false, 4);}
			STRUUID_c  = "" {addContinuation(location(), "STRUUID", 10, false, 4);}
			REGEX_c = "" {addContinuation(location(), "REGEX", 50, false, 4);}
			SUBSTRING_c = "" {addContinuation(location(), "SUBSTRING", 50, false, 4);}
			SUBSTR_c  = "" {addContinuation(location(), "SUBSTR", 50, false, 4);}
			bif_SUBSTRING_c = "" {addContinuation(location(), "bif:SUBSTRING", 50, false, 4);}
			bif_SUBSTR_c = "" {addContinuation(location(), "bif:SUBSTR", 50, false, 4);}
			REPLACE_c  = "" {addContinuation(location(), "REPLACE", 10, false, 4);}
			EXISTS_c = "" {addContinuation(location(), "EXISTS", 90, false, 4);}
			at = "" {addContinuation(location(), "@", 1, false, 4);}
			colon = "" {addContinuation(location(), "", 30, false, 4);}
			question = "" {addContinuation(location(), "?", 1, false, 4);}
			dubble_question = "" {addContinuation(location(), "??", 1, false, 4);}
			dollar = "" {addContinuation(location(), "$", 10, false, 4);}
			quote = "" {addContinuation(location(), "'", 10, false, 4);}
			dubble_quote = "" {addContinuation(location(), '"', 10, false, 4);}
			inv_c = "" {addContinuation(location(), "", 85, false, 4);}
			squere_br_open = "" {addContinuation(location(), "[", 28, false, 4);}
			squere_br_close = "" {addContinuation(location(), "]", 28, false, 4);}
			relations = "" {addContinuation(location(), "=", 10, false, 4); addContinuation(location(), "!=", 10, false, 4);  addContinuation(location(), "<>", 10, false, 4);  addContinuation(location(), "<=", 10, false, 4);  addContinuation(location(), ">=", 10, false, 4);  addContinuation(location(), "<", 10, false, 4); addContinuation(location(), ">", 10, false, 4);}
			like_c = "" {addContinuation(location(), "LIKE", 30, true, 4);}
			more = "" {addContinuation(location(), ">", 10, false, 4);}
			less = "" {addContinuation(location(), "<", 10, false, 4);}
			percent = "" {addContinuation(location(), "%", 10, false, 4);}
			between_c = "" {addContinuation(location(), "BETWEEN", 30, true, 4);}
			int_c = "" {addContinuation(location(), "", 1, false, 4);}
			string_c = "" {addContinuation(location(), "", 1, false, 4);}
			colon_c = "" {addContinuation(location(), "", 30, false, 4);}
			vertical_c = "" {addContinuation(location(), "|", 10, false, 4);}
			space_c = "" {addContinuation(location(), " ", 1, false, 4);}
			PropertyReference_c = "" {addContinuation(location(), "`", 1, false, 4);}
			variables_c = "" {getProperties(location(), 91);}
			references_c = "" {getReferences(location(), 91);}
			associations_c = "" {getAssociations(location(), 91);}
			classes_c = "" {getClasses(location(), 91); getAssociations(location(), 91);}
			attrSub_c = "" {getAttrSub(location(), 92)}
			
			end = "" {error(returnContinuation()); return;}
