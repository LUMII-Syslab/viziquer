{
  // Build a Lua-table-like value: an Array with extra named fields.
  function tbl(items, props) {
    const a = Array.isArray(items) ? items : (items === null ? [] : [items]);
    if (props) Object.assign(a, props);
    return a;
  }

  function seqFirstTail(first, tail, pickIndex) {
    const out = [first];
    for (const t of tail) out.push(t[pickIndex]);
    return out;
  }

  function node(props, items) {
    return Object.assign({}, props || {}, { items: items || [] });
  }

  function listFromFirstTail(first, tail, pickIndex) {
    const out = [first];
    for (const t of tail) out.push(t[pickIndex]);
    return out;
  }
}

Start
  = _ e:Expression _ { return e; }

Expression
  = dr:DataRange? !. { return dr; }

/* -------------------------
   dataRange / conjunction / primary
-------------------------- */

DataRange
  = head:DataConjunction
    tail:(WhitespacePlus "or" WhitespacePlus DataConjunction)*
    {
      const items = listFromFirstTail(head, tail, 3);
      return node({ grammarProduction: "dataDisjunction" }, items);
    }

DataConjunction
  = head:DataPrimary
    tail:(WhitespacePlus "and" WhitespacePlus DataPrimary)*
    {
      const items = listFromFirstTail(head, tail, 3);
      return node({ grammarProduction: "dataConjunction" }, items);
    }

DataPrimary
  = neg:Negation? body:DataPrimaryBody
    {
      return Object.assign(
        { negation: neg || "false" },
        body
      );
    }

Negation
  = "not" WhitespacePlus { return "true"; }

DataPrimaryBody
  = r:DatatypeRestriction
    { return { dataPrimaryType: "datatypeRestriction", restriction: r }; }
  / d:Datatype
    { return { dataPrimaryType: "datatype", datatype: d }; }
  / "{" WhitespaceStar ll:LiteralList WhitespaceStar "}"
    { return { dataPrimaryType: "literalList", literalList: ll }; }
  / "(" WhitespaceStar dr:DataRange WhitespaceStar ")"
    { return { dataPrimaryType: "dataRange", dataRange: dr }; }

/* -------------------------
   datatype / restrictions
-------------------------- */


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
  = dt:Datatype
    WhitespaceStar "[" WhitespaceStar
    head:DataRestriction
    tail:(WhitespaceStar "," WhitespaceStar DataRestriction)*
    WhitespaceStar "]"
    {
      const restrictions = listFromFirstTail(head, tail, 3);
      return { datatype: dt, restrictions };
    }

DataRestriction
  = f:Facet WhitespaceStar v:RestrictionValue
    { return { facet: f, value: v }; }



Facet
  = "<=" / "<" / ">=" / ">"
  / "length" / "maxLength" / "minLength"
  / "pattern" / "langPattern"

RestrictionValue
  = Literal

/* -------------------------
   literals
-------------------------- */

LiteralList
  = first:Literal rest:(WhitespaceStar "," WhitespaceStar Literal)+
    {
      return listFromFirstTail(first, rest, 3);
    }

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

StringLiteralWithLang
  = v:QuotedString "@" lang:LanguageTag
    { return { type: "stringWithLang", value: v, language: lang }; }

IntegerLiteral
  = v:$(Sign? Digit+)
    { return { type: "integer", value: v }; }

DecimalLiteral
  = v:$(Sign? Digit+ "." Digit+)
    { return { type: "decimal", value: v }; }

FloatLiteral
  = v:$(Sign? (Digit+ ".")? Digit+ Exponent ("f" / "F"))
    { return { type: "float", value: v }; }

Exponent
  = ("e" / "E") Sign? Digit+

Sign = "+" / "-"
Digit = [0-9]

/* -------------------------
   EXACT char-classes from your LPeg re.compile(...)
   (Latin-1 ranges, includes Latvian per your choice)
-------------------------- */

/* pn_chars_base = [A-Z] / [a-z] / [\128-\214] / [\216-\246] / [\248-\255] */
PN_CHARS_BASE
  = [A-Za-z\x80-\xD6\xD8-\xF6\xF8-\xFF]

/* pn_chars = pn_chars_base / '_' / '-' / [0-9] */
PN_CHARS
  = [A-Za-z0-9_\-\x80-\xD6\xD8-\xF6\xF8-\xFF]

/* quotedStringChars = [\1-\33] / [\35-\91] / [\93-\255]  (excludes " (0x22) and \ (0x5C)) */
QUOTED_STRING_CHARS
  = [\x01-\x21\x23-\x5B\x5D-\xFF]

/* langTagChars = [A-Z] / [a-z] / '-' */
LANG_TAG_CHARS
  = [A-Za-z\-]

/* fullIRIChars = [\33-\59] / '=' / [\63-\126] / [\128-\255] */
FULL_IRI_CHARS
  = [\x21-\x3B\x3D\x3F-\x7E\x80-\xFF]

/* -------------------------
   quotedString (mirrors your LPeg structure)
   LPeg:
     '"' %quotedStringChars* ('\' ('\' / '"') %quotedStringChars*)* '"'
   Meaning: allow \" and \\ escapes only, otherwise chars from quotedStringChars.
-------------------------- */

QuotedString
  = s:$("\"" QuotedStringInner* "\"") { return s; }

QuotedStringInner
  = QUOTED_STRING_CHARS
  / "\\\\"            // \\  (backslash escape)
  / "\\\""            // \"  (quote escape)

/* -------------------------
   languageTag
   LPeg: %langTagChars*
-------------------------- */

LanguageTag
  = $(LANG_TAG_CHARS*)   // can be empty, matching your * quantifier

/* -------------------------
   IRI
-------------------------- */

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

FullIRI
  = s:$("<" FULL_IRI_CHARS+ ">") { return s; }

/* Standard prefixed-name form: prefix:localName.
   Use a dedicated prefix-label rule because Prefix itself permits ':'.
   Keeping the same value shape and IRItype as AbbreviatedIRI preserves
   compatibility with consumers of the existing name{prefix} syntax.
*/
PrefixedIRI
  = prefix:PrefixLabel ":" name:LocalName
    { return { name: name, prefix: prefix }; }

/* A prefix label cannot consume the ':' separator. */
PrefixLabel
  = $(PN_CHARS_BASE (PN_CHARS / "." &PN_CHARS)*)

AbbreviatedIRI
  = name:LocalName "{" prefix:Prefix "}"
    { return { name: name, prefix: prefix }; }

FullNamespaceIRI
  = name:LocalName "{" prefix:PrefixNamespace "}"
    { return { name: name, prefix: prefix }; }

/* prefix = %pn_chars_base (%pn_chars / '.' / '/' / ':')* */
Prefix
  = $(PN_CHARS_BASE (PN_CHARS / "." / "/" / ":")*)

/* same structure in your grammar */
PrefixNamespace
  = $(PN_CHARS_BASE (PN_CHARS / "." / "/" / ":")*)

/* localName = (%pn_chars_base / '_' / '[0-9]') (%pn_chars / '.')*
   (I interpret '[0-9]' as a digit class, not a literal string.)
*/
LocalName
  = $( (PN_CHARS_BASE / "_" / Digit) (PN_CHARS / ".")* )

SimpleIRI
  = LocalName

BlankNode
  = "_:" LocalName

/* -------------------------
   whitespace
-------------------------- */

Whitespace
  = [ \t\r\n]

WhitespacePlus
  = Whitespace+

WhitespaceStar
  = Whitespace*

_
  = Whitespace*
