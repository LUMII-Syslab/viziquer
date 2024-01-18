// import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities, reset_variable } from '/imports/client/platform/js/utilities/utils'
import { is_system_admin } from '/imports/libs/platform/user_rights'
import { Projects, Diagrams } from '/imports/db/platform/collections'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'

import './sparql_form.html'
import { VQ_Schema } from '../js/VQ_Element'

YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
YASQE.registerAutocompleter('customPropertyCompleter', customPropertyCompleter);
YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];

// var yasqe = null;
// var yasqe3 = null;


var sparql_form_events = {

/*"blur #generated-sparql3": function(e) {
		var val = $(e.target).val();
		Session.set("generatedSparql", val);
		yasqe.setValue(val);
	},
	"blur #generated-sparql3": function(e) {
		var val = $(e.target).val();
		Session.set("generatedSparql", val);
		yasqe3.setValue(val);
	}, */

	"focus .yasqe": function() {
		Session.set("isYasqeActive", true)
	},

	"blur .yasqe": function() {
		Session.set("isYasqeActive", reset_variable())
	},

	"click #reset-sparql": function(e) {
		e.preventDefault();
		Session.set("generatedSparql", undefined);
		Session.set("executedSparql", {limit_set:false, number_of_rows:0});
		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		let yasqe3 = Template.sparqlForm.yasqe3.get();

		yasqe.setValue("");
		yasqe3.setValue("");
	},

	"click #execute-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    let query = yasqe.getValue();
	
    console.log("query ", query)

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query);
	},

	"click #next-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    var query = yasqe.getValue();
    var obj = Session.get("executedSparql");
		var paging_info = {offset:obj.offset, limit:obj.limit, number_of_rows:obj.number_of_rows};

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	},

	"click #prev-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    var query = yasqe.getValue();
    var obj = Session.get("executedSparql");
		var paging_info = {offset:obj.offset - 100, limit:obj.limit, number_of_rows:obj.number_of_rows};

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	},

	"click #download-results": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		var query = yasqe.getValue();
		var obj = Session.get("executedSparql");
		var paging_info = {download: true, offset:obj.offset - 50, limit:obj.limit, number_of_rows:obj.number_of_rows}

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	}

};


var sparql_form_helpers = {

	generatedSparql: function() {
		return Session.get("generatedSparql");
	},

	executedSparql: function() {
		var result = Session.get("executedSparql");
		return result;
		/*return _.map(result, function(item, i) {
			return {value: item, index: i+1};
		});*/
	},

	plusOne: function(number) {
    return number + 1;
	},

  plusOneOffset: function(number, offset) {
		if (offset) {
			return number + offset - 50 + 1}
		else {
		  return number + 1;
		}
	},

  augmentedResult: function() {
    var self = Session.get("executedSparql");

    if (!self.sparql) {
      return;
    }

		var binding_map = _.map(self.sparql.head[0].variable, function(v) {
			return v["$"].name;
		});

    _.each(self.sparql.results[0].result, function(res) {

      var new_bindings = _.map(binding_map, function(map_item) {
        var  existing_binding = _.find(res.binding, function(binding) {return binding["$"].name==map_item});
        if (existing_binding) {
          return existing_binding;
        } else {
          return {};
        }
      });
      res.binding = new_bindings;
    })

    return _.map(self.sparql.results[0].result, function(p) {
      p.parent = self;
      return p;
    });
  },

  showPrev: function(offset) {
		return offset>50;
	},

  showNext: function(offset, number) {
		return offset < number;
	}

};


Template.sparqlForm.onRendered( async function() {
//console.log('--sparqlForm.onRendered--')

	let yasqe3 = YASQE.fromTextArea(document.getElementById("generated-sparql3"), {
		sparql: {
			showQueryButton: false,
		},
		//autoRefresh: true,
	});

	Template.sparqlForm.yasqe3 = new ReactiveVar(yasqe3);

	$(document).on('shown.bs.tab', '#vq-tab a[href="#sparql"]', function() {
		this.refresh();
	}.bind(yasqe3));

	yasqe3.on("blur", function(editor){
		var val = editor.getValue();
		Session.set("generatedSparql", val);

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		yasqe.setValue(val);
		// yasqe.refresh();
	});
	Session.set("generatedSparql", undefined);
	yasqe3.setValue("");
	
	var project_id = Session.get("activeProject");
	var project = Projects.findOne({_id: project_id,});
	//console.log(project)
	
	if (project!== undefined && project.newPublicProject) {
	
		await dataShapes.changeActiveProject(project_id);
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		//console.log(diagram)	
		if (diagram.query !== undefined && diagram.query.length > 0) {
			yasqe3.setValue(diagram.query);
			if (project.isVisualizationNeeded){
				console.log("sparql_form.js, onRendered(), diagram.query =", diagram.query, [diagram.query])
				Interpreter.customExtensionPoints.visualizeSPARQL([diagram.query]);
			}
		}
		var list = {projectId: project_id, set: {newPublicProject: false, isVisualizationNeeded: false},};
		Utilities.callMeteorMethod("updateProject", list);	
	}

	//const vv = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX w: <http://ldf.fi/schema/warsa/>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nSELECT ?Person ?firstName ?familyName WHERE{\n  ?Person rdf:type w:Person.\n  OPTIONAL{?Person foaf:firstName ?firstName.}\n  OPTIONAL{?Person foaf:familyName ?familyName.}\n}"

});

Template.sparqlForm.helpers(sparql_form_helpers);
Template.sparqlForm.events(sparql_form_events);

Template.sparqlForm_see_results.onDestroyed(function() {
	//console.log('-----------sparqlForm_see_results.onDestroyed(-----------')
	Session.set("generatedSparql", undefined);
	Session.set("executedSparql", {limit_set: false, number_of_rows: 0});

	Session.set("isYasqeActive", reset_variable())
});

Template.sparqlForm_see_results.onRendered(function() {

  var yasqe_config = {
    sparql: {
      showQueryButton: false,
    },

    extraKeys: {
      Esc: function () {
        console.log("esc pressed");
      },
    },

  };
  // var proj = Projects.findOne({_id: Session.get("activeProject")});
	//
  // if (proj && proj.uri && proj.endpoint) {
  //   yasqe_config.sparql.endpoint = proj.endpoint;
	// 	yasqe_config.sparql.namedGraphs = [proj.uri];
  // };

	let yasqe = YASQE.fromTextArea(document.getElementById("generated-sparql"), yasqe_config);
	yasqe.on("blur", function(editor) {
		var val = editor.getValue();

		Session.set("generatedSparql", val);

		let yasqe3 = Template.sparqlForm.yasqe3.get();
		yasqe3.setValue(val);
		//yasqe3.refresh();
	});
	//yasqe.setValue("A");


	Template.sparqlForm_see_results.yasqe = new ReactiveVar(yasqe);	
});


Template.sparqlForm_see_results.helpers(sparql_form_helpers);
Template.sparqlForm_see_results.events(sparql_form_events);


function customClassCompleter(yasqe_doc) {
	return {
		isValidCompletionPosition: function(){return YASQE.Autocompleters.classes.isValidCompletionPosition(yasqe_doc)},
		preProcessToken: function(token) {return token},
		postProcessToken: function(token, suggestedString)  {return suggestedString},
		bulk: true,
		async: false,
		autoShow: false,
		get: function(token, callback) {
			// TODO te varētu arī no jaunās shēmas informāciju dabūt, ja nav pārāk liela
			return [];
		 	//var schema = new VQ_Schema();
		 	//var list =  _.filter(_.sortBy(schema.getAllClasses(), function(v) {return v.name}).map(function(c) {return ":"+c.name}), function(n) {return n!=": "});
		 	//return list;
		}
	};
}

function customPropertyCompleter(yasqe_doc) {
	return {
		isValidCompletionPosition: function(){return YASQE.Autocompleters.properties.isValidCompletionPosition(yasqe_doc)},
		preProcessToken: function(token) {return token},
		postProcessToken: function(token, suggestedString)  {return suggestedString},
		bulk: true,
		async: false,
		autoShow: false,
		get: function(token, callback) {
			// TODO te varētu arī no jaunās shēmas informāciju dabūt, ja nav pārāk liela
			return [];
			//var schema = new VQ_Schema();
			//var list =  _.filter(_.map(schema.Attributes,function(c) {return ":"+c.localName}), function(n) {return n!=": "});
			//list = _.sortBy(_.union(list,_.filter(_.map(schema.Associations, function(c) {return ":"+c.localName}), function(n) {return n!=": "}) ), function(v) {return v});
			//return list;
		}
	};

}
