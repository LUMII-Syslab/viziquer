// @ts-check
import { Interpreter } from '../../../lib/interpreter.js'

import './generate_complex_table_query_form.html'

let modalElement = null;

Template.GenerateComplexTableQueryForm.onRendered(function () {
  modalElement = this.$(".modal");
});

Interpreter.customMethods({
    GenerateComplexTableQuery: async function() {
      if (!modalElement) return;
      modalElement.modal("show");
    },
})
