import { Template } from 'meteor/templating';
import { get_multi_fields_obj } from '/imports/platform/client/templates/diagrams/dialog/subCompartments';

import './class_instances_form_OWLGrEd.html';

Template.classInstanceFieldOWLGrEd.helpers({
  multi_fields_obj: function() {
    let res = get_multi_fields_obj();
    _.extend(res, { next_level_form: "AddInstance_OWLGrEd" });
    return res;
  },
});