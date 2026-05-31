import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";

import { schema } from "../src/server/graphql/schema";

writeFileSync("schema.graphql", `${printSchema(schema)}\n`);
console.log("Wrote schema.graphql");
