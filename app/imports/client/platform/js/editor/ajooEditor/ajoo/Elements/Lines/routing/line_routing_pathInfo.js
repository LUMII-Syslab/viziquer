// import { _ } from 'vue-underscore';
import SegmInfo from './line_routing_segInfo'
import PointInfo from './line_routing_pointInfo'

import {getPairOfValue, getValueOfPair, cloneObject, cloneArray, rectOverlapRect, rectInsideRect, listPrintString, reconvertArray, convertArray, reconvert, convert, koef} from './line_routing_other'
import {SVGObject, LineSVGObject} from './svg_collisions'

////******************************************************************************
// PathInfo 
//******************************************************************************
var PathInfo = function(info) {
    this.fromRect;
    this.fromCenter;
    this.toRect;
    this.toCenter;
    this.ind = -1;
    _.extend(this, info);
    this.n = this.lev.length - 1;
}
;
//PathInfo.prototype.convert = function() {
//    addText("\n\t convert path " + this.toString());
//    convertArray(this.lev);
//    convertArray(this.fromCenter);
//    convertArray(this.fromRect);
//    convertArray(this.toCenter);
//    convertArray(this.toRect);
//    printText(" ==> " + this.toString());
//};
//PathInfo.prototype.reconvert = function() {
//    reconvertArray(this.lev);
//    reconvertArray(this.fromCenter);
//    reconvertArray(this.fromRect);
//    reconvertArray(this.toCenter);
//    reconvertArray(this.toRect);
//};
PathInfo.prototype.reverse = function() {
    this.lev.reverse();
    this.dir = (this.dir + this.n) & 1;

    var obj = this.from;
    this.from = this.to;
    this.to = obj;

    obj = this.fromRect;
    this.fromRect = this.toRect;
    this.toRect = obj;

    obj = this.fromCenter;
    this.fromCenter = this.toCenter;
    this.toCenter = obj;

    if (this.ind >= 0 && this.ind < this.n) {
        this.ind = this.n - this.ind;
    }
};
PathInfo.prototype.segm = function(ind) {
    var segm;
    if (ind < 1 || ind >= this.n) {
        // warning(" PathInfo.prototype.segm index wrong " + ind);
    }
    else if (this.lev[ind - 1] <= this.lev[ind + 1])
        segm = new SegmInfo([(this.dir + ind) & 1, this.lev[ind - 1], this.lev[ind], this.lev[ind + 1], ind, this, "s"]);
    else
        segm = new SegmInfo([(this.dir + ind) & 1, this.lev[ind + 1], this.lev[ind], this.lev[ind - 1], ind, this, "s"]);
    return segm;
};
PathInfo.prototype.point = function(ind) {
    var rc;
    if (ind < 0 || ind >= this.n) {
        // warning(" PathInfo.prototype.point index wrong " + ind.toString() + this);
    }
    else {
        var dir = (ind + this.dir) & 1;
        rc = new PointInfo([this.lev[ind + dir], this.lev[ind + 1 - dir], ind]);
    }
    return rc;
};
//    sides
//      0
//    1   3
//      2
PathInfo.prototype.fromSide = function() {
    if (this.hasFromProj())
        if (this.lev[0] < this.lev[2])
            return 3 - this.dir;
        else
            return 1 - this.dir;
    else
    if (this.lev[1] < this.fromCenter[1 - this.dir])
        return this.dir;
    else
        return 2 + this.dir;
};
PathInfo.prototype.toSide = function() {
    var dir = (this.n + this.dir) & 1;
    if (this.hasToProj())
        if (this.lev[this.n] < this.lev[this.n - 2])
            return 3 - dir;
        else
            return 1 - dir;
    else if (this.lev[this.n - 1] < this.toCenter[1 - dir])
        return dir;
    else
        return 2 + dir;
};
PathInfo.prototype.side = function(boxId) {
    var rc = (this.from === boxId) ? this.fromSide() : this.toSide();
//    var str = "PathInfo.prototype.side rect ";
//    str += (this.from === boxId) ? "from " : "to ";
//    str += " rect:" + ((this.from === boxId) ? this.fromRect : this.toRect).toString();
//    str += " center:" + ((this.from === boxId) ? this.fromCenter : this.toCenter).toString();
//    str += "; dir " + this.dir + "; lev:" + this.lev.toString();
//    str += "; hasproj " + ((this.from === boxId) ? this.hasFromProj() : this.hasToProj()).toString();
//    str += " === " + rc;
//    printText(str);
    return rc;
};
PathInfo.prototype.isDragged = function() {
    return this.owner.isDraggedBox[this.from] && this.owner.isDraggedBox[this.to];
};
PathInfo.prototype.hasDragged = function() {
    return this.owner.isDraggedBox[this.from] || this.owner.isDraggedBox[this.to];
};
PathInfo.prototype.setMovedBoxConnection = function(box) {
    var c0 = (this.from === box.id) ? 0 : this.n;
    var c2 = (this.from === box.id) ? 1 : this.n - 1;
    var d = (this.lev[c0] < this.lev[c2]) ? 2 : 0;
    this.lev[c0] = box.rect()[this.dir + d];
};
PathInfo.prototype.fromInsideTo = function() {
    return this.toRect[0] < this.fromRect[0] && this.toRect[2] > this.fromRect[2] &&
            this.toRect[1] < this.fromRect[1] && this.toRect[3] > this.fromRect[3];
};
PathInfo.prototype.dummyPath = function(f, t) {
    var str = "dummyDeltaPath 1 f " + f.toString() + "; t " + t.toString();
    var v;
    if (f[0] <= t[2] && t[0] <= f[2]) {
        this.dir = 1;
        if (f[1] >= t[3])
            v = [f[1], (Math.max(f[0], t[0]) + Math.min(f[2], t[2])) / 2, t[3]];
        else
            v = [f[3], (Math.max(f[0], t[0]) + Math.min(f[2], t[2])) / 2, t[1]];
        str += "::1:: v " + v.toString();
    }
    else if (f[1] <= t[3] && t[1] <= f[3]) {
        this.dir = 0;
        if (f[0] >= t[2])
            v = [f[0], (Math.max(f[1], t[1]) + Math.min(f[3], t[3])) / 2, t[2]];
        else
            v = [f[2], (Math.max(f[1], t[1]) + Math.min(f[3], t[3])) / 2, t[0]];
        str += "::2:: v " + v.toString();
    }
    else {
        this.dir = 0;
        if (f[2] < t[0])
            if (f[3] < t[1])
                v = [f[2], this.fromCenter[1], this.toCenter[0], t[1]];
            else
                v = [f[2], this.fromCenter[1], this.toCenter[0], t[3]];
        else
        if (f[3] < t[1])
            v = [f[0], this.fromCenter[1], this.toCenter[0], t[1]];
        else
            v = [f[0], this.fromCenter[1], this.toCenter[0], t[3]];
        str += "::3:: v " + v.toString();
    }
    this.lev = v;
    this.n = this.lev.length - 1;
    this.testPath("dummyPath", 0, -1, true);
    // printText(str);
    return v;
};
PathInfo.prototype.dummyDeltaPath = function(delta2) {
    var f = this.fromRect;
    var t = this.toRect;
    var fBox = this.owner.infoDataMap[this.from]; 
    var tBox = this.owner.infoDataMap[this.to]; 
    var delta = delta2 * 2;
    var v;
    var q = [];
    for (var i = 0; i < 3; i++)
        if (!fBox.corner(i).inside(t) && !tBox.corner(i).inside(f)) {
            var iy = 1 + (i & 1) * 2;
            var ix = i & 2;
            q.push(Math.abs(f[ix] - t[ix]));
            q.push(Math.abs(f[iy] - t[iy]));
        }
        else
            q.push(-1, -1);
    var max = [-1, -1];
    _.each(q, function(v, i) {
        if (max[0] < v)
            max = [v, i];
    });
    if (max[0] > delta2) {
//        var d = 1 - (max[1] & 1);
        var d = max[1] & 1;
        var s = max[1] >> 1;
        if (max[1] < 4)
            if (max[1] < 2)
                if ((max[1] < 1))
                    // 0
                    if (f[0] < t[0])
                        v = [f[1], t[0] - delta2, t[1] - delta2, t[0] + delta2, t[1]];
                    else
                        v = [f[1], f[0] + delta2, f[1] - delta2, t[0] - delta2, t[1]];
                // 1
                else if (f[1] < t[1])
                    v = [f[0], t[1] - delta2, t[0] - delta2, t[1] + delta2, t[0]];
                else
                    v = [f[0], f[1] + delta2, f[0] - delta2, t[1] - delta2, t[0]];
            else if (max[1] < 3)
                // 2
                if (f[0] < t[0])
                    v = [f[3], t[0] - delta2, t[3] + delta2, t[0] + delta2, t[3]];
                else
                    v = [f[3], f[0] + delta2, f[3] + delta2, t[0] - delta2, t[3]];
            // 3
            else if (f[1] < t[1])
                v = [f[0], f[3] - delta2, f[0] - delta2, f[3] + delta2, t[0]];
            else
                v = [f[0], t[3] + delta2, t[0] - delta2, t[3] - delta2, t[0]];
        else if (max[1] < 6)
            if (max[1] < 5)
                // 4
                if (f[2] > t[2])
                    v = [f[1], t[2] + delta2, t[1] - delta2, t[2] - delta2, t[1]];
                else
                    v = [f[1], f[2] + delta2, f[1] - delta2, f[2] - delta2, t[1]];
            // 5
            else if (f[1] < t[1])
                v = [f[2], t[1] - delta2, t[2] + delta2, t[1] + delta2, t[2]];
            else
                v = [f[2], f[1] - delta2, f[2] + delta2, f[1] + delta2, t[2]];
        else if (max[1] < 3)
            // 6
            if (f[0] < t[0])
                v = [f[1], t[0] - delta2, t[1] - delta2, t[0] + delta2, t[1]];
            else
                v = [f[1], f[0] + delta2, f[1] - delta2, t[0] - delta2, t[1]];
        // 7
        else if (f[0] < t[0])
                v = [f[2], t[3] + delta2, t[2] + delta2, t[3] - delta2, t[3]];
            else
                v = [f[2], f[3] + delta2, f[2] + delta2, f[3] - delta2, t[3]];
        // printText("dummyDeltaPath delta2 " + delta2 + "; max " + max.toString() + "; d " + d + "; s " + max[1] + "; v " + v.toString() + "; q " + q.toString());
        printText("\t f " + f.toString());
        printText("\t t " + t.toString());
        this.dir = 1 - (max[1] & 1);
        this.lev = v;
        this.n = this.lev.length - 1;
        this.testPath("dummyDeltaPath", 0, -1, true);
        return v;
    }
    if (delta2 < 4)
        var iii = 0;
    // printText("dummyDeltaPath delta2 " + delta2);
    return v;
};
PathInfo.prototype.setDummySinglePath = function() {
    // turnOnPrinting("xxx");
    
    var f = this.fromRect;
    var t = this.toRect;
    var v;
//    if (rectInsideRect(f, t))
//        v = this.dummyPath(f, t);
//    else if (rectInsideRect(t, f))
//        v = this.dummyPath(t, f);
//    else if (rectOverlapRect(f, t)) {
//        v = this.dummyDeltaPath(this.owner.delta2);
//        if (v === undefined) {
//            v = this.dummyDeltaPath(2);
//            if (v === undefined)
//                v = this.dummyPath(f, t);
//        }
//    }
//    else {
        v = this.dummyPath(f, t);
//    }
    this.lev = v;
    this.n = this.lev.length - 1;
    if (this.n < 2 || !this.hasFromProj(this.from) || !this.hasFromProj(this.to)) {
        // warning("PathInfo.prototype.setDummySinglePath wrong path " + this.toString());
    }
    this.testPath("setDummySinglePath", 0, -1, true);
//    if (this.owner.needTest && !(this.hasFromProj() && this.hasToProj()))
//        warning("PathInfo.prototype.setDummySinglePath has not projection " + str + "; " + this.toString());
    // turnOffPrinting("xxx");

//    printText(", dir:" + this.dir + ", v:" + v.toString());
//    this.smoothConnection(this.from);
//    this.smoothConnection(this.to);
};
PathInfo.prototype.setDummySelfloop = function() {
    var q = [0, 0];
    var c = this.fromCenter;
    var d = this.dir;
    _.each(this.lev, function(v){
        q[d] += v - c[d];
        d = 1 - d;
    });
    var corner = (q[0] > 0) ? ((q[1] > 0) ? 3 : 2) : (q[1] > 0) ? 1 : 0;
    this.owner.dummySelfloopCornerCount[corner]++;
    var delta = this.owner.delta * this.owner.dummySelfloopCornerCount[corner];
    
    if (corner === 0)
        this.lev = [this.fromRect[0] + delta, this.fromRect[1] - delta, this.fromRect[0] - delta, this.fromRect[1] + delta];
    else if (corner === 1)
        this.lev = [this.fromRect[0] + delta, this.fromRect[3] + delta, this.fromRect[0] - delta, this.fromRect[3] - delta];
    else if (corner === 2)
        this.lev = [this.fromRect[2] - delta, this.fromRect[1] - delta, this.fromRect[2] + delta, this.fromRect[1] + delta];
    else 
        this.lev = [this.fromRect[2] - delta, this.fromRect[3] + delta, this.fromRect[2] + delta, this.fromRect[3] - delta];
    this.dir = 0;
    this.n = this.lev.length - 1;
    
    // printText("setDummySelfloop q = " + q.toString() + "; corner " + corner + "; delta " + delta + "; " + this.toString());
};
PathInfo.prototype.setDummyPath = function() {
    if (this.isSelfloop())
        this.setDummySelfloop();
    this.setDummySinglePath();
};
PathInfo.prototype.clipOnBoxes = function() {

    this.testPath("clipOnBoxes start", 0, -1, false);
//    printText("; clipOnBoxes " + this.toString());
    if (this.fromCenter[this.dir] < this.lev[2]) {
        this.lev[0] = this.fromRect[2 + this.dir];
    }
    else {
        this.lev[0] = this.fromRect[this.dir];
    }

    var dir = (this.dir + this.n) & 1;
    var center = this.toCenter;

    if (this.toCenter[dir] < this.lev[this.n - 2]) {
        this.lev[this.n] = this.toRect[2 + dir];
    }
    else {
        this.lev[this.n] = this.toRect[dir];
    }

    //Artura kods
    //creating first segment => [x0, y0, x1, y1]
    this.lev[0] = this.fromCenter[this.dir];
    var point0 = this.point(0);
    var point1 = this.point(1);

//clipping start point
    var start_line_points = this.buildEndSegmentForClipping(point0, point1);
    var start_segment_svg = new LineSVGObject(start_line_points, 0);

    var new_start_point_obj = start_segment_svg.getIntersectionWithElement(this.fromObject, [point1.c[0], point1.c[1]]);   
    if (new_start_point_obj.point && new_start_point_obj.point.length === 2) {
        this.lev[0] = new_start_point_obj.point[this.dir];
        this.lev[1] = new_start_point_obj.point[1 - this.dir];
    }
    // else {
    //     warning("clipOnBoxes: " + new_start_point_obj.point);
    // }

//clipping end point
    point0 = this.point(this.n - 2);
    point1 = this.point(this.n - 1);
    
    // if (point0 === undefined || point1 === undefined) {
    //     warning("clipOnBoxes: endpoints are undefined " + this.toString());
    // }

    var dir = (this.dir + this.n) & 1;
    this.lev[this.n] = this.toCenter[this.dir];

    var end_line_points = this.buildEndSegmentForClipping(point0, point1);
    var end_segment_svg = new LineSVGObject(end_line_points, 0);

    var new_end_point_obj = end_segment_svg.getIntersectionWithElement(this.toObject, [point0.c[0], point0.c[1]]);
    if (new_end_point_obj.point && new_end_point_obj.point.length === 2) {
       this.lev[this.n] = new_end_point_obj.point[dir];
       this.lev[this.n - 1] = new_end_point_obj.point[1 - dir];
    }
    // else {
    //    warning("clipOnBoxes: " + new_end_point_obj.point);
    // }
};

PathInfo.prototype.buildEndSegmentForClipping = function(point0, point1) {

    var inf = 100000;
    var line_points;

    //horizontal
    if (point0.c[1] === point1.c[1])
        line_points = [-inf, point0.c[1], inf, point1.c[1]];

    //vertical
    else
        line_points = [point0.c[0], -inf, point1.c[0], inf];

    return line_points;
};


PathInfo.prototype.isSegmentHorizontal = function() {

    if (((this.dir + this.n) &1) === 0) {
        return true;
    }

};

PathInfo.prototype.getSegmIntersectWithToBox = function(ind) {
    // ind index whick reprezented first tested segment
    var rc = -1;
    for (var i = ind; rc < 0 && i < this.n; i++)
        if (this.segm(i).intersectRect(this.toRect))
            rc = i;
//    printText("\t getSegmIntersectWithToBox: " + rc + "; ind" + ind + "; rect:" + this.toRect.toString());
    return rc;
};
PathInfo.prototype.getSegmIntersectWithFromBox = function(ind) {
    // ind index whick reprezented first tested segment
    var rc = -1;
    for (var i = ind; rc < 0 && i > 0; i--)
        if (this.segm(i).intersectRect(this.fromRect))
            rc = i;
//    printText("\t getSegmIntersectWithFromBox: " + rc + "; ind" + ind + "; rect:" + this.fromRect.toString());
    return rc;
};
PathInfo.prototype.getFirstPointOutsideFromBox = function(ind) {
    // ind index whick reprezented first tested segment
    var rc = -1;
    for (var i = ind; rc < 0 && i < this.n; i++)
        if (!this.point(i).inside(this.fromRect))
            rc = i;
//    printText("\t getSegmIntersectWithFromBox: " + rc + "; ind" + ind + "; rect:" + this.fromRect.toString());
    return rc;
};
PathInfo.prototype.getFirstPointOutsideToBox = function(ind) {
    // ind index whick reprezented first tested segment
    var rc = -1;
    for (var i = ind; rc < 0 && i >= 0; i--)
        if (!this.point(i).inside(this.toRect))
            rc = i;
//    printText("\t getSegmIntersectWithFromBox: " + rc + "; ind" + ind + "; rect:" + this.fromRect.toString());
    return rc;
};
PathInfo.prototype.hasFromProj = function() {
    var segm = this.segm(1);
    // if (segm === undefined) {
    //     warning("PathInfo.prototype.hasFromProj segm undefined" );
    // }
    var rc = segm.projRect(this.fromRect);
//    printText("\t\thasFromProjection: " + rc + "; segm: " + segm.toString() + "; toRect" + this.fromRect.toString());
    return rc;
};
PathInfo.prototype.hasToProj = function() {
    var segm = this.segm(this.n - 1);
    // if (segm === undefined) {
    //     warning("PathInfo.prototype.hasFromProj segm undefined" );
    // }
    var rc = segm.projRect(this.toRect);
    return rc;
};
PathInfo.prototype.hasProj = function(boxId) {
    var rc = true;
    if (this.from === boxId)
        rc &= this.hasFromProj();
    if (this.to === boxId)
        rc &= this.hasToProj();
    return rc;
};
PathInfo.prototype.addFromBend = function() {
    this.testPath("addFromBend start", 0, -1, false);
    if (this.hasFromProj()) {
        // warning("PathInfo.prototype.addFromBend this path has from projection " + this.toString());
        return;
    }
    var center = this.fromCenter;

    var d = this.dir;
    if (this.segm(1).projRect(this.toRect)) {
        var pv = this.lev[0];
        this.lev[0] = center[d];
        if (this.point(0).inside(this.toRect)) {
            // move point outside toRect
            if (this.lev[2] > center[d])
                if (this.toRect[2 + d] + this.owner.delta < this.fromRect[2 + d]) {
                    this.lev[0] = (this.fromRect[2 + d] + this.toRect[2 + d]) / 2;
                    this.lev.unshift(center[1 - d]);
                    this.dir = 1 - d;
                }
                else {
                    this.lev[0] = pv;
                    this.lev.unshift(center[d], center[1 - d]);
                }
            else if (this.toRect[d] - this.owner.delta < this.fromRect[d]) {
                this.lev[0] = (this.fromRect[d] + this.toRect[d]) / 2;
                this.lev.unshift(center[1 - d]);
                this.dir = 1 - d;
            }
            else {
                this.lev[0] = pv;
                this.lev.unshift(center[d], center[1 - d]);
            }
        }
        else {
            this.lev.unshift(center[1 - d]);
            this.dir = 1 - d;
        }
    }
    else {
        this.lev[0] = center[d];
        this.lev.unshift(center[1 - d]);
        this.dir = 1 - d;
    }

    this.n = this.lev.length - 1;
    this.testPath("addFromBend", 0, -1, false);
    // printText("; addFromBend final path: " + this.toString());
};
PathInfo.prototype.addToBend = function() {
    this.testPath("addToBend start", 0, -1, false);
    if (this.hasToProj()) {
        // warning("PathInfo.prototype.addToBend this path has from projection " + this.toString());
        return;
    }
    var center = this.toCenter;

    // addText("\n\t\t\taddToBend seq:");

    var d = (this.n + this.dir) & 1;
    if (this.segm(this.n - 1).projRect(this.fromRect)) {
        var pv = this.lev[this.n];
        this.lev[this.n] = center[d];
        if (this.point(this.n - 1).inside(this.fromRect)) {
            // move point outside fromRect
            if (this.lev[this.n - 2] > center[d])
                if (this.fromRect[2 + d] + this.owner.delta < this.toRect[2 + d]) {
                    // addText(" ==> 1");
                    this.lev[this.n] = (this.toRect[2 + d] + this.fromRect[2 + d]) / 2;
                    this.lev.push(center[1 - d]);
                }
                else {
                    // addText(" ==> 2");
                    this.lev[this.n] = pv;
                    this.lev.push(center[d], center[1 - d]);
                }
            else if (this.fromRect[d] - this.owner.delta < this.toRect[d]) {
                // addText(" ==> 3");
                this.lev[this.n] = (this.toRect[d] + this.toRect[d]) / 2;
                this.lev.push(center[1 - d]);
            }
            else {
                // addText(" ==> 4");
                this.lev[this.n] = pv;
                this.lev.push(center[d], center[1 - d]);
            }
        }
        else {
            // addText(" ==> 5");
            this.lev.push(center[1 - d]);
        }
    }
    else {
        // addText(" ==> 6");
        this.lev[this.n] = center[d];
        this.lev.push(center[1 - d]);
    }
    // printText(" ");

    this.n = this.lev.length - 1;
    this.testPath("addToBend", 0, -1, false);
    // printText("; addToBend final path: " + this.toString());
};
PathInfo.prototype.cutPoints = function(cutList) {
    // addText("\t\tcutPoints before cutList: " + cutList.toString());
    if (cutList.length === 2 && cutList[0] === 0 && cutList[1] === this.n)
        return;
    var k = cutList.length;
    var cor = ((k & 1) === 0 && k > 1);
    for (var i = 0; cor && i < k; i += 2)
        cor = cutList[i] < cutList[i + 1] && (i < 2 || cutList[i - 1] < cutList[i]);
    if (!cor) {
        // warning("cutPoints wrong cutList " + cutList.toString());
        return;
    }

    var j = 0;
    var m = -1;
    for (var i = 0; cutList[i] <= this.ind && i < k; i += 2) {
        if (cutList[i] <= this.ind && this.ind <= cutList[i + 1])
            m = j + this.ind - cutList[i];
        j += cutList[i + 1] - cutList[i];
    }
    this.ind = m;
    var newLev = [];
    if ((cutList[0] & 1) === 1)
        this.dir = 1 - this.dir;
    for (var i = 0; i < k; i += 2)
        for (var j = cutList[i]; j <= cutList[i + 1]; j++)
            newLev.push(this.lev[j]);
    this.lev = newLev;
    this.n = this.lev.length - 1;
};
PathInfo.prototype.simplifyFrom = function() {
    if (this.testPath("input simplifyFrom", "", false, false))
        return;
    var ps = this.point(0);
    var pf = this.point(this.n - 1);
    if (this.point(0).inside(this.toRect) ||
            this.point(this.n - 1).insideRect(this.fromRect) ||
            (rectOverlapRect(this.fromRect, this.toRect) && this.n === 2))
        this.setDummyPath();
    else {
        var j = this.getSegmIntersectWithToBox(1);
        if (j < this.n - 1) {
            if (j === -1) {
                if (!this.hasToProj())
                    this.addToBend();
                j = this.n;
            }
            else {
                this.cutPoints([0, j + 1]);
            }
        }
        var i = this.getSegmIntersectWithFromBox(this.n - 1);
        if (i === -1) {
            if (!this.hasFromProj())
                this.addFromBend();
        }
        else if (i > 1) {
            this.cutPoints([i - 1, this.n]);
        }
    }
    this.n = this.lev.length - 1;
    this.clipOnBoxes();
    if (this.testPath("output simplifyFrom", "", false, true))
        return;
};
PathInfo.prototype.simplifyTo = function() {
    if (this.testPath("input simplifyTo", "", false, false)) {
        return;
    }
    this.reverse();
    this.simplifyFrom();
    this.reverse();
    if (this.testPath("output simplifyTo", "", false, true))
        return;
};
PathInfo.prototype.smoothConnection = function(boxId) {
    if (this.n < 3) {
        // warning("PathInfo.prototype.smoothConnectionNew path do not have bends " + this.n);
        return;
    }
    var side = this.side(boxId);
    var box = this.owner.infoDataMap[boxId];
    var rect = box.rect();
    var otherRect = (this.from === boxId) ? this.toRect : this.fromRect;
    var dir = side & 1;
    var dif = side & 2;
    var vs = [rect[dir], rect[2 + dir]];
    var v = (this.from === boxId) ? 2 : this.n - 2;
    if (this.segm(v).projRect(otherRect) &&
            vs[0] < otherRect[2 + dir] && otherRect[dir] < vs[1]) {
        if (vs[0] < otherRect[dir])
            vs[1] = otherRect[dir];
        else
            vs[0] = otherRect[2 + dir];
    }

    var test;
    if (side === 0)
        test = [vs[0], this.lev[v], vs[1], rect[1]];
    else if (side === 1)
        test = [this.lev[v], vs[0], rect[0], vs[1]];
    else if (side === 2)
        test = [vs[0], rect[1], vs[1], this.lev[v]];
    else if (side === 3)
        test = [rect[2], vs[0], this.lev[v], vs[1]];
    else {
        // warning("PathInfo.prototype.smoothConnectionNew wrong side " + side);
        return;
    }
    var testSegm = new SegmInfo([1 - dir, test[dir], this.lev[v], test[2 + dir], -1, this, "s"]);
    // printText("\t\t\tsmoothConnection dir:" + dir + "; vs:" + vs.toString() + "; fs:" + testSegm.toString());
    var segmList = [];
    var levMap = {};
    var levList = [test[dir], test[2 + dir]];
    levMap[test[dir]] = 0;
    levMap[test[2 + dir]] = 0;
    var stright = this.n === 2;
    var sign = (!stright &&
            ((this.from === boxId && this.lev[1] < this.lev[3]) ||
                    (this.to === boxId && this.lev[this.n - 1] < this.lev[this.n - 3]))) ? -1 : 1;
    for (var j = 0; j < box.paths.length; j++) {
        var path = box.paths[j];
        if (path !== this && side === path.side(box.id)) {
            for (var i = 1; i < path.n; i++) {
                var segm = path.segm(i);
                if (segm.intersectRect(test)) {
                    segmList.push(segm);
                    if (dir === segm.dir) {
                        if (!stright && segm.intersectSegm(testSegm)) {
                            var v = segm.lev;
                            if (levMap[v] === undefined) {
                                levMap[v] = 0;
                                levList.push(v);
                            }
                            levMap[v] += 1;
                        }
                    }
                    else {
                        var v = Math.max(test[dir], segm.min);
                        if (levMap[v] === undefined)
                            levMap[v] = 0;
                        levMap[v] += sign;
                        v = Math.min(test[2 + dir], segm.max);
                        if (levMap[v] === undefined) {
                            levMap[v] = 0;
                            levList.push(v);
                        }
                        levMap[v] -= sign;
                    }
                }
            }
        }
    }
    // TODO skatit kapec ir testa segments garuma 0
    if (levList.length < 2)
        levList.push(levList[0]);

    for (var i = 0; i < levList.length; i++)
        if (isNaN(levList[i])) {
            // warning("PathInfo.prototype.smoothConnection level ie NaN " + levList.toString());
        }

    levList.sort((function(a, b) {
        return (a < b) ? -1 : (a > b) ? 1 : 0;
    }));
    if (sign === -1)
        levList.reverse();
    
    // find best interval
    // addText("\n\t\t\t levList::");
    // for (var i = 0; i < levList.length; i++)
        // addText(" (" + levList[i] + "; " + levMap[levList[i]] + ")");?
    // printText(".");
    
    var m = -1;
    var v = Number.MAX_VALUE;
    var k = 0;
//    addText("\t\t\tfind: ");
    for (var i = 0; i < levList.length - 1; i++) {
        var j1 = levList[i];
        var j2 = levList[i + 1];
        var diff = Math.abs(j2 - j1);
        k += levMap[j1];
        var d = koef(diff);
        if (v > k + d) {
            m = i;
            v = k + d;
        }
    }

    if (this.from === boxId) {
        v = (levList[m + 1] + levList[m]) / 2;
        this.lev[1] = v;
    }
    else {
        var v = (levList[m + 1] + levList[m]) / 2;
        this.lev[this.n - 1] = v;
    }
    // if (this.testPath("smoothConnection", 0, -1, false))
        // printText("\t\tsmoothConnection " + this.toSide());
};
PathInfo.prototype.toString = function() {
    var str = "path{";
    str += "id:" + this.id + "; dir:" + this.dir + "; n:" + this.n;
    str += "; from:" + this.from;

//    str += "; fromSide:" + this.side(this.from);
    str += "; fromRect:" + this.fromRect.toString();
    str += "; to:" + this.to;
//    str += "; toSide:" + this.side(this.to);
    str += "; toRect:" + this.toRect.toString();
    str += "; dir:" + this.dir;
    str += "; n:" + this.n;
    str += "; lev:" + this.lev.toString();
    str += "}";
    return str;
};
PathInfo.prototype.isSelfloop = function() {
    return this.from === this.to;
};
PathInfo.prototype.simplifySelfloop = function() {
    if (!this.hasToProj()) {
        this.addToBend();
        // printText("\t\t\t addToBend ");
        this.smoothConnection(this.to);
    }
    if (!this.hasFromProj()) {
        this.addFromBend();
        // printText("\t\t\t addFromBend ");
        this.smoothConnection(this.from);
    }
    var f = this.getFirstPointOutsideFromBox(1);
    var t = this.getFirstPointOutsideToBox(this.n - 1);
    if (f < t && (f > 1 || t < this.n - 1))
        this.cutPoints([f - 1, t + 2]);
    
};
PathInfo.prototype.simplifyPath = function() {
    if (this.point(0).inside(this.toRect) || this.point(this.n - 1).inside(this.fromRect)) {
        this.setDummyPath();
        // printText("\t\t\t setDummyPath 1 ");
//        return;
    }

    var sf = this.getSegmIntersectWithFromBox(this.n - 1);
    var st = this.getSegmIntersectWithToBox(1);
    var rOR = rectOverlapRect(this.fromRect, this.toRect);
    var dir = (this.dir + sf + 1) & 1;
    // printText("\t\t\t sf " + sf + "; st " + st + "; rOR " + rOR);

    if (sf >= 0 && st >= 0) {
        if (sf > st || (sf === st &&
                (rOR || this.toCenter[dir] < this.fromCenter[dir] !==
                        this.lev[sf + 1] < this.lev[sf - 1]))) {
            this.setDummyPath();
            // printText("\t\t\t setDummyPath 2 ");
//            return;
        }
        else if (sf > 1 || st < this.n - 1) {
            this.cutPoints([sf - 1, st + 1]);
            // printText("\t\t\t cutPoints 1 ");
        }
    }
    else {
        if (st === -1 && !this.hasToProj()) {
            this.addToBend();
            // printText("\t\t\t addToBend ");
//            printText("\t\tpath 1:[" + this.lev.toString() + "]; " + this.dir);
            this.smoothConnection(this.to);
            st = this.n - 1;
        }
        else if (st === -1)
            st = this.n - 1;
        if (sf === -1 && !this.hasFromProj()) {
            if (st > 0)
                st++;
            this.addFromBend();
            // printText("\t\t\t addFromBend ");
            this.smoothConnection(this.from);
            st = this.getSegmIntersectWithToBox(1);
            sf = 1;
        }
        else if (sf === -1)
            sf = 1;
        if (sf > 1 || st < this.n - 1) {
            var i = (st === -1) ? this.n : st + 1;
            this.cutPoints([sf - 1, i]);
            // printText("\t\t\t cutPoints 2 ");
        }
    }
};
PathInfo.prototype.simplify = function() {
    // printText("\n>>>>>>>>>>>>>>>>>>>>>>>>> simplify >>>>>>>>>>>>>>>>>>>>>>>>>\n");
    if (this.owner.needTest) {
        // testOperation = "simplify";
        if (this.testPath("input simplify", 0, false, false)) {
            return;
        }
    }
    // printText("\t\tsimplify start: " + this.toString());

    if (this.isSelfloop())
        this.simplifySelfloop();
    else
        this.simplifyPath();
        
    this.n = this.lev.length - 1;
    this.clipOnBoxes();
    // printText("\n\t\tsimplify final: " + this.toString());
    // printText("\n<<<<<<<<<<<<<<<<<<<<<<<<< simplify <<<<<<<<<<<<<<<<<<<<<<<<<\n");
    if (this.owner.needTest) {
        if (this.testPath("output simplify", 0, false, true)) {
            return;
        }
    }
};
PathInfo.prototype.removeStep = function(k) {
    if (k < 1 || k > this.n - 1){
        // warning("PathInfo.prototype.removeStep can not remove this step.");
        return;
    }
    for (var i = k; i <= this.n; i++)
        this.lev[i - 2] = this.lev[i];
    this.lev.pop();
    this.lev.pop();
    this.n = this.lev.length - 1;
};
PathInfo.prototype.removeGaps = function(ind) {
//    turnOnPrinting("111");
    if (this.n < 5)
        return;
    var k = ind;
    var str = "removeGaps k " + k + "; n " + this.n + "; lev: " + this.lev.toString();
    if (this.isSelfloop() && this.n < 6) {
        if (this.n === 4 && k === 2) {
            var d = this.dir;
            if (Math.abs(this.lev[k] - this.toCenter[d]) < this.toCenter[d] - this.toRect[d] + this.owner.limPathGap())
                if (this.lev[k] < this.toCenter[d])
                    this.lev[k] = this.toRect[d] - this.owner.limPathGap();
                else
                    this.lev[k] = this.toRect[2 + d] + this.owner.limPathGap();
            str += "; newlev: " + this.lev.toString();
        }
        // printText("selfloop ==> " + str);
        return;
    }
    if (k > 1) {
        var gap = Math.abs(this.lev[k - 2] - this.lev[k]);
        str += "; gap " + gap;
        if (gap < this.owner.limPathGap()) {
            this.removeStep(k);
            k -= 2;
        }
        str += "; newlev: " + this.lev.toString();
    }
    if (k < this.n - 2) {
        var gap = Math.abs(this.lev[k + 2] - this.lev[k]);
        str += "; gap " + gap;
        if (gap < this.owner.limPathGap())
            this.removeStep(k + 2);
        str += "; newlev: " + this.lev.toString();
    }
    // printText(str);
    this.testPath("PathInfo.prototype.removeGaps ", 0, -1, true);
//    turnOffPrinting("111");
};
PathInfo.prototype.onDragSegm = function(ind) {
    this.removeGaps(ind + 1);
    this.simplify();
};
PathInfo.prototype.testPath = function(name, n, testInd, final) {
    if (!this.owner.needTest) {
        return false;
    }

    // test path
    // if (!emptyTest()) {
    //     return true;
    // }

    // addTitle(name + n);
    if (this.lev === undefined || this.lev === null) {
        // warning("PathInfo.prototype.testPath " + name + "; wrong lev: " + this.lev + "; ");
        return true;
    }
    for (var i = 0; i < this.lev.length; i++)
        if (this.lev[i] === undefined || isNaN(this.lev[i])) {
            // warning("PathInfo.prototype.testPath " + name + "; wrong lev value in: " + i + "; lev: ");
            return true;
        }
    if (final && !this.hasFromProj()) {
        // warning("PathInfo.prototype.testPath " + name + "; wrong from connection: ");
        return true;
    }
    if (final && !this.hasToProj()) {
        // warning("PathInfo.prototype.testPath " + name + "; wrong to connection: ");
        return true;
    }
    return false;
};

PathInfo.prototype.avoidPathCrossings = function() {
    // printText("\tavoidCrossings start " + this.toString());
    var sf = this.getSegmIntersectWithFromBox(this.n - 1);
    var st = this.getSegmIntersectWithToBox(1);
    // printText("\t\t sf = " + sf + "; st = " + st);
    if (sf !== -1 && st !== -1)
        if (sf > st)
            this.setDummyPath();
        else {
            if (sf > 1 || st < this.n - 2)
                this.cutPoints([sf - 1, st + 1]);
        }
    else {
        if (sf === -1) {
            if (st > 0 && st < this.n - 1)
                this.cutPoints([0, st + 1]);
            if (!this.hasFromProj())
                this.addFromBend();
        }
        if (st === -1) {
            if (sf > 1)
                this.cutPoints([sf - 1, this.n]);
            if (!this.hasToProj())
                this.addToBend();
        }
    }
    this.lev[0] = this.fromCenter[this.dir];
    this.lev[this.n] = this.toCenter[(-this.dir + this.n) & 1];
    this.testPath("PathInfo.prototype.avoidPathCrossings ", 0, -1, true);
//    this.clipOnBoxes();

    // printText("\tavoidCrossings end" + this.toString());
};
PathInfo.prototype.avoidSelfLoopCrossings = function() {
    var i = this.getFirstPointOutsideFromBox(0);
    // printText("avoidSelfLoopCrossings i " + i);
    if (i === -1)
        this.setDummySelfloop();
};
PathInfo.prototype.avoidCrossings = function() {
    if (this.isSelfloop()) {
//        turnOnPrinting("xxx");
        this.avoidSelfLoopCrossings();
//        turnOffPrinting("xxx");
    }
    else
        this.avoidPathCrossings();
};
PathInfo.prototype.cutPointInFromBox = function() {
    var i = this.getFirstPointOutsideFromBox(1);
    if (i > 1) {
        this.cutPoints([i - 1, this.n]);
        this.clipOnBoxes();
    }
    else if (i === -1)
        this.setDummyPath();
};
PathInfo.prototype.cutPointInToBox = function() {
    var i = this.getFirstPointOutsideToBox(this.n - 1);
    if (i < this.n - 2) {
        this.cutPoints([0, i + 2]);
        this.clipOnBoxes();
    }
    else if (i === -1)
        this.setDummyPath();
};


export default PathInfo
