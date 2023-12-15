// import { _ } from 'vue-underscore';

import {getPairOfValue, getValueOfPair, cloneObject, cloneArray, rectOverlapRect, rectInsideRect, listPrintString, reconvertArray, convertArray, reconvert, convert, koef,} from './line_routing_other'



//******************************************************************************
// ConnArea
//******************************************************************************
var ConnArea = function(box, side, disconnPaths, connPaths) {
    this.testRect;
    this.segments = [];
    this.box = box;
    this.side = side;
    this.d = side & 1;
    this.disconnPaths = disconnPaths;
    this.connPaths = connPaths;
    this.indCoord = [];
    this.indHPenalty = [];
    this.indVPenalty = [];
    this.coordInd = {};
    this.coors = 0;
    this.pairs = {};
    this.norm = (this.box.owner.delta * 2) / this.box.size[this.side & 1]; 
};
ConnArea.prototype.initDisconnSegm = function(segm) {
    segm.disconnected = true;
    // mark: 0 - segment is paralel to connestion side
    // mark: -1 - segment is perpendicular to connestion side and present max point
    // mark: 1 - segment is perpendicular to connestion side and present min point
    segm.mark = 0;
    this.segments.push(segm);
    if (this.testRect[3 - this.d] < segm.lev)
        this.testRect[3 - this.d] = segm.lev;
};
ConnArea.prototype.initTestRect = function() {
    var d = this.d;
    this.testRect = this.box.rect();
    this.testRect[1 - d] = this.box.offValue(this.testRect[((this.side > 1) ? 3 : 1) - d], this.side);
    this.testRect[3 - d] = this.testRect[1 - d];
    this.segments = [];
    
    if (this.disconnPaths.length > 3)
        var iii = 0;
    
    var i, path, segm;
    var self = this;
    _.each(this.disconnPaths, function(path) {
        if (path.isSelfloop()) {
            if (path.fromSide() === self.side) {
                segm = self.box.offSegm(path.segm(1), self.side);
                self.initDisconnSegm(segm);
            }
            if (path.toSide() === self.side) {
                segm = self.box.offSegm(path.segm(path.n - 1), self.side);
                self.initDisconnSegm(segm);
            }
        }
        else {
            segm = self.box.offSegm((path.from === self.box.id) ? path.segm(1) : path.segm(path.n - 1), self.side);
            self.initDisconnSegm(segm);
        }
    });
};
ConnArea.prototype.collectIntersectSegm = function() {
    var i, j, m, path, segm, segmOther, dir;
    var d = this.d;
    for (i = 0; i < this.connPaths.length; i++) {
        path = this.connPaths[i];
        dir = path.dir;
        for (j = 1; j < path.n; j++) {
            m = 1 - ((dir + d + j) & 1);
            segm = this.box.offSegm(path.segm(j), this.side);
            if (segm.intersectRect(this.testRect)) {
                segm.disconnected = false;
                segm.mark = m;
                this.segments.push(segm);
                if (segm.mark === 1) {
                    segmOther = cloneObject(segm);
                    segmOther.mark = -1;
                    this.segments.push(segmOther);
                }
            }
        }
    }
};
ConnArea.prototype.cutSegmOnArea = function() {
    var j, k,  segm;
    var d = this.d;
    for (j = 0; j < this.segments.length; j++) {
        segm = this.segments[j];
        k = (d + segm.mark) & 1;
        segm.min = Math.max(segm.min, this.testRect[k]);
        segm.max = Math.min(segm.max, this.testRect[2 + k]);
    }
};
ConnArea.prototype.setCoordInd = function(level) {
    if (this.coordInd[level] === undefined) {
        this.coordInd[level] = 0;
        this.indCoord.push(level);
        this.indHPenalty.push(0);
        this.indVPenalty.push(0);
//        printText("\t\t\t\tsetCoordInd:" + this.coors + ", " + level  + ", " + this.indCoord[this.coors] + ", " + this.coordInd[level]);
        this.coors++;
    }
};
ConnArea.prototype.createIntervals = function() {
    var j, l, k, segm;
    var d = this.d;
    this.segments.sort((function(a, b) { return a.compareConn(b); }));
    var ll = this.segments[0].level();
    this.coordInd = {};
    this.indCoord = [];
    this.setCoordInd(this.testRect[d]);
    for (j = 0; j < this.segments.length; j++) {
        segm = this.segments[j];
        if (ll > this.segments[j].level())
            warning("ConnArea.prototype.createIntervals segments are not sorted");
        if (!segm.disconnected)
            if (segm.mark !== 0)
                this.setCoordInd(segm.lev);
            else {
                this.setCoordInd(segm.min);
                this.setCoordInd(segm.max);
            }
    }
    this.setCoordInd(this.testRect[2 + d]);
//    this.indCoord.sort();
    this.indCoord.sort((function(a, b) { return (a < b) ? -1 : (a > b) ? 1 : 0; }));
    
    for (j = 0; j < this.coors; j++)
        this.coordInd[this.indCoord[j]] = j;
    if (this.coors !== this.indCoord.length)
        warning("ConnArea.prototype.createIntervals coors is not correct");
};
ConnArea.prototype.setPenalty = function(ind, value) {
    this.indPenalty[ind] += value;
};
ConnArea.prototype.processForward = function(segm) {
    // printText("\t\t\t\t\tprocessForward:");
    var i, j, v, l, pair;
    var s = this.indHPenalty[0] + this.indVPenalty[0];
    var vv = Number.MAX_VALUE;
    var ll = Number.MAX_VALUE;
    var i = 0;
    while (i < this.coors - 1) {
        for (j = i + 1; j < this.coors - 1 && this.indHPenalty[j] === 0 && this.indVPenalty[j] === 0; j++)
            ;
        l = this.indCoord[j] - this.indCoord[i];
        v = s + koef(l * this.norm);
        // printText("\t\t\t\t\t\ti " + i + ", j " + j + ", ll " + ll + ", l " + l + ", vv " + vv + ", v " + v + "=" + s + " + " + koef(l * this.norm));
        if (v < vv || (v === vv && l > ll)) {
            pair = [i, j];
            vv = v;
            ll = l;
        }
        s += this.indHPenalty[j] + this.indVPenalty[j];
        i = j;
    }
    // printText("\t\t\t\t\t\tpair[ " + pair.toString() + "] " + vv + ", " + ll);
    return pair;
};
ConnArea.prototype.processBackward = function(segm) {
    var tabs = "\t\t\t\t\t";
    // printText(tabs + "processBachward:");
    var j, v, l, pair;
    var i = this.coors - 1;
    var s = -this.indHPenalty[i] - this.indVPenalty[i];
    var vv = Number.MAX_VALUE;
    var ll = Number.MAX_VALUE;
    var str = "segm: forw" + segm.forward(this.box.id) + "[" + segm.min + "," + segm.max + ";" + segm.lev + "]";
    str += "; " + listPrintString(this.indCoord, "Coord", " ");
    str += "; " + listPrintString(this.indHPenalty, "HPen", " ");
    str += "; " + listPrintString(this.indVPenalty, "VPen", " ");
    // printText(str);
    while (i > 0) {
        for (j = i - 1; j > 0 && this.indHPenalty[j] === 0 && this.indVPenalty[j] === 0; j--)
            ;
        l = this.indCoord[i] - this.indCoord[j];
        v = s + koef(l * this.norm);
        // printText("\t\t\t\t\t\ti " + i + ", j " + j + ", ll " + ll + ", l " + l + ", vv " + vv + ", v " + v + "=" + s + " + " + koef(l * this.norm));
        if (v < vv || (v === vv & l > ll)) {
            pair = [j, i];
            vv = v;
            ll = l;
        }
        s -= this.indHPenalty[j] - this.indVPenalty[j];
        i = j;
    }
    // printText("\t\t\t\t\t\tpair[ " + pair.toString() + "] " + vv + ", " + ll);
    return pair;
};
ConnArea.prototype.processDisconnected = function(segm) {
    // printText("\t\t\t\tprocessDisconnected:");
    if (segm.forward(this.box.id))
        return this.processForward(segm);
    return this.processBackward(segm);
};
ConnArea.prototype.getValueOfPair = function(pair) {
    return pair[0] * this.coors + pair[1];
};
ConnArea.prototype.getPairOfValue = function(v) {
    var mod = v % this.coors;
    return [(v - mod) / this.coors, mod];
};
ConnArea.prototype.processSegms = function() {
    var i, segm, pair, pairV;
    var self = this;
    _.each(this.segments, function(segm){
        if (segm.disconnected) {
            pair = self.processDisconnected(segm);
//            pairV = this.getValueOfPair(pair);
            if (pair === undefined || pair[0] >= pair[1])
                warning("ConnArea.prototype.processSegms wrong pair " + pair.toString());
            else {
                pairV = self.getValueOfPair(pair);
                if (self.pairs[pairV] === undefined)
                    self.pairs[pairV] = [];
                self.pairs[pairV].push(segm);
//                self.indHPenalty[pair[0]]++;
//                self.indHPenalty[pair[1]]--;
            }
        }
        else if (segm.mark === 0) {
            self.indHPenalty[self.coordInd[segm.min]]++;
            self.indHPenalty[self.coordInd[segm.max]]--;
        }
        else
            self.indVPenalty[self.coordInd[segm.lev]] += segm.mark;
//        printText(listPrintString(self.indHPenalty, "hPenalties:", "\t\t\t\t"));
//        printText(listPrintString(self.indVPenalty, "vPnalties:", "\t\t\t\t"));
    });
};
ConnArea.prototype.connectSegms = function() {
    if (this.disconnPaths.length > 3)
        var iii = 0;
    var i, pairV, pair, path, n, g, v, isLast, af, m;
    var self = this;
    // printText(listPrintString(self.indCoord, "indCoord:", "\t\t\t\t"));
    _.each(this.pairs, function(segmList, pairV){
        n = segmList.length;
        segmList.sort((function(a, b) {
            af = a.forward(self.box.id);
            if (af === b.forward(self.box.id))
                if (a.lev === b.lev)
                    return 0;
                else if ((self.side & 2) === 0)
                    if (self.side === 0)
                        // side 0
                        if (af)
                            if (a.lev < b.lev)
                                return -1;
                            else
                                return 1;
                        else
                        if (a.lev < b.lev)
                            return 1;
                        else
                            return -1;
                    else
                    // side 1
                    if (af)
                        if (a.lev < b.lev)
                            return -1;
                        else
                            return 1;
                    else
                    if (a.lev < b.lev)
                        return 1;
                    else
                        return -1;
                else if (self.side === 2)
                    // side 2
                    if (af)
                        if (a.lev < b.lev)
                            return -1;
                        else
                            return 1;
                    else
                    if (a.lev < b.lev)
                        return 1;
                    else
                        return -1;
                    else
                    // side 3
                    if (af)
                        if (a.lev < b.lev)
                            return -1;
                        else
                            return 1;
                    else
                    if (a.lev < b.lev)
                        return 1;
                    else
                        return -1;
            else if (af)
                return -1;
            else
                return 1;
        }));
        var str = "after sort center" + self.box.center[self.side & 1] + "\n";
        _.each(segmList, function(segm){
            str += "\t" + segm.toString() + "; forward " + segm.forward(self.box.id)+ "\n";
        });
        pair = getPairOfValue(pairV, self.coors);
        g = (self.indCoord[pair[1]] - self.indCoord[pair[0]]) / (n + 1);
        v = self.indCoord[pair[0]] + g;
        str += "\t\t\t\t[" + pair.toString() + "]; forw:" + segmList[0].forward(self.box.id) + "; levs:";
        _.each(segmList, function(segm) {
            path = segm.owner;
//            str += "\n" + path.toString() + "\n";
            isLast = (path.from === path.to && segm.ind > 1) || (path.from !== path.to && self.box.id === path.to);
            str += "; " + segm.toString() + ": " + v + ";" + "; last " + isLast;
            m = self.box.center[segm.dir];
            if (segm.dir < 0 || segm.dir > 1 || m === undefined)
                warning("ConnArea.prototype.connectSegms wrong added coordinate " + m + "; segm.dir " + segm.dir);
            if (isLast) {
//                path.lev[path.n] = self.box.onValue(v, self.side);
                path.lev[path.n] = v;
                path.lev.push(m);
            }
            else {
//                path.lev[0] = self.box.onValue(v, self.side);
                path.lev[0] = v;
                path.lev.unshift(m);
                path.dir = 1 - path.dir;
            }
            v += g;
            path.n++;
            str += "; dir " + path.dir + "; n " + n + "; lev " + path.lev.toString();
//            str += ("\n" + path.toString() + "\n");
        });
        // printText(str);
    });
};
ConnArea.prototype.connectPaths = function() {
    // turnOnPrinting("xxx");
    // printText("\t\t\t\t### connectPaths side " + this.side);
    this.initTestRect();
//    this.toString("initTestRect");
    this.collectIntersectSegm();
//    this.toString("collectIntersectSegm");
    this.cutSegmOnArea();
//    this.toString("cutSegmOnArea");
    this.createIntervals();
//    this.toString("createIntervals");
    this.processSegms();
//    this.toString("processSegms");
//    printText(listPrintString(this.pairs, "pairs:", "\t\t\t"));
    this.connectSegms();
    // turnOffPrinting("xxx");
};
ConnArea.prototype.simplifyPaths = function() {
    var self = this;
    var id = this.box.id;
    var selfloops = [];
    var straights = [];
    var segments = [];
    var id = this.box.id;
    var segm;
    _.each(this.connPaths, function(path) {
        if (path.isSelfloop())
            if (path.fromSide() === path.toSide())
                selfloops.push(path);
            else if (path.fromSide() === self.side) {
                segm = path.segm(2);
                segments.push(self.box.offSegm(segm, self.side));
            }
            else {
                segm = path.segm(path.n - 2);
                segments.push(self.box.offSegm(segm, self.side));
            }
        else if (path.n === 2) 
            straights.push(path);
        else if (path.from === id) {
            segm = path.segm(2);
            segments.push(self.box.offSegm(segm, self.side));
        }
        else {
            segm = path.segm(path.n - 2);
            segments.push(self.box.offSegm(segm, self.side));
        }
    });
    segments.sort(function(a, b) {
        af = a.forward(id);
        if (af === b.forward(id))
            if (a.lev === b.lev)
                return 0;
            else if (a.lev < b.lev)
                if (af)
                    return -1;
                else
                    return 1;
            else if (af)
                return 1;
            else
                return -1;

        else if (af < b.forward(id))
            return 1;
        else
            return -1;
    });
    var d = this.side & 1;
    var g = this.box.size[d] / (this.connPaths.length + selfloops.length + 1);
    var v = this.box.center[d] - this.box.size[d] / 2 + g;
    
    var k = 0;
    while (k < segments.length && segments[k].forward(id))
        k++;
    
    var i = 0;
    var path, isSL;
    while (i < k) {
        path = segments[i].owner;
        isSL = path.isSelfloop();
        if ((isSL && segments[k].ind === 2) || (!isSL && path.from === id))
            path.lev[1] = v;
        else
            path.lev[path.n - 1] = v;
        i++;
        v += g;
    }
    _.each(selfloops, function(path){
        path.lev[1] = v;
        i++;
        v += g;
        path.lev[path.n - 1] = v;
        i++;
        v += g;
    });
    _.each(straights, function(path){
        if (path.from === id)
            path.lev[1] = v;
        else
            path.lev[path.n - 1] = v;
        i++;
        v += g;
    });
    while (k < segments.length) {
        path = segments[k].owner;
        isSL = path.isSelfloop();
        if ((isSL && segments[k].ind === 2) || (!isSL && path.from === id))
            path.lev[1] = v;
        else
            path.lev[path.n - 1] = v;
        i++;
        k++;
        v += g;
    }
};
ConnArea.prototype.toString = function(text) {
    var tabs = "\t\t\t";
//     printText(tabs + "ConnArea::" + text);
//     printText(tabs + "\tside " + this.side);
//     printText(tabs + "\ttestRect " + this.testRect.toString());
// //    printText(tabs + "\tsegments: ");
// //    _.each(this.segments, function(segm) {printText(tabs + "\t\t" + segm.toString() + "; level " + segm.level()); });
//     printText(listPrintString(this.indCoord, "indCoord", tabs));
//     printText(listPrintString(this.coordInd, "coordInd", tabs));
//     printText(" ");
};

export default ConnArea