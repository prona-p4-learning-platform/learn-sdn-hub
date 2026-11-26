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
| 24 | Rights and teams | Plots stay. The world owner has full rights on every plot. Below the owner, a team system with its own team management, in the style of FTB Teams (inspired by, not copied). | Teams replace the platform group as the in-game ownership unit. Needs team management UI and protocol (create team, invite, roles, leave). Details are open question 20. |
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
| 27 | Teams and claims | Teams exist per world. Roles: one owner, admins, and members. Members claim land. Team owner and admins can unclaim land a member claimed and have full access within the team, except members' private storages. | Land is claimed by area (in the style of FTB Chunks) instead of plots allocated in ring order around spawn as in the spec. Review B2 (per-plot deposit guarantee) no longer applies, because there are no fixed plots. Containers get a private flag that only their owner can open. Needs team and claim management in protocol and UI. |

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
| 28 | Private containers | The world owner's full rights on every plot (#24) do not include containers set to private. | A container is either private or not (corrected from "fully private"; there is only one private level). Private: only the player who owns it can open it, not the team owner or admins, not the world owner. Not private: open to the owner's team. Platform admins: #31; removal: #32. |
| 29 | Solo teams | Every player is always in a team. A player on their own has a solo team, named by default after their username until they rename it. | Team is always set, so ownership never falls back to a single player outside the team model. The solo team persists: claims return to it when a player leaves a team (#30). |
| 30 | Claims | A claim is a 32 × 32 m area (matching the terrain chunk size). The world owner sets the claim limit. When a player leaves or abandons their team, their buildings stay and their claims stay, but move back to their solo team. | Claims follow the member who made them. The claim limit is a world setting the owner can change later (bounded by a server cap). A claim covers the full height, from bedrock to the build ceiling (assumed, so caves are included). |

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
| 34 | Claim limits | There is a limit per player, per team and for the whole world. The world owner sets all three. | A claim succeeds only if none of the three limits would be exceeded. All three are bounded by a server cap. |

### Open

32. **Team without admins.** Answered by #37.

### Proposed, awaiting confirmation

- **Claims follow the player who made them (open question 28):** confirmed as #35.
- **Buildings belong to whoever owns the land (open question 29):** confirmed as #36.

## 2026-11-26 — Claim and building ownership

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 35 | Claims follow the player | A claim is stored with the player who made it; the team it shows is always that player's current team. Joining a team brings the player's claims into it; leaving takes them back to the solo team (#30). If joining would push the team over its claim limit (#34), the join is still allowed, but the team cannot claim more until it is back under the limit. | Joining and leaving move nothing in the data; claim → player → current team is looked up. |
| 36 | Buildings follow the land | A building on claimed land belongs to whoever owns that land. Example: Alice and Bob are in team X; Bob built a smelter on Alice's claim; when Alice leaves, her claim returns to her solo team and the smelter becomes hers. Private containers stay their owner's, but the new land owner can remove them, destroying their contents (#32). Buildings on unclaimed land belong to the builder's current team. | Each building also stores the player who built it, so buildings on unclaimed land can follow their builder (#37). |
| 37 | Team without admins | When the team owner leaves and the team has no admins, the team is disbanded: every member returns to their solo team, and their claims go with them (#35). | Buildings on claimed land follow the claims (#36). Buildings the team had on unclaimed land go to the solo team of the player who built them (derived from #36). |

## 2026-11-26 — Remaining questions and proposals

### Decided

| # | Topic | Decision | Consequences |
|---|---|---|---|
| 38 | Biomes | Five biomes: grassland, forest, highlands, desert, tundra. A biome sets tree density and leaf colour, ground colour, terrain relief, how common each kind of deposit is, and how many stones, branches and rock formations there are. No gameplay effects such as temperature. The spawn point is always in grassland or forest. | Biome map from the seed in core. Uneven deposit distribution makes transport over distance part of the game. The spawn rule prevents a start without branches. |
| 39 | Building over objects | Trees and rock formations block building; players harvest them first. Stones and branches on the ground do not block: building over them moves them into the builder's inventory; if it is full, the build is refused. | Keeps the tier system intact (nobody clears a rock their pickaxe cannot mine). Placement checks include world objects. |
| 40 | Stone source | Infinite stone and limestone deposits (like resource wells, just for stone), mined with the pickaxe and with extractors. | Stone never runs out, although loose stones and rock formations do. Derived: at least one stone deposit near spawn, minable with the first pickaxe. |
| 41 | Saplings | Every harvested tree drops at least one sapling. A tree grows in about 10 minutes of real time, computed from the planting time (so also while the world is unloaded). Saplings go on natural ground only, not on foundations; leaf colour follows the biome where the sapling is planted. An automated tree farm machine arrives at a mid tier. | Wood is renewable by hand and later automatically. |
| 42 | Public and private worlds | Public worlds are listed for everyone who can open the game. The list shows world name, player count and preset, no usernames. Private worlds are never listed for non-members; they are reached only with an invite code, and members find them under their own worlds. | The game no longer looks up courses (review A5 mostly obsolete); review A4 (who may open the game) stays. |
| 43 | Course and group worlds | No special world types. A teacher creates a normal world and shares an invite code with the course. Platform groups play no part in the game; teams replace them. | Course, group and sandbox world types leave the spec. |
| 44 | Limits and cleanup | A user owns at most 3 worlds (environment variable). No automatic deletion (optional lifetime variable, off by default). Deleting a world needs the world name typed as confirmation; the world is kept for 7 days and the owner can restore it; members get a notice. The owner can transfer world ownership to a world admin. | Replaces the sandbox TTL and its daily cleanup job. |
| 45 | World settings | Confirmed as proposed under open question 21 (settings table and presets). | — |
| 46 | World and team roles | Confirmed as proposed under open question 22: separate role sets; world admins create and revoke invite codes, kick and ban; team invites happen inside the world without codes. | — |
| 47 | Unlocks | Shared per team and never lost: joining a team merges the player's unlocks into the team's; leaving copies the team's unlocks to the player's solo team. | — |
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
| 61 | Refund and drag cost | Confirmed as proposed: a removal whose refund does not fit is refused; a drag placement is paid in full or refused. | — |

## 2026-11-26 — Tiers, machine upgrades and ruins (proposals)

The author asked for a tier recommendation drawing on modded Minecraft, Terraria and Satisfactory (invented materials welcome), whether single machines should be boostable (Mekanism-style upgrades or Satisfactory-style power slugs and somersloops), and whether generated structures with loot and puzzles should reward exploration beyond deposits. The proposals are written out in `game-design.md` (section 6 *Ruins*, section 9, section 11 *Machine upgrades*); the author is reviewing them.

### Proposed, awaiting review

- **Tier principle (keeps #17).** Each tier brings a new material, a new place and a new kind of problem. The next pickaxe and extractor cost many processed parts of the current tier, so the factory sets the pace, not hand-mining.
- **Tier ladder.** 0 primitive, 1 copper, 2 iron plus steel, 3 thrumite (cave crystal, stores energy), 4 pyrelith (desert, heat, slag by-product), 5 rimeglass (tundra, needs pressurised gas as coolant), 6 concordite (fused from the three, not mined). Replaces the first draft: steel moves into tier 2, batteries to tier 3, oil to tier 4, gas to tier 5. The biome deposit column changes accordingly.
- **Final goal.** An ancient engine at the world centre, fed concordite parts at set rates in phases. In-game only; not the assignment goals left out by #25.
- **Machine upgrades.** 3 upgrade slots and 1 core slot per machine: mainspring (+50 % speed, power grows faster), escapement (−25 % energy per item), harmonic core (double output at about 4× power; vault-only, never craftable, limited per world).
- **Ruins.** Wrecks (surface, common), vaults (caves, puzzle door), ancient seals (deep, rare; concordite tools plus a large puzzle). Puzzles are delivery, power, pressure and routing tasks (#6).
- **Loot.** Once per structure per team; a player who looted a structure cannot loot it again through another team.
- **Progression dependency.** From tier 3 on, each tier's key machine blueprint lies in a vault in that tier's biome; generation guarantees enough vaults. Upgrades and alternative recipes are optional.
- **Scanner.** From tier 1; points to the nearest deposit of a chosen kind; an upgrade also finds ruins.
- **Stage placement.** Ruins are generated with the world in Stage 2; loot and the once-per-team rule in Stage 3; upgrades, alternative recipes, the scanner and delivery puzzles in Stage 4; power and pressure puzzles, tiers 2 to 6 and the final goal in Stage 5.

### Open

36. **Final goal scope.** One engine per world that all teams build up together, or one per team?
37. **Invented names.** Thrumite, pyrelith, rimeglass and concordite are placeholders until checked for existing use.

## Where things stand (end of 2026-11-26)

- **Awaiting the author's review:** the proposals in the entry above and every **Draft** marker in `game-design.md` (biome deposits, copper and coal within about 200 m of spawn, hand mining slower than the first extractor, the unlock rule, the tier ladder and pacing targets, stone tools without a workbench, ruins and puzzles, machine upgrades, the final goal); open questions 36 and 37.
- **No proposal yet:** inventory and stack sizes, the gathering key, audio. Recipe numbers come with implementation.
- **Next step after the review:** rewrite the spec and stage plans in `docs/superpowers/` from this log and the GDD (#54), folding in the plan review findings that are still open (first entry).
