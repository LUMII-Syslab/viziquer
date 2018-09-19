{
	function makeVar(o) {return makeString(o);};
}

	Main = (Var / NumberValue / StringQuotes / IRIREF)
	//Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
	space = ((" ")*) {return }
	Var = (VAR1 / VAR2) 
	VAR1 = "?" Var:VARNAME {return {value:makeVar(Var), type:"varName"}}
	VAR2 = "$" Var:VARNAME {return {value:makeVar(Var), type:"varName"}}
	VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
	
	NumberValue = Number:Number "^^" iri:IntegerIRI {return {value:makeVar(Number), type:"number"}}
	
	StringQuotes = StringQuotes:(STRING_LITERAL1  / STRING_LITERAL2) {return {value:makeVar(StringQuotes), type:"string"}}
	STRING_LITERAL1 = "'" string "'"
	STRING_LITERAL2 = '"' string '"'
	string = string:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / [-_.:, ^$])+)
	
	IntegerIRI = "http://www.w3.org/2001/XMLSchema#integer";
	
	Number = Number1 / Number2
	Number1 = "'" Number:[0-9]+ "'" {return Number}
	Number2 = '"' Number:[0-9]+ '"' {return Number}
	
	IRIREF = IRIREF:(("http://" / "https://")([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])*) {return {value:makeVar(IRIREF), type:"iri"}}
			

			