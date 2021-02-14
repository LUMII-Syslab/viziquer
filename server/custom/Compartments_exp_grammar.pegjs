// start rule
start = expVal: Exp {return expVal}
// define expression rules
Exp =  first: Term rest: (("+") restTerm: Term {return restTerm} )+ {rest.splice(0,0,first); return rest}
    / term: Term {return [term]}
    /''
Term = _ k: Constant _ {return k} /  _ s: Split _ {return s} / _ n: NonConstant _{return n}

NonConstant =  AtSign lineName: string ('.') Attrname: string {return {LineName: lineName, AttributeName: Attrname, type: "LineWithAttribute"}}
				/AtSign name: string {return {AttributeName: name, type: "Attribute"} } 
Constant = DQ  konst: KonstString DQ {return {Value: konst, type: "StringConstant"}}
Split = AtSign lineName: string ('.') Attrname: string ('.Split(') DQ delimiter:char DQ (')[') index:index (']')
{return {LineName: lineName, AttributeName: Attrname, type: "Split", index: index, delimiter: delimiter}}
// optional whitespace, newline
_ = [ \t\n\r]*
string = chars: char+ {return chars.join('').trim()} // ne-konstantes stringam ir jānoņem visas atstarpes
KonstString = chars: char+ {return chars.join('')} // kosntantes stringam atstarpes jāatstāj, ja ir
char = $[a-zA-Z0-9 \t\n\r ~!@#$%^&*()_ =?<>,;:\\] { return text() }
// double quote
DQ = '"'
AtSign = '@'
index =  nz: nonZeroNumber {return parseInt(nz,10)} / z: ('0') {return parseInt(z,10)}
nonZeroNumber = digits: $([1-9] [0-9]*) {return digits}