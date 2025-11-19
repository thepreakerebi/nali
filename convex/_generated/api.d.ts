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
import type * as functions_lessonPlans_actions_generateLessonPlanStream from "../functions/lessonPlans/actions/generateLessonPlanStream.js";
import type * as functions_lessonPlans_tools_extractResourceContent from "../functions/lessonPlans/tools/extractResourceContent.js";
import type * as functions_lessonPlans_tools_searchCurriculumResources from "../functions/lessonPlans/tools/searchCurriculumResources.js";
import type * as functions_lessonPlans_tools_searchSimilarPlans from "../functions/lessonPlans/tools/searchSimilarPlans.js";
import type * as functions_prompts_lessonPlanGeneration from "../functions/prompts/lessonPlanGeneration.js";
import type * as functions_subjects_mutations from "../functions/subjects/mutations.js";
import type * as functions_subjects_queries from "../functions/subjects/queries.js";
import type * as functions_userProfile_mutations from "../functions/userProfile/mutations.js";
import type * as functions_userProfile_queries from "../functions/userProfile/queries.js";
import type * as functions_utils_auth from "../functions/utils/auth.js";
import type * as functions_utils_embeddings from "../functions/utils/embeddings.js";
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
  "functions/lessonPlans/actions/generateLessonPlanStream": typeof functions_lessonPlans_actions_generateLessonPlanStream;
  "functions/lessonPlans/tools/extractResourceContent": typeof functions_lessonPlans_tools_extractResourceContent;
  "functions/lessonPlans/tools/searchCurriculumResources": typeof functions_lessonPlans_tools_searchCurriculumResources;
  "functions/lessonPlans/tools/searchSimilarPlans": typeof functions_lessonPlans_tools_searchSimilarPlans;
  "functions/prompts/lessonPlanGeneration": typeof functions_prompts_lessonPlanGeneration;
  "functions/subjects/mutations": typeof functions_subjects_mutations;
  "functions/subjects/queries": typeof functions_subjects_queries;
  "functions/userProfile/mutations": typeof functions_userProfile_mutations;
  "functions/userProfile/queries": typeof functions_userProfile_queries;
  "functions/utils/auth": typeof functions_utils_auth;
  "functions/utils/embeddings": typeof functions_utils_embeddings;
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
