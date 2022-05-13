

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object, exprType:String}
			// exprType: CLASS_NAME or null if other - at the moment it determines the precedence of resolving - class or property first in case of name clash
      options = arguments[1];
			function makeVar(o) {return makeString(o);};

      // string -> idObject
			// returns type of the identifier from symbol table. Null if does not exist.
			async function resolveTypeFromSymbolTable(id) {
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
				return null
			};
			// string -> idObject
			// returns kind of the identifier from symbol table. Null if does not exist.
			async function resolveKindFromSymbolTable(id) {
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
				return null
			};
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
			async function resolveTypeFromSchemaForClass(id) {
				if(options.schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
					id = "wd:"+id;
				}
				
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
				if(options.schemaName.toLowerCase() == "wikidata" && ((id.startsWith("[") && id.endsWith("]")) || id.indexOf(":") == -1)){
					id = "wdt:"+id;
				}
				
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
				// if (!res) { 
					// res = options.schema.resolveLinkByName(id); 
					// if (res) res["property_type"] = "OBJECT_PROPERTY"
				// }
				// else {
						// res["parentType"] = aorl[1];
						// res["property_type"] = "DATA_PROPERTY";
				// };
				
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
			Expression = "[ ]" / "[ + ]" / "(no_class)"  / ValueScope / ConditionalOrExpressionA / classExpr / "*"
			//ValueScope = ("{" ValueScope:(ValueScopeA / (NumericLiteral (Comma space NumericLiteral)*)) "}") {return {ValueScope:ValueScope}}
			ValueScope = ("{" ValueScope:(ValueScopeA / ValueScopeB / ValueScopeC) "}") {return {ValueScope:ValueScope}}
			ValueScopeA = (IntStart:INTEGER ".." IntEnd:INTEGER) {return transformExpressionIntegerScopeToList(IntStart, IntEnd)}
			ValueScopeC = ((UNDEF / PrimaryExpression) (Comma2 space (UNDEF / PrimaryExpression))*)
			ValueScopeB = (Scope (Comma2 space Scope)*)
			Scope = ("(" space Scope:((UNDEF / PrimaryExpression) (Comma2 space (UNDEF / PrimaryExpression))*) space ")"){return {Scope: Scope}}

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

			PrimaryExpression = BooleanLiteral  / BuiltInCall / QName / iriOrFunction/  RDFLiteral / BrackettedExpression /  NumericLiteral / Var / DoubleSquareBracketName  / LN
			// PrimaryExpression = DoubleSquareBracketName
			PrimaryExpression2 = BooleanLiteral / iriOrFunction / BuiltInCall2 /  RDFLiteral / BrackettedExpression /  NumericLiteral / Var / DoubleSquareBracketName / QName / LN

			BooleanLiteral = BooleanLiteral:(TRUE/ FALSE) {return {BooleanLiteral:BooleanLiteral}}

			TRUE = "true"i {return "true"}
			FALSE = "false"i {return "false"}

			RDFLiteral = (RDFLiteral:(RDFLiteralA/RDFLiteralB/RDFLiteralC)) {return {RDFLiteral:RDFLiteral}}

			RDFLiteralA = String:StringQuotes LANGTAG:LANGTAG {return {String:makeVar(String), LANGTAG:makeVar(LANGTAG)}}

			RDFLiteralB = String:StringQuotes "^^" iri:iri {return {String:makeVar(String), iri:iri}}

			BrackettedExpression = ("(" space BrackettedExpression: Expression space ")") {return {BrackettedExpression:BrackettedExpression}}

			BuiltInCall = Aggregate / FunctionExpression / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc
			BuiltInCall2 = Aggregate / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc

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

			UNDEF = "UNDEF"i {return {UNDEF:"UNDEF"}}
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
			FunctionExpressionLANGMATCHESA = PrimaryExpression:(PrefixedName / QName / LN) LANGTAG_MUL:LANGTAG_MUL {return {Function:"langmatchesShortMultiple", PrimaryExpression:PrimaryExpression, LANGTAG_MUL:LANGTAG_MUL}}
			FunctionExpressionLANGMATCHESB = PrimaryExpression:(PrefixedName / QName / LN) LANGTAG:LANGTAG {return {Function:"langmatchesShort", PrimaryExpression:PrimaryExpression, LANGTAG:makeVar(LANGTAG)}}

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
			Comma2 = Comma:"," {return {Space:" "}}

			LANGTAG = "@" stringLang
			LANGTAG_MUL = "@" "(" LANGTAG_MUL:(string2 (LANGTAG_LIST)*) ")" {return LANGTAG_MUL}
			LANGTAG_LIST = (Comma:Comma space string:string2) {return string}

			RDFLiteralC = String:StringQuotes {return {String:makeVar(String)}}

			iri = (IRIREF: IRIREF / PrefixedName: PrefixedName)

			IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / "(" / ")" / "%" / [0-9])* ">") {return {IRIREF:makeVar(IRIREF)}}

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
			// DOUBLE = DOUBLE:(([0-9]+ "." [0-9]* [eE] [+-]? [0-9]+) / ("." ([0-9])+ [eE] [+-]? [0-9]+) / (([0-9])+ [eE] [+-]? [0-9]+)) {return {Number:DOUBLE.join("")}}
			DOUBLE = DOUBLE:(([0-9]+ "." [0-9]* [eE] [+-]? [0-9]+) / ("." ([0-9])+ [eE] [+-]? [0-9]+) / (([0-9])+ [eE] [+-]? [0-9]+)) {return {Number:makeVar(DOUBLE)}} 
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
			PathBr = "[[" space PathProperty:(PathAlternativeBr) Substring:Substring space "]]" space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression? {return {PathProperty:PathProperty, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
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

			Chars_String_square = (([A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC] / [0-9] / "_") ([A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC] / "_" / "." / "'" / " "/ "/" / "-"/ "," / "(" / ")" / [0-9])*)
			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])* (("..") [0-9]*)?)
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])* (("..") [0-9]*)?)
			Chars_String_variables = ("[[" Chars_String_variables:Chars_String_prefix "]]") {return Chars_String_variables}
																																																//atributs vai associacija
			LN =((LNameINV / LNameINV2  / LNameINV3 / LName) )
			
			Substring = ("[" (INTEGER ("," space INTEGER)?) "]")?
			LNameSimple = (LName: (Chars_String_variables / Chars_String_prefix))

			LName = (ref:"@"? PropertyReference:PropertyReference? LName: (Chars_String_variables / Chars_String_prefix) PathMod:PathMod?  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:{name:makeVar(LName), ref:ref, type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName)), PathMod:PathMod, PropertyReference:PropertyReference},  Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			LNameINV = (ref:"@"? PropertyReference:PropertyReference? INV: "INV"i "(" LName:LNameSimple  ")"  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:INV, name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LNameINV3 = (ref:"@"? PropertyReference:PropertyReference? INV: "INV"i "(" PNAME_NS:PNAME_NS  LName:LNameSimple ")"  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:INV, name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(PNAME_NS)+makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			LNameINV2 = (ref:"@"? PropertyReference:PropertyReference? INV: "^" LName:LNameSimple  Substring:Substring space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return { var:{INV:"INV", name:makeVar(LName), ref:ref, type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName)), PropertyReference:PropertyReference}, Substring:makeVar(Substring), FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}

			DoubleSquareBracketName = PropertyReference:PropertyReference? LName:(squarePrefix? squareVariable) {return {var:{name:makeVar(LName), type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName)), PropertyReference:PropertyReference}}}
			squarePrefix = Chars_String_prefix ":"
			squareVariable = "["  Chars_String_square  "]"
			

			Relation = "=" / "!=" / "<>" / "<=" / ">=" /"<" / ">"
			space = ((" ")*) {return }
			spaceObl = ((" ")+) {return }
			string = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$/])+) {return {string: string.join("")}}
			stringLang = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9])+) {return {string: string.join("")}}
			stringQ = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / slash / "[" / "]" / [-_.:, ^$()!@#%&*+?|/])*) {return {string: string.join("")}}
			slash = "\\" {return "\\\\"}
			string2 = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ])+) {return string.join("")}

			LikeExpression = ('LIKE'i space string:(likeString1 / likeString2)) {return string}
			likeString1 = (('"'/ '“' / '”') start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? ('"'/ '“' / '”')) {return {string: makeVar(string), start:start, end:end}}
			likeString2 = ("'" start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? "'") {return {string: makeVar(string), start:start, end:end}}

			BetweenExpression = ('BETWEEN'i space '(' space BetweenExpressionL:NumericExpression space Comma space BetweenExpressionR:NumericExpression ')') {return {BetweenExpressionL:BetweenExpressionL, BetweenExpressionR:BetweenExpressionR}}
