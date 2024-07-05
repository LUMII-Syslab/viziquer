import { DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'

let ontology1 = {
  Gen: {
    c_10_c_7_10: {
      compartments: {
        Val: " "
      },
      source: "c_7_10",
      target: "c_10"
    },
    c_16_c_6: {
      compartments: {
        Val: " "
      },
      source: "c_6",
      target: "c_16"
    },
    c_2_c_6: {
      compartments: {
        Val: " "
      },
      source: "c_6",
      target: "c_2"
    },
    c_4_c_5: {
      compartments: {
        Val: " "
      },
      source: "c_5",
      target: "c_4"
    },
    c_7_c_7_10: {
      compartments: {
        Val: " "
      },
      source: "c_7_10",
      target: "c_7"
    },
    c_8_c_5: {
      compartments: {
        Val: " "
      },
      source: "c_5",
      target: "c_8"
    }
  },
  Line3: {
    c_16_c_1: {
      compartments: {
        A: "dbo:affiliation (797)/797 [*] DR",
        name: "c_16_c_1"
      },
      source: "c_16",
      target: "c_1"
    },
    c_16_c_7_10: {
      compartments: {
        A: "dbo:birthPlace (2004)/2004 [*] DR\\ndbo:deathPlace (1308)/1308 [*] DR",
        name: "c_16_c_7_10"
      },
      source: "c_16",
      target: "c_7_10"
    },
    c_1_c_10: {
      compartments: {
        A: "dbo:country (345)/345 [*] DR",
        name: "c_1_c_10"
      },
      source: "c_1",
      target: "c_10"
    },
    c_1_c_7: {
      compartments: {
        A: "dbo:city (338)/338 [1] DR",
        name: "c_1_c_7"
      },
      source: "c_1",
      target: "c_7"
    },
    c_2_c_7_10: {
      compartments: {
        A: "schema_s:foundingLocation (44)/44 [*] DR",
        name: "c_2_c_7_10"
      },
      source: "c_2",
      target: "c_7_10"
    },
    c_4_c_1: {
      compartments: {
        A: "nobel:university (799)/799 [*] DR",
        name: "c_4_c_1"
      },
      source: "c_4",
      target: "c_1"
    },
    c_4_c_8: {
      compartments: {
        A: "dct:isPartOf (982)/984 [1] D",
        name: "c_4_c_8"
      },
      source: "c_4",
      target: "c_8"
    },
    c_5_c_6: {
      compartments: {
        A: "nobel:laureate (1966)/1966 [*] DR",
        name: "c_5_c_6"
      },
      source: "c_5",
      target: "c_6"
    },
    c_6_c_4: {
      compartments: {
        A: "nobel:laureateAward (984)/984 [*] DR",
        name: "c_6_c_4"
      },
      source: "c_6",
      target: "c_4"
    },
    c_6_c_8: {
      compartments: {
        A: "nobel:nobelPrize (982)/984 [*] D",
        name: "c_6_c_8"
      },
      source: "c_6",
      target: "c_8"
    },
    c_8_c_4: {
      compartments: {
        A: "dct:hasPart (982)/982 [*] DR",
        name: "c_8_c_4"
      },
      source: "c_8",
      target: "c_4"
    }
  },
  SH: {
    c_1: {
      compartments: {
        A4: "rdfs:label (1023) [*]  ",
        A6: "",
        Type: "Class",
        name: "dbo:University (341)"
      }
    },
    c_10: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "dbo:Country (127)"
      }
    },
    c_16: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "foaf:Person (949)"
      }
    },
    c_2: {
      compartments: {
        A4: "dct:created (26) [1] D \\nfoaf:name (75) [*]  \\nrdfs:label (26) [*]  \\nschema_s:foundingDate (26) [1] D ",
        A6: "",
        Type: "Class",
        name: "foaf:Organization (27)"
      }
    },
    c_4: {
      compartments: {
        A4: "nobel:category (984) [1] D -> IRI\\nnobel:motivation (1957) [*] D \\nnobel:share (984) [1] D \\nnobel:sortOrder (984) [1] D \\nnobel:year (984) [1] D \\nrdfs:label (2952) [*]  ",
        A6: "",
        Type: "Class",
        name: "nobel:LaureateAward (984)"
      }
    },
    c_5: {
      compartments: {
        A4: "nobel:categoryOrder (612) [1] D ",
        A6: "",
        Type: "Class",
        name: "dbo:Award (1.60K)"
      }
    },
    c_6: {
      compartments: {
        A4: "dbp:dateOfBirth (949) [1] D \\ndbp:dateOfDeath (650) [1] D \\nfoaf:birthday (949) [1] D \\nfoaf:familyName (947) [1] D \\nfoaf:gender (949) [1] D \\nfoaf:givenName (949) [1] D ",
        A6: "",
        Type: "Class",
        name: "nobel:Laureate (976)"
      }
    },
    c_7: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "dbo:City (951)"
      }
    },
    c_7_10: {
      compartments: {
        A4: "rdfs:label (3234) [*]  ",
        A6: "",
        Type: "Abstract",
        name: "dbo:City or dbo:Country"
      }
    },
    c_8: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "nobel:NobelPrize (612)"
      }
    }
  }
}


let ontology2 = {
    "SH": {
        "c_2": {
            "compartments": {
                "name": "w:Video (27)",
                "A4": "rdf:type (27) [*]  -> IRI\nschema:contentUrl (27) [*]  -> IRI\nskos:prefLabel (27) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_4": {
            "compartments": {
                "name": "w:Wounding (7842)",
                "A4": "dct:description (2) [*]  \ns_events:related_period (1) [*]  -> w:Conflict\nw_actors:hasPlace (73) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_5": {
            "compartments": {
                "name": "w:Dissolution (7701)",
                "A4": "crm:P3_has_note (1) [*]  \ncrm:P4_has_time-span (7702) [*]  -> IRI\ncrm:P7_took_place_at (26) [*]  ->IRI(3)\ndct:source (7701) [*]  -> w:Source\nrdf:type (7701) [*]  -> IRI\nskos:prefLabel (7701) [*]  \nw_actors:comment (35) [*]  \nw_actors:number (35) [1]  \nw_actors:placed_at (1) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_7": {
            "compartments": {
                "name": "w:TroopMovement (684)",
                "A4": "crm:P11_had_participant (71) [*]  ->IRI(2)\ncrm:P4_has_time-span (670) [*]  -> IRI\ncrm:P7_took_place_at (657) [*]  ->IRI(5)\ndct:source (684) [*]  -> w:Source\nrdf:type (684) [*]  -> IRI\nskos:prefLabel (684) [*]  \nw_actors:comment (52) [*]  \nw_actors:number (52) [1]  \nw_actors:placed_at (601) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_9": {
            "compartments": {
                "name": "w:Group (203)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_11": {
            "compartments": {
                "name": "w:Disappearing (5292)",
                "A4": "w_actors:hasPlace (49) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_12": {
            "compartments": {
                "name": "G101",
                "A4": "",
                "A6": "<- crm:P7_took_place_at IRI(*)",
                "A5": "w:Body_of_water (5554)\nw:Man-made_feature (1.4e4)",
                "Type": "Sub"
            }
        },
        "c_15": {
            "compartments": {
                "name": "w:Rank (206)",
                "A4": "dct:description (244) [*]  \ndct:isPartOf (171) [*] D <> w:Rank\nfoaf:page (166) [*]  -> IRI\nmuninn_org:equalTo (106) [1] D <> w:Rank\nmuninn_org:rankSeniorTo (42) [*] D <> w:Rank\nowl:sameAs (35) [*]  -> IRI\nrdf:type (206) [*]  -> IRI\nrdfs:comment (25) [*]  \ns_actors:level (130) [1] D \nskos:altLabel (132) [*]  \nskos:prefLabel (304) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_16": {
            "compartments": {
                "name": "w:UnitNaming (3250)",
                "A4": "crm:P11_had_participant (3250) [*]  ->IRI(2)\ncrm:P4_has_time-span (212) [*]  -> IRI\ncrm:P7_took_place_at (129) [*]  ->IRI(4)\ndct:source (3325) [*]  -> w:Source\nfoaf:page (1) [*]  -> IRI\nrdf:type (3253) [*]  -> IRI\nskos:altLabel (3161) [*]  \nskos:prefLabel (3268) [*]  \nw_actors:hasPlace (3) [*]  \nw_actors:placed_at (16) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_17": {
            "compartments": {
                "name": "w:Medal (200)",
                "A4": "dct:description (4) [*]  \nfoaf:page (2) [*]  -> IRI\nowl:same (1) [1] D <> w:Medal\nrdf:type (200) [*]  -> IRI\nskos:altLabel (89) [*]  \nskos:prefLabel (200) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_20": {
            "compartments": {
                "name": "G102",
                "A4": "dct:description (171) [*]  \ns_events:related_period (154) [*]  -> w:Conflict\nskos:related (91) [*]  -> IRI",
                "A6": "",
                "A5": "w:Bombardment (78)\nw:Event (154)\nw:MilitaryActivity (567)\nw:PoliticalActivity (231)",
                "Type": "Sub"
            }
        },
        "c_22": {
            "compartments": {
                "name": "w:Death (9.9e4)",
                "A4": "crm:P11_had_participant (29) [*]  ->IRI(2)\ncrm:P4_has_time-span (9.9e4) [*]  -> IRI\ncrm:P7_took_place_at (4.5e4) [*]  ->IRI(5)\ndct:description (18) [*]  \ndct:source (9.9e4) [*]  -> w:Source\nnarc:menehtymisluokka (604) [1] D -> IRI\nrdf:type (9.9e4) [*]  -> IRI\ns_events:related_period (16) [*]  -> w:Conflict\nskos:prefLabel (2.0e5) [*]  \nw_actors:hasPlace (1006) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_24": {
            "compartments": {
                "name": "w:MaritalStatus (5)",
                "A4": "rdf:type (5) [*]  -> IRI\nskos:prefLabel (10) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_25": {
            "compartments": {
                "name": "w:Village (1551)",
                "A4": "skos:altLabel (2) [*]  ",
                "A6": "<- crm:P7_took_place_at IRI(16)",
                "Type": "Class"
            }
        },
        "c_29": {
            "compartments": {
                "name": "w:PersonJoining (9.3e4)",
                "A4": "crm:P107_1_kind_of_member (849) [1] D \ncrm:P4_has_time-span (717) [*]  -> IRI\ndct:description (394) [*]  \ndct:source (9.3e4) [*]  -> w:Source\nrdf:type (9.3e4) [*]  -> IRI\ns_actors:hasUnit (557) [*]  \nskos:prefLabel (1.8e5) [*]  \nw_actors:hasTime (163) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_30": {
            "compartments": {
                "name": "w:WarDiary (2.6e4)",
                "A4": "crm:P4_has_time-span (2.6e4) [*]  -> IRI\ndct:hasFormat (2.6e4) [*]  \nrdf:type (2.6e4) [*]  -> IRI\nskos:prefLabel (2.6e4) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_32": {
            "compartments": {
                "name": "w:PerishingCategory (7)",
                "A4": "rdf:type (7) [*]  -> IRI\nskos:prefLabel (14) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_33": {
            "compartments": {
                "name": "w:Source (2546)",
                "A4": "rdf:type (2546) [*]  -> IRI\ns_prisoners:location (28) [*]  -> IRI\nskos:prefLabel (2571) [*]  ",
                "A6": "<- dct:source IRI(31)",
                "Type": "Class"
            }
        },
        "c_35": {
            "compartments": {
                "name": "w:Conflict (4)",
                "A4": "crm:P10_falls_within (3) [1]  <> w:Conflict\ncrm:P4_has_time-span (4) [*]  -> IRI\nrdf:type (4) [*]  -> IRI\nskos:prefLabel (8) [*]  ",
                "A6": "<- s_events:related_period IRI(9)",
                "Type": "Class"
            }
        },
        "c_36": {
            "compartments": {
                "name": "w:PowCamp (120)",
                "A4": "s_prisoners:captivity_location (120) [1] D \ns_prisoners:time_of_operation (67) [*] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_40": {
            "compartments": {
                "name": "w:PrisonerRecord (4200)",
                "A4": "s_prisoners:additional_information (2539) [*] D \ns_prisoners:captivity (1.1e4) [*] D -> IRI\ns_prisoners:cause_of_death (716) [*] D \ns_prisoners:confiscated_possession (197) [1] D \ns_prisoners:date_of_capture (4472) [*] D \ns_prisoners:date_of_death (4166) [*] D \ns_prisoners:date_of_declaration_of_death (263) [1] D \ns_prisoners:date_of_going_mia (1622) [*] D \ns_prisoners:date_of_return (2748) [*] D \ns_prisoners:description_of_capture (6594) [*] D \ns_prisoners:finnish_return_interrogation_file (730) [1] D \ns_prisoners:flyer (646) [*] D \ns_prisoners:hide_documents (2930) [1] D \ns_prisoners:karaganda_card_file (222) [1] D \ns_prisoners:karelian_archive_documents (12) [1] D \ns_prisoners:memoir (687) [*] D \ns_prisoners:municipality_of_capture (3082) [*] D -> IRI\ns_prisoners:municipality_of_capture_literal (3673) [*] D \ns_prisoners:municipality_of_death (2192) [*] D -> IRI\ns_prisoners:municipality_of_death_literal (2595) [1] D \ns_prisoners:municipality_of_domicile (3908) [*] D -> IRI\ns_prisoners:municipality_of_domicile_literal (3996) [*] D \ns_prisoners:municipality_of_residence (4006) [*] D -> IRI\ns_prisoners:municipality_of_residence_literal (4118) [*] D \ns_prisoners:number_of_children (3403) [*] D \ns_prisoners:occupation_literal (5436) [*] D \ns_prisoners:original_name (4009) [1] D \ns_prisoners:personal_information_removed (191) [1] D \ns_prisoners:photograph (603) [*] D \ns_prisoners:place_of_burial_literal (502) [*] D \ns_prisoners:place_of_capture_battle_literal (1806) [*] D \ns_prisoners:place_of_capture_literal (2145) [*] D \ns_prisoners:place_of_death (776) [*] D \ns_prisoners:place_of_going_mia_literal (1519) [*] D \ns_prisoners:propaganda_magazine (211) [*] D \ns_prisoners:propaganda_magazine_link (188) [*] D -> IRI\ns_prisoners:radio_report (866) [*] D \ns_prisoners:rank_literal (4373) [*] D \ns_prisoners:recording (27) [1] D \ns_prisoners:sotilaan_aani (2060) [*] D \ns_prisoners:soviet_card_files (5707) [*] D \ns_prisoners:unit_literal (4109) [1] D \ns_prisoners:winter_war_collection (78) [*] D \nw:municipality_of_birth (3915) [*] D -> IRI\nw:municipality_of_birth_literal (4059) [*] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_41": {
            "compartments": {
                "name": "w:MilitaryUnit (1.6e4)",
                "A4": "crm:P3_has_note (208) [*]  \ncrm:P7_took_place_at (129) [*]  ->IRI(4)\nowl:differentFrom (1018) [*]  <> w:MilitaryUnit\ns_actors:comment (1) [1]  \nw_actors:comment (329) [*]  \nw_actors:covernumber (2) [*] D \nw_actors:foundation (895) [*] D \nw_actors:hasCommander (299) [*] D \nw_actors:hasPlace (1) [*]  \nw_actors:hasUnitCategory (1) [1] D -> IRI\nw_actors:hasUpperUnit (77) [1]  <> w:MilitaryUnit",
                "A6": "<- crm:P11_had_participant IRI(8)",
                "Type": "Class"
            }
        },
        "c_42": {
            "compartments": {
                "name": "w:MotherTongue (11)",
                "A4": "rdf:type (11) [*]  -> IRI\nskos:prefLabel (22) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_44": {
            "compartments": {
                "name": "w:Photograph (1.7e5)",
                "A4": "crm:P138i_has_representation (5.0e5) [*] D -> IRI\ncrm:P1_is_identified_by (1.6e5) [1] D \ncrm:P3_has_note (2.2e4) [*]  \ndct:created (1.2e5) [1] D \ndct:description (1.6e5) [*]  \ndct:source (1.7e5) [*]  -> w:Source\nrdf:type (1.7e5) [*]  -> IRI\ns_photos:is_color (1.6e5) [1] D \ns_photos:photographer_string (1.3e5) [1] D \ns_photos:place_String (1) [1] D \ns_photos:place_string (1.4e5) [1] D \ns_photos:theme (1.0e5) [1] D \nskos:hiddenLabel (1.8e5) [*]  \nskos:prefLabel (1.6e5) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_45": {
            "compartments": {
                "name": "w:MedalAwarding (6086)",
                "A4": "crm:P11_had_participant (6086) [*]  -> w:Person\ncrm:P4_has_time-span (532) [*]  -> IRI\ndct:source (5892) [*]  -> w:Source\nrdf:type (6086) [*]  -> IRI\nskos:prefLabel (6086) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_48": {
            "compartments": {
                "name": "w:Formation (1.3e4)",
                "A4": "crm:P11_had_participant (4) [*]  ->IRI(2)\ncrm:P3_has_note (1) [*]  \ncrm:P4_has_time-span (8567) [*]  -> IRI\ncrm:P7_took_place_at (1837) [*]  ->IRI(5)\ndct:description (4) [*]  \ndct:source (8611) [*]  -> w:Source\nrdf:type (1.3e4) [*]  -> IRI\nskos:altLabel (1.2e4) [*]  \nskos:prefLabel (1.4e4) [*]  \nw_actors:hasPlace (126) [*]  \nw_actors:placed_at (868) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_53": {
            "compartments": {
                "name": "w:Gender (3)",
                "A4": "rdf:type (3) [*]  -> IRI\nskos:prefLabel (6) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_55": {
            "compartments": {
                "name": "w:Article (3357)",
                "A4": "dc:title (3357) [1] D \ndct:hasFormat (3357) [*]  -> IRI\nrdf:type (3357) [*]  -> IRI\nrdfs:comment (1489) [*]  \ns_articles:arms_of_service (3357) [1] D -> IRI\ns_articles:author (3358) [*] D -> IRI\ns_articles:event (2828 0%d) [*] D -> IRI\ns_articles:issue (3357) [1] D -> IRI\ns_articles:mentionsGeneral (3381) [*] D -> IRI\ns_articles:mentionsWar (1193) [*] D -> IRI\ns_articles:page (3357) [1] D \ns_articles:place (3854) [*] D -> IRI\ns_articles:unit (3357) [1] D -> IRI\ns_articles:volume (3357) [1] D -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_61": {
            "compartments": {
                "name": "w:Person (1.0e5)",
                "A4": "biocrm:has_family_relation (2) [1] D -> IRI\nbiocrm:has_occupation (9.1e4) [*]  -> IRI\ncrm:P3_has_note (312) [*]  \ndct:description (2985) [*]  \ndct:source (1.1e5) [*]  -> w:Source\nfoaf:familyName (1.0e5) [*]  \nfoaf:firstName (1.0e5) [*]  \nfoaf:givenName (9.4e4) [1] D \nfoaf:page (2759) [*]  -> IRI\nowl:differentFrom (2) [*]  <> w:Person\nowl:sameAs (1098) [*]  <> w:Person\nrdf:type (1.0e5) [*]  -> IRI\ns_actors:genicom (9348) [1]  -> IRI\ns_actors:genitree (9348) [1]  -> IRI\ns_actors:hasEvent (27) [*] D \ns_actors:hasRank (218) [*]  -> IRI\ns_actors:hasTitle (656) [*] D \ns_actors:hasType (855) [1] D \ns_actors:hasUnit (17) [*]  \ns_actors:knight (191) [1] D \nskos:altLabel (29) [*]  \nskos:prefLabel (1.0e5) [*]  ",
                "A6": "<- crm:P11_had_participant IRI(14)",
                "Type": "Class"
            }
        },
        "c_63": {
            "compartments": {
                "name": "w:Cemetery (672)",
                "A4": "dct:source (1230) [*]  -> w:Source\ngeo:lat (614) [*]  \ngeo:long (614) [*]  \nrdf:type (672) [*]  -> IRI\ns_cemeteries:address (614) [1] D \ns_cemeteries:architect (238) [1] D \ns_cemeteries:camera_club (612) [1] D \ns_cemeteries:cemetery_id (615) [1] D \ns_cemeteries:cemetery_type (615) [1] D \ns_cemeteries:current_municipality (615) [1] D \ns_cemeteries:date_of_foundation (246) [1] D \ns_cemeteries:former_municipality (191) [1] D \ns_cemeteries:memorial (302) [1] D \ns_cemeteries:memorial_sculptor (531) [1] D \ns_cemeteries:memorial_unveiling_date (513) [1] D \ns_cemeteries:number_of_graves (581) [1] D \nskos:altLabel (502) [*]  \nskos:prefLabel (672) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_66": {
            "compartments": {
                "name": "w:Town (50)",
                "A4": "dct:source (50) [*]  -> w:Source\ngeo:lat (50) [*]  \ngeo:long (50) [*]  \ngeosparql:sfWithin (44) [*]  -> IRI\nrdf:type (50) [*]  -> IRI\nskos:prefLabel (50) [*]  ",
                "A6": "<- crm:P7_took_place_at IRI(12)",
                "Type": "Class"
            }
        },
        "c_67": {
            "compartments": {
                "name": "w:Hypsographic_feature (1.1e4)",
                "A4": "crm:P3_has_note (2) [*]  \nskos:altLabel (2) [*]  ",
                "A6": "<- crm:P7_took_place_at IRI(14)",
                "Type": "Class"
            }
        },
        "c_68": {
            "compartments": {
                "name": "w:UnitJoining (9422)",
                "A4": "crm:P3_has_note (1) [*]  \ncrm:P4_has_time-span (21) [*]  -> IRI\ndct:description (21) [*]  \ndct:source (6610) [*]  -> w:Source\nrdf:type (9422) [*]  -> IRI\nskos:prefLabel (6370) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_69": {
            "compartments": {
                "name": "w:Photography (1.2e5)",
                "A4": "crm:P11_had_participant (2.6e4) [*]  ->IRI(3)\ncrm:P14_carried_out_by (8.9e4 2%d) [*]  -> IRI\ncrm:P4_has_time-span (7.2e4) [*]  -> IRI\ncrm:P7_took_place_at (7.5e4) [*]  ->IRI(4)\ndct:description (1.1e5) [*]  \ndct:source (1.2e5) [*]  -> w:Source\nrdf:type (1.2e5) [*]  -> IRI\ns_events:related_period (1.1e5) [*]  -> w:Conflict\nskos:prefLabel (1.1e5) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_71": {
            "compartments": {
                "name": "w:Citizenship (10)",
                "A4": "rdf:type (10) [*]  -> IRI\nskos:prefLabel (20) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_72": {
            "compartments": {
                "name": "w:Nationality (11)",
                "A4": "rdf:type (11) [*]  -> IRI\nskos:prefLabel (22) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_73": {
            "compartments": {
                "name": "w:Capture (4202)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_75": {
            "compartments": {
                "name": "w:SotilaanAani (340)",
                "A4": "rdf:type (340) [*]  -> IRI\nschema:contentUrl (340) [*]  -> IRI\nskos:prefLabel (340) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_77": {
            "compartments": {
                "name": "w:Battle (938)",
                "A4": "crm:P11_had_participant (1980) [*]  ->IRI(2)\ncrm:P4_has_time-span (937) [*]  -> IRI\ncrm:P7_took_place_at (927) [*]  ->IRI(4)\ndct:description (1174) [*]  \ndct:source (937) [*]  -> w:Source\nrdf:type (938) [*]  -> IRI\ns_actors:comment (61) [1]  \ns_actors:number (61) [1] D \ns_events:aircraft (231) [1] D \ns_events:enemy_aircraft (233) [1] D \ns_events:hadCommander (723) [*] D \ns_events:hadUnit (769) [*] D \ns_events:pilot (233) [1] D \ns_events:place_string (233) [1] D \ns_events:related_period (890) [*]  -> w:Conflict\ns_events:time_end (233) [1] D \ns_events:time_start (233) [1] D \nskos:prefLabel (1235) [*]  \nw_events:aircraft (1) [1] D \nw_events:enemy_aircraft (1) [1] D \nw_events:pilot (1) [1] D \nw_events:place_string (1) [1] D \nw_events:time_end (1) [1] D \nw_events:time_start (1) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_79": {
            "compartments": {
                "name": "w:DeathRecord (9.5e4)",
                "A4": "s_casualties:additional_information (3720) [1] D \ns_casualties:graveyard_number (1.0e4) [1] D \ns_casualties:municipality_of_birth (8.2e4) [1] D -> IRI\ns_casualties:municipality_of_burial (9.4e4) [1] D -> IRI\ns_casualties:municipality_of_death (4.2e4) [1] D -> IRI\ns_casualties:municipality_of_domicile (9.3e4) [1] D -> IRI\ns_casualties:municipality_of_going_mia (4117) [1] D -> IRI\ns_casualties:municipality_of_residence (8.8e4) [1] D -> IRI\ns_casualties:municipality_of_wounding (7673) [1] D -> IRI\ns_casualties:place_of_burial_number (9.5e4) [1] D \ns_casualties:rank_literal (9.4e4) [1] D \ns_casualties:unit_code (4.6e4) [1] D \ns_casualties:unit_literal (9.3e4) [1] D \nskos:note (5) [1]  \nw:date_of_death (9.5e4) [1] D \nw:date_of_going_mia (6016) [1] D \nw:date_of_wounding (1.4e4) [1] D \nw:number_of_children (9.0e4) [1] D \nw:occupation_literal (8.6e4) [1] D \nw:place_of_death_literal (7.7e4) [1] D \nw:place_of_going_mia_literal (5339) [1] D \nw:place_of_wounding (1.2e4) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_81": {
            "compartments": {
                "name": "w:Symbol (29)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_83": {
            "compartments": {
                "name": "w:Birth (1.0e5)",
                "A4": "crm:P4_has_time-span (1.0e5) [*]  -> IRI\ncrm:P7_took_place_at (8.6e4) [*]  ->IRI(3)\ndct:source (9.9e4) [*]  -> w:Source\nrdf:type (1.0e5) [*]  -> IRI\nskos:prefLabel (2.0e5) [*]  \nw_actors:hasPlace (695) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_84": {
            "compartments": {
                "name": "w:PowHospital (85)",
                "A4": "s_prisoners:hospital_type (78) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_86": {
            "compartments": {
                "name": "w:UnitCategory (182)",
                "A4": "dct:source (182) [*]  -> w:Source\nrdf:type (182) [*]  -> IRI\nskos:prefLabel (182) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_89": {
            "compartments": {
                "name": "w:Promotion (1.1e5)",
                "A4": "crm:P11_had_participant (1.1e5) [*]  -> w:Person\ncrm:P4_has_time-span (6151) [*]  -> IRI\ncrm:P7_took_place_at (1) [*]  -> w:Village\ndct:description (1) [*]  \ndct:source (1.0e5) [*]  -> w:Source\nrdf:type (1.1e5) [*]  -> IRI\ns_events:related_period (1) [*]  -> w:Conflict\nskos:prefLabel (2.0e5) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_90": {
            "compartments": {
                "name": "w:PersonDocument (2314)",
                "A4": "rdf:type (2314) [*]  -> IRI\nschema:contentUrl (2328) [*]  -> IRI\nskos:prefLabel (2314) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_9_41": {
            "compartments": {
                "name": "S101",
                "A4": "dct:description [*]  \ndct:source [*]  -> w:Source\nfoaf:page [*]  -> IRI\nowl:sameAs [*]  <> w:Group\nrdf:type [*]  -> IRI\nrdfs:label [*]  \ns_actors:covernumber [*]  \ns_actors:hasUnitCategory [*]  -> IRI\nskos:altLabel [*]  \nskos:hiddenLabel [*]  \nskos:prefLabel [*]  \nw_actors:upper [1]  ",
                "Type": "Abstract",
                "A6": "<- crm:P11_had_participant IRI(*)"
            }
        },
        "c_40_79": {
            "compartments": {
                "name": "S102",
                "A4": "biocrm:has_occupation [*]  -> IRI\nrdf:type [*]  -> IRI\nskos:prefLabel [*]  \nw:date_of_birth [*]  \nw:family_name [1]  \nw:given_names [1]  ",
                "Type": "Abstract",
                "A6": ""
            }
        },
        "c_40_61": {
            "compartments": {
                "name": "S103",
                "A4": "",
                "Type": "Abstract",
                "A6": ""
            }
        },
        "c_11_4_20_73": {
            "compartments": {
                "name": "S104",
                "A4": "crm:P11_had_participant [*]  ->IRI(*)\ncrm:P4_has_time-span [*]  -> IRI\ncrm:P7_took_place_at [*]  ->IRI(*)\ndct:source [*]  -> w:Source\nrdf:type [*]  -> IRI\nskos:prefLabel [*]  ",
                "Type": "Abstract",
                "A6": ""
            }
        },
        "c_12_25_67_81": {
            "compartments": {
                "name": "S105",
                "A4": "dct:source [*]  -> w:Source\ngeo:lat [*]  \ngeo:long [*]  \ngeosparql:sfWithin [*]  -> IRI\nrdf:type [*]  -> IRI\nskos:prefLabel [*]  ",
                "Type": "Abstract",
                "A6": ""
            }
        },
        "c_36_84": {
            "compartments": {
                "name": "S106",
                "A4": "geo:lat [*]  \ngeo:long [*]  \nrdf:type [*]  -> IRI\ns_prisoners:camp_id [*]  \ns_prisoners:camp_information [*]  \ns_prisoners:camp_photographs [*]  \ns_prisoners:coordinates [*]  \ns_prisoners:location [*]  -> IRI\nskos:prefLabel [*]  ",
                "Type": "Abstract",
                "A6": ""
            }
        }
    },
    "Line3": {
        "c_69_c_61": {
            "source": "c_69",
            "target": "c_61",
            "compartments": {
                "name": "c_69_c_61",
                "A": "crm:P14_carried_out_by (8.7e4) [*] "
            }
        },
        "c_77_c_41": {
            "source": "c_77",
            "target": "c_41",
            "compartments": {
                "name": "c_77_c_41",
                "A": "crm:P14_carried_out_by (234) [*] "
            }
        },
        "c_44_c_61": {
            "source": "c_44",
            "target": "c_61",
            "compartments": {
                "name": "c_44_c_61",
                "A": "crm:P138_represents (2.3e4) [*] \ncrm:P67_refers_to (1) [1] DR"
            }
        },
        "c_44_c_63": {
            "source": "c_44",
            "target": "c_63",
            "compartments": {
                "name": "c_44_c_63",
                "A": "crm:P138_represents (2431) [*] "
            }
        },
        "c_69_c_44": {
            "source": "c_69",
            "target": "c_44",
            "compartments": {
                "name": "c_69_c_44",
                "A": "crm:P94_has_created (1.7e5) [*] DR"
            }
        },
        "c_30_c_61": {
            "source": "c_30",
            "target": "c_61",
            "compartments": {
                "name": "c_30_c_61",
                "A": "crm:P70_documents (10) [*] "
            }
        },
        "c_29_c_61": {
            "source": "c_29",
            "target": "c_61",
            "compartments": {
                "name": "c_29_c_61",
                "A": "crm:P143_joined (9.3e4) [*] "
            }
        },
        "c_83_c_61": {
            "source": "c_83",
            "target": "c_61",
            "compartments": {
                "name": "c_83_c_61",
                "A": "crm:P97_from_father (1) [1] DR\ncrm:P98_brought_into_life (1.0e5) [1] D"
            }
        },
        "c_22_c_61": {
            "source": "c_22",
            "target": "c_61",
            "compartments": {
                "name": "c_22_c_61",
                "A": "crm:P100_was_death_of (9.9e4) [*] D"
            }
        },
        "c_7_c_41": {
            "source": "c_7",
            "target": "c_41",
            "compartments": {
                "name": "c_7_c_41",
                "A": "crm:P95_has_formed (624) [1] "
            }
        },
        "c_45_c_17": {
            "source": "c_45",
            "target": "c_17",
            "compartments": {
                "name": "c_45_c_17",
                "A": "crm:P141_assigned (6086) [1] DR"
            }
        },
        "c_55_c_61": {
            "source": "c_55",
            "target": "c_61",
            "compartments": {
                "name": "c_55_c_61",
                "A": "dct:subject (33) [*] \ns_articles:mentionsPerson (3957) [*] D"
            }
        },
        "c_48_c_33": {
            "source": "c_48",
            "target": "c_33",
            "compartments": {
                "name": "c_48_c_33",
                "A": "dct: (1) [1] DR"
            }
        },
        "c_9_c_41": {
            "source": "c_9",
            "target": "c_41",
            "compartments": {
                "name": "c_9_c_41",
                "A": "owl:differentFrom (4) [*] \nw_actors:hasUpperUnit (1) [1] "
            }
        },
        "c_89_c_15": {
            "source": "c_89",
            "target": "c_15",
            "compartments": {
                "name": "c_89_c_15",
                "A": "s_actors:hasRank (1.1e5) [*] "
            }
        },
        "c_16_c_35": {
            "source": "c_16",
            "target": "c_35",
            "compartments": {
                "name": "c_16_c_35",
                "A": "s_actors:hasConflict (4) [*] R"
            }
        },
        "c_55_c_66": {
            "source": "c_55",
            "target": "c_66",
            "compartments": {
                "name": "c_55_c_66",
                "A": "s_articles:mentionsPlace (13) [*] D"
            }
        },
        "c_55_c_41": {
            "source": "c_55",
            "target": "c_41",
            "compartments": {
                "name": "c_55_c_41",
                "A": "s_articles:mentionsUnit (59) [*] D"
            }
        },
        "c_79_c_32": {
            "source": "c_79",
            "target": "c_32",
            "compartments": {
                "name": "c_79_c_32",
                "A": "s_casualties:perishing_category (9.5e4) [1] DR"
            }
        },
        "c_79_c_15": {
            "source": "c_79",
            "target": "c_15",
            "compartments": {
                "name": "c_79_c_15",
                "A": "s_casualties:rank (9.4e4) [1] DR"
            }
        },
        "c_79_c_63": {
            "source": "c_79",
            "target": "c_63",
            "compartments": {
                "name": "c_79_c_63",
                "A": "s_casualties:buried_in (5) [1] DR\nw:buried_in (8.4e4) [1] DR"
            }
        },
        "c_40_c_15": {
            "source": "c_40",
            "target": "c_15",
            "compartments": {
                "name": "c_40_c_15",
                "A": "s_prisoners:rank (4138) [1] DR"
            }
        },
        "c_40_c_41": {
            "source": "c_40",
            "target": "c_41",
            "compartments": {
                "name": "c_40_c_41",
                "A": "s_prisoners:unit (3855) [*] D"
            }
        },
        "c_40_c_24": {
            "source": "c_40",
            "target": "c_24",
            "compartments": {
                "name": "c_40_c_24",
                "A": "s_prisoners:marital_status (3643) [*] DR"
            }
        },
        "c_79_c_71": {
            "source": "c_79",
            "target": "c_71",
            "compartments": {
                "name": "c_79_c_71",
                "A": "w:citizenship (9.5e4) [1] DR"
            }
        },
        "c_79_c_72": {
            "source": "c_79",
            "target": "c_72",
            "compartments": {
                "name": "c_79_c_72",
                "A": "w:nationality (9.5e4) [1] DR"
            }
        },
        "c_79_c_53": {
            "source": "c_79",
            "target": "c_53",
            "compartments": {
                "name": "c_79_c_53",
                "A": "w:gender (9.5e4) [1] DR"
            }
        },
        "c_79_c_24": {
            "source": "c_79",
            "target": "c_24",
            "compartments": {
                "name": "c_79_c_24",
                "A": "w:marital_status (9.5e4) [1] DR"
            }
        },
        "c_30_c_9_41": {
            "source": "c_30",
            "target": "c_9_41",
            "compartments": {
                "name": "c_30_c_9_41",
                "A": "crm:P70_documents [*] "
            }
        },
        "c_29_c_9_41": {
            "source": "c_29",
            "target": "c_9_41",
            "compartments": {
                "name": "c_29_c_9_41",
                "A": "crm:P144_joined_with [*] "
            }
        },
        "c_68_c_9_41": {
            "source": "c_68",
            "target": "c_9_41",
            "compartments": {
                "name": "c_68_c_9_41",
                "A": "crm:P143_joined [*] \ncrm:P144_joined_with [*] "
            }
        },
        "c_16_c_9_41": {
            "source": "c_16",
            "target": "c_9_41",
            "compartments": {
                "name": "c_16_c_9_41",
                "A": "crm:P95_has_formed [1] "
            }
        },
        "c_48_c_9_41": {
            "source": "c_48",
            "target": "c_9_41",
            "compartments": {
                "name": "c_48_c_9_41",
                "A": "crm:P95_has_formed [1] "
            }
        },
        "c_5_c_9_41": {
            "source": "c_5",
            "target": "c_9_41",
            "compartments": {
                "name": "c_5_c_9_41",
                "A": "crm:P99_dissolved [*] D"
            }
        },
        "c_79_c_9_41": {
            "source": "c_79",
            "target": "c_9_41",
            "compartments": {
                "name": "c_79_c_9_41",
                "A": "s_casualties:unit [*] D"
            }
        },
        "c_61_c_40_79": {
            "source": "c_61",
            "target": "c_40_79",
            "compartments": {
                "name": "c_61_c_40_79",
                "A": "crm:P70i_is_documented_in [*] D"
            }
        },
        "c_9_41_c_35": {
            "source": "c_9_41",
            "target": "c_35",
            "compartments": {
                "name": "c_9_41_c_35",
                "A": "s_actors:hasConflict [*] R"
            }
        },
        "c_40_79_c_61": {
            "source": "c_40_79",
            "target": "c_61",
            "compartments": {
                "name": "c_40_79_c_61",
                "A": "crm:P70_documents [*] "
            }
        },
        "c_40_79_c_42": {
            "source": "c_40_79",
            "target": "c_42",
            "compartments": {
                "name": "c_40_79_c_42",
                "A": "w:mother_tongue [1] R"
            }
        },
        "c_40_61_c_90": {
            "source": "c_40_61",
            "target": "c_90",
            "compartments": {
                "name": "c_40_61_c_90",
                "A": "w:person_document [*] R"
            }
        },
        "c_40_61_c_75": {
            "source": "c_40_61",
            "target": "c_75",
            "compartments": {
                "name": "c_40_61_c_75",
                "A": "w:sotilaan_aani_magazine [*] R"
            }
        },
        "c_40_61_c_2": {
            "source": "c_40_61",
            "target": "c_2",
            "compartments": {
                "name": "c_40_61_c_2",
                "A": "w:documented_in_video [*] R"
            }
        }
    },
    "Gen": {
        "c_4_c_11_4_20_73": {
            "source": "c_11_4_20_73",
            "target": "c_4",
            "compartments": {
                "Val": " "
            }
        },
        "c_9_c_9_41": {
            "source": "c_9_41",
            "target": "c_9",
            "compartments": {
                "Val": " "
            }
        },
        "c_11_c_11_4_20_73": {
            "source": "c_11_4_20_73",
            "target": "c_11",
            "compartments": {
                "Val": " "
            }
        },
        "c_12_c_12_25_67_81": {
            "source": "c_12_25_67_81",
            "target": "c_12",
            "compartments": {
                "Val": " "
            }
        },
        "c_20_c_11_4_20_73": {
            "source": "c_11_4_20_73",
            "target": "c_20",
            "compartments": {
                "Val": " "
            }
        },
        "c_25_c_12_25_67_81": {
            "source": "c_12_25_67_81",
            "target": "c_25",
            "compartments": {
                "Val": " "
            }
        },
        "c_36_c_36_84": {
            "source": "c_36_84",
            "target": "c_36",
            "compartments": {
                "Val": " "
            }
        },
        "c_40_c_40_79": {
            "source": "c_40_79",
            "target": "c_40",
            "compartments": {
                "Val": " "
            }
        },
        "c_40_c_40_61": {
            "source": "c_40_61",
            "target": "c_40",
            "compartments": {
                "Val": " "
            }
        },
        "c_41_c_9_41": {
            "source": "c_9_41",
            "target": "c_41",
            "compartments": {
                "Val": " "
            }
        },
        "c_61_c_40_61": {
            "source": "c_40_61",
            "target": "c_61",
            "compartments": {
                "Val": " "
            }
        },
        "c_67_c_12_25_67_81": {
            "source": "c_12_25_67_81",
            "target": "c_67",
            "compartments": {
                "Val": " "
            }
        },
        "c_73_c_11_4_20_73": {
            "source": "c_11_4_20_73",
            "target": "c_73",
            "compartments": {
                "Val": " "
            }
        },
        "c_79_c_40_79": {
            "source": "c_40_79",
            "target": "c_79",
            "compartments": {
                "Val": " "
            }
        },
        "c_81_c_12_25_67_81": {
            "source": "c_12_25_67_81",
            "target": "c_81",
            "compartments": {
                "Val": " "
            }
        },
        "c_84_c_36_84": {
            "source": "c_36_84",
            "target": "c_84",
            "compartments": {
                "Val": " "
            }
        }
    }
}


let ontology3 = {
    "SH": {
        "c_4": {
            "compartments": {
                "name": "skos:Concept (1.4e6)",
                "A4": "rdf:type (1.4e6) [*]  -> IRI\nskos:altLabel (9.6e4) [*]  \nskos:broadMatch (944) [*] D <> skos:Concept\nskos:broader (4.4e5) [*] D <> skos:Concept\nskos:closeMatch (9.6e5) [*] D <> skos:Concept\nskos:exactMatch (3.9e4) [*] D <> skos:Concept\nskos:narrowMatch (1) [1] D -> IRI\nskos:narrower (5.8e5) [*] D <> skos:Concept\nskos:notation (1.1e5) [1]  \nskos:note (4.1e5) [*]  \nskos:prefLabel (1.5e6 99.9%d) [*]  -> IRI\nskos:related (5.3e5) [*] D <> skos:Concept",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_9": {
            "compartments": {
                "name": "ore:Aggregation (5.5e7)",
                "A4": ":dataProvider (5.5e7 99.9%d) [*] D -> IRI\n:intermediateProvider (3.0e4 99.9%d) [*] D -> IRI\n:isShownAt (5.0e7 0%d) [1] D -> IRI\n:object (5.0e7 0%d) [1] D -> IRI\n:provider (5.5e7) [1]  \n:rights (5.5e7) [*]  -> IRI\n:ugc (2.4e7) [1]  \ndc:rights (8.5e6) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_1": {
            "compartments": {
                "name": "ore:Proxy (1.1e8)",
                "A4": ":currentLocation (2.6e6 0%d) [1] D -> IRI\n:europeanaProxy (1.1e8) [1]  \n:hasMet (1.8e5 0%d) [*] D -> IRI\n:hasType (3.0e6 3%d) [*] D -> IRI\n:incorporates (21) [*] D -> IRI\n:isDerivativeOf (5 20%d) [1] D -> IRI\n:isNextInSequence (5.2e6 15%d) [*]  -> IRI\n:isRelatedTo (4.4e5 96%d) [*]  -> IRI\n:isRepresentationOf (2) [1] D -> IRI\n:isSuccessorOf (2) [1] D -> IRI\n:type (1.0e8) [1]  \n:year (2.6e7) [*]  \ndc:contributor (1.1e7 93%d) [*] D -> IRI\ndc:coverage (1.3e7 85%d) [*] D -> IRI\ndc:creator (2.7e7 91%d) [*]  -> IRI\ndc:date (5.2e7 56%d) [*]  -> IRI\ndc:description (4.8e7 99.9%d) [*]  -> IRI\ndc:format (2.4e7 94%d) [*]  -> IRI\ndc:identifier (5.9e7 99.9%d) [*]  -> IRI\ndc:language (3.5e7 99.9%d) [*] D -> IRI\ndc:publisher (2.1e7 97%d) [*] D -> IRI\ndc:relation (1.6e7 46%d) [*] D -> IRI\ndc:rights (2.1e7 98%d) [*]  -> IRI\ndc:source (2.2e7 92%d) [*]  -> IRI\ndc:subject (1.2e8 73%d) [*] D -> IRI\ndc:title (5.6e7 99.9%d) [*] D -> IRI\ndc:type (8.7e7 76%d) [*] D -> IRI\ndct:alternative (4.1e6) [*]  \ndct:conformsTo (1.4e4) [*]  \ndct:created (2.2e7 71%d) [*]  -> IRI\ndct:extent (1.6e7 99.9%d) [*]  -> IRI\ndct:hasFormat (7.5e5 37%d) [*] D -> IRI\ndct:hasPart (4.6e6 21%d) [*]  -> IRI\ndct:hasVersion (1.5e4 99.9%d) [*] D -> IRI\ndct:isFormatOf (9375 99.9%d) [*]  -> IRI\ndct:isPartOf (2.7e7 38%d) [*]  -> IRI\ndct:isReferencedBy (1.3e6 72%d) [*]  -> IRI\ndct:isReplacedBy (413 88%d) [*] D -> IRI\ndct:isRequiredBy (19 95%d) [*] D -> IRI\ndct:isVersionOf (1.1e5 86%d) [*] D -> IRI\ndct:issued (1.5e7 65%d) [*]  -> IRI\ndct:medium (1.2e7 95%d) [*] D -> IRI\ndct:provenance (5.9e6 99%d) [*] D -> IRI\ndct:references (4.4e5 99%d) [*] D -> IRI\ndct:replaces (301 75%d) [*] D -> IRI\ndct:requires (6.7e4 99.9%d) [*] D -> IRI\ndct:spatial (7.0e7 51%d) [*] D -> IRI\ndct:tableOfContents (3.0e5 84%d) [*] D -> IRI\ndct:temporal (8.6e6 65%d) [*] D -> IRI\nrdf:type (1.1e8) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_11": {
            "compartments": {
                "name": "sioc:Service (3.6e6)",
                "A4": "dct:conformsTo (3.6e6) [*]  -> IRI\ndoap:implements (3.6e6) [1] D -> IRI\nrdf:type (3.6e6) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_10": {
            "compartments": {
                "name": ":ProvidedCHO (5.5e7)",
                "A4": "owl:sameAs (1.7e6 51%d) [*]  -> IRI\nrdf:type (5.5e7) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_8": {
            "compartments": {
                "name": ":Agent (7.2e5)",
                "A4": ":begin (2.8e4) [1]  \n:end (4.9e4) [*]  \n:isRelatedTo (1.2e5 0%d) [*]  <> :Agent\ndc:date (6) [*]  -> IRI\ndc:identifier (4577) [*]  -> IRI\nfoaf:name (2255) [*]  \nowl:sameAs (7.1e5 0%d) [*]  <> :Agent\nrdag2:biographicalInformation (2.2e5) [*]  \nrdag2:dateOfBirth (1.2e5) [*]  \nrdag2:dateOfDeath (1.2e5) [*]  \nrdag2:dateOfEstablishment (294) [1]  \nrdag2:dateOfTermination (27) [1]  \nrdag2:gender (6.9e4) [1]  \nrdag2:placeOfBirth (2.7e4 3%d) [*] D <> :Agent\nrdag2:placeOfDeath (1.4e4 5%d) [*] D -> IRI\nrdag2:professionOrOccupation (1.3e4 22%d) [*] D <> :Agent\nrdf:type (7.2e5) [*]  -> IRI\nskos:altLabel (7.0e5) [*]  \nskos:note (1.9e5) [*]  \nskos:prefLabel (6.9e5) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_7": {
            "compartments": {
                "name": ":TimeSpan (6.2e4)",
                "A4": ":begin (5.1e4) [1]  \n:end (5.1e4) [*]  \ndct:hasPart (2) [*]  -> IRI\ndct:isPartOf (1967) [*]  <> :TimeSpan\nowl:sameAs (52) [*]  -> IRI\nrdf:type (6.2e4) [*]  -> IRI\nskos:altLabel (107) [*]  \nskos:note (104) [*]  \nskos:prefLabel (4.1e4) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_6": {
            "compartments": {
                "name": ":WebResource (1.3e8)",
                "A4": ":codecName (5.4e4) [1]  \n:componentColor (1.2e8) [*]  \n:hasColorSpace (2.1e7) [*]  \n:isNextInSequence (4.3e6 0%d) [*]  <> :WebResource\n:rights (5.8e7) [*]  -> IRI\ndc:creator (2.3e5) [*]  -> IRI\ndc:description (2.2e7 99.9%d) [*]  -> IRI\ndc:format (1.3e7 99.9%d) [*]  -> IRI\ndc:rights (9.7e6 99%d) [*]  -> IRI\ndc:source (1.2e6 85%d) [*]  -> IRI\ndct:conformsTo (2909 0%d) [*]  -> IRI\ndct:created (3.5e6) [*]  -> IRI\ndct:extent (7.2e5) [*]  -> IRI\ndct:hasPart (228) [*]  -> IRI\ndct:isFormatOf (3.1e4 2%d) [*]  <> :WebResource\ndct:isReferencedBy (3.6e6) [*]  -> IRI\ndct:issued (1.7e5) [*]  -> IRI\nebucore:audioChannelNumber (2.0e5) [1]  \nebucore:bitRate (2.5e5) [1]  \nebucore:duration (2.5e5) [1]  \nebucore:fileSize (2.1e7) [*]  \nebucore:frameRate (5.4e4) [1]  \nebucore:hasMimeType (2.1e7) [*]  \nebucore:height (2.1e7) [*]  \nebucore:orientation (2.1e7) [*]  \nebucore:sampleRate (2.0e5) [1]  \nebucore:sampleSize (2.0e5) [1]  \nebucore:width (2.1e7) [*]  \nowl:sameAs (2) [*]  -> IRI\nrdf:type (1.3e8) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_3": {
            "compartments": {
                "name": ":EuropeanaAggregation (5.4e7)",
                "A4": ":collectionName (5.4e7) [1]  \n:country (5.4e7) [1]  \n:hasView (1282) [*]  -> IRI\n:landingPage (5.4e7) [1] D -> IRI\n:language (5.4e7) [1]  \n:preview (2.3e7 0%d) [1] D -> IRI\ndc:creator (3.1e6 99.9%d) [*]  -> IRI\nore:aggregates (8.9e5 0%d) [1] D -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_3_9": {
            "compartments": {
                "name": "S101",
                "A4": "rdf:type [*]  -> IRI",
                "Type": "Abstract",
                "A6": ""
            }
        }
    },
    "Line3": {
        "c_1_c_6": {
            "source": "c_1",
            "target": "c_6",
            "compartments": {
                "name": "c_1_c_6",
                "A": ":isNextInSequence (4.6e4) [*] \n:isRelatedTo (4626) [*] \n:isSimilarTo (624) [*] D\ndc:coverage (1.4e4) [*] D\ndc:format (1) [*] \ndc:identifier (104) [*] \ndc:language (1) [*] D\ndc:publisher (1) [*] D\ndc:relation (1.7e6) [*] D\ndc:source (2.8e5) [*] \ndc:title (952) [*] D\ndct:extent (1) [*] \ndct:hasFormat (7.0e4) [*] D\ndct:hasPart (1.6e4) [*] \ndct:hasVersion (10) [*] D\ndct:isPartOf (2.7e5) [*] \ndct:isReferencedBy (7475) [*] \ndct:isReplacedBy (1) [*] D\ndct:isVersionOf (9) [*] D\ndct:provenance (5.2e4) [*] D\ndct:references (1330) [*] D\ndct:replaces (2) [*] D\ndct:requires (217) [*] D\ndct:spatial (1) [*] D\ndct:tableOfContents (16) [*] D\ndct:temporal (1) [*] D"
            }
        },
        "c_8_c_4": {
            "source": "c_8",
            "target": "c_4",
            "compartments": {
                "name": "c_8_c_4",
                "A": ":isRelatedTo (749) [*] \nowl:sameAs (1) [*] \nrdag2:professionOrOccupation (314) [*] D"
            }
        },
        "c_8_c_7": {
            "source": "c_8",
            "target": "c_7",
            "compartments": {
                "name": "c_8_c_7",
                "A": ":isRelatedTo (2) [*] "
            }
        },
        "c_1_c_8": {
            "source": "c_1",
            "target": "c_8",
            "compartments": {
                "name": "c_1_c_8",
                "A": ":hasMet (4.5e4) [*] D\ndc:contributor (7.6e5) [*] D\ndc:creator (2.5e6) [*] \ndc:publisher (4.9e4) [*] D\ndc:relation (328) [*] D\ndc:rights (1) [*] \ndc:subject (3.6e5) [*] D\ndct:isPartOf (2) [*] "
            }
        },
        "c_9_c_6": {
            "source": "c_9",
            "target": "c_6",
            "compartments": {
                "name": "c_9_c_6",
                "A": ":hasView (3.6e7) [*] \n:isShownAt (4.2e7) [1] D\n:object (4.9e7) [1] D"
            }
        },
        "c_3_c_6": {
            "source": "c_3",
            "target": "c_6",
            "compartments": {
                "name": "c_3_c_6",
                "A": ":preview (1.6e7) [1] D\n:rights (9985) [*] \nore:aggregates (8.9e5) [1] D"
            }
        },
        "c_1_c_4": {
            "source": "c_1",
            "target": "c_4",
            "compartments": {
                "name": "c_1_c_4",
                "A": ":realizes (731) [*] D\ndc:contributor (1.7e4) [*] D\ndc:creator (497) [*] \ndc:format (1.3e6) [*] \ndc:publisher (1.4e4) [*] D\ndc:subject (3.1e7) [*] D\ndc:type (2.0e7) [*] D\ndct:isPartOf (2580) [*] \ndct:medium (5.2e5) [*] D\ndct:spatial (4.5e5) [*] D\ndct:temporal (1.3e4) [*] D"
            }
        },
        "c_1_c_7": {
            "source": "c_1",
            "target": "c_7",
            "compartments": {
                "name": "c_1_c_7",
                "A": "dc:coverage (1994) [*] D\ndc:date (2.3e7) [*] \ndc:subject (2.4e4) [*] D\ndct:created (6.5e6) [*] \ndct:issued (5.2e6) [*] \ndct:temporal (3.0e6) [*] D"
            }
        },
        "c_6_c_4": {
            "source": "c_6",
            "target": "c_4",
            "compartments": {
                "name": "c_6_c_4",
                "A": "dc:format (433) [*] "
            }
        },
        "c_1_c_10": {
            "source": "c_1",
            "target": "c_10",
            "compartments": {
                "name": "c_1_c_10",
                "A": "ore:proxyFor (1.1e8) [1] DR"
            }
        },
        "c_10_c_6": {
            "source": "c_10",
            "target": "c_6",
            "compartments": {
                "name": "c_10_c_6",
                "A": "owl:sameAs (1.7e4) [*] "
            }
        },
        "c_6_c_11": {
            "source": "c_6",
            "target": "c_11",
            "compartments": {
                "name": "c_6_c_11",
                "A": "sioc:has_service (3.6e6) [1] DR"
            }
        },
        "c_4_c_6": {
            "source": "c_4",
            "target": "c_6",
            "compartments": {
                "name": "c_4_c_6",
                "A": "skos:prefLabel (1) [*] "
            }
        },
        "c_4_c_8": {
            "source": "c_4",
            "target": "c_8",
            "compartments": {
                "name": "c_4_c_8",
                "A": "skos:broader (4.2e4) [*] D\nskos:closeMatch (293) [*] D\nskos:related (4) [*] D"
            }
        },
        "c_4_c_7": {
            "source": "c_4",
            "target": "c_7",
            "compartments": {
                "name": "c_4_c_7",
                "A": "skos:broader (630) [*] D"
            }
        },
        "c_1_c_3_9": {
            "source": "c_1",
            "target": "c_3_9",
            "compartments": {
                "name": "c_1_c_3_9",
                "A": "ore:proxyIn [1] D"
            }
        },
        "c_3_9_c_10": {
            "source": "c_3_9",
            "target": "c_10",
            "compartments": {
                "name": "c_3_9_c_10",
                "A": ":aggregatedCHO [1] R"
            }
        },
        "c_3_9_c_6": {
            "source": "c_3_9",
            "target": "c_6",
            "compartments": {
                "name": "c_3_9_c_6",
                "A": ":isShownBy [1] "
            }
        }
    },
    "Gen": {
        "c_9_c_3_9": {
            "source": "c_3_9",
            "target": "c_9",
            "compartments": {
                "Val": " "
            }
        },
        "c_3_c_3_9": {
            "source": "c_3_9",
            "target": "c_3",
            "compartments": {
                "Val": " "
            }
        }
    }
}


let ontology4 = {
    "SH": {
        "c_1": {
            "compartments": {
                "name": ":Estuary (248)",
                "A4": ":latitude (248) [1]  \n:longitude (248) [1]  \nrdf:type (248) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_3": {
            "compartments": {
                "name": ":EthnicGroup (280)",
                "A4": ":name (280) [1]  \nrdf:type (280) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_4": {
            "compartments": {
                "name": ":Language (103)",
                "A4": ":name (103) [1]  \nrdf:type (103) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_6": {
            "compartments": {
                "name": ":Religion (44)",
                "A4": ":name (44) [1]  \nrdf:type (44) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_7": {
            "compartments": {
                "name": ":Source (248)",
                "A4": ":elevation (157) [1]  \n:latitude (247) [1]  \n:longitude (247) [1]  \nrdf:type (248) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_8": {
            "compartments": {
                "name": ":Province (1432)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_9": {
            "compartments": {
                "name": ":EthnicProportion (628)",
                "A4": ":percent (628) [1]  \nrdf:type (628) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_10": {
            "compartments": {
                "name": ":River (248)",
                "A4": ":area (160) [1]  \n:flowsInto (247) [1]  <> :River\n:length (243) [1]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_11": {
            "compartments": {
                "name": ":Volcano (101)",
                "A4": ":lastEruption (2) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_12": {
            "compartments": {
                "name": ":Islands (68)",
                "A4": ":name (68) [1]  \nrdf:type (68) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_13": {
            "compartments": {
                "name": ":SpokenBy (282)",
                "A4": ":percent (282) [1]  \nrdf:type (282) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_14": {
            "compartments": {
                "name": ":Desert (62)",
                "A4": ":area (62) [1]  \n:latitude (60) [1]  \n:longitude (60) [1]  \n:name (62) [1]  \n:type (12) [1]  \nrdf:type (62) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_15": {
            "compartments": {
                "name": ":Island (298)",
                "A4": ":area (294) [1]  \n:elevation (253) [1]  \n:latitude (297) [1]  \n:longitude (297) [1]  \n:name (298) [1]  \n:type (107) [1]  \nrdf:type (298) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_17": {
            "compartments": {
                "name": ":Border (325)",
                "A4": ":length (325) [1]  \nrdf:type (325) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_18": {
            "compartments": {
                "name": ":Mountains (92)",
                "A4": ":name (92) [1]  \nrdf:type (92) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_19": {
            "compartments": {
                "name": ":Sea (41)",
                "A4": ":depth (39) [1]  \n:mergesWith (128) [*] D <> :Sea",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_22": {
            "compartments": {
                "name": ":Membership (9968)",
                "A4": ":type (9968) [1]  \nrdf:type (9968) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_23": {
            "compartments": {
                "name": ":Country (244)",
                "A4": ":carCode (244) [1] D \n:dependentOf (44) [1] D <> :Country\n:gdpAgri (224) [1] D \n:gdpInd (223) [1] D \n:gdpServ (223) [1] D \n:gdpTotal (234) [1] D \n:government (241) [1] D \n:independenceDate (190) [1] D \n:infantMortality (228) [1] D \n:inflation (226) [1] D \n:neighbor (649) [*] D <> :Country\n:populationGrowth (234) [1] D \n:unemployment (198) [1] D \n:wasDependentOf (176) [1] D <> :Country",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_25": {
            "compartments": {
                "name": ":City (3375)",
                "A4": ":elevation (2533) [1]  \n:latitude (3365) [1]  \n:longitude (3365) [1]  \n:name (3375) [1]  \n:othername (3881) [*]  \n:population (3043) [1]  \nrdf:type (3375) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_27": {
            "compartments": {
                "name": ":Organization (168)",
                "A4": ":abbrev (168) [1] D \n:established (152) [1] D \n:name (168) [1]  \nrdf:type (168) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_28": {
            "compartments": {
                "name": ":Encompassed (249)",
                "A4": ":percent (249) [1]  \nrdf:type (249) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_29": {
            "compartments": {
                "name": ":BelievedBy (547)",
                "A4": ":percent (547) [1]  \nrdf:type (547) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_30": {
            "compartments": {
                "name": ":Lake (143)",
                "A4": ":area (141) [1]  \n:depth (120) [1]  \n:elevation (119) [1]  \n:flowsInto (85) [1]  <> :Lake\n:latitude (143) [1]  \n:longitude (143) [1]  \n:type (66) [1]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_31": {
            "compartments": {
                "name": ":Mountain (251)",
                "A4": ":elevation (251) [1]  \n:latitude (251) [1]  \n:longitude (251) [1]  \n:name (251) [1]  \n:type (106) [1]  \nrdf:type (352) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_33": {
            "compartments": {
                "name": ":Continent (5)",
                "A4": ":area (5) [1]  \n:name (5) [1]  \nrdf:type (5) [*]  -> IRI",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_8_23": {
            "compartments": {
                "name": "S101",
                "A4": ":area [1]  \n:name [1]  \n:othername [*]  \n:population [1]  \nrdf:type [*]  -> IRI",
                "Type": "Abstract",
                "A6": ""
            }
        },
        "c_10_19_30": {
            "compartments": {
                "name": "S102",
                "A4": ":name [1]  \nrdf:type [*]  -> IRI",
                "Type": "Abstract",
                "A6": ""
            }
        }
    },
    "Line3": {
        "c_22_c_23": {
            "source": "c_22",
            "target": "c_23",
            "compartments": {
                "name": "c_22_c_23",
                "A": ":ofMember (9968) [1] DR"
            }
        },
        "c_23_c_27": {
            "source": "c_23",
            "target": "c_27",
            "compartments": {
                "name": "c_23_c_27",
                "A": ":isMember (9968) [*] DR"
            }
        },
        "c_22_c_27": {
            "source": "c_22",
            "target": "c_27",
            "compartments": {
                "name": "c_22_c_27",
                "A": ":inOrganization (9968) [1] DR"
            }
        },
        "c_9_c_23": {
            "source": "c_9",
            "target": "c_23",
            "compartments": {
                "name": "c_9_c_23",
                "A": ":ofCountry (628) [1] R"
            }
        },
        "c_13_c_23": {
            "source": "c_13",
            "target": "c_23",
            "compartments": {
                "name": "c_13_c_23",
                "A": ":ofCountry (282) [1] R"
            }
        },
        "c_29_c_23": {
            "source": "c_29",
            "target": "c_23",
            "compartments": {
                "name": "c_29_c_23",
                "A": ":ofCountry (547) [1] R"
            }
        },
        "c_23_c_8": {
            "source": "c_23",
            "target": "c_8",
            "compartments": {
                "name": "c_23_c_8",
                "A": ":hasProvince (1432) [*] DR"
            }
        },
        "c_17_c_23": {
            "source": "c_17",
            "target": "c_23",
            "compartments": {
                "name": "c_17_c_23",
                "A": ":bordering (650) [*] DR"
            }
        },
        "c_9_c_3": {
            "source": "c_9",
            "target": "c_3",
            "compartments": {
                "name": "c_9_c_3",
                "A": ":onEthnicGroup (628) [1] DR"
            }
        },
        "c_29_c_6": {
            "source": "c_29",
            "target": "c_6",
            "compartments": {
                "name": "c_29_c_6",
                "A": ":onReligion (547) [1] DR"
            }
        },
        "c_25_c_15": {
            "source": "c_25",
            "target": "c_15",
            "compartments": {
                "name": "c_25_c_15",
                "A": ":locatedOnIsland (435) [1] R"
            }
        },
        "c_31_c_15": {
            "source": "c_31",
            "target": "c_15",
            "compartments": {
                "name": "c_31_c_15",
                "A": ":locatedOnIsland (70) [1] R"
            }
        },
        "c_10_c_19": {
            "source": "c_10",
            "target": "c_19",
            "compartments": {
                "name": "c_10_c_19",
                "A": ":flowsInto [1] "
            }
        },
        "c_10_c_30": {
            "source": "c_10",
            "target": "c_30",
            "compartments": {
                "name": "c_10_c_30",
                "A": ":flowsInto [1] \n:flowsThrough (45) [*] DR"
            }
        },
        "c_30_c_10": {
            "source": "c_30",
            "target": "c_10",
            "compartments": {
                "name": "c_30_c_10",
                "A": ":flowsInto [1] "
            }
        },
        "c_30_c_19": {
            "source": "c_30",
            "target": "c_19",
            "compartments": {
                "name": "c_30_c_19",
                "A": ":flowsInto [1] "
            }
        },
        "c_7_c_18": {
            "source": "c_7",
            "target": "c_18",
            "compartments": {
                "name": "c_7_c_18",
                "A": ":inMountains (116) [1] R"
            }
        },
        "c_31_c_18": {
            "source": "c_31",
            "target": "c_18",
            "compartments": {
                "name": "c_31_c_18",
                "A": ":inMountains (177) [1] R"
            }
        },
        "c_13_c_4": {
            "source": "c_13",
            "target": "c_4",
            "compartments": {
                "name": "c_13_c_4",
                "A": ":onLanguage (282) [1] DR"
            }
        },
        "c_28_c_23": {
            "source": "c_28",
            "target": "c_23",
            "compartments": {
                "name": "c_28_c_23",
                "A": ":encompassedArea (249) [1] DR"
            }
        },
        "c_28_c_33": {
            "source": "c_28",
            "target": "c_33",
            "compartments": {
                "name": "c_28_c_33",
                "A": ":encompassedBy (249) [1] DR"
            }
        },
        "c_23_c_33": {
            "source": "c_23",
            "target": "c_33",
            "compartments": {
                "name": "c_23_c_33",
                "A": ":encompassed (249) [*] DR"
            }
        },
        "c_10_c_7": {
            "source": "c_10",
            "target": "c_7",
            "compartments": {
                "name": "c_10_c_7",
                "A": ":hasSource (248) [1] DR"
            }
        },
        "c_10_c_1": {
            "source": "c_10",
            "target": "c_1",
            "compartments": {
                "name": "c_10_c_1",
                "A": ":hasEstuary (248) [1] DR"
            }
        },
        "c_15_c_12": {
            "source": "c_15",
            "target": "c_12",
            "compartments": {
                "name": "c_15_c_12",
                "A": ":belongsToIslands (218) [1] DR"
            }
        },
        "c_27_c_25": {
            "source": "c_27",
            "target": "c_25",
            "compartments": {
                "name": "c_27_c_25",
                "A": ":hasHeadq (121) [1] DR"
            }
        },
        "c_1_c_8_23": {
            "source": "c_1",
            "target": "c_8_23",
            "compartments": {
                "name": "c_1_c_8_23",
                "A": ":locatedIn [*] "
            }
        },
        "c_7_c_8_23": {
            "source": "c_7",
            "target": "c_8_23",
            "compartments": {
                "name": "c_7_c_8_23",
                "A": ":locatedIn [*] "
            }
        },
        "c_14_c_8_23": {
            "source": "c_14",
            "target": "c_8_23",
            "compartments": {
                "name": "c_14_c_8_23",
                "A": ":locatedIn [*] "
            }
        },
        "c_15_c_8_23": {
            "source": "c_15",
            "target": "c_8_23",
            "compartments": {
                "name": "c_15_c_8_23",
                "A": ":locatedIn [*] "
            }
        },
        "c_31_c_8_23": {
            "source": "c_31",
            "target": "c_8_23",
            "compartments": {
                "name": "c_31_c_8_23",
                "A": ":locatedIn [*] "
            }
        },
        "c_25_c_10_19_30": {
            "source": "c_25",
            "target": "c_10_19_30",
            "compartments": {
                "name": "c_25_c_10_19_30",
                "A": ":locatedAt [*] D"
            }
        },
        "c_15_c_10_19_30": {
            "source": "c_15",
            "target": "c_10_19_30",
            "compartments": {
                "name": "c_15_c_10_19_30",
                "A": ":locatedInWater [*] D"
            }
        },
        "c_8_23_c_25": {
            "source": "c_8_23",
            "target": "c_25",
            "compartments": {
                "name": "c_8_23_c_25",
                "A": ":capital [1] R\n:hasCity [*] R"
            }
        },
        "c_10_19_30_c_8_23": {
            "source": "c_10_19_30",
            "target": "c_8_23",
            "compartments": {
                "name": "c_10_19_30_c_8_23",
                "A": ":locatedIn [*] "
            }
        }
    },
    "Gen": {
        "c_8_c_8_23": {
            "source": "c_8_23",
            "target": "c_8",
            "compartments": {
                "Val": " "
            }
        },
        "c_10_c_10_19_30": {
            "source": "c_10_19_30",
            "target": "c_10",
            "compartments": {
                "Val": " "
            }
        },
        "c_11_c_31": {
            "source": "c_31",
            "target": "c_11",
            "compartments": {
                "Val": " "
            }
        },
        "c_19_c_10_19_30": {
            "source": "c_10_19_30",
            "target": "c_19",
            "compartments": {
                "Val": " "
            }
        },
        "c_23_c_8_23": {
            "source": "c_8_23",
            "target": "c_23",
            "compartments": {
                "Val": " "
            }
        },
        "c_30_c_10_19_30": {
            "source": "c_10_19_30",
            "target": "c_30",
            "compartments": {
                "Val": " "
            }
        }
    }
}

let ontology5 = {
    "SH": {
        "c_1": {
            "compartments": {
                "name": "dbo:University (341)",
                "A4": "rdf:type (341) [*]  -> IRI\nrdfs:label (1023) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_3": {
            "compartments": {
                "name": "dbo:Award (1596)",
                "A4": "nobel:category (1596) [1] D -> IRI\nnobel:motivation (1968) [*] D \nnobel:year (1596) [1] D \nrdf:type (3192) [*]  -> IRI\nrdfs:label (4788) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_4": {
            "compartments": {
                "name": "nobel:Laureate (976)",
                "A4": "foaf:name (1024) [*]  \nowl:sameAs (976) [1]  -> IRI\nrdf:type (1952) [*]  -> IRI\nrdfs:label (975) [*]  ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_5": {
            "compartments": {
                "name": "foaf:Person (949)",
                "A4": "dbp:dateOfBirth (949) [1] D \ndbp:dateOfDeath (650) [1] D \nfoaf:birthday (949) [1] D \nfoaf:familyName (947) [1] D \nfoaf:gender (949) [1] D \nfoaf:givenName (949) [1] D ",
                "Type": "Class",
                "A6": ""
            }
        },
        "c_5_sub": {
            "compartments": {
                "A5": "(gender) female (60)\n(gender) male (889)",
                "Type": "SubCat"
            }
        },
        "c_6": {
            "compartments": {
                "name": "dbo:Country (127)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_9": {
            "compartments": {
                "name": "dbo:City (951)",
                "A4": "",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_10": {
            "compartments": {
                "name": "nobel:LaureateAward (984)",
                "A4": "nobel:share (984) [1] D \nnobel:sortOrder (984) [1] D ",
                "Type": "Class",
                "A6": ""
            }
        },
        "c_10_sub": {
            "compartments": {
                "A5": "(ct) ncat:Chemistry (191)\n(ct) ncat:Economic_Sciences (89)\n(ct) ncat:Literature (118)\n(ct) ncat:Peace (140)\n(ct) ncat:Physics (221)\n(ct) ncat:Physiology_or_Medicine (225)",
                "Type": "SubCat"
            }
        },
        "c_11": {
            "compartments": {
                "name": "foaf:Organization (27)",
                "A4": "dct:created (26) [1] D \nsschema:foundingDate (26) [1] D ",
                "A6": "",
                "Type": "Class"
            }
        },
        "c_13": {
            "compartments": {
                "name": "nobel:NobelPrize (612)",
                "A4": "nobel:categoryOrder (612) [1] D ",
                "Type": "Class",
                "A6": ""
            }
        },
        "c_13_sub": {
            "compartments": {
                "A5": "(ct) nobel:Chemistry (114)\n(ct) nobel:Economic_Sciences (53)\n(ct) nobel:Literature (114)\n(ct) nobel:Peace (103)\n(ct) nobel:Physics (115)\n(ct) nobel:Physiology_or_Medicine (113)",
                "Type": "SubCat"
            }
        },
        "c_6_9": {
            "compartments": {
                "name": "S101",
                "A4": "owl:sameAs [1]  -> IRI\nrdf:type [*]  -> IRI\nrdfs:label [*]  ",
                "Type": "Abstract",
                "A6": ""
            }
        }
    },
    "Line3": {
        "c_5_c_1": {
            "source": "c_5",
            "target": "c_1",
            "compartments": {
                "name": "c_5_c_1",
                "A": "dbo:affiliation (797) [*] DR"
            }
        },
        "c_1_c_6": {
            "source": "c_1",
            "target": "c_6",
            "compartments": {
                "name": "c_1_c_6",
                "A": "dbo:country (345) [*] DR"
            }
        },
        "c_1_c_9": {
            "source": "c_1",
            "target": "c_9",
            "compartments": {
                "name": "c_1_c_9",
                "A": "dbo:city (338) [1] DR"
            }
        },
        "c_10_c_13": {
            "source": "c_10",
            "target": "c_13",
            "compartments": {
                "name": "c_10_c_13",
                "A": "dct:isPartOf (982) [1] DR"
            }
        },
        "c_13_c_10": {
            "source": "c_13",
            "target": "c_10",
            "compartments": {
                "name": "c_13_c_10",
                "A": "dct:hasPart (982) [*] DR"
            }
        },
        "c_3_c_4": {
            "source": "c_3",
            "target": "c_4",
            "compartments": {
                "name": "c_3_c_4",
                "A": "nobel:laureate (1966) [*] DR"
            }
        },
        "c_4_c_10": {
            "source": "c_4",
            "target": "c_10",
            "compartments": {
                "name": "c_4_c_10",
                "A": "nobel:laureateAward (984) [*] DR"
            }
        },
        "c_4_c_13": {
            "source": "c_4",
            "target": "c_13",
            "compartments": {
                "name": "c_4_c_13",
                "A": "nobel:nobelPrize (982) [*] DR"
            }
        },
        "c_10_c_1": {
            "source": "c_10",
            "target": "c_1",
            "compartments": {
                "name": "c_10_c_1",
                "A": "nobel:university (799) [*] DR"
            }
        },
        "c_5_c_6_9": {
            "source": "c_5",
            "target": "c_6_9",
            "compartments": {
                "name": "c_5_c_6_9",
                "A": "dbo:birthPlace [*] D\ndbo:deathPlace [*] D"
            }
        },
        "c_11_c_6_9": {
            "source": "c_11",
            "target": "c_6_9",
            "compartments": {
                "name": "c_11_c_6_9",
                "A": "sschema:foundingLocation [*] D"
            }
        }
    },
    "Gen": {
        "c_5_sub_gen": {
            "source": "c_5",
            "target": "c_5_sub",
            "compartments": {
                "Val": " "
            }
        },
        "c_5_c_4": {
            "source": "c_4",
            "target": "c_5",
            "compartments": {
                "Val": " "
            }
        },
        "c_6_c_6_9": {
            "source": "c_6_9",
            "target": "c_6",
            "compartments": {
                "Val": " "
            }
        },
        "c_9_c_6_9": {
            "source": "c_6_9",
            "target": "c_9",
            "compartments": {
                "Val": " "
            }
        },
        "c_10_sub_gen": {
            "source": "c_10",
            "target": "c_10_sub",
            "compartments": {
                "Val": " "
            }
        },
        "c_10_c_3": {
            "source": "c_3",
            "target": "c_10",
            "compartments": {
                "Val": " "
            }
        },
        "c_11_c_4": {
            "source": "c_4",
            "target": "c_11",
            "compartments": {
                "Val": " "
            }
        },
        "c_13_sub_gen": {
            "source": "c_13",
            "target": "c_13_sub",
            "compartments": {
                "Val": " "
            }
        },
        "c_13_c_3": {
            "source": "c_3",
            "target": "c_13",
            "compartments": {
                "Val": " "
            }
        }
    }
}



Meteor.methods({

	importOntology1: function(list) {
		Meteor.call("importOntology", list, ontology1);
	},

	importOntology2: function(list) {
		Meteor.call("importOntology", list, ontology2);
	},

	importOntology3: function(list) {
		Meteor.call("importOntology", list, ontology3);
	},

	importOntology4: function(list) {
		Meteor.call("importOntology", list, ontology4);
	},

	importOntology5: function(list) {
		Meteor.call("importOntology", list, ontology5);
	},


	importOntology: function(list, ontology) {
		var user_id = Meteor.userId();

		// let tool = Tools.findOne({name: "Viziquer"});
		// if (!tool) {
		// 	console.error("No tool");
		// 	return;
		// }


        let project = Projects.findOne({_id: list.projectId,});
        if (!project) {
         console.error("No Project");
         return;
        }

        let tool_id = project.toolId;


		let diagram_type = DiagramTypes.findOne({name: "Ontology", toolId: tool_id,});
		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		let diagram_object = {name: `Ontology diagram - ${ontology.Schema}`,
								diagramTypeId: diagram_type._id,
								style: diagram_type.style,

								createdAt: new Date(),
								createdBy: user_id,
								editorType: "ajooEditor",

								imageUrl: "http://placehold.it/770x347",
								parentDiagrams: [],
								allowedGroups: [],
								editing: {},
								seenCount: 0,
								projectId: list.projectId,
								versionId: list.versionId,
								isLayoutComputationNeededOnLoad: 1,
							};

		let new_diagram_id = Diagrams.insert(diagram_object);
		let element_map = {};

		// Box part
		let box_type = ElementTypes.findOne({type: "Box", diagramTypeId: diagram_type._id});
		if (!box_type) {
			console.error("No box type");
			return;
		}

		let box_style = box_type["styles"][0];
		let box_style_id = box_style["id"];


		_.each(ontology.SH, function(item, key) {

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

			let object = {diagramId: new_diagram_id,
							type: "Box",
							location: {x: 10, y: 10, width: 5, height: 5},
							styleId: box_style_id,
							style: box_style,
							elementTypeId: box_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_box_id = Elements.insert(object);
			element_map[key] = new_box_id;

			add_compartment(list, item, new_diagram_id, diagram_type._id, new_box_id, box_type._id);
		});

		// Gen part
		let gen_type = ElementTypes.findOne({name: "Gen", diagramTypeId: diagram_type._id});
		if (!gen_type) {
			console.error("No Gen type");
			return;
		}

		let gen_style = gen_type["styles"][0];
		let gen_style_id = gen_style["id"];

		_.each(ontology.Gen, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 20, 20, 20],
                            startElement: element_map[item.target],
							endElement: element_map[item.source],

                            startSides: gen_type.startSides || 1,
                            endSides: gen_type.endSides || 4,

							styleId: gen_style_id,

							elementTypeId: gen_type._id,
							diagramTypeId: diagram_type._id,

							style: {
								elementStyle: gen_style.elementStyle,
								startShapeStyle: gen_style.startShapeStyle,
								endShapeStyle: gen_style.endShapeStyle,
								lineType: "Orthogonal",
							},

							projectId: list.projectId,
							versionId: list.versionId,
						};


			let new_line_id = Elements.insert(object);
			element_map[key] = new_line_id;

			add_compartment(list, item, new_diagram_id, diagram_type._id, new_line_id, gen_type._id);
		});


		// Line3 part
		let line3_type = ElementTypes.findOne({name: "Line", diagramTypeId: diagram_type._id});
		if (!line3_type) {
			console.error("No Line3 type");
			return;
		}

		let line3_style = line3_type["styles"][0];
		let line3_style_id = line3_style["id"];

		_.each(ontology.Line3, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 10, 10, 10],
							startElement: element_map[item.source],
							endElement: element_map[item.target],

							styleId: line3_style_id,
							style: {
								elementStyle: line3_style.elementStyle,
								startShapeStyle: line3_style.startShapeStyle,
								endShapeStyle: line3_style.endShapeStyle,
								lineType: "Orthogonal",
							},

							elementTypeId: line3_type._id,
							diagramTypeId: diagram_type._id,

							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
			element_map[key] = new_line_id;

			add_compartment(list, item, new_diagram_id, diagram_type._id, new_line_id, line3_type._id);
		});


	},

    importOntologyNew: function(list, ontology) {
		var user_id = Meteor.userId();

        let project = Projects.findOne({_id: list.projectId,});
        if (!project) {
         console.error("No Project");
         return;
        }

        let tool_id = project.toolId;

		let diagram_type = DiagramTypes.findOne({name: "DataSchema", toolId: tool_id,});
		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		let diagram_object = {name: `DataSchema - ${ontology.Schema}`,
								diagramTypeId: diagram_type._id,
								style: diagram_type.style,
								createdAt: new Date(),
								createdBy: user_id,
								editorType: "ajooEditor",
								imageUrl: "http://placehold.it/770x347",
								parentDiagrams: [],
								allowedGroups: [],
								editing: {},
								seenCount: 0,
								projectId: list.projectId,
								versionId: list.versionId,
								isLayoutComputationNeededOnLoad: 1,
                                description:`${ontology.ClassCount} classes, ${ontology.NodesCount} nodes` 
							};
        
        //if ( !ontology.hasGeneralization ) {
        //    console.log('Mēģinam likt klāt citu izvietojumu', ontology.Schema)
        //    diagram_object['layoutSettings'] = {layout: 'UNIVERSAL', arrangeMethod: 'arrangeFromScratch'};
        //    //console.log(diagram_object, diagram_object.description, 'aaaaa')
        //}

        let new_diagram_id = Diagrams.insert(diagram_object);
		let element_map = {};

        // Namespaces part 
        let ns_type = ElementTypes.findOne({name: "Namespaces", diagramTypeId: diagram_type._id});
        if (!ns_type) {
			console.error("No Namespaces type");
			return;
		}    
        let ns_style = ns_type["styles"][0];
		let ns_style_id = ns_style["id"];   
        let ns_object = {diagramId: new_diagram_id,
            type: "Box",
            location: {x: 10, y: 10, width: 5, height: 5},
            styleId: ns_style_id,
            style: ns_style,
            elementTypeId: ns_type._id,
            diagramTypeId: diagram_type._id,
            projectId: list.projectId,
            versionId: list.versionId,
        };
        list.diagram_id = new_diagram_id;
		list.diagram_type_id = diagram_type._id;
        list.compactClassView = ontology.CompactClassView;

        let ns_element = Elements.insert(ns_object);
        //const nsProc = (ontology.Namespaces.n_0.compartments.List.length > 35) ? Math.round(3500/ontology.Namespaces.n_0.compartments.List.length) : 100; 
        //add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', nsProc, new_diagram_id, diagram_type._id, ns_element, ns_type._id, false)
        list.element_id = ns_element;
        list.element_type_id = ns_type._id;
        add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', {cut:false}, false)

        // Class part 
		let class_type = ElementTypes.findOne({name: "Class", diagramTypeId: diagram_type._id});
		if (!class_type) {
			console.error("No Class type");
			return;
		}

        list.element_type_id = class_type._id;
		_.each(ontology.Class, function(item, key) {

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let class_style = class_type["styles"][0];
            let class_style_old = class_type["styles"].find(function(s){ return s.name == item.compartments.TypeOld});
            let class_style_new = class_type["styles"].find(function(s){ return s.name == item.compartments.TypeNew});
            if ( class_style_old != undefined )
                class_style = class_style_old; 
            if ( class_style_new != undefined )
                class_style = class_style_new; 

			let object = {diagramId: new_diagram_id,
							type: "Box",
							location: {x: 10, y: 10, width: 5, height: 5},
							styleId: class_style["id"],
							style: class_style,
							elementTypeId: class_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_box_id = Elements.insert(object);
			element_map[key] = new_box_id;
            list.element_id = new_box_id;

			add_class_compartments(list, item);
		});

		// Gen part
		let gen_type = ElementTypes.findOne({name: "Generalization", diagramTypeId: diagram_type._id});
		if (!gen_type) {
			console.error("No Gen type");
			return;
		}

		let gen_style = gen_type["styles"][0];
        let gen_layoutSettings = ( gen_type.layoutSettings != undefined) ?  gen_type.layoutSettings : {};

		_.each(ontology.Generalization, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 20, 20, 20],
                            startElement: element_map[item.target],
							endElement: element_map[item.source],
                            startSides: gen_type.startSides || 4,
                            endSides: gen_type.endSides || 1,
							styleId: gen_style["id"],
							elementTypeId: gen_type._id,
							diagramTypeId: diagram_type._id,
                            style:{
								elementStyle: gen_style.elementStyle,
								startShapeStyle: gen_style.startShapeStyle,
								endShapeStyle: gen_style.endShapeStyle,
								lineType: "Orthogonal",
                            },
                            layoutSettings: gen_layoutSettings,
							projectId: list.projectId,
							versionId: list.versionId,
						};

            let new_gen_id = Elements.insert(object);
			element_map[key] = new_gen_id;  // Priekš kam ?

		});


		// Lines part
		let line_type = ElementTypes.findOne({name: "ObjectProperty", diagramTypeId: diagram_type._id});
		if (!line_type) {
			console.error("No Line type");
			return;
		}
        list.element_type_id = line_type._id;

		let line_style = line_type["styles"][0];
        let line_layoutSettings = ( line_type.layoutSettings != undefined) ?  line_type.layoutSettings : {};
        let cut_info = {cut:false, class_cnt:0, max:5};

		_.each(ontology.ObjectProperty, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 10, 10, 10],
							startElement: element_map[item.source],
							endElement: element_map[item.target],
							styleId: line_style["id"],
                            style:{
								elementStyle: line_style.elementStyle,
								startShapeStyle: line_style.startShapeStyle,
								endShapeStyle: line_style.endShapeStyle,
								lineType: "Orthogonal",
                            },
                            layoutSettings: line_layoutSettings,
							elementTypeId: line_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
            list.element_id = new_line_id;
            element_map[key] = new_line_id;
            cut_info.class_cnt = ontology.Class[item.source].Cnt;
            const lineCompCount = 5;
            cut_info.cut = item.compartments.Name.length > lineCompCount;
            cut_info.max = lineCompCount; 
            add_one_compartment_from_list(list, "Name", item.compartments.Name, '', cut_info);
		});
	},
});

function add_compartment(list, item, diagram_id, diagram_type_id, element_id, element_type_id) {
    // Vecajam Artūra variantam
	let compartments = item.compartments;

	let fill = "";
	let placement = "";
	let value = "";
	if (compartments.string) {
		value = replace_newline(compartments.string);
		placement = "start-left";
		fill = "rgb(65,113,156)";
	}
	else {
		value = replace_newline(compartments.name) + "\n" + replace_newline(compartments.atr_string) + "\n" + replace_newline(compartments.group_string);
		placement = "inside";
		fill = "white";

	}


	let compartment_type = CompartmentTypes.findOne({elementTypeId: element_type_id,});
	if (!compartment_type) {
		console.error("No compartment type");
		return;
	}


	let style_obj = compartment_type["styles"][0];
	let style = style_obj["style"];
	_.extend(style, {placement: placement,
						strokeWidth: "1",
						fill: fill,
					});

	let compart_obj = {diagramId: diagram_id,
						diagramTypeId: diagram_type_id,
						projectId: list.projectId,
						versionId: list.versionId,
						elementId: element_id,
						elementTypeId: element_type_id,
						compartmentTypeId: compartment_type._id,
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: 1,
						input: value,
						value: value,
						valueLC: value,
					};

	Compartments.insert(compart_obj);
}

function add_class_compartments(list, item ) {
	let compartments = item.compartments;

    // Class Name
    add_one_compartment(list, "Name", compartments.Name, compartments.Name)
  
    const outCount = 7;
    const inCount = 5;
    const classCount = 7;
    let cut_info = {cut:false, class_cnt:item.Cnt, max:7};
    if ( item.Cnt < 3 ) { // TODO Tāda ne pārāk smuka cīņa ar mazajām daudzpropertiju klasēm
        cut_info.class_cnt = 3;
    }

    // Attributes
    if ( compartments.AttributesT.out.length > 0 ) {
        cut_info.cut = compartments.AttributesT.out.length > outCount;
        cut_info.max = outCount; 
        add_one_compartment_from_list(list, "PropOut", compartments.AttributesT.out, '', cut_info)
    }
    if ( compartments.AttributesT.in.length > 0 ) {
        cut_info.cut = compartments.AttributesT.in.length > inCount;
        cut_info.max = inCount; 
        add_one_compartment_from_list(list, "PropIn", compartments.AttributesT.in, '<- ', cut_info)
    }
    if ( compartments.AttributesT.c.length > 0 ) {
        cut_info.cut = compartments.AttributesT.c.length > inCount;
        cut_info.max = inCount; 
        add_one_compartment_from_list(list, "PropC", compartments.AttributesT.c, '<> ', cut_info)
    }

    //SubClasses
    if ( compartments.ClassList.length > 0 ) {
        cut_info.cut = compartments.ClassList.length > classCount;
        cut_info.max = classCount; 
        add_one_compartment_from_list(list, "ClassList", compartments.ClassList, '', cut_info);
    }

}

function add_one_compartment_from_list(list, compartmentName, value_list, pref, cut_info, sort = true) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const length = value_list.length;  
    let max_count = value_list.length; 
    if ( !list.compactClassView && compartmentName != 'ClassList')
        cut_info.cut = false; 
    if ( cut_info.cut ) {
        const values75 = value_list.filter(function(v){ return v.cnt > 0.75*cut_info.class_cnt; });
        const values50 = value_list.filter(function(v){ return v.cnt > 0.5*cut_info.class_cnt; });
        //const values10 = value_list.filter(function(v){ return v.cnt > 0.1*cut_info.class_cnt; });
        if ( values75.length > cut_info.max )
            max_count = values75.length;
        else if ( values50.length > cut_info.max )
            max_count = values50.length;
        //else if ( values10.length > cut_info.max )
        //    max_count = values10.length;
        else
            max_count = cut_info.max;

        if ( length - max_count < 3 )
            max_count = length;
    }
 
    if ( max_count < length ) {
        value_list = value_list.slice(0, max_count);
    }
    let value = ( sort ) ? replace_newline(value_list.map(a => `${pref}${a.name}`).sort().join('\n')) : replace_newline(value_list.map(a => `${pref}${a.name}`).join('\n'));
    if ( max_count < length )  value = `${value}\n...(${length-max_count})...`; 

    add_one_compartment(list, compartmentName, input, value);
}

/*
function add_one_compartment_from_list(list, compartmentName, value_list, pref, proc, diagram_id, diagram_type_id, element_id, element_type_id, sort = true) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const max_count = Math.round(value_list.length*proc/100);
    const length = value_list.length;   
    if ( value_list.length < 3 || length-max_count == 1) proc = 100; // TODO šis ir lai nesanāk dīvaini
    if ( proc < 100 ) {
        value_list = value_list.slice(0, max_count);
    }
    let value = ( sort ) ? replace_newline(value_list.map(a => `${pref}${a.name}`).sort().join('\n')) : replace_newline(value_list.map(a => `${pref}${a.name}`).join('\n'));
    if ( proc < 100 )  value = `${value}\n...(${length-max_count})...`; 

    add_one_compartment(list, compartmentName, input, value);
} */

function add_one_compartment(list, compartmentName, input, value) {

	let compartment_type = CompartmentTypes.findOne({elementTypeId: list.element_type_id, name:compartmentName});
	if (!compartment_type) {
		console.error("No compartment type", compartmentName);
		return;
	}

	let style_obj = compartment_type["styles"][0];
	let style = style_obj["style"];

	let compart_obj = {diagramId: list.diagram_id,
						diagramTypeId: list.diagram_type_id,
						projectId: list.projectId,
						versionId: list.versionId,
						elementId: list.element_id,
						elementTypeId: list.element_type_id,
						compartmentTypeId: compartment_type._id,
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: 1,
						input: input,
						value: value,
						valueLC: value,
					};

	Compartments.insert(compart_obj);
}

function replace_newline(str) {
	str = str || "";
	return str.replace(/\\n/g, "\n");
}


