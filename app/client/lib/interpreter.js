import { Elements } from '/libs/platform/collections'

$(document).on('keypress', function (e) {

	// if modal is open, than closing it
	var modal_path = ".modal.in";
	if (e.keyCode == 13 && _.size($(modal_path)) > 0) {
		$(modal_path).find(".btn.btn-primary").trigger("click");
	}
});


Interpreter = {

	customExtensionPoints: {},
	extensionPoints: {
						SelectAll: function() {
							var editor = this.editor;
							editor.selection.selectAll();
						},
					},

	methods: function(list) {
		_.extend(this.extensionPoints, list);
	},

	customMethods: function(list) {
		_.extend(this.customExtensionPoints, list);
	},

	execute: function(method_name, args, obj_type) {

		var func = Interpreter.extensionPoints[method_name] || Interpreter.customExtensionPoints[method_name];
		if (func) {

			if (obj_type) {
				return func.apply(obj_type, args);
			}

			else {
				return func.apply(this, args);
			}
		}

		else {

			//if method_name is empty string or undefined, then not displaying error msg
			if (method_name) {
				console.error("Error: No such function - ", method_name);
			}
		}

	},

	executeExtensionPoint: function(obj_type, extension_point_name, args) {
		var method_name = this.getExtensionPointProcedure(extension_point_name, obj_type);
		if (!_.isArray(args)) {
			args = [args];
		}

		return this.execute(method_name, args, obj_type);
	},

	getExtensionPointProcedure: function(extension_point, obj_type) {

		//collects all object type translets
		var translet = _.find(obj_type["extensionPoints"], function(extensionPoint) {
			return extensionPoint["extensionPoint"] === extension_point;
		});

		if (translet) {
			return translet.procedure;
		}
	},

	setActiveElement: function(elem_id) {
		Session.set("activeElement", elem_id);
		var elem = Elements.findOne({_id: elem_id});
		if (elem) {
			Session.set("activeElementType", elem["elementTypeId"]);
		}
	},

	resetActiveElement: function() {
		Session.set("activeElement", reset_variable());
		Session.set("activeElementType", reset_variable());
	},

	showErrorMsg: function(text, delay) {

		if (!delay) {
			delay = 5000;
		}

		//type is one of the bootstrap's variables - danger, warning, etc.
		Session.set("errorMsg", {type: "danger", text: text});

		if (delay > 0) {

			//removing the message after 5 sec
			Meteor.setTimeout(function() {
				Interpreter.destroyErrorMsg();
			}, delay);
		}
	},

	destroyErrorMsg: function() {
		Session.set("errorMsg", reset_variable());
	},

	getEditorType: function() {
		//var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		//if (!diagram_type)
		//	return;

		//return diagram_type["editorType"];
		return Session.get("editorType");
	},

	destroy: function() {
		//this.editor = 
	},

};


export {Interpreter}
