

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
      options = arguments[1];
			//console.log(options);

			function makeVar(o) {return makeString(o);};

      // string -> idObject
			// returns type of the identifier from symbol table. Null if does not exist.
			function resolveTypeFromSymbolTable(id) { var st_row = options.symbol_table[id]; if (st_row) { return st_row.type } else { return null } };
			// string -> idObject
			// returns kind of the identifier from symbol table. Null if does not exist.
			function resolveKindFromSymbolTable(id) { var st_row = options.symbol_table[id]; if (st_row) { return st_row.kind } else { return null } };
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
				//var classInstences = ["a", "b", "c"] // seit vajadzigas visas klases
        // It does not make sense calculate this every time function is called, but ...
				var classInstances = _.keys(_.omit(options.symbol_table, function(value,key,object) {return _.isNull(value.type)}));

				if(o["Path"][0] != null && o["Path"][1] == null && classInstances.indexOf(o["Path"][0]["path"]["name"]) > -1) {
						// return {Reference: {name:o["Path"][0]["path"]["name"], type:resolveTypeFromSymbolTable(o["Path"][0]["path"]["name"])}, var : o["PrimaryExpression"]["var"], Substring : o["PrimaryExpression"]["Substring"], ReferenceToClass: o["ReferenceToClass"], ValueScope:o["ValueScope"], FunctionBETWEEN : o["FunctionBETWEEN"], FunctionLike : o["FunctionLike"]}
						return {Reference: {name:o["Path"][0]["path"]["name"], type:resolveTypeFromSymbolTable(o["Path"][0]["path"]["name"])}, var : o["PrimaryExpression"]["var"], Substring : o["PrimaryExpression"]["Substring"], ReferenceToClass: o["ReferenceToClass"], FunctionBETWEEN : o["FunctionBETWEEN"], FunctionLike : o["FunctionLike"]}
				//                 referenceta klase

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

			Main = (Expression space)
			// Expression = classExpr / ExpressionA
			Expression = "[ ]" / "[ + ]" / "(no_class)" / classExpr / ValueScope / ConditionalOrExpressionA
			ValueScope = ("{" ValueScope:(ValueScopeA / (NumericLiteral (Comma space NumericLiteral)*)) "}") {return {ValueScope:ValueScope}}
			ValueScopeA = (IntStart:INTEGER ".." IntEnd:INTEGER) {return transformExpressionIntegerScopeToList(IntStart, IntEnd)}
			
			// ExpressionA = (OrExpression:OrExpression) {return {OrExpression: OrExpression}}
			
			classExpr = ("." / "(.)") {return {classExpr: "true"}}

			// OrExpression = (ANDExpression ( space OR space ANDExpression )*)

			// OR = "OR" {return {OROriginal:"||"}}

			// ANDExpression = ANDExpression:ANDExpressionA {return {ANDExpression: ANDExpression}}

			// ANDExpressionA = (ConditionalOrExpressionA ( space AND space ConditionalOrExpressionA )*)

			// AND = "AND" {return {ANDOriginal:"&&"}}

			ConditionalOrExpressionA = (ConditionalOrExpression:ConditionalOrExpression){return {ConditionalOrExpression: ConditionalOrExpression}}

			ConditionalOrExpression = (ConditionalAndExpression  ( space OROriginal space ConditionalAndExpression )*)

			OROriginal = OROriginal:("||" / "OR" / "or") {return {OROriginal:OROriginal}}

			ConditionalAndExpression = (ConditionalAndExpression:ValueLogicalA) {return {ConditionalAndExpression:ConditionalAndExpression}}

			ValueLogicalA = (ValueLogical (space ANDOriginal space ValueLogical )*)

			ANDOriginal = ANDOriginal:("&&" / "AND" / "and") {return {ANDOriginal:ANDOriginal}}

			ValueLogical = (RelationalExpression:RelationalExpression){return {RelationalExpression:RelationalExpression}}

			RelationalExpression = RelationalExpressionC / RelationalExpressionC1 / RelationalExpressionB1/ RelationalExpressionB2/ RelationalExpressionB / RelationalExpressionA

			RelationalExpressionA = (NumericExpressionL:NumericExpression {return {NumericExpressionL:NumericExpressionL}})

			RelationalExpressionB = (NumericExpressionL:NumericExpression (space Relation:Relation space NumericExpressionR:NumericExpression)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, NumericExpressionR:NumericExpressionR}}
			
			RelationalExpressionB1 = (classExpr:classExpr (space Relation:Relation space NumericExpressionR:NumericExpression)) {return {classExpr:"true", Relation:Relation, NumericExpressionR:NumericExpressionR}}
			RelationalExpressionB2 = (NumericExpressionL:NumericExpression (space Relation:Relation space classExpr:classExpr)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, classExpr:"true"}}

			RelationalExpressionC = (NumericExpressionL:NumericExpression (space Relation:("IN" / "in" / NOTIN) space ExpressionList:ExpressionList2)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, ExpressionList:ExpressionList}}
			RelationalExpressionC1 = (NumericExpressionL:NumericExpression (space Relation:("IN" / "in" / NOTIN) space ExpressionList:(ExpressionList3/ ExpressionList4))) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, ExpressionList:ExpressionList}}

			NOTIN = Not:(("NOT" / "not") space ("IN" / "in")) {return Not.join("")}

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

			PrimaryExpression2 = BooleanLiteral / BuiltInCall / RDFLiteral / BrackettedExpression / iriOrFunction  / NumericLiteral /  Var / LName2

			BooleanLiteral = BooleanLiteral:("true"/ "false") {return {BooleanLiteral:BooleanLiteral}}

			RDFLiteral = (RDFLiteral:(RDFLiteralA/RDFLiteralB/RDFLiteralC)) {return {RDFLiteral:RDFLiteral}}

			RDFLiteralA = String:StringQuotes LANGTAG:LANGTAG {return {String:makeVar(String), LANGTAG:makeVar(LANGTAG)}}

			RDFLiteralB = String:StringQuotes "^^" iri:iri {return {String:makeVar(String), iri:iri}}

			BrackettedExpression = ("(" space BrackettedExpression: Expression space ")") {return {BrackettedExpression:BrackettedExpression}}

			BuiltInCall = Aggregate / FunctionExpression / HASMAX / HASRANK / RegexExpression / SubstringExpression / SubstringBifExpression / StrReplaceExpression / ExistsFunc / NotExistsFunc

			Aggregate = Aggregate:(AggregateAO / AggregateA / AggregateB / AggregateC / AggregateD / AggregateE / AggregateF) {return {Aggregate:Aggregate}}

			AggregateAO = Aggregate: ("COUNT_DISTINCT" / "count_distinct") "(" space Expression: Expression space ")" {return {Aggregate:"COUNT", DISTINCT:"DISTINCT", Expression:Expression}}
			AggregateA = Aggregate: ("COUNT" / "count" / "SUM" / "sum" / "MIN" / "min" / "MAX" / "max" / "AVG" / "avg" / "SAMPLE" / "sample") "(" DISTINCT:("DISTINCT" / "distinct") space Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateB = Aggregate: ("COUNT" / "count" / "SUM" / "sum" / "MIN" / "min" / "MAX" / "max" / "AVG" / "avg" / "SAMPLE" / "sample") "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			AggregateC = Aggregate: ("GROUP_CONCAT" / "group_concat") "(" DISTINCT:("DISTINCT" / "distinct") space Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateD = Aggregate: ("GROUP_CONCAT" / "group_concat") "(" space Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateE = Aggregate: ("GROUP_CONCAT" / "group_concat") "(" DISTINCT:("DISTINCT" / "distinct") space Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateF = Aggregate: ("GROUP_CONCAT" / "group_concat") "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			SEPARATOR = (";" space "SEPARATOR" "=" SEPAR: (StringQuotes) ) / (comma:"," space SEPAR:(StringQuotes)) {return makeVar(SEPAR)}
			

			FunctionExpression = FunctionExpression: (FunctionExpressionA / FunctionExpressionB / FunctionExpressionC) {return {FunctionExpression:FunctionExpression}}

			FunctionExpressionA = Function:("STR" / "LANG" / "DATATYPE" / "IRI" / "URI" / "ABS" / "CEIL" / "FLOOR" / "ROUND" / "STRLEN" / "UCASE" /
					 "LCASE" / "ENCODE_FOR_URI" / "YEAR" / "MONTH" / "DAY" / "TIMEZONE" / "TZ" / "MD5" / "SHA1" / "SHA256" / "SHA512" / "isIRI" /
					"isURI" / "isBLANK" / "dateTime" / "date" / "isLITERAL" / "isNUMERIC") "(" space Expression: Expression space ")" {return {Function:Function, Expression:Expression}}

			FunctionExpressionB = Function:("LANGMATCHES" / "CONTAINS" / "STRSTARTS" / "STRENDS" / "STRBEFORE" / "STRAFTER" / "STRLANG" / "STRDT" / "sameTerm") "(" space Expression1:Expression space "," space Expression2:Expression space ")" {return {Function:Function, Expression1:Expression1, Expression2:Expression2}}

			FunctionExpressionC = FunctionTime: ("days" / "years" / "months" / "hours" / "minutes" / "seconds") "(" space PrimaryExpressionL: PrimaryExpression "-" PrimaryExpressionR: PrimaryExpression space ")" {return {FunctionTime:FunctionTime, PrimaryExpressionL:PrimaryExpressionL, PrimaryExpressionR:PrimaryExpressionR}}

			HASMAX = (HASMAX:'HASMAX' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASMAX, SpecialExpression:SpecialExpression}}
			HASRANK = (HASRANK:'HASRANK' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASRANK, SpecialExpression:SpecialExpression}}

			SpecialExpression = (PrimaryExpression space "DESC"? (space "|" space ("GLOBAL" / ("FOR" / "BY")? space Expression) (space "|" space "WHERE" space Expression)?)?)

			RegexExpression = RegexExpression:(RegexExpressionA / RegexExpressionB) {return {RegexExpression:RegexExpression}}

			RegexExpressionA = ("REGEX" "(" space Expression1:Expression space  Comma space Expression2:Expression ( Comma space Expression3:Expression ) space ")")

			RegexExpressionB = ("REGEX" "(" space Expression1:Expression space  Comma space Expression2:Expression space ")")

			SubstringExpression = SubstringExpression:(SubstringExpressionA/SubstringExpressionB) {return {SubstringExpression:SubstringExpression}}

			SubstringExpressionA = (("SUBSTRING" / "SUBSTR" ) "(" space Expression1:Expression space  "," space Expression2:Expression  "," space Expression3:Expression  space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			SubstringExpressionB = (("SUBSTRING" / "SUBSTR" ) "(" space Expression1:Expression space  "," space Expression2:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2}}

			SubstringBifExpression = SubstringBifExpression:(SubstringBifExpressionA/SubstringBifExpressionB) {return {SubstringBifExpression:SubstringBifExpression}}

			SubstringBifExpressionA = (("bif:SUBSTRING" / "bif:SUBSTR" ) "(" space Expression1:Expression space  "," space Expression2:Expression "," space Expression3:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			SubstringBifExpressionB = (("bif:SUBSTRING" / "bif:SUBSTR" ) "(" space Expression1:Expression space  "," space Expression2:Expression space ")")  {return {Expression1:Expression1, Expression2:Expression2}}

			StrReplaceExpression = StrReplaceExpression:(StrReplaceExpressionA/StrReplaceExpressionB) {return {StrReplaceExpression:StrReplaceExpression}}

			StrReplaceExpressionA = ("REPLACE" "(" space Expression1:Expression space  "," space Expression2:Expression "," space Expression3:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			StrReplaceExpressionB = ("REPLACE" "(" space Expression1:Expression space  "," space Expression2:Expression space ")")  {return {Expression1:Expression1, Expression2:Expression2}}

			ExistsFunc = ExistsFunc:(ExistsFuncA1 / ExistsFuncA /ExistsFuncB)  {return {ExistsFunc:ExistsFunc}}

			ExistsFuncA1 = ("EXISTS" / "exists") space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}
			ExistsFuncA = ("EXISTS" / "exists") space Expression:GroupGraphPattern {return{Expression:Expression}}

			ExistsFuncB = "{" space Expression:GroupGraphPattern space "}"{return{Expression:Expression}}
			GroupGraphPattern = (Expression)

			NotExistsFunc = NotExistsFunc:(NotExistsFuncA / NotExistsFuncB1 /NotExistsFuncB / NotExistsFuncC1/ NotExistsFuncC) {return {NotExistsFunc:NotExistsFunc}}

			NotExistsFuncA = ("NOT" / "not") space  "{" space Expression:GroupGraphPattern space "}" {return{Expression:Expression}}

			NotExistsFuncB = ("NOT" / "not") space  ("EXISTS" / "exists") space Expression:GroupGraphPattern {return{Expression:Expression}}
			NotExistsFuncB1 = ("NOT" / "not") space  ("EXISTS" / "exists") space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}

			NotExistsFuncC = ("NOT" / "not") space Expression:GroupGraphPattern {return{Expression:Expression}}
			NotExistsFuncC1 = ("NOT" / "not") space "(" space Expression:GroupGraphPattern ")" {return{Expression:Expression}}

			// ExpressionList = (NIL / "(" space Expression space  ( "," space Expression )* space ")" )

			ExpressionList2 = (NIL / "(" space Expression space  ( Comma space Expression )* space ")" )
			ExpressionList3 = ("{" space Expression space  ( Comma space Expression )* space "}" )
			ExpressionList4 = ("{" space IntStart:INTEGER space ".." space IntEnd:INTEGER space "}" ) {return transformExpressionIntegerScopeToList(IntStart, IntEnd)}
			
			Comma = Comma:"," {return {Comma:Comma}}

			LANGTAG = "@" string

			RDFLiteralC = String:StringQuotes {return {String:makeVar(String)}}

			iri = (IRIREF: IRIREF / PrefixedName: PrefixedName)

			IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / [0-9])* ">") {return {IRIREF:IRIREF}}

			PrefixedName = PrefixedName:(PNAME_LN / PNAME_NS) {return {PrefixedName:makeVar(PrefixedName)}}

			PNAME_NS = PN_PREFIX? ":"

			PNAME_LN = PNAME_NS PN_LOCAL

			PN_PREFIX = Chars_String

			PN_LOCAL = Chars_String



			iriOrFunction = iriOrFunctionA / iriOrFunctionB

			iriOrFunctionA = iri:iri ArgList:ArgList {return {iri:iri, ArgList:ArgList}}

			iriOrFunctionB = iri:iri {return {iri:iri}}

			ArgList = ArgListA / ArgListB / NIL

			ArgListA = ("(" space DISTINCT: "DISTINCT" space ArgListExpression: ArgListExpression space ")" ) {return {DISTINCT:DISTINCT, ArgListExpression:ArgListExpression}}

			ArgListB = ("(" space ArgListExpression: ArgListExpression space ")" {return {ArgListExpression:ArgListExpression}})
			NIL = "("  ")" {return}

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
			Var = Var:(VAR1 / VAR2) {return {VariableName:makeVar(Var)}}
			VAR1 = "?" VARNAME
			VAR2 = "$" VARNAME
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			StringQuotes = STRING_LITERAL1  / STRING_LITERAL2
			STRING_LITERAL1 = "'" string "'"
			STRING_LITERAL2 = '"' string '"'
			// QName = QNameB / QNameA
			QName = QNameB:QNameB {return pathOrReference(QNameB)}
			//!!!!!!QNameA = (Reference: Reference "." PrimaryExpression:PrimaryExpression2 ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {Reference:Reference, PrimaryExpression:PrimaryExpression, ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			// QNameB = (Path:path+ PrimaryExpression:PrimaryExpression2 ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {Path:Path, PrimaryExpression:PrimaryExpression, ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			QNameB = (Path:path+ PrimaryExpression:PrimaryExpression2 ReferenceToClass: ReferenceToClass? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {Path:Path, PrimaryExpression:PrimaryExpression, ReferenceToClass: ReferenceToClass, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			//!!!!!!Reference= Chars_String:Chars_String {return makeVar(Chars_String)} // referenceta klase
			path =(path2:path2 ".") {return {path:path2}}
			path2 =(invPath1 / (invPath2) / (invPath3))
			invPath1 = ("INV(" Chars_String:Chars_String ")") {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}} // atributs vai associacija
			invPath2 = ("^" Chars_String:Chars_String) {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}} // atributs vai associacija
			invPath3 = (Chars_String:Chars_String) {return {name:makeVar(Chars_String), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}} // atributs vai associacija
			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			// LName = (LName: Chars_String Substring:Substring ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}, Substring:makeVar(Substring), ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LName = (LName: Chars_String Substring:Substring ReferenceToClass: ReferenceToClass? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}, Substring:makeVar(Substring), ReferenceToClass: ReferenceToClass, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
																																																			//atributs vai associacija
			LN =((LNameINV / LNameINV2 / LName) )
			LNameINV2 = ("^" LNameSimple )
			Substring = ("[" (INTEGER ("," space INTEGER)?) "]")?
			LNameSimple = (LName: Chars_String Substring:Substring){return {var:{name:makeVar(LName), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName))}, Substring:makeVar(Substring)}}
																			//atributs vai associacija

			// ValueScope = (space "<-" space "{" ValueScope:((INTEGER ".." INTEGER) / (INTEGER ("," space INTEGER)*)) "}") {return {ValueScope:ValueScope}}
			// LNameINV = (INV: "INV" "(" LName:LNameSimple ")" ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {INV:INV, var:makeVar(LName), ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LNameINV = (INV: "INV" "(" LName:LNameSimple ")" ReferenceToClass: ReferenceToClass? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {INV:INV, var:makeVar(LName), ReferenceToClass: ReferenceToClass, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LName2 = (LName: Chars_String Substring:Substring) {return {var:{name:makeVar(LName), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName))}, Substring:makeVar(Substring)}}
																		//atributs vai associacija
			Relation = "=" / "!=" /  "<=" / ">=" /"<" / ">" / "<>"
			space = ((" ")*) {return }
			string = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$])+) {return {string: string.join("")}}

			LikeExpression = ('LIKE' space string:(likeString1 / likeString2)) {return string}
			likeString1 = ('"' start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? '"') {return {string: makeVar(string), start:start, end:end}}
			likeString2 = ("'" start:"%"? string:([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ end:"%"? "'") {return {string: makeVar(string), start:start, end:end}}

			ReferenceToClass = (" : " Class:Chars_String) {return {name:makeVar(Class),type:resolveTypeFromSchemaForClass(makeVar(Class))}}
																		//klase
			BetweenExpression = ('BETWEEN' space '(' space BetweenExpressionL:NumericExpression space Comma space BetweenExpressionR:NumericExpression ')') {return {BetweenExpressionL:BetweenExpressionL, BetweenExpressionR:BetweenExpressionR}}
