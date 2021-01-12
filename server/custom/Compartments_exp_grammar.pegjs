// start rule
start = expVal: Exp {return expVal}
// define expression rules
Exp =  first: Term rest: (("+") restTerm: Term {return restTerm} )+ {rest.splice(0,0,first); return rest}
    / term: Term {return [term]}
    /''
Term = _ k: Constant _ {return k} / _ n: NonConstant _{return n}

NonConstant =  AtSign lineName: string ('.') Attrname: string {return {LineName: lineName, AttributeName: Attrname, type: "LineWithAttribute"}}
				/AtSign name: string {return {AttributeName: name, type: "Attribute"} } 
Constant = DQ  konst: KonstString DQ {return {Value: konst, type: "StringConstant"}}
// optional whitespace, newline
_ = [ \t\n\r]*
string = chars: char+ {return chars.join('').trim()} // ne-konstantes stringam ir jānoņem visas atstarpes
KonstString = chars: char+ {return chars.join('')} // kosntantes stringam atstarpes jāatstāj, ja ir
char = $[a-zA-Z0-9 \t\n\r ~!@#$%^&*()_ =?<>,;:\\] { return text() }
// double quote
DQ = '"'
AtSign = '@'