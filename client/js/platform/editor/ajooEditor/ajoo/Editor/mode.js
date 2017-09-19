
Mode = function(editor) {

	var mode = this;
	mode.editor = editor;

	mode.isEditMode = false;

	mode.switchMode = function(mode_type, is_refresh_not_needed) {

        var shapes_layer = editor.getLayer("ShapesLayer");

        //collecting selected elements
        var selected = _.map(editor.getSelectedElements(), function(elem) {
            return elem;
        });

        //unselecting to manage layers and remove selected style
        editor.unSelectElements();

        var palette = editor.palette;

        //edit mode
        if (mode_type == "editMode") {

            if (palette)
                palette.show();

            //switching to the read mode
            mode["isEditMode"] = true;
        }

        //read mode
        else {

            if (palette) 
                palette.hide();

            //switching to the read mode
            mode["isEditMode"] = false;

            editor.selectionPosition = {x: 0, y: 0};
        }

        //reselecting elements to update style
        editor.selectElements(selected);

        if (!is_refresh_not_needed) {
            shapes_layer.draw();
        }
	}
}

Mode.prototype = {

	switchEditMode: function(is_refresh_not_needed) {
		var mode = this;
		mode.switchMode("editMode", is_refresh_not_needed);
	},

	switchReadMode: function(is_refresh_not_needed) {
		var mode = this;
		mode.switchMode("readMode", is_refresh_not_needed);
	},

}