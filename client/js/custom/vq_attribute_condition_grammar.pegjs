

	  {
		options = arguments[1];
		function makeVar(o) {
		  var expression = makeString(o);
		  if(!isNaN(expression)) return expression;
		  return '"'+ expression + '"';
		};
		function insertVariable(o) {return options.variable};
		function makeExpression(o) {return makeString(o)};

	  }
	
	ConditionGrammar = Condition:(space Condition ( space comma space Condition)*){return makeExpression(Condition)}
	Condition = Variable Condition:((Relation / nil) space (Literal/QuotedLiteralA/QuotedLiteralB))
	Relation = Relation:("=" / "!=" / "<>" / "<=" / ">=" /"<" / ">" / "!") {return Relation}
	Literal =  Literal:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / "_" / "-"/ " ") (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]  / [0-9] / "_" / "-"/ " ]"))*){return makeVar(Literal)}
	QuotedLiteralA =  '"' Literal:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / "_" / "-"/ " ") (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]  / [0-9] / "/" / "_" / "-"/ " ]"))*) '"'{return makeVar(Literal)}
	QuotedLiteralB =  "'" Literal:(([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / "_" / "-"/ " ") (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]  / [0-9] / "/" / "_" / "-"/ " ]"))*) "'"{return makeVar(Literal)}
	Variable = "" {return insertVariable()}
	comma =  (",") {return " AND "}
	space = ((" ")*) {return " "}
	nil = "" {return " = "}
