// import { _ } from 'vue-underscore';
//******************************************************************************
// LayoutInfo 

const { BoxCompartments } = require("../../Boxes/box_compartments");

//******************************************************************************
function my_layout_diagram(diagram) {
    console.log("\ndiagram with ", diagram.boxes.length, " boxes and ", diagram.lines.length, " lines.");
	return diagram;    
    if (diagram.boxes.length + diagram.lines.length > 255) {
        console.log("\ndiagram too big.\n");
        return diagram;    
    }
    
    setNodeMinSize(diagram);
//    getNodeAndLinkTypes(diagram);
    


    var flowGraph = new FlowGraph(diagram);
//    console.log(flowGraph.getDiagramStr("\nInitial diagram"));
    
    // create graph flow part of input diagram
    flowGraph.createFlow(FlowLinkTypes);
//    flowGraph.setResultDiagram();
    
    
//    console.log(flowGraph.getLevelStr(flowGraph.nodes, "Flow nodes:"));
    
    flowGraph.createUnflow();
    flowGraph.setUnflowLevels();
    
//    console.log(flowGraph.getLevelStr(flowGraph.nodes, "Flow nodes:"));
//    console.log(flowGraph.getLevelStr(flowGraph.unflowNodes, "Unflow nodes:"));
    
    flowGraph.markUnflowObjects();
    
//    flowGraph.updateUnfixed();

//    flowGraph.init(SplitLinkTypes);
//    
    
    // set layout options
//    flowGraph.initLayoutOptions({mode: 0, routingStyle: 0});
    flowGraph.initLayoutOptions({mode: 0, routingStyle: 3});
    result = flowGraph.arrangeLayout(flowGraph.nodes, false);
    
//    console.log(flowGraph.getLevelStr(flowGraph.nodes, "\nFinal"));
//    console.log("result::", result);
    
    flowGraph.setLayoutResult(result);
    flowGraph.setLevels(flowGraph.nodes);
    console.log(flowGraph.getLevelStr(flowGraph.nodes, "\nFinal"));
//    var keeped = [];
//    _.each(flowGraph.lines, function(line) {
//        if (flowGraph.removed[line] === undefined)
//            keeped.push(line);
//    });
//    flowGraph.lines = keeped;
    
    flowGraph.setResultDiagram();
//    console.log(getDiagranNodesStr("##L", diagram.boxes));
    
//    console.log(flowGraph.getDiagramStr("\nFinal diagram"));

    diagram.flow = flowGraph;
    
    return diagram;
};
function my_reroute_flowGraph(diagram) {
    if (diagram === undefined || diagram.flow === undefined) {
        console.log("graph is not defined");
        return;
    }
    var flowGraph = diagram.flow;
    console.log("\ngraph with ", flowGraph.nodes.length, " nodes and ", flowGraph.paths.length, " links.");
    flowGraph.reroute();
    return diagram;
};
function setNodeMinSize(diagram) {
    var box_self = buildCompartmentsSelf();
//    var str = "\n\nCalculate box min size:";
    _.each(diagram.boxes, function(box, i) {
//        str += "\n\tbox " + box._id + " size before (" + box.location.width + ", " + box.location.height + ")"; 
        
        box_self.compartments = [];
        
        var relative_size = buildBoxMinSize(box_self, box);
        box.location.width = relative_size.width;
        box.location.height = relative_size.height;
//        str += " after (" + box.location.width + ", " + box.location.height + ")";
    });
//    console.log(str, "\n");
};
//******************************************************************************
// FlowNode
//******************************************************************************
function FlowNode() {
   this.forward = [];
   this.backward = [];
   this.paths = [];
   this.fixed = false;
   this.temp;
};
FlowNode.prototype.init = function(node) {

};
FlowNode.prototype.DFS = function() {
    var self = this;
    _.each(_.union(self.forward, self.backward), function(v) {
        if (v.component === undefined) {
            v.component = self.component;
            v.DFS();
        }
    });
};
FlowNode.prototype.getName = function() {
    return (this.parent.compartments.length > 0) ? this.parent.compartments[0].value : "";
};

//******************************************************************************
// FlowPath
//******************************************************************************
function FlowPath() {
   this.points;
   this.fixed = false;
   this.temp;
};
FlowPath.prototype.init = function(line) {
};
FlowPath.prototype.otherNode = function(nodeId) {
    if (this.from === nodeId)
        return this.owner.idToObject[this.to];
    else
        return this.owner.idToObject[this.from];
};
//******************************************************************************
// FlowGraph 
//******************************************************************************
function FlowGraph(diagram) {
    this.genindex = 0;
    this.nodes = [];
    this.paths = [];
    this.template = new Tamplates();
    this.removed = {};
    this.parent = diagram;
    this.unflowNodes = [];
    this.idToObject = {};
    
    // default layout options
    this.mode = 0; // layout.. 0: "INVERSE_HORIZONTAL"; 1: "VERTICAL"; 2: "HORIZONTAL"; 3: "INVERSE_VERTICAL" 
    this.layoutStyle = 0; // ["HIERARHICAL", "SYMMETRIC", "UNIVERSAL"]
    this.routingStyle = 3; // ["ORThOGONAL", "POLYLINE", "SPLINE", "STRAIGHT"]
//    this.lineStyle = 0; // ["Orthogonal", "Direct", "Direct", "Direct"]
};
FlowGraph.prototype.initLayoutOptions = function(options) {
    var self = this;
    _.each(options, function(value, key){
        self[key] = value;
    });
};
FlowGraph.prototype.init = function(addingLinkTypes) {
    this.linkTypes = addingLinkTypes;
    this.markAddingObjects();
    this.addNodes();
    this.addPaths();
};
FlowGraph.prototype.fromSide = function() {
    if (this.routingStyle === 0 && this.layoutStyle === 0)
        if (this.mode === 0)
            return 8;
        else if (this.mode === 1)
            return 4;
        else if (this.mode === 2)
            return 2;
        else
            return 1;
    else
        return 15;
};
FlowGraph.prototype.toSide = function() {
    if (this.routingStyle === 0 && this.layoutStyle === 0)
        if (this.mode === 0)
            return 2;
        else if (this.mode === 1)
            return 1;
        else if (this.mode === 2)
            return 8;
        else
            return 4;
    else
        return 15;
};

//******************************************************************************
// reroute part begin
//******************************************************************************
FlowGraph.prototype.reroute = function() {
    var self = this;
    var dir = this.getDir();
    var layoutStyle = LayoutStyles[this.layoutStyle][this.mode];
    var routingType = RoutingTypes[this.routingStyle];
    var direction = this.mode;
    console.log(layoutStyle, routingType, direction);
    this.routeDummyOrthogonal();
    
    // get connected komponents
    var components = this.connectedComponents();
    
    var turns, newTurn, levels, other;
    _.each(components, function(nodes) {
        levels = self.setLevels(nodes);
        _.each(levels, function(nodes, i) {
            turns = [[], [], []];
//                console.log(i, " level ",nodes);
            _.each(nodes, function(node) {
                _.each(node.paths, function(path) {
                    other = path.otherNode(node.id);
                    if (node.level + 1 === other.level) {
                        newTurn = new TurnInfo(path, dir);
                        turns[newTurn.type].push(newTurn);
                    }
                    else if (node.level - 1 !== other.level)
                        console.log("FlowGraph.prototype.reroute wrong levels of path ", path.id, " from level ", node.level, " to level ", other.level);
                });
            });
            var str = "\n\n" + i + " level:";
            _.each(turns, function(sideTurns, i) {
                str += "\n\tturn.type " + i;
                sideTurns.sort((function(a, b) {
                    return a.compare(b);
                }));
                _.each(sideTurns, function(turn, j) {
                    str += "\n\t\t" + turn.owner.id + ": type " + turn.type + ": min " + turn.min + ", max " + turn.max;
                    if (j > 0)
                        str += ", cross " + turn.cross(sideTurns[j - 1]);
                });
            });
            
            console.log(str);
        });
    });
    
};    
FlowGraph.prototype.getTurns = function(paths) {
    var dir = this.getDir();
    var turns = [];
    _.each(paths, function(path, i) { turns.push(new TurnInfo(path, dir)); });
    return turns;
};    
FlowGraph.prototype.routeDummyOrthogonal = function() {
    var self = this;
    var dir = this.getDir();
    var source, target, sng, sz;
    _.each(this.paths, function(path, i) {
        let line = path.parent;
        line.style.lineType = "Orthogonal";
        source = self.idToObject[line.startElement];
        target = self.idToObject[line.endElement];
        sng = (source.center[dir] < target.center[dir]) ? 1 : -1;
        sz = [(source.size[0] - target.size[0]) / 2, (source.size[1] - target.size[1]) / 2];
        if (dir === 0)
            line.points = [
                source.center[0] + sng * source.size[0] / 2, source.center[1], 
                (source.center[0] + target.center[0] - sz[0]) / 2, source.center[1], 
                (source.center[0] + target.center[0] - sz[0]) / 2, target.center[1], 
                target.center[0] - sng * target.size[0] / 2, target.center[1]];
        else
            line.points = [
                source.center[0], source.center[1] + sng * source.size[1] / 2, 
                source.center[0],(source.center[1] + target.center[1] - sz[1]) / 2,  
                target.center[0], (source.center[1] + target.center[1] - sz[1]) / 2, 
                target.center[0], target.center[1] - sng * target.size[1] / 2];
    });
};    

//******************************************************************************
// reroute part end
//******************************************************************************

FlowGraph.prototype.markAddingLine = function(line) {
    this.idToObject[line._id] = true;
    if (this.idToObject[line.startElement] === undefined)
        this.idToObject[line.startElement] = true;
    if (this.idToObject[line.endElement] === undefined)
        this.idToObject[line.endElement] = true;
};
FlowGraph.prototype.splitForkLine = function(line) {
    var fork = this.template.boxFork(this.mode, "#genFork" + this.genindex);
    this.parent.boxes.push(fork);
    this.genindex++;
    var newLine = this.template.lineTemplate(
            "OWL.AssocToFork", "#genLine" + this.genindex, line.startElement, fork._id, "Orthogonal");
    this.parent.lines.push(newLine);
    this.genindex++;
    this.markAddingLine(newLine);
    newLine = this.template.lineTemplate(
            "OWL.GeneralizationToFork", "#genLine" + this.genindex, fork._id, line.endElement, "Orthogonal");
    this.parent.lines.push(newLine);
    this.genindex++;
    this.markAddingLine(newLine);
    this.removed[line._id] = true;
};
FlowGraph.prototype.markAddingObjects = function() {
    var self = this;
    var id;
    _.each(this.parent.lines, function(line) {
        id = line._id;
        if (self.idToObject[id] === undefined &&
                (self.linkTypes === undefined || self.idToObject[id] === undefined && self.linkTypes[line.elementTypeId] !== undefined)) {
            if (self.linkTypes[line.elementTypeId] === true)
                self.markAddingLine(line);
            else
                self.splitForkLine(line);
        }
    });
};
FlowGraph.prototype.connectedComponents = function() {
    var components = [];
    _.each(this.nodes, function(node) { node.component = undefined; });
    this.DFS();
    this.nodes.sort((function(a, b) {return (a.component < b.component) ? -1 : (a.component > b.component) ? 1 : 0; }));
    var component;
    var k = -1;
    _.each(this.nodes, function(node) {
        if (node.component !== k) {
            k = node.component;
            components.push([]);
            component = _.last(components);
        }
        component.push(node);
    });
    
//    var str = "\nComponents:";
//    _.each(components, function(component) {
//        str += "\n\t" + component[0].component + "[";
//        _.each(component, function(node) {
//            str += " " + node.id;
//        });
//        str += "]";
//    });
//    console.log(str);
    
    return components;
};
FlowGraph.prototype.DFS = function() {
    var compNum = 0;
    _.each(this.nodes, function(node) { node.component = undefined; });
    _.each(this.nodes, function(node, i) { 
        if (node.component === undefined) {
            node.component = compNum++;
            node.DFS();
        } 
    });
};
FlowGraph.prototype.addNodes = function() {
    var self = this;
    _.each(this.parent.boxes, function(box) {
        if (self.idToObject[box._id])
            self.addNode(box);
    });
};
FlowGraph.prototype.addNode = function(box) {
    var node = new FlowNode();
    node.id = box._id;
    node.owner = this;
    node.parent = box;
    this.nodes.push(node);
    node.size = [box.location.width, box.location.height];
    this.idToObject[node.id] = node;
    node.center = [box.x + box.width / 2, box.y + box.height / 2];
};
FlowGraph.prototype.addPaths = function() {
    var self = this;
    _.each(this.parent.lines, function(line) {
        if (self.idToObject[line._id])
            self.addPath(line);
    });
};
FlowGraph.prototype.addPath = function(line) {
    var path = new FlowPath();
    path.id = line._id;
    path.owner = this;
    path.parent = line;
    this.paths.push(path);
    path.from = line.startElement;
    path.to = line.endElement;
    
    if (OWLTypes[line.elementTypeId] === undefined)
        console.log("Undefined ", "'" + line.elementTypeId + "'");
    
    path.type = OWLTypes[line.elementTypeId].type;
    var source = this.idToObject[path.from];
    var target = this.idToObject[path.to];
    source.forward.push(target);
    source.paths.push(path);
    target.backward.push(source);
    target.paths.push(path);
    this.idToObject[path.id] = path;
};
FlowGraph.prototype.compareSplitLine = function(line) {
    var v = this.idToObject[line.startElement];
    var w = this.idToObject[line.endElement];
    if (v.level !== w.level)
        if (v.level < w.level)
            return [-1, v.level, w.level];
        else
            return [1, w.level, v.level];
    if (v.fixed === w.fixed)
        return [0, v.level, w.level];
    else if (v.fixed)
        return [-1, v.level, w.level];
    else
        return [1, w.level, v.level];
};
FlowGraph.prototype.addSplitPath = function(fromId, toId) {
    var newLine = this.template.lineTemplate(
            "OWL.DummyPath", "#genLine" + this.genindex, fromId, toId, "Orthogonal");
    this.parent.lines.push(newLine);
    this.addPath(newLine);
//    console.log("\tadd dummy path ", newLine._id);
    this.genindex++;
    return newLine;
};
FlowGraph.prototype.addSplitNode = function() {
    var dummy = this.template.boxDummy(this.mode, "#genFork" + this.genindex);
    this.parent.boxes.push(dummy);
    this.addNode(dummy);
//    console.log("\tadd dummy node ", dummy._id);
    this.genindex++;
    return dummy;
};
FlowGraph.prototype.splitLine = function(line) {
    var dummy = this.addSplitNode();
//    var dummy = this.template.boxDummy(this.mode, "#genFork" + this.genindex);
//    this.parent.boxes.push(dummy);
//    this.addNode(dummy);
//    console.log("\tadd dummy node ", dummy._id);
//    this.genindex++;
    
    var c = this.compareSplitLine(line);
//    console.log("splitLine ", line._id, ":", line.startElement, "->", line.endElement, "::", c);
    var dummyOld;
    if (c[0] === 0) {
        this.addSplitPath(dummy._id, line.startElement);
        this.addSplitPath(dummy._id, line.endElement);
    }
    else if (c[0] === 1) {
        this.addSplitPath(line.startElement, dummy._id);
        if (c[1] < c[2] - 1) {
            for (var i = c[1] + 2; i < c[2]; i++) {
                dummyOld = dummy;
                dummy = this.addSplitNode();
                this.addSplitPath(dummyOld._id, dummy._id);
            }
        }
        this.addSplitPath(dummy._id, line.endElement);
    }
    else {
        this.addSplitPath(line.endElement, dummy._id);
//        this.addSplitPath(line.startElement, dummy._id);
        if (c[1] < c[2] - 1) {
            for (var i = c[1] + 2; i < c[2]; i++) {
                dummyOld = dummy;
                dummy = this.addSplitNode();
                this.addSplitPath(dummyOld._id, dummy._id);
            }
        }
//        this.addSplitPath(dummy._id, line.endElement);
        this.addSplitPath(dummy._id, line.startElement);
    }
//    var newLine = this.template.lineTemplate(
//            "OWL.AssocToFork", "#genLine" + this.genindex, line.startElement, dummy._id, "Orthogonal");
//    this.parent.lines.push(newLine);
//    this.addPath(newLine);
//    console.log("\tadd dummy path ", newLine._id);
//    this.genindex++;
//    newLine = this.template.lineTemplate(
//            "OWL.AssocToFork", "#genLine" + this.genindex, dummy._id, line.endElement, "Orthogonal");
//    this.parent.lines.push(newLine);
//    this.addPath(newLine);
//    console.log("\tadd dummy path ", newLine._id);
//    this.genindex++;
    this.removed[line._id] = true;
};
FlowGraph.prototype.markUnflowObjects = function() {
    var self = this;
    var id;
    _.each(this.unflowNodes, function(w) { 
        self.idToObject[w.id] = undefined; 
    });
    _.each(this.parent.boxes, function(box) {
        if (self.idToObject[box._id] === undefined) {
            self.addNode(box);
//            console.log("\tadd node ", box._id);
        }
    });
    _.each(this.parent.lines, function(line) {
        id = line._id;
//        if (self.idToObject[id] === undefined && line.startElement !== line.endElement) {
        if (self.idToObject[id] === undefined) {
            self.splitLine(line);
        }
    });
};
FlowGraph.prototype.setUnflowLevels = function() {
    var self = this;
    var path, v, lev;
//    var str = "\ncalc levels";
    
    _.each(this.unflowNodes, function(w) { w.temp = 0; });
//    _.each(this.unflowNodes, function(w) { 
//        str += "\n\t" + w.id + "::";
//        _.each(w.paths, function(v) { str += v.id + ", " + v.level + "; "; });
//    });
    var diff = 1;
    for (var i = 20; i > 0 && diff > 0.2; i--) {
//        str += "\n\n\t" + i + "::" + diff;
        _.each(this.unflowNodes, function(w) {
            _.each(w.paths, function(v) { w.temp += v.level; });
        });
        diff = 0;
        _.each(this.unflowNodes, function(w) {
//            str += "\n\t\t" + w.id + ", " + w.temp + ", " + (w.paths.length + 1);
            lev = w.temp / (w.paths.length + 1);
//            str += " = " + lev + ", " + w.level;
            if (w.level !== lev) {
                diff += Math.abs(w.level - lev);
                w.temp = lev;
            }
        });
        _.each(this.unflowNodes, function(w) { w.level = w.temp; });
    }
    this.levels = {};
    
//    str += "\nFinal " + i + "; " + diff;
//    _.each(this.unflowNodes, function(w) {
//        w.level = Math.round(w.level);
//        str += "\n\t" + w.id + ": " + w.level;
//        self.levels[w.id] = w.level;
//    });
//    console.log(str);
};
FlowGraph.prototype.createFlow = function(flowLinkTypes) {
    var self = this;
    
    // set flow part of diagram
    this.init(flowLinkTypes);

    var components = this.connectedComponents();

    _.each(components, function(component) {
        if (component.length > 1) {
            result = self.arrangeLayout(component, false);
            self.setLayoutResult(result);
            self.setLevels(component);
//            console.log(self.getLevelStr(component, "\nComponent"));
//            console.log("after arrangeLayout ", result);
        }
    });
};

FlowGraph.prototype.createUnflow = function() {
    var self = this;
    var map = {};
    var path, v, w;
    _.each(this.parent.boxes, function(box) { 
        if (map[box._id] === undefined) {
            if (self.idToObject[box._id] === undefined) {
                var node = {id: box._id, parent: box, level: 0, fixed: false, paths: []};
                self.unflowNodes.push(node);
                self.idToObject[node.id] = node;
            }
        }
    });
    _.each(this.parent.lines, function(line) {
        path = self.idToObject[line._id];
        if (path === undefined && line.startElement !== line.endElement) {
            v = self.idToObject[line.startElement];
            w = self.idToObject[line.endElement];
            if (!v.fixed)
                v.paths.push(w);
            if (!w.fixed)
                w.paths.push(v);
        }
    });
};
FlowGraph.prototype.getDir = function() {
    var dir = 0;
    if (this.layoutStyle === 0 && this.mode !== undefined)
        // is hierarhical layout
        dir = this.mode & 1;
    return dir;
};
FlowGraph.prototype.setLevels = function(nodes) {
    var self = this;
    var levels = [];
    var dir = this.getDir();
    
    var c, level;
    _.each(nodes, function(node) { 
        c = node.center[dir];
        if (levels.length < 1) {
            levels.push(c);
//            console.log("\t\tinit level", c, node.id);
        }
        else {
            level = _.find(levels, function(lev){ return Math.abs(lev - c) < 2; });
            if (level === undefined) {
                levels.push(c);
//                console.log("\t\tnew  level", c, node.id);
            }
            else
                node.center[dir] = level;
//                console.log("\t\told  level", c, node.id);
        }
    });
    levels.sort((function(a, b) {return (a < b) ? -1 : (a > b) ? 1 : 0; }));
//    console.log("levels:", levels);
    var set = {};
    _.each(levels, function(lev, i) { set[lev] = i; });
    var n = _.size(levels);
    levels = [];
    while (n > 0) {
        levels.push([]);
        n--;
    }

    _.each(nodes, function(node) { 
        node.level = set[node.center[dir]];
        levels[node.level].push(node);
//        console.log("\t\tnew  level", node.id, node.level, node.center[dir]);
    });
    
    return levels;
};
FlowGraph.prototype.checkOWLTypes = function(diagramObjects) {
    var map = {};
    _.each(diagramObjects, function(obj, i) {
        if (OWLTypes[obj.elementTypeId] === undefined) {
            map[obj.elementTypeId] = true;
        }
    });
    return _.keys(map);
};
FlowGraph.prototype.testUnknownOWLTypes = function() {
    var unknownTypes =
            _.uniq(_.union(this.checkOWLTypes(this.parent.boxes),
                    this.checkOWLTypes(this.parent.lines)));
    if (unknownTypes.length > 0) {
        var str = "\n###########################################";
        str += "\n# Unknown diagram object types";
        _.each(unknownTypes, function(type) {
            str += "\n#\t " + type;
        });
        str += "\n###########################################\n";
        console.log(str);
    }
};
FlowGraph.prototype.setResultDiagram = function() {
    var node, line, type;
    var self = this;
    _.each(this.nodes, function(box, i) {
        node = box.parent;
        node.location.x = box.center[0] - box.size[0] / 2;
        node.location.y = box.center[1] - box.size[1] / 2;
        node.location.width = box.size[0];
        node.location.height = box.size[1];
    });
    _.each(this.paths, function(path, i) {
        line = path.parent;
        line.points = path.points;
    });
    if (!_.isEmpty(this.removed)) {
        var newLines = [];
        _.each(self.parent.lines, function(line) { 
            if (self.removed[line._id] !== true)
                newLines.push(line);
        });
        this.parent.lines = newLines;
    }
};
FlowGraph.prototype.setLayoutResult = function(result) {
    var self = this;
    var node;
//    str = "";
    _.each(result.boxes, function(box, i) {
        node = self.idToObject[i];
//        str += "\n\tbox " + node.id + " after layout (" + box.width + ", " + box.height + ")"; 
        node.size = [box.width, box.height];
        node.center = [box.x + node.size[0] / 2, box.y + node.size[1] / 2];
        node.fixed = true;
    });
//    console.log(str, "\n")
    var line, str;
    _.each(result.lines, function(path, i) {
        line = self.idToObject[i];
        line.points = [];
        _.each(path, function(point) {
            line.points.push(point.x, point.y);
        });
        line.fixed = true;
    });
};
FlowGraph.prototype.arrangeLayout = function(nodes, incrementally) {
//    console.log(this.getComponentStr(nodes));
//    var isHorizontal = layout === "HORIZONTAL";
    var isHorizontal = (this.mode & 1) === 1;
    var layout = new IMCSLayout(LayoutStyles[this.layoutStyle][this.mode]);
    var self = this;
    var box, line;
    var added = {};
    _.each(nodes, function(node, i){
        if (added[node.id] === undefined) {
            added[node.id] = node;
            if (node.fixed) {
                layout.addBox(node.id, node.center[0] - node.size[0] / 2, node.center[1] - node.size[1] / 2, node.size[0], node.size[1]);
//                console.log(node.id, node.center[0] - node.size[0] / 2, node.center[1] - node.size[1] / 2, node.size[0], node.size[1]);
            }
            else {
                layout.addBox(node.id, 0, 0, node.size[0], node.size[1]);
//                console.log(node.id, 0, 0, node.size[0], node.size[1]);
                if (isHorizontal && node.parent.style.elementStyle.shape === "VerticalLine")
                    node.parent.style.elementStyle.shape = "HorizontalLine";
                else if (!isHorizontal && node.parent.style.elementStyle.shape === "HorizontalLine")
                    node.parent.style.elementStyle.shape = "VerticalLine";
            }
        }
    });
    var options;        
//    var options = {lineType: "STRAIGHT", startSides: 4, endSides: 1};
    var fromNode, toNode, options, lineStyle;
    _.each(nodes, function(node, i) {
        _.each(node.paths, function(path) {
            if (added[path.id] === undefined) {
                if (added[path.from] === undefined || added[path.to] === undefined)
                    warning("FlowGraph.prototype.arrangeLayout path end nodes are not added to layout graph.");
                
                if (OWLTypes[path.parent.elementTypeId].type === "flow")
                    path.parent.style.lineType = LineTypes[self.routingStyle];
                else
                    path.parent.style.lineType = "Direct";
                
//                if (path.parent.style.lineType === undefined)
//                    path.parent.style.lineType = LineTypes[self.routingStyle];
//                else if (options.lineType === "Orthogonal" && path.parent.style.lineType !== "Orthogonal")
//                    path.parent.style.lineType = "Orthogonal";
//                else if (options.lineType !== "Orthogonal")
//                    path.parent.style.lineType = "Direct";
                
                added[path.id] = path;
                lineStyle = (path.parent.style.lineType === "Orthogonal") ? "ORTHOGONAL" : "STRAIGHT";
                options = {lineType: lineStyle, startSides: self.fromSide(), endSides: self.toSide()};
                line = layout.addLine(path.id, path.from, path.to, options);
//                console.log(path.id, path.from, path.to, options);
                // TODO haks lai saglab�tu atskirigus trasesanas stilus
//                if (!path.fixed)
            }
        });
    });
    console.log("\nArrangeFromScratch graph component with ", this.nodes.length, " nodes and ", this.paths.length, " links.");
    
    if (incrementally)
//        return layout.arrangeFromScratch();
        return layout.arrangeIncrementally();
    else
        return layout.arrangeFromScratch();
};
FlowGraph.prototype.getLayoutStr = function(nodes) {
    var str = "\nNodes::\n";
    var lim = "";
    var map = {};
    _.each(nodes, function(box, i){
        str += lim + "\nnew String[] { " + '"' + box.id + '", "'  + box.size[0] + '", "'  + box.size[1] + '"}';
        map[box.id] = true;
        lim = ",";
    });
    str += "\n\n\nLines::\n";
    lim = "";
    _.each(this.paths, function(path, i) {
        if (map[path.from] && map[path.to]) {
            str += lim + "\nnew String[] { " + '"' + path.id + '", "' + path.from + '", "' + path.to + '"}';
            lim = ",";
        }
    });
    return str;
};
FlowGraph.prototype.getLevelStr = function(nodes, text) {
    var self = this;
    var str = text;
    var v, lev;
    var dir = this.getDir();
  _.each(nodes, function(node, i) {
      lev = (node.level === undefined) ? -9 : node.level;
        str += "\n\t" + node.id + ": " + lev + ": " + Math.round(node.center[dir]) + ":'" + node.getName() + "'[";
        _.each(node.paths, function(path, i) {
            v = (path.rom === node.id) ? self.idToObject[path.to] : self.idToObject[path.from];
            if (v !== undefined)
                str += " " + v.id + ", " + v.level + ";";
        });
        str += "]";
    });
    return str;
};
FlowGraph.prototype.getDiagramStr = function(text) {
    var self = this;
    var str = text;
    var id;
    var boxInfo = {};
    _.each(this.parent.boxes, function(box) {
        id = box._id;
        if (OWLTypes[box.elementTypeId] === undefined)
            boxInfo[box._id] = "\n\t" + box._id + ": type UNDF:" + box.elementTypeId + "[";
        else
            boxInfo[box._id] = "\n\t" + box._id + ": type " + OWLTypes[box.elementTypeId].name + "[";
    });
    var r, q;
    _.each(this.parent.lines, function(line) {
        if (OWLTypes[line.elementTypeId].type === "flow")
            r = (OWLTypes[line.elementTypeId].node !== undefined) ? "-" : "=";
        else
            r = " ";
        q = (line.fixed) ? "*" : " ";
        boxInfo[line.startElement] += " " + q + OWLTypes[line.elementTypeId].name + "<" + r + line.endElement + ";";
        boxInfo[line.endElement] += " " + q + OWLTypes[line.elementTypeId].name + r + ">" + line.startElement + ";";
    });
    _.each(boxInfo, function(info) {
        str += info + "]";
    });
    return str;
};
//******************************************************************************
// Node min size 
//******************************************************************************
function buildCompartmentsSelf() {
    return  {editor: {compartmentList: []},
        element: {},
        textsGroup: new Konva.Group(),
        compartments: [],
        addCompartments: BoxCompartments.prototype.addCompartments,
        computeCompartmentsArea: BoxCompartments.prototype.computeCompartmentsArea,
    };
}

function buildBoxMinSize(comparts_this, box) {
    
    var w = 2;
    var h = 2;
    
    return BoxCompartments.prototype.getCompartmentsArea.call(
            comparts_this,
            box.compartments,
            w, h
            );     
};

//******************************************************************************
// other
//******************************************************************************
function getDiagranNodesStr(text, boxes) {
    var str = text;
    _.each(boxes, function(box) {
        str += "(" + box._id + ":xy[" + box.location.x + "," + box.location.y + 
                "]s[" + (box.location.x + box.location.width / 2) + "," + (box.location.y + box.location.height / 2) + "])" +
                "]c[" + box.location.width + "," + box.location.height + "])";
    });
    return str;
};
function my_getNodeAndLinkTypes(diagrams) {
    var nodeTypes = {};
    var lineTypes = {};
    var diagram;
    _.each(diagrams, function(obj) {
        diagram = obj.diagrams[0];
        _.each(diagram.nodes, function(node) {
            if (nodeTypes[node.type] === undefined)
                nodeTypes[node.type] = 0;
            nodeTypes[node.type]++;
        });
        _.each(diagram.edges, function(line) {
            if (lineTypes[line.type] === undefined)
                lineTypes[line.type] = 0;
            lineTypes[line.type]++;
        });
    });
    str = "nodeTypes:\n";
    _.each(nodeTypes, function(value, key) {
        str += "\t" + key + ":" + value + "\n";
    });
    str += "lineTypes:\n";
    _.each(lineTypes, function(value, key) {
        str += "\t" + key + ":" + value + "\n";
    });
    console.log(str);
}
;
function getNodeAndLinkTypes(diagram) {
    var nodeTypes = {};
    var lineTypes = {};
    _.each(diagram.boxes, function(node) {
        if (nodeTypes[node.elementTypeId] === undefined)
            nodeTypes[node.elementTypeId] = 0;
        nodeTypes[node.elementTypeId]++;
    });
    _.each(diagram.lines, function(line) {
        if (lineTypes[line.elementTypeId] === undefined)
            lineTypes[line.elementTypeId] = 0;
        lineTypes[line.elementTypeId]++;
    });
    str = "nodeTypes:\n";
    _.each(nodeTypes, function(value, key) {
        str += "\t" + OWLTypes[key].name + ":" + key + ":" + value + "\n";
    });
    str += "lineTypes:\n";
    _.each(lineTypes, function(value, key) {
        str += "\t" + OWLTypes[key].name + ":" + key + ":" + value + "\n";
    });
    console.log(str);
};

var LayoutStyles = [["INVERSE_HORIZONTAL", "VERTICAL", "HORIZONTAL", "INVERSE_VERTICAL"], ["SYMMETRIC"], ["UNIVERSAL"]];
var RoutingTypes = ["ORTHOGONAL", "POLYLINE", "SPLINE", "STRAIGHT"];
var LineTypes = ["Orthogonal", "Direct", "Direct", "Direct"];
var FlowLinkTypes = { "OWL.AssocToFork": true, "OWL.Generalization": false, "OWL.GeneralizationToFork": true };
var SplitLinkTypes = { "OWL.Association": "dummy", "OWL.Connector": "dummy", "OWL.Dependency": "dummy", 
    "OWL.Disjoint": "dummy", "OWL.Link": "dummy", "OWL.Restriction": "dummy", "OWL.EquivalentClass": "dummy"};

var OWLTypes = {
    // node
    "OWL.AnnotationProperty": {name: "AP", type: "annotation"},
    "OWL.Class": {name: "C", type: "class"},
    "OWL.ClassDuplicate": {name: "CD", type: "class"},
    "OWL.DifferentIndivids": {name: "DI", type: "individs"},
    "OWL.DisjointClasses": {name: "DC", type: "class"},
    "OWL.EquivalentClasses": {name: "EC", type: "class"},
    "OWL.HorizontalFork": {name: "HF", type: "fork", orientation: "horizontal"},
    "OWL.Object": {name: "O", type: "object"},
    "OWL.VerticalFork": {name: "VF", type: "fork", orientation: "vertical"},
    "OWL.DummyBox": {name: "DB", type: "dummy"},
    // line        
    "OWL.Association": {name: "A", type: "any"},
    "OWL.AssocToFork": {name: "AF", type: "flow"},
    "OWL.Connector": {name: "C", type: "any"},
    "OWL.Dependency": {name: "De", type: "any"},
    "OWL.DifferentIndivid": {name: "DI", type: "any"},
    "OWL.Disjoint": {name: "Ds", type: "any"},
    "OWL.EquivalentClass": {name: "EC", type: "any"},
    "OWL.Generalization": {name: "Ge", type: "flow", note: "needFork"},
    "OWL.GeneralizationToFork": {name: "GF", type: "flow"},
    "OWL.Link": {name: "L", type: "any"},
    "OWL.Restriction": {name: "R", type: "any"},
    "OWL.SameAsIndivid": {name: "SI", type: "any"},
    "OWL.DummyPath": {name: "DP", type: "dummy"}
};
//******************************************************************************
// TurnInfo
//******************************************************************************
function TurnInfo(path, dir) {
    var d = 1 - dir;
    var node = path.owner.idToObject[path.parent.startElement];
    var sCenter = node.center;
    node = path.owner.idToObject[path.parent.endElement];
    var tCenter = node.center;
    var bottom = (sCenter[dir] < tCenter[dir]) ? sCenter[d] : tCenter[d];
    var top = (sCenter[dir] > tCenter[dir]) ? sCenter[d] : tCenter[d];
    
//    this.type = (bottom === top) ? 4 : (bottom < top) ? 8 : 2;
//    this.min = (this.type === 2) ? top : bottom;
//    this.max = (this.type === 8) ? top : bottom;
    this.type = (bottom === top) ? 1 : (bottom < top) ? 2 : 0;
    this.min = (this.type === 0) ? top : bottom;
    this.max = (this.type === 2) ? top : bottom;
    this.owner = path;
    console.log("\t\tturn ", path.id, "  ", sCenter, "  ", tCenter, " ", dir, " ", this.type, " ", this.min, " ", this.max);
};
TurnInfo.prototype.cross = function(other) {
    if (this.min < other.max && other.min < this.max &&
            (this.type !== other.type
                    || (this.min < other.min && other.max < this.max)
                    || (this.min > other.min && other.max > this.max)))
        return true;
    return false;
};
TurnInfo.prototype.compare = function(other) {
    if (this.min === other.min && this.max === other.max && this.type === other.type)
        return 0;
    if (this.max <= other.min)
        return -1;
    else if (this.min >= other.max)
        return 1;
    // intersect intervals
    else if (this.type !== other.type)
        // turns has crossing 
        if (this.type < other.type)
            return -1;
        else
            return 1;
    else if (this.type === 1)
        if (this.min < other.min)
            return -1;
        else
            return 1;
    else if (this.type === 0)
        if (this.min < other.min && this.max < other.max)
            return -1;
        else if (this.min > other.min && this.max > other.max)
            return 1;
        // turns has crossing 
        else if (this.min < other.min &&  this.max > other.max)
            return -1;
        else
            return 1;
    else
        if (this.min > other.min && this.max > other.max)
            return 1;
        else if (this.min < other.min && this.max < other.max)
            return -11;
        // turns has crossing 
        else if (this.min > other.min && this.max < other.max)
            return 1;
        else
            return -1;
};
//          turns
//   |_____  |  ____|
//  _____  | | |  ____
//    _  | | | | |  _
//   | | | | | | | | |
//     0 1 2 4 8 9 10
