import assert from "assert";
import { ObjectId } from "mongodb";

import { USER_PASSWORD_COLLECTION } from "./constant";

export function authenticateUser(db, { username, password }) {
  assert(typeof username === "string", "`username` should be string");
  assert(typeof password === "string", "`password` should be string");
  return db
    .collection(USER_PASSWORD_COLLECTION)
    .findOne({ username, password })
    .then(result => {
      if (!result) throw { error: "NO_USERNAME_OR_NO_BAD_PASSWORD" };
      return result._id;
    });
}

export function newUser(db, { username, password }) {
  assert(typeof username === "string", "`username` should be string");
  assert(typeof password === "string", "`password` should be string");
  const collection = db.collection(USER_PASSWORD_COLLECTION);
  return collection.findOne({ username }).then(result => {
    if (result) throw { error: "USERNAME_EXISTS_ALREADY" };
    return collection.insertOne({
      username,
      password,
      createdDate: new Date()
    });
  });
}
