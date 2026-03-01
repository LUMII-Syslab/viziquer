// @ts-check
import { Interpreter } from '../../../lib/interpreter.js'
import { Template } from "meteor/templating";

import './generate_complex_table_query_form.html'
import { initReactComponents, QueryGeneratorView } from '../js/complexTable.js';
import { createElement } from 'react';

/** @type {*} */
let modalElement = null;

Template.GenerateComplexTableQueryForm.onRendered(function () {
  modalElement = this.$(".modal");
  /** @type {HTMLElement} */
  const domEl = modalElement.get(0);
  const mountRoot = domEl.getElementsByClassName("modal-body").item(0);
  if (!mountRoot) {
    console.error("Could not find .modal-body to mount!");
    return;
  }

  initReactComponents(mountRoot, createElement(QueryGeneratorView));
});

Interpreter.customMethods({
    GenerateComplexTableQuery: async function() {
      if (!modalElement) return;
      modalElement.modal("show");
    },
})

Template.GenerateComplexTableQueryForm.hideModal = function () {
    modalElement?.modal("hide");
};
