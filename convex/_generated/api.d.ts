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
import type * as boosterProcessor from "../boosterProcessor.js";
import type * as boosters from "../boosters.js";
import type * as complexes from "../complexes.js";
import type * as crons from "../crons.js";
import type * as leaderboard from "../leaderboard.js";
import type * as resources from "../resources.js";
import type * as resourceUpdater from "../resourceUpdater.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  boosterProcessor: typeof boosterProcessor;
  boosters: typeof boosters;
  complexes: typeof complexes;
  crons: typeof crons;
  leaderboard: typeof leaderboard;
  resources: typeof resources;
  resourceUpdater: typeof resourceUpdater;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
