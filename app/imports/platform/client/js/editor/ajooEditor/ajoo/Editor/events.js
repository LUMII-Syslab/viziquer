
var Event = function(editor, name, data) {

	var ev = this;
	ev.editor = editor;

	ev.result = ev.fire(name, data);
}

Event.prototype = {

	fire: function(name, data) {		
		var ev = this;
		var editor = ev.editor;
		var events = editor.events;
		var eventLogging = editor.eventLogging;

		//logging event if the logging function is specified
		if (eventLogging[name]) {
			eventLogging[name].call(editor, data);	
		}

		//if there is a handler function
		if (events[name]) {
			return events[name].call(editor, data);
		}

	},
}

export default Event