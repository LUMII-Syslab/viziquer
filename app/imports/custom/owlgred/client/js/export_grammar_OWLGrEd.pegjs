{
	options = arguments[1];

	function makeVar(o) {return makeString(o);};
			
}
			
main
  = space? expressions:expression+ { return expressions; }

expression
  = axiomSymbols / axiom / filter / functionExpr / pathFunction / path / optional / mandatory / string

axiom
  = axiom: axiomExpr { return { axiom: axiom }; }

axiomExpr
  = string:string "(" space? expressions:(expression space?)+ ")" {
      return {
        string,
        expressions: expressions.map(e => e[0]) // Extract only the `expression` part
      };
    }


filter
  = filter: filterExprs { return { filter: filter }; }

filterExprs
  = "[" first:filterExpr rest:(space "||" space filterExpr)* "]" {
      // Collect all `filterExpr` instances into an array
      const allFilterExprs = [first, ...rest.map(r => r[3])];
      return allFilterExprs;
    }

filterExpr
  = filterItem1: filterItem space filterOp: filterOp space filterItem2:filterItem { 
      return { filterItem1: filterItem1, filterOp: filterOp, filterItem2: filterItem2 }; 
    }

filterItem
  = function
  / "'" stringFilteredItem "'" 
  / pathFunction 
  / path 
  / number 
  / "true" 
  / "false"

filterOp
  = "==" / "!=" / ">"

filterExpr2
  = "[" filterItem1:filterItem space filterOp:filterOp space filterItem2:filterItem "]" {
      return {
        filterItem1: filterItem1,
        filterOp: filterOp,
        filterItem2: filterItem2
      };
    }

pathFilter
  = path:path filter:filterExpr2 {
      return {
        path: path,
        filter: filter
      };
    }


path
  = path:pathBody { return { path: path }; }
  
pathBody
  = path:(("/" (string / ".." / filter))+) {
      // Extract the `pathBody` from each matched segment
      const pathBodies = path.map(path => path[1]);
      return pathBodies;
    }

pathFunction
  = path:pathBody ":" func:function {
      return {
        pathFunction: {
          path: path, // `path` is already structured as an array if your `path` rule is returning one
          function: func // `func` is the object returned by the `function` rule
        }
      };
    }

functionExpr
  = functionn: function { return { function:functionn }; }

function
  = getUri
  / getExpression
  / value
  / getClassExpr
  / getClassName
  / getObjectExpr
  / getAnnotationProperty
  / getRoleExpr
  / getHasKeyProperties
  / getAttributeType
  / getMultiplicity
  / getTypeExpression
  / getDomainOrRange
  / elemType
  / isEmpty
  / count
  / getContainer
  / getDataTypeRestriction
  / getDataTypeExpression
  / isURI

mandatory
  = "!" "(" expressions:mandatoryExpressions ")" filterExpr: filterExpr? { return { mandatory: {expressions:expressions, filterExpr:filterExpr} }; }

mandatoryExpressions
  = (space expression)+ 

optional
  = optionalExpressions / optionalfunctionExpr

optionalExpressions
  = "?" "(" space expressions:(expression space*)+ ")" {
      return {
        optional: {
          expressions: expressions.map(e => e[0]) // Extract only the first element from each match
        }
      };
    }

optionalfunctionExpr
  = "?" functionExpr:functionExpr {
      return {
        optional: {
          functionExpr: functionExpr
        }
      };
    }

axiomSymbols
  = ("^^" / "@" / (string ":" string) / "<" stringExtended+ "#" string ">") { return {axiomSymbol:text()}; }

stringExtended
  = [A-Za-z]+ / [0-9]+ / ":" / "/" / "."
 
string
   = [A-Za-z_]+ [A-Za-z0-9_+]* { return text(); }

stringFilteredItem
  = [A-Za-z!+: ]*{
      return text();
    }

number
  = "-"? [0-9]+

space
  = (" " / "\n")*

getUri
  = "$" "getUri" "(" name:uriName namespacePart:(space namespace:uriNamespace)? ")" {
      return {
        functionType: "getUri",
        name: name,
        namespace: namespacePart ? namespacePart[1] : null // Extract namespace if matched, otherwise null
      };
    }

uriName
  = ('"'  string '"') / function / path

uriNamespace
  = functionExpr / path

getExpression
  = "$" "getExpression" "(" name: expressionName ")" { return { functionType: "getExpression", name:name }; }

expressionName
  = function / path

value
  =  valueQuotes/ valuePath

valuePath
  = "$value" pathPart:("(" path:pathBody ")")? {
      return {
        functionType: "value",
        path: pathPart ? pathPart[1] : null  // Ensure path is extracted correctly
      };
    }

valueQuotes
  = '"' "$value" pathPart:("(" path:path ")")? '"' {
      return {
        functionType: "value",
        path: pathPart ? pathPart[1].path : null,  // Extract only the array, not the object
        inQuotes: true
      };
    }


getDomainOrRange
  = "$getDomainOrRange" pathPart:("(" path:pathBody ")")? {
      return {
        functionType: "getDomainOrRange",
        path: pathPart ? pathPart[1] : null // Extract `pathBody` if matched, else `null`
      };
    }

getClassExpr
  = "$getClassExpr" pathPart:("(" (pathFilter:pathFilter / path:path) ")")? {
      return {
        functionType: "getClassExpr",
        path: pathPart ? (pathPart[1] || null) : null // Extracts pathFilter or path, else null
      };
    }


getClassName
 = "$getClassName" pathPart:("(" (pathFilter:pathFilter / path:path) ")")? {
      return {
        functionType: "getClassName",
        path: pathPart ? (pathPart[1] || null) : null // Extracts pathFilter or path, else null
      };
    }

getObjectExpr
  = "$getObjectExpr" pathPart:("(" (pathFilter:pathFilter / path:path) ")")? {
      return {
        functionType: "getObjectExpr",
        path: pathPart ? (pathPart[1] || null) : null // Extracts pathFilter or path, else null
      };
    }

getAnnotationProperty
  = "$getAnnotationProperty(" name:uriName namespacePart:(space namespace:uriNamespace)? ")" {
      return {
        functionType: "getAnnotationProperty",
        name: name,
        namespace: namespacePart ? namespacePart[1] : null
      };
    }


getRoleExpr
  = "$getRoleExpr" { return { functionType: "getRoleExpr" }; }

getHasKeyProperties
  = "$getHasKeyProperties('" string "')" { return { functionType: "getHasKeyProperties", string: text() }; }

getAttributeType
  = "$getAttributeType(" type:pathBody space isObjectAttribute:path ")" { return { functionType: "getAttributeType", type: type, isObjectAttribute:isObjectAttribute }; }

getMultiplicity
  = "$getMultiplicity('" multiplisity:("Min" / "Max" / "Exact") "')" { return { functionType: "getMultiplicity", multiplisity: multiplisity }; }

getTypeExpression
  = "$getTypeExpression(" type:path space isObjectAttribute:path ")" { return { functionType: "getTypeExpression", type: type, isObjectAttribute:isObjectAttribute }; }

elemType
  = "$elemType" { return { functionType: "elemType" }; }

isEmpty
  = "$isEmpty" { return { functionType: "isEmpty" }; }

count
  = "$count" { return { functionType: "count" }; }

getContainer
  = "$getContainer" { return { functionType: "getContainer" }; }

getDataTypeRestriction
  = "$getDataTypeRestriction" { return { functionType: "getDataTypeRestriction" }; }

getDataTypeExpression
  = "$getDataTypeExpression" { return { functionType: "getDataTypeExpression" }; }

isURI
  = "$isURI" { return { functionType: "isURI" }; }





