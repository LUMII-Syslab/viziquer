{
  // PEG.js 0.9.0 friendly helpers (ES5)
  function copyProps(dst, src) {
    if (!src) return dst;
    for (var k in src) {
      if (Object.prototype.hasOwnProperty.call(src, k)) dst[k] = src[k];
    }
    return dst;
  }

  function node(grammarProduction, items) {
    return { grammarProduction: grammarProduction, items: items || [] };
  }

  function listFromFirstTail(first, tail, pickIndex) {
    var out = [first];
    for (var i = 0; i < tail.length; i++) out.push(tail[i][pickIndex]);
    return out;
  }
}

/* =========================
   START
========================= */

Start
  = WhitespaceStar ce:ClassExpression? End
    { return ce === null ? null : ce; }

End = !.

/* =========================
   CLASS EXPRESSION (disjunction)
   classExpression <- conjunction ( 'or' conjunction )*
========================= */

ClassExpression
  = head:Conjunction tail:(WhitespacePlus "or" WhitespacePlus Conjunction)*
    {
      var items = listFromFirstTail(head, tail, 3);
      return node("disjunction", items);
    }

/* =========================
   CONJUNCTION
   1) Class that R (and R)*
   2) Primary (and Primary)*
========================= */

Conjunction
  = // conjunctionWithRestrictions
    cls:IRI WhitespacePlus "that" WhitespacePlus
    r1:Restriction rtail:(WhitespacePlus "and" WhitespacePlus Restriction)*
    {
      var restrictions = listFromFirstTail(r1, rtail, 3);
      return {
        grammarProduction: "conjunctionWithRestrictions",
        class: cls,
        restrictions: restrictions
      };
    }
  / // conjunctionNoRestrictions
    p1:Primary ptail:(WhitespacePlus "and" WhitespacePlus Primary)*
    {
      var items = listFromFirstTail(p1, ptail, 3);
      return node("conjunctionNoRestrictions", items);
    }

/* =========================
   RESTRICTION
========================= */

Restriction
  = head:RestrictionHead tail:RestrictionTail
    {
      var o = {};
      copyProps(o, head);
      copyProps(o, tail);
      return o;
    }

RestrictionHead
  = "inverse" WhitespacePlus "(" prop:IRI ")" WhitespacePlus
    { return { inverse: "true", property: prop }; }
  / "inverse" WhitespacePlus prop:IRI WhitespacePlus
    { return { inverse: "true", property: prop }; }
  / prop:IRI WhitespacePlus
    { return { inverse: "false", property: prop }; }

RestrictionTail
  = kw:("some" / "only") WhitespacePlus v:SomePrimary
    { return { keyword: kw, value: v }; }
  / "value" WhitespacePlus v:(StringLiteralNoLangBool / Individual / Literal)
    { return { keyword: "value", value: v }; }
  / kw:(("Self" / "self") { return "Self"; })
    { return { keyword: kw }; }
  / kw:("min" / "max" / "exactly") WhitespacePlus c:NonNegInt v:(WhitespacePlus sp:SomePrimary { return sp; })?
    { return { keyword: kw, count: c, value: v === null ? null : v }; }

/* =========================
   PRIMARY (optionally 'not')
========================= */

Primary
  = n:Negation? body:(RestrictionOrAtomic)
    {
      return {
        negation: n === null ? "false" : "true",
        primaryType: body.primaryType,
        primary: body.primary
      };
    }

Negation
  = "not" WhitespacePlus { return "true"; }

RestrictionOrAtomic
  = r:Restriction { return { primaryType: "restriction", primary: r }; }
  / a:Atomic      { return { primaryType: "atomic",      primary: a }; }

/* =========================
   ATOMIC
========================= */

Atomic
  = cls:IRI
    { return { atomType: "class", class: cls }; }
  / "{" WhitespaceStar lst:IndividualList WhitespaceStar "}"
    { return { atomType: "individualList", list: lst }; }
  / "(" WhitespaceStar e:ClassExpression WhitespaceStar ")"
    { return { atomType: "expression", expression: e }; }

/* =========================
   SOME PRIMARY (unknown target kind)
   This matches your somePrimary shape exactly (unknownPrimaryType + payload)
========================= */

SomePrimary
  = "{" WhitespaceStar lst:LiteralList WhitespaceStar "}"
    { return { unknownPrimaryType: "literalList", list: lst }; }
  / "{" WhitespaceStar lst:IndividualList WhitespaceStar "}"
    { return { unknownPrimaryType: "individualList", list: lst }; }
  / "(" WhitespaceStar ex:UnknownExpression WhitespaceStar ")"
    { return { unknownPrimaryType: "expression", expression: ex }; }
  / r:Restriction
    { return { unknownPrimaryType: "restriction", restriction: r }; }
  / dr:DatatypeRestriction
    { return { unknownPrimaryType: "datatypeRestriction", restriction: dr }; }
  / iri:IRI
    { return { unknownPrimaryType: "IRI", IRI: iri }; }

/* =========================
   INDIVIDUALS
========================= */

IndividualList
  = first:Individual rest:("," WhitespaceStar Individual)*
    {
      var out = [first];
      for (var i = 0; i < rest.length; i++) out.push(rest[i][2]);
      return out;
    }

Individual
  = iri:IRI
    { return { individualType: "IRI", individual: iri }; }
  / bn:BlankNode
    { return { individualType: "blank", individual: bn }; }

/* =========================
   UNKNOWN EXPRESSION (for some/only targets)
   unknownExpression <- unknownConjunction ( 'or' unknownConjunction )*
========================= */

UnknownExpression
  = head:UnknownConjunction tail:(WhitespacePlus "or" WhitespacePlus UnknownConjunction)*
    {
      var items = listFromFirstTail(head, tail, 3);
      return node("unknownDisjunction", items);
    }

UnknownConjunction
  = // same "Class that R and R" form
    cls:IRI WhitespacePlus "that" WhitespacePlus
    r1:Restriction rtail:(WhitespacePlus "and" WhitespacePlus Restriction)*
    {
      var restrictions = listFromFirstTail(r1, rtail, 3);
      return {
        grammarProduction: "conjunctionWithRestrictions",
        class: cls,
        restrictions: restrictions
      };
    }
  / // unknownPrimary list
    p1:UnknownPrimary ptail:(WhitespacePlus "and" WhitespacePlus UnknownPrimary)*
    {
      var items = listFromFirstTail(p1, ptail, 3);
      return node("unknownConjunction", items);
    }

UnknownPrimary
  = n:Negation? body:UnknownPrimaryBody
    {
      var o = { negation: n === null ? "false" : "true" };
      copyProps(o, body);
      return o;
    }

UnknownPrimaryBody
  = r:Restriction
    { return { unknownPrimaryType: "restriction", restriction: r }; }
  / dr:DatatypeRestriction
    { return { unknownPrimaryType: "datatypeRestriction", restriction: dr }; }
  / "{" WhitespaceStar lst:LiteralList WhitespaceStar "}"
    { return { unknownPrimaryType: "literalList", list: lst }; }
  / "{" WhitespaceStar lst:IndividualList WhitespaceStar "}"
    { return { unknownPrimaryType: "individualList", list: lst }; }
  / "(" WhitespaceStar ex:UnknownExpression WhitespaceStar ")"
    { return { unknownPrimaryType: "expression", expression: ex }; }
  / iri:IRI
    { return { unknownPrimaryType: "IRI", IRI: iri }; }

/* =========================
   DATA RANGE (copied semantics from your datatype grammar)
========================= */

DataRange
  = head:DataConjunction tail:(WhitespacePlus "or" WhitespacePlus DataConjunction)*
    {
      var items = listFromFirstTail(head, tail, 3);
      return node("dataDisjunction", items);
    }

DataConjunction
  = head:DataPrimary tail:(WhitespacePlus "and" WhitespacePlus DataPrimary)*
    {
      var items = listFromFirstTail(head, tail, 3);
      return node("dataConjunction", items);
    }

DataPrimary
  = n:Negation? body:DataPrimaryBody
    {
      var o = { negation: n === null ? "false" : "true" };
      copyProps(o, body);
      return o;
    }

DataPrimaryBody
  = r:DatatypeRestriction
    { return { dataPrimaryType: "datatypeRestriction", restriction: r }; }
  / d:Datatype
    { return { dataPrimaryType: "datatype", datatype: d }; }
  / "{" WhitespaceStar ll:LiteralList WhitespaceStar "}"
    { return { dataPrimaryType: "literalList", literalList: ll }; }
  / "(" WhitespaceStar dr:DataRange WhitespaceStar ")"
    { return { dataPrimaryType: "dataRange", dataRange: dr }; }

/* =========================
   DATATYPE / DATATYPE RESTRICTION
========================= */

Datatype
  = iri:IRI
    { return { type: "IRI", value: iri }; }
  / "integer"
    { return { type: "predefined", value: "integer" }; }
  / "decimal"
    { return { type: "predefined", value: "decimal" }; }
  / "float"
    { return { type: "predefined", value: "float" }; }
  / "string"
    { return { type: "predefined", value: "string" }; }

DatatypeRestriction
  = dt:Datatype WhitespaceStar "[" WhitespaceStar
    r1:DataRestriction rtail:(WhitespaceStar "," WhitespaceStar DataRestriction)*
    WhitespaceStar "]"
    {
      var restrictions = listFromFirstTail(r1, rtail, 3);
      return { datatype: dt, restrictions: restrictions };
    }

DataRestriction
  = f:Facet WhitespaceStar v:RestrictionValue
    { return { facet: f, value: v }; }

Facet
  = "<=" / "<" / ">=" / ">" / "length" / "maxLength" / "minLength" / "pattern" / "langPattern"

RestrictionValue
  = Literal

/* =========================
   LITERALS
========================= */

LiteralList
  = first:Literal rest:(WhitespaceStar "," WhitespaceStar Literal)+
    { return listFromFirstTail(first, rest, 3); }

Literal
  = TypedLiteral
  / StringLiteralWithLang
  / StringLiteralNoLang
  / FloatLiteral
  / DecimalLiteral
  / IntegerLiteral

TypedLiteral
  = v:QuotedString "^^" dt:Datatype
    { return { type: "typed", value: v, datatype: dt }; }

StringLiteralNoLang
  = v:QuotedString
    { return { type: "stringNoLang", value: v }; }

// Matches your Lua mapping: true -> '"true"', false -> '"false"'
StringLiteralNoLangBool
  = v:(True / False)
    { return { type: "stringNoLang", value: v }; }

True  = "true"  { return "\"true\""; }
False = "false" { return "\"false\""; }

StringLiteralWithLang
  = v:QuotedString "@" lang:LanguageTag
    { return { type: "stringWithLang", value: v, language: lang }; }

IntegerLiteral
  = v:$(("+" / "-")? Digit+)
    { return { type: "integer", value: v }; }

DecimalLiteral
  = v:$(("+" / "-")? Digit+ "." Digit+)
    { return { type: "decimal", value: v }; }

FloatLiteral
  = v:$(("+" / "-")? (Digit+ ".")? Digit+ Exponent ("f" / "F"))
    { return { type: "float", value: v }; }

Exponent
  = ("e" / "E") ("+" / "-")? Digit+

Digit = [0-9]
NonNegInt = $(Digit+)

/* =========================
   QUOTED STRING (your quotedStringChars)
   quotedStringChars = [\1-\33] / [\35-\91] / [\93-\255]
========================= */

QuotedString
  = s:$("\"" QuotedStringInner* "\"") { return s; }

QuotedStringInner
  = QUOTED_STRING_CHARS
  / "\\\\"
  / "\\\""

QUOTED_STRING_CHARS
  = [\u0001-\u0021\u0023-\u005B\u005D-\u00FF]

/* =========================
   LANGUAGE TAG (your langTagChars*)
   langTagChars = [A-Z] / [a-z] / '-'
========================= */

LanguageTag
  = $(LANG_TAG_CHARS*)

LANG_TAG_CHARS
  = [A-Za-z\-]

/* =========================
   IRI (your IRI forms)
========================= */

IRI
  = v:FullIRI
    { return { IRItype: "fullIRI", value: v }; }
  / v:PrefixedIRI
    { return { IRItype: "abbreviatedIRI", value: v }; }
  / v:AbbreviatedIRI
    { return { IRItype: "abbreviatedIRI", value: v }; }
  / v:FullNamespaceIRI
    { return { IRItype: "fullNamespaceIRI", value: v }; }
  / v:SimpleIRI
    { return { IRItype: "simpleIRI", value: v }; }

// fullIRIChars = [\33-\59] / '=' / [\63-\126] / [\128-\255]
FULL_IRI_CHARS
  = [\u0021-\u003B\u003D\u003F-\u007E\u0080-\u00FF]

FullIRI
  = s:$("<" FULL_IRI_CHARS+ ">") { return s; }

PrefixedIRI
  = prefix:PrefixLabel ":" name:LocalName
    { return { name: name, prefix: prefix }; }

/* A prefix label cannot consume the ':' separator or end in '.'. */
PrefixLabel
  = $(PN_CHARS_BASE (PN_CHARS / "." &PN_CHARS)*)

AbbreviatedIRI
  = name:LocalName "{" prefix:Prefix "}"
    { return { name: name, prefix: prefix }; }

FullNamespaceIRI
  = name:LocalName "{" prefix:PrefixNamespace "}"
    { return { name: name, prefix: prefix }; }

// pn_chars_base = [A-Z] / [a-z] / [\128-\214] / [\216-\246] / [\248-\255]
PN_CHARS_BASE
  = [A-Za-z\u0080-\u00D6\u00D8-\u00F6\u00F8-\u00FF]

// pn_chars = pn_chars_base / '_' / '-' / [0-9]
PN_CHARS
  = [A-Za-z0-9_\-\u0080-\u00D6\u00D8-\u00F6\u00F8-\u00FF]

// prefix = %pn_chars_base (%pn_chars / '.' / '/' / ':')*
Prefix
  = $(PN_CHARS_BASE (PN_CHARS / "." / "/" / ":")*)

// same as Prefix in your grammar
PrefixNamespace
  = $(PN_CHARS_BASE (PN_CHARS / "." / "/" / ":")*)

LocalName
  = $( (PN_CHARS_BASE / "_" / Digit) (PN_CHARS / ".")* )

SimpleIRI
  = LocalName

BlankNode
  = s:$("_:" LocalName) { return s; }

/* =========================
   WHITESPACE
========================= */

Whitespace
  = [ \t\r\n]

WhitespacePlus
  = Whitespace+

WhitespaceStar
  = Whitespace*
