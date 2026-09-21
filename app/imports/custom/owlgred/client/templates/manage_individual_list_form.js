import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Interpreter } from '../../../../client/lib/interpreter.js';
import { Compartments, CompartmentTypes, Elements, ElementTypes, Diagrams } from '../../../../db/platform/collections.js';
import { Create_OWLGrEd_Element } from '../js/OWLGrEd_Element.js';
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'

import './manage_individual_list_form.html';

Template.ManageIndividualList.tableColumns = new ReactiveVar([]);
Template.ManageIndividualList.tableRows = new ReactiveVar([]);
Template.ManageIndividualList.deletedRowIds = new ReactiveVar([]);
Template.ManageIndividualList.isOneOf = new ReactiveVar(false);
Template.ManageIndividualList.displayAttributeId = new ReactiveVar("");
Template.ManageIndividuals.individualCount = new ReactiveVar("");

function getCellValue2(col, valueById, valueByName) {
	// 1. Normal case: column id and individual item id are equal
	if (Object.prototype.hasOwnProperty.call(valueById, col.id)) {
		return valueById[col.id];
	}

	// 2. Fallback: ids are different, but names are equal
	// Example:
	// column id: KQH9kkLuoso7y4EeL
	// item id: http://owlgred.lumii.lv/web/2026#studentNumber
	// item name: studentNumber
	if (Object.prototype.hasOwnProperty.call(valueByName, col.name)) {
		return valueByName[col.name];
	}

	return '';
}

function getIndividualItems(individual) {
	if (Array.isArray(individual.Individual) && individual.Individual.length > 0) {
		return individual.Individual;
	}

	const input =
		individual.fulltext
			?.subCompartments
			?.Individuals
			?.Individuals
			?.Individual
			?.input;

	if (!input) {
		return [];
	}

	try {
		const parsed = JSON.parse(input);
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function buildIndividualsTable(individuals, attributes, objectProperties = []) {
	const columns = [
		{ id: 'IRI', name: 'IRI', kind: 'iri' },

		...attributes.map(attr => ({
			id: attr._id?._id || attr.id,
			name: attr.Name || attr.name,
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

	const rows = individuals
		.map((individual, rowIndex) => {
			const items = getIndividualItems(individual);

			// Skip header/separator rows where Individual is empty
			if (!items.length) {
				return null;
			}

			const valueById = {};
			const valueByName = {};

			items.forEach(item => {
				const value = item.value ?? '';

				if (item.id) {
					valueById[item.id] = value;
				}

				if (item.name) {
					valueByName[item.name] = value;
				}
			});

			return {
				rowId: individual._id?._id || individual.fulltext?._id || `row-${rowIndex}`,
				rowIndex,
				isNew: false,
				cells: columns.map(col => ({
					columnId: col.id,
					columnKind: col.kind,
					value: getCellValue2(col, valueById, valueByName)
				}))
			};
		})
		.filter(Boolean);

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

function buildIndividualDisplayParts(row, columns) {
	return columns.map(col => getCellValue(row, col.id) || "");
}

function buildIndividualDisplayTableValues(rows, columns) {
	const rowParts = rows
		.filter(row => getCellValue(row, "IRI"))
		.map(row => ({
			rowId: row.rowId,
			parts: buildIndividualDisplayParts(row, columns)
		}));

	const headers = columns.map(col => col.name || col.id);

	const columnWidths = headers.map(header => header.length);

	rowParts.forEach(row => {
		row.parts.forEach((part, index) => {
			columnWidths[index] = Math.max(columnWidths[index] || 0, part.length);
		});
	});

	const headerLine = headers
	.map((header, index) => header.padEnd(columnWidths[index], " "))
	.join(" \u2502 ");

const separatorLine = columnWidths
	.map(width => "\u2500".repeat(width))
	.join("\u2500\u253C\u2500");



	const valuesByRowId = {};

	rowParts.forEach((row, rowIndex) => {
		const rowLine = row.parts
	.map((part, index) => part.padEnd(columnWidths[index], " "))
	.join(" \u2502 ");

		valuesByRowId[row.rowId] = rowIndex === 0
			? `${headerLine}\n${separatorLine}\n${rowLine}`
			: rowLine;
	});

	return valuesByRowId;
}

function buildIndividualDisplayParts2(row, columns, displayAttributeId) {
	const iri = getCellValue(row, "IRI");

	const selectedColumn = displayAttributeId
		? columns.find(col => col.id === displayAttributeId)
		: null;

	const selectedValue = displayAttributeId
		? getCellValue(row, displayAttributeId)
		: "";

	const mainValue = selectedColumn && selectedValue
		? `${selectedValue}(${iri})`
		: iri;

	const restColumns = columns.filter(col => col.id !== "IRI" && col.id !== displayAttributeId);

	const restValues = restColumns.map(col => getCellValue(row, col.id) || "");

	return [mainValue, ...restValues];
}

function buildIndividualDisplayHeaders(columns, displayAttributeId) {
	const selectedColumn = displayAttributeId
		? columns.find(col => col.id === displayAttributeId)
		: null;

	const firstHeader = selectedColumn
		? `${selectedColumn.name}(IRI)`
		: "IRI";

	const restHeaders = columns
		.filter(col => col.id !== "IRI" && col.id !== displayAttributeId)
		.map(col => col.name || col.id);

	return [firstHeader, ...restHeaders];
}

function buildIndividualDisplayTable(rows, columns, displayAttributeId) {
	const headers = buildIndividualDisplayHeaders(columns, displayAttributeId);

	const rowParts = rows.map(row => ({
		rowId: row.rowId,
		parts: buildIndividualDisplayParts(row, columns, displayAttributeId)
	}));

	const columnWidths = headers.map(header => header.length);

	rowParts.forEach(row => {
		row.parts.forEach((part, index) => {
			columnWidths[index] = Math.max(columnWidths[index] || 0, part.length);
		});
	});

	const headerLine = headers
		.map((header, index) => header.padEnd(columnWidths[index], " "))
		.join(" | ");

	const separatorLine = columnWidths
		.map(width => "_".repeat(width))
		.join("_|_");

	const valuesByRowId = {};

	rowParts.forEach(row => {
		const rowLine = row.parts
			.map((part, index) => part.padEnd(columnWidths[index], " "))
			.join(" | ");

		valuesByRowId[row.rowId] = `${headerLine}\n${separatorLine}\n${rowLine}`;
	});

	return valuesByRowId;
}


function buildIndividualDisplayValues(rows, columns, displayAttributeId) {
	const rowParts = rows.map(row => ({
		rowId: row.rowId,
		parts: buildIndividualDisplayParts(row, columns, displayAttributeId)
	}));

	const columnWidths = [];

	rowParts.forEach(row => {
		row.parts.forEach((part, index) => {
			columnWidths[index] = Math.max(columnWidths[index] || 0, part.length);
		});
	});

	const valuesByRowId = {};

	rowParts.forEach(row => {
		valuesByRowId[row.rowId] = row.parts
			.map((part, index) => part.padEnd(columnWidths[index], " "))
			.join(" | ");
	});

	return valuesByRowId;
}

function buildIndividualDisplayValue(row, columns, displayAttributeId) {
	const iri = getCellValue(row, "IRI");

	const selectedColumn = displayAttributeId
		? columns.find(col => col.id === displayAttributeId)
		: null;

	const selectedValue = displayAttributeId
		? getCellValue(row, displayAttributeId)
		: "";

	const mainValue = selectedColumn && selectedValue
		? `${selectedValue}(${iri})`
		: iri;

	const restValues = columns
		.filter(col => col.id !== "IRI" && col.id !== displayAttributeId)
		.map(col => getCellValue(row, col.id))
		.filter(value => value !== "");

	return [mainValue, ...restValues].join("|");
}

Interpreter.customMethods({
	ManageIndividualList: async function () {
		const selectedElemId = Session.get("activeElement");
		const elemOWLGrEd = await Create_OWLGrEd_Element(selectedElemId);

		let individuals = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Individuals");
		let className = await elemOWLGrEd.getCompartmentValue("ClassName");
		
		const diagramId = Session.get("activeDiagram");
		const diagram = Diagrams.findOne({_id:Session.get("activeDiagram")});
		const active_diagram_type_id = diagram["diagramTypeId"];

		const elem_type_class = ElementTypes.findOne({name:"Class", diagramTypeId:active_diagram_type_id});
		const elem_classes = Elements.find({diagramId:diagramId, elementTypeId: elem_type_class["_id"]}).map(function(e) {
		   
		   return e["_id"]
		});
		
		let instanceClass;
		
		for(let i = 0; i < elem_classes.length; i++){
			const classOWLGrEd = await Create_OWLGrEd_Element(elem_classes[i]);
			const clName = await classOWLGrEd.getCompartmentValue("Name");
			if(clName === className){
				instanceClass = classOWLGrEd;
				break
			}
		}
		
		let attributes = [];
		let objectProperties = [];
		if(instanceClass) {
			attributes = await instanceClass.getMultiCompartmentSubCompartmentValues("Attributes");
			objectProperties = await buildObjectPropertyColumns(instanceClass);
		}

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
		
		Template.ManageIndividualList.tableColumns.set(columns);
		Template.ManageIndividualList.tableRows.set(rows);
		Template.ManageIndividualList.deletedRowIds.set([]);
		const isOneOf = await elemOWLGrEd.getCompartmentValue("OneOf");
		Template.ManageIndividualList.isOneOf.set(isOneOf);
		const displayAttributeId = await elemOWLGrEd.getCompartmentValue("IndividualLabel");
		Template.ManageIndividualList.displayAttributeId.set(displayAttributeId);
		
		const individualCount = await elemOWLGrEd.getCompartmentValue("VisibleIndividualCount");
		Template.ManageIndividuals.individualCount.set(individualCount);

		$("#manage-individual-list-form").modal("show");
	}
});

Template.ManageIndividualList.helpers({
	tableColumns() {
		return Template.ManageIndividualList.tableColumns.get();
	},
	tableRows() {
		return Template.ManageIndividualList.tableRows.get();
	},
	isOneOfChecked() {
		return Template.ManageIndividualList.isOneOf.get();
	},
	intanceCount() {
		return Template.ManageIndividuals.individualCount.get();
	},
	displayColumns() {
		const columns = Template.ManageIndividualList.tableColumns.get() || [];
		return columns.filter(col => col.id !== "IRI");
	},
	isSelectedDisplayColumn(columnId) {
		return Template.ManageIndividualList.displayAttributeId.get() === columnId;
	},
	isDisplayAttributeEmpty() {
		return !Template.ManageIndividualList.displayAttributeId.get();
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
		const columns = Template.ManageIndividualList.tableColumns.get() || [];
		return columns.find(col => col.id === columnId);
	}
});

Template.ManageIndividualList.events({
	"change #individual-list-oneof-checkbox"(e) {
		Template.ManageIndividualList.isOneOf.set(e.currentTarget.checked);
	},
	
	"change #individual-list-display-attribute"(e) {
		Template.ManageIndividualList.displayAttributeId.set(e.currentTarget.value || "");
	},
	
	"input #individual-list-visible-count-input"(e) {
		Template.ManageIndividuals.individualCount.set(e.currentTarget.value || "");
	},
	
	"input .individual-cell"(e) {
		const rowIndex = Number(e.currentTarget.dataset.rowIndex);
		const columnId = e.currentTarget.dataset.columnId;
		const value = e.currentTarget.value;

		const rows = Template.ManageIndividualList.tableRows.get() || [];
		if (!rows[rowIndex]) return;

		const cell = rows[rowIndex].cells.find(c => c.columnId === columnId);
		if (cell) {
			cell.value = value;
			Template.ManageIndividualList.tableRows.set([...rows]);
		}
	},

	"click #add-individual-row"() {
		const columns = Template.ManageIndividualList.tableColumns.get() || [];
		const rows = Template.ManageIndividualList.tableRows.get() || [];

		const newRow = {
			rowId: `new-${Date.now()}`,
			rowIndex: rows.length,
			isNew: true,
			cells: columns.map(col => ({
				columnId: col.id,
				value: ''
			}))
		};

		Template.ManageIndividualList.tableRows.set([...rows, newRow]);
	},

	"click .delete-individual-row"(e) {
		const rowIndex = Number(e.currentTarget.dataset.rowIndex);
		let rows = Template.ManageIndividualList.tableRows.get() || [];
		let deletedRowIds = Template.ManageIndividualList.deletedRowIds.get() || [];

		const rowToDelete = rows[rowIndex];

		if (rowToDelete && !rowToDelete.isNew && rowToDelete.rowId) {
			deletedRowIds.push(rowToDelete.rowId);
			Template.ManageIndividualList.deletedRowIds.set([...deletedRowIds]);
		}

		rows = rows.filter((row, index) => index !== rowIndex);
		rows = reindexRows(rows);

		Template.ManageIndividualList.tableRows.set(rows);
	},

	"click #ok-manage-individual-list": async function () {
		const columns = Template.ManageIndividualList.tableColumns.get() || [];
		const rows = Template.ManageIndividualList.tableRows.get() || [];
		const deletedRowIds = Template.ManageIndividualList.deletedRowIds.get() || [];
		const isOneOf = Template.ManageIndividualList.isOneOf.get();
		const displayAttributeId = Template.ManageIndividualList.displayAttributeId.get() || "";
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
		// const visibleValuesByRowId = buildIndividualDisplayValues(rows, columns, displayAttributeId);
		// const visibleValuesByRowId = buildIndividualDisplayTable(rows, columns, displayAttributeId);
		
		const visibleValuesByRowId = buildIndividualDisplayTableValues(rows, columns);
		
		
		const count = Number(individualCount);
		const visibleRowCount =
			Number.isFinite(count) && count > 0
				? Math.min(Math.floor(count), rows.length)
				: rows.length;
		
		// add/update current rows
		for (const [index, row] of rows.entries()) {
			const attributeValues = buildAssertionValuesFromRow(row, columns);
			const iriObj = attributeValues.find(x => x.id === "IRI");
			const iri = iriObj ? iriObj.value : "";

			if (!iri) continue;
			
			const visibleValue =
				index < visibleRowCount
					? visibleValuesByRowId[row.rowId]
					: "";

			if (row.isNew) {	
				await owlgredObj.addCompartmentSubCompartments2("Individuals", [
					{
						name: "Individual",
						input: visibleValue,
						value: JSON.stringify(attributeValues)
					}
				]);
			}
			else {
				const compart = await Compartments.findOneAsync({
					_id: row.rowId,
					compartmentTypeId: compartType._id,
					elementId: selectedElemId
				});

				if (typeof compart !== "undefined") {
					let subCompartments = compart.subCompartments || {};

					if (
						subCompartments.Individuals &&
						subCompartments.Individuals.Individuals &&
						subCompartments.Individuals.Individuals.Individual
					) {
						subCompartments.Individuals.Individuals.Individual.input = JSON.stringify(attributeValues);
						subCompartments.Individuals.Individuals.Individual.value = iri;
					}

					let value = Dialog.buildCompartmentValue(compartType, iri, visibleValue);

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

		$("#manage-individual-list-form").modal("hide");
	}
});