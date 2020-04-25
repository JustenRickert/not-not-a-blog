import assert from "assert";
import { ObjectId } from "mongodb";

import { USER_COLLECTION } from "./constant";

export function userInformation(db, { id }) {
  assert(typeof id === "string", "`id` is a string");
  return db
    .collection(USER_COLLECTION)
    .findOne({ _id: new ObjectId(id) }, { projection: { _id: false } });
}

export function saveUser(db, { id, user }) {
  assert(typeof user === "object", "`user` should be complex object");
  return db.collection(USER_COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...user
      }
    },
    { projection: { _id: false } }
  );
}
