//******************************************************************************
// BoxInfo 
//******************************************************************************
BoxInfo = function(info) {

    _.extend(this, info);

    this.id = info.id;
    this.center = info.center;
    this.size = info.size;
    this.type = "box";
};
//BoxInfo.prototype.convert = function() {
//    addText("\n\t convert box " + this.toString());
//    convertArray(this.center);
//    convertArray(this.size);
//    printText(" ==> " + this.toString());
//};
//BoxInfo.prototype.reconvert = function() {
//    reconvertArray(this.center);
//    reconvertArray(this.size);
//};
BoxInfo.prototype.rect = function() {
    return [this.center[0] - this.size[0] / 2,
        this.center[1] - this.size[1] / 2,
        this.center[0] + this.size[0] / 2,
        this.center[1] + this.size[1] / 2,
        "r"
    ];
};
BoxInfo.prototype.min = function(dir) {
    return this.center[dir] - this.size[dir] / 2;
};
BoxInfo.prototype.max = function(dir) {
    return this.center[dir] + this.size[dir] / 2;
};
BoxInfo.prototype.top = function() {
    return this.max(1);
};
BoxInfo.prototype.bottom = function() {
    return this.min(1);
};
BoxInfo.prototype.right = function() {
    return this.max(0);
};
BoxInfo.prototype.left = function() {
    return this.min(0);
};
BoxInfo.prototype.leftBottom = function() {
    return this.corner(0);
};
BoxInfo.prototype.leftTop = function() {
    return this.corner(2);
};
BoxInfo.prototype.rightBottom = function() {
    return this.corner(1);
};
BoxInfo.prototype.rightTop = function() {
    return this.corner(3);
};
BoxInfo.prototype.corner = function(cornerInd) {
    // cornerInd
    // 0--1
    // |  |
    // 2--3
    var rect = this.rect();
    return new PointInfo([rect[(cornerInd & 1) * 2], rect[1 + (cornerInd & 2)], cornerInd, "rp"]);
};
BoxInfo.prototype.isDragged = function() {
    return this.owner.isDraggedBox[this.id];
};
BoxInfo.prototype.hasSideCrossings = function(paths, side) {
    var rc = false;
    var segments = [[], []];
    var dir = side & 1;
    var id = this.id;
    _.each(paths, function(path) {
        segments[dir].push((path.from === id) ? path.segm(1) : path.segm(path.n - 1));
        if (path.n > 2)
            segments[1 - dir].push((path.from === id) ? path.segm(2) : path.segm(path.n - 2));
        if (path.n > 3)
            segments[dir].push((path.from === id) ? path.segm(3) : path.segm(path.n - 3));
    });
    
    var segms = segments[1 - dir];
    var l = segms.length;
    if (l === 0)
        return false;
    
    var f = 0;
    var i;
    _.each(segments[dir], function(segm) {
        if (rc) return;
//        console.log("\t[", segm.min, ",", segm.max, "]", segm.lev);
        _.each(segms, function(s) {
            if (!rc && segm.owner !== s.owner) {
//                console.log("\t\t[", s.min, ",", s.max, "]", s.lev, ":: ", segm.intersectSegm(s));
                if (segm.intersectSegm(s)) {
//                    console.log("\t\t\t[", segm.min, ",", segm.max, "]", segm.lev, " X ", s.min, ",", s.max, "]", s.lev);
                    rc = true;
                    return;
                }
            }
        });
    });
    
    return rc;
};
BoxInfo.prototype.getTurn = function(path, side) {
    var lev, type;
    var levs = path.lev;
    var n = path.n;
    if (n === 2) {
        type = 4;
        lev = (this.id === path.from) ?
                [this.offValue(levs[0], side), levs[1], this.offValue(levs[2], side)] :
                [this.offValue(levs[n], side), levs[n - 1], this.offValue(levs[n - 2], side)];
    }
    if (n === 3) {
        if (this.id === path.from)
            lev = [this.offValue(levs[0], side), levs[1], this.offValue(levs[2], side), levs[3]];
        else
            lev = [this.offValue(levs[n], side), levs[n - 1], this.offValue(levs[n - 2], side), levs[n - 3]];
        type = (lev[1] < lev[3]) ? 9 : 1;
    }

//          turns
//   |_____  |  ____|
//  _____  | | |  ____
//    _  | | | | |  _
//   | | | | | | | | |
//     0 1 2 4 8 9 10

    else if (path.n > 3) {
        if (this.id === path.from)
            lev = [this.offValue(levs[0], side), levs[1], this.offValue(levs[2], side), levs[3], this.offValue(levs[4], side)];
        else
            lev = [this.offValue(levs[n], side), levs[n - 1], this.offValue(levs[n - 2], side), levs[n - 3], this.offValue(levs[n - 4], side)];
        type = (lev[1] < lev[3]) ? ((lev[2] < lev[4]) ? 8 : 10) : ((lev[2] < lev[4]) ? 2 : 0);
    }

    return {owner: path, type: type, lev: lev};
};
BoxInfo.prototype.reduceSideCrossings = function(paths, side) {

    if (paths.length < 2 || !this.hasSideCrossings(paths, side))
        return;

    var self = this;
    var id = this.id;
    var levs, lev, turn, n;
    
    // collect turns
    var turns = [];
    _.each(paths, function(path) {turns.push(self.getTurn(path, side)); });
    
    // set coordinates
    var c = turns[0].lev[0];
    var coords = [[], [], [], []];
    _.each(turns, function(turn, i){ coords[0].push(c); });
    // order 1 segm of turn list
    turns.sort((function(a, b) {return (a.lev[1] < b.lev[1]) ? -1 : (a.lev[1] > b.lev[1]) ? 1 : 0; }));
    coords[1] = _.map(turns, function(turn){ return turn.lev[1];  });
    
    // order 2 segm of turn list
    turns.sort((function(a, b) {return self.Compare2Turns(a, b); }));
    var midPathIds = _.map(turns, function(turn){ return turn.owner.id;  });
    coords[2] = _.map(turns, function(turn){ return turn.lev[2];  });
    
    // order 3 segm of turn list
    turns.sort((function(a, b) {return self.Compare3Turns(a, b); }));
    var farPathIds = _.map(turns, function(turn){ return turn.owner.id;  });
    coords[3] = _.map(turns, function(turn){ return turn.lev[3];  });

//    console.log();
//    var str = "\nCoors";
//    _.each(coords, function(level, i) {  
//        str += "\n\t" + i + ":"; 
//        _.each(level, function(v, j) {  
//            str += "\t" + v; 
//        });
//    });
//    str += "\nPaths:";
//    _.each(turns, function(turn, i){ 
//        str += "\t" + turn.owner.id; 
//    });
//    str += "\nType:";
//    _.each(turns, function(turn, i){ 
//        str += "\t" + turn.type; 
//    });
//    console.log(str);
    
    var path;
    _.each(coords, function(coord, i) {
        _.each(turns, function(turn, j) {
            path = turn.owner;
            if ((i & 1) === 0) {
                if (path.from === id)
                    path.lev[i] = self.onValue(coord[j], side);
                else
                    path.lev[path.n - i] = self.onValue(coord[j], side);
            }
            else
                if (path.from === id)
                    path.lev[i] = coord[j];
                else
                    path.lev[path.n - i] = coord[j];
        });
    });
    _.each(paths, function(path) { path.clipOnBoxes(); });
};
BoxInfo.prototype.Compare2Turns = function(a, b) {
    if (a.type < b.type)
        return -1;
    else if (a.type > b.type)
        return 1;
    // type === 0, 1, 2, 4
    else if (a.type === 4)
        if (a.lev[1] === b.lev[1])
            return 0;
        else if (a.lev[1] < b.lev[1])
            return -1;
        else
            return 1;
    else if (a.type <= 4)
        if (a.lev[2] === b.lev[2])
            return 0;
        else if (a.lev[2] < b.lev[2])
            return -1;
        else
            return 1;
        
//   |_____  |  ____|
//  _____  | | |  ____
//    _  | | | | |  _
//   | | | | | | | | |
//     0 1 2 4 8 9 10
//     
    // type === 8, 9, 10
    else if (a.lev[2] === b.lev[2])
            return 0;
        else if (a.lev[2] < b.lev[2])
            return 1;
        else
            return -1;
};
BoxInfo.prototype.Compare3Turns = function(a, b) {
    if (a.type < b.type)
        return -1;
    else if (a.type > b.type)
        return 1;
    else if (a.type === 4)
        if (a.lev[1] === b.lev[1])
            return 0;
        else if (a.lev[1] < b.lev[1])
            return -1;
        else
            return 1;
    else if (a.type < 4)
        if (a.type === 2)
            if (a.lev[3] === b.lev[3])
                return 0;
            else if (a.lev[3] < b.lev[3])
                return -1;
            else
                return 1;
        else if (a.type === 0)
            if (a.lev[3] === b.lev[3])
                return 0;
            else if (a.lev[3] < b.lev[3])
                return 1;
            else
                return -1;
        // type === 1    
        else if (a.lev[2] == b.lev[2])
            return 0;
        else if (a.lev[2] < b.lev[2])
            return -1;
        else
            return 1;
//          turns
//   |_____  |  ____|
//  _____  | | |  ____
//    _  | | | | |  _
//   | | | | | | | | |
//     0 1 2 4 8 9 10
    else
    if (a.type === 9)
        if (a.lev[2] === b.lev[2])
            return 0;
        else if (a.lev[2] < b.lev[2])
            return 1;
        else
            return -1;
    else if (a.type === 10)
        if (a.lev[3] === b.lev[3])
            return 0;
        else if (a.lev[3] < b.lev[3])
            return 1;
        else
            return -1;
    // type === 8    
    else if (a.lev[3] === b.lev[3])
        return 0;
    else if (a.lev[3] < b.lev[3])
        return -1;
    else
        return 1;
};
BoxInfo.prototype.reduceConnectionCrossings = function() {
    var self = this;
    var nodePaths = [[], [], [], []];

    _.each(this.paths, function(path) { nodePaths[path.side(self.id)].push(path); });
    
    _.each(nodePaths, function(paths, side) { self.reduceSideCrossings(paths, side); });
};
BoxInfo.prototype.processPaths = function(paths) {
    printText("\t\t\t\tprocessPaths start:: ");
    var disconnected = {};
    
    for (var i = 0; i < paths.length; i++) {
        disconnected[path[i]] = true;
    }
    
    printText("\t\t\t\tprocessPaths end ");
};
BoxInfo.prototype.createConnArea = function(side, disconnPaths, connPaths) {
    printText("\t\t\t\tcreateConnArea start:: ");
    var rc = {};
    if (disconnPaths === undefined || disconnPaths.length === 0) {
        warning("BoxInfo.prototype.createConnArea :: wrong disconnected path list");
        return rc;
    }
    // create connection aray
    var path = disconnPaths[0];
    var d = side & 1;
    var l;
    var testBox = this.rect();
    testBox[1 - d] = this.offValue(testBox[1 - d], side);
    testBox[3 - d] = testBox[1 - d];
    rc.side = side;
    rc.disconnectedSegm = [];
    for (var i = 0; i < disconnPaths.length; i++) {
        path = disconnPaths[i];
        var segm = this.offSegm((path.from === this.id) ? path.segm(1) : path.segm(path.n - 1), side);
        rc.disconnectedSegm.push(segm);
        if (testBox[3 - d] < segm.lev)
            testBox[3 - d] = segm.lev;
    }
    rc.testBox = testBox;
    // collect affected segments
    rc.intersectSegm = [[], []];
    if (connPaths)
        for (var i = 0; i < connPaths.length; i++) {
            var path = connPaths[i];
            if (path.from === this.id)
                for (var j = 1; j < path.n; j++) {
                    var segm = this.offSegm(path.segm(j), side);
                    if (segm.intersectRect(testBox))
                        rc.intersectSegm[segm.dir].push(segm);
                    else
                        break;
                }
            else
                for (var j = path.n - 1; j > 0; j--) {
                    var segm = this.offSegm(path.segm(j), side);
                    if (segm.intersectRect(testBox))
                        rc.intersectSegm[segm.dir].push(segm);
                    else
                        break;
                }
        }
    for (var j = 0; j < 2; j++)
        for (var i = 0; i < rc.intersectSegm[j].length; i++)
//            printText("\t\t\t\t\t" + rc.intersectSegm[j][i].toString());
    
    printText("\t\t\t\tcreateConnArea end:: ");
    return rc;
};
BoxInfo.prototype.processDisconnectPaths = function() {
    printText("\t\t\tprocessDisconnectPaths start" + this.toString());
    // separate disconnected and connected paths
    var paths = [[[], [], [], []], [[], [], [], []]];
    var disconn = 0;
    var conn = 1;
    var self = this;
    var side, j;
    _.each(this.paths, function(path){
        if (!path.isSelfloop())
            paths[(path.hasProj(self.id)) ? conn : disconn][path.side(self.id)].push(path);
        else {
            paths[(path.hasFromProj()) ? conn : disconn][path.fromSide()].push(path);
            if (path.fromSide() !== path.toSide())
                paths[(path.hasToProj()) ? conn : disconn][path.toSide()].push(path);
        }
    });
    
    // process disconnected paths by side
    for (var side = 0; side < paths[disconn].length; side++) {
//        printText("\t\t\t\tside " + side + "; disconn " + paths[disconn][side].length + "; conn " + paths[conn][side].length);
        if (paths[disconn][side].length > 0) {
//            var connInfo = this.connectPaths(side, paths[disconn][side], paths[conn][side]);
            var connArea = new ConnArea(this, side, paths[disconn][side], paths[conn][side]);
            connArea.connectPaths();
//            connArea.connectPaths();
        }
    }
    printText("\t\t\tprocessDisconnectPaths end");
};


BoxInfo.prototype.processDisconnectedPathsNew = function(pathList) {
    var boxPathSide = {};
    var isDisconnectedPath = {};
    for (var j = 0; j < pathList.length; j++) {
        var path = pathList[j];
        var side = path.side(boxId);
        isDisconnectedPath[path] = true;
        if (boxPathSide[side] === undefined)
            boxPathSide[side] = [[path], []];
        else
            boxPathSide[side][0].push(path);
    }
    for (var i = 0; i < this.paths.length; i++) {
        var path = this.paths[i];
        var side = path.side(this, id);
        if (isDisconnectedPath[path] !== true && boxPathSide[side] !== undefined)
            boxPathSide[side][1].push(path);
    }
    for (var side in boxPathSide)
        this.processSideDisconnectedPaths(side, boxPathSide[side][0], boxPathSide[side][1]);
};
BoxInfo.prototype.processDisconnectedPaths = function() {
    var disconnected = [];
    var nodes = {};
    printText("\t\t\tinput paths:: ");
    for (var i = 0; i < this.paths.length; i++) {
        var path = this.paths[i];
        printText("\t\t\t " + path.toString());
        if (this.id === path.from && path.hasToProj())
            if (nodes[path.from] === undefined)
                nodes[path.from] = [path];
            else 
                nodes[path.from].push(path);
        if (this.id === path.to && path.hasFromProj())
            if (nodes[path.to] === undefined)
                nodes[path.to] = [path];
            else 
                nodes[path.to].push(path);
    }
    for (var nodeId in nodes) {
        var box = this.owner[nodeId];
        box.processPaths(nodes[nodeId]);
    }
};
BoxInfo.prototype.onResizeBox = function() {
    var initRect = [this.minX, this.minY, this.maxX, this.maxY, "r"];
    var rect = this.rect();
    var noChanges = true;
    var i, d;
    var id = this.id;
    for (i = 0; noChanges && i < 4; i++)
        noChanges = noChanges && (rect[i] === initRect[i]);
    if (!noChanges && rect[2] > rect[0] && rect[3] > rect[1]) {
        // box coordinates are changed
        var prop = [(rect[2] - rect[0]) / (initRect[2] - initRect[0]), (rect[3] - rect[1]) / (initRect[3] - initRect[1])];
        _.each(this.paths, function(path){
            if (path.from === id) {
                d = path.dir;
                path.lev[0] = (path.lev[0] - initRect[d]) * prop[d] + rect[d];
                path.lev[1] = (path.lev[1] - initRect[1 - d]) * prop[1 - d] + rect[1 - d];
            }
            if (path.to === id) {
                i = path.n;
                d = (path.dir + i) & 1;
                path.lev[i] = (path.lev[i] - initRect[d]) * prop[d] + rect[d];
                path.lev[i - 1] = (path.lev[i - 1] - initRect[1 - d]) * prop[1 - d] + rect[1 - d];
            }
        });
    }
};
BoxInfo.prototype.simplifyBoxPaths = function() {
    var id = this.id;
    var i, s;    
    var paths = [[], [], [], []];
    // collect
    _.each(this.paths, function(path) {
        s = path.fromSide();
        if (path.isSelfloop())
            if (s !== path.toSide()) {
                paths[s].push(path);
                paths[path.toSide()].push(path);
            }
            else
                paths[s].push(path);
        else if (id === path.from)
            paths[s].push(path);
        else
            paths[path.toSide()].push(path);
    });
    for (s = 0; s < 4; s++) 
        if (paths[s].length > 0) {
            var connArea = new ConnArea(this, s, [], paths[s]);
            connArea.simplifyPaths();
        }
};
BoxInfo.prototype.onValue = function(v, side) {
    var d = 1 - (side & 1);
    if ((side & 2) > 0)
        return v + this.max(d);
    else
        return this.min(d) - v;
};
BoxInfo.prototype.offValue = function(v, side) {
    var d = 1 - (side & 1);
    if ((side & 2) > 0)
        return v - this.max(d);
    else
        return this.min(d) - v;
};
BoxInfo.prototype.offSegm = function(segm, side) {
    var d = 1 - (side & 1);
    if (d === segm.dir)
        segm.lev = this.offValue(segm.lev, side);
    else {
        if ((side & 2) > 0) {
            segm.min -= this.max(d);
            segm.max -= this.max(d);
        }
        else {
            var v = segm.min;
            segm.min = this.min(d) - segm.max;
            segm.max = this.min(d) - v;
        }
    }
    return segm;
};
BoxInfo.prototype.offRect = function(rect, side) {
    var d = 1 - (side & 1);
    if ((side & 2) > 0) {
        rect[d] -= this.max(d);
        rect[2 + d] -= this.max(d);
    }
    else {
        var v = rect[d];
        rect[d] = this.min(d) - rect[2 + d];
        rect[2 + d] = this.min(d) - v;
    }
    return rect;
};
BoxInfo.prototype.toString = function() {
    return "box{id: " + this.id +
            "; rect[" + this.rect().toString() +
            "]; center[" + this.center.toString() +
            "]; size[" + this.size.toString() +
            "}";
};

BoxInfo.prototype.isFork = function() {
    var type_name = this.typeName;
    if (type_name === "HorizontalLine" || type_name === "VerticalLine" ||
        type_name === "HorizontalFork" || type_name === "VerticalFork") {
        return true;
    }
}

