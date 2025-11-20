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
import type * as functions_actions_semanticSearch from "../functions/actions/semanticSearch.js";
import type * as functions_classes_mutations from "../functions/classes/mutations.js";
import type * as functions_classes_queries from "../functions/classes/queries.js";
import type * as functions_lessonNotes_actions_generateLessonNote from "../functions/lessonNotes/actions/generateLessonNote.js";
import type * as functions_lessonNotes_actions_generateLessonNoteStream from "../functions/lessonNotes/actions/generateLessonNoteStream.js";
import type * as functions_lessonNotes_actions_updateEmbedding from "../functions/lessonNotes/actions/updateEmbedding.js";
import type * as functions_lessonNotes_mutations from "../functions/lessonNotes/mutations.js";
import type * as functions_lessonNotes_queries from "../functions/lessonNotes/queries.js";
import type * as functions_lessonNotes_tools_searchSimilarNotes from "../functions/lessonNotes/tools/searchSimilarNotes.js";
import type * as functions_lessonPlans_actions_blocknoteAI from "../functions/lessonPlans/actions/blocknoteAI.js";
import type * as functions_lessonPlans_actions_generateLessonPlan from "../functions/lessonPlans/actions/generateLessonPlan.js";
import type * as functions_lessonPlans_actions_generateLessonPlanStream from "../functions/lessonPlans/actions/generateLessonPlanStream.js";
import type * as functions_lessonPlans_actions_updateEmbedding from "../functions/lessonPlans/actions/updateEmbedding.js";
import type * as functions_lessonPlans_mutations from "../functions/lessonPlans/mutations.js";
import type * as functions_lessonPlans_queries from "../functions/lessonPlans/queries.js";
import type * as functions_lessonPlans_tools_extractResourceContent from "../functions/lessonPlans/tools/extractResourceContent.js";
import type * as functions_lessonPlans_tools_searchCurriculumResources from "../functions/lessonPlans/tools/searchCurriculumResources.js";
import type * as functions_lessonPlans_tools_searchSimilarPlans from "../functions/lessonPlans/tools/searchSimilarPlans.js";
import type * as functions_prompts_lessonNoteGeneration from "../functions/prompts/lessonNoteGeneration.js";
import type * as functions_prompts_lessonPlanGeneration from "../functions/prompts/lessonPlanGeneration.js";
import type * as functions_queries_filter from "../functions/queries/filter.js";
import type * as functions_subjects_mutations from "../functions/subjects/mutations.js";
import type * as functions_subjects_queries from "../functions/subjects/queries.js";
import type * as functions_userProfile_mutations from "../functions/userProfile/mutations.js";
import type * as functions_userProfile_queries from "../functions/userProfile/queries.js";
import type * as functions_utils_auth from "../functions/utils/auth.js";
import type * as functions_utils_embeddings from "../functions/utils/embeddings.js";
import type * as functions_utils_errors from "../functions/utils/errors.js";
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
  "functions/actions/semanticSearch": typeof functions_actions_semanticSearch;
  "functions/classes/mutations": typeof functions_classes_mutations;
  "functions/classes/queries": typeof functions_classes_queries;
  "functions/lessonNotes/actions/generateLessonNote": typeof functions_lessonNotes_actions_generateLessonNote;
  "functions/lessonNotes/actions/generateLessonNoteStream": typeof functions_lessonNotes_actions_generateLessonNoteStream;
  "functions/lessonNotes/actions/updateEmbedding": typeof functions_lessonNotes_actions_updateEmbedding;
  "functions/lessonNotes/mutations": typeof functions_lessonNotes_mutations;
  "functions/lessonNotes/queries": typeof functions_lessonNotes_queries;
  "functions/lessonNotes/tools/searchSimilarNotes": typeof functions_lessonNotes_tools_searchSimilarNotes;
  "functions/lessonPlans/actions/blocknoteAI": typeof functions_lessonPlans_actions_blocknoteAI;
  "functions/lessonPlans/actions/generateLessonPlan": typeof functions_lessonPlans_actions_generateLessonPlan;
  "functions/lessonPlans/actions/generateLessonPlanStream": typeof functions_lessonPlans_actions_generateLessonPlanStream;
  "functions/lessonPlans/actions/updateEmbedding": typeof functions_lessonPlans_actions_updateEmbedding;
  "functions/lessonPlans/mutations": typeof functions_lessonPlans_mutations;
  "functions/lessonPlans/queries": typeof functions_lessonPlans_queries;
  "functions/lessonPlans/tools/extractResourceContent": typeof functions_lessonPlans_tools_extractResourceContent;
  "functions/lessonPlans/tools/searchCurriculumResources": typeof functions_lessonPlans_tools_searchCurriculumResources;
  "functions/lessonPlans/tools/searchSimilarPlans": typeof functions_lessonPlans_tools_searchSimilarPlans;
  "functions/prompts/lessonNoteGeneration": typeof functions_prompts_lessonNoteGeneration;
  "functions/prompts/lessonPlanGeneration": typeof functions_prompts_lessonPlanGeneration;
  "functions/queries/filter": typeof functions_queries_filter;
  "functions/subjects/mutations": typeof functions_subjects_mutations;
  "functions/subjects/queries": typeof functions_subjects_queries;
  "functions/userProfile/mutations": typeof functions_userProfile_mutations;
  "functions/userProfile/queries": typeof functions_userProfile_queries;
  "functions/utils/auth": typeof functions_utils_auth;
  "functions/utils/embeddings": typeof functions_utils_embeddings;
  "functions/utils/errors": typeof functions_utils_errors;
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
