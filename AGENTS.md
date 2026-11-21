<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Players sign in with an ID card (`profiles.kode_id` + name) through SECURITY DEFINER RPCs, not Cloud Auth; the session is the profile kept in localStorage. Why: the game is intentionally "no email, no password".
- Private chat and friendships are only reachable through SECURITY DEFINER RPCs that check `id + kode_id`; world chat is a public table read limited to the last 24h and pruned on each send. Why: there is no Cloud Auth session to scope RLS by.
- When no player picks the ghost, the room host's client simulates the AI ghost (`BOT_GHOST_ID`) and broadcasts its position like a player. Why: keeps the game serverless and in sync with existing realtime broadcast.
- Character art is SVG strings rendered inline (`CharImg`) with CSS-animated parts (`hm-lid`, `hm-armL/R`, `hm-body`); emotes are CSS classes, not emoji.
