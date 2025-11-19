/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as functions_classes_mutations from "../functions/classes/mutations.js";
import type * as functions_classes_queries from "../functions/classes/queries.js";
import type * as functions_subjects_mutations from "../functions/subjects/mutations.js";
import type * as functions_subjects_queries from "../functions/subjects/queries.js";
import type * as functions_userProfile_mutations from "../functions/userProfile/mutations.js";
import type * as functions_userProfile_queries from "../functions/userProfile/queries.js";
import type * as functions_utils_auth from "../functions/utils/auth.js";
import type * as functions_utils_index from "../functions/utils/index.js";
import type * as functions_utils_string from "../functions/utils/string.js";
import type * as http from "../http.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "functions/classes/mutations": typeof functions_classes_mutations;
  "functions/classes/queries": typeof functions_classes_queries;
  "functions/subjects/mutations": typeof functions_subjects_mutations;
  "functions/subjects/queries": typeof functions_subjects_queries;
  "functions/userProfile/mutations": typeof functions_userProfile_mutations;
  "functions/userProfile/queries": typeof functions_userProfile_queries;
  "functions/utils/auth": typeof functions_utils_auth;
  "functions/utils/index": typeof functions_utils_index;
  "functions/utils/string": typeof functions_utils_string;
  http: typeof http;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
