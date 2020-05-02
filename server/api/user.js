import assert from "assert";
import { ObjectId } from "mongodb";

import { USER_DATA_COLLECTION } from "./constant";

export function saveUserData(db, { userId, data }) {
  assert(typeof userId === "string", "`userId` should be a string");
  assert(typeof data === "object", "`userData` should be an object");
  return db
    .collection(USER_DATA_COLLECTION)
    .updateOne({ _id: new ObjectId(userId) }, { $set: data }, { upsert: true });
}

export function getUserData(db, { userId }) {
  assert(typeof userId === "string", "`userId` should be a string");
  return db
    .collection(USER_DATA_COLLECTION)
    .findOne({ _id: new ObjectId(userId) }, { projection: { _id: false } });
}
