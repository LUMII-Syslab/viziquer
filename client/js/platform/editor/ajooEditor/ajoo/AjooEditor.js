
 AjooEditor = function(settings) {

    var editor = this;

    editor._id = $.now();
    editor.containerName = settings["container"];
    editor.paletteContainerName = "ajoo_palette";
    editor.sceneContainerName = "ajoo_scene";

    editor.width = settings["width"];
    editor.height = settings["height"];

    editor.boxSettings = settings.boxSettings;
    if (!editor.boxSettings)
        editor.boxSettings = {};


    editor.lineSettings = settings.lineSettings;
    if (!editor.lineSettings)
        editor.lineSettings = {};

    //mode
    editor.mode = new Mode(editor);

    //palette
    editor.palette = new Palette(editor, settings.palette);

    //adding scene
    var scene_width = settings["width"] - editor.palette.width;
    var scene_height = editor.height;

    //adding scene container
    var scene_html = "<div id=" + editor.sceneContainerName;
    scene_html += " style='float: left";
    scene_html += "width:" + scene_width + "px; height:" + scene_height + "px;";
    scene_html += "overflow-x: hidden;overflow-y: hidden";
    scene_html += "'></div>";
    $("#" + settings["container"]).append(scene_html);

    var stage = new Konva.Stage({container: editor.sceneContainerName,
                                  width: scene_width,
                                  height: editor.height,
                                });
    
    editor.getSceneContainer().on("mouseleave", function() {
        editor.actions.finish({evt: {which: 1}});
    });

    stage.name = "Stage";
    editor.stage = stage;

    editor.compartmentList = {};

    editor.paletteState = {};
   
    editor.selectionPosition = {x: 0, y: 0};

    editor.selectionStyle = new SelectionStyle(settings["selectionStyle"]);

    //specifying event handlers
    editor.events = settings.events || {};

    //specifying logging functions
    editor.eventLogging = settings.eventLogging || {};

    editor.layers = new Layers(editor, settings["area"]);

    //add event handlers to the stage
    editor.actions = new Actions(editor);

    //elements
    editor.elements = new AElements(editor);

    //selection
    editor.selection = new Selection(editor);

    //connection points
    editor.connectionPoints = new ConnectionPoints(editor);

    //mouseState
    editor.mouseState = new MouseState(editor);

    //zoom
    editor.zoom = new Zoom(editor);

    //grid
    editor.grid = new Grid(editor);

    var is_refresh_not_needed = true;

    //size
    editor.size = new Size(editor);

    //adding elements to the scene
    var data = settings["data"];  

    editor.addElements(data, is_refresh_not_needed);

    if (settings["isEditModeEnabled"]) {
        editor.switchEditMode(is_refresh_not_needed);
    }

    //grid
    if (settings["isGridEnabled"]) {
        editor.showGrid(is_refresh_not_needed);
    }

    //rendering palette elements  
    if (settings["palette"] && settings["palette"]["elements"]) {
        editor.palette.add(settings["palette"]["elements"]);
    }

    //panning
    editor.panning = new Panning(editor);
    if (settings["isPanningEnabled"]) {
        editor.enablePanning();
    }

    editor.getSceneContainer().on("contextmenu", function(){
        return false;
    });

    editor.data = {};

   // new Event(editor, "afterElementsLoaded");

    //this is a hack to refresh a palette layer when images are present in the scene
    setTimeout(function() {
        editor.palette.refresh();  
    }, 500);

    editor.stage.draw();

    return editor;
}

AjooEditor.prototype = {

//helpers
    getStage: function() {
        var editor = this;
        return editor.stage;
    },

    getLayer: function(layer_name) {
        var editor = this;
        var layers = editor.layers;
        return layers.getLayer(layer_name);
    },

    getPaletteContainer: function() {
        var editor = this;
        return $("#" + editor.containerName).find("#" + editor.paletteContainerName);
    },

    getSceneContainer: function() {
        var editor = this;
        return $("#" + editor.containerName).find("#" + editor.sceneContainerName);
    },

    getPalette: function() {
        var editor = this;
        return editor.palette;
    },

//selection
    getSelectedElements: function() {
        var editor = this;
        return editor.selection.selected;
    },

    selectElements: function(selection_list, is_refresh_not_needed) {
        var editor = this;
        var selection = editor.selection;
        selection.select(selection_list, is_refresh_not_needed);
    },

    unSelectElements: function(selection_list, is_refresh_needed) {
        var editor = this;
        var selection = editor.selection;
        selection.unselect(selection_list, is_refresh_needed);
    },

    isSelectionEmpty: function() {
        var editor = this;
        return editor.selection.isEmpty();
    },

    alignSelection: function(h_align, v_align) {
        var editor = this;
        return editor.selection.align(h_align, v_align);
    },

//elements
    getElements: function() {
        var editor = this;
        return editor.elements.elementList;
    },

    addElements: function(data, is_refresh_not_needed) {
        var editor = this;
        var elements = editor.elements;
        elements.addElements(data, is_refresh_not_needed);
    },

    removeElements: function(data, is_refresh_needed) {
        var editor = this;
        var elements = editor.elements;
        elements.removeElements(data, is_refresh_needed);
    },

//grid
    isGridEnabled: function() {
        var editor = this;
        return editor.grid.isGridEnabled;
    },

    showGrid: function(is_refresh_not_needed) {
        var editor = this;
        var grid = editor.grid;
        grid.showGrid(is_refresh_not_needed);
    },

    removeGrid: function() {
        var editor = this;
        var grid = editor.grid;
        grid.removeGrid();
    },

//mode
    isEditMode: function() {
        var editor = this;
        var mode = editor.mode;
        return mode.isEditMode;
    },

    switchEditMode: function(is_refresh_not_needed) {
        var editor = this;
        var mode = editor.mode;
        mode.switchEditMode(is_refresh_not_needed);
    },

    switchReadMode: function(is_refresh_not_needed) {
        var editor = this;
        var mode = editor.mode;
        mode.switchReadMode(is_refresh_not_needed);
    },

//zoom
    getZoom: function() {
        var editor = this;
        return editor.zoom;
    },

    zoomIn: function() {
        var editor = this;
        var zoom = editor.zoom;
        zoom.zoomIn();
    },

    zoomOut: function() {
        var editor = this;
        var zoom = editor.zoom;
        zoom.zoomOut();
    },

//actions
    isAction: function() {
        var editor = this;
        var actions = editor.actions;
        return actions.isAction();
    },

    getActionName: function() {
        var editor = this;
        var actions = editor.actions;
        return actions.state.name;
    },

//mouse
    getMouseStateObject: function() {
        var editor = this;
        return editor.mouseState;
    },

    getMouseState: function() {
        var editor = this;
        return editor.mouseState.state;
    },

//selection style
    getSelectionStyle: function() {
        var editor = this;
        var selection_style = editor.selectionStyle;
        return selection_style.style;
    },

//size
    getSize: function() {
        var editor = this;
        return editor.size.state;
    },
    
//panning
    isPanningEnabled: function() {
        var editor = this;
        return editor.panning.isPanningEnabled();
    },

    enablePanning: function() {
        var editor = this;
        editor.panning.enablePanning();
    },

    disablePanning: function() {
        var editor = this;
        editor.panning.disablePanning();
    },

    getSwimlane: function() {
        var editor = this;
        
        return _.find(editor.getElements(), function(elem) {
            if (elem.type === "Swimlane") {
                return elem;
            }
        });
    },

};

find_child = function(parent, name) {
    if (parent) {
        if (parent.name == name)
            return parent;
        
        else {
            var children = parent.getChildren()
            if (children) {
                for (var i=0;i<children.length;i++) {
                    var child = find_child(children[i], name);
                    if (child)
                        return child;
                }
            }
        }
    }
}