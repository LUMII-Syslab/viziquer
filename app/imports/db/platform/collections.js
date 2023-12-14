import { Mongo } from 'meteor/mongo';

 
const Users = new Mongo.Collection("Users");

const Projects = new Mongo.Collection("Projects");

const Versions = new Mongo.Collection("Versions");

const Diagrams = new Mongo.Collection("Diagrams");

const UserVersionSettings = new Mongo.Collection("UserVersionSettings");

const DiagramNotifications = new Mongo.Collection("DiagramNotifications");

const DiagramLogs = new Mongo.Collection("DiagramLogs");

const Elements = new Mongo.Collection("Elements");

const Compartments = new Mongo.Collection("Compartments");

const ElementsSections = new Mongo.Collection("ElementsSections");

const DiagramFiles = new Mongo.Collection("DiagramFiles");

const Posts = new Mongo.Collection("Posts");

const Likers = new Mongo.Collection("Likers");

const ProjectsUsers = new Mongo.Collection("ProjectsUsers");

const ProjectsGroups = new Mongo.Collection("ProjectsGroups");

const Notifications = new Mongo.Collection("Notifications");

const Chats = new Mongo.Collection("Chats");

const UserChatsAuthors = new Mongo.Collection("UserChatsAuthors");

const ChatsSettings = new Mongo.Collection("ChatsSettings");

const Contacts = new Mongo.Collection("Contacts");

const Tools = new Mongo.Collection("Tools");

const ToolVersions = new Mongo.Collection("ToolVersions");

const ImportedTranslets = new Mongo.Collection("ImportedTranslets");

const UserTools = new Mongo.Collection("UserTools");

const DiagramTypes = new Mongo.Collection("DiagramTypes");

const ElementTypes = new Mongo.Collection("ElementTypes");

const CompartmentTypes = new Mongo.Collection("CompartmentTypes");

const DialogTabs = new Mongo.Collection("DialogTabs");

const PaletteButtons = new Mongo.Collection("PaletteButtons"); //to diagram type??

const DocumentTypes = new  Mongo.Collection("DocumentTypes");

const Clipboard = new Mongo.Collection("Clipboard");

const ForumPosts = new Mongo.Collection("ForumPosts");

const ForumPostComments = new Mongo.Collection("ForumPostComments");

const ForumPostsCount = new Mongo.Collection("ForumPostsCount");

const ForumPostTags = new Mongo.Collection("ForumPostTags");

//End of DataAnalytics

// client: declare collection to hold count object
const Counts = new Mongo.Collection("counts");

const Searches = new Mongo.Collection("Searches");

const FoundDiagrams = new Mongo.Collection("FoundDiagrams");


export {
	Users,
	Projects,
	Versions,
	Diagrams,
	UserVersionSettings,
	DiagramNotifications,
	DiagramLogs,
	Elements,
	Compartments,
	ElementsSections,
	DiagramFiles,
	Posts,
	Likers,
	ProjectsUsers,
	ProjectsGroups,
	Notifications,
	Chats,
	UserChatsAuthors,
	ChatsSettings,
	Contacts,
	Tools,
	ToolVersions,
	ImportedTranslets,
	UserTools,
	DiagramTypes,
	ElementTypes,
	CompartmentTypes,
	DialogTabs,
	PaletteButtons,
	DocumentTypes,
	Clipboard,
	ForumPosts,
	ForumPostComments,
	ForumPostsCount,
	ForumPostTags,
	Counts,
	Searches,
	FoundDiagrams,
}