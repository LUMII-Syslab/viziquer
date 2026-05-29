import { FlowRouter } from "meteor/ostrio:flow-router-extra";

import { Interpreter } from "../../../../client/lib/interpreter.js";
import { Utilities } from "../utilities/utils.js";
import {
  Compartments,
  Elements,
  Diagrams,
  DiagramTypes,
  ElementTypes,
} from "../../../../db/platform/collections.js";
import { computeOrthogonalLinePointsFromBoxes } from "../editor/ajooEditor/ajoo/Elements/Lines/draw_new_line.js";

const heightConst = {
  8: 4, 9: 3, 10: 2, 11: 1, 12: 0, 13: 2, 14: 3, 15: 4,
  16: 4, 17: 5, 18: 5, 19: 5, 20: 5, 21: 6, 22: 6, 23: 6, 24: 6,
};

const widthConst = {
  8: 4.8, 9: 5.1, 10: 5.4, 11: 5.7, 12: 6.0, 13: 6.5, 14: 7.0, 15: 7.4,
  16: 8.5, 17: 8.2, 18: 8.7, 19: 9.3, 20: 9.8, 21: 10.4, 22: 10.9, 23: 11.5, 24: 12.0,
};

function computeBoxSizeFromCompartments(boxId) {
  let minWidth = 100;
  let width = 120;
  let height = 30;
  let compart_width = 0;
  let compart_height = 0;
  let nonEmptyRowCount = 0;
  let longestRow = {};
  let secondLongestRow = {};

  Compartments.find({ elementId: boxId }).forEach(function (compart) {
    if (compart.style.visible === true) {
      if (!compart.value) return;
      let value = compart.value.trimStart();
      if (value === "") return;

      let font_size = compart.style.fontSize;
      let font_style_coef = compart.style.fontStyle === "bold" ? 1.1 : 0.95;

      let tmp_width = 0;
      let tmp_height = 0;

      let splitted_value = value.split(/\r?\n/);
      _.each(splitted_value, function (row) {
        if (row === "") return;
        nonEmptyRowCount++;

        let text_length = Math.ceil(font_style_coef * (row.length * widthConst[font_size]));
        tmp_width = Math.max(tmp_width, text_length);
        tmp_height += font_size + heightConst[font_size];

        if (typeof longestRow.row === "undefined") {
          longestRow = { row, font_size, text_length, font_style_coef };
          secondLongestRow = { row, font_size, text_length, font_style_coef };
        } else if (longestRow.text_length < text_length) {
          longestRow = { row, font_size, text_length, font_style_coef };
        } else if (secondLongestRow.text_length < text_length) {
          secondLongestRow = { row, font_size, text_length, font_style_coef };
        }
      });

      compart_width = Math.max(compart_width, tmp_width);
      compart_height += tmp_height;
    }
  });

  if (nonEmptyRowCount === 1 && longestRow.text_length > minWidth) {
    let row = longestRow.row.trim();
    let rowMiddlePoint = Math.ceil(row.length / 2);
    let rowMiddle = row.substring(rowMiddlePoint);
    let rowStart = row.substring(1, rowMiddlePoint - 1);
    if (rowMiddle.indexOf(" ") !== -1) {
      compart_width = Math.ceil(
        longestRow.font_style_coef * ((rowMiddle.indexOf(" ") + rowMiddlePoint) * widthConst[longestRow.font_size]),
      );
    } else if (rowStart.indexOf(" ") !== -1) {
      compart_width = Math.ceil(
        longestRow.font_style_coef * ((row.length - rowStart.indexOf(" ")) * widthConst[longestRow.font_size]),
      );
    } else {
      compart_width = Math.ceil(
        longestRow.font_style_coef * rowMiddlePoint * widthConst[longestRow.font_size],
      );
    }
    compart_height += longestRow.font_size + heightConst[longestRow.font_size];
  } else if (nonEmptyRowCount > 1 && secondLongestRow.text_length < longestRow.text_length) {
    if (secondLongestRow.text_length < minWidth) secondLongestRow.text_length = minWidth;
    let longestCoefficient = 100 - (secondLongestRow.text_length * 100) / longestRow.text_length;
    if (longestCoefficient > 20) {
      if (longestCoefficient < 50) {
        compart_width = secondLongestRow.text_length;
        compart_height +=
          (longestRow.font_size + heightConst[longestRow.font_size]) *
          Math.ceil(longestRow.text_length / secondLongestRow.text_length);
      } else {
        let row = longestRow.row.trim();
        let rowMiddlePoint = Math.ceil(row.length / 2);
        let rowMiddle = row.substring(rowMiddlePoint);
        let rowStart = row.substring(1, rowMiddlePoint - 1);

        if (rowMiddle.indexOf(" ") !== -1) {
          if (rowMiddle.indexOf(" ") < rowMiddle.length / 2) {
            compart_width = Math.ceil(
              longestRow.font_style_coef * rowMiddlePoint * widthConst[longestRow.font_size],
            );
          } else {
            compart_width = Math.ceil(
              longestRow.font_style_coef *
                ((rowMiddle.indexOf(" ") + rowMiddlePoint) * widthConst[longestRow.font_size]),
            );
          }
        } else if (rowStart.indexOf(" ") !== -1) {
          if (rowStart.indexOf(" ") < rowStart.length / 2) {
            compart_width = Math.ceil(
              longestRow.font_style_coef * rowMiddlePoint * widthConst[longestRow.font_size],
            );
          } else {
            compart_width = Math.ceil(
              longestRow.font_style_coef *
                ((row.length - rowStart.indexOf(" ")) * widthConst[longestRow.font_size]),
            );
          }
          if (row.indexOf("<-") !== -1) {
            compart_height += longestRow.font_size + heightConst[longestRow.font_size];
          }
        } else {
          compart_width = Math.ceil(
            longestRow.font_style_coef * rowMiddlePoint * widthConst[longestRow.font_size],
          );
        }
        compart_height += longestRow.font_size + heightConst[longestRow.font_size];
      }
    }
  }

  if (compart_width !== 0) width = compart_width + 5;
  if (compart_height !== 0) height = compart_height + 5;
  if (height < 30) height = 30;
  if (width < 120) width = 120;

  return { width, height };
}

export function persistLayoutChanges(diagramId, movedBoxes, lines) {
  const list = {
    projectId: Session.get("activeProject"),
    versionId: Session.get("versionId"),
    diagramId: diagramId,
    lines: lines,
    movedBoxes: movedBoxes,
  };
  Utilities.callMeteorMethod("changeCollectionPosition", list);
}

Interpreter.methods({
  createDiagram: function (diagram_name, diagram_type_id) {
    var diagram_type = DiagramTypes.findOne({ _id: diagram_type_id });
    if (!diagram_type) {
      return;
    }

    var list = { name: diagram_name };
    var res = Interpreter.executeExtensionPoint(
      diagram_type,
      "beforeCreateDiagram",
      list,
    );

    if (res !== false) {
      Interpreter.executeExtensionPoint(diagram_type, "createDiagram", list);

      Utilities.callMeteorMethod("insertDiagram", list, function (id) {
        list.diagramId = id;
        Interpreter.executeExtensionPoint(
          diagram_type,
          "afterCreateDiagram",
          list,
        );

        if (id) {
          FlowRouter.go("diagram", {
            projectId: list.projectId,
            _id: id,
            diagramTypeId: list.diagramTypeId,
            versionId: list.versionId,
          });
        }
      });
    }
  },

  delete_diagram: function (diagram_id) {
    if (!diagram_id) {
      diagram_id = Session.get("activeDiagram");
    }

    var diagram = Diagrams.findOne({ _id: diagram_id });
    if (diagram) {
      var diagram_type_id = diagram.diagramTypeId;
      var diagram_type = DiagramTypes.findOne({ _id: diagram_type_id });
      if (!diagram_type) {
        diagram_type = DiagramTypes.findOne({});
        if (!diagram_type) {
          return;
        }
      }

      var list = { id: diagram_id };
      var res = Interpreter.executeExtensionPoint(
        diagram_type,
        "beforeDeleteDiagram",
        list,
      );
      if (res !== false) {
        Interpreter.executeExtensionPoint(diagram_type, "deleteDiagram", list);
        Interpreter.executeExtensionPoint(
          diagram_type,
          "afterDeleteDiagram",
          list,
        );
      }
    }
  },

  CreateDiagram: function (list) {
    var obj_type = this;

    list.projectId = Session.get("activeProject");
    list.versionId = Session.get("versionId");
    list.style = obj_type.style;
    list.diagramTypeId = obj_type._id;
    list.editorType = obj_type.editorType;
  },

  DeleteDiagramObject: function (list) {
    var obj_type = this;

    list.projectId = Session.get("activeProject");
    list.versionId = Session.get("versionId");

    Utilities.callMeteorMethod("removeDiagram", list);
    FlowRouter.go("diagrams", {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
    });
  },

  AddTargetDiagram: function () {
    var elem_type = ElementTypes.findOne({
      _id: Session.get("activeElementType"),
    });
    if (elem_type) {
      //vajag new diagram type
      var diagram_type = DiagramTypes.findOne({
        _id: elem_type.targetDiagramTypeId,
      });
      if (!diagram_type) {
        return;
      }

      var elem_id = Session.get("activeElement");
      var compart = Compartments.findOne({
        elementId: elem_id,
        isObjectRepresentation: true,
      });
      if (!compart) {
        compart = Compartments.findOne({ elementId: elem_id });
      }

      var diagram = {
        projectId: Session.get("activeProject"),
        versionId: Session.get("versionId"),
        name: compart.value || "Diagram",
        diagramTypeId: diagram_type._id,
        style: diagram_type.style,
      };

      var element = {
        projectId: Session.get("activeProject"),
        versionId: Session.get("versionId"),
        id: elem_id,
      };

      var list = {
        parentDiagram: Session.get("activeDiagram"),
        diagram: diagram,
        element: element,
      };

      Utilities.callMeteorMethod("addTargetDiagram", list);
    }
  },

  Navigate: function () {
    var elem = Elements.findOne({ _id: Session.get("activeElement") });
    if (elem) {
      var target_id = elem.targetId;
      if (target_id) {
        var stage = Interpreter.editor;
        stage.selection = [];
        stage.selected = {};

        FlowRouter.go("diagram", {
          projectId: Session.get("activeProject"),
          _id: target_id,
          diagramTypeId: Session.get("diagramType"),
          versionId: Session.get("versionId"),
          editMode: "edit",
        });
      }
    }
  },

  ChangeCollectionPosition: function (list) {
    list.projectId = Session.get("activeProject");
    list.versionId = Session.get("versionId");

    Utilities.callMeteorMethod("changeCollectionPosition", list);
  },

  align_selected_boxes: function (list) {
    console.log("align selected boxes");
    // Interpreter.editor.alignSelection(0, 1);

    //    list.projectId = Session.get("activeProject");
    //    list.versionId = Session.get("versionId");

    //    Utilities.callMeteorMethod("changeCollectionPosition", list);
  },

  ComputeFlowLayout: function () {
    // remember existing
    let editor = Interpreter.editor;
    let remembered_layout_settings = { ...editor.layoutSettings };

    editor.layoutSettings.layout = "INVERSE_VERTICAL";
    Interpreter.execute("ComputeLayout");

    // restore
    editor.layoutSettings = remembered_layout_settings;
  },

  ComputeUniversalLayout: function () {
    // remember existing
    let editor = Interpreter.editor;
    let remembered_layout_settings = { ...editor.layoutSettings };

    editor.layoutSettings.layout = "UNIVERSAL";
    Interpreter.execute("ComputeLayout");

    // restore
    editor.layoutSettings = remembered_layout_settings;
  },

  ComputeIncrementalLayout: function (currentElement, newBoxes, newLines, diagramId) {
    const editor = Interpreter.editor;
    const layoutEngine = editor.layoutEngine("UNIVERSAL");

    const newBoxIds = new Set(newBoxes.map(b => b.obj._id));
    const newLineIds = new Set(newLines.map(l => l.obj._id));

    const idToIndex = {};
    let idx = 0;

    // Add existing boxes with their current positions (engine treats them as fixed)
    Elements.find({ type: "Box" }).forEach(el => {
      if (newBoxIds.has(el._id)) return;
      // if (skipTypeIds.has(el.elementTypeId)) return;
      const loc = el.location;
      if (!loc) return;

      let { width, height } = computeBoxSizeFromCompartments(el._id);
      if (width < loc.width) width = loc.width;
      if (height < loc.height) height = loc.height;

      idToIndex[el._id] = idx;
      layoutEngine.addBox(idx, loc.x, loc.y, width, height);
      idx++;
    });

    // Add new boxes at their DB location so the engine places them near existing elements
    for (const box of newBoxes) {
      const boxId = box.obj._id;
      const { width, height } = computeBoxSizeFromCompartments(boxId);
      const loc = Elements.findOne({ _id: boxId })?.location;
      const seedX = (loc && loc.x > -9000) ? loc.x : 0;
      const seedY = (loc && loc.y > -9000) ? loc.y : 0;
      idToIndex[boxId] = idx;
      layoutEngine.addBox(idx, seedX, seedY, width, height);
      idx++;
    }

    // Add existing lines
    Elements.find({ type: "Line" }).forEach(el => {
      if (newLineIds.has(el._id)) return;
      const fromIdx = idToIndex[el.startElement];
      const toIdx = idToIndex[el.endElement];
      if (fromIdx === undefined || toIdx === undefined) return;
      idToIndex[el._id] = idx;
      layoutEngine.addLine(idx, fromIdx, toIdx, el.layoutSettings ?? {
        lineType: "ORTHOGONAL", startSides: 15, endSides: 15,
      });
      idx++;
    });

    // Add new lines and their labels
    let labelIdx = idx + newLines.length + 100;
    for (const line of newLines) {
      const lineId = line.obj._id;
      const fromIdx = idToIndex[line.obj.startElement];
      const toIdx = idToIndex[line.obj.endElement];
      if (fromIdx === undefined || toIdx === undefined) continue;
      idToIndex[lineId] = idx;
      const lineIdx = idx;
      layoutEngine.addLine(idx, fromIdx, toIdx, {
        lineType: "ORTHOGONAL", startSides: 15, endSides: 15,
      });
      idx++;

      const labelSize = computeBoxSizeFromCompartments(lineId);
      if (labelSize.width > 0 && labelSize.height > 0) {
        layoutEngine.addLineLabel(labelIdx, lineIdx, labelSize.width, labelSize.height, "start-left");
        labelIdx++;
      }
    }

    const result = layoutEngine.arrangeIncrementally();
    const elementList = editor.getElements();

    // The engine normalizes output to (0,0) by subtracting minX/minY.
    // Compute the offset by comparing an existing box's known DB position
    // with the engine's returned position for that same box.
    let offsetX = 0;
    let offsetY = 0;
    for (const [elId, elIdx] of Object.entries(idToIndex)) {
      if (newBoxIds.has(elId) || newLineIds.has(elId)) continue;
      const enginePos = result.boxes[elIdx];
      if (!enginePos) continue;
      const dbEl = Elements.findOne({ _id: elId });
      if (!dbEl?.location) continue;
      offsetX = dbEl.location.x - enginePos.x;
      offsetY = dbEl.location.y - enginePos.y;
      break;
    }

    // 1. Update new box positions visually FIRST
    const movedBoxes = [];
    for (const box of newBoxes) {
      const pos = result.boxes[idToIndex[box.obj._id]];
      if (pos) {
        const bx = pos.x + offsetX;
        const by = pos.y + offsetY;
        movedBoxes.push({ id: box.obj._id, position: { x: bx, y: by, width: pos.width, height: pos.height } });
        const editorElem = elementList[box.obj._id];
        if (editorElem) {
          editorElem.setElementPosition(bx, by);
          editorElem.updateSize(pos.width, pos.height);
        }
      }
    }

    // 2. Recompute line points from actual box positions
    const newLineData = [];
    for (const line of newLines) {
      const editorLine = elementList[line.obj._id];
      if (!editorLine) continue;
      const startBox = elementList[line.obj.startElement];
      const endBox = elementList[line.obj.endElement];
      if (!startBox || !endBox) continue;

      const srcPos = startBox.getElementPosition();
      const srcSize = startBox.getSize();
      const tgtPos = endBox.getElementPosition();
      const tgtSize = endBox.getSize();

      const srcBox = { x: srcPos.x, y: srcPos.y, width: srcSize.width, height: srcSize.height };
      const tgtBox = { x: tgtPos.x, y: tgtPos.y, width: tgtSize.width, height: tgtSize.height };

      const points = computeOrthogonalLinePointsFromBoxes(srcBox, tgtBox);
      newLineData.push({ id: line.obj._id, points });
      editorLine.setPoints(points);
    }

    // 3. Persist to DB (reactive observer will re-apply same values — harmless)
    persistLayoutChanges(diagramId, movedBoxes, newLineData);
    editor.size.recomputeStageBorders();
  },

  ComputeLayout: function (x, y, boxes, lines) {
    let editor = Interpreter.editor;

    let layout_settings = editor.layoutSettings;
    let layoutType = layout_settings.layout;

    let layoutEngine = editor.layoutEngine(layoutType);

    let elements_to_map = {};
    let elements_from_map = {};

    x = x || 0;
    y = y || 0;

    let elements = editor.getElements();
    boxes =
      boxes ||
      _.filter(elements, function (elem) {
        return elem.type === "Box";
      });

    lines =
      lines ||
      _.filter(elements, function (elem) {
        return elem.type === "Line";
      });

    _.each(boxes, function (box, i) {
      let position = box.getElementPosition();

      let width = position.width;
      let height = position.height;
      if (box.compartments) {
        const computed = computeBoxSizeFromCompartments(box._id);
        width = computed.width;
        height = computed.height;
      }

      if (box.name === "HorizontalLine") height = position.height;

      layoutEngine.addBox(i, position.x, position.y, width, height);

      let box_id = box._id;
      if (!_.isNumber(elements_to_map[box_id])) {
        elements_to_map[box_id] = i;
        elements_from_map[i] = box;
      }
    });

    let k = _.size(boxes) + _.size(lines);
    _.each(lines, function (line, j) {
      let i = _.size(boxes) + j;

      /*
			let options = {lineType: "ORTHOGONAL",};
			if (_.isNumber(line.startSides)) {
				_.extend(options, {startSides: line.startSides,});
			}

			if (_.isNumber(line.endSides)) {
				_.extend(options, {endSides: line.endSides,});
			}

			// iespejams ir labaks veids, ka so parbaudit, neizmantojot hard-coded konstanti
			if (layoutType === "INVERSE_VERTICAL") {
        // FIXME: hack: ja līnijai ir teksts, tad tā nav apakšklases (plūsmas) līnija
        // vajadzētu plūsmas pazīmi saņemt jau datos, vai nu no konfigurācijas, vai no import_ontology
				let line_layout_settings = line.layoutSettings;
				console.log("this is line layout settings ", line_layout_settings);


        if (line?.compartments?.compartments[0]?.value?.trim()) {
          options.isFlowEdge = false;
          options.startSides = 10; // sānu malas
          options.endSides = 15;
        } else {
          options.isFlowEdge = true;
          options.startSides = 5; // augša vai apakša
          options.endSides = 5;
        }
      }

			layoutEngine.addLine(i, elements_to_map[line.startElementId], elements_to_map[line.endElementId], options);
*/

      const DEFAULT_LINE_LAYOUT = {
        isFlowEdge: false,
        startSides: 15,
        endSides: 15,
        lineType: "ORTHOGONAL",
      };

      layoutEngine.addLine(
        i,
        elements_to_map[line.startElementId],
        elements_to_map[line.endElementId],
        line.layoutSettings ?? DEFAULT_LINE_LAYOUT,
      );

      let line_id = line._id;
      if (!_.isNumber(elements_to_map[line_id])) {
        elements_to_map[line_id] = i;
        elements_from_map[i] = line;
      }

      if (line.compartments && line.compartments.compartments) {
        _.each(line.compartments.compartments, function (compart) {
          k++;
          let placement = compart.placement;
          layoutEngine.addLineLabel(
            k,
            i,
            placement.width,
            placement.height,
            placement.name,
          );
        });
      }
    });

    // let new_layout = arrangeIncrementally ? layoutEngine.arrangeIncrementally() : layoutEngine.arrangeFromScratch();
    let new_layout = layoutEngine.arrangeFromScratch();
    if (layoutType === "arrangeIncrementally") {
      new_layout = layoutEngine.arrangeIncrementally();
    }

    console.log("the new layout is", new_layout);
    // FIXME: te nekas netiek darīts ar sarēķinātajām iezīmju vietām ( new_layout.labels[] ) !!

    let moved_boxes = _.map(new_layout.boxes, function (box_in, key) {
      let box = elements_from_map[key];
      if (!box) {
        console.error("No box", key, elements_from_map);
        return;
      }
      let box_x = x + box_in.x;
      let box_y = y + box_in.y;

      box.setElementPosition(box_x, box_y);
      box.updateSize(box_in.width, box_in.height);

      return {
        id: box._id,
        position: {
          x: box_x,
          y: box_y,
          width: box_in.width,
          height: box_in.height,
        },
      };
    });

    let new_lines = _.map(new_layout.lines, function (line_in, key) {
      let line_new_points = [];
      _.each(line_in, function (line) {
        line_new_points.push(x + line.x);
        line_new_points.push(y + line.y);
      });

      let line = elements_from_map[key];
      if (!line) {
        console.error("No line", key, elements_from_map);
        return;
      }

      line.setPoints(line_new_points);
      // link.setPoints(line_points);
      // OrthogonalRerouting.recompute(link, state);

      return { id: line._id, points: line_new_points };
    });

    let list = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
      diagramId: Session.get("activeDiagram"),
      lines: new_lines,
      movedBoxes: moved_boxes,
      isLayoutComputationNeededOnLoad: editor.isLayoutComputationNeededOnLoad,
    };

    Utilities.callMeteorMethod("changeCollectionPosition", list, function () {
      editor.size.recomputeStageBorders();
    });
  },
});
