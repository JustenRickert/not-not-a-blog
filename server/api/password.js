import assert from "assert";
import { ObjectId } from "mongodb";

import { USER_PASSWORD } from "./constant";

export function authenticateUser(db, { username, password }) {
  assert(typeof username === "string", "`username` is a string");
  assert(typeof password === "string", "`password` is a string");
  return db
    .collection(USER_COLLECTION)
    .findOne({ username, password })
    .then(result => {
      if (!result) throw { error: "NO_USERNAME_OR_NO_BAD_PASSWORD" };
      return result._id;
    });
}

export function newUser(db, { username, password }) {
  assert(typeof username === "string", "`username` is a string");
  assert(typeof password === "string", "`password` is a string");
  const collection = db.collection(USER_COLLECTION);
  return collection.findOne({ username }).then(result => {
    if (result) throw { error: "USERNAME_EXISTS_ALREADY" };
    return collection.insertOne({
      username,
      password,
      createdDate: new Date()
    });
  });
}
