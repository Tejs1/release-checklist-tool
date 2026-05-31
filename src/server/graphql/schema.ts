import { builder } from "./builder";
// Side-effect imports register object types and Query/Mutation fields on the
// builder before the schema is assembled.
import "./types";
import "./release";

export const schema = builder.toSchema();
