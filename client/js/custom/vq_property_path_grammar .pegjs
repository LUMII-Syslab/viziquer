

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
							if (resolveTypeFromSchemaForAttributeAndLink(id)) {
							    k="PROPERTY_NAME";
						  } else if (resolveTypeFromSchemaForClass(id)) {
								  k="CLASS_NAME";
							}
					  }
						return k;
			};
		}

			Main = (space PrimaryExpression:(iri / PPE / VAR / "??" ) space) {return {PrimaryExpression:PrimaryExpression}}

			iri = iri:PrefixedName {return {iri:iri}}
			PrefixedName = PrefixedName:(PNAME_LN) {return {PrefixedName:PrefixedName}}
			PNAME_NS = Prefix:(PN_PREFIX? ":") {return makeVar(Prefix)}
			PNAME_LN = (LName:(PNAME_NS  Chars_String_prefix)) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			PN_PREFIX = Chars_String_prefix
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)

			VAR = Var:(("??" / "?") VARNAME){return {VariableName:makeVar(Var)}}
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)

			PPE = (Path:path+ ) {return {Path:Path}}
			path =(path2:path2 "."?) {return {path:path2}}
			path2 =(invPath1 / (invPath2) / (invPath3))
			invPath1 = ("INV(" Chars_String:Chars_String ")") {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}
			invPath2 = ("^" Chars_String:Chars_String) {return {inv:"^", name:(makeVar(Chars_String)), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}
			invPath3 = (Chars_String:Chars_String) {return {name:makeVar(Chars_String), type:resolveTypeFromSchemaForAttributeAndLink(makeVar(Chars_String))}}

			Chars_String = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_"/ "-" / "+" / "=") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-"/ "+" / "="/ [0-9])*)
			space = ((" ")*) {return }
