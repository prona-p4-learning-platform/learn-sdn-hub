# Automata — Decision Log

Decisions taken while reviewing the Automata spec (`docs/superpowers/specs/2026-11-13-automata-design.md`) and its stage plans. The spec, the stage plans and the game design document are updated from this log. Newest entries at the bottom.

Status: **decided** = confirmed by the author; **proposed** = suggested in review, not confirmed yet; **open** = needs a decision.

## 2026-11-26 — Plan review

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 1 | Building cost | Building costs resources. | Player inventory, inventory protocol messages, take/put between player and containers/machines. The server checks and deducts the cost in the same step as placing. Stage 3 builds the mechanism with placeholder costs; Stage 4 sets the real costs once intermediate items exist. Catch-up gains value, because offline production pays for building. |
| 2 | Getting started | **Superseded by #13.** (Was: every player starts with a lowest-tier pickaxe and axe without durability.) | — |
| 3 | Inventory | Per player. A group shares through containers on its plot. | `automata_players.inventory` stays; sharing needs no extra mechanism. |
| 4 | Refund | Removing a building refunds 100 % of its cost. | — |
| 5 | Learning focus | Resource management and bottlenecks. | UI shows per-machine status (working / starved / blocked / unpowered), belt and pipe fill, and a production statistics panel (produced vs. consumed per resource, so metrics go beyond sink deliveries). Recipes use deliberate ratios; belt and pipe tiers act as capacity limits. Power, fluids and gases stay in scope. |
| 6 | Programming | No programming or scripting language in the game. Machines are only configured (recipe choice, splitter filters). | No logic or circuit network. |
| 7 | Camera | First person only. | No overhead build camera. |
| 8 | Belt items | Belts show the items they carry as individual item models (like Satisfactory). | Every item needs a small 3D model, not only an icon. Instanced belt-item rendering stays in Stage 4. |
| 9 | Client simulation | The client only advances belt items locally. Machine and network state come from the server; regular region snapshots correct drift. | Replaces the full client-side simulation replica in spec section *Networking*. Removes the desync at the edge of the subscribed regions (review B1). |
| 10 | Group worlds | **Superseded by #21.** (Was: group numbers can recur across semesters, so the group world id includes the course id.) | — |
| 11 | Schedule and scope | Target: around March 2027. Nothing is cut; the stage order stays. | The review suggestion to reorder stages and cut gases/catch-up is dropped. |
| 12 | Grading | **Superseded by #25.** (Was: grading optional; steps stay as in-game goals with a "Check" button; submit as an optional extra.) | — |

### Open (raised by decision 2)

Questions 1–4 (trees and wood, tool tiers, hand crafting, pickaxe targets) are answered by decisions 13–19 in the next entry.

### Proposed, awaiting confirmation

- *(Confirmed as #50.)* **Game design document** at `docs/automata/game-design.md` (living document, English). Gameplay data (resources, recipes, entities) lives in code in `automata/core/src/catalog/`; the GDD states intent and target numbers and links to it.
- *(Confirmed as #51.)* **Asset layout:** source art in `automata/assets/` (not shipped; `README.md` with conventions, `CREDITS.md` with author and licence per file, `tools/` for dev scripts). Runtime files in `frontend/src/automata/assets/`, loaded through `import.meta.glob(..., { query: "?url", import: "default", eager: true })` for hashed URLs; a vitest test checks that every catalogue id has a model and an icon. Conventions: 1 unit = 1 m = 1 grid cell, +Y up, rotation 0 faces +Z, origin at the bottom centre of the footprint, low-poly with one shared palette texture or vertex colours, about 200 KB per GLB, GLB/PNG/SVG only (no KTX2 or Draco in v1), no Git LFS for now.
- *(Confirmed as #52.)* **Drag placement** for belts, pipes and wires (click the start, click the end) and a build reach of about 20–30 m. The build rate limit counts actions, not entities.

### Review findings to fold into the spec and plans

Before Stage 1 Task 1:

- **A1 Docker builds.** The backend and frontend images build from `./backend` and `./frontend` (`build-push-images.yaml`, both Dockerfiles copy only `package.json` and run `npm install`). Once either depends on `@learn-sdn-hub/automata-core: "*"`, npm looks the name up on the public registry: build failure, or a dependency-confusion install if someone publishes it. Build from the repo root and copy `automata/core`; declare the dependency as `"file:../automata/core"`. The root `Dockerfile` copies only `frontend` and `backend` as well.
- **A2 CI.** The path filters in `ci-checks.yaml` and `build-push-images.yaml` only cover `backend/**` and `frontend/**`. Add `automata/**`, a core + server job, and an `automata-server` image build (Stage 6 Helm references it).
- **A3 Core tsconfig.** Backend `tsc`, ts-jest, ts-node and frontend `tsc` type-check core's sources with their own options (`lib ES2020`; frontend `isolatedModules`). Core uses `lib ES2020` and `isolatedModules: true`, and declares no globals (a `TextEncoder` declaration clashes with the DOM/Node ones).
- **A4 Authorization.** `worldAccess` first checks that the assignment is in the user's filtered assignment list (auth provider chain, as `/api/user/assignments` does); otherwise group and sandbox worlds are open for every game assignment.
- **A5 Courses** (mostly obsolete after #42 and #43: the game no longer looks up courses). `courses.assignments` holds assignment `_id`s, not names (`MongoDBPersister.GetUserAssignments`); `user.courses` holds ObjectIds at runtime despite the `string[]` type; `MemoryPersister.GetAllCourses()` throws "Method not implemented"; courses mode is `BACKEND_ASSIGNMENT_TYPE === "mongodb"`, not "`MONGODB_URL` is set".
- **A6 MongoDB mode.** `MongoDBPersister.LoadEnvironments()` replaces the assignment map with DB documents created via `$setOnInsert`, so the loader validation never runs on them and later file edits never reach them. Validate there as well and document the behaviour.

Design gaps:

- **B1** → decision 9.
- **B2 Plot deposit guarantee.** Guaranteeing resources per plot needs the plot size from `rules`, which contradicts "deposits depend only on template and seed"; the Stage 2 test hard-codes 128 m plots; plots may land on cliffs.
- **B3 Vertical transport** (resolved by #53). Belts and pipes sit only on foundations in v1, extractors on raw terrain, foundations at varying heights, cave deposits below the surface: ramps, lifts or pipe risers are missing. Cave entrances are not guaranteed.
- **B4** → decisions 1–4.
- **B5 World parameter drift.** Freeze template, seed and rules plus a `generatorVersion` in `automata_worlds` at creation; define what happens when the assignment's values differ later.
- **B6** → decision 10. Also reject `:` in game assignment names; renaming an assignment orphans its worlds.
- **B7 Terrain loading.** About 3,200 chunks are in view over the full height range (−160 to +192 m); at 5 ms each that is ~16 s on one worker. Needs a chunk selection rule (surface band plus chunks around the player), a terrain worker pool, and a server-side density cache for movement checks.
- **B8 WebSocket proxy (Stage 1 Task 7).** Buffer browser frames until the upstream connection is open; cap `bufferedAmount`; enforce the 64 KiB limit in the proxy (the shared `WebSocket.Server` uses ws's default `maxPayload` of 100 MiB); check that `:assignment` in the path matches the assignment inside the world id.

Smaller:

- `frontend/src/hooks.ts` parses assignment types with `z.enum`: deploy the frontend before the backend, or make the schema tolerant of unknown types.
- Determinism lint for `src/sim` and `src/grid` too, not only `src/terrain` (ESLint `no-restricted-properties` instead of a grep test).
- Number types explicit: Int32 for per-tick state, safe integers (< 2^53) for counters, metrics and catch-up.
- `Renderer` needs a depth texture, recreated on resize, for the presence boxes in Stage 1 Task 8.
- `AGENTS.md`: add `automata/` to the architecture map; `ci-checks.yaml` exists now (it is still described as planned).

## 2026-11-26 — Gathering, crafting and progression

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 13 | Start | Players start with nothing (supersedes #2). Stones lie on the ground and branches drop wood when collected; both are picked up by hand, and the first tools are crafted by hand from them. Tools have no durability. | Ground pickups (stones, branches) are generated world objects. New player actions: pick up, gather, craft. |
| 14 | Trees | Trees spawn naturally across the world, decided by biome, world settings and seed, and can be harvested for wood. Leaf colour follows the biome; there is only one wood type. | Trees are generated like deposits, but harvesting changes them, so each world stores which trees were harvested (terrain and deposits are still never stored). One tree model with tinted leaves is enough. |
| 15 | Biomes | Worlds have biomes (implied by #14). | New in terrain generation: a biome map from the seed. The spec so far only has the `temperate` template and no biomes. |
| 16 | Crafting | Hand crafting makes basic tools. A workbench, crafted from wood, makes everything beyond that. No other crafting stations; automated production is done by machines. | Workbench is a placeable entity. Recipe table in core gains hand and workbench recipes next to machine recipes. |
| 17 | Harvest tiers | Own tier ladder in the style of modded Minecraft (names and count are our own, nothing copied). Ores are tiered: an ore of tier N is mined with a pickaxe or harvester of the previous tier or higher. | Pickaxes and extractors carry a tier; the server checks the tier for hand gathering and for extractor placement. Tier ladder is a game design document topic. |
| 18 | Unlocks | Obtaining new items unlocks new machines and items. | Recipes need unlock conditions; the client shows what is unlocked. |
| 19 | Pickaxe targets | The pickaxe only works on deposits and on predetermined non-terrain objects (e.g. generated rock formations). Terrain stays non-editable. | Rock formations are generated world objects like trees. |

### Open

5. **Respawn.** Answered by #20.
6. **Unlock scope.** Answered by #47.
7. **Progression across assignments.** Answered by #21.
8. **Biomes.** Answered by #38.
9. **Building over objects.** Answered by #39 and #40.
10. **Tier ladder content.** Start drafted in `docs/automata/game-design.md` (section *Tier ladder*), under review by the author.

### Proposed, awaiting confirmation

- *(Superseded by #49.)* **Stage placement.** Stage 2 generates and renders trees, ground pickups and rock formations together with biomes and deposits. Stage 3 adds inventory, pick up and gathering, hand and workbench crafting, tiers, unlocks and building costs.

## 2026-11-26 — Regrowth and world model

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 20 | Respawn | Trees, ground stones, branches and rock formations do not respawn. Wood is renewable only by planting saplings, which grow into trees. No mechanism for late joiners in a picked-clean world for now (known limitation). | Each world stores planted saplings with their planting time; growth can be computed from that time, so it also works while a world is unloaded, without catch-up. A player who arrives late can still create a fresh world of their own (#21). |
| 21 | World model | Starting the assignment means starting the game. The game opens a main menu where players join an existing world or create their own world, private or public, and invite others into it. Worlds are no longer derived from assignment, course or group (supersedes #10). | Replaces the course / group / sandbox world types and the deterministic world ids in the spec (*World types and ids*, *Access flow*) and Stage 1 Tasks 2, 4, 6 and 8: worlds get generated ids, an owner, a visibility (private / public) and a member list; the start screen becomes a main menu (join, create, invite); new operations create world, invite, change visibility, delete own world. Review B6 (group numbers, `:` in assignment names) no longer applies. Review A4 still applies: only users who can see the game assignment reach the game. Review B5 still applies: world parameters are stored at creation. |

### Open

11. **Saplings.** Answered by #41.
12. **Invites.** Answered by #22.
13. **Public worlds.** Answered by #42.
14. **World creation settings.** Answered by #23.
15. **Rights inside a world.** Answered by #24; team details are open question 20.
16. **What an assignment still carries.** Answered by #25.
17. **Course and group worlds.** Answered by #43.
18. **Limits and cleanup.** Answered by #44.

### Proposed, awaiting confirmation

- *(Confirmed as #48.)* **Where world membership lives.** World metadata (owner, visibility, members, invites) is stored by the world server in `automata_worlds`. The backend stays the only entry point: it checks that the user can see the game assignment and forwards the verified identity; the world server checks membership against its stored metadata. This moves the membership check from the backend to the world server, which changes the spec's rule that all authorization happens in the backend.

## 2026-11-26 — Invites, world settings, teams and goals

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 22 | Invites | Anyone can be invited with an invite code. | No user lists or name search are needed, so no usernames are exposed across courses. "Anyone" still means users who can reach the game (review A4). Codes must be unguessable, and redeeming them must be rate-limited. |
| 23 | World settings | The creator chooses the settings and the seed when creating a world; the seed can also be generated randomly. | The world creation dialog sets seed and settings; the assignment's `game` block no longer provides seed, template or rules. The world server validates settings within fixed bounds (e.g. a maximum world size) so a world cannot exhaust server resources. Settings are stored at creation (review B5). |
| 24 | Rights and teams | *(Plots and claims superseded by #27 and #72; the world owner's full rights now cover every building.)* Plots stay. The world owner has full rights on every plot. Below the owner, a team system with its own team management, in the style of FTB Teams (inspired by, not copied). | Teams replace the platform group as the in-game ownership unit. Needs team management UI and protocol (create team, invite, roles, leave). Details are open question 20. |
| 25 | Goals | Goals (step checks) are an afterthought and probably not needed for the game. A game assignment is an entry point that starts the game, plus its lab sheet (supersedes #12). | `WorldQuery` checks, the goals panel and submit leave the core scope; Stage 6 keeps catch-up, admin, archiving and deployment. The loader no longer needs `WorldQuery` validation for now. Worlds do not belong to an assignment (#21), so several game assignments would lead into the same worlds. Production metrics stay, for the statistics panel (#5). |

### Open

19. **Invite codes.** Answered by #26.
20. **Teams.** Answered by #27; follow-up questions 22–25.
21. **World settings.** Answered by #45.

## 2026-11-26 — Invite codes, teams and claims

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 26 | Invite codes | The world owner and admins create invite codes. Codes are reusable, can be revoked, and expire. | World metadata stores codes with creator, expiry and revoked flag; redeeming checks all three. |
| 27 | Teams and claims | *(Claims superseded by #72.)* Teams exist per world. Roles: one owner, admins, and members. Members claim land. Team owner and admins can unclaim land a member claimed and have full access within the team, except members' private storages. | Land is claimed by area (in the style of FTB Chunks) instead of plots allocated in ring order around spawn as in the spec. Review B2 (per-plot deposit guarantee) no longer applies, because there are no fixed plots. Containers get a private flag that only their owner can open. Needs team and claim management in protocol and UI. |

### Open

22. **Which admins create invite codes.** Answered by #46.
23. **Private storage and the world owner.** Answered by #28; platform admins are open question 26.
24. **Team membership.** Answered by #29.
25. **Claims.** Answered by #30.

### Proposed, awaiting confirmation

- *(Confirmed as #45.)* **World settings (open question 21).** Fixed at creation, stored with a `generatorVersion` (review B5); each option maps to a bounded integer in core so generation stays deterministic:

  | Setting | Options | Default |
  |---|---|---|
  | Seed | text or number; random if left empty (text hashed to an integer in core) | random |
  | World size | small / medium / large (radius 512 / 1024 / 2048 m) | medium |
  | Terrain relief | gentle / normal / rugged | normal |
  | Biome size | small / normal / large | normal |
  | Deposits | sparse / normal / rich | normal |
  | Surface resources (trees, stones, branches, rock formations) | sparse / normal / rich | normal |

  Presets: *Standard*, *Scarce* (sparse deposits and surface resources; stresses resource management) and *Plentiful* (rich; for worlds with many players, since nothing respawns). Changeable later by the world owner: name, visibility, maximum players (up to the server cap). Not exposed as settings: caves (deeper tiers depend on them), recipes, tiers, rates and tick rate (balance and client/server agreement). Server operators bound everything through environment variables: worlds per user, maximum world radius, maximum players per world.
- *(Confirmed as #47, with an addition.)* **Unlock scope (open question 6):** per team.

## 2026-11-26 — Private containers, solo teams and claim rules

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 28 | Private containers | *(A third setting, public, added by #133.)* The world owner's full rights on every plot (#24) do not include containers set to private. | A container is either private or not (corrected from "fully private"; there is only one private level). Private: only the player who owns it can open it, not the team owner or admins, not the world owner. Not private: open to the owner's team. Platform admins: #31; removal: #32. |
| 29 | Solo teams | Every player is always in a team. A player on their own has a solo team, named by default after their username until they rename it. | Team is always set, so ownership never falls back to a single player outside the team model. The solo team persists: claims return to it when a player leaves a team (#30). |
| 30 | Claims | **Superseded by #72.** (Was: a claim is a 32 × 32 m area; the world owner sets the claim limit; a player who leaves their team keeps their claims and buildings in their solo team.) | — |

### Open

26. **Platform admins and private containers.** Answered by #31.
27. **Removing a private container.** Answered by #32.
28. **Joining a team.** Answered by #35.
29. **Other members' buildings on a leaver's claim.** Answered by #36.
30. **Team owner leaving.** Answered by #33; teams without admins are open question 32.
31. **Claim limit unit.** Answered by #34.

### Proposed, awaiting confirmation

- *(Confirmed as #46.)* **World roles vs. team roles (open question 22).** Two separate role sets. World roles: owner, admin, player. Team roles: owner, admin, member (#27). Invite codes let people into the world, so world owner and world admins create them; team admins cannot let strangers into someone else's world. World admins (granted by the world owner) manage access: create and revoke codes, kick, ban. They get no rights on land; full rights on every plot stay with the world owner (#24). Whoever joined with a code stays a world player and rejoins from the menu without a code until removed or banned. A ban is needed because codes are reusable: without it, a kicked player rejoins with the same code. Team invites happen inside the world (the team owner or an admin invites a player who is already in the world; the player accepts), so they need no codes.
- **Container access levels:** replaced by the correction in #28 (only private or not).
- **Claim limit (open question 31):** replaced by #34.

## 2026-11-26 — Moderation, team ownership and claim limits

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 31 | Platform admins and private containers | Platform admins can open private containers but cannot take anything out. | Read-only container view for platform admins. |
| 32 | Removing private containers | The world owner and team admins can remove a private container; its contents are destroyed. | So a private container can never block land permanently. The UI asks for confirmation and names the owner. |
| 33 | Team owner leaving | Team ownership passes to an admin the leaving owner chooses. If they chose nobody, a random admin becomes owner. | Leave dialog for team owners with an admin picker. |
| 34 | Claim limits | **Superseded by #72.** (Was: claim limits per player, per team and per world, set by the world owner within a server cap.) | — |

### Open

32. **Team without admins.** Answered by #37.

### Proposed, awaiting confirmation

- **Claims follow the player who made them (open question 28):** confirmed as #35.
- **Buildings belong to whoever owns the land (open question 29):** confirmed as #36.

## 2026-11-26 — Claim and building ownership

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 35 | Claims follow the player | **Superseded by #72.** (Was: a claim is stored with the player who made it and counts for that player's current team.) | — |
| 36 | Buildings follow the land | **Superseded by #72.** (Was: a building on claimed land belongs to whoever owns that land; a building on unclaimed land belongs to the builder's current team.) | Kept: each building stores the player who built it (#37, #86). |
| 37 | Team without admins | *(Claims part superseded by #72.)* When the team owner leaves and the team has no admins, the team is disbanded: every member returns to their solo team, and their claims go with them (#35). | Buildings on claimed land follow the claims (#36). Buildings the team had on unclaimed land go to the solo team of the player who built them (derived from #36). |

## 2026-11-26 — Remaining questions and proposals

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 38 | Biomes | Five biomes: grassland, forest, highlands, desert, tundra. A biome sets tree density and leaf colour, ground colour, terrain relief, how common each kind of deposit is, and how many stones, branches and rock formations there are. No gameplay effects such as temperature. The spawn point is always in grassland or forest. | Biome map from the seed in core. Uneven deposit distribution makes transport over distance part of the game. The spawn rule prevents a start without branches. |
| 39 | Building over objects | *(Refusal with a full inventory superseded by #99.)* Trees and rock formations block building; players harvest them first. Stones and branches on the ground do not block: building over them moves them into the builder's inventory; if it is full, the build is refused. | Keeps the tier system intact (nobody clears a rock their pickaxe cannot mine). Placement checks include world objects. |
| 40 | Stone source | Infinite stone and limestone deposits (like resource wells, just for stone), mined with the pickaxe and with extractors. | Stone never runs out, although loose stones and rock formations do. Derived: at least one stone deposit near spawn, minable with the first pickaxe. |
| 41 | Saplings | Every harvested tree drops at least one sapling. A tree grows in about 10 minutes of real time, computed from the planting time (so also while the world is unloaded). Saplings go on natural ground only, not on foundations; leaf colour follows the biome where the sapling is planted. An automated tree farm machine arrives at a mid tier. | Wood is renewable by hand and later automatically. |
| 42 | Public and private worlds | Public worlds are listed for everyone who can open the game. The list shows world name, player count and preset, no usernames. Private worlds are never listed for non-members; they are reached only with an invite code, and members find them under their own worlds. | The game no longer looks up courses (review A5 mostly obsolete); review A4 (who may open the game) stays. |
| 43 | Course and group worlds | No special world types. A teacher creates a normal world and shares an invite code with the course. Platform groups play no part in the game; teams replace them. | Course, group and sandbox world types leave the spec. |
| 44 | Limits and cleanup | A user owns at most 3 worlds (environment variable). No automatic deletion (optional lifetime variable, off by default). Deleting a world needs the world name typed as confirmation; the world is kept for 7 days and the owner can restore it; members get a notice. The owner can transfer world ownership to a world admin. | Replaces the sandbox TTL and its daily cleanup job. |
| 45 | World settings | Confirmed as proposed under open question 21 (settings table and presets). | — |
| 46 | World and team roles | Confirmed as proposed under open question 22: separate role sets; world admins create and revoke invite codes, kick and ban; team invites happen inside the world without codes. | — |
| 47 | Unlocks | *(Completed phases superseded by #81.)* Shared per team and never lost: joining a team merges the player's unlocks into the team's; leaving copies the team's unlocks to the player's solo team. | — |
| 48 | Membership check | Confirmed as proposed: the world server stores and checks world membership; the backend checks who may open the game at all. | Changes the spec's rule that all authorization happens in the backend. |
| 49 | Stage placement | Stage 1: main menu, world creation, invite codes, world roles. Stage 2: biomes, trees, stones, branches, rock formations (with terrain and deposits). Stage 3: inventory, gathering, crafting, tiers, unlocks, building costs, teams and claims. | Supersedes the earlier stage placement proposal. |
| 50 | Game design document | `docs/automata/game-design.md`, as proposed. | Created 2026-11-26. |
| 51 | Assets | Layout and conventions as proposed. | — |
| 52 | Drag placement | Drag placement for belts, pipes and wires; build reach about 20–30 m; the build rate limit counts actions, not entities. | — |
| 53 | Supports and vertical transport | Supports (stilts) that anchor to the ground and have a variable height carry belts and pipes, like in Satisfactory; belts and pipes no longer have to sit on foundations. Vertical belts (lifts) and vertical pipes move items and fluids between heights. | Resolves review B3. Replaces the Stage 3 rule "belts and pipes on foundations only". Cave deposits become reachable from the surface. |
| 54 | Spec and plans | The original spec and stage plans may be deleted or heavily rewritten where they no longer fit. | The rewrite works from this log and the game design document. |

### Open

33. **Supports.** Answered by #55; limits proposed in the next entry.
34. **Building items or cost at placement.** Answered by #56.
35. **Small buildings on terrain.** Answered by #57.

## 2026-11-26 — Supports, building cost and foundations

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 55 | Supports | Supports stand on terrain or on foundations, and they stack. | Limits proposed below. |
| 56 | Building cost | The cost is paid from the inventory when placing, as in Satisfactory. Buildings are not crafted into items. | The workbench crafts only tools and intermediate parts; buildings, the workbench itself included (wood), are placed by paying their cost. Removing a building puts its cost back into the inventory (#4). |
| 57 | Foundations | Foundations are not required for anything. Everything can be placed where the ground allows it. Foundations are a way to create perfectly flat areas, stack factories into floors and lift them off the ground. | Replaces the spec rule "machines must rest fully on foundation tops". Needs a rule for what the ground allows (proposed below). |

### Proposed, awaiting confirmation

- *(Confirmed as #58.)* **Placement on terrain (#57).** The ground under a building's footprint may vary by at most 1 m. The building snaps to the grid level of the lowest point and may sink into the higher side; the rest of its volume must be free.
- *(Confirmed as #59.)* **Foundations without support.** As in Satisfactory, foundations need nothing underneath, because there is no structural physics. A foundation may be partly inside the terrain, but not completely. Ramps let players walk up to higher floors.
- *(Confirmed as #60.)* **Support limits (#55).** A support is adjustable from 1 to 8 m in 1 m steps. Supports stack without a count limit, up to the build ceiling. At most 16 m between two supports; drag placement adds supports automatically where a run needs them. A belt or pipe between two supports at different heights rises at most 1 m per 2 m (about 27°). Steeper changes use vertical belts and vertical pipes, 1 to 16 m per piece, stackable.
- *(Confirmed as #61.)* **Refund and drag cost (#56).** If a refund does not fit into the inventory, the removal is refused (as building over loose stones with a full inventory is, #39). A drag placement shows its total cost, automatic supports included, and is refused as a whole if the inventory cannot pay it.

## 2026-11-26 — Building rules confirmed

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 58 | Placement on terrain | Confirmed as proposed: the ground under a footprint may vary by at most 1 m; the building snaps to the lowest point and may sink into the higher side. | — |
| 59 | Foundations without support | Confirmed as proposed: no support needed underneath; partly but not completely inside the terrain; ramps for higher floors. | — |
| 60 | Support limits | Confirmed as proposed: 1–8 m per support, stacking up to the build ceiling, at most 16 m apart with automatic supports during drag placement, at most 1 m rise per 2 m, vertical belts and pipes 1–16 m per piece, stackable. | — |
| 61 | Refund and drag cost | *(Refusal for a refund that does not fit superseded by #94.)* Confirmed as proposed: a removal whose refund does not fit is refused; a drag placement is paid in full or refused. | — |

## 2026-11-26 — Tiers, machine upgrades and ruins (proposals)

The author asked for a tier recommendation drawing on modded Minecraft, Terraria and Satisfactory (invented materials welcome), whether single machines should be boostable (Mekanism-style upgrades or Satisfactory-style power slugs and somersloops), and whether generated structures with loot and puzzles should reward exploration beyond deposits. The proposals are written out in `game-design.md` (section 6 *Ruins*, section 9, section 11 *Machine upgrades*); the author is reviewing them.

### Proposed, awaiting review

- *(Superseded by #62.)* **Tier principle (keeps #17).** Each tier brings a new material, a new place and a new kind of problem. The next pickaxe and extractor cost many processed parts of the current tier, so the factory sets the pace, not hand-mining.
- *(Reworked by #62; contents still under review.)* **Tier ladder.** 0 primitive, 1 copper, 2 iron plus steel, 3 thrumite (cave crystal, stores energy), 4 pyrelith (desert, heat, slag by-product), 5 rimeglass (tundra, needs pressurised gas as coolant), 6 concordite (fused from the three, not mined). Replaces the first draft: steel moves into tier 2, batteries to tier 3, oil to tier 4, gas to tier 5. The biome deposit column changes accordingly.
- *(Superseded by #63–#66.)* **Final goal.** An ancient engine at the world centre, fed concordite parts at set rates in phases. In-game only; not the assignment goals left out by #25.
- **Machine upgrades.** 3 upgrade slots and 1 core slot per machine: mainspring (+50 % speed, power grows faster), escapement (−25 % energy per item), harmonic core (double output at about 4× power; vault-only, never craftable, limited per world).
- **Ruins.** Wrecks (surface, common), vaults (caves, puzzle door), ancient seals (deep, rare; concordite tools plus a large puzzle). Puzzles are delivery, power, pressure and routing tasks (#6).
- *(Superseded by #73.)* **Loot.** Once per structure per team; a player who looted a structure cannot loot it again through another team.
- *(Superseded by #67.)* **Progression dependency.** From tier 3 on, each tier's key machine blueprint lies in a vault in that tier's biome; generation guarantees enough vaults. Upgrades and alternative recipes are optional.
- **Scanner.** From tier 1; points to the nearest deposit of a chosen kind; an upgrade also finds ruins.
- *(Changed by #64: the engine link and phase deliveries move to Stage 4.)* **Stage placement.** Ruins are generated with the world in Stage 2; loot and the once-per-team rule in Stage 3; upgrades, alternative recipes, the scanner and delivery puzzles in Stage 4; power and pressure puzzles, tiers 2 to 6 and the final goal in Stage 5.

### Open

36. **Final goal scope.** Answered by #64.
37. **Invented names.** Answered by #116.

## 2026-11-27 — Tier structure and the ancient engine

The author found the draft ladder flat: each tier hinged on one new ore, and the engine was fed one material. Directions from the author: every tier also brings other resource wells and products, and the engine is fed produced items made from everything the tier unlocked, as in Satisfactory. The four follow-up proposals (phases gate tiers, engine link, quantities, relics) were confirmed as proposed.

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 62 | Tier structure | A tier brings one tiered ore (#17), one or two other new sources (wells, vents or deposits), products that combine the new sources with earlier tiers' materials, and one new problem. No single resource carries a tier. | The machine that taps a new source (pump, oil pump, gas extractor) gates it, not the pickaxe. New deposit types: sulfur (highlands, around geothermal vents), sand (desert), ice (tundra). Items and deposits are catalogue data plus one model and one icon each (#51); no mechanics beyond the earlier draft. The tier contents in `game-design.md` section 9 are reworked and stay a draft. |
| 63 | Engine phases | The ancient engine is fed engine parts, not raw material: one phase per tier from 1 to 6, each asking for 2–3 parts built from all of that tier's sources, plus more of the previous phase's part (as Smart Plating returns in Satisfactory). | Earlier production lines keep running. Engine parts are catalogue items with recipes. |
| 64 | Phases gate tiers | Completing phase N unlocks tier N+1's entry recipes for the team: the pickaxe and extractor that mine its ore and the machines that tap its other sources. Within an unlocked tier, a recipe unlocks once the team has obtained its inputs (#18). Tiers 0 and 1 need no phase. One engine per world, progress per team (answers open question 36). | Unlock conditions get a second kind (phase completed) next to obtained items. Completed phases are unlocks and follow #47 (merged on joining, copied on leaving). Phase 1 gates tier 2, so the engine link and phase deliveries move into Stage 4. |
| 65 | Engine link | Teams deliver engine parts at an engine link they build in their base, as the space elevator stands in the player's base in Satisfactory. The engine at the world centre is the landmark and lights up with each completed phase. | Engine link is placeable from tier 1. Deliveries count for the team that owns the link (#36). Each player sees their own team's progress on the engine. |
| 66 | Phase targets | Phases 1–5 ask for fixed quantities; stockpiled parts count, so a slow factory still progresses. Phase 6 asks for a rate held over a set time, as the final throughput test. | Replaces "concordite parts at set rates" from the earlier draft. |
| 67 | Relics instead of blueprints | From phase 3 on, each phase also needs one relic from a vault in that tier's biome. This replaces the blueprint gate (key machine blueprints in vaults from tier 3 on). | Exploration stays required without a separate lock. Loot is once per structure per team, so every team can take a relic from each vault; generation still guarantees enough vaults per biome. Derived: tier 6 has no biome, so the phase 6 relic lies in an ancient seal, which already held parts for the final goal. |

### Open

38. **Partial phase deliveries.** Answered by #68.

## 2026-11-27 — Partial phase deliveries

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 68 | Partial phase deliveries | Parts delivered towards an unfinished phase belong to the team and never move with a player. Joining a team does not add the joiner's partial deliveries to the team's; leaving starts the leaver's solo team at 0 for its unfinished phase. Completed phases still follow #47. | Avoids the exploit where a player leaves with a copy of the progress and rejoins to count it twice. Two solo players who team up lose the joiner's partial deliveries for the current phase; the join and leave dialogs say what will be lost. If merging completed phases (#47) moves the team past its current phase, that phase's partial deliveries no longer matter. |

## 2026-11-27 — Gap review: caves, ownership, loot and smaller rules

A review of this log, the GDD and the stage plans listed gaps that no decision covered yet. The author answered most of them; the rest are open questions 39–55.

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 69 | Cave access | Caves are generally accessible: every cave system connects to the surface through at least one entrance a player can walk through. | Generator guarantee in core, pinned by a test over sampled seeds. Derived: terrain is not editable (#19), so belts and pipes leave caves through these entrances too; an entrance needs room for a belt or pipe next to the walking path, and either a slope that sloped belts can follow (#60) or a vertical stretch for vertical belts and pipes. Closes the cave part of review B3. |
| 70 | Cave resources | Caves hold deposits and wells on their floors and formations on their walls. Wall formations are mined by hand with a pickaxe. | Thrumite (tier 3) comes from floor deposits (extractors) and wall formations (pickaxe). Deposits on cave floors stay as in the spec (flat extractor footprint). Assumed: wall formations do not renew, like rock formations (#20), and take no extractor; the pickaxe tier rule (#17) applies to them. |
| 71 | Biomes in every world | Every world contains each of the five biomes at least once. Worlds become bigger in general. | Generator guarantee for every combination of world size and biome size, pinned by a test; the same holds for deep caves under desert and tundra (pyrelith, rimeglass) and for enough vaults per biome (#67). New radii proposed below. Longer distances make open question 49 (travel) more pressing. |
| 72 | Protection instead of claims | *(Public containers open to everyone, #133.)* There are no claims. What a team builds is protected: only that team opens, configures or removes it. Everything generated with the world (trees, stones, branches, rock and wall formations, deposits, wells, ruins) is open to everyone. | Supersedes #30, #34, #35, #36 and the claim parts of #24, #27 and #37. The world owner keeps full rights on every building except private containers (#24, #28); private containers stay as in #28, #31 and #32. No team can lock a vault or seal away from the others (#67). A deposit is held by the first extractor placed on it (one extractor per deposit, spec). Claim limits leave the world settings (#45). Assumed: saplings a team plants, and the trees grown from them, count as built by that team. Opened: buildings when players change teams (40), building next to other teams and limits (43), deposits at spawn (44). |
| 73 | Loot | Loot containers in ruins work per player, as in the Lootr mod (inspired by, not copied): every player opens their own copy of the contents. | Supersedes the proposal "once per structure per team". Every player can take a relic from each vault (#67), so a team does not depend on one member. Late joiners get full loot, which softens #20. Door and wreck state: open question 47. |
| 74 | Obtained | An item counts as obtained for the unlock rule (#18) once any member of the team holds it in their inventory. | Items that only pass through machines or sit in containers count once someone picks one up. The server records it on inventory changes. |
| 75 | Contents on removal | Removing part of a belt moves the items on it into the remover's inventory, as in Satisfactory. Fluids and gases in removed pipes are lost. | Assumed, same rule: items in machine buffers, containers and installed upgrades move into the inventory; fluids and gases in tanks and machines are lost. Full inventory: open question 45. |
| 76 | No special material handling | Rimeglass does not need to stay cold, and smelting pyrelith makes no slag. The tier structure (#62) gives the tiers their depth instead. | Tier 4 loses slag, gravel and slag processing; tier 5 loses cooling as its problem (ice still makes coolant as an ordinary ingredient). Tier 4 needs a new "new problem" entry (GDD section 9, Draft). |
| 77 | Crafting time | Crafting by hand and at the workbench is instant. | No crafting queue or progress bar. |
| 78 | Mining time | *(Time changed to 2 s by #85.)* Mining one item takes 1.25 s when the tool has the tier the target requires. | Assumed: "the tier the target requires" is the minimum tier of #17 (e.g. a stone pickaxe on copper ore). Hand mining yields at most 48 items/min, so the GDD draft "hand mining is slower than the first extractor" needs a burner extractor faster than that. Better tools: open question 46. |
| 79 | Engine link | One engine link per team. | Placing a second one is refused. Delivered parts belong to the team (#68), so removing and rebuilding the link loses nothing. A joining player's own link: see the proposal for open question 40. |
| 80 | Statistics panel | Per world and per team. | Two views: the own team's production and consumption, and the totals of the whole world. |

### Open

39. **Phase progress across teams.** Answered by #81.
40. **Buildings when a player changes teams.** Answered by #86.
41. **Kick and ban.** Answered by #82.
42. **Connections across teams.** Answered by #98.
43. **Building next to other teams.** Answered by #87.
44. **Deposits at spawn.** Answered by #88.
45. **Removal with a full inventory.** Answered by #89.
46. **Better tools.** Answered by #103.
47. **Ruin state.** Answered by #90.
48. **Player collision with buildings.** Answered by #104.
49. **Travel.** Answered by #105.
50. **Map.** Answered by #106.
51. **Chat.** Answered by #107.
52. **Usernames in public worlds.** Answered by #108.
53. **Teacher workflow.** Answered by #109.
54. **Onboarding.** Answered by #110.
55. **Art workload.** Answered by #111.

### Proposed, awaiting confirmation

- *(Superseded by #91: bigger still.)* **World sizes (#71).** Double the radii: small / medium / large = 1024 / 2048 / 4096 m. Terrain and deposits are never stored, and the view distance stays 8 chunks, so neither storage nor loading time (review B7) grows. The cost is walking: from the centre to the edge of a large world takes about 14 minutes at 5 m/s.
- *(Option B confirmed as #81.)* **Phase progress across teams (open question 39).** Item records (#74) merge freely in both directions: a recipe also needs its tier (#64), so they never let a team skip a phase. For completed phases:
  - *A. Stays with the team.* Joining brings no phases in, leaving takes none out; the solo team keeps what it had before the player joined. Same principle as #68. A player who leaves after months of team work keeps only their solo team's progress.
  - *B. Keep what you were there for* (recommended). As A, and leaving also gives the solo team every phase the team completed while the player was a member. Fair to long-time members; joining just before a phase completes still pays off, but needs the team's invitation.
  - *C. Keep #47 with a waiting period.* Merging and copying count only after e.g. 24 h of membership, plus a cooldown between team changes. Least change, but the numbers are arbitrary, and a joiner still lifts a team after the wait.

  With A or B, a player whose solo team is ahead plays at the team's level while a member; the join dialog says so. The #68 note about merged phases moving a team past its current phase no longer applies.
- *(The alternative was chosen: #86.)* **Buildings when a player changes teams (open question 40).** A building belongs to its builder's current team, as buildings on unclaimed land did under #36: joining brings the player's buildings into the team, leaving takes them out, and disbanding returns each to its builder's solo team (#37). Nothing moves in the data; each building already stores its builder. Downside: a leaving member takes their machines out of a shared line; the team gets a notice. A joining player's own engine link is dismantled into their inventory (#79). Alternative: buildings stay with the team they were built in. That keeps lines whole, but a player who leaves loses everything they built, and if team admins can remove members (not decided yet), they could keep a member's whole base.
- *(Confirmed as #82.)* **Kick and ban (open question 41).**
  - *Kick* (world owner or world admins): disconnects the player and removes them from the member list; a valid invite code brings them back. Team, inventory, buildings and unlocks stay as they are.
  - *Ban*: removed, and codes no longer let them in. The player leaves their team as on a normal leave (#33, #37), but their buildings stay with that team, so a ban never tears holes into teammates' factories. What they built for their solo team stays until the world owner or a world admin removes it in one action ("remove everything this player built"), without refund. Inventory and unlocks are kept; an unban returns the player to their solo team.
  - World admins kick and ban players; only the world owner kicks or bans world admins; only platform admins act against the world owner.
  - The world owner cannot leave without transferring ownership (#44). If the owner's platform account is removed, ownership passes to the longest-serving world admin; without one, platform admins transfer or delete the world.
- *(Confirmed as #87, with limits adjustable at any time.)* **Building limits (open question 43).** Claim limits (#34) become building limits per player, per team and per world, set by the world owner within a server cap. Building in someone's way stays a moderation case: the world owner can remove any building (#24). A keep-out distance around other teams' buildings is possible but not recommended: it blocks dense building near spawn and works like a claim again.
- *(Confirmed as #89.)* **Removal with a full inventory (open question 45).** Items held by the building that do not fit go into a dismantle crate at the spot, as in Satisfactory; the crate belongs to the remover's team and disappears when empty. The refund rule of #61 stays; optionally the crate also takes a refund that does not fit, which would replace #61's refusal.
- *(Confirmed as #90.)* **Ruin state (open question 47).** Physical state per team, contents per player: a door opened by a puzzle, or a wreck broken open, is open for the whole team that did it; every player still loots their own copy (#73). Harmonic cores drop "limited per world": they stay vault-only, never craftable and one per machine; their number is set by how many vaults hold one.

## 2026-11-27 — Gap review proposals answered

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 81 | Phase progress across teams | Option B (open question 39): completed phases stay with the team; leaving gives the player's solo team every phase the team completed while the player was a member. Item records (#74) merge freely in both directions. | Supersedes #47 for completed phases. Joining brings no phases in; a player whose solo team is ahead plays at the team's level while a member, and the join dialog says so. The solo team keeps its own phases while the player is away. Disbanding (#37) counts as everyone leaving. The #68 note about merged phases no longer applies. The server stores when each player joined their team and when each phase was completed. |
| 82 | Kick and ban | As proposed (open question 41). Kick: disconnects the player and removes them from the member list; a valid invite code brings them back; nothing else changes. Ban: codes no longer let the player in; they leave their team as on a normal leave; the world owner or a world admin can remove everything they built for their solo team in one action, without refund; inventory and unlocks are kept for an unban. World admins act against players, the world owner against world admins, platform admins against the world owner. The world owner cannot leave without transferring ownership (#44); if the owner's platform account is removed, the longest-serving world admin becomes owner, otherwise platform admins transfer or delete the world. | World metadata stores a ban list and when each world admin was appointed. Under #86 a banned player's team buildings stay with the team anyway. |
| 83 | Confirmed assumptions | #70: wall formations do not renew and take no extractor. #72: saplings a team plants, and the trees grown from them, count as built by that team. #75: items in machine buffers, containers and installed upgrades also move into the inventory. | — |
| 84 | Hand mining deposits | Deposits on cave floors can also be mined by hand with a pickaxe, as resource nodes in Satisfactory. | The same rule as for solid deposits on the surface (pickaxe or extractor). Assumed: solid deposits only; fluid wells and gas vents still need a pump or gas extractor. |
| 85 | Mining time | 2 s per item instead of 1.25 s (changes #78), with the minimum tool tier of #17. | Hand mining yields at most 30 items/min, so the burner extractor needs more than that to pay off (GDD draft). Better tools: still open question 46. |
| 86 | Buildings when changing teams | Buildings stay with the team they were built for (open question 40). Nothing moves when a player joins or leaves a team. | Joining does not bring the solo team's buildings: they stay with the solo team, keep running and are back in reach when the player returns to it (as phases under #81). A leaving player keeps nothing they built for the team. A joiner can no longer bring a second engine link (#79). Disbanding (#37) is the only case where buildings move: each goes to its builder's solo team; if that solo team already has an engine link, the second one is dismantled into the builder's inventory (#89). Assumed: a private container stays private to its owner after they leave; they can still open and empty it, and the team's owner or admins can remove it (#32). Removing members from a team: open question 56. |
| 87 | Building limits | Claim limits become building limits per player, per team and per world (open question 43). The world owner can adjust all three at any time, within a server cap. | Lowering a limit below the current count removes nothing; no new buildings until back under it (as #35 handled claims). Building in someone's way stays a moderation case for the world owner (#24); no keep-out distance. |
| 88 | Deposits at spawn | No guarantee per team (open question 44): once the deposits near spawn are taken, later teams venture further out. | The spawn draft (copper and coal within about 200 m) stays. The scanner (tier 1) helps find deposits further out. Known limitation, like #20. |
| 89 | Removal with a full inventory | Items held by a removed building that do not fit into the inventory go into a dismantle crate at the spot, as in Satisfactory (open question 45). The crate belongs to the remover's team and disappears when empty. | Changed by #94: the crate also takes a refund that does not fit. |
| 90 | Ruin state | As proposed (open question 47): a door opened by a puzzle, or a wreck broken open, is open for the whole team that did it; every player loots their own copy (#73). Harmonic cores are not limited per world: vault-only, never craftable, one per machine. | Each player sees doors and wrecks in their own team's state; players of another team cannot pass a door that is open only for someone else (the movement check knows the player's team). A player who changes teams sees the new team's state. |
| 91 | World sizes | Bigger than proposed: the smallest world has a radius of 4096 m. | Replaces the proposal of 1024 / 2048 / 4096 m; medium and large proposed below. Walking from the centre to the edge of a small world takes about 14 min at 5 m/s, so travel (open question 49) becomes pressing. Derived for Stage 2: the renderer draws chunks relative to the camera so that float32 precision holds at these distances; positions in 1/256 m (`i32`) and Q16.16 noise inputs (±32 768 m) still fit. |
| 92 | Rubber | Rubber joins tier 4 as an oil product, next to plastic and fuel. | Draft tier 4 problem adjusted: every refinery recipe makes fuel next to plastic or rubber, so the fuel needs a consumer (fuel generator). Where rubber is used comes with the tier content review. |

### Open

56. **Removing team members.** Answered by #97.

### Proposed, awaiting confirmation

- *(Confirmed as #95.)* **Medium and large worlds (#91).** Keep doubling: small / medium / large = 4096 / 8192 / 16 384 m radius. Walking from the centre to the edge takes about 14 / 27 / 55 min at 5 m/s.
- *(Confirmed as #96.)* **Biome distance bound (#71, #91).** Every biome lies within a set distance of the spawn, scaled by biome size (e.g. 2 km for normal biomes), whatever the world size. Tiers 4–6 then never need a trip of 10 km or more, and bigger worlds add room and further deposits instead of longer mandatory distances. Tier 6 stays a long-distance tier within that bound.

## 2026-11-27 — Confirmations and energy

The author confirmed the remaining proposals and asked for energy generation to be worked out in full, for tier 4 and in general. The energy proposal is written out in `game-design.md` section 12 (*Energy*, Draft); its main points are listed below.

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 93 | Confirmations | #86 as read: nothing moves when a player joins a team either; the solo team's buildings stay with it. #84: hand mining applies to solid deposits only. A private container stays its former owner's to open and empty until the team removes it (#86). #85: the burner extractor yields more than 30 items/min. | — |
| 94 | Refund into the crate | The dismantle crate (#89) also takes a refund that does not fit. A removal is never refused for lack of inventory space. | Supersedes the refusal in #61; a drag placement is still paid in full or refused. Building over loose stones with a full inventory is still refused (#39): open question 57. |
| 95 | World sizes | Small / medium / large = 4096 / 8192 / 16 384 m radius, as proposed. | — |
| 96 | Biome distance bound | Every biome lies within a set distance of the spawn, scaled by biome size (target about 2 km for normal biomes), whatever the world size. | Generator guarantee next to #71, pinned by the same test. Tiers 4–6 never need a trip of 10 km or more; bigger worlds add room and deposits further out. |
| 97 | Removing team members | The team owner and team admins can remove members from the team (open question 56). | Assumed, as with world roles (#82): the team owner removes admins and members, admins remove members. A removed member returns to their solo team as on leaving: phases per #81, buildings stay with the team (#86), private containers per #93. |

### Open

57. **Loose stones with a full inventory.** Answered by #99.

### Proposed, awaiting confirmation

Energy (details, tables and numbers in `game-design.md` section 12):

- **Units.** MW and MJ on screen; integer kW and kJ in the simulation (one tick at 1 MW = 50 kJ).
- **Grid.** Wires cost copper wire by length and may not pass through terrain, so power reaches caves through their entrances (#69). Three pole tiers: wooden pole (tier 2, 20 m), steel pole (tier 3, 40 m), power tower (tier 5, 150 m, superconducting wire) for the large worlds (#95).
- **Dispatch every tick.** Working machines draw full power, idle ones nothing. Supply in order: geothermal, then fuel generators at equal load, then batteries; a shortfall slows every machine equally (as before); leftover capacity charges batteries. Fuel use follows load.
- **Fuels.** Wood 15 MJ, charcoal 40 MJ, coal 60 MJ (furnace, burner extractor, coal generator); fuel 500 MJ/m³ (fuel generator); natural gas 100 MJ/m³ at 1 bar (gas turbine).
- **Generators.** Coal generator (tier 2, 30 MW, solid fuel plus water); geothermal generator (tier 3, 80 MW average on a normal vent, scaled by purity, swinging between 50 % and 150 % over 60 s, no fuel, cannot throttle); fuel generator (tier 4, 100 MW, burns the refinery's fuel); gas turbine (tier 5, 250 MW, stops below a minimum pressure). No new generator in tier 6.
- **Battery** (tier 3, thrumite): 600 MJ, 50 MW; one battery per normal vent smooths its swing.
- **Ratio targets** for the recipes: tier 2, one extractor on a normal coal deposit and one water pump feed two coal generators; tier 4, a refinery's fuel runs slightly more than the refinery and its oil pump need.
- **Power draw** starting values per machine, and **upgrade factors**: with n mainsprings, speed 1 + n/2 and power speed²; each escapement ×0.75 energy per item; harmonic core ×4 power.
- **Not planned:** solar (no day/night gameplay, spec non-goals), nuclear (waste handling is a special material rule of the kind #76 removed), capacity limits on wires (belts and pipes already teach capacity).

Also:

- *(Confirmed as #98.)* **Connections across teams (open question 42).** Recommended: none. Belts, pipes and wires connect only to the own team's buildings, so every grid and network belongs to one team: protection (#72) covers it as a whole, its brownouts and statistics (#80) are the team's own, and no team pulls items out of another team's container. Teams that want to share a factory join one team.

## 2026-11-27 — Team connections, loose stones, day and night

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 98 | Connections across teams | Confirmed as proposed (open question 42): belts, pipes and wires connect only to the own team's buildings. | Every grid and network belongs to one team: protection (#72) covers it as a whole, its brownouts and statistics (#80) are the team's own, and no team pulls items out of another team's container. Teams that want to share a factory join one team. |
| 99 | Loose stones with a full inventory | Building over loose stones or branches with a full inventory is allowed; what does not fit is voided (open question 57). | Supersedes the refusal in #39. Nothing respawns (#20), so voided stones and branches are gone for good; stone deposits stay infinite (#40). Assumed: the build preview says how many will be lost. |
| 100 | Day and night | There is a day and night cycle. It is purely visual: no gameplay derives from it. | The spec's non-goal "day/night gameplay effects" stays. Nights stay bright enough to build, find the way and read every status display; caves stay dark with the player's light, as before. All players in a world see the same time of day, computed from the real time since the world was created, so it also runs while the world is unloaded (like sapling growth, #41) and needs no catch-up. Solar power stays out, since it would tie output to the time of day. Renderer: sun direction, sky colour and ambient light become uniforms. Cycle length proposed below. |

### Open

58. **Nuclear power.** Answered by #101.

### Proposed, awaiting confirmation

- *(Confirmed as #102.)* **Day length (#100).** A 30-minute cycle: 20 minutes of day, 10 of night including dusk and dawn. Since nothing depends on it, a per-player display setting can keep it at day.
- *(Option B confirmed as #101.)* **Nuclear power (open question 58).** Left out because its interesting part in factory games is radioactive waste that must be stored or reprocessed, plus radiation damage: a special material rule of the kind #76 removed, and radiation has nothing to act on without health or damage (spec non-goals). Without waste it is only a bigger fuel generator and adds no new problem. Options:
  - *A. Leave it out* (current energy draft).
  - *B. A reactor as tier 6's generator* (recommended). Fuel cells made from tier 3–5 products (thrumite, pyrelith and rimeglass parts), a very high output (e.g. 1.5 GW), and a large water demand as an ordinary recipe input; no waste, no radiation. Its fuel cells need all three far-apart biomes, which is tier 6's long-distance problem, and it powers the final rate test (#66). An invented reactor (e.g. a resonance reactor) fits the invented materials better than uranium.
  - *C. As B, plus spent cells* that must be carried away (the general rule that a full output stops a machine) and are reprocessed into something useful, as the refinery's fuel is (#92). Adds a loop, closer to Satisfactory's nuclear chain.

## 2026-11-27 — Resonance reactor, day length, remaining questions

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 101 | Resonance reactor | Option B (open question 58): a resonance reactor is tier 6's generator. It burns resonance cells made from thrumite, pyrelith and rimeglass products, has a very high output and a large water demand as an ordinary input; no waste, no radiation. | Replaces "no new generator in tier 6". Its cells need all three far-apart biomes (tier 6's problem), and it powers the final rate test (#66). Starting values in GDD section 12: 1.5 GW, one resonance cell per minute, 300 m³ of water per minute. "Resonance reactor" joins the name check (open question 37). |
| 102 | Day length | As proposed: a 30-minute cycle with 20 minutes of day; a display setting keeps it at day. | — |

### Open

59. **Player health.** Players should have health points (author); details are discussed later. Touches the spec's non-goals (combat, creatures) and needs: what causes damage (falls, machines, the reactor?), what happens at zero (respawn point, inventory), and how the server checks it.
60. **Schedule.** Answered by #117.

### Proposed, awaiting confirmation

- *(Confirmed as #103, with felling.)* **Better tools (open question 46).** Each tool tier above the minimum a target requires cuts the mining time by 25 % (2 s → 1.5 s → 1.125 s), down to 1 s. One axe without tiers: trees have no tier, 2 s per wood.
- *(Confirmed as #104.)* **Player collision (open question 48).** Players collide with every building except wires; foundations, ramps and the tops of machines are walkable. The server's movement check uses the occupancy map next to the terrain. A building cannot be placed where a player stands.
- *(Confirmed as #105.)* **Travel (open question 49).** Sprinting from the start (walking 5 m/s, sprinting 8 m/s). From tier 3, teleport beacons: a player jumps between their own team's beacons and the spawn; a beacon needs power. No vehicles or trains in v1: vehicles need their own physics and network prediction, trains are a second logistics system; both can come later. Cargo keeps moving on belts and pipes, within the distances #96 bounds.
- *(Confirmed as #106, plus a minimap.)* **Map (open question 50).** A map overlay (key M) drawn from the terrain functions, so it needs no stored data: explored area only, shaded by biome, with the own team's buildings and members, the engine, discovered ruins, scanner hits, beacons and the player's own markers.
- *(Confirmed as #107.)* **Chat (open question 51).** Team chat and world chat; the world owner can turn world chat off; world admins mute players. Messages live only in the running world's memory (the last 100 per world, for moderators) and are never stored in the database. Team members can also ping a spot on the map or in the world.
- *(Confirmed as #108.)* **Names (open question 52).** One display name per user for the game, chosen at the first start (the username is suggested and may be kept). Other players only ever see display names; solo teams are named after them (#29). Usernames are visible to the world owner and world admins of private worlds (the join dialog says so, so a teacher knows their students) and to platform admins; never to other players in public worlds. Bans are stored by user id.
- *(Confirmed as #109.)* **Teacher view (open question 53).** The world owner and world admins get a world overview: teams and their members, each team's current phase and its progress, last activity, and the team statistics (#80). Teachers run class worlds as their owner (#43).
- *(Confirmed as #110, plus list crafting.)* **Onboarding (open question 54).** A recipe browser (what makes and what uses an item; locked recipes show what unlocks them), an unlock tree per tier, and short first-steps hints for tiers 0 and 1 (stones and branches → stone tools → workbench → furnace → first extractor) that players can hide. No quest system.
- *(Answered by #111.)* **Art (open question 55).** v1 builds placeholder models in code for every catalogue entry (simple shapes in palette colours, a distinct silhouette per kind) and renders the icons from them, so the asset test of #51 passes from the start. CC0 asset packs fill in where they fit (credits per #51); real models replace the placeholders over time. Still open: who makes the real models.
- *(Confirmed as #112.)* **Inventory and stacks.** 40 slots, 8 of them a hotbar for tools. Stack sizes: 100 for resources and simple parts, 50 for larger parts, 10 for engine parts, relics and upgrades, 1 for tools. No inventory upgrades in v1.
- *(Confirmed as #113.)* **Keys.** Hold the left mouse button to mine or harvest; E to pick up and to interact (containers, machines, workbench); Q build menu; R rotate and X remove (#7); Tab inventory; M map; T chat.
- *(Replaced by #114.)* **Audio.** No audio in v1 beyond a few UI sounds; machine and ambient sounds later.

## 2026-11-27 — Interface, tools, art and audio

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 103 | Better tools and felling | As proposed (open question 46): each tool tier above the minimum a target requires cuts the mining time by 25 %, down to 1 s. Trees are felled: a player chops a tree with the axe until it falls and disappears, dropping its logs and at least one sapling (#41). One axe, without tiers. | Replaces "2 s per wood" for trees. Assumed: logs are the existing wood item. Chopping time and logs per tree come with the balance numbers. |
| 104 | Player collision | As proposed (open question 48): players collide with every building except wires; foundations, ramps and machine tops are walkable; nothing can be placed where a player stands. | The server's movement check uses the occupancy map next to the terrain. |
| 105 | Travel | As proposed (open question 49): sprinting from the start (walking 5 m/s, sprinting 8 m/s); from tier 3, powered teleport beacons between the own team's beacons and the spawn. No vehicles or trains in v1. | Beacons join tier 3's unlocks; their power draw comes with the machine roster. |
| 106 | Map and minimap | As proposed (open question 50), plus a minimap in the top right corner. | Assumed: the minimap shows the same content around the player, north up, and can be hidden. |
| 107 | Chat | As proposed (open question 51). | New protocol messages for chat and pings, size-limited and rate-limited like build actions. |
| 108 | Display names | As proposed (open question 52). | Display names need length and character rules, as world and team names do; platform admins can reset one. They replace usernames in `PlayerJoined` and in default solo team names (#29). |
| 109 | World overview | As proposed (open question 53). | — |
| 110 | Onboarding and crafting | As proposed (open question 54). Crafting works from a recipe list, as in Satisfactory and Terraria: no crafting grid. | The list shows hand recipes, plus workbench recipes while a workbench is in reach; crafting is instant (#77). The crafting list and the recipe browser share one view of the recipe data. |
| 111 | Art | The author's team makes the real assets: 3D models, textures, shaders, VFX, music and sound. | Placeholders built in code stand in until a model exists (as proposed for open question 55); asset tasks go into the stage plans; #51's conventions apply. The renderer's layers leave room for custom WGSL shaders and VFX. |
| 112 | Inventory and stacks | As proposed: 40 slots with an 8-slot hotbar; stacks of 100, 50, 10 and 1. | Revisited with balancing. |
| 113 | Keys | As proposed. | — |
| 114 | Audio | Audio is in scope: the author produces it on request. | Replaces "no audio in v1". Scope proposed below; #51 gains an audio format. |

### Name check (open question 37)

A web search on 2026-11-27 found no existing use of thrumite, pyrelith, rimeglass or concordite, and no game called "Resonance Reactor". Only near misses: Thrumstål (a material on a worldbuilding site), thumite (an old name for the mineral axinite), pyrolite and "The Pyrolith" (a ceramics material and an EP title), HAY's "Rim Glass" drinkware, and cordite (an explosive). A web search is not a trademark search; before a public release, check the trademark registers. The author can settle the names.

### Proposed, awaiting confirmation

- *(Confirmed as #115.)* **Audio scope for v1 (#114).** UI sounds; footsteps per ground (grass, sand, rock, snow, foundation); tool hits (pickaxe on stone and ore, axe on wood, a falling tree); one positional loop per machine class, fading with distance (extractors, furnaces, constructors, generators, pumps, the reactor); a quiet belt loop; ambience per biome and for caves; a few calm music tracks. Volume per category (master, effects, ambience, music, UI). Playback through the Web Audio API with positional sources. The asset test of #51 also checks that every machine class has its loop. The file format is chosen for the browsers that run WebGPU and added to #51.

## 2026-11-27 — Names and schedule

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 115 | Confirmations | #103: logs are the existing wood item. #106: the minimap is north up and can be hidden. #114: the audio scope for v1 as proposed. | — |
| 116 | Names | Thrumite, pyrelith, rimeglass, concordite and the resonance reactor are settled (open question 37). | The engine part names stay placeholders until the tier content review. |
| 117 | Schedule | The target stays March 2027 with everything in v1 (open question 60). The author's team works on Automata nearly full time. | Confirms #11 after the scope grew. The rewritten stage plans keep every feature in v1 and propose a stage for each feature added since #49 (energy in full, reactor, day and night, travel, map, chat, display names, world overview, onboarding, audio). |

## 2026-11-27 — Energy discussion

The author went through five points of the energy draft.

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 118 | Machine speed | Every machine's speed can be set in its menu, as in Satisfactory. The same menu holds the upgrade slots. | Answers the tier 4 by-product trap (unburned fuel backing up into the refinery when fuel generators throttle with the rest): players underclock the refinery or the coal generators, or buffer fuel in tanks. Generator priorities (discussed) are not needed. Speed range and mainsprings: proposed below. |
| 119 | Geothermal swing | Stays as drafted (50–150 % over 60 s). Batteries cover the swing, demand spikes and fuel running out. | — |
| 120 | Wiring | Machines are wired to poles by hand, as in Satisfactory (as drafted). | No automatic connection within a pole's range. |
| 121 | Final rate test | Engine phase 6 is sized so that the required production needs about 1–2 GW. | The resonance reactor (#101) is the natural route; many gas turbines also work. Phase 6 numbers come with the tier content review. |
| 122 | Fuse | Overload trips the grid's fuse, as in Satisfactory: when demand exceeds what generators and batteries deliver, the whole grid stops until a player resets the fuse. | Replaces the brownout rule (spec *Simulation*, satisfaction ratio; GDD section 12) and the Stage 5 review focus "power fairness". Machines run at full speed or not at all, so the speed setting (#118) is the tool for fitting demand to supply. A grid on geothermal without enough batteries trips once per cycle (#119). Details proposed below. |

### Proposed, awaiting confirmation

- *(Confirmed as #123.)* **Speed range (#118).** The slider runs from 1 to 100 % on every machine from the start; each mainspring raises the maximum by 50 %, up to 250 % with three. Speed is set in whole percent.
- *(Confirmed as #123.)* **One power curve (#118).** Power draw follows speed^1.6 over the whole range (50 % → 0.33×, 150 % → 1.9×, 200 % → 3.0×, 250 % → 4.3×) instead of speed² for mainsprings only. Underclocking saves energy per item and overclocking costs extra, so "fewer fast machines or more slow ones" is a real trade-off. Core computes it from a fixed table, so it stays integer and deterministic.
- *(Confirmed as #123.)* **Upgrades per machine kind.** Mainsprings fit every machine, generators and extractors included; on a generator, output and fuel use both scale linearly with speed. Escapements fit machines that draw power or burn fuel, not generators. Harmonic cores fit production machines and extractors, not generators (double output without extra input would be free power).
- *(Confirmed as #123.)* **Fuse details (#122).** The fuse trips when demand exceeds generation plus what the batteries can discharge (50 MW each). Everything in the grid stops, and generators stop burning fuel. A player of the owning team resets it at a generator, battery or power switch of that grid; if demand is still too high, it trips again at once. A fuse that trips while nobody is near, or during catch-up, stays tripped until someone resets it, and the grid stands still meanwhile. The power panel shows a tripped fuse and its cause.
- *(Confirmed as #123.)* **Switches (#122).** A power switch (tier 2) joins or separates two grids by hand. A priority switch (tier 3) cuts off the grid behind it before the fuse would trip, so a team can protect its important lines.

## 2026-11-27 — Upgrade names, long-distance power

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 123 | Energy proposals | Confirmed as proposed: speed range (1–100 %, +50 % per speed upgrade, up to 250 %), one power curve (speed^1.6), upgrades per machine kind, fuse details, power and priority switches. | Assumed: the confirmation covers these five; the rest of the energy draft (GDD section 12) stays the working basis, its numbers starting values to tune. |
| 124 | Upgrade names | The mainspring is called **speed upgrade**, the escapement **efficiency upgrade**; the harmonic core keeps its name. | Earlier entries keep the old names; the GDD uses the new ones. |

### Proposed, awaiting confirmation

- *(Confirmed as #125.)* **Long-distance power (author's question: which tier, where does it make sense?).** The draft puts power towers in tier 5, but tier 3 is where power first has to come from far away: geothermal vents sit in the highlands (#38), while bases start in grassland or forest (#38), up to about 2 km apart (#96). With 40 m steel poles that is up to 50 poles per line. Proposed:
  - Steel poles (40 m) move to tier 2: steel is a tier 2 product, so they unlock once the team has steel (#18).
  - Power towers (150 m, 2 wires, about 20 m tall so their wires clear hills) move to tier 3, made from steel, concrete and copper wire, together with geothermal. A 2 km line takes 14 towers.
  - Superconducting towers (400 m) in tier 5, made with superconducting wire, for tier 6's three-biome network: a 2 km line takes 5 of them.
  - Drag placement (#52) for tower lines places the towers along the line at their range and wires them, showing the total cost as for belts (#61). Machines are still wired to poles by hand (#120).
  - Wires cost copper wire by length, so long lines keep the tier 1 copper wire line busy.

## 2026-11-27 — Long-distance power and insulation

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 125 | Long-distance power | As proposed: steel poles (40 m) in tier 2 once the team has steel; power towers (150 m, about 20 m tall) in tier 3 with geothermal; superconducting towers (400 m) in tier 5; dragging a tower line places and wires the towers and shows the total cost; wires cost copper wire by length. | Pole table and tier rows in the GDD updated. Machines are still wired to poles by hand (#120). |

### Open

61. **Insulation.** Answered by #126.

### Proposed, awaiting confirmation

- *(Option A confirmed as #126.)* **Insulation (open question 61).** Real overhead lines are bare as well: transmission lines are uninsulated conductors, held off their towers by glass or porcelain insulators, and only cables near people or inside buildings are insulated. Options:
  - *A. Bare lines, insulated cable later* (recommended). Wires between poles stay bare copper wire; each pole and tower carries insulators that are part of its recipe, with no separate item. Rubber brings **insulated cable** (copper wire + rubber) in tier 4 as an ingredient for tier 4–6 parts and the superconducting tower. The models show the insulators.
  - *B. Early insulation from wood.* A resin from trees (tier 2, tree farm) coats wire into an early insulated wire; rubber cable replaces it in tier 4. More realistic indoors, but one more item and one more source.
  - *C. Abstract it away.* A cable item made from copper wire, as in Satisfactory, with insulation never mentioned.

## 2026-11-27 — Insulation and superconducting wire

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 126 | Insulation | Option A (open question 61): wires between poles stay bare copper wire, as real overhead lines are; every pole and tower carries insulators as part of its recipe, with no separate item. Rubber brings insulated cable (copper wire + rubber) in tier 4. | Insulated cable is an ingredient for tier 4–6 parts and the superconducting tower (#125). The pole and tower models show their insulators. |

### Proposed, awaiting confirmation

- *(Confirmed as #127.)* **Superconducting wire (author's question: what is it made of?).** The draft names it as a tier 5 product but gives no recipe. Proposed: **copper wire + rimeglass + coolant**, made in a machine with three inputs; the coolant is used up while the wire is drawn. In the fiction, rimeglass makes copper superconduct at normal temperatures, so the wire needs no cooling once made (#76). It follows #62: tier 5's new sources (rimeglass, ice via coolant) combined with a tier 1 product, so the copper wire line stays busy until the end. Real high-temperature superconductors are copper-oxide ceramics, so copper plus a crystal is not far off. Used in superconducting towers (#125), superconducting coils (engine phase 5) and, as a rimeglass product, resonance cells (#101). Ratios come with the balance numbers.

## 2026-11-27 — Superconducting wire confirmed

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 127 | Superconducting wire | As proposed: copper wire + rimeglass + coolant, in a machine with three inputs; the coolant is used up in making it; no cooling in operation. | Recorded in the tier 5 row of the GDD. |

## 2026-11-27 — Catalogue and remaining gaps

The design now covers the systems, but not the full content: many items, machines and recipes are only named in the tier table, without recipe, machine or numbers. Open questions 62–65 frame a full catalogue; once they are answered, a catalogue draft follows for review. Questions 66–73 are remaining design gaps.

### Open

62. **Playtime target.** Answered by #128.
63. **Machine roster.** Answered by #129.
64. **Belt and pipe tiers.** Answered by #130.
65. **Where the catalogue lives.** Answered by #131.
66. **Water and the world's edge.** Answered by #132.
67. **Items between players.** Answered by #133.
68. **Item sink.** Answered by #134.
69. **UI language.** Answered by #135.
70. **Cosmetic building pieces.** Answered by #136.
71. **Weather.** Answered by #137.
72. **Settings menu.** Answered by #138.
73. **Defaults.** Answered by #139.

### Proposed, awaiting confirmation

- *(Confirmed as #128.)* **62:** about 40 hours of play for a team of three to wake the engine, roughly a semester at a few hours a week; phase 1 after about 2–3 hours, each later phase longer than the one before.
- *(Confirmed as #129.)* **63:** a Satisfactory-style roster with one machine per job shape: one input, two inputs, four inputs, smelting, alloy smelting, refining, fluid mixing. Production machines have no tiers; extractors get one tier per tiered ore (#17); speed comes from speed settings and upgrades (#118).
- *(Confirmed as #130.)* **64:** five belt tiers that double each time (30, 60, 120, 240, 480 items/min, in tiers 1 to 5); two pipe tiers for fluids and gases (300 and 600 m³/min, in tiers 2 and 4).
- *(Confirmed as #131.)* **65:** `docs/automata/catalogue.md` now, with resources, items, machines, buildings and recipes at starting numbers. Once Stage 4 brings `automata/core/src/catalog/`, the code is authoritative and the document points to it, as the GDD intro says.
- *(Confirmed as #132.)* **66:** a global sea level: terrain below it is water, so a sea surrounds the world beyond its radius and inland basins become lakes. Water pumps work on any lake or the sea; water wells stay for places without open water. Players can wade and swim slowly.
- *(Not taken: #133 shares items by drops and containers instead.)* **67:** a trade dialog between two nearby players in which both confirm; no ground drops, so no loose items to store.
- *(Confirmed as #134.)* **68:** an item sink (tier 1) and a fluid vent (tier 2) that destroy what they receive, without any reward.
- *(Confirmed as #135.)* **69:** English first, with every text in one string table, so German can follow without code changes.
- *(Confirmed as #136.)* **70:** a small cosmetic set (walls, windows, roofs, stairs, railings, lamps) without gameplay effects, since the team makes the art.
- *(Confirmed as #137.)* **71:** later, visual only, if time remains.
- *(Confirmed as #138.)* **72:** key rebinding, mouse sensitivity, field of view, view distance and graphics quality, volumes per category (#115), always day (#102), minimap on or off (#106), hints on or off (#110).
- *(Confirmed as #139.)* **73:** no team size limit below the world's maximum players; 32 players per world by default; default building limits 2 000 per player, 6 000 per team and 20 000 per world (the spec's entity cap). Whether an endgame factory at 1–2 GW (#121) fits under that cap and the tick budget is checked against the Stage 4 benchmark.

## 2026-11-27 — Catalogue frame, remaining gaps and sharing items

The author confirmed the proposals for open questions 62–73, except 67: items change hands by dropping them or through containers, not in a trade dialog.

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 128 | Playtime target | As proposed (open question 62): about 40 hours of play for a team of three from first login to waking the engine, roughly a semester at a few hours a week. Phase 1 after about 2–3 hours, each later phase longer than the one before. | Sets every quantity in the catalogue: phase amounts, recipe times, extractor rates. The pacing draft's "first power grid after about 1 h" no longer fits, since power arrives with tier 2 after phase 1 (#64); assumed: about 3 h. |
| 129 | Machine roster | As proposed (open question 63): a Satisfactory-style roster with one machine per job shape: one input, two inputs, four inputs, smelting, alloy smelting, refining, fluid mixing. Production machines have no tiers; extractors get one tier per tiered ore (#17). | Speed comes from speed settings and upgrades (#118, #123). Names, footprints, power and the recipes per machine come with the catalogue, which also fills the machine gaps for steel, concrete, sulfuric acid and coolant. |
| 130 | Belt and pipe tiers | As proposed (open question 64): five belt tiers that double each time (30, 60, 120, 240, 480 items/min, one in each of tiers 1 to 5); two pipe tiers for fluids and gases (300 and 600 m³/min, in tiers 2 and 4). | Tier rows in the GDD updated. The first pipe carries the water of five water pumps (target 60 m³/min) or one resonance reactor (300 m³/min, #101). |
| 131 | Catalogue location | As proposed (open question 65): `docs/automata/catalogue.md` now, with resources, items, machines, buildings and recipes at starting numbers. Once Stage 4 brings `automata/core/src/catalog/`, the code is authoritative and the document points to it. | Same rule as the GDD intro. The catalogue draft is the next step. |
| 132 | Water and the world's edge | As proposed (open question 66): a global sea level. Terrain below it is water, so a sea surrounds the world beyond its radius and inland basins become lakes. Water pumps work on any lake or the sea; water wells stay for places without open water. Players wade and swim slowly. | The generator lowers the terrain below sea level towards the radius and keeps the spawn (#38), the biome guarantees (#71, #96) and cave entrances (#69) on land, pinned by tests. The renderer draws a water surface, the map (#106) shades water, and the movement check gains wading and swimming. Assumed: the sea level is the same in every world, not a world setting (#45); the server stops swimmers a set distance beyond the radius; buildings may stand on the ground under shallow water as on land (#57). |
| 133 | Items between players | Not the trade dialog proposed for open question 67: players share items by dropping them on the ground, where anyone can pick them up, or through containers. Assumed from "public/team containers": containers gain a third setting, **public**, next to private and team: every player in the world can put items in and take them out. | Supersedes "only one private level" in #28 and extends #72: opening a public container is the one exception to "only that team opens it"; configuring and removing it stay with the owning team and the world owner (#24). Belts and pipes still connect only to the own team's buildings (#98), so public containers are filled and emptied by hand. Picking up another team's item counts as obtained (#74); recipes and buildings still need their tier (#64, #81). Opened: dropped items in detail (74), items above a team's tier (75). |
| 134 | Item sink and vent | As proposed (open question 68): an item sink (tier 1) and a fluid vent (tier 2) destroy what they receive, without any reward. | Tier rows in the GDD updated. The vent also takes gases once they arrive (tier 5). Assumed: the statistics panel (#80) counts what they destroy as consumed. |
| 135 | UI language | As proposed (open question 69): English first, with every text in one string table, so German can follow without code changes. | Assumed: item, machine and recipe names from the catalogue go through the string table too; a test checks that every key has an English text. |
| 136 | Cosmetic pieces | As proposed (open question 70): walls, windows, roofs, stairs, railings and lamps, without gameplay effects. | The team makes their art (#111). Assumed: like every building they cost materials and count towards the building limits (#87); collision follows #104 (stairs walkable); lamps need no power and are light sources for caves and nights in the renderer. |
| 137 | Weather | As proposed (open question 71): visual-only rain and snow, later and only if time remains. | Not part of the v1 scope confirmed by #117; the stage plans list it as optional. |
| 138 | Settings menu | As proposed (open question 72): key rebinding, mouse sensitivity, field of view, view distance and graphics quality, volumes per category (#115), always day (#102), minimap on or off (#106), hints on or off (#110). | Assumed: stored per user; view distance and graphics quality per device, since they depend on the GPU. |
| 139 | Defaults | As proposed (open question 73): no team size limit below the world's maximum players; 32 players per world by default; default building limits 2 000 per player, 6 000 per team and 20 000 per world (the spec's entity cap). | The world owner adjusts both later (#87), within the server cap. Whether an endgame factory at 1–2 GW (#121) fits under 20 000 buildings and the tick budget is checked against the Stage 4 benchmark. |

### Open

74. **Dropped items.** What a drop looks like, who picks it up, whether it ever disappears, and what keeps drops from filling a world.
75. **Items above a team's tier.** Under #133, items reach teams that have not unlocked their tier. Recipes and buildings still need the tier (#64, #81), but some items are used directly: a team could mine with a pickaxe it cannot make yet, install an upgrade from a later tier, or deliver engine parts another team built and skip a phase.

### Proposed, awaiting confirmation

- **74:** dropping a stack (drag it out of the inventory window, or G for the selected hotbar item) puts it into a ground pile at the player's feet. A pile works like the dismantle crate (#89), but open to everyone: it holds whatever is dropped at that spot, shows the items' belt models (#8), and disappears when empty. Any player takes from it with E (#113). Piles never disappear on their own, since nothing respawns (#20). While it exists, a pile counts towards the building limit (#87) of the player who started it, so drops cannot fill a world, and the world owner can remove any pile (#24).
- **75:** one rule for use: an item can always be held, stored and passed on, but it works at most at the highest tier its holder's team has unlocked. A pickaxe from a later tier mines like the team's best pickaxe; an upgrade from a locked tier cannot be installed. This also covers a player who joins a team that is behind their solo team (#81). Engine parts and relics cannot be dropped or put into public containers, so each team still builds its own phases (#64); inside a team they move freely. Alternative: allow everything and treat it as cooperation, which the world overview (#109) shows a teacher.

## Where things stand (end of 2026-11-27)

Session paused here; the next one starts from this list.

1. **Answer open questions 74–75** (entry *Catalogue frame, remaining gaps and sharing items*, each with a proposal), by number. Both follow from #133.
2. **Draft `docs/automata/catalogue.md`** (#131) from #128–#130: every item per tier, the machine roster with inputs, outputs, footprint and power, recipes at starting numbers, extractor tiers and rates, tools, storage sizes, cosmetic pieces, engine phase quantities, loot tables, puzzles and alternative recipes. Settle the GDD's remaining **Draft** markers in the same pass: biome deposits, spawn distances, pacing, scanner, ruins and puzzles, machine upgrade sources, energy numbers, whether stone tools need the workbench.
   - Known gaps the catalogue closes: machines for steel, concrete, sulfuric acid and coolant; recipes for copper sheet, wooden beam, iron rod and gear, resonator, rimeglass lens, cryo lattices, concordite parts and resonance cells; extractor tiers; container sizes; phase quantities; engine part names (#116).
3. **Rewrite the spec and stage plans** in `docs/superpowers/` (#54) from this log, the GDD and the catalogue: fold in the plan review findings that are still open (first entry: A1–A3, A6, B5, B7, B8 and the smaller ones, including the `AGENTS.md` architecture map), and give every feature added since #49 a stage (#117), including sea and lakes (#132), drops and public containers (#133), sink and vent (#134), the string table (#135), cosmetic pieces (#136) and the settings menu (#138). Weather is listed as optional (#137).

- **Parked:** player health (open question 59).
- **Assumptions to confirm on the way:** #123 treats the rest of the energy draft (GDD section 12) as the working basis; #133 reads "public/team containers" as a new public setting next to the team one.
