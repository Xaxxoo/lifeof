/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bank from "../bank.js";
import type * as build from "../build.js";
import type * as characters from "../characters.js";
import type * as chat from "../chat.js";
import type * as city from "../city.js";
import type * as crons from "../crons.js";
import type * as dev from "../dev.js";
import type * as feeds from "../feeds.js";
import type * as gigs from "../gigs.js";
import type * as lib from "../lib.js";
import type * as play from "../play.js";
import type * as transit from "../transit.js";
import type * as work from "../work.js";
import type * as world from "../world.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bank: typeof bank;
  build: typeof build;
  characters: typeof characters;
  chat: typeof chat;
  city: typeof city;
  crons: typeof crons;
  dev: typeof dev;
  feeds: typeof feeds;
  gigs: typeof gigs;
  lib: typeof lib;
  play: typeof play;
  transit: typeof transit;
  work: typeof work;
  world: typeof world;
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
