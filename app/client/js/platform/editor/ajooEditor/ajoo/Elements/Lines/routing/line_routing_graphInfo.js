//******************************************************************************
// GraphInfo 
//******************************************************************************
GraphInfo = function() {
    turnOffPrinting("xxx");
    this.infoDataMap = {};
    this.dragObjects = [];
    this.operation = "unknown";
    this.isDraggedBox = {};
    this.myId = 0;
    this.delta2 = 8;
    this.delta = this.delta2 * 2;
    this.limGap = 4;
    this.needTest = true;
    this.dummySelfloopCornerCount = [0, 0, 0, 0];
};
GraphInfo.prototype.limPathGap = function() {
    return this.limGap;
};
GraphInfo.prototype.addBox = function(info) {
    if (this.infoDataMap[info.id])
        return;

    var box = new BoxInfo(info);
    box.myId = this.myId++;
    this.infoDataMap[box.id] = box;
    box.owner = this;
    box.paths = [];
//    printText("\taddBox " + box.id + " :: " + box.rect().toString());

    return box;
};
GraphInfo.prototype.addPath = function(info) {

    if (this.infoDataMap[info.id])
        return;

    var path = new PathInfo(info);
    path.myId = this.myId++;
    this.infoDataMap[path.id] = path;
    var box = this.infoDataMap[path.from];
    box.paths.push(path);
    path.fromRect = box.rect();
    path.fromCenter = box.center;
    box = this.infoDataMap[path.to];

    if (path.from !== path.to) {
        box.paths.push(path);
    }

    path.toRect = box.rect();
    path.toCenter = box.center;

    path.owner = this;
    path.ntype = "path";

//    printText("\taddPath " + path.id + "; " + path.from + " -> " + path.to + " :: " + path.lev.toString());

    return path;
};
GraphInfo.prototype.needSimplifyBox = function() {
    if (this.dragObjects.length === 1) {
        var box = this.dragObjects[0];
        return (box.size[0] < this.delta || box.size[1] < this.delta);
    }
    return false;
};
GraphInfo.prototype.onSimplifyBox = function() {
    this.dragObjects.sort((function(a, b) {
        return (a.paths.length < b.paths.length) ? -1 : (a.paths.length > b.paths.length) ? 1 : 0;
    }));
    _.each(this.dragObjects, function(box) {
        if (box.paths.length > 0) {
            box.simplifyBoxPaths();
            _.each(box.paths, function(path) {
                if (path.from === box.id)
                    path.cutPointInToBox();
                else
                    path.cutPointInFromBox();
//                path.avoidPathCrossings();
                if (!path.hasFromProj() || !path.hasToProj())
                    path.simplify();
            });
        }
    });
};
GraphInfo.prototype.createAffectedPathList = function() {
    var self = this;
    this.affectedPaths = [];
    for (var i = 0; i < this.dragObjects.length; i++)
        this.isDraggedBox[this.dragObjects[i].id] = true;
    _.each(this.dragObjects, function(box) {
        _.each(box.paths, function(path) {
            self.affectedPaths.push(path);
        });
    });
};
GraphInfo.prototype.reduceConnectionCrossings = function() {

    var self = this;
    _.each(this.dragObjects, function(box) {

        if (box.isFork()) {
            box.reduceConnectionCrossings();
        }
        
    });
};
GraphInfo.prototype.onDragBoxes = function() {
//    var fgraph = new FGraphInfo();
//    fgraph.createGraph();
//    fgraph.layout();

//    turnOffPrinting("xxx");
//    printText("\n\n>>>>>>>>>>>>>>>>>>>>>>> onDragBoxes start >>>>>>>>>>>>>>>>>>>>>>>");
//    if (this.dragObjects.length < 1)
//        warning("GraphInfo.prototype.onDragBoxes empty dragObjects");

    this.reduceConnectionCrossings();

    if (this.dragObjects.length === 1 && this.dragObjects[0].maxX !== undefined) {
        // resize box case
        this.createAffectedPathList();
        this.dragObjects[0].onResizeBox();
        this.processAffectedPaths();
    }
    else {
        // drag boxes case
        this.createAffectedPathList();
        this.processAffectedPaths();
    }
};
GraphInfo.prototype.onDragSegm = function(path, ind) {
    path.onDragSegm(ind);
};
GraphInfo.prototype.processAffectedPaths = function() {
    printText("\t>>>>>>>>>>>>>> processAffectedPaths start >>>>>>>>>>>>>>");
//    turnOffPrinting("111");
    this.avoidPathCrossings();
//    turnOnPrinting("111");
    this.processBoxesWithDisconnectPaths();
    printText("\t>>>>>>>>>>>>>> processAffectedPaths end  >>>>>>>>>>>>>>");
};
GraphInfo.prototype.avoidPathCrossings = function() {
    printText("\t\t>>>>>>>>>> avoidPathCrossings start >>>>>>>>>>");
//    turnOffPrinting("avoidPathCrossings");
    // avoid affected path crossings with endboxes        
    for (var i = 0; i < this.affectedPaths.length; i++) {
        var path = this.affectedPaths[i];
        if (!path.isSelfloop()) {
            if (this.isDraggedBox[path.from])
                path.removeGaps(1);
            else if (this.isDraggedBox[path.to])
                path.removeGaps(path.n - 1);
            path.avoidCrossings();
        }
    }
//    turnOnPrinting("avoidPathCrossings");
    printText("\t\t>>>>>>>>>> avoidPathCrossings end  >>>>>>>>>>");
};
GraphInfo.prototype.processBoxesWithDisconnectPaths = function() {
    printText("\t\t>>>>>>>>>> processBoxesWithDisconnectPaths start >>>>>>>>>>");
    processedBoxes = {};
    for (var i = 0; i < this.affectedPaths.length; i++) {
        var path = this.affectedPaths[i];
//        printText("\t\t\tpath " + path.toString());
        var boxIds = [path.from, path.to];
        for (var j = 0; j < 2; j++) {
//            printText("\t\t\tpath " + path.lev.toString() + " ==> " + boxIds[j] + "; " + path.hasProj(boxIds[j]));
            if (processedBoxes[boxIds[j]] === undefined && !path.hasProj(boxIds[j])) {
                processedBoxes[boxIds[j]] = true;
                var box = this.infoDataMap[boxIds[j]];
                box.processDisconnectPaths();
            }
        }
    }
    for (var i = 0; i < this.affectedPaths.length; i++) {
        var path = this.affectedPaths[i];
        //TODO temporary removed
//        path.clipOnBoxes();
        path.simplify();
        //path.clipOnBoxes();
    }
    printText("\t\t>>>>>>>>>> processBoxesWithDisconnectPaths end  >>>>>>>>>>");
};
GraphInfo.prototype.collectDisconnectedPaths = function() {
    // create list of nodes with disconnected paths
    var rc = {};
    for (var i = 0; i < this.affectedPaths.length; i++) {
        var path = this.affectedPaths[i];
        if (!path.hasFromProj())
            if (rc[path.from] === undefined)
                rc[path.from] = [path];
            else
                rc[path.from].push(path);
        if (!path.hasToProj())
            if (rc[path.to] === undefined)
                rc[path.to] = [path];
            else
                rc[path.to].push(path);
    }
    return rc;
};
//******************************************************************************
// FGraphInfo 
//******************************************************************************
function FGraphInfo() {
    this.boxes = [];
    this.paths = [];
    this.delta = 16;
    this.levels = [];
    this.genrationNumb = 0;
    this.infoDataMap = {};
}
;
FGraphInfo.prototype.addGenBox = function(type) {
    var info = ({size: [64, 32], center: [0, 0]});
    if (type === "forkFlow")
        size = [16, 8];
    info.id = "N" + this.genrationNumb.toString();
    info.type = type;
    this.genrationNumb++;
    return this.addBox(info);
};
FGraphInfo.prototype.addBox = function(info) {
    var box = new FBoxInfo(info);
    this.boxes.push(box);
    box.owner = this;
    box.paths = [];
    this.infoDataMap[box.id] = box;
    this.spacing = 32;
    return box;
};
FGraphInfo.prototype.addTreePath = function(sourceBox, targetBox) {
    var i = Math.floor(Math.random() * this.boxes.length);
    var box = this.boxes[i];
    var nextBox = this.addGenBox((box.type === "forkFlow") ? "nodeFlow" : "forkFlow");
    var info = {type: "pathFlow"};
    info.id = "P" + this.genrationNumb.toString();
    this.genrationNumb++;
    info.from = box.id;
    info.to = nextBox.id;
    this.addPath(info);
};
FGraphInfo.prototype.addPath = function(info) {
    var path = new FPathInfo(info);
    this.paths.push(path);
    this.infoDataMap[path.id] = path;
    var box = this.infoDataMap[path.from];
    box.paths.push(path);
    box = this.infoDataMap[path.to];
    box.paths.push(path);
    path.owner = this;
    return path;
};
FGraphInfo.prototype.treeGenerator = function(n) {
    this.addGenBox("nodeFlow");
    for (var i = 1; i < n; i++)
        this.addTreePath();
};
FGraphInfo.prototype.createGraph = function() {
    this.treeGenerator(15);
//    this.addBox({id:"N1", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"N2", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"N3", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"N4", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"N5", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"N6", size: [64, 32], center: [0, 0], type: "nodeFlow"});
//    this.addBox({id:"F1", size: [32, 8], center: [0, 0], type: "nodeFork"});
//    this.addBox({id:"F2", size: [32, 8], center: [0, 0], type: "nodeFork"});
//    this.addBox({id:"F3", size: [32, 8], center: [0, 0], type: "nodeFork"});
//    this.addBox({id:"F4", size: [32, 8], center: [0, 0], type: "nodeFork"});
//    this.addBox({id:"F5", size: [32, 8], center: [0, 0], type: "nodeFork"});
//    
////    pathInfo.id = "P";
////    pathInfo.from = "N1";
////    pathInfo.to = "F5";
////    pathInfo.type = "pathFlow";
//    this.addPath({id: "P1", from: "N1", to: "F1", type: "pathFlow"});
//    this.addPath({id: "P2", from: "F1", to: "N2", type: "pathFlow"});
//    this.addPath({id: "P3", from: "F1", to: "N3", type: "pathFlow"});
//    this.addPath({id: "P4", from: "F2", to: "N3", type: "pathFlow"});
//    this.addPath({id: "P5", from: "N1", to: "F2", type: "pathFlow"});
//    this.addPath({id: "P6", from: "N1", to: "F3", type: "pathFlow"});
//    this.addPath({id: "P7", from: "F3", to: "N4", type: "pathFlow"});
//    this.addPath({id: "P9", from: "N2", to: "F4", type: "pathFlow"});
//    this.addPath({id: "P10", from: "N4", to: "F5", type: "pathFlow"});
//    this.addPath({id: "P11", from: "F4", to: "N5", type: "pathFlow"});
//    this.addPath({id: "P12", from: "F4", to: "N6", type: "pathFlow"});
//    this.addPath({id: "P13", from: "F5", to: "N6", type: "pathFlow"});
//    this.addPath({id: "P14", from: "F1", to: "N4", type: "pathFlow"});
};
FGraphInfo.prototype.BFS = function(startBoxes) {
    var self = this;
    var i = 0;
    var boxId, box, otherBox;
    var lInd = [0];
    _.each(startBoxes, function(boxId) {
        box = self.infoDataMap[boxId];
        box.level = 0;
        box.levelInd = lInd[0];
        lInd[0]++;
    });
    while (i < startBoxes.length) {
        boxId = startBoxes[i];
        box = self.infoDataMap[boxId];
        _.each(box.paths, function(path) {
            otherBox = self.infoDataMap[(box.id === path.from) ? path.to : path.from];
            if (otherBox.level === undefined) {
                startBoxes.push(otherBox.id);
                otherBox.level = box.level + 1;
                if (box.level + 1 >= lInd.length)
                    lInd.push(0);
                otherBox.levelInd = lInd[otherBox.level];
                lInd[otherBox.level]++;
            }
        });
        i++;
    }
    ;
};
FGraphInfo.prototype.normalizeLevels = function() {
    var self = this;
    var v;
    for (var i = 0; i < this.levels.length; i++) {
        var level = this.levels[i];
        level.sort((function(a, b) {
            return (a.center[0] < b.center[0]) ? -1 : (a.center[0] > b.center[0]) ? 1 : 0;
        }));
        var oldCenter = level[0].center[0];
        var newCenter = oldCenter;
        for (var j = 1; j < level.length; j++) {
            var box0 = level[j - 1];
            var box1 = level[j];
            oldCenter += box1.center[0];
            box1.center[0] = box0.center[0] + (box0.size[0] + box1.size[0]) / 2 + this.spacing;
            newCenter += box1.center[0];
        }
        var delta = (newCenter - oldCenter) / level.length;
        _.each(level, function(box) {
            box.center[0] -= delta;
        });
    }
    ;
};
FGraphInfo.prototype.normalizeLevel = function(level) {
    var self = this;
    var v;
    level.sort((function(a, b) {
        return (a.center[0] < b.center[0]) ? -1 : (a.center[0] > b.center[0]) ? 1 : 0;
    }));
    var oldCenter = level[0].center[0];
    var newCenter = oldCenter;
    for (var j = 1; j < level.length; j++) {
        var box0 = level[j - 1];
        var box1 = level[j];
        oldCenter += box1.center[0];
        box1.center[0] = box0.center[0] + (box0.size[0] + box1.size[0]) / 2 + this.spacing;
        newCenter += box1.center[0];
    }
    var delta = (newCenter - oldCenter) / level.length;
    _.each(level, function(box) {
        box.center[0] -= delta;
    });
};
FGraphInfo.prototype.centering1 = function() {
    var self = this;
    var n, v, otherBox;
    for (var i = 1; i < this.levels.length; i++) {
        var level = this.levels[i];
        var v = 0;
        _.each(level, function(box) {
//            v = 0;
//            n = 0;
            v = box.center[0];
            n = 1;
            _.each(box.paths, function(path) {
                otherBox = self.infoDataMap[(box.id === path.from) ? path.to : path.from];
                if (i > otherBox.level) {
                    v += otherBox.center[0];
                    n++;
                }
            });
            box.center[0] = v / n;
        });
        this.normalizeLevel(level);
    }
    ;
};
FGraphInfo.prototype.centering2 = function() {
    var self = this;
    var n, v, otherBox;
    for (var i = this.levels.length - 2; i >= 0; i--) {
        var level = this.levels[i];
        var v = 0;
        _.each(level, function(box) {
//            v = 0;
//            n = 0;
            v = box.center[0];
            n = 1;
            _.each(box.paths, function(path) {
                otherBox = self.infoDataMap[(box.id === path.from) ? path.to : path.from];
                if (i < otherBox.level) {
                    v += otherBox.center[0];
                    n++;
                }
            });
            box.center[0] = v / n;
        });
        this.normalizeLevel(level);
    }
    ;
};
FGraphInfo.prototype.layout = function() {
    this.BFS(["N1"]);
    var levNum = 0;
    _.each(this.boxes, function(box) {
        if (levNum < box.level)
            levNum = box.level;
    });
    for (var i = 0; i <= levNum; i++)
        this.levels.push([]);
    var self = this;
    _.each(this.boxes, function(box) {
        self.levels[box.level].push(box);
    });
    this.normalizeLevels();
//    console.log(this.getGraphStr());

    this.centering1();
//    console.log(this.getGraphStr());
    this.centering2();
//    console.log(this.getGraphStr());
    this.centering1();
//    console.log(this.getGraphStr());
    this.centering2();
//    console.log(this.getGraphStr());
    this.centering1();
//    console.log(this.getGraphStr());
    this.centering2();
//    console.log(this.getGraphStr());
};
FGraphInfo.prototype.getRezStr = function() {
    var str = "";
    for (var i = this.levels.length - 1; i >= 0; i--) {
        str += "level " + i;
        _.each(this.levels[i], function(box) {
            str += " ;" + box.id + " " + box.center[0];
        });
        str += "\n"
    }
    return str;
};
FGraphInfo.prototype.getGraphStr = function() {
    var str = "";
    str += "Graph:\n";
    _.each(this.levels, function(level) {
        _.each(level, function(box) {
            str += "\t" + box.id + ": " + box.type + ", " + box.level + ", " + Math.round(box.center[0]) + "::";
            _.each(box.paths, function(path) {
//            var adjBox = path.otherBox(box.id);
                str += " " + ((path.from === box.id) ? path.to : path.from);
            });
            str += ";   ";
        });
        str += ".\n";
    });
    return str;
};

//******************************************************************************
// FBoxInfo 
//******************************************************************************
function FBoxInfo(info) {
    _.extend(this, info);
    this.paths = {};
    this.level;
    this.levelInd;
}

//******************************************************************************
// FPathInfo 
//******************************************************************************
function FPathInfo(info) {
    _.extend(this, info);
}
FPathInfo.prototype.otherNode = function(nodeId) {
    return this.owner.infoDataMap[(this.from === nodeId) ? this.to : this.from];
};
