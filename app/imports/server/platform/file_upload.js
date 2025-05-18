import { is_project_admin , is_project_version_admin } from '../../libs/platform/user_rights.js'

Meteor.methods({

    upsertProfileImage: async function(list) {
        var user_id = Meteor.userId();
        if (user_id) {
            var image_id = await Images.insertAsync(list.file);
        }
    },

    insertFile: async function(list) {

        var user_id = Meteor.userId();
        if (is_project_admin(user_id, list)) {

            list["createdAt"] = new Date();
            list["authorId"] = user_id;
            list["allowedGroups"] = [];

            if (!list.fullName) {
                console.error("No fullName specified");
                return;
            }

            var res = list.fullName.split(".");
            if (!res) {
                console.error("Error in fullName");
                return;
            }


            list["name"] = res[0];
            list["extension"] = res[1];
            list["fullName"] = list.fullName;
            list["initialName"] = list.fullName;

            var file_id = await CloudFiles.insertAsync(list);

            return file_id;
        }
    },

    removeFile: async function(list) {

        var user_id = Meteor.userId();
        if (is_project_version_admin(user_id, list)) {

            var cloud_file = await CloudFiles.findOneAsync({projectId: list["projectId"],
                                                  versionId: list["versionId"],
                                                  _id: list["fileId"],
                                                });

            if (cloud_file) {
                var file_obj_id = cloud_file.fileId;

                await CloudFiles.removeAsync({projectId: list["projectId"],
                                  versionId: list["versionId"],
                                  _id: list["fileId"],
                                });

                await FileObjects.removeAsync({projectId: list["projectId"],
                                    versionId: list["versionId"],
                                    _id: file_obj_id,
                                  });
            }
            
        }
    },

    renameFile: async function(list) {

        var user_id = Meteor.userId();
        if (is_project_admin(user_id, list)) {

            await CloudFiles.updateAsync({_id: list["fileId"], projectId: list["projectId"], versionId: list["versionId"]},
                                {$set: {name: list["name"], fullName: list["fullName"]}});
        }
    },

});

function build_file_key(list, file_name) {
    return list["projectId"] + "/" + list["versionId"] + "/" + file_name;
}
