import assert from "assert";
import { ObjectId } from "mongodb";

import { INDUSTRIES_STUB } from "../../constant";
import { INDUSTRY_COLLECTION } from "./constant";

export function getIndustries(db, { userId }) {
  const col = db.collection(INDUSTRY_COLLECTION);
  const _id = new ObjectId(userId);
  return col.findOne({ _id }, { projection: { _id: false } }).then(result => {
    if (!result) {
      const now = new Date();
      return col
        .findOneAndUpdate(
          { _id },
          {
            $set: Object.entries(INDUSTRIES_STUB).reduce(
              (industries, [key, stub]) => ({
                ...industries,
                [key]: {
                  ...stub,
                  lastEmployDate: now,
                  lastLayoffDate: now,
                  lastUpdateSupplyDate: now
                }
              }),
              {}
            )
          },
          { upsert: true, returnOriginal: false, projection: { _id: false } }
        )
        .then(result => result.value);
    }
    return result;
  });
}

export function saveIndustry(db, { userId, industryName, industry }) {
  return db
    .collection(INDUSTRY_COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { [industryName]: industry } },
      { projection: { _id: false } }
    );
}

export function saveIndustries(db, { userId, industries }) {
  return db
    .collection(INDUSTRY_COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: industries },
      { projection: { _id: false } }
    );
}
