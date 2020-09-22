// start rule
start = expVal: Exp {return _.flatten(expVal)}
// define expression rules
Exp =  first: Term rest: (("+") restTerm: Term {return restTerm})+ 
    / Term
    /''
Term = _ n: NonConstant _{return n} / _ k: Constant _ {var konst = {Value: k, type: "StringConstant"}; return konst}

NonConstant =  AtSign lineName: string ('.') Attrname: string {return {LineName: lineName, AttributeName: Attrname, type: "LineWithAttribute"}}
				/AtSign name: string {return {AttributeName: name, type: "Attribute"} } 
Constant = DQ  konst: string DQ {return konst}
// optional whitespace, newline
_ = [ \t\n\r]*
string = chars: char+ {return chars.join('').trim()}
char = $[a-zA-Z0-9 \t\n\r ~!@#$%^&*()_ =?<>,;:\\] { return text() }
// double quote
DQ = '"'
AtSign = '@'