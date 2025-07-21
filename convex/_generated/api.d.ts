/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analysis from "../analysis.js";
import type * as analysis_action from "../analysis_action.js";
import type * as analysis_example from "../analysis_example.js";
import type * as customRules from "../customRules.js";
import type * as issues from "../issues.js";
import type * as rewrite_action from "../rewrite_action.js";
import type * as scans from "../scans.js";
import type * as test from "../test.js";
import type * as upload from "../upload.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analysis: typeof analysis;
  analysis_action: typeof analysis_action;
  analysis_example: typeof analysis_example;
  customRules: typeof customRules;
  issues: typeof issues;
  rewrite_action: typeof rewrite_action;
  scans: typeof scans;
  test: typeof test;
  upload: typeof upload;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
