import assert from "assert";
import { ObjectId } from "mongodb";

import { USER_COLLECTION } from "./constant";

export function userInformation(db, { id }) {
  assert(typeof id === "string", "`id` is a string");
  const _id = new ObjectId(id);
  return db
    .collection(USER_COLLECTION)
    .findOne({ _id }, { projection: { _id: false } })
    .then(result => {
      if (!result)
        return db
          .collection(USER_COLLECTION)
          .findOneAndUpdate(
            { _id },
            {
              $set: {
                points: 0,
                population: 100,
                lastSaveDate: new Date()
              }
            },
            {
              upsert: true,
              returnOriginal: false,
              projection: { _id: false }
            }
          )
          .then(result => result.value);
      return result;
    });
}

export function saveUser(db, { id, user }) {
  assert(typeof user === "object", "`user` should be complex object");
  return db.collection(USER_COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: user
    },
    { projection: { _id: false } }
  );
}
