import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Interpreter } from '../../../../client/lib/interpreter.js';
import { Compartments, CompartmentTypes, Elements } from '../../../../db/platform/collections.js';
import { Create_OWLGrEd_Element } from '../js/OWLGrEd_Element.js';
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'

import './manage_class_individuals_form.html';

Template.ManageIndividuals.tableColumns = new ReactiveVar([]);
Template.ManageIndividuals.tableRows = new ReactiveVar([]);
Template.ManageIndividuals.deletedRowIds = new ReactiveVar([]);
Template.ManageIndividuals.isOneOf = new ReactiveVar(false);
Template.ManageIndividuals.displayAttributeId = new ReactiveVar("");
Template.ManageIndividuals.individualCount = new ReactiveVar("");

function buildIndividualsTable(individuals, attributes, objectProperties = []) {
	const columns = [
		{ id: 'IRI', name: 'IRI', kind: 'iri' },
		...attributes.map(attr => ({
			id: attr._id._id,
			name: attr.Name,
			kind: 'data'
		})),
		...objectProperties.map(prop => ({
			id: prop.id,
			name: prop.name,
			kind: 'object',
			targetClassName: prop.targetClassName,
			direction: prop.direction
		}))
	];

	const rows = individuals.map((individual, rowIndex) => {
		const valueMap = {};

		(individual.Individual || []).forEach(item => {
			valueMap[item.id] = item.value || '';
		});

		return {
			rowId: individual._id._id || `row-${rowIndex}`,
			rowIndex,
			isNew: false,
			cells: columns.map(col => ({
				columnId: col.id,
				columnKind: col.kind,
				value: valueMap[col.id] || ''
			}))
		};
	});

	return { columns, rows };
}

function reindexRows(rows) {
	return rows.map((row, index) => ({
		...row,
		rowIndex: index
	}));
}

function buildAssertionValuesFromRow(row, columns) {
	return row.cells
		.map(cell => {
			const col = columns.find(c => c.id === cell.columnId);

			return {
				id: cell.columnId,
				name: col ? col.name : cell.columnId,
				value: cell.value || '',
				input: cell.columnId === 'IRI' ? (cell.value || '') : ''
			};
		})
		.filter(item => item.id === "IRI" || item.value !== '');
}

async function buildObjectPropertyColumns(elemOWLGrEd) {
	const links = await elemOWLGrEd.getLinks("Association");
	const objectColumns = [];

	for (const linkInfo of links) {
		const linkObj = linkInfo.link?.obj;
		if (!linkObj) continue;

		if (linkInfo.start === false) {
			const targetElem = await Create_OWLGrEd_Element(linkObj.endElement);
			const targetClassName = await targetElem.getCompartmentValue("Name");
			const propName = await linkInfo.link.getCompartmentValue("Name");

			objectColumns.push({
				id: `${linkObj._id || linkObj.endElement}_out`,
				name: propName,
				kind: "object",
				targetClassName,
				direction: "out"
			});
		}
		else {
			const targetElem = await Create_OWLGrEd_Element(linkObj.startElement);
			const targetClassName = await targetElem.getCompartmentValue("Name");
			const propName = await linkInfo.link.getCompartmentValue("NameInv");

			objectColumns.push({
				id: `${linkObj._id || linkObj.startElement}_in`,
				name: propName,
				kind: "object",
				targetClassName,
				direction: "in"
			});
		}
	}

	return objectColumns.filter(col => col.name);
}

function getCellValue(row, columnId) {
	const cell = (row.cells || []).find(c => c.columnId === columnId);
	return cell ? (cell.value || '') : '';
}

function buildIndividualDisplayValue(row, columns, displayAttributeId) {
	const iri = getCellValue(row, "IRI");

	if (!displayAttributeId) {
		return iri;
	}

	const selectedColumn = columns.find(col => col.id === displayAttributeId);
	const selectedValue = getCellValue(row, displayAttributeId);

	if (!selectedColumn || !selectedValue) {
		return iri;
	}

	return `${selectedValue}(${iri})`;
}

Interpreter.customMethods({
	ManageIndividuals: async function () {
		const selectedElemId = Session.get("activeElement");
		const elemOWLGrEd = await Create_OWLGrEd_Element(selectedElemId);

		let individuals = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Individuals");
		let attributes = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Attributes");
		
		// let links = await elemOWLGrEd.getLinks("Association");
		
		const objectProperties = await buildObjectPropertyColumns(elemOWLGrEd);

		individuals = individuals.map(item => {
			let parsed = [];

			try {
				parsed = JSON.parse(item.Individual);
			} catch (e) {
				parsed = [];
			}

			return {
				...item,
				Individual: parsed
			};
		});

		const { columns, rows } = buildIndividualsTable(individuals, attributes, objectProperties);

		Template.ManageIndividuals.tableColumns.set(columns);
		Template.ManageIndividuals.tableRows.set(rows);
		Template.ManageIndividuals.deletedRowIds.set([]);
		const isOneOf = await elemOWLGrEd.getCompartmentValue("OneOf");
		Template.ManageIndividuals.isOneOf.set(isOneOf);
		const displayAttributeId = await elemOWLGrEd.getCompartmentValue("IndividualLabel");
		Template.ManageIndividuals.displayAttributeId.set(displayAttributeId);
		
		const individualCount = await elemOWLGrEd.getCompartmentValue("VisibleIndividualCount");
		Template.ManageIndividuals.individualCount.set(individualCount);

		$("#manage-individuals-form").modal("show");
	}
});

Template.ManageIndividuals.helpers({
	tableColumns() {
		return Template.ManageIndividuals.tableColumns.get();
	},
	tableRows() {
		return Template.ManageIndividuals.tableRows.get();
	},
	isOneOfChecked() {
		return Template.ManageIndividuals.isOneOf.get();
	},
	intanceCount() {
		return Template.ManageIndividuals.individualCount.get();
	},
	displayColumns() {
		const columns = Template.ManageIndividuals.tableColumns.get() || [];
		return columns.filter(col => col.id !== "IRI");
	},
	isSelectedDisplayColumn(columnId) {
		return Template.ManageIndividuals.displayAttributeId.get() === columnId;
	},
	isDisplayAttributeEmpty() {
		return !Template.ManageIndividuals.displayAttributeId.get();
	},
	columnClass(column) {
		if (column.kind === 'object') return 'object-column';
		if (column.kind === 'data') return 'data-column';
		return 'iri-column';
	},
	columnTitle(column) {
		if (column.kind === 'object') {
			return `${column.name} → ${column.targetClassName || ''}`;
		}
		if (column.kind === 'data') {
			return `${column.name} (data property)`;
		}
		return 'IRI';
	},
	findColumn(columnId) {
		const columns = Template.ManageIndividuals.tableColumns.get() || [];
		return columns.find(col => col.id === columnId);
	}
});

Template.ManageIndividuals.events({
	"change #individuals-oneof-checkbox"(e) {
		Template.ManageIndividuals.isOneOf.set(e.currentTarget.checked);
	},
	
	"change #individuals-display-attribute"(e) {
		Template.ManageIndividuals.displayAttributeId.set(e.currentTarget.value || "");
	},
	
	"input #individuals-visible-count-input"(e) {
		Template.ManageIndividuals.individualCount.set(e.currentTarget.value || "");
	},
	
	"input .individual-cell"(e) {
		const rowIndex = Number(e.currentTarget.dataset.rowIndex);
		const columnId = e.currentTarget.dataset.columnId;
		const value = e.currentTarget.value;

		const rows = Template.ManageIndividuals.tableRows.get() || [];
		if (!rows[rowIndex]) return;

		const cell = rows[rowIndex].cells.find(c => c.columnId === columnId);
		if (cell) {
			cell.value = value;
			Template.ManageIndividuals.tableRows.set([...rows]);
		}
	},

	"click #add-individual-row"() {
		const columns = Template.ManageIndividuals.tableColumns.get() || [];
		const rows = Template.ManageIndividuals.tableRows.get() || [];

		const newRow = {
			rowId: `new-${Date.now()}`,
			rowIndex: rows.length,
			isNew: true,
			cells: columns.map(col => ({
				columnId: col.id,
				value: ''
			}))
		};

		Template.ManageIndividuals.tableRows.set([...rows, newRow]);
	},

	"click .delete-individual-row"(e) {
		const rowIndex = Number(e.currentTarget.dataset.rowIndex);
		let rows = Template.ManageIndividuals.tableRows.get() || [];
		let deletedRowIds = Template.ManageIndividuals.deletedRowIds.get() || [];

		const rowToDelete = rows[rowIndex];

		if (rowToDelete && !rowToDelete.isNew && rowToDelete.rowId) {
			deletedRowIds.push(rowToDelete.rowId);
			Template.ManageIndividuals.deletedRowIds.set([...deletedRowIds]);
		}

		rows = rows.filter((row, index) => index !== rowIndex);
		rows = reindexRows(rows);

		Template.ManageIndividuals.tableRows.set(rows);
	},

	"click #ok-manage-individuals": async function () {
		const columns = Template.ManageIndividuals.tableColumns.get() || [];
		const rows = Template.ManageIndividuals.tableRows.get() || [];
		const deletedRowIds = Template.ManageIndividuals.deletedRowIds.get() || [];
		const isOneOf = Template.ManageIndividuals.isOneOf.get();
		const displayAttributeId = Template.ManageIndividuals.displayAttributeId.get() || "";
		const individualCount = Template.ManageIndividuals.individualCount.get() || null;
		
		const selectedElemId = Session.get("activeElement");
		const actEl = await Elements.findOneAsync({ _id: selectedElemId });
		if (!actEl) return;

		const owlgredObj = await Create_OWLGrEd_Element(selectedElemId);
		const compartType = await CompartmentTypes.findOneAsync({
			name: "Individuals",
			elementTypeId: actEl.elementTypeId
		});
		
		if(isOneOf) await owlgredObj.setCompartmentValueAuto("OneOf", isOneOf.toString());
		if(individualCount) await owlgredObj.setCompartmentValueAuto("VisibleIndividualCount", individualCount);
		await owlgredObj.setCompartmentValue("IndividualLabel", displayAttributeId, "")

		// delete removed existing rows
		for (const deletedRowId of deletedRowIds) {
			
			var list = {compartmentId: deletedRowId,
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		   await Utilities.callMeteorMethodAsync("removeCompartment", list);
			
		}
		
		// add/update current rows
		const count = Number(individualCount);
		const visibleRowCount =
			Number.isFinite(count) && count > 0
				? Math.min(Math.floor(count), rows.length)
				: rows.length;

		for (const [index, row] of rows.entries()) {
			const attributeValues = buildAssertionValuesFromRow(row, columns);
			const iriObj = attributeValues.find(x => x.id === "IRI");
			const iri = iriObj ? iriObj.value : "";

			if (!iri) continue;

			const visibleValue =
				index < visibleRowCount
					? buildIndividualDisplayValue(
						row,
						columns,
						displayAttributeId
					)
					: "";

			if (row.isNew) {
				await owlgredObj.addCompartmentSubCompartments2("Individuals", [
					{
						name: "Individual",
						input: visibleValue,
						value: JSON.stringify(attributeValues)
					}
				]);
			} else {
				const compart = await Compartments.findOneAsync({
					_id: row.rowId,
					compartmentTypeId: compartType._id,
					elementId: selectedElemId
				});

				if (typeof compart !== "undefined") {
					const subCompartments = compart.subCompartments || {};

					if (
						subCompartments.Individuals &&
						subCompartments.Individuals.Individuals &&
						subCompartments.Individuals.Individuals.Individual
					) {
						subCompartments.Individuals.Individuals.Individual.input = JSON.stringify(attributeValues);

						subCompartments
							.Individuals
							.Individuals
							.Individual
							.value = iri;
					}

					const value = Dialog.buildCompartmentValue(
						compartType,
						iri,
					visibleValue ? `\u25C7 ${visibleValue}` : ""
					);

					Dialog.updateCompartmentValue(
						compartType,
						selectedElemId,
						iri,
						value,
						row.rowId,
						null,
						null,
						subCompartments
					);
				}
			}
		}
		
		
		
		
		const oneOfIndividualIris = rows
			.map(row => {
				const iriCell = row.cells.find(c => c.columnId === "IRI");
				return iriCell ? iriCell.value : "";
			})
			.filter(Boolean);

		// replace this with your actual class axiom persistence
		// console.log("Save owl:oneOf flag:", isOneOf);
		// console.log("Save owl:oneOf members:", oneOfIndividualIris);

		$("#manage-individuals-form").modal("hide");
	}
});