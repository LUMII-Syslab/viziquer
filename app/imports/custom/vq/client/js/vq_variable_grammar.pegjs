

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
			// returns type of the identifier from schema assuming that it is name of the class. Null if does not exist
			async function resolveTypeFromSchemaForClass(id) {
				var cls = await dataShapes.resolveClassByName({name: id})
				if(cls["complete"] == false) return null;
				if(cls["data"].length > 0){
					return cls["data"][0];
				}
				
				return null;
			};
			// string -> idObject
			// returns type of the identifier from schema assuming that it is name of the property (attribute or association). Null if does not exist
			async function resolveTypeFromSchemaForAttributeAndLink(id) {
				
				var aorl = await dataShapes.resolvePropertyByName({name: id})
				if(aorl["complete"] == false) return null;
				var res = aorl["data"][0];
				if(res){
					if(res["data_cnt"] > 0 && res["object_cnt"] > 0) res["property_type"] = "DATA_OBJECT_PROPERTY";
					else if(res["data_cnt"] > 0) res["property_type"] = "DATA_PROPERTY";
					else if(res["object_cnt"] > 0) res["property_type"] = "OBJECT_PROPERTY";
					return res;
				}
				
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

			
			async function checkIfVariable(Variable) {
				var v=makeVar(Variable)
				if(await resolveType(v) == null ) return v.replace(/-/g, " - ");
				return Variable;
			};
			
		}

			Grammar = (Main:Main) {return makeVar(Main)}
			Main = (AllElse (Expression AllElse)*)
			AllElse = ([^A-Za-z0-9:_-] / [0-9] / "-" )*
			//Expression = IRIREF / PrefixedName
			Expression = PrefixedName:(PNAME_NS? Variable StringLang?) {return checkIfVariable(makeVar(PrefixedName))}
			//IRIREF = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])+ ">") {return makeVar(IRIREF)}
			PNAME_NS = Prefix:(PN_PREFIX? ":") {return makeVar(Prefix)}
			Variable = Variable:(Chars_String_variables / Chars_String_prefix) {return makeVar(Variable)}
			Chars_String_variables = ("[" Chars_String_variables:Chars_String_prefix "]") {return Chars_String_variables}
			PN_PREFIX = Chars_String_prefix
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-"/ [0-9])*)
			StringLang =StringLang:( "@" [a-zA-ZāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] ('-' / [a-zA-Z0-9āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ])*) {return makeVar(StringLang)}