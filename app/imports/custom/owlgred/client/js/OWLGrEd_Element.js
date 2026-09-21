import { Interpreter } from '../../../../client/lib/interpreter'
import { Projects, Diagrams, Elements, ElementTypes, Compartments, CompartmentTypes } from '../../../../db/platform/collections'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'
import { Dialog } from '../../../../platform/client/js/interpretator/Dialog';

async function Create_New_OWLGrEd_Element(location, elementType, isLine, source, target) {
  const activeDiagram = await Diagrams.findOneAsync({_id:Session.get("activeDiagram")});
  const active_diagram_type_id = activeDiagram["diagramTypeId"];

  if (isLine) {
    let elem_type = await ElementTypes.findOneAsync({name:elementType, diagramTypeId:active_diagram_type_id});
    let elem_style = _.find(elem_type.styles, function(style) {
                return style.name === "Default";
    });

    var new_line = {
        projectId: Session.get("activeProject"),
        versionId: Session.get("versionId"),

        diagramId: Session.get("activeDiagram"),
        diagramTypeId: elem_type["diagramTypeId"],
        elementTypeId: elem_type["_id"],

        style: {startShapeStyle: elem_style["startShapeStyle"],
            endShapeStyle: elem_style["endShapeStyle"],
            elementStyle: elem_style["elementStyle"],
            lineType: elem_type["lineType"],
          },

        styleId: elem_style["id"],
        type: "Line",
        points: location,
        startElement: source._id(),
        endElement: target._id(),
      };

      let compartments = Dialog.buildCopartmentDefaultValue(new_line);

      if (_.size(compartments) > 0) {
        new_line.initialCompartments = compartments;
      }

	  const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_line);
	  const vq_obj = await Create_OWLGrEd_Element(elem_id);
	  return vq_obj;
	  // if (func) {
		// func(vq_obj);
	  // }

  } else {
    let elem_type = await ElementTypes.findOneAsync({name:elementType, diagramTypeId:active_diagram_type_id});

	let elem_style = _.find(elem_type.styles, function(style) {
                return style.name === "Default";
    });

    var new_box = {
            projectId: Session.get("activeProject"),
            versionId: Session.get("versionId"),

            diagramId: Session.get("activeDiagram"),
            diagramTypeId: elem_type["diagramTypeId"],
            elementTypeId: elem_type["_id"],
            style: {elementStyle: elem_style["elementStyle"]},
            styleId: elem_style["id"],
            type: "Box",
            location:  location
    };

    let compartments = Dialog.buildCopartmentDefaultValue(new_box);

    if (_.size(compartments) > 0) {
      new_box.initialCompartments = compartments;
    }

	const elem_id = await Utilities.callMeteorMethodAsync("insertElement", new_box);
	const vq_obj = await Create_OWLGrEd_Element(elem_id);
	  return vq_obj;
    // if (func) {
		// func(vq_obj);
	// }
  }

};

var OWLGrEd_Element_cache = {};

async function Create_OWLGrEd_Element(id) {
	if (OWLGrEd_Element_cache[id]) {
		const cached = new OWLGrEd_Element(OWLGrEd_Element_cache[id].obj);
		cached.isVirtualRoot = OWLGrEd_Element_cache[id].isVirtualRoot;
		return cached;
	} else {
		const elem = await Elements.findOneAsync({ _id: id });
		if (!elem) {
			console.error("OWLGrEd element not created");
			return null;
		}
		const instance = new OWLGrEd_Element(elem);
		OWLGrEd_Element_cache[id] = instance;
		return instance;
	}
}


class OWLGrEd_Element{
  constructor(elem) {
		this.obj = elem;
		this.isVirtualRoot = false;
	}

  // --> ajoo object _id used also as OWLGrEd_Element identifier
  _id() { return this.obj["_id"];}
  // OWLGrEd_Element --> bool
  // Determines whether this OWLGrEd_Element is the same as the argument
  isEqualTo(e) {return e ? this.obj["_id"] === e.obj["_id"] : false;}
  // --> string (ajoo diagram id)
   getDiagram_id() {return this.obj["diagramId"];}
  // string --> string
  // Returns the value (INPUT) of the given compartment by name or null if such compartment does not exist
  async getCompartmentValue(compartment_name) {

	if (!this.obj) {
      console.error(this.obj);
      return;
    }
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
	//console.log("compartment_name", compartment_name,comp_type)
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["input"];
      };
    };
    return null;
  }
  // string --> string
  // Returns the value (VALUE) of the given compartment by name or null if such compartment does not exist
  async getCompartmentValueValue(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
      if (comp) {
          return comp["value"];
      };
    };
    return null;
  }
  // string --> [string]
  // Returns the array of values of the given compartment by name or [] if such compartment does not exist
  async getMultiCompartmentValues(compartment_name) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
      var comp_type_id = comp_type["_id"];
      return Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id}).map(function(c){return c["input"];});
    };
    return [];
  }

  async getMultiCompartmentSubCompartmentValues(compartment_name, subcompartment_name_list) {
    var elem_type_id = this.obj["elementTypeId"];
    var comp_type = await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: elem_type_id});
    if (comp_type) {
        var comp_type_id = comp_type["_id"];
        var compartments = Compartments.find({elementId: this._id(), compartmentTypeId: comp_type_id});
        return compartments.map(function(c) {
            var res = { fulltext: c, _id: c };
            if (c.subCompartments) {
                if (c.subCompartments[compartment_name]) {
                    if (c.subCompartments[compartment_name][compartment_name]) {
                        // Handle case when subcompartment_name_list is not provided
                        if (!subcompartment_name_list || subcompartment_name_list.length === 0) {
                            // Use all available subcompartments with title = name
                            for (var sc_name in c.subCompartments[compartment_name][compartment_name]) {
                                if (c.subCompartments[compartment_name][compartment_name].hasOwnProperty(sc_name)) {
                                    res[sc_name] = c.subCompartments[compartment_name][compartment_name][sc_name]["input"];
                                }
                            }
                        } else {
                            // Original handling with subcompartment_name_list
                            _.each(subcompartment_name_list, function(sc_name) {
                                if (c.subCompartments[compartment_name][compartment_name][sc_name.name]) {
                                    var transformer = function(v) { return v };
                                    if (sc_name["transformer"]) {
                                        transformer = sc_name["transformer"];
                                    };
                                    res[sc_name.title] = transformer(
                                        c.subCompartments[compartment_name][compartment_name][sc_name.name]["input"]
                                    );
                                }
                            });
                        }
                    }
                }
            }
            return res;
        })
    };
    return [];
}

  async getElementTypeName() {
		var et = await ElementTypes.findOneAsync({_id:this.obj["elementTypeId"]});
		if (et) {
			return et["name"];
		} else {
			return null;
		}
}

  // --> {start:OWLGrEd_Element, end:OWLGrEd_element}
  // Returns link's start and end OWLGrEd_Elements
  async getElements() {
    return { start: await Create_OWLGrEd_Element(this.obj["startElement"]), end: await Create_OWLGrEd_Element(this.obj["endElement"])};
  }
  // --> OWLGrEd_Element
  // Returns link's start OWLGrEd_Element
  async getStartElement() {
    return await Create_OWLGrEd_Element(this.obj["startElement"]);
  }
   // Re turns link's end VQ_Element
  async getEndElement() {
    return await Create_OWLGrEd_Element(this.obj["endElement"]);
  }

  async getStartLinks(linkType) {
	  const startLinks = await Promise.all(
		Elements.find({ startElement: this.obj["_id"] }).map(async (link) => {
		  return { link: await Create_OWLGrEd_Element(link["_id"]), start: false };
		})
	  );


	  return _.filter(startLinks, async function (linkobj) {
		return await linkobj.link.isLink(linkType);
	  });
  }

  async getEndLinks(linkType) {
	  const endElement = await Promise.all(
		Elements.find({ endElement: this.obj["_id"] }).map(async (link) => {
		  return { link: await Create_OWLGrEd_Element(link["_id"]), start: false };
		})
	  );


	  return _.filter(endElement, async function (linkobj) {
		return await linkobj.link.isLink(linkType);
	  });
  }

  async getLinks(linkType) {
	  if(linkType){
		  const elemType = ElementTypes.findOne({name: linkType});
		  
		  const startLinks = await Promise.all(
			Elements.find({ startElement: this.obj["_id"], elementTypeId:elemType._id }).map(async (link) => {
			  return { link: await Create_OWLGrEd_Element(link["_id"]), start: false };
			})
		  );

		  const endLinks = await Promise.all(
			Elements.find({ endElement: this.obj["_id"], elementTypeId:elemType._id  }).map(async (link) => {
			  return { link: await Create_OWLGrEd_Element(link["_id"]), start: true };
			})
		  );

		  return _.filter(_.union(startLinks, endLinks), async function (linkobj) {
			return await linkobj.link.isLink();
		  });
	  } else{
		  const startLinks = await Promise.all(
			Elements.find({ startElement: this.obj["_id"]}).map(async (link) => {
			  return { link: await Create_OWLGrEd_Element(link["_id"]), start: false };
			})
		  );

		  const endLinks = await Promise.all(
			Elements.find({ endElement: this.obj["_id"]}).map(async (link) => {
			  return { link: await Create_OWLGrEd_Element(link["_id"]), start: true };
			})
		  );

		  return _.filter(_.union(startLinks, endLinks), async function (linkobj) {
			return await linkobj.link.isLink();
		  });
	  }
  }

   async isLink(linkType) {
		return this.getElementTypeName()==linkType;
	}

  // string, bool -->
  // sets comartments visibility
  async setCompartmentVisibility(compartmentName,visible, input, value) {
			var elem_type_id = this.obj["elementTypeId"];
	    var comp_type = await CompartmentTypes.findOneAsync({name: compartmentName, elementTypeId: elem_type_id});
	    if (comp_type) {
	      var comp_type_id = comp_type["_id"];
	      var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
	      if (comp) {
					  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
            a["input"] = input;
						a["value"] = value;
						a["id"] = comp["_id"];
						a["projectId"] = Session.get("activeProject");
			 			a["versionId"] = Session.get("versionId");

			 			await Utilities.callMeteorMethodAsync("updateCompartment", a);
	      };
		};
	}

  //sets compartment value (input and value)
  // string, string, string, bool? -> int (0 ir update failed - no such type, 1 if compartment updated, 3 - compartment inserted)
  // If insert mode is true then new compartment is inserted regardless of existence
  async setCompartmentValue(comp_name, input, value, insertMode) {
	//console.log(" OWLGrEd_element  -----setCompartmentValue------ ")

		if (!this.obj) {
		  console.error(this.obj);
		  return;
		}

		var elem_id = this._id();
		var ct = await CompartmentTypes.findOneAsync({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
			var c = await Compartments.findOneAsync({elementId: elem_id, compartmentTypeId: ct["_id"]});
			if (c && !insertMode) {
				Dialog.updateCompartmentValue(ct, elem_id, input, value, c["_id"]);
				return 1;
			}
			else {
				  //Dialog.updateCompartmentValue(ct, input, value);
          var c_to_create = {
										compartment: {
											projectId: Session.get("activeProject"),
											versionId: Session.get("versionId"),

											diagramId: this.getDiagram_id(),
											diagramTypeId: ct["diagramTypeId"],
											elementTypeId: ct["elementTypeId"],

											compartmentTypeId: ct._id,
											elementId: this._id(),

											index: ct.index,
											input: input,
											value: value,
											isObjectRepresentation: false,

											style: ct.styles[0]["style"],
											styleId: ct.styles[0]["id"],
										},
									};
             await Utilities.callMeteorMethodAsync("insertCompartment", c_to_create);
          return 3;
			};
		};
		return 0;
	}
  // Sets compartment value - value automatically computed depending on input
  // string, string, bool? -->
  async setCompartmentValueAuto(comp_name, input, insertMode) {
    var ct =  await CompartmentTypes.findOneAsync({name: comp_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
        var value = "";
        var mapped_value = undefined;
        if (ct["inputType"]["type"] === "checkbox") {
            mapped_value = _.find(ct["inputType"]["values"], function(s) { return input === s["input"]})["value"];
        };
        if (ct["inputType"]["type"] === "radio") {
            mapped_value = _.find(ct["inputType"]["values"], function(s) { return input === s["input"]})["value"];
        };
        value = Dialog.buildCompartmentValue(ct,  input, mapped_value);
        await this.setCompartmentValue(comp_name, input, value, insertMode);
    }
  }
  // adds comparment with subcompartments
  // string, [{name: string, value:string, transformer: function}]
  async addCompartmentSubCompartments2(compartment_name, subcompartment_value_list) {
    var ct =  await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
		let prefix = ct["prefix"] || "";
		let sufix = ct["suffix"] || "";
      var c_to_create = {
                compartment: {
                  projectId: Session.get("activeProject"),
                  versionId: Session.get("versionId"),

                  diagramId: this.getDiagram_id(),
                  diagramTypeId: ct["diagramTypeId"],
                  elementTypeId: ct["elementTypeId"],

                  compartmentTypeId: ct._id,
                  elementId: this._id(),

                  index: ct.index,
                //???  input: input,
                //???  value: value,
                  subCompartments: {},
                  isObjectRepresentation: false,

                  style: ct.styles[0]["style"],
                  styleId: ct.styles[0]["id"],
                },
              };
      c_to_create["compartment"]["subCompartments"][compartment_name] = {};
      c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name] = {};

      if (ct.inputType.type === "custom") {
      // if (ct.inputType.type === "custom" && ct.inputType.templateName === "multiField") {
           var ct_comparts_indexes = Compartments.find({compartmentTypeId: ct._id, elementId: this._id()}, {sort: {index: 1}})
                                    .map(function(c) {return c.index; });
          // search for hole in the array of indexes
           for (var idx of ct_comparts_indexes) {
             if (idx > c_to_create.compartment.index) { break; };
             c_to_create.compartment.index += 1;
           }
		  }

      var sorted_sub_compart_types = _.sortBy(ct["subCompartmentTypes"][0]["subCompartmentTypes"], function(sct) {return sct.index} );
      var value_array = [];

      _.each(sorted_sub_compart_types, function(sub_c) {
         c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};
        var sc_value = "";
        // var sc = _.find(subcompartment_value_list, function(s) {return s.name === sub_c.name});
        const sc = _.find(subcompartment_value_list, s => s.name === sub_c.name);

// Check for nested subCompartments
		if (sc) {
		  if (sc.subCompartments && Array.isArray(sc.subCompartments)) {
			// Nested subCompartments case (like "Keys")
			const nested_sorted = _.sortBy(sub_c.subCompartmentTypes, sct => sct.index);
			c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name] = {};

			const value_parts = [];

			nested_sorted.forEach(nested_sub => {
			  const nested_value = _.find(sc.subCompartments, ns => ns.name === nested_sub.name);
			  if (nested_value) {
				const transformer = nested_value.transformer || (v => v);
				let mapped_value;

				if (nested_sub.inputType.type === "checkbox") {
				  mapped_value = _.find(nested_sub.inputType.values, s => transformer(nested_value.value) === s.input)?.value;
				}
				if (typeof nested_value.input !== "undefined") mapped_value = nested_value.input;

				const built = Dialog.buildCompartmentValue(nested_sub, transformer(nested_value.value), mapped_value);

				c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name][nested_sub.name] = {
				  input: transformer(nested_value.value),
				  value: built
				};

				if (built) {
				  value_parts.push(built);
				  value_parts.push(ct.concatStyle);
				}
			  }
			});

			if (value_parts.length) {
			  value_parts.pop();
			  const joined = value_parts.join("");
			  c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name]["value"] = joined;
			  c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name]["input"] = joined;
			  value_array.push(joined);
			  value_array.push(ct.concatStyle);
			}

		  } else if (sc.name && sc.value) {
			// Flat subCompartment (existing behavior)
			const transformer = sc.transformer || (v => v);
			let mapped_value;

			if (sub_c.inputType.type === "checkbox") {
			  mapped_value = _.find(sub_c.inputType.values, s => transformer(sc.value) === s.input)?.value;
			}
			if (typeof sc.input !== "undefined") mapped_value = sc.input;

			const sc_value = Dialog.buildCompartmentValue(sub_c, transformer(sc.value), mapped_value);
			c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name] = {
			  input: transformer(sc.value),
			  value: sc_value
			};

			if (sc_value) {
			  value_array.push(sc_value);
			  value_array.push(ct.concatStyle);
			}
		  }
		} else {
          // THIS probably doesn't work
          sc_value = Dialog.buildCompartmentValue(sub_c);
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["input"] = sc_value;
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["value"] = sc_value;
        };

        if (sc_value) {
          value_array.push(sc_value);
          value_array.push(ct["concatStyle"])
        };
      });
      value_array.pop();

      c_to_create["compartment"]["value"] = value_array.join("");
      c_to_create["compartment"]["input"] = c_to_create["compartment"]["value"];
	  c_to_create["compartment"]["value"] = value_array.join("");
	  if(!c_to_create["compartment"]["value"].startsWith(prefix)) c_to_create["compartment"]["value"] = prefix + c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].endsWith(sufix)) c_to_create["compartment"]["value"] = c_to_create["compartment"]["value"] + sufix;
	  // c_to_create["compartment"]["value"] = prefix + value_array.join("") + sufix;

	  await Utilities.callMeteorMethodAsync("insertCompartment", c_to_create);
    };
  }

  async addCompartmentSubCompartments(compartment_name, subcompartment_value_list) {
    var ct =  await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: this.obj["elementTypeId"]});
		if (ct) {
		let prefix = ct["prefix"] || "";
		let sufix = ct["sufix"] || "";
      var c_to_create = {
                compartment: {
                  projectId: Session.get("activeProject"),
                  versionId: Session.get("versionId"),

                  diagramId: this.getDiagram_id(),
                  diagramTypeId: ct["diagramTypeId"],
                  elementTypeId: ct["elementTypeId"],

                  compartmentTypeId: ct._id,
                  elementId: this._id(),

                  index: ct.index,
                //???  input: input,
                //???  value: value,
                  subCompartments: {},
                  isObjectRepresentation: false,

                  style: ct.styles[0]["style"],
                  styleId: ct.styles[0]["id"],
                },
              };
      c_to_create["compartment"]["subCompartments"][compartment_name] = {};
      c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name] = {};

      if (ct.inputType.type === "custom") {
      // if (ct.inputType.type === "custom" && ct.inputType.templateName === "multiField") {
           var ct_comparts_indexes = Compartments.find({compartmentTypeId: ct._id, elementId: this._id()}, {sort: {index: 1}})
                                    .map(function(c) {return c.index; });
          // search for hole in the array of indexes
           for (var idx of ct_comparts_indexes) {
             if (idx > c_to_create.compartment.index) { break; };
             c_to_create.compartment.index += 1;
           }
		  }

      var sorted_sub_compart_types = _.sortBy(ct["subCompartmentTypes"][0]["subCompartmentTypes"], function(sct) {return sct.index} );
      var value_array = [];
	  let delimiter = "";
      for (let sub_c of sorted_sub_compart_types) {



        let sc_value = "";
        // const sc = subcompartment_value_list.find(s => s.name === sub_c.name);
		const scList = subcompartment_value_list.filter(s => s.name === sub_c.name);
		// console.log("sub_c.name", sub_c.name, sub_c, scList)
		if (scList.length > 1 && typeof sub_c["subCompartmentTypes"] !== "undefined") {
			c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name] = [];
		} else c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};
		for (let i = 0; i < scList.length; i++) {
			let sub_compartment
			if (scList.length > 1 && typeof sub_c["subCompartmentTypes"] !== "undefined") {
				let name_sub_com = sub_c.name;
				let o = {};
				o[name_sub_com] = {};
				c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name].push(o);
				sub_compartment = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name].at(-1);
				sub_compartment = sub_compartment[name_sub_com];
			}else {
				c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};
				sub_compartment = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name];
			}

			let sc = scList[i];
			if (sc) {
				if(typeof sc.delimiter !== "undefined") delimiter = sc.delimiter;
				 var sorted_sub_sub_compart_types = _.sortBy(sub_c["subCompartmentTypes"], function(sct) {return sct.index} );

				  for (let sub_sub_c of sorted_sub_sub_compart_types) {
					   sub_compartment[sub_sub_c.name] = {};
					   const scc = sc["subCompartments"].find(s => s.name === sub_sub_c.name);

					   if (scc.name && scc.value) {
						const transformer = scc.transformer || (v => v);

						let mapped_value = undefined;
						if (sub_c["inputType"]["type"] === "checkbox") {
						  const matched = sub_c["inputType"]["values"].find(s => transformer(scc.value) === s["input"]);
						  if (matched) {
							mapped_value = matched["value"];
						  }
						}

						if (typeof scc.input !== "undefined") {
						  mapped_value = scc.input;
						}

						let sc_value = Dialog.buildCompartmentValue(sub_c, transformer(scc.value), mapped_value);

						const target = sub_compartment[sub_sub_c.name];
						target["input"] = transformer(scc.value);
						target["value"] = sc_value;
						value_array.push(sc_value);
					  }

				  }

				// console.log("c_to_create", c_to_create)

				if (scList.length <= 1 && typeof sub_c["subCompartmentTypes"] === "undefined"){
				  if (sc.name && sc.value) {
					const transformer = sc.transformer || (v => v);

					let mapped_value = undefined;
					if (sub_c["inputType"]["type"] === "checkbox") {
					  const matched = sub_c["inputType"]["values"].find(s => transformer(sc.value) === s["input"]);
					  if (matched) {
						mapped_value = matched["value"];
					  }
					}

					if (typeof sc.input !== "undefined") {
					  mapped_value = sc.input;
					}

					sc_value = Dialog.buildCompartmentValue(sub_c, transformer(sc.value), mapped_value);

					const target = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sc.name];
					target["input"] = transformer(sc.value);
					target["value"] = sc_value;

				  }
				}
			} else {
			  // THIS probably doesn't work
			  sc_value = Dialog.buildCompartmentValue(sub_c);
			  const target = c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name];
			  target["input"] = sc_value;
			  target["value"] = sc_value;
			}
		}
        if (sc_value) {
          value_array.push(sc_value);
          value_array.push(ct["concatStyle"]);
        }
      }

	  // value_array.pop();
	  value_array = value_array.filter(item => item.trim() !== "");

      c_to_create["compartment"]["value"] = value_array.join(delimiter);
      c_to_create["compartment"]["input"] = c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].startsWith(prefix)) c_to_create["compartment"]["value"] = prefix + c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].endsWith(sufix)) c_to_create["compartment"]["value"] = c_to_create["compartment"]["value"] + sufix;
	  // c_to_create["compartment"]["value"] = prefix + value_array.join("") + sufix;

	  await Utilities.callMeteorMethodAsync("insertCompartment", c_to_create);
    };
  }
  // sets style
  // Style_attr is an object, e.g., {attrName:"startShapeStyle.shape",attrValue:"Circle"}
  // Should provide a list of style_attrs
  async setCustomStyle(style_attr_list) {
		// console.log(style_attr_list);
		const element_id = this._id();
		const diagram_id = this.getDiagram_id();

		for (const a of style_attr_list) {
			a["elementId"] = element_id;
			a["diagramId"] = diagram_id;
			a["projectId"] = Session.get("activeProject");
			a["versionId"] = Session.get("versionId");
			a["styleId"] = "custom";

			await Utilities.callMeteorMethodAsync("updateElementStyle", a);
		}
	}

  async setHorizontalLine(compartment_name){
	  var comp_type =  await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: this.obj["elementTypeId"]});
		if (comp_type) {
			  var comp_type_id = comp_type["_id"];
			  var comp = await Compartments.findOneAsync({elementId: this._id(), compartmentTypeId: comp_type_id});
			  if (comp) {
				  let visible = true
				  var a = { "compartmentStyleUpdate": {"style.visible":visible}};
					a["input"] = " ";
					a["value"] = " ";
					a["id"] = comp["_id"];
					a["projectId"] = Session.get("activeProject");
					a["versionId"] = Session.get("versionId");
					Utilities.callMeteorMethod("updateCompartment", a);
			  };
	 };
  }


  //Read coordinates and size of box
  async getCoordinates(){
  	var element_id = this._id();
  	var element = await Elements.findOneAsync({_id: element_id});
	var x = element["location"]["x"];
	var y = element["location"]["y"];
	var w = element["location"]["width"];
	var h = element["location"]["height"];
  	return {x: x, y: y, width: w, height: h}
  }
	// Temporal solution: Put new element below target element, as close as possible without overlapping
	// d - step to move below after each try
	// Returns {x: x, y: y1, width: w, height: h} (the left upper corner + dimensions)
   async getNewLocation (d = 30) {
	    //console.log(this);
	    var boxCoord = await this.getCoordinates();
	    var x = boxCoord["x"];
	    var y = boxCoord["y"];
	    var w = boxCoord["width"];
	    var h = boxCoord["height"];
	    //y1 - coordinate for a new element; 1st itteration
	    var y1 = y + h + d;

	    var elem_list = [];
	    var elem_over = []; //Potentionally - for more complex search for a better place
	    var max_y;

	    Elements.find({type: "Box"}).forEach(function(el) {
	        elem_list.push(el);
	    })

	    do{
	        elem_over.length = 0;

	        _.each(elem_list, function(el) {
	            //Check, if start point of new element could lead to overlap with existing elements
	            if (el["location"]["x"] < (x+w)){
	                if (el["location"]["y"] < (y1+h)){
	                    //Check, if end point of existing element could lead to overlap
	                    if((el["location"]["x"]+el["location"]["width"]) > x){
	                        if((el["location"]["y"])+el["location"]["height"] > y1){
	                            elem_over.push({
	                                _id: el["_id"],
	                                x: el["location"]["x"],
	                                y: el["location"]["y"],
	                                w: el["location"]["width"],
	                                h: el["location"]["height"]
	                            });
	                        }
	                    }
	                }
	            }
	        })
	        // If any disturbing element exist, find the lowest one (max y) and try new space that is lower by d
	        if (elem_over.length > 0){
	            max_y = 0;

	            _.each(elem_over, function(el){
	                if (max_y < (el["y"]+el["h"])) {
	                    max_y = el["y"]+el["h"];
	                }
	            })

	            y1 = max_y + d;
	        }
	    } while (elem_over.length > 0);

	    return {x: x, y: y1, width: w, height: h};
	}


    deleteElement(){
    	// elements: array of IDs; elementNames: empty or array of IDs (for logs)
    	Interpreter.extensionPoints.DeleteElementsCollection({elements: [this.obj["_id"]], elementNames: [this.obj["_id"]], diagramId: Session.get("activeDiagram"), versionId: Session.get("versionId")});
    }

}

export {
  OWLGrEd_Element,
  Create_New_OWLGrEd_Element,
  Create_OWLGrEd_Element,
}
