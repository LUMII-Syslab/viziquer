
			{
				// parse can have multiple arguments
				// parse(string, options) where options is an object
				// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
        //options = arguments[1];
				//console.log(options);

				function makeVar(o) {
        return makeString(o);
      }}

			Main = (Expression space)
			Expression = (OrExpression:OrExpression) {return {OrExpression: OrExpression}}

			OrExpression = (ANDExpression ( space OR space ANDExpression )*)

			OR = "OR" {return}

			ANDExpression = ANDExpression:ANDExpressionA {return {ANDExpression: ANDExpression}}

			ANDExpressionA = (ConditionalOrExpressionA ( space AND space ConditionalOrExpressionA )*)

			AND = "AND" {return}

			ConditionalOrExpressionA = (ConditionalOrExpression:ConditionalOrExpression){return {ConditionalOrExpression: ConditionalOrExpression}}

			ConditionalOrExpression = (ConditionalAndExpression  ( space OROriginal space ConditionalAndExpression )*)

			OROriginal = OROriginal:"||" {return {OROriginal:OROriginal}}

			ConditionalAndExpression = (ConditionalAndExpression:ValueLogicalA) {return {ConditionalAndExpression:ConditionalAndExpression}}

			ValueLogicalA = (ValueLogical (space ANDOriginal space ValueLogical )*)

			ANDOriginal = ANDOriginal:"&&" {return {ANDOriginal:ANDOriginal}}

			ValueLogical = (RelationalExpression:RelationalExpression){return {RelationalExpression:RelationalExpression}}

			RelationalExpression = RelationalExpressionC / RelationalExpressionB / RelationalExpressionA

			RelationalExpressionA = (NumericExpressionL:NumericExpression {return {NumericExpressionL:NumericExpressionL}})

			RelationalExpressionB = (NumericExpressionL:NumericExpression (space Relation:Relation space NumericExpressionR:NumericExpression)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, NumericExpressionR:NumericExpressionR}}

			RelationalExpressionC = (NumericExpressionL:NumericExpression (space Relation:("IN" / NOTIN) space ExpressionList:ExpressionList2)) {return {NumericExpressionL:NumericExpressionL, Relation:Relation, ExpressionList:ExpressionList}}

			NOTIN = Not:("NOT" space"IN") {return Not.join("")}

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

			Aggregate = Aggregate:(AggregateA / AggregateB / AggregateC / AggregateD / AggregateE / AggregateF) {return {Aggregate:Aggregate}} //!!!!!!!!!!!!!!!!

			AggregateA = Aggregate: ("COUNT" / "SUM" / "MIN" / "MAX" / "AVG" / "SAMPLE") "(" DISTINCT:"DISTINCT" space Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateB = Aggregate: ("COUNT" / "SUM" / "MIN" / "MAX" / "AVG" / "SAMPLE") "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			AggregateC = Aggregate: ("GROUP_CONCAT") "(" DISTINCT:"DISTINCT" space Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateD = Aggregate: ("GROUP_CONCAT") "(" space Expression: Expression space SEPARATOR:SEPARATOR")" {return {Aggregate:Aggregate, Expression:Expression, SEPARATOR:SEPARATOR}}

			AggregateE = Aggregate: ("GROUP_CONCAT") "(" DISTINCT:"DISTINCT" space Expression: Expression space ")" {return {Aggregate:Aggregate, DISTINCT:DISTINCT, Expression:Expression}}

			AggregateF = Aggregate: ("GROUP_CONCAT") "(" space Expression: Expression space ")" {return {Aggregate:Aggregate, Expression:Expression}}

			SEPARATOR = SEPARATOR:( (";" space "SEPARATOR" "=" SEPARATOR: (StringQuotes) ) / ("," space SEPARATOR:(StringQuotes))) {return makeVar(SEPARATOR)} // " " ", "

			FunctionExpression = FunctionExpression: (FunctionExpressionA / FunctionExpressionB / FunctionExpressionC) {return {FunctionExpression:FunctionExpression}}

			FunctionExpressionA = Function:("STR" / "LANG" / "DATATYPE" / "IRI" / "URI" / "ABS" / "CEIL" / "FLOOR" / "ROUND" / "STRLEN" / "UCASE" /
					 "LCASE" / "ENCODE_FOR_URI" / "YEAR" / "MONTH" / "DAY" / "TIMEZONE" / "TZ" / "MD5" / "SHA1" / "SHA256" / "SHA512" / "isIRI" /
					"isURI" / "isBLANK" / "dateTime" / "date" / "isLITERAL" / "isNUMERIC") "(" space Expression: Expression space ")" {return {Function:Function, Expression:Expression}}

			FunctionExpressionB = Function:("LANGMATCHES" / "CONTAINS" / "STRSTARTS" / "STRENDS" / "STRBEFORE" / "STRAFTER" / "STRLANG" / "STRDT" / "sameTerm") "(" space Expression1:Expression space "," space Expression2:Expression space ")" {return {Function:Function, Expression1:Expression1, Expression2:Expression2}}

			FunctionExpressionC = FunctionTime: ("days" / "years" / "months" / "hours" / "minutes" / "seconds") "(" space PrimaryExpressionL: PrimaryExpression "-" PrimaryExpressionR: PrimaryExpression space ")" {return {FunctionTime:FunctionTime, PrimaryExpressionL:PrimaryExpressionL, PrimaryExpressionR:PrimaryExpressionR}}

			HASMAX = (HASMAX:'HASMAX' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASMAX, SpecialExpression:SpecialExpression}}
			HASRANK = (HASRANK:'HASRANK' '(' space SpecialExpression: SpecialExpression space ')') {return {Function:HASRANK, SpecialExpression:SpecialExpression}}

			SpecialExpression = (PrimaryExpression space "DESC"? (space "|" space ("GLOBAL" / ("FOR" / "BY")? space Expression) (space "|" space "WHERE" space Expression)?)?)

			//SpecialExpression = (PrimaryExpression:PrimaryExpression space "|" space (('FOR' space PrimaryExpression (space '|' space 'WHERE' space Expression)?) / Expression) )

			RegexExpression = RegexExpression:(RegexExpressionA / RegexExpressionB) {return {RegexExpression:RegexExpression}}

			//RegexExpressionA = ("REGEX" "(" space Expression1:Expression space  Comma space Expression2:Expression ( Comma space Expression3:Expression ) space ")") {return {Expression1:Expression1, Expression2:Expression2, Expression3:Expression3}}

			RegexExpressionA = ("REGEX" "(" space Expression1:Expression space  Comma space Expression2:Expression ( Comma space Expression3:Expression ) space ")")

			//RegexExpressionB = ("REGEX" "(" space Expression1:Expression space  Comma space Expression2:Expression space ")") {return {Expression1:Expression1, Expression2:Expression2}}

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

			ExistsFunc = ExistsFunc:(ExistsFuncA /ExistsFuncB)  {return {ExistsFunc:ExistsFunc}}

			ExistsFuncA = "EXISTS" space Expression:GroupGraphPattern {return{Expression:Expression}}

			ExistsFuncB = "{" space Expression:GroupGraphPattern space "}"{return{Expression:Expression}}
			GroupGraphPattern = (Expression)

			NotExistsFunc = NotExistsFunc:(NotExistsFuncA / NotExistsFuncB / NotExistsFuncC) {return {NotExistsFunc:NotExistsFunc}}

			NotExistsFuncA = "NOT" space  "{" space Expression:GroupGraphPattern space "}" {return{Expression:Expression}}

			NotExistsFuncB = "NOT" space  "EXISTS" space Expression:GroupGraphPattern {return{Expression:Expression}}

			NotExistsFuncC = "NOT" space Expression:GroupGraphPattern {return{Expression:Expression}}

			ExpressionList = (NIL / "(" space Expression space  ( "," space Expression )* space ")" )// -> {}

			ExpressionList2 = (NIL / "(" space Expression space  ( Comma space Expression )* space ")" )
			Comma = Comma:"," {return {Comma:Comma}}

			LANGTAG = "@" string

			RDFLiteralC = String:StringQuotes {return {String:makeVar(String)}}

			iri = (IRIREF: IRIREF / PrefixedName: PrefixedName)

			IRIREF = IRIREF:("<" ([A-Za-z] / "_" / ":" / "." / "#" / "/" / [0-9])* ">") {return {IRIREF:IRIREF}}/////////////////////////// Apvienot

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
			Var = Var:(VAR1 / VAR2) {return {Var:makeVar(Var)}}
			VAR1 = "?" VARNAME
			VAR2 = "$" VARNAME
			VARNAME = (([A-Za-z] / "_") ([A-Za-z] / "_" / [0-9])*)
			StringQuotes = STRING_LITERAL1  / STRING_LITERAL2
			STRING_LITERAL1 = "'" string "'"
			STRING_LITERAL2 = '"' string '"'
			QName = QNameA / QNameB
			QNameA = (Reference: Reference "." PrimaryExpression:PrimaryExpression2 ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {Reference:Reference, PrimaryExpression:PrimaryExpression, ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			QNameB = (Path:path PrimaryExpression:PrimaryExpression2 ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {Path:Path, PrimaryExpression:PrimaryExpression, ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			Reference= Chars_String:Chars_String {return makeVar(Chars_String)} //=> fn_reference
			path =path:((("INV(" Chars_String ")" / ("^"? Chars_String )) ".")+) {return makeVar(path)}
			Chars_String = (([A-Za-z] / "_") ([A-Za-z] / "_" / [0-9])*)
			LName = (LName: Chars_String Substring:Substring ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {var:"?" + makeVar(LName), type:"BBB", Substring:makeVar(Substring), ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}// -> fn_lname
			LN =((LNameINV / LNameINV2 / LName) )
			LNameINV2 = ("^" LNameSimple )
			Substring = ("[" (INTEGER ("," space INTEGER)?) "]")?
			LNameSimple = (LName: Chars_String Substring:Substring){return {var:"?" + makeVar(LName), Substring:makeVar(Substring)}}

			// ValueScope <- (space "<-" space "(" {((INTEGER ".." INTEGER) / (INTEGER ("," space INTEGER)*))} ")") -> {}
			ValueScope = (space "<-" space "{" ValueScope:((INTEGER ".." INTEGER) / (INTEGER ("," space INTEGER)*)) "}") {return {ValueScope:ValueScope}}
			LNameINV = (INV: "INV" "(" LName:LNameSimple ")" ReferenceToClass: ReferenceToClass? ValueScope: ValueScope? space FunctionBETWEEN: BetweenExpression? FunctionLike: LikeExpression?) {return {INV:INV, var:makeVar(LName), ReferenceToClass: ReferenceToClass, ValueScope: ValueScope, FunctionBETWEEN:FunctionBETWEEN, FunctionLike:FunctionLike}}
			LName2 = (LName: Chars_String Substring:Substring) {return {var:"?" + makeVar(LName), Substring:makeVar(Substring)}}  // -> fn_lname2
			Relation = "=" / "!=" /  "<=" / ">=" /"<" / ">" / "<>"
			space = ((" ")*) {return }
			string = string:(([A-Za-z] / [0-9] / "_")+) {return {string: string.join("")}}

			LikeExpression = ('LIKE' space (likeString1 / likeString2))
			likeString1 = ('"' string:("%"? ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ "%"?) '"') {return {string: makeVar(string)}}
			likeString2 = ("'" string:("%"? ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])+ "%"?)  "'"){return {string: makeVar(string)}}

			ReferenceToClass = (" : " Class:Chars_String) {return {Class: makeVar(Class)}}
			BetweenExpression = ('BETWEEN' ExpressionList2)
