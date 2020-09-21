// start rule
start = expVal: Exp {return expVal.flat()}
// define expression rules
Exp =  first: Term rest: (("+") restTerm: Term {return restTerm})+ 
    / Term
    /''
Term = _ n: NonConstant _{var nonK = {nonConstant: n}; return nonK} / _ k: Constant _ {var konst = {Constant: k}; return konst}
// pie nonConstant jābūt pieprasījums datubāzē un jāatgriež atbilstošā Compartment vērtība vai arī tukšu stringu
NonConstant =  AtSign lineName: string ('.') Attrname: string {return {LineName: lineName, AttributeName: Attrname}}
				/AtSign name: string {return name } 
Constant = DQ  konst: string DQ {return konst}
// optional whitespace, newline
_ = [ \t\n\r]*
string = chars: char+ {return chars.join('')}
char = $[a-zA-Z0-9  \t\n\r ~!@#$%^&*()_ =?<>,;:\\ ] { return text() }
// double quote
DQ = '"'
AtSign = '@'