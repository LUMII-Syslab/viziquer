

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
			options = arguments[1];
			//console.log(options);

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
			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
			function resolveTypeFromSchemaForClass(id) {return options.schema.resolveClassByName(id) };
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
			function resolveTypeFromSchemaForAttributeAndLink(id) {
				var aorl = options.schema.resolveAttributeByNameAndClass(options.context["localName"], id);
				var res = aorl[0];
				if (!res) { res = options.schema.resolveLinkByName(id)}
				else {
						res["parentType"] = aorl[1];
				};
				return res
			};
			// string -> idObject
			// returns type of the identifier from schema. Looks everywhere. First in the symbol table,
			// then in schema. Null if does not exist
			function resolveType(id) {var t=resolveTypeFromSymbolTable(id); if (!t) {t=resolveTypeFromSchemaForClass(id); if (!t) {t=resolveTypeFromSchemaForAttributeAndLink(id)}} return t;};

			
			function checkIfVariable(Variable) {
				var v=makeVar(Variable)
				if(resolveType(v) == null ) return v.replace(/-/g, " - ");
				return Variable;
			};
			
		}

			Grammar = (Main:Main) {return makeVar(Main)}
			Main = (AllElse (Expression AllElse)*)
			AllElse = ([^A-Za-z0-9:_-] / [0-9] / "-" )*
			//Expression = IRIREF / PrefixedName
			Expression = PrefixedName:(PNAME_NS? Variable) {return checkIfVariable(makeVar(PrefixedName))}
			//IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])+ ">") {return makeVar(IRIREF)}
			PNAME_NS = Prefix:(PN_PREFIX? ":") {return makeVar(Prefix)}
			Variable = Variable:(Chars_String_variables / Chars_String_prefix) {return makeVar(Variable)}
			Chars_String_variables = ("[" Chars_String_variables:Chars_String_prefix "]") {return Chars_String_variables}
			PN_PREFIX = Chars_String_prefix
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-"/ [0-9])*)
			