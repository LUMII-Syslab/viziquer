

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
				var context = options.context;
				
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
			// returns kind of the identifier from symbol table. Null if does not exist.
			function resolveKindFromSymbolTable(id) { 
				var context = options.context;
				
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
			};
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

			    
			
			Path = (space PathProperty:(PathAlternative / VAR / "++"/ "==") space) {return {PathProperty:PathProperty}}
			PathAlternative = PathAlternative:(PathSequence (space VERTICAL space PathSequence)*) {return {PathAlternative:PathAlternative}}
			PathSequence = PathSequence:(PathEltOrInverse (PATH_SYMBOL PathEltOrInverse)* ){return {PathSequence:PathSequence}}
			PathEltOrInverse = PathEltOrInverse:(PathElt3 / PathElt1 / PathElt2) {return {PathEltOrInverse:PathEltOrInverse}}
			PathElt1 = PathElt:PathElt {return {inv:"", PathElt:PathElt}}
			PathElt2 = "^" PathElt:PathElt {return {inv:"^", PathElt:PathElt}}
			PathElt3 = "inv"i "(" (PathElt:PathElt) ")" {return {inv:"^", PathElt:PathElt}}
			PathElt = PathPrimary:PathPrimary PathMod:PathMod? {return {PathPrimary:PathPrimary, PathMod:PathMod}}
			PathPrimary =  ("!" PathNegatedPropertySet)/ DoubleSquareBracketName/ iri / (BRACKET:"(" space Path space ")")  / LName/ "a" 
			PathNegatedPropertySet = PathNegatedPropertySet:(PathNegatedPropertySet2 / PathNegatedPropertySet1){return {PathNegatedPropertySet:PathNegatedPropertySet}}
			PathNegatedPropertySet1 = PathOneInPropertySet:PathOneInPropertySet {return {PathOneInPropertySet:PathOneInPropertySet}}
			PathNegatedPropertySet2 = PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted {return {PathNegatedPropertySetBracketted:PathNegatedPropertySetBracketted}}
			PathNegatedPropertySetBracketted = ("(" (space PathOneInPropertySet (space VERTICAL space PathOneInPropertySet)*)? space ")")
			PathOneInPropertySet = PathOneInPropertySet3 / PathOneInPropertySet1 / PathOneInPropertySet2
			PathOneInPropertySet1 = iriOra:(DoubleSquareBracketName / iri  /LName/ 'a') {return {inv:"", iriOra:iriOra}}
			PathOneInPropertySet2 = "^" iriOra:(DoubleSquareBracketName / iri  /LName/ 'a') {return {inv:"^", iriOra:iriOra}}
			PathOneInPropertySet3 = "inv"i "(" iriOra:(DoubleSquareBracketName / iri/ LName/ 'a' ) ")" {return {inv:"^", iriOra:iriOra}}
			PathMod = ("?" / "*" / "+")
			
			iri = IRIREF / PrefixedName
			PrefixedName = PrefixedName:(PNAME_LN / PNAME_NS) {return {PrefixedName:PrefixedName}}
			IRIREF  = IRIREF:("<" ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / ":" / "." / "#" / "/" / "-" / [0-9])* ">") {return {IRIREF:makeVar(IRIREF)}}
			PNAME_NS = Prefix:(PN_PREFIX? ':') {return makeVar(Prefix)}
			PNAME_LN = (PNAME_NS:PNAME_NS  LName:Chars_String_prefix) {return {var:{name:makeVar(LName),type:resolveType(makeVar(PNAME_NS)+makeVar(LName)), kind:resolveKind(makeVar(PNAME_NS)+makeVar(LName))}, Prefix:PNAME_NS}}
			LName = (LName:(Chars_String_prefix)) {return {var:{name:makeVar(LName),type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			PN_PREFIX = Chars_String_prefix
			
			DoubleSquareBracketName = LName:(squarePrefix? squareVariable) {return {var:{name:makeVar(LName), type:resolveType(makeVar(LName)), kind:resolveKind(makeVar(LName))}}}
			squarePrefix = Chars_String_prefix ":"
			squareVariable = "["  Chars_String_square  "]"
			
			VAR = Var:(("??" / "?") VARNAME){return {VariableName:makeVar(Var)}}
			VARNAME = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])*)
			
			Chars_String_square = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / [0-9] / "_") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "." / " "/ "/" / "-" / "(" / ")" / [0-9])*)
			Chars_String_prefix = (([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-") ([A-Za-zāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ] / "_" / "-" / [0-9])* (("..") [0-9]*)?)
			space = ((" ")*) {return }
			
			VERTICAL = "|" {return {Alternative:"|"}}
			PATH_SYMBOL = ("/" / ".") {return {PathSymbol :"/"}} 
			
