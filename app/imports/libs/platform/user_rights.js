// import { Roles } from 'meteor/alanning:roles'
import { Roles } from "meteor/roles";

import { Tools, Users, ProjectsUsers } from "../../db/platform/collections.js";

async function is_power_user(user_id) {
  const role_name = build_power_user_role();
  return await Roles.userIsInRoleAsync(user_id, [role_name]);
}

async function is_project_version_reader(user_id, doc, role) {
  if (!doc) {
    return false;
  }

  if (await is_system_admin(user_id)) {
    return true;
  }

  const proj_id = doc["projectId"];
  const version_id = doc["versionId"];

  if (proj_id && version_id) {
    const roles = [];

    //selecting the user role in the project
    if (!role) {
      const proj_user = await ProjectsUsers.findOneAsync({
        projectId: proj_id,
        userSystemId: user_id,
      });
      if (proj_user) {
        role = proj_user["role"];
      }
    }

    const reader_role = build_project_version_reader_role(
      proj_id,
      version_id,
      role === "Admin" ? "Reader" : role,
    );
    roles.push(reader_role);

    const admin_role = build_project_version_admin_role(proj_id, version_id);
    roles.push(admin_role);

    return await Roles.userIsInRoleAsync(user_id, roles);
  }
}

async function is_project_version_admin(user_id, doc) {
  if (!doc) {
    return false;
  }

  if (await is_system_admin(user_id)) {
    return true;
  }

  if (doc["projectId"]) {
    const admin_role = build_project_version_admin_role(
      doc["projectId"],
      doc["versionId"],
    );
    return await Roles.userIsInRoleAsync(user_id, [admin_role]);
  }
}

//This is to add versionId field in case the doc is from Versions collection
async function is_project_version_admin_for_version(user_id, doc) {
  if (!doc) {
    return false;
  }

  doc["versionId"] = doc["_id"];
  return await is_project_version_admin(user_id, doc);
}

async function is_project_member(user_id, doc) {
  if (!doc) {
    return false;
  }

  if (await is_system_admin(user_id)) {
    return true;
  }

  if (doc["projectId"]) {
    const role_name = build_project_role(doc["projectId"]);
    return await Roles.userIsInRoleAsync(user_id, [role_name]);
  }
}

async function is_project_admin(user_id, doc) {
  if (!doc) {
    return false;
  }

  if (await is_power_user(user_id)) {
    return true;
  }

  //if doc is projectUser object
  if (doc["projectId"]) {
    const role_name = build_project_admin_role(doc["projectId"]);
    return await Roles.userIsInRoleAsync(user_id, [role_name]);
  }

  //if doc is project object
  if (doc["_id"]) {
    const role_name = build_project_admin_role(doc["_id"]);
    return await Roles.userIsInRoleAsync(user_id, [role_name]);
  }
}

//checks if the user is system admin
async function is_system_admin(system_id) {
  const user = await Users.findOneAsync({ systemId: system_id });

  if (user && user["isSystemAdmin"] === true) {
    return true;
  } else {
    return false;
  }
}

function is_author(user_id, doc) {
  if (doc && doc["authorId"] === user_id) {
    return true;
  }
}

function is_logged_in(user_id) {
  if (user_id) {
    return true;
  }
}

function is_id_in_array(id, array_of_ids) {
  return array_of_ids.includes(id);
  // for (var i=0;i<array_of_ids.length;i++) {
  // 	if (array_of_ids[i] === id) {
  // 		return true;
  // 	}
  // }
}

//generating role names
function build_project_role(proj_id) {
  if (proj_id) {
    return "p_" + proj_id;
  }
}

function build_project_admin_role(proj_id) {
  if (proj_id) {
    return "p_admin_" + proj_id;
  }
}

function build_project_version_reader_role(proj_id, version_id, role) {
  if (proj_id && version_id) {
    if (role === "Admin") {
      role = "Reader";
    }

    if (role === "Reader") {
      return "p_reader_" + proj_id + "_" + version_id;
    } else {
      return "p_" + role + "_" + proj_id + "_" + version_id;
    }
  }
}

function build_project_version_admin_role(proj_id, version_id) {
  if (proj_id && version_id) {
    return "p_admin_" + proj_id + "_" + version_id;
  }
}

function build_power_user_role() {
  return "power_user";
}

export {
  is_power_user,
  is_project_version_reader,
  is_project_version_admin,
  is_project_version_admin_for_version,
  is_project_member,
  is_project_admin,
  is_system_admin,
  is_author,
  is_logged_in,
  is_id_in_array,
  build_project_role,
  build_project_admin_role,
  build_project_version_reader_role,
  build_project_version_admin_role,
  build_power_user_role,
};
