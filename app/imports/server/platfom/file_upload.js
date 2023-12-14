
Meteor.methods({

    upsertProfileImage: function(list) {
        var user_id = Meteor.userId();
        if (user_id) {
            var image_id = Images.insert(list.file);
        }
    },

    insertFile: function(list) {

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

            var file_id = CloudFiles.insert(list);

            return file_id;
        }
    },

    removeFile: function(list) {

        var user_id = Meteor.userId();
        if (is_project_version_admin(user_id, list)) {

            var cloud_file = CloudFiles.findOne({projectId: list["projectId"],
                                                  versionId: list["versionId"],
                                                  _id: list["fileId"],
                                                });

            if (cloud_file) {
                var file_obj_id = cloud_file.fileId;

                CloudFiles.remove({projectId: list["projectId"],
                                  versionId: list["versionId"],
                                  _id: list["fileId"],
                                });

                FileObjects.remove({projectId: list["projectId"],
                                    versionId: list["versionId"],
                                    _id: file_obj_id,
                                  });
            }
            
        }
    },

    renameFile: function(list) {

        var user_id = Meteor.userId();
        if (is_project_admin(user_id, list)) {

            CloudFiles.update({_id: list["fileId"], projectId: list["projectId"], versionId: list["versionId"]},
                                {$set: {name: list["name"], fullName: list["fullName"]}});
        }
    },

});

build_file_key = function(list, file_name) {
    return list["projectId"] + "/" + list["versionId"] + "/" + file_name;
}
