import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

if (!global._mongooseConn) {
  global._mongooseConn = mongoose.connect(MONGODB_URI);
}

export const db = global._mongooseConn;
