
var Panning = function(editor) {
	var panning = this;
	panning.editor = editor;

	panning.isEnabled = false;
}

Panning.prototype = {

	isPanningEnabled: function() {
		var panning = this;
		return panning.isEnabled;
	},

	enablePanning: function() {
		var panning = this;
		panning.switchPanningMode(true);
	},

	disablePanning: function() {
		var panning = this;
		panning.switchPanningMode(false);
	},

	switchPanningMode: function(val) {
		var panning = this;
		panning.isEnabled = val;
	},

}

var PanningDrag = function(editor) {
	var panningDrag = this;
	panningDrag.editor = editor;
}

PanningDrag.prototype = {

	startDragging: function() {
		var panningDrag = this;
		var editor = panningDrag.editor;

		console.log("editor starg ", editor.stage.attrs.draggable)

		editor.stage.draggable(true);

		console.log("editor starg ", editor.stage.attrs.draggable)
				
	},

	finishDragging: function() {
		var panningDrag = this;
		var editor = panningDrag.editor;

		editor.stage.draggable(false);		
	},

}	


export {Panning, PanningDrag}
