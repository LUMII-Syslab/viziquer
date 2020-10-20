// start rule
start = expVal: Exp {return expVal}
// define expression rules
Exp =  first: Term rest: (("+") restTerm: Term {return restTerm} )+ {rest.push(first); return rest}
    / term: Term {return [term]}
    /''
Term = _ k: Constant _ {return k} / _ n: NonConstant _{return n}

NonConstant =  AtSign lineName: string ('.') Attrname: string {return {LineName: lineName, AttributeName: Attrname, type: "LineWithAttribute"}}
				/AtSign name: string {return {AttributeName: name, type: "Attribute"} } 
Constant = DQ  konst: string DQ {return {Value: konst, type: "StringConstant"}}
// optional whitespace, newline
_ = [ \t\n\r]*
string = chars: char+ {return chars.join('').trim()}
char = $[a-zA-Z0-9 \t\n\r ~!@#$%^&*()_ =?<>,;:\\] { return text() }
// double quote
DQ = '"'
AtSign = '@'