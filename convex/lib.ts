import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function characterByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return await ctx.db
    .query("characters")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export async function requireCharacter(ctx: QueryCtx | MutationCtx, token: string) {
  const c = await characterByToken(ctx, token);
  if (!c) throw new Error("No character for this session");
  return c;
}
