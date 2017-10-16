
SimpleSchema.debug = true
var Schemas = {};

Schemas.Users = new SimpleSchema({
	activeProject: {
        type: String,
        //regEx: SimpleSchema.RegEx.Id or "no-project",
        label: "Users.activeProject",
    },

    activeVersion: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Users.activeProject",
        optional: true,
    },

	email: {
        type: String,
        regEx: SimpleSchema.RegEx.Email,
        max: 40,
        label: "Users.email",
    },

	name: {
        type: String,
        max: 40,
        label: "Users.name",
        optional: true,
    },

	surname: {
        type: String,
        max: 40,
        label: "Users.surname",
        optional: true,
    },

	nameLC: {
        type: String,
        max: 40,
        label: "Users.nameLC",
        optional: true,
    },

	surnameLC: {
        type: String,
        max: 40,
        label: "Users.surnameLC",
        optional: true,
    },

    // secretPhrase: {
    //     type: String,
    //     max: 40,
    //     label: "Users.secretPhrase",
    //     optional: true,
    // },

	profileImage: {
        //type: [Object],
        // blackbox: true,

        // custom: function() {
        //     console.log("custom prfieals ", this);

        // },

       type: String,
        label: "Users.profileImage",
    },

    language: {
        type: String,
        allowedValues: ["lv", "en"],
        label: "Users.language",
    },

	tags: {
        type: [String],
        label: "Users.tags",
    },

    lastModified: {
        type: Date,
        label: "Users.lastModified",
    },

    createdAt: {
        type: Date,
        label: "Users.createdAt",
        denyUpdate: true,
    },

	systemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Users.systemId",
        denyUpdate: true,
    },

    isSystemAdmin: {
        type: Boolean,
        label: "Users.isSystemAdmin",
    },

    logins: {
        type: [Object],
        label: "Users.logins",
    },

    "logins.$.connectionId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Users.logins.$.connectionId",
    },

    "logins.$.userAgent": {
        type: String,
        label: "Users.logins.$.userAgent",
    },

    "logins.$.ipAddress": {
        type: String,
        label: "Users.logins.$.ipAddress",
    },

    "logins.$.loginTime": {
        type: Date,
        label: "Users.logins.$.loginTime",
    },

    "logins.$.logoutTime": {
        type: Date,
        label: "Users.logins.$.logoutTime",
        optional: true,
    },

    loginFails: {
        type: [Object],
        label: "Users.loginFails",
    },

    "loginFails.$.time": {
        type: Date,
        label: "Users.loginFails.$.time",
    },

    "loginFails.$.ipAddress": {
        type: String,
        label: "Users.loginFails.$.ipAddress",
    },

    loginFailsCount: {
        type: Number,
        label: "Users.loginFailsCount",
    },

});
Users.attachSchema(Schemas.Users);

Schemas.Projects = new SimpleSchema({
    createdAt: {
        type: Date,
        label: "Projects.createdAt",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Projects.createdBy",
        denyUpdate: true,
    },

    name: {
        type: String,
        label: "Projects.name",
    },

    icon: {
        type: String,
        label: "Projects.icon",
        optional: true,
    },

    uri: {
        type: String,
        label: "Projects.uri",
        optional: true,
    },

    endpoint: {
        type: String,
        label: "Projects.endpoint",
        optional: true,
    },

		useStringLiteralConversion: {
			  type: String,
			  label: "Projects.useStringLiteralConversion",
			  optional: true,
		},

		queryEngineType: {
			  type: String,
			  label: "Projects.queryEngineType",
			  optional: true,
		},
    useDefaultGroupingSeparator: {
			type: String,
			label: "Projects.useDefaultGroupingSeparator",
			optional: true,
		},

		defaultGroupingSeparator: {
			  type: String,
			  label: "Projects.defaultGroupingSeparator",
			  optional: true,
		},

    category: {
        type: String,
        label: "Projects.category",
        optional: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Projects.toolId",
        // denyUpdate: true,
    },
});
Projects.attachSchema(Schemas.Projects);

Schemas.ProjectsUsers = new SimpleSchema({

    userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsUsers.userSystemId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsUsers.projectId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsUsers.versionId",
        optional: true,
    },

    role: {
        type: String,
        //allowedValues: ["Admin", "Reader"],
        label: "ProjectsUsers.role",
    },

    status: {
        type: String,
        allowedValues: ["Member", "Invited"],
        label: "ProjectsUsers.status",
    },

    invitedBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsUsers.invitedBy",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "ProjectsUsers.createdAt",
        denyUpdate: true,
    },

    modifiedAt: {
        type: Date,
        label: "ProjectsUsers.modifiedAt",
    },

});
ProjectsUsers.attachSchema(Schemas.ProjectsUsers);


Schemas.ProjectsGroups = new SimpleSchema({

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsGroups.projectId",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ProjectsGroups.invitedBy",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "ProjectsGroups.createdAt",
        denyUpdate: true,
    },

    modifiedAt: {
        type: Date,
        label: "ProjectsGroups.modifiedAt",
    },

    name: {
        type: String,
        label: "ProjectsGroups.name",
    },

});
ProjectsGroups.attachSchema(Schemas.ProjectsGroups);


Schemas.UserVersionSettings = new SimpleSchema({
    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserVersionSettings.projectId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserVersionSettings.versionId",
        denyUpdate: true,
    },

    userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserVersionSettings.userSystemId",
        denyUpdate: true,
    },

    view: {
        type: String,
        allowedValues: ["Default", "Tree"],
        label: "UserVersionSettings.view",
    },

    collapsedDiagrams: {
        type: [String],
        label: "UserVersionSettings.collapsedDiagrams",
    },

    "collapsedDiagrams.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserVersionSettings.collapsedDiagrams.$",
    },

    consistencyCheck: {
        type: Boolean,
        label: "UserVersionSettings.consistencyCheck",
    },

    diagramsSortBy: {
        type: String,
        allowedValues: ["alphabetTopDown", "dateTopDown", "popularTopDown"],
        label: "UserVersionSettings.diagramsSortBy",
    },

    diagramsSelectedGroup: {
        type: String,
        label: "UserVersionSettings.diagramsSelectedGroup",
    },

    documentsSortBy: {
        type: String,
        allowedValues: ["alphabetTopDown", "dateTopDown", "popularTopDown"],
        label: "UserVersionSettings.documentsSortBy",
    },

    documentsSelectedGroup: {
        type: String,
        label: "UserVersionSettings.documentsSelectedGroup",
    },

});
UserVersionSettings.attachSchema(Schemas.UserVersionSettings);

Schemas.DiagramNotifications = new SimpleSchema({

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramNotifications.diagramId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramNotifications.projectId",
        denyUpdate: true,
        optional: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramNotifications.toolId",
        denyUpdate: true,
        optional: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramNotifications.versionId",
        denyUpdate: true,
    },

    action: {
        type: String,
        allowedValues: ["added", "resized", "moved", "deleted", "updated", "style"],
        label: "DiagramNotifications.action",
        denyUpdate: true,
    },

    authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramNotifications.authorId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "DiagramNotifications.createdAt",
        denyUpdate: true
    },
});
DiagramNotifications.attachSchema(Schemas.DiagramNotifications);

Schemas.DiagramLogs = new SimpleSchema({

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramLogs.diagramId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramLogs.projectId",
        denyUpdate: true,
        optional: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramLogs.toolId",
        denyUpdate: true,
        optional: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramLogs.versionId",
        denyUpdate: true,
    },

    action: {
        type: String,
        allowedValues: ["added", "resized", "moved", "deleted", "updated", "style"],
        label: "DiagramLogs.action",
        denyUpdate: true,
    },

    actionData: {
        type: Object,
        label: "DiagramLogs.actionData",
        blackbox: true,
    },

    authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramLogs.authorId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "DiagramLogs.createdAt",
        denyUpdate: true
    },
});
DiagramLogs.attachSchema(Schemas.DiagramLogs);

Schemas.Diagrams = new SimpleSchema({

    diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.diagramTypeId",
        // denyUpdate: true,
    },

//if diagram belongs to the project
    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.projectId",
        denyUpdate: true,
        optional: true,
    },

//if diagram is a configurator diagram
    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.toolId",
        // denyUpdate: true,
        optional: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.versionId",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.createdBy",
        denyUpdate: true,
        optional: true,
    },

    createdAt: {
        type: Date,
        label: "Diagrams.createdAt",
        denyUpdate: true,
    },

    name: {
        type: String,
        label: "Diagrams.name",
    },

    editorType: {
        type: String,
        allowedValues: ["ajooEditor", "ZoomChart"],
        label: "Diagrams.editorType",
        denyUpdate: true,
    },

//style
    style: {
        type: Object,
        label: "Diagrams.style",
        blackbox: true,
    },

    "style.fill": {
        type: String,
        label: "Diagrams.style.fill",
    },

    // "style.fillLinearGradientColorStops": {
    //     type: [String],
    //     label: "Diagrams.fillLinearGradientColorStops",
    // },

    "style.fillLinearGradientEndPointX": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillLinearGradientEndPointX",
    },

    "style.fillLinearGradientEndPointY": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillLinearGradientEndPointY",
    },

    "style.fillLinearGradientStartPointX": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillLinearGradientStartPointX",
    },

    "style.fillLinearGradientStartPointY": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillLinearGradientStartPointY",
    },

    "style.fillPriority": {
        type: String,
        allowedValues: ["color", "linear-gradient", "radial-gradient", "pattern"],
        label: "Diagrams.fillPriority",
    },

    // "style.fillRadialGradientColorStops": {
    //     type: [String],
    //     label: "Diagrams.fillRadialGradientColorStops",
    // },  Array[4]

    "style.fillRadialGradientEndPointX": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientEndPointX",
    },

    "style.fillRadialGradientEndPointY": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientEndPointY",
    },

    "style.fillRadialGradientEndRadius": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientEndRadius",
    },

    "style.fillRadialGradientStartPointX": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientStartPointX",
    },

    "style.fillRadialGradientStartPointY": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientStartPointY",
    },

    "style.fillRadialGradientStartRadius": {
        type: Number,
        decimal: true,
        label: "Diagrams.fillRadialGradientStartRadius",
    },

    imageUrl: {
        type: String,
        label: "Diagrams.imageUrl",
    },

    parentDiagrams: {
        type: [String],
        label: "Diagrams.parentDiagrams",
        optional: true,
    },

    "parentDiagrams.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Diagrams.parentDiagrams.$",
    },

    allowedGroups: {
        type: [String],
        label: "Diagrams.allowedGroups",
    },

    seenCount: {
        type: Number,
        label: "Diagrams.seenCount",
    },

    "editingUserId": {
        type: String,
        label: "Diagrams.editingUserId",
        optional: true,
    },

    "editingStartedAt": {
        type: Date,
        label: "Diagrams.editingStartedAt",
        optional: true,
    },

    data: {
        type: Object,
        label: "Diagrams.data",
        optional: true,
        blackbox: true,
    },

});
Diagrams.attachSchema(Schemas.Diagrams);


Schemas.Elements = new SimpleSchema({

    elementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.elementTypeId",
        // denyUpdate: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.diagramId",
        denyUpdate: true,
    },

    diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.diagramTypeId",
        // denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.projectId",
        optional: true,
        denyUpdate: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.toolId",
        optional: true,
        // denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.versionId",
        denyUpdate: true,
    },

    type: {
        type: String,
        allowedValues: ['Box', 'Line'],
        label: "Elements.type",
        denyUpdate: true,
    },

//style
    styleId: {
        type: String,
        label: "Elements.styleId",
    },

    style: {
	 	type: Object,
        label: "Elements.style",
        blackbox: true,
    },

    "style.elementStyle": {
        type: Object,
        label: "Elements.style.elementStyle",
        blackbox: true,
    },

    "style.startShapeStyle": {
        type: Object,
        label: "Elements.style.startShapeStyle",
        blackbox: true,
    },

    "style.endShapeStyle": {
        type: Object,
        label: "Elements.style.endShapeStyle",
        blackbox: true,
    },

    // "style.node": {
    //     type: Object,
    //     label: "Elements.style.node",
    //     blackbox: true,
    // },


    // "style.dash": {
    //     type: [Number],
    //     label: "Diagrams.dash",
    // },

    // "style.dash.$": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.dash.$",
    // },

    // "style.fill": {
    //     type: String,
    //     label: "Diagrams.style.fill",
    // },

    // "style.fillLinearGradientColorStops": {
    //     type: [String],
    //     label: "Diagrams.fillLinearGradientColorStops",
    // },

    // "style.fillLinearGradientEndPointX": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillLinearGradientEndPointX",
    // },

    // "style.fillLinearGradientEndPointY": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillLinearGradientEndPointY",
    // },

    // "style.fillLinearGradientStartPointX": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillLinearGradientStartPointX",
    // },

    // "style.fillLinearGradientStartPointY": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillLinearGradientStartPointY",
    // },

    // "style.fillPriority": {
    //     type: String,
    //     allowedValues: ["color", "linear-gradient", "radial-gradient", "pattern"],
    //     label: "Diagrams.fillPriority",
    // },

    // // "style.fillRadialGradientColorStops": {
    // //     type: [String],
    // //     label: "Diagrams.fillRadialGradientColorStops",
    // // },  Array[4]

    // "style.fillRadialGradientEndPointX": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientEndPointX",
    // },

    // "style.fillRadialGradientEndPointY": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientEndPointY",
    // },

    // "style.fillRadialGradientEndRadius": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientEndRadius",
    // },

    // "style.fillRadialGradientStartPointX": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientStartPointX",
    // },

    // "style.fillRadialGradientStartPointY": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientStartPointY",
    // },

    // "style.fillRadialGradientStartRadius": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.fillRadialGradientStartRadius",
    // },

    // "style.opacity": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.opacity",
    // },

    // "style.shadowBlur": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.shadowBlur",
    // },

    // "style.shadowColor": {
    //     type: String,
    //     label: "Diagrams.shadowColor",
    // },

    // "style.shadowOffsetX": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.shadowOffsetX",
    // },

    // "style.shadowOffsetY": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.shadowOffsetY",
    // },

    // "style.shadowOpacity": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.shadowOpacity",
    // },

    // "style.shape": {
    //     type: String,
    //     label: "Diagrams.shape",
    // },

    // "style.stroke": {
    //     type: String,
    //     label: "Diagrams.stroke",
    // },

    // "style.strokeWidth": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.strokeWidth",
    // },

    // "style.tension": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.tension",
    // },

    // "style.tension": {
    //     type: Number,
    //     decimal: true,
    //     label: "Diagrams.tension",
    // },

    // "style.lineType": {
    //     type: String,
    //     allowedValues: ["Orthogonal", "Direct"],
    //     label: "style.lineType",
    //     optional: true,
    // },

//location for boxes
    location: {
	 	type: Object,
        label: "Elements.location",
        optional: true,
    },

	"location.x": {
		type: Number,
        decimal: true,
        label: "Elements.location.x",
        optional: true,
	},

	"location.y": {
		type: Number,
        decimal: true,
        label: "Elements.location.y",
        optional: true,
	},

	"location.width": {
		type: Number,
        decimal: true,
        label: "Elements.location.width",
        optional: true,
	},

	"location.height": {
		type: Number,
        decimal: true,
        label: "Elements.location.height",
        optional: true,
	},


//points for lines
    points: {
	 	type: [Number],
        label: "Elements.points",
        optional: true,
    },

    "points.$": {
        type: Number,
        decimal: true,
        label: "Elements.points.$",
    },

    swimlane: {
        type: Object,
        label: "Elements.swimlane",
        optional: true,
    },

    "swimlane.horizontalLines": {
        type: [[]],
        label: "Elements.swimlane.horizontalLines",
    },

    "swimlane.horizontalLines.$": {
        type: [Number],
        decimal: true,
        label: "Elements.swimlane.horizontalLines.$",
    },

    "swimlane.verticalLines": {
        type: [[]],
        label: "Elements.swimlane.verticalLines",
    },

    "swimlane.verticalLines.$": {
        type: [Number],
        decimal: true,
        label: "Elements.swimlane.verticalLines.$",
    },

    startElement: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.startElement",
        optional: true,
    },

    endElement: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.endElement",
        optional: true,
    },

    domain: {
        type: Object,
        label: "Elements.domain",
        optional: true,
    },

    "domain.type": {
        type: String,
        allowedValues: ["Specialization", "NewLine", "NewBox"],
        label: "Elements.domain.type",
    },

    "domain.data": {
        type: Object,
        label: "Elements.domain.data",
        blackbox: true,
    },

    "domain.data.diagramTypeId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.domain.data.diagramTypeId",
    },

    "domain.data.startElementTypeId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.domain.data.startElementTypeId",
        optional: true,
    },

    "domain.data.endElementTypeId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.domain.data.endElementTypeId",
        optional: true,
    },

    targetId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.targetId",
        optional: true,
    },

    data: {
        type: Object,
        label: "Elements.data",
        optional: true,
        blackbox: true,
    },

    isInVisible: {
        type: Boolean,
        label: "Elements.isInVisible",
        optional: true,
    },

});
Elements.attachSchema(Schemas.Elements);

Schemas.Compartments = new SimpleSchema({

    compartmentTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.compartmentTypeId",
    },

    elementId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.elementId",
        optional: true,
    },

    elementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.elementTypeId",
        optional: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.diagramId",
    },

    diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.diagramTypeId",
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Elements.projectId",
        optional: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.toolId",
        optional: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Compartmetns.versionId",
    },

    input: {
        type: String,
        label: "Compartmetns.input",
        optional: true,


        //removeEmptyStrings: false,
        //
    },

    value: {
        type: String,
        label: "Compartmetns.value",
        optional: true,


        //removeEmptyStrings: false,
        //
    },

    valueLC: {
        type: String,
        label: "Compartmetns.valueLC",
        optional: true,


        //removeEmptyStrings: false,
        //
    },

    index: {
        type: Number,
        label: "Compartmetns.index",
    },

    style: {
        type: Object,
        label: "Compartmetns.style",
        blackbox: true,
        optional: true,
    },

    styleId: {
        type: String,
        label: "Compartmetns.styleId",
        optional: true,
    },

    isObjectRepresentation: {
        type: Boolean,
        label: "Compartmetns.isObjectRepresentation",
    },

    subCompartments: {
        type: Object,
        label: "Compartments.subCompartments",
        optional: true,
        blackbox: true,
    },

    swimlane: {
        type: Object,
        label: "Compartments.swimlane",
        optional: true,
    },

    "swimlane.row": {
        type: Number,
        label: "Compartments.swimlane.row",
    },

    "swimlane.column": {
        type: Number,
        label: "Compartments.swimlane.column",
    },

    data: {
        type: Object,
        label: "Compartmetns.data",
        optional: true,
        blackbox: true,
    },

});
Compartments.attachSchema(Schemas.Compartments);

Schemas.ElementsSections = new SimpleSchema({

    elementId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.elementId",
        denyUpdate: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.elementId",
        denyUpdate: true,
    },

    documentId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.sectionId",
        denyUpdate: true,
    },

    sectionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.sectionId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.projectId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementsSections.versionId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "ElementsSections.createdAt",
        denyUpdate: true,
    },

    index: {
        type: Number,
        label: "ElementsSections.index",
    },

});
ElementsSections.attachSchema(Schemas.ElementsSections);

Schemas.DiagramFiles = new SimpleSchema({

    elementId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramFiles.elementId",
        denyUpdate: true,
        optional: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramFiles.elementId",
        denyUpdate: true,
    },

    fileId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramFiles.fileId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramFiles.projectId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramFiles.versionId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "DiagramFiles.createdAt",
        denyUpdate: true,
    },

    index: {
        type: Number,
        label: "DiagramFiles.index",
    },

});
DiagramFiles.attachSchema(Schemas.DiagramFiles);

Schemas.Posts = new SimpleSchema({

    text: {
        type: String,
        max: 400,
        label: "Posts.text",
    },

    authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Posts.authorId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Posts.projectId",
        denyUpdate: true,
    },

    likesCount: {
        type: Number,
        label: "Posts.likesCount",
        min: 0,
    },

    createdAt: {
        type: Date,
        label: "Posts.createdAt",
        denyUpdate: true,
    },

    parentId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Posts.parentId",
        optional: true,
        denyUpdate: true,
    },
});
Posts.attachSchema(Schemas.Posts);

Schemas.Likers = new SimpleSchema({

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Likes.projectId",
        denyUpdate: true,
    },

    postId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Likes.postId",
        denyUpdate: true,
    },

    userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Likes.userSystemId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "Likes.createdAt",
        denyUpdate: true,
    },
});
Likers.attachSchema(Schemas.Likers);

Schemas.Notifications = new SimpleSchema({

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Notifications.projectId",
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "Notifications.createdAt",
        denyUpdate: true,
    },

    receiver: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Notifications.receiver",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Notifications.createdBy",
        denyUpdate: true,
    },

    type: {
        type: String,
        allowedValues: ["NewVersion", "DeleteVersion", "PublishVersion", //version values
                        "Invitation", "Removed", "ChangeRole"], //user status in project
        label: "Notifications.type",
        denyUpdate: true,
    },

    status: {
        type: String,
        allowedValues: ["seen", "confirmed", "rejected", "new"],
        label: "Notifications.status",
    },

    data: {
        type: Object,
        label: "Notifications.data",
        denyUpdate: true,
    },

    "data.versionId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Notifications.data.versionId",
        optional: true,
        denyUpdate: true,
    },

    "data.role": {
        type: String,
        //allowedValues: ["Admin", "Reader"],
        label: "Notifications.data.role",
        optional: true,
    },
});
Notifications.attachSchema(Schemas.Notifications);

Schemas.Chats = new SimpleSchema({

	authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Chats.authorId",
        denyUpdate: true,
	},

	createdAt: {
	 	type: Date,
        label: "Chats.date",
        denyUpdate: true,
	},

	messageCount: {
	 	type: Number,
        label: "Chats.messageCount",
	},

	seen: {
	 	type: [String],
        label: "Chats.seen",
	},

	"seen.$": {
       type: String,
       regEx: SimpleSchema.RegEx.Id,
       label: "Chats.seen.$",
	},

	users: {
	 	type: [String],
        label: "Chats.users",
	},

	"users.$": {
       type: String,
       regEx: SimpleSchema.RegEx.Id,
       label: "Chats.users.$",
	},

	lastModified: {
	 	type: Date,
        label: "Chats.lastModified",
	},

	lastMessage: {
	 	type: String,
        label: "Chats.lastMessage",
        optional: true,
        denyInsert: true,
	},

	lastAuthorId: {
	 	type: String,
       	regEx: SimpleSchema.RegEx.Id,
        label: "Chats.lastAuthorId",
        optional: true,
        denyInsert: true,
	},

	messages: {
	 	type: [Object],
        label: "Chats.messages",
	},

	"messages.$.date": {
	 	type: Date,
        label: "ChatMessages.messages.$.date",
	},

	"messages.$.message": {
	 	type: String,
        label: "ChatMessages.$.message",
	},

	"messages.$.sender": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ChatMessages.messages.$.sender",
	},

	messagesLC: {
	 	type: [String],
        label: "Chats.messagesLC",
	},

});
Chats.attachSchema(Schemas.Chats);


Schemas.UserChatsAuthors = new SimpleSchema({

	userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserChatsAuthors.userSystemId",
	},

	users: {
        type: [String],
        label: "UserChatsAuthors.users",
	},

	"users.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserChatsAuthors.users.$",
	},
});
UserChatsAuthors.attachSchema(Schemas.UserChatsAuthors);

Schemas.Contacts = new SimpleSchema({

	userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Contacts.userSystemId",
        denyUpdate: true,
	},

	contactId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Contacts.contactId",
        denyUpdate: true,
	},

});
Contacts.attachSchema(Schemas.Contacts);

Schemas.DocumentTypes = new SimpleSchema({

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DocumentTypes.diagramId",
        denyUpdate: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DocumentTypes.toolId",
        denyUpdate: true,
    },

    name: {
        type: String,
        label: "DocumentTypes.name",
    },

    createdAt: {
        type: Date,
        label: "DocumentTypes.createdAt",
        denyUpdate: true,
    },

    createdBy: {
        type: Date,
        label: "DocumentTypes.createdBy",
        denyUpdate: true,
    },

    index: {
        type: Number,
        label: "DocumentTypes.index",
    },

});


Schemas.DiagramTypes = new SimpleSchema({

    name: {
        type: String,
        label: "DiagramTypes.name",
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramTypes.diagramId",
        optional: true,
        denyUpdate: true,
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramTypes.toolId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramTypes.versionId",
        denyUpdate: true,
    },

    editorType: {
        type: String,
        allowedValues: ["ajooEditor", "ZoomChart"],
        label: "DiagramTypes.editorType",
        denyUpdate: true,
    },

    style: {
        type: Object,
        label: "DiagramTypes.style",
        blackbox: true,
    },

//selection style
    selectionStyle: {
        type: Object,
        label: "DiagramTypes.selectionStyle",
    },

    "selectionStyle.fill": {
        type: String,
        label: "DiagramTypes.selectionStyle.fill",
    },

    "selectionStyle.opacity": {
        type: Number,
        decimal: true,
        label: "DiagramTypes.selectionStyle.opacity",
    },

    "selectionStyle.stroke": {
        type: String,
        label: "DiagramTypes.selectionStyle.stroke",
    },

    "selectionStyle.strokeWidth": {
        type: Number,
        decimal: true,
        label: "DiagramTypes.selectionStyle.strokeWidth",
    },

    palette: {
        type: Object,
        label: "DiagramTypes.palette",
        optional: true,
    },

    "palette.padding": {
        type: Number,
        label: "DiagramTypes.palette.padding",
        optional: true,
    },

    "palette.buttonWidth": {
        type: Number,
        label: "DiagramTypes.palette.buttonWidth",
        optional: true,
    },

    "palette.buttonHeight": {
        type: Number,
        label: "DiagramTypes.palette.buttonHeight",
        optional: true,
    },

    toolbar: {
        type: [Object],
        label: "DiagramTypes.toolbar",
    },

    "toolbar.$.id": {
        type: String,
        label: "DiagramTypes.toolbar.$.id",
    },

    "toolbar.$.icon": {
        type: String,
        label: "DiagramTypes.toolbar.$.icon",
    },

    "toolbar.$.name": {
        type: String,
        label: "DiagramTypes.toolbar.$.name",
    },

    "toolbar.$.procedure": {
        type: String,
        label: "DiagramTypes.toolbar.$.procedure",
    },

    "toolbar.$.template": {
        type: String,
        label: "DiagramTypes.toolbar.$.template",
        optional: true,
    },

    readModeToolbar: {
        type: [Object],
        label: "DiagramTypes.readModeToolbar",
    },

    "readModeToolbar.$.id": {
        type: String,
        label: "DiagramTypes.readModeToolbar.$.id",
    },

    "readModeToolbar.$.icon": {
        type: String,
        label: "DiagramTypes.readModeToolbar.$.icon",
    },

    "readModeToolbar.$.name": {
        type: String,
        label: "DiagramTypes.readModeToolbar.$.name",
    },

    "readModeToolbar.$.procedure": {
        type: String,
        label: "DiagramTypes.readModeToolbar.$.procedure",
    },

    "readModeToolbar.$.isInEditableVersion": {
        type: Boolean,
        label: "DiagramTypes.readModeToolbar.$.isInEditableVersion",
    },

    "readModeToolbar.$.isForAdminOnly": {
        type: Boolean,
        label: "DiagramTypes.readModeToolbar.$.isForAdminOnly",
    },

    "readModeToolbar.$.template": {
        type: String,
        label: "DiagramTypes.readModeToolbar.$.template",
        optional: true,
    },

    readModeNoCollectionKeyStrokes: {
        type: [Object],
        label: "DiagramTypes.readModeNoCollectionKeyStrokes",
        blackbox: true,
    },

    readModeCollectionKeyStrokes: {
        type: [Object],
        label: "DiagramTypes.readModeCollectionKeyStrokes",
        blackbox: true,
    },

    readModeNoCollectionContextMenu: {
        type: [Object],
        label: "DiagramTypes.readModeNoCollectionContextMenu",
        blackbox: true,
    },

    readModeCollectionContextMenu: {
        type: [Object],
        label: "DiagramTypes.readModeCollectionContextMenu",
        blackbox: true,
    },

    noCollectionContextMenu: {
        type: [Object],
        label: "DiagramTypes.noCollectionContextMenu",
        blackbox: true,
    },

    noCollectionKeyStrokes: {
        type: [Object],
        label: "DiagramTypes.noCollectionKeyStrokes",
        blackbox: true,
    },

    collectionContextMenu: {
        type: [Object],
        label: "DiagramTypes.collectionContextMenu",
        blackbox: true,
    },

    collectionKeyStrokes: {
        type: [Object],
        label: "DiagramTypes.collectionKeyStrokes",
        blackbox: true,
    },

//global key strokes
    globalKeyStrokes: {
        type: [Object],
        label: "DiagramTypes.globalKeyStrokes",
        blackbox: true,
    },

    "globalKeyStrokes.$.keyStroke": {
        type: String,
        label: "DiagramTypes.globalKeyStrokes.$.item",
    },

    "globalKeyStrokes.$.procedure": {
        type: String,
        optional: true,
        label: "DiagramTypes.globalKeyStrokes.$.procedure",
    },

//extension points
    extensionPoints: {
        type: [Object],
        label: "DiagramTypes.extensionPoints",
    },

    "extensionPoints.$.extensionPoint": {
        type: String,
        allowedValues: ["beforeCreateDiagram", "afterCreateDiagram", "createDiagram",
                        "beforeDeleteCollection", "afterDeleteCollection", "deleteCollection",
                        "beforeCopyCollection", "afterCopyCollection", "copyCollection",
                        "dynamicCollectionContextMenu", "dynamicReadModeCollectionContextMenu",
                        "dynamicNoCollectionContextMenu", "dynamicReadModeNoCollectionContextMenu",
                        "cutCollection", "pasteCollection",
                        "beforeDeleteDiagram", "afterDeleteDiagram", "deleteDiagram",
                        "updateDiagram", "changeCollectionPosition", "canvasToImage",
                        ],
        label: "DiagramTypes.extensionPoints.$.extensionPoint",
    },

    "extensionPoints.$.procedure": {
        type: String,
        optional: true,
        label: "DiagramTypes.extensionPoints.$.procedure",
    },

    createdAt: {
        type: Date,
        label: "DiagramTypes.createdAt",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DiagramTypes.createdBy",
        denyUpdate: true,
    },

    size: {
        type: Object,
        label: "DiagramTypes.size",
    },

    "size.diagramSize": {
        type: Number,
        min: 1,
        max: 11,
        label: "DiagramTypes.size.diagramSize",
    },

    "size.dialogSize": {
        type: Number,
        min: 1,
        max: 11,
        label: "DiagramTypes.size.dialogSize",
    },

    layout: {
        type: Object,
        label: "DiagramTypes.layout",
        optional: true,
    },

//zoomchart layout
    "layout.mode": {
        type: String,
        allowedValues: ["dynamic", "static", "radial"],
        label: "DiagramTypes.layout.mode",
    },

    "layout.nodeSpacing": {
        type: Number,
        min: 0,
        label: "DiagramTypes.layout.nodeSpacing",
    },

    "layout.layoutFreezeTimeout": {
        type: Number,
        label: "DiagramTypes.layout.layoutFreezeTimeout",
    },

    "layout.globalLayoutOnChanges": {
        type: Boolean,
        label: "DiagramTypes.layout.globalLayoutOnChanges",
    },

//ajoo layout
    "layout.lineLayoutMode": {
        type: String,
        allowedValues: ["lineOrientedFlow", "processOrientedFlow", "owlGrEdLayout"],
        label: "DiagramTypes.layout.lineMode",
        optional: true,
    },

    data: {
        type: Object,
        blackbox: true,
        optional: true,
    },

});
DiagramTypes.attachSchema(Schemas.DiagramTypes);


Schemas.ElementTypes = new SimpleSchema({

	toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.toolId",
        denyUpdate: true,
	},

	versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.versionId",
        denyUpdate: true,
	},

	diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.diagramTypeId",
        denyUpdate: true,
	},

	diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.diagramId",
        optional: true,
	},

	elementId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.elementId",
        optional: true,
	},

    isAbstract: {
        type: Boolean,
        label: "ElementTypes.isAbstract",
    },

    targetDiagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.targetDiagramTypeId",
        optional: true,
    },

    superTypeIds: {
        type: [String],
        label: "ElementTypes.superTypeIds",
    },

    "superTypeIds.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.superTypeIds.$",
    },

    startElementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.startElementTypeId",
        optional: true,
    },

    endElementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.endElementTypeId",
        optional: true,
    },

    contextMenu: {
        type: [Object],
        label: "ElementTypes.contextMenu",
    },

    "contextMenu.$.item": {
        type: String,
        label: "ElementTypes.contextMenu.$.item",
    },

    "contextMenu.$.procedure": {
        type: String,
        label: "ElementTypes.contextMenu.$.procedure",
    },

    "contextMenu.$.template": {
        type: String,
        label: "ElementTypes.contextMenu.$.template",
        optional: true,
    },

    readModeContextMenu: {
        type: [Object],
        label: "ElementTypes.readModeContextMenu",
    },

    "readModeContextMenu.$.item": {
        type: String,
        label: "ElementTypes.readModeContextMenu.$.item",
    },

    "readModeContextMenu.$.procedure": {
        type: String,
        label: "ElementTypes.readModeContextMenu.$.procedure",
    },

    "readModeContextMenu.$.template": {
        type: String,
        label: "ElementTypes.readModeContextMenu.$.template",
        optional: true,
    },

    keyStrokes: {
        type: [Object],
        label: "ElementTypes.keyStrokes",
    },

    "keyStrokes.$.keyStroke": {
        type: String,
        label: "ElementTypes.keyStrokes.$.keyStroke",
    },

    "keyStrokes.$.procedure": {
        type: String,
        label: "ElementTypes.keyStrokes.$.procedure",
    },

    readModeKeyStrokes: {
        type: [Object],
        label: "ElementTypes.readModeKeyStrokes",
		optional: true,
    },

    "readModeKeyStrokes.$.keyStroke": {
        type: String,
        label: "ElementTypes.readModeKeyStrokes.$.keyStroke",
    },

    "readModeKeyStrokes.$.procedure": {
        type: String,
        label: "ElementTypes.readModeKeyStrokes.$.procedure",
    },

    extensionPoints: {
        type: [Object],
        label: "ElementTypes.extensionPoints",
    },

    "extensionPoints.$.extensionPoint": {
        type: String,
        allowedValues: ["beforeCreateElement", "afterCreateElement","createElement",
                        "resizeElement", "dynamicReadModeContextMenu", "dynamicContextMenu",
                        "procCopied", "procDeleteElement"
                        ],
        label: "ElementTypes.extensionPoints.$.extensionPoint",
    },

    "extensionPoints.$.procedure": {
        type: String,
        label: "ElementTypes.extensionPoints.$.procedure",
        optional: true,
    },

    name: {
        type: String,
        label: "ElementTypes.name",
    },

    type: {
        type: String,
        allowedValues: ["Box", "Line"],
        label: "ElementTypes.type",
    },

    direction: {
        type: String,
        allowedValues: ["Directional", "BiDirectional", "ReverseDirectional"],
        label: "ElementTypes.direction",
        optional: true,
    },

    lineType: {
        type: String,
        allowedValues: ["Orthogonal", "Direct"],
        label: "ElementTypes.lineType",
        optional: true,
    },

    "defaultFixedSize": {
        type: Object,
        label: "ElementTypes.defaultFixedSize",
        optional: true,
    },

    "defaultFixedSize.defaultFixedWidth": {
        type: Number,
        label: "ElementTypes.defaultFixedSize.defaultFixedWidth",
        optional: true,
    },

    "defaultFixedSize.defaultFixedHeight": {
        type: Number,
        label: "ElementTypes.defaultFixedSize.defaultFixedHeight",
        optional: true,
    },

    styles: {
        type: [Object],
        label: "ElementTypes.styles",
    },

    "styles.$.id": {
        type: String,
        //regEx: SimpleSchema.RegEx.Id,
        label: "ElementTypes.styles.$.id",
    },

    "styles.$.name": {
        type: String,
        label: "ElementTypes.styles.$.name",
    },

    "styles.$.elementStyle": {
        type: Object,
        label: "ElementTypes.styles.$.elementStyle",
        blackbox: true,
    },

    "styles.$.startShapeStyle": {
        type: Object,
        label: "ElementTypes.styles.$.startShapeStyle",
        blackbox: true,
        optional: true,
    },

    "styles.$.endShapeStyle": {
        type: Object,
        label: "ElementTypes.styles.$.endShapeStyle",
        blackbox: true,
        optional: true,
    },

    swimlane: {
        type: Object,
        label: "ElementTypes.swimlane",
        optional: true,
    },

    "swimlane.horizontalLines": {
        type: [[]],
        label: "ElementTypes.swimlane.horizontalLines",
    },

    "swimlane.horizontalLines.$": {
        type: [Number],
        decimal: true,
        label: "ElementTypes.swimlane.horizontalLines.$",
    },

    "swimlane.verticalLines": {
        type: [[]],
        label: "ElementTypes.swimlane.verticalLines",
    },

    "swimlane.verticalLines.$": {
        type: [Number],
        decimal: true,
        label: "ElementTypes.swimlane.verticalLines.$",
    },

    data: {
        type: Object,
        blackbox: true,
        optional: true,
    },

});
ElementTypes.attachSchema(Schemas.ElementTypes);

Schemas.CompartmentTypes = new SimpleSchema({

	toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.toolId",
        denyUpdate: true,
	},

	versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.versionId",
        denyUpdate: true,
	},

    dialogTabId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.dialogTypeId",
        optional: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.diagramId",
        optional: true,
        denyUpdate: true,
    },

	diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.diagramTypeId",
        denyUpdate: true,
	},

	elementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.elementTypeId",
        denyUpdate: true,
        optional: true,
	},

    elementId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.elementId",
        denyUpdate: true,
        optional: true,
    },

    name: {
        type: String,
        label: "CompartmentTypes.name",
        optional: true,
    },

    description: {
        type: String,
        label: "CompartmentTypes.description",
        optional: true,
    },

    index: {
        type: Number,
        label: "CompartmentTypes.index",
    },

    tabIndex: {
        type: Number,
        label: "CompartmentTypes.tabIndex",
    },

    defaultValue: {
        type: String,
        label: "CompartmentTypes.name",
        optional: true,
    },

    prefix: {
        type: String,
        label: "CompartmentTypes.prefix",
        optional: true,


    },

    suffix: {
        type: String,
        label: "CompartmentTypes.suffix",
        optional: true,


    },

    concatStyle: {
        type: String,
        label: "CompartmentTypes.concatStyle",
        optional: true,

    },

    subCompartmentTypes: {
        type: [Object],
        label: "CompartmentTypes.subCompartmentTypes",
        optional: true,
        blackbox: true,
    },

    styles: {
        type: [Object],
        label: "CompartmentTypes.styles",
        optional: true, //no style for diagram types
    },

    "styles.$.id": {
        type: String,
       // regEx: SimpleSchema.RegEx.Id,
        label: "CompartmentTypes.styles.$.id",
    },

    "styles.$.name": {
        type: String,
        label: "CompartmentTypes.styles.$.name",
    },

    "styles.$.style": {
        type: Object,
        label: "CompartmentTypes.styles.$.style",
        blackbox: true,
    },

    "styles.$.style.placement": {
        type: String,
        allowedValues: ["start-left", "start-right", "middle-left", "middle-right",
                        "end-left", "end-right", "middle", "inside",
                    ],
        label: "CompartmentTypes.styles.$.style.placement",
    },

    "styles.$.style.align": {
        type: String,
        allowedValues: ["left", "center", "right"],
        label: "CompartmentTypes.styles.$.style.align",
    },

    "styles.$.style.fontFamily": {
        type: String,
        //allowedValues: ["arial"],
        label: "CompartmentTypes.styles.$.style.fontFamily",
    },

    "styles.$.style.fontSize": {
        type: Number,
        label: "CompartmentTypes.styles.$.style.fontSize",
    },

    "styles.$.style.fontStyle": {
        type: String,
        allowedValues: ["normal", "bold", "italic"],
        label: "CompartmentTypes.styles.$.style.fontStyle",
    },

    "styles.$.style.fontVariant": {
        type: String,
        allowedValues: ["normal", "small-caps"],
        label: "CompartmentTypes.styles.$.style.fontVariant",
    },

    "styles.$.style.fill": {
        type: String,
        label: "CompartmentTypes.styles.$.style.fill",
    },

    "styles.$.style.padding": {
        type: Number,
        label: "CompartmentTypes.styles.$.style.padding",
    },

    "styles.$.style.visible": {
        type: Boolean,
        label: "CompartmentTypes.styles.$.style.visible",
    },

    inputType: {
        type: Object,
        label: "CompartmentTypes.inputType",
    },

    "inputType.type": {
        type: String,
        allowedValues: ["input", "textarea", "no input", "selection", "checkbox", "combobox", "radio", "custom", "cloudFiles"],
        label: "CompartmentTypes.inputType.type",
    },

    "inputType.inputType": {
        type: String,
        allowedValues: ["text", "number", "url", "email", "datetime", "password", "color"],
        label: "CompartmentTypes.inputType.inputType",
        optional: true,
    },

    "inputType.rows": {
        type: Number,
        label: "CompartmentTypes.inputType.rows",
        optional: true,
    },

    "inputType.placeholder": {
        type: String,
        label: "CompartmentTypes.placeholder",
        optional: true,
    },

    "inputType.values": {
        type: [Object],
        label: "CompartmentTypes.values",
        optional: true,
    },

    "inputType.values.$.input": {
        type: String,
        label: "CompartmentTypes.values.$.input",
        optional: true,
    },

    "inputType.values.$.value": {
        type: String,
        label: "CompartmentTypes.values.$.value",
        optional: true,
    },

    "inputType.values.$.elementStyle": {
        type: String,
        label: "CompartmentTypes.values.$.elementStyle",
    },

    "inputType.values.$.compartmentStyle": {
        type: String,
        label: "CompartmentTypes.values.$.compartmentStyle",
    },

    "inputType.templateName": {
        type: String,
        label: "CompartmentTypes.inputType.templateName",
        optional: true,
    },

    extensionPoints: {
        type: [Object],
        label: "CompartmentTypes.extensionPoints",
    },

    "extensionPoints.$.extensionPoint": {
        type: String,
        allowedValues: ["beforeUpdate", "update", "afterUpdate", "dynamicPrefix",
                        "dynamicDefaultValue", "dynamicSuffix", "dynamicDropDown"],
        label: "CompartmentTypes.extensionPoints.$.extensionPoint",
    },

    "extensionPoints.$.procedure": {
        type: String,
        optional: true,
        label: "CompartmentTypes.extensionPoints.$.procedure",
    },

    isObjectRepresentation: {
        type: Boolean,
        label: "CompartmentTypes.isObjectRepresentation",
    },

    noRepresentation: {
        type: Boolean,
        label: "CompartmentTypes.noRepresentation",
    },

    swimlane: {
        type: Object,
        label: "CompartmentTypes.swimlane",
        optional: true,
    },

    "swimlane.row": {
        type: Number,
        label: "CompartmentTypes.swimlane.row",
    },

    "swimlane.column": {
        type: Number,
        label: "CompartmentTypes.swimlane.column",
    },

    data: {
        type: Object,
        blackbox: true,
        optional: true,
    },

});
CompartmentTypes.attachSchema(Schemas.CompartmentTypes);


Schemas.DialogTabs = new SimpleSchema({

	toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DialogTabs.toolId",
        denyUpdate: true,
	},

	versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DialogTabs.versionId",
        denyUpdate: true,
	},

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DialogTabs.diagramId",
        denyUpdate: true,
    },

	diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DialogTabs.diagramTypeId",
        denyUpdate: true,
	},

	elementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "DialogTabs.elementTypeId",
        denyUpdate: true,
        optional: true,
	},

	name: {
        type: String,
        label: "DialogTabs.name",
	},

    index: {
        type: Number,
        label: "DialogTabs.index",
    },

    type: {
        type: String,
        allowedValues: ["diagramAccordion", "diagramStyle",
                        "sectionsTemplate", "elementStyleAccordion"],
        label: "DialogTabs.type",
        optional: true,
        denyUpdate: true,
    },
});
DialogTabs.attachSchema(Schemas.DialogTabs);

Schemas.PaletteButtons = new SimpleSchema({

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "PaletteButtons.toolId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "PaletteButtons.versionId",
        denyUpdate: true,
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "PaletteButtons.diagramId",
        optional: true,
        denyUpdate: true,
    },

    diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "PaletteButtons.diagramTypeId",
        denyUpdate: true,
    },

    elementTypeIds: {
        type: [String],
        label: "PaletteButtons.elementTypeId",
        denyUpdate: true,
    },

    "elementTypeIds.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "PaletteButtons.elementTypeIds.$",
    },

    name: {
        type: String,
        label: "PaletteButtons.name",
    },

    type: {
        type: String,
        allowedValues: ["Box", "Line"],
        label: "PaletteButtons.type",
    },

    index: {
        type: Number,
        label: "PaletteButtons.index",
    },

});
PaletteButtons.attachSchema(Schemas.PaletteButtons);


Schemas.Clipboard = new SimpleSchema({

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.projectId",
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.versionId",
    },

    // toolId: {
    //     type: String,
    //     regEx: SimpleSchema.RegEx.Id,
    //     label: "Clipboard.toolId",
    // },

    // toolVersionId: {
    //     type: String,
    //     regEx: SimpleSchema.RegEx.Id,
    //     label: "Clipboard.toolVersionId",
    // },

    // diagramTypeId: {
    //     type: String,
    //     regEx: SimpleSchema.RegEx.Id,
    //     label: "Clipboard.diagramTypeId",
    // },

    userId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.userId",
    },

    diagramId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.diagramId",
    },

    elements: {
        type: [String],
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.elements",
    },

    "elements.$": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Clipboard.elements.$",
    },

    // readModeToolbar: {
    //     type: [Object],
    //     label: "DiagramTypes.readModeToolbar",
    // },

    // "elements.$.id": {
    //     type: String,
    //     label: "DiagramTypes.readModeToolbar.$.id",
    // },

    // "elements.$.icon": {
    //     type: String,
    //     label: "DiagramTypes.readModeToolbar.$.icon",
    // },

    count: {
        type: Number,
        label: "Clipboard.count",
    },

    leftPoint: {
        type: Object,
        label: "Clipboard.leftPoint",
    },

    "leftPoint.x": {
        type: Number,
        decimal: true,
        label: "Elements.leftPoint.x",
    },

    "leftPoint.y": {
        type: Number,
        decimal: true,
        label: "Elements.leftPoint.y",
    },
});
Clipboard.attachSchema(Schemas.Clipboard);


Schemas.Versions = new SimpleSchema({

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Versions.projectId",
        denyUpdate: true,
    },

    toolVersionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Versions.toolVersionId",
    },

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Versions.toolId",
        // denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Versions.createdBy",
        denyUpdate: true,
    },

    status: {
        type: String,
        allowedValues: ["New", "Published"],
        label: "Versions.status",
    },

    createdAt: {
        type: Date,
        label: "Versions.createdAt",
        denyUpdate: true,
    },

    publishedAt: {
        type: Date,
        label: "Versions.publishedAt",
        optional: true,
        denyInsert: true,
    },

    publishedBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Versions.publishedBy",
        optional: true,
        denyInsert: true,
    },

    comment: {
        type: String,
        label: "Versions.comment",
        optional: true,
        denyInsert: true,
    },
});
Versions.attachSchema(Schemas.Versions);

Schemas.Tools = new SimpleSchema({

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Tools.createdBy",
        optional: true,
        denyUpdate: true,
    },

    createdAt: {
        type: Date,
        label: "Tools.createdAt",
        denyUpdate: true,
    },

    name: {
        type: String,
        label: "Tools.name",
    },

    archive: {
        type: Boolean,
        label: "Tools.archive",
    },

    users: {
        type: Boolean,
        label: "Tools.users",
    },

    analytics: {
        type: Boolean,
        label: "Tools.analytics",
    },

    forum: {
        type: Boolean,
        label: "Tools.forum",
    },

    isConfigurator: {
        type: Boolean,
        label: "Tools.isConfigurator",
        optional: true,
    },

    isDeprecated: {
        type: Boolean,
        label: "Tools.isDeprecated",
        optional: true,
    },

});
Tools.attachSchema(Schemas.Tools);

Schemas.ToolVersions = new SimpleSchema({

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ToolVersions.toolId",
        denyUpdate: true,
    },

    createdBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ToolVersions.createdBy",
        denyUpdate: true,
        optional: true,
    },

    createdAt: {
        type: Date,
        label: "ToolVersions.createdAt",
        denyUpdate: true,
    },

    status: {
        type: String,
        allowedValues: ["New", "Published"],
        label: "ToolVersions.status",
    },

    publishedAt: {
        type: Date,
        label: "ToolVersions.publishedAt",
        optional: true,
        denyInsert: true,
    },

    publishedBy: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ToolVersions.publishedBy",
        optional: true,
        denyInsert: true,
    },

    comment: {
        type: String,
        label: "ToolVersions.comment",
        optional: true,
        denyInsert: true,
    },

});
ToolVersions.attachSchema(Schemas.ToolVersions);

Schemas.ImportedTranslets = new SimpleSchema({

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.toolId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.versionId",
    },

    diagramTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.diagramTypeId",
        denyUpdate: true,
    },

    elementTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.elementTypeId",
        denyUpdate: true,
        optional: true,
    },

    compartmentTypeId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.compartmentTypeId",
        denyUpdate: true,
        optional: true,
    },

    subCompartmentTypeId: {
        type: String,
        //regEx: SimpleSchema.RegEx.Id,
        label: "ImportedTranslets.subCompartmentTypeId",
        denyUpdate: true,
        optional: true,
    },

    extensionPoint: {
        type: String,
        label: "ImportedTranslets.extensionPoint",
        denyUpdate: true,
    },

    procedureName: {
        type: String,
        label: "ImportedTranslets.procedureName",
        denyUpdate: true,
    },

});
ImportedTranslets.attachSchema(Schemas.ImportedTranslets);

Schemas.UserTools = new SimpleSchema({

    toolId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserTools.toolId",
        denyUpdate: true,
    },

    versionId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserTools.versionId",
    },

    userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "UserTools.userSystemId",
        denyUpdate: true,
    },
});
UserTools.attachSchema(Schemas.UserTools);


Schemas.Searches = new SimpleSchema({

    phrase: {
        type: String,
        label: "Searches.phrase",
    },

    type: {
        type: String,
        allowedValues: ["Chats", "Documents", "Diagrams", "Users"],
        label: "Searches.type",
    },

    counter: {
        type: Number,
        label: "Searches.counter",
        optional: true,
    },

//search in chats
    userSystemId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "Searches.userSystemId",
        optional: true,
    },
//end of chats

//search in contacts
    users: {
        type: Object,
        label: "Searches.users",
        blackbox: true,
        optional: true,
    },
//end of search in contacts

//search in project artifacts - documents, diagrams, users

    projectId: {
        type: Object,
        label: "Searches.projectId",
        optional: true,
    },

    versions: {
        type: Object,
        label: "Searches.versions",
        optional: true,
        blackbox: true,
    },

    projects: {
        type: Object,
        label: "Searches.projects",
        optional: true,
        blackbox: true,
    },

    //users Object is already defined

//end of search in project artifacts

});
Searches.attachSchema(Schemas.Searches);

Schemas.ForumPosts = new SimpleSchema({

    title: {
        type: String,
        label: "ForumPosts.title",
        optional: true,
    },

    text: {
        type: String,
        label: "ForumPosts.text",
        optional: true,
    },

    createdAt: {
        type: Date,
        label: "ForumPosts.createdAt",
        denyUpdate: true,
    },

    authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPosts.authorId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPosts.projectId",
        denyUpdate: true,
    },

    tags: {
       type: [String],
       label: "ForumPosts.tags",
    },

    commentsCount: {
        type: Number,
        label: "ForumPosts.commentsCount",
    },

    seenCount: {
        type: Number,
        label: "ForumPosts.seenCount",
    },

    lastSeen: {
        type: Date,
        label: "ForumPosts.lastSeen",
    },
});
ForumPosts.attachSchema(Schemas.ForumPosts);

Schemas.ForumPostComments = new SimpleSchema({

    text: {
        type: String,
        label: "ForumPostComments.text",
    },

    createdAt: {
        type: Date,
        label: "ForumPostComments.createdAt",
    },

    authorId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPostComments.authorId",
        denyUpdate: true,
    },

    forumPostId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPostComments.forumPostId",
        denyUpdate: true,
    },

    projectId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPostComments.projectId",
        denyUpdate: true,
    },

    replies: {
        type: [Object],
        label: "ForumPostComments.replies",
    },

    "replies.$.id": {
        type: String,
        label: "ForumPostComments.replies.$.id",
    },

    "replies.$.authorId": {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        label: "ForumPostComments.replies.$.authorId",
    },

    "replies.$.createdAt": {
        type: Date,
        label: "ForumPostComments.replies.$.createdAt",
    },

    "replies.$.text": {
        type: String,
        label: "ForumPostComments.replies.$.text",
    },
});
ForumPostComments.attachSchema(Schemas.ForumPostComments);
