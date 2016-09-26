//******************************************************************************
// Other 
//******************************************************************************
var printWarning = false;
var printOutput = false;
var printOutputPrev = false;
var printOutputTag;
var printStr = "";
var testTitle = "";
var testString = "";
var testOperation;

warning = function(text) {
    if (printWarning) {
        console.warn("### Warning ### ", text);
        return;
    }
};

turnOffPrinting = function(tag) {
    if (printOutput) {
        printOutputPrev = true;
        printOutput = false;
        printOutputTag = tag;
        console.warn("\t\t\t\t### turn off printing ### ", tag);
    }
};

turnOnPrinting = function(tag) {
    if (printOutputPrev && printOutputTag === tag) {
        printOutput = true;
        printOutputPrev = false;
        console.warn("\t\t\t\t### turn on printing ### ", tag);
        printOutputTag = undefined;
    }
};

addText = function(text) {
    if (printOutput)
        printStr += text + ";";
};

printText = function(text) {
    if (printOutput) {
        console.warn(printStr + text + ".");
        printStr = "";
    }
};

addTitle = function(v) {
    if (testString === "")
        testTitle = v;
};
emptyTest = function() {
    return testString === "";
};
addTest = function(v) {
    testString += "\n\t\t" + v;
};
printTest = function() {
    if (testString !== "") {
        printText("\n\n>>###################### " + testTitle + " ######################>>");
        printText(testString);
        printText("<<######################## " + testTitle + " ######################<<\n\n");
    }
    testString = "";
    testTitle = "";
};

koef = function(v) {
    var n = 256;
    if (v === undefined) {
        warning("line_routing_other.koef wrong input value umdefined");
        return n;
    }
    if (v < 0) {
        warning("line_routing_other.koef wrong input value " + v);
        v = Math.abs(v);
    }
    else if (v > n)
        return 0;
    else if (v < 2)
        return n;
    var i = 1;
    n /= 2;
    while (v < n) {
        n /= 2;
//        i *= 2; 
        i += 1; 
    }
    return i;
};
//koef = function(v) {
//    var koefList = [[Number.MAX_VALUE, 0], [64, 1], [32, 2], [16, 4], [10, 8], [8, 16], [6, 32], [4, 64], [0, 128]];
//    if (v > koefList[4][0])
//        if (v > koefList[2][0])
//            if (v > koefList[1][0])
//                return koefList[0][1];
//            else
//                return koefList[1][1];
//        else if (v > koefList[3][0])
//            return koefList[2][1];
//        else
//            return koefList[3][1];
//    else if (v > koefList[6][0])
//        if (v > koefList[5][0])
//            return koefList[4][1];
//        else
//            return koefList[5][1];
//    else if (v > koefList[7][0])
//        return koefList[7][1];
//    else
//        return koefList[8][1];
//    return (1000);
//};
convert = function(v) {
    return ((Math.round(v * 8)) >> 3) << 3;
};
reconvert = function(v) {
    return v >> 3;
};
convertArray = function(a) {
    for (var i = 0; i < a.length; i++)
        a[i] = convert(a[i]);
};
reconvertArray = function(a) {
    for (var i = 0; i < a.length; i++)
        a[i] = reconvert(a[i]);
};
listPrintString = function(list, text, tabs) {
    str = tabs + "\t" + text + ": ";
    _.each(list, function(value, ind) {str += "; " + ind.toString() + ":" + value.toString(); });
    return str;
};
rectInsideRect = function(r1, r2) {
    var rc = r2[0] <= r1[0] && r1[2] <= r2[2] && r2[1] <= r1[1] && r1[3] <= r2[3];
    return rc;
};
rectOverlapRect = function(r1, r2) {
    var rc = r1[0] <= r2[2] && r2[0] <= r1[2] && r1[1] <= r2[3] && r2[1] <= r1[3];
    return rc;
};
cloneArray = function(a) { return _.map(a, function(obj){ return obj; }); };
cloneObject = function(a) { return _.clone(a); };
getValueOfPair = function(pair, len) { return pair[0] * len + pair[1]; };
getPairOfValue = function(v, len) { var mod = v % len; return [(v - mod) / len, mod]; };