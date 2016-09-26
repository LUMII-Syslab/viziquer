

Users = new Mongo.Collection("Users");

Projects = new Mongo.Collection("Projects");

Versions = new Mongo.Collection("Versions");

Diagrams = new Mongo.Collection("Diagrams");

UserVersionSettings = new Mongo.Collection("UserVersionSettings");

DiagramNotifications = new Mongo.Collection("DiagramNotifications");

DiagramLogs = new Mongo.Collection("DiagramLogs");

Elements = new Mongo.Collection("Elements");

Compartments = new Mongo.Collection("Compartments");

ElementsSections = new Mongo.Collection("ElementsSections");

DiagramFiles = new Mongo.Collection("DiagramFiles");

Posts = new Mongo.Collection("Posts");

Likers = new Mongo.Collection("Likers");

ProjectsUsers = new Mongo.Collection("ProjectsUsers");

ProjectsGroups = new Mongo.Collection("ProjectsGroups");

Notifications = new Mongo.Collection("Notifications");

Chats = new Mongo.Collection("Chats");

UserChatsAuthors = new Mongo.Collection("UserChatsAuthors");

ChatsSettings = new Mongo.Collection("ChatsSettings");

Contacts = new Mongo.Collection("Contacts");

Tools = new Mongo.Collection("Tools");

ToolVersions = new Mongo.Collection("ToolVersions");

ImportedTranslets = new Mongo.Collection("ImportedTranslets");

UserTools = new Mongo.Collection("UserTools");

DiagramTypes = new Mongo.Collection("DiagramTypes");

ElementTypes = new Mongo.Collection("ElementTypes");

CompartmentTypes = new Mongo.Collection("CompartmentTypes");

DialogTabs = new Mongo.Collection("DialogTabs");

PaletteButtons = new Mongo.Collection("PaletteButtons"); //to diagram type??

DocumentTypes = new  Mongo.Collection("DocumentTypes");

Clipboard = new Mongo.Collection("Clipboard");

ForumPosts = new Mongo.Collection("ForumPosts");

ForumPostComments = new Mongo.Collection("ForumPostComments");

ForumPostsCount = new Mongo.Collection("ForumPostsCount");

ForumPostTags = new Mongo.Collection("ForumPostTags");


//End of DataAnalytics

// client: declare collection to hold count object
Counts = new Mongo.Collection("counts");

Searches = new Mongo.Collection("Searches");

FoundDiagrams = new Mongo.Collection("FoundDiagrams");


var imageStore = new FS.Store.GridFS("images", {
	 // mongoUrl: 'mongodb://127.0.0.1:27017/ajoo/', // optional, defaults to Meteor's local MongoDB
	//  mongoOptions: {...},  // optional, see note below
	//  transformWrite: myTransformWriteFunction, //optional
	//  transformRead: myTransformReadFunction, //optional
	// maxTries: 1, // optional, default 5
	//  chunkSize: 1024*1024  // optional, default GridFS chunk size in bytes (can be overridden per file).
	                        // Default: 2MB. Reasonable range: 512KB - 4MB
});

Images = new FS.Collection("images", {
  stores: [imageStore]
})


var fileStore = new FS.Store.GridFS("fileObjects", {
	 // mongoUrl: 'mongodb://127.0.0.1:27017/ajoo/', // optional, defaults to Meteor's local MongoDB
	//  mongoOptions: {...},  // optional, see note below
	//  transformWrite: myTransformWriteFunction, //optional
	//  transformRead: myTransformReadFunction, //optional
	// maxTries: 1, // optional, default 5
	//  chunkSize: 1024*1024  // optional, default GridFS chunk size in bytes (can be overridden per file).
	                        // Default: 2MB. Reasonable range: 512KB - 4MB
});

FileObjects = new FS.Collection("fileObjects", {
  stores: [fileStore]
})


// Images = new FS.Collection("images", {
//   stores: [new FS.Store.FileSystem("images", {path: "~/uploads"})]
// });