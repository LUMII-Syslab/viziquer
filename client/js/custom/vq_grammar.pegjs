

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object, exprType:String}
			// exprType: CLASS_NAME or null if other - at the moment it determines the precedence of resolving - class or property first in case of name clash
      options = arguments[1];
			function makeVar(o) {return makeString(o);};

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
			function resolveTypeFromSchemaForAttributeAndLink(id) {
				var aorl = options.schema.resolveAttributeByNameAndClass(options.context["localName"], id);
				var res = aorl[0];
				if (!res) { 
					res = options.schema.resolveLinkByName(id); 
					if (res) res["property_type"] = "OBJECT_PROPERTY"
				}
				else {
						res["parentType"] = aorl[1];
						res["property_type"] = "DATA_PROPERTY";
				};
				return res
			};
			// string -> idObject
			// returns type of the identifier from schema. Looks everywhere. First in the symbol table,
			// then in schema. Null if does not exist
			function resolveType(id) {
			  var t=resolveTypeFromSymbolTable(id);
			  if(t && typeof t["parentType"] !== 'undefined' && t["parentType"] != null && t["parentType"]["short_name"] != options.context["short_name"]){
					var tt = null;
					if (options.exprType) {
    					tt=resolveTypeFromSchemaForClass(id);
    					if (!tt) {
    						tt=resolveTypeFromSchemaForAttributeAndLink(id)
    					}
					} else {
    					t=resolveTypeFromSchemaForAttributeAndLink(id);
    					if (!tt) {
    					 t=resolveTypeFromSchemaForClass(id)
    					}
					}
					if(tt) t = t;
				 }
				if (!t) {
					if (options.exprType) {
					  t=resolveTypeFromSchemaForClass(id);
					  if (!t) {
						  t=resolveTypeFromSchemaForAttributeAndLink(id)
					  }
					} else {
					  t=resolveTypeFromSchemaForAttributeAndLink(id);
					  if (!t) {
						  t=resolveTypeFromSchemaForClass(id)
					  }
					}

				}
				return t;
			};
      //string -> string
			// resolves kind of id. CLASS_ALIAS, PROPERTY_ALIAS, CLASS_NAME, CLASS_ALIAS, null
 	    function resolveKind(id) {
				    var k=resolveKindFromSymbolTable(id);
						if (!k) {
						  if (options.exprType) {
							  if (resolveTypeFromSchemaForClass(id)) {
									 k="CLASS_NAME";
							  } else if (resolveTypeFromSchemaForAttributeAndLink(id)) {
									 k="PROPERTY_NAME";
							  }
							} else {
							  if (resolveTypeFromSchemaForAttributeAndLink(id)) {
									k="PROPERTY_NAME";
							  } else if (resolveTypeFromSchemaForClass(id)) {
									k="CLASS_NAME";
							 }
							}

					  }
						return k;
		  };
			function pathOrReference(o) {
				//var classInstences = ["a", "b", "c"] // seit vajadzigas visas klases
        // It does not make sense calculate this every time function is called, but ...
				// console.log("oooooooooooo", o, options.symbol_table, options.symbol_table[options.context._id])

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
					console.log("REFERENCE REFERENCE", o["PathProperty"]["PathAlternative"][0]["PathSequence"][1][0][1]["PathEltOrInverse"]["PathElt"]["PathPrimary"]);

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
					var simbolTable = options.symbol_table[options.context._id][o["PathProperty"]["PathAlternative"][0]["PathSequence"][0]["PathEltOrInverse"]["PathElt"]["PathPrimary"]["var"]["name"]];
					
					for (var symbol in simbolTable) {
						if(simbolTable[symbol]["kind"] == "CLASS_ALIAS" ||
						simbolTable[symbol]["kind"] == "BIND_ALIAS" ||
						simbolTable[symbol]["kind"] == "UNRESOLVED_FIELD_ALIAS" ||
						simbolTable[symbol]["kind"] == "PROPERTY_ALIAS"){
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

				// var classInstances = _.keys(_.omit(options.symbol_table, function(value,key,object) {return _.isNull(value.type)}));
				// if(o["Path"][0] != null && o["Path"][1] == null && classInstances.indexOf(o["Path"][0]["path"]["name"]) > -1) {
					// return {Reference: {name:o["Path"][0]["path"]["name"], type:resolveTypeFromSymbolTable(o["Path"][0]["path"]["name"])}, var : o["PrimaryExpression"]["var"], Substring : o["PrimaryExpression"]["Substring"], FunctionBETWEEN : o["FunctionBETWEEN"], FunctionLike : o["FunctionLike"]}
				// }
				return o;
			};

			function checkIfVariable(Variable) {
				// console.log("Variable", makeVar(Variable));
				// if(makeVar(Variable) != "student-Number") return;
				return Variable;
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

			Main = (space Expression space)
			Expression = "[ ]" / "[ + ]" / "(no_class)"  / ValueScope / ConditionalOrExpressionA / classExpr
			ValueScope = ("{" ValueScope:(ValueScopeA / (NumericLiteral (Comma space NumericLiteral)*)) "}") {return {ValueScope:ValueScope}}
			ValueScopeA = (IntStart:INTEGER ".." IntEnd:INTEGER) {return transformExpressionIntegerScopeToList(IntStart, IntEnd)}

			classExpr = ("(.)" / "."/ "(select this)" / "(this)") {return {classExpr: "true"}}

			ConditionalOrExpressionA = (ConditionalOrExpression:ConditionalOrExpression){return {ConditionalOrExpression: ConditionalOrExpression}}

			ConditionalOrExpression = (ConditionalAndExpression  ( space OROriginal space ConditionalAndExpression )*)

			OROriginal = OROriginal:("||" / "OR"i) {return {OROriginal:"||"}}

			ConditionalAndExpression = (ConditionalAndExpression:ValueLogicalA) {return {ConditionalAndExpression:ConditionalAndExpression}}

			ValueLogicalA = (ValueLogical (space ANDOriginal space ValueLogical )*)

			ANDOriginal = ANDOriginal:("&&" / "AND"i) {return {ANDOriginal:"&&"}}

			ValueLogical = (RelationalExpression:RelationalExpression){return {RelationalExpression:RelationalExpression}}

			RelationalExpression = RelationalExpressionC / RelationalExpressionC1 / RelationalExpressionB1/ RelationalExpressionB2/ RelationalExpressionB / RelationalExpressionA

			RelationalExpressionA = (NumericExpressionL:NumericExpression {return {NumericExpressionL:NumericExpressionL}})

			RelationalExpressionB = (NumericExpressionL:NumericExpression (space Relation:Relation space NumericExpressionR:NumericExpression)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, NumericExpressionR:NumericExpressionR}}

			RelationalExpressionB1 = (classExpr:classExpr (space Relation:Relation space NumericExpressionR:NumericExpression)) {return {classExpr:"true", Relation:Relation, NumericExpressionR:NumericExpressionR}}
			RelationalExpressionB2 = (NumericExpressionL:NumericExpression (space Relation:Relation space classExpr:classExpr)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, classExpr:"true"}}

			RelationalExpressionC = (NumericExpressionL:NumericExpression (space Relation:(IN / NOTIN) space ExpressionList:ExpressionList2)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, ExpressionList:ExpressionList}}
			RelationalExpressionC1 = (NumericExpressionL:NumericExpression (space Relation:(IN / NOTIN) space ExpressionList:(ExpressionList3/ ExpressionList4))) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, ExpressionList:ExpressionList}}

			IN = "IN"i {return "IN"};

			NOT = "NOT"i {return "NOT"}

			NOTIN = Not:(NOT spaceObl IN) {return Not.join("")}

			NumericExpression = AdditiveExpression: AdditiveExpression {return {AdditiveExpression:AdditiveExpression}}

			AdditiveExpression = (MultiplicativeExpression:MultiplicativeExpression (MultiplicativeExpressionList:MultiplicativeExpressionListA)) {return {MultiplicativeExpression:MultiplicativeExpression,  MultiplicativeExpressionList:MultiplicativeExpressionList}}

			MultiplicativeExpressionListA = (MultiplicativeExpressionList)*

			MultiplicativeExpressionList = (Concat / Additive / NumericLiteralPositive / NumericLiteralNegative)

			Concat = (space Concat: "++"  space MultiplicativeExpression:MultiplicativeExpression) {return {Concat:Concat, MultiplicativeExpression}}

			Additive = (space Additive:("+" / "-") space MultiplicativeExpression:MultiplicativeExpression) {return {Additive:Additive, MultiplicativeExpression}}

			MultiplicativeExpression = (UnaryExpression: UnaryExpression (space UnaryExpressionList:UnaryExpressionListA)) {return {UnaryExpression:UnaryExpression, UnaryExpressionList:UnaryExpressionList}}

			UnaryExpression = UnaryExpressionA / UnaryExpressionB

			UnaryExpressionA = (space Additive:("!" / "-" ) space PrimaryExpression:PrimaryExpression) {return {Additive:Additive, PrimaryExpression:PrimaryExpression}}

			UnaryExpressionB = (space PrimaryExpression:PrimaryExpression) {return {PrimaryExpression:PrimaryExpression}}

			UnaryExpressionListA = (UnaryExpressionList*)

			UnaryExpressionList = space Unary:("*" / "/") space UnaryExpression:UnaryExpression {return {Unary:Unary, UnaryExpression:UnaryExpression}}

			PrimaryExpression = BooleanLiteral / BuiltInCall /  RDFLiteral / BrackettedExpression / iriOrFunction / NumericLiteral / Var / QName / LN
			PrimaryExpression2 = BooleanLiteral / BuiltInCall2 /  RDFLiteral / BrackettedExpression / iriOrFunction / NumericLiteral / Var / QName / LN

			BooleanLiteral = BooleanLiteral:(TRUE/ FALSE) {return {BooleanLiteral:BooleanLiteral}}

			TRUE = "true"i {return "true"}
			FALSE = "false"i {return "false"}

			RDFLiteral = (RDFLiteral:(RDFLiteralA/RDFLiteralB/RDFLiteralC)) {return {RDFLiteral:RDFLiteral}}

			RDFLiteralA = String:StringQuotes LANGTAG:LANGTAG {return {String:makeVar(String), LANGTAG:makeVar(LANGTAG)}}

			RDFLiteralB = String:StringQuotes "^^" iri:iri {return {String:makeVar(String), iri:iri}}

			BrackettedExpression = ("(" space BrackettedExpression: Expression space ")") {return {BrackettedExpression:BrackettedExpression}}

			BuiltInCall = Aggregate / FunctionExpression / HASMAX / HASRANK / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc
			BuiltInCall2 = Aggregate  / HASMAX / HASRANK / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc

			Aggregate = Aggregate:(AggregateAO / AggregateA / AggregateB / AggregateC / AggregateD / AggregateE / AggregateF) {return {Aggregate:Aggregate}}

			AggregateAO = Aggregate: COUNT_DISTINCT "(" space Expression: Expression space ")" {return {Aggregate:"COUNT", DISTINCT:"DISTINCT", Expression:Expression}}
			AggregateA = Aggregate: (COUNT / SUM / MIN / MAX / AVG / SAMPLE) "(" DISTINCT:(DISTINCT) spaceObl Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateB = Aggregate: (COUNT / SUM / MIN / MAX / AVG / SAMPLE) "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			AggregateC = Aggregate: (GROUP_CONCAT) "(" DISTINCT:DISTINCT spaceObl Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateD = Aggregate: (GROUP_CONCAT) "(" space Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateE = Aggregate: (GROUP_CONCAT) "(" DISTINCT:DISTINCT spaceObl Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateF = Aggregate: (GROUP_CONCAT) "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			COUNT_DISTINCT = "COUNT_DISTINCT"i {return "COUNT_DISTINCT"}
			DISTINCT = "DISTINCT"i {return "DISTINCT"}
			COUNT = "COUNT"i {return "COUNT"}
			SUM = "SUM"i {return "SUM"}
			MIN = "MIN"i {return "MIN"}
			MAX = "MAX"i {return "MAX"}
			AVG = "AVG"i {return "AVG"}
			SAMPLE = "SAMPLE"i {return "SAMPLE"}
			GROUP_CONCAT = "GROUP_CONCAT"i {return "GROUP_CONCAT"}
			SEPARATORTer = "SEPARATOR"i {return "SEPARATOR"}

			SEPARATOR = (";" space SEPARATORTer space "=" SEPAR: (StringQuotes) ) / (comma:"," space SEPAR:(StringQuotes)) {return makeVar(SEPAR)}

			FunctionExpression = FunctionExpression: (FunctionExpressionC / FunctionExpressionA / FunctionExpressionB / IFFunction / FunctionExpressionD / FunctionExpressionLANGMATCHES / FunctionCOALESCE / BOUNDFunction / NilFunction / BNODEFunction) {return {FunctionExpression:FunctionExpression}}

			STR = "STR"i {return "STR"}
			LANG = "LANG"i {return "LANG"}
			DATATYPE = "DATATYPE"i {return "DATATYPE"}
			IRI = "IRI"i {return "IRI"}
			URI = "URI"i {return "URI"}
			ABS = "ABS"i {return "ABS"}
			CEIL = "CEIL"i {return "CEIL"}
			FLOOR = "FLOOR"i {return "FLOOR"}
			ROUND = "ROUND"i {return "ROUND"}
			STRLEN = "STRLEN"i {return "STRLEN"}
			UCASE = "UCASE"i {return "UCASE"}
			LCASE = "LCASE"i {return "LCASE"}
			ENCODE_FOR_URI = "ENCODE_FOR_URI"i {return "ENCODE_FOR_URI"}
			YEAR = "YEAR"i {return "YEAR"}
			MONTH = "MONTH"i {return "MONTH"}
			DAY = "DAY"i {return "DAY"}
			TIMEZONE = "TIMEZONE"i {return "TIMEZONE"}
			TZ = "TZ"i {return "TZ"}
			MD5 = "MD5"i {return "MD5"}
			SHA1 = "SHA1"i {return "SHA1"}
			SHA256 = "SHA256"i {return "SHA256"}
			SHA384 = "SHA384"i {return "SHA384"}
			SHA512 = "SHA512"i {return "SHA512"}
			isIRI = "isIRI"i {return "isIRI"}
			isURI = "isURI"i {return "isURI"}
			isBLANK = "isBLANK"i {return "isBLANK"}
			dateTime = "dateTime"i {return "dateTime"}
			date = "date"i {return "date"}
			isLITERAL = "isLITERAL"i {return "isLITERAL"}
			isNUMERIC = "isNUMERIC"i {return "isNUMERIC"}
			LANGMATCHES = "LANGMATCHES"i {return "LANGMATCHES"}
			CONTAINS = "CONTAINS"i {return "CONTAINS"}
			STRSTARTS = "STRSTARTS"i {return "STRSTARTS"}
			STRENDS = "STRENDS"i {return "STRENDS"}
			STRBEFORE = "STRBEFORE"i {return "STRBEFORE"}
			STRAFTER = "STRAFTER"i {return "STRAFTER"}
			STRLANG = "STRLANG"i {return "STRLANG"}
			STRDT = "STRDT"i {return "STRDT"}
			sameTerm = "sameTerm"i {return "sameTerm"}
			days = "days"i {return "days"}
			years = "years"i {return "years"}
			months = "months"i {return "months"}
			HOURS2 = "hours"i {return "HOURS"}
			hours = "hours"i {return "hours"}
			minutes = "minutes"i {return "minutes"}
			MINUTES2 = "minutes"i {return "MINUTES"}
			seconds = "seconds"i {return "seconds"}
			SECONDS2 = "seconds"i {return "SECONDS"}
			IF = "IF"i {return "IF"}
			COALESCE = "COALESCE"i {return "COALESCE"}
			BOUND = "BOUND"i {return "BOUND"}
			BNODE = "BNODE"i {return "BNODE"}
			RAND = "RAND"i {return "RAND"}
			CONCAT = "CONCAT"i {return "CONCAT"}
			NOW = "NOW"i {return "NOW"}
			UUID = "UUID"i {return "UUID"}
			STRUUID = "STRUUID"i {return "STRUUID"}


			FunctionExpressionA = Function:(STR / LANG / DATATYPE / IRI / URI / ABS / CEIL / FLOOR / ROUND / STRLEN / UCASE /
					 LCASE / ENCODE_FOR_URI / YEAR / MONTH  / DAY/ HOURS2 / MINUTES2 / SECONDS2 / TIMEZONE / TZ / MD5 / SHA1 / SHA256 / SHA384 / SHA512 / isIRI /
					isURI / isBLANK / dateTime / date / isLITERAL / isNUMERIC) "(" space Expression: Expression space ")" {return {Function:Function, Expression:Expression}}

			FunctionExpressionB = Function:(LANGMATCHES / CONTAINS / STRSTARTS / STRENDS / STRBEFORE / STRAFTER / STRLANG / STRDT / sameTerm) "(" space Expression1:Expression space "," space Expression2:Expression space ")" {return {Function:Function, Expression1:Expression1, Expression2:Expression2}}

			FunctionExpressionC = FunctionTime: (days / years / months / hours / minutes / seconds ) "(" space PrimaryExpressionL: PrimaryExpression space "-" space PrimaryExpressionR: PrimaryExpression space ")" {return {FunctionTime:FunctionTime, PrimaryExpressionL:PrimaryExpressionL, PrimaryExpressionR:PrimaryExpressionR}}

			FunctionExpressionD = Function:(COALESCE / CONCAT) ExpressionList:ExpressionList2 {return {Function:Function, ExpressionList:ExpressionList}}

			FunctionCOALESCE = PrimaryExpression1:PrimaryExpression2 space "??" space PrimaryExpression2:PrimaryExpression2 {return {Function:"coalesceShort", PrimaryExpression1:PrimaryExpression1, PrimaryExpression2:PrimaryExpression2}}

			FunctionExpressionLANGMATCHES = FunctionExpressionLANGMATCHESA / FunctionExpressionLANGMATCHESB
			FunctionExpressionLANGMATCHESA = PrimaryExpression:(QName / LN) LANGTAG_MUL:LANGTAG_MUL {return {Function:"langmatchesShortMultiple", PrimaryExpression:PrimaryExpression, LANGTAG_MUL:LANGTAG_MUL}}
			FunctionExpressionLANGMATCHESB = PrimaryExpression:(QName / LN) LANGTAG:LANGTAG {return {Function:"langmatchesShort", PrimaryExpression:PrimaryExpression, LANGTAG:makeVar(LANGTAG)}}

			BOUNDFunction = Function: BOUND "(" space PrimaryExpression:PrimaryExpression space")" {return {Function:Function, PrimaryExpression:PrimaryExpression}}
			NilFunction = Function: (RAND / NOW / UUID / STRUUID) NIL:NIL {return {Function:Function, NIL:NIL}}
			BNODEFunction = BNODEFunctionA / BNODEFunctionB
			BNODEFunctionA = Function:BNODE "(" space Expression: Expression space ")" {return {Function:Function, Expression:Expression}}
			BNODEFunctionB = Function: BNODE NIL:NIL {return {Function:Function, NIL:NIL}}
			IFFunction = Function: IF "(" space Expression1:Expression space "," space Expression2:Expression space "," space Expression3:Expression space")" {return {Function:Function, Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			HASMAX = (HASMAX:'HASMAX' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASMAX, SpecialExpression:SpecialExpression}}
			HASRANK = (HASRANK:'HASRANK' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASRANK, SpecialExpression:SpecialExpression}}

			SpecialExpression = (PrimaryExpression space "DESC"? (space "|" space ("GLOBAL" / ("FOR" / "BY")? space Expression) (space "|" space "WHERE" space Expression)?)?)

			RegexExpression = RegexExpression:(RegexExpressionA / RegexExpressionB) {return {RegexExpression:RegexExpression}}

			RegexExpressionA = (REGEX "(" space Expression1:Expression space  Comma space Expression2:Expression ( Comma space Expression3:Expression ) space ")")

			RegexExpressionB = (REGEX "(" space Expression1:Expression space  Comma space Expression2:Expression space ")")

			REGEX = "REGEX"i {return "REGEX"}
			SUBSTRING = "SUBSTRING"i {return "SUBSTRING"}
			SUBSTR = "SUBSTR"i {return "SUBSTR"}
			bifSUBSTRING = "bif:SUBSTRING"i {return "bif:SUBSTRING"}
			bifSUBSTR = "bif:SUBSTR"i {return "bif:SUBSTR"}
			REPLACE = "REPLACE"i {return "REPLACE"}
			EXISTS = "EXISTS"i {return "EXISTS"}

			SubstringExpression = SubstringExpression:(SubstringExpressionA/SubstringExpressionB) {return {SubstringExpression:SubstringExpression}}

			SubstringExpressionA = ((SUBSTRING / SUBSTR ) "(" space Expression1:Expression space  "," space Expression2:Expression  "," space Expression3:Expression  space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			SubstringExpressionB = ((SUBSTRING / SUBSTR ) "(" space Expression1:Expression space  "," space Expression2:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2}}

			SubstringBifExpression = SubstringBifExpression:(SubstringBifExpressionA/SubstringBifExpressionB) {return {SubstringBifExpression:SubstringBifExpression}}

			SubstringBifExpressionA = ((bifSUBSTRING / bifSUBSTR ) "(" space Expression1:Expression space  "," space Expression2:Expression "," space Expression3:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			SubstringBifExpressionB = ((bifSUBSTRING / bifSUBSTR ) "(" space Expression1:Expression space  "," space Expression2:Expression space ")")  {return {Expression1:Expression1, Expression2:Expression2}}

			StrReplaceExpression = StrReplaceExpression:(StrReplaceExpressionA/StrReplaceExpressionB) {return {StrReplaceExpression:StrReplaceExpression}}

			StrReplaceExpressionA = (REPLACE "(" space Expression1:Expression space  "," space Expression2:Expression "," space Expression3:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			StrReplaceExpressionB = (REPLACE "(" space Expression1:Expression space  "," space Expression2:Expression space ")")  {return {Expression1:Expression1, Expression2:Expression2}}

			ExistsFunc = ExistsFunc:(ExistsFuncA1 / ExistsFuncA /ExistsFuncB)  {return {ExistsFunc:ExistsFunc}}

			ExistsFuncA1 = EXISTS space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}
			ExistsFuncA = EXISTS  spaceObl Expression:GroupGraphPattern {return{Expression:Expression}}

			ExistsFuncB = "{" space Expression:GroupGraphPattern space "}"{return{Expression:Expression}}
			GroupGraphPattern = (Expression)

			NotExistsFunc = NotExistsFunc:(NotExistsFuncA / NotExistsFuncB1 /NotExistsFuncB / NotExistsFuncC1/ NotExistsFuncC) {return {NotExistsFunc:NotExistsFunc}}

			NotExistsFuncA = NOT space  "{" space Expression:GroupGraphPattern space "}" {return{Expression:Expression}}

			NotExistsFuncB = NOT spaceObl EXISTS spaceObl Expression:GroupGraphPattern {return{Expression:Expression}}
			NotExistsFuncB1 = NOT  spaceObl  EXISTS space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}

			NotExistsFuncC = NOT  spaceObl Expression:GroupGraphPattern {return{Expression:Expression}}
			NotExistsFuncC1 = NOT  space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}

			ExpressionList2 = (NIL / "(" space Expression space  ( Comma space Expression )* space ")" )
			ExpressionList3 = ("{" space Expression space  ( Comma space Expression )* space "}" )
			ExpressionList4 = ("{" space IntStart:INTEGER space ".." space IntEnd:INTEGER space "}" ) {return transformExpressionIntegerScopeToList(IntStart, IntEnd)}

			Comma = Comma:"," {return {Comma:Comma}}

			LANGTAG = "@" string
			LANGTAG_MUL = "@" "(" LANGTAG_MUL:(string2 (LANGTAG_LIST)*) ")" {return LANGTAG_MUL}
			LANGTAG_LIST = (Comma:Comma space string:string2) {return string}

			RDFLiteralC = String:StringQuotes {return {String:makeVar(String)}}

			iri = (IRIREF: IRIREF / PrefixedName: PrefixedName)

			IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / "%" / [0-9])* ">") {return {IRIREF:makeVar(IRIREF)}}

			PrefixedName = PrefixedName:(PNAME_LN) {return {PrefixedName:PrefixedName}}

			PNAME_NS = Prefix:(PN_PREFIX? ":") {return makeVar(Prefix)}

			PNAME_LN = (ref:"@"? PropertyReference:PropertyReference? Prefix:PNAME_NS  LName:(Chars_String_variables / Chars_String_prefix) Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:{name:makeVar(Prefix)+makeVar(LName), ref:ref, type:resolveType(makeVar(Prefix)+makeVar(LName)), kind:resolveKind(makeVar(Prefix)+makeVar(LName)), PropertyReference:PropertyReference},Prefix:Prefix, Name:makeVar(LName), Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			PN_PREFIX = Chars_String_prefix

			PN_LOCAL = Var:Chars_String {return makeVar(Var)}

			PropertyReference = "`" {return "true"}

			iriOrFunction = iriOrFunctionA / iriOrFunctionB

			iriOrFunctionA = iri:iri ArgList:ArgList {return {iri:iri, ArgList:ArgList}}

			iriOrFunctionB = iri:iri {return {iri:iri}}

			ArgList = ArgListA / ArgListB / NIL

			ArgListA = ("(" space DISTINCT: DISTINCT spaceObl ArgListExpression: ArgListExpression space ")" ) {return {DISTINCT:DISTINCT, ArgListExpression:ArgListExpression}}

			ArgListB = ("(" space ArgListExpression: ArgListExpression space ")" {return {ArgListExpression:ArgListExpression}})
			NIL = "(" space ")" {return "NIL"}

			ArgListExpression =  (Expression ( Comma space Expression )*)

			NumericLiteral = NumericLiteral: (NumericLiteralUnsigned / NumericLiteralPositive / NumericLiteralNegative) {return {NumericLiteral:NumericLiteral}}

			NumericLiteralUnsigned = DOUBLE / DECIMAL / INTEGER
			NumericLiteralPositive = DECIMAL_POSITIVE / DOUBLE_POSITIVE / INTEGER_POSITIVE
			NumericLiteralNegative = DECIMAL_NEGATIVE / DOUBLE_NEGATIVE / INTEGER_NEGATIVE
			DECIMAL = DECIMAL:([0-9]* "." [0-9]+) {return {Number:DECIMAL.join("")}}
			DOUBLE = DOUBLE:(([0-9]+ "." [0-9]* [eE] [+-]? [0-9]+) / ("." ([0-9])+ [eE] [+-]? [0-9]+) / (([0-9])+ [eE] [+-]? [0-9]+)) {return {Number:DOUBLE.join("")}}
			INTEGER = INTEGER:[0-9]+ {return {Number:INTEGER.join("")}}
			INTEGER_POSITIVE = Number:("+" INTEGER) {return {Number:Number.join("")}}
			DECIMAL_POSITIVE = Number:("+" DECIMAL){return {Number:Number.join("")}}
			DOUBLE_POSITIVE = Number:("-" DOUBLE){return {Number:Number.join("")}}
			INTEGER_NEGATIVE = Number:("-" INTEGER){return {Number:Number.join("")}}
			DECIMAL_NEGATIVE = Number:("-" DECIMAL){return {Number:Number.join("")}}
			DOUBLE_NEGATIVE = Number:("-" DOUBLE){return {Number:Number.join("")}}
			Var = Var:(VAR1 /VAR2 / VAR3) {return {VariableName:makeVar(Var)}}
			VAR1 = "??" VARNAME?
			VAR2 = "?" VARNAME
			VAR3 = "$" VARNAME
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			StringQuotes = STRING_LITERAL1  / STRING_LITERAL2
			STRING_LITERAL1 = "'" stringQ "'"
			STRING_LITERAL2 = doubleQuotes string:stringQ doubleQuotes
			doubleQuotes = ('"'/ '“' / '”') {return '"'}
			QName = Path:(Path / PathBr)  {return pathOrReference(Path)}



			//////////////////////////////////////////////////////////////////////////////////////////////////////

			Path = (space PathProperty:(PathAlternative) Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {PathProperty:PathProperty, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			PathBr = "[" space PathProperty:(PathAlternativeBr) Substring:Substring space "]" space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression? {return {PathProperty:PathProperty, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			PathAlternative = PathAlternative:(PathSequence (space VERTICAL space PathSequence)*) {return {PathAlternative:PathAlternative}}
			PathAlternativeBr = PathAlternative:(PathSequenceBr (space VERTICAL space PathSequenceBr)*) {return {PathAlternative:PathAlternative}}
			PathSequence = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)+ ){return {PathSequence:PathSequence}}
			PathSequenceBr = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)* ){return {PathSequence:PathSequence}}
			PathEltOrInverse = PathEltOrInverse:(PathElt3 / PathElt1 / PathElt2) {return {PathEltOrInverse:PathEltOrInverse}}
			PathElt1 = PathElt:PathElt {return {inv:"", PathElt:PathElt}}
			PathElt2 = "^" PathElt:PathElt {return {inv:"^", PathElt:PathElt}}
			PathElt3 = "inv"i "(" space PathElt:PathElt space ")" {return {inv:"^", PathElt:PathElt}}
			PathElt = PathPrimary:PathPrimary PathMod:PathMod? {return {PathPrimary:PathPrimary, PathMod:PathMod}}
			PathPrimary =  ("!" PathNegatedPropertySet)/ iriP / ("(" space Path space ")") / LNameP/ "a"
			PathNegatedPropertySet = PathNegatedPropertySet:(PathNegatedPropertySet2 / PathNegatedPropertySet1){return {PathNegatedPropertySet:PathNegatedPropertySet}}
			PathNegatedPropertySet1 = PathOneInPropertySet:PathOneInPropertySet {return {PathOneInPropertySet:PathOneInPropertySet}}
			PathNegatedPropertySet2 = PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted {return {PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted}}
			PathNegatedPropertySetBracketted = ("(" (space PathOneInPropertySet (space VERTICAL space PathOneInPropertySet)*)? space ")")
			PathOneInPropertySet = PathOneInPropertySet3 / PathOneInPropertySet1 / PathOneInPropertySet2
			PathOneInPropertySet1 = iriOra:(iriP  / LNameP/ 'a') {return {inv:"", iriOra:iriOra}}
			PathOneInPropertySet2 = "^" iriOra:(iriP  / LNameP/ 'a') {return {inv:"^", iriOra:iriOra}}
			PathOneInPropertySet3 = "inv"i "(" iriOra:(iriP / LNameP/ 'a' ) ")" {return {inv:"^", iriOra:iriOra}}
			PathMod = ("?" / "*" / "+")

			iriP = IRIREF / PrefixedNameP
			PrefixedNameP = PrefixedName:(PNAME_LNP / PNAME_NSP) {return {PrefixedName:PrefixedName}}
			PNAME_NSP = Prefix:(PN_PREFIX? ':') {return makeVar(Prefix)}
			PNAME_LNP = (ref:"@"? PNAME_NS:PNAME_NSP  LName:Chars_String_prefix) {return {var:{name:makeVar(LName), ref:ref,type:resolveType(makeVar(PNAME_NS)+makeVar(LName)), kind:resolveKind(makeVar(PNAME_NS)+makeVar(LName))}, Prefix:PNAME_NS}}
			LNameP = (ref:"@"? LName:(Chars_String_prefix)) {return {var:{name:makeVar(LName),ref:ref, type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}

			VERTICAL = "|" {return {Alternative:"|"}}
			PATH_SYMBOL = ("." / "/") {return {PathSymbol :"/"}}
			//////////////////////////////////////////////////////////////////////////////////////////////////////

			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			Chars_String_variables = ("[" Chars_String_variables:Chars_String_prefix "]") {return Chars_String_variables}
																																																//atributs vai associacija
			LN =((LNameINV / LNameINV2  / LNameINV3 / LName) )
			
			Substring = ("[" (INTEGER ("," space INTEGER)?) "]")?
			LNameSimple = (LName: (Chars_String_variables / Chars_String_prefix))

			LName = (ref:"@"? PropertyReference:PropertyReference? LName: (Chars_String_variables / Chars_String_prefix) PathMod:PathMod?  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:{name:makeVar(LName), ref:ref, type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName)), PathMod:PathMod, PropertyReference:PropertyReference},  Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			LNameINV = (ref:"@"? PropertyReference:PropertyReference? INV: "INV"i "(" LName:LNameSimple  ")"  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:INV, name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LNameINV3 = (ref:"@"? PropertyReference:PropertyReference? INV: "INV"i "(" PNAME_NS:PNAME_NS  LName:LNameSimple ")"  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:INV, name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(PNAME_NS)+makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			LNameINV2 = (ref:"@"? PropertyReference:PropertyReference? INV: "^" LName:LNameSimple  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:"INV", name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			Relation = "=" / "!=" / "<>" / "<=" / ">=" /"<" / ">"
			space = ((" ")*) {return }
			spaceObl = ((" ")+) {return }
			string = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$/])+) {return {string: string.join("")}}
			stringQ = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$()!@#%&*+?|/])+) {return {string: string.join("")}}
			string2 = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ])+) {return string.join("")}

			LikeExpression = ('LIKE'i space string:(likeString1 / likeString2)) {return string}
			likeString1 = (('"'/ '“' / '”') start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? ('"'/ '“' / '”')) {return {string: makeVar(string), start:start, end:end}}
			likeString2 = ("'" start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? "'") {return {string: makeVar(string), start:start, end:end}}

			BetweenExpression = ('BETWEEN'i space '(' space BetweenExpressionL:NumericExpression space Comma space BetweenExpressionR:NumericExpression ')') {return {BetweenExpressionL:BetweenExpressionL, BetweenExpressionR:BetweenExpressionR}}
