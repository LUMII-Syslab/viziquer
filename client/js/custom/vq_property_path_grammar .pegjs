

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
      options = arguments[1];
			//console.log(options);

			function makeVar(o) {return makeString(o);};
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
			function resolveTypeFromSchemaForAttributeAndLink(id) {var aorl = options.schema.resolveAttributeByName(null,id); if (!aorl) { aorl = options.schema.resolveLinkByName(id)}; return aorl};
	
		}

			Main = (PrimaryExpression:(PPE / PE)) {return {PrimaryExpression:PrimaryExpression}}
			PPE = (Path:path+ PrimaryExpression:LName) {return {Path:Path, PrimaryExpression:PrimaryExpression}}
			PE = (PrimaryExpression:LName) {return {PrimaryExpression:PrimaryExpression}}
			LName = (LName: Chars_String) {return {var:{name:makeVar(LName), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(LName))}}}
			path =(path2:path2 ".") {return {path:path2}}
			path2 =(invPath1 / (invPath2) / (invPath3))
			invPath1 = ("INV(" Chars_String:Chars_String ")") {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}
			invPath2 = ("^" Chars_String:Chars_String) {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}
			invPath3 = (Chars_String:Chars_String) {return {name:makeVar(Chars_String), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}
			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / [0-9])*)
			