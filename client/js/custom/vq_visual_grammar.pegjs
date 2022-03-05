{
	function makeVar(o) {return makeString(o);};
	function makeVarVariable(o) {
		var variable =  makeString(o);
		if(variable.startsWith("_") == true) variable = variable.substring(1);
		return variable;
	};
	function makeIRI(o) {
		var iri = makeString(o);
		if(iri.startsWith("http://www.w3.org/1999/02/22-rdf-syntax-ns#")) return "rdf:" + iri.substring(43);
		else if(iri.startsWith("http://www.w3.org/2001/XMLSchema#")) return "xsd:" + iri.substring(33);
		return "<"+iri+">";
	};
}

	Main = (Var / NumberValue / BooleanLiteral / RDFLiteral / StringQuotes  / IRIREFName)
	//Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
	space = ((" ")*) {return }
	Var = (VAR_All / VAR1 / VAR2 / VAR3) 
	VAR1 = "?" Var:VARNAME {return {value:makeVarVariable(Var), type:"varName"}}
	VAR2 = "$" Var:VARNAME {return {value:makeVarVariable(Var), type:"varName"}}
	VAR3 = "_:" Var:VARNAME {return {value:"_"+makeVar(Var), type:"varName", isBlankNode:"true"}}
	VAR_All = "*" {return {value:"*", type:"varName"}}
	VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
	
	NumberValue = Number:Number "^^" iri:IntegerIRI {return {value:makeVar(Number), type:"number"}}
	
	BooleanLiteral = BooleanLiteral:(TRUE/ FALSE) "^^" BooleanIRI {return {value:makeVar(BooleanLiteral), type:"boolean"}}
			
	TRUE = ("'" "true"i "'") / ('"' "true"i '"' ) {return "true"}
	FALSE = ("'" "false"i "'") / ('"' "false"i '"' ) {return "false"}
	
	StringQuotes = StringQuotes:(STRING_LITERAL1  / STRING_LITERAL2) {return {value:makeVar(StringQuotes), type:"string"}}
	STRING_LITERAL1 = "'" stringEmpty "'"
	STRING_LITERAL2 = '"' stringEmpty '"'
	string = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:;, ^$/*=()] / "[" / "]")+)
	stringEmpty = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:;, ^$/*=()&] / "[" / "]" / "\\")*)
	
	IntegerIRI = "http://www.w3.org/2001/XMLSchema#integer" / "http://www.w3.org/2001/XMLSchema#double";
	BooleanIRI = "http://www.w3.org/2001/XMLSchema#boolean";
	
	Number = Number1 / Number2
	Number1 = "'" Number:[0-9eE]+ "'" {return Number}
	Number2 = '"' Number:[0-9eE]+ '"' {return Number}
	
	RDFLiteral = (RDFLiteral:(RDFLiteralA/RDFLiteralB/RDFLiteralC/RDFLiteralD/RDFLiteralE)) {return {value:makeVar(RDFLiteral), type:"RDFLiteral"}}
	RDFLiteralA = String:((STRING_LITERAL1  / STRING_LITERAL2) LANGTAG) {return makeVar(String)}
	RDFLiteralC = String:((STRING_LITERAL1  / STRING_LITERAL2)) "^^" iri:"http://www.w3.org/2001/XMLSchema#date" {return makeVar(String) + "^^xsd:date"}
	RDFLiteralB = String:((STRING_LITERAL1  / STRING_LITERAL2)) "^^" iri:"http://www.w3.org/2001/XMLSchema#dateTime" {return makeVar(String) + "^^xsd:dateTime"}
	RDFLiteralD = String:((STRING_LITERAL1  / STRING_LITERAL2)) "^^" iri:"http://www.w3.org/2001/XMLSchema#string" {return makeVar(String)}
	RDFLiteralE = String:((STRING_LITERAL1  / STRING_LITERAL2)) "^^" iri:iri {return makeVar(String) + "^^" +makeIRI(iri)}
	
	LANGTAG = "@" string
	
	IRIREFName = IRIREF:(("http://" / "https://")([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "%" / "(" / ")" / "/" / "'" / "-" / "," / "\\" / [0-9])*) {return {value:makeVar(IRIREF), type:"iri"}}
	
	iri = (IRIREF: IRIREF / PrefixedName: PrefixedName)
	//IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / [0-9])* ">") {return makeVar(IRIREF)}
	IRIREF = IRIREF:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" /"-" / [0-9])*) {return makeVar(IRIREF)}
	PrefixedName = PrefixedName:(PNAME_LN) {return {PrefixedName:PrefixedName}}
	PNAME_NS = Prefix:(PN_PREFIX? ":") {return makeVar(Prefix)}
	PNAME_LN = (LName:(PNAME_NS  Chars_String)) {return makeVar(LName)}
	PN_PREFIX = Chars_String_prefix
	Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
	Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			

			
			
			
			
			
			