# Automata — Game Design Document

Living document: what the game is and why. Numbers here are design targets; once implemented, the authoritative values live in code (`automata/core/src/catalog/`) and this document links to them. Decisions are referenced as #N from [`decisions.md`](decisions.md). Sections marked **Draft** are proposals for the author to review.

## 1. Pitch

Automata is a first-person multiplayer factory game in a shared, persistent 3D world, played in the browser. Players start with nothing, pick up stones and branches, craft their first tools by hand, and grow a camp into an automated factory with belts, machines, power, fluids and gases.

## 2. Learning focus

Resource management and bottlenecks (#5). The interesting problems are:

- **Ratios.** Machines run at different speeds, so producers and consumers have to be balanced.
- **Capacity limits.** Belt and pipe tiers cap throughput; one undersized segment throttles a whole line.
- **Scarcity.** Surface resources never respawn (#20). Infinite deposits are spread unevenly across biomes (#38), so transport over distance matters.
- **Shared infrastructure.** Power grids and pipe networks are shared by everything connected to them.

The game shows these problems instead of hiding them: every machine shows its status (working, starved, blocked, unpowered), belts and pipes show how full they are, and a statistics panel compares produced and consumed amounts per resource.

There is no programming or scripting; machines are only configured, e.g. recipe choice and splitter filters (#6).

## 3. Platform integration

- A game assignment appears in the assignment list. Starting it starts the game (#21). The assignment carries a lab sheet; goals and grading are not part of the core game (#25).
- Only users who can see the game assignment can open the game.
- Worlds do not belong to an assignment; several game assignments lead into the same worlds.

## 4. Main menu and worlds

The main menu has four entries: **My worlds** (owned and joined), **Public worlds**, **Join with code**, **Create world**.

### Creating a world (#23, #45)

Fixed at creation:

| Setting | Options | Default |
|---|---|---|
| Seed | text or number; random if left empty | random |
| World size | small / medium / large (radius 512 / 1024 / 2048 m) | medium |
| Terrain relief | gentle / normal / rugged | normal |
| Biome size | small / normal / large | normal |
| Deposits | sparse / normal / rich | normal |
| Surface resources (trees, stones, branches, rock formations) | sparse / normal / rich | normal |

Presets: **Standard**, **Scarce** (sparse deposits and surface resources; puts resource management first) and **Plentiful** (rich; for worlds with many players, since nothing respawns). An *Advanced* section exposes the single settings.

The world owner can change later: name, visibility, maximum players, and the claim limits (#34). Caves, recipes, tiers, rates and the tick rate are not settings. Server operators cap everything (worlds per user, world size, players per world).

### Visibility (#42)

- **Public:** listed for everyone who can open the game, showing world name, player count and preset. No usernames.
- **Private:** never listed for non-members; reached only with an invite code.

### Invite codes (#22, #26)

Created by the world owner and world admins. Reusable until they expire or are revoked. Whoever joins with a code stays a player of that world and rejoins from *My worlds* without a code, until removed or banned.

### World roles (#46)

| Role | Can |
|---|---|
| World owner | everything; full rights on every claim except private containers (#24, #28); change settings that are changeable; transfer ownership to a world admin; delete the world |
| World admin | create and revoke invite codes, kick, ban |
| Player | play |

Platform admins can join any world for moderation.

### Limits and deletion (#44)

A user owns at most 3 worlds. Worlds are never deleted automatically. Deleting a world requires typing its name; it is kept for 7 days and the owner can restore it; members get a notice.

## 5. Teams and land

- **Teams (#27, #29).** Every player is always in exactly one team per world. Alone, a player has a solo team named after their username until they rename it. Roles: one owner, admins, members. Team invites happen inside the world: a team owner or admin invites a player who is there; the player accepts (#46).
- **Claims (#30, #34, #35).** A claim is a 32 × 32 m column over the full height, caves included. Members claim land. Team owner and admins can unclaim land a member claimed. Limits per player, per team and per world, all set by the world owner. A claim belongs to the player who made it and counts for that player's current team.
- **Buildings (#36).** A building on claimed land belongs to whoever owns the land. A building on unclaimed land belongs to the builder's current team.
- **Leaving a team (#30, #33, #37).** The player's claims and the buildings on them go back to their solo team. A leaving team owner picks an admin as successor, otherwise a random admin takes over; without admins the team is disbanded and everyone returns to their solo team.
- **Containers (#28, #31, #32).** A container is either private (only its owner opens it) or open to the owner's team. Platform admins can view private containers but not take anything. The world owner and team admins can remove a private container; its contents are destroyed (with a confirmation naming the owner).
- **Unlocks (#47).** Shared per team and never lost: joining merges the player's unlocks into the team's; leaving copies the team's unlocks to the solo team. Completed engine phases are unlocks; parts delivered towards an unfinished phase stay with the team (#68).
- **Inventory (#3).** Per player. Teams share through containers.

## 6. The world

Terrain is smooth, static (not editable) and generated from the seed, with caves below the surface.

### Biomes (#38) — **Draft** for the deposit column

| Biome | Trees | Leaf colour | Ground | Relief | More common deposits |
|---|---|---|---|---|---|
| Grassland | sparse to medium | fresh green | green | gentle | water wells, copper ore, limestone |
| Forest | dense | dark green | dark green and brown | gentle to medium | coal, copper ore; thrumite in caves |
| Highlands | sparse | yellow-green | grey rock | rugged | iron ore, stone, geothermal vents with sulfur around them; thrumite in caves |
| Desert | almost none | olive | sand | gentle dunes | crude oil, sand, natural gas, limestone; pyrelith deep down |
| Tundra | sparse | pale blue-green | snow | medium | natural gas, ice; rimeglass deep down |

One wood type and one tree model; only the leaf colour changes (#14).

### Spawn (#38, #40)

Always in grassland or forest, with loose stones, branches, trees and a stone deposit nearby. **Draft:** copper ore and coal within about 200 m, so the first smelting does not need a long walk.

### World objects

| Object | Gathered with | Yields | Renews |
|---|---|---|---|
| Loose stone | hand | stone | no |
| Branch | hand | wood | no |
| Tree | axe | wood, at least 1 sapling | by planting saplings (#41) |
| Rock formation | pickaxe | stone | no |
| Solid deposit (ores, stone, limestone, coal, sulfur, sand, ice) | pickaxe or extractor | its resource | infinite |
| Well or vent (fluids, gases) | pump or gas extractor only | its resource | infinite |

Trees and rock formations block building; loose stones and branches under a new building go into the builder's inventory (#39).

**Saplings (#41).** A tree grows in about 10 minutes of real time, also while the world is unloaded. Saplings go on natural ground only. An automated tree farm arrives at a mid tier.

### Ruins — **Draft**

The old automata, a machine civilisation that came before the players, left ruins behind. They give the game its name and a reason to explore beyond deposits.

| Structure | Where | How to get in | Loot |
|---|---|---|---|
| Wreck | surface, common | walk in; some need a minimum pickaxe tier to break open (#19) | ancient gears, parts |
| Vault | caves, several per biome | a puzzle at the door | harmonic cores, alternative recipes, engine relics (#67) |
| Ancient seal | deep, rare | concordite tools plus a large puzzle | the phase 6 relic, rare alternative recipes |

**Puzzles** use the game's own mechanics, never programming (#6). Each is a throughput or balancing problem:

- **Delivery:** the door opens once it receives e.g. 20 copper wire/min and 10 iron plates/min for 2 minutes.
- **Power:** keep between 40 and 45 MW flowing for one minute.
- **Pressure:** fill a chamber to a pressure range and hold it there.
- **Routing:** rotate pipe pieces until the flow connects.

**Loot** can be taken once per structure per team. A player who already looted a structure cannot loot it again after switching teams. Teams of late joiners still get their share, which softens #20.

**Alternative recipes** from vaults change a recipe's ratios or ingredients, so players get optimisation choices.

## 7. Gathering and tools

- Hands pick up loose stones and branches.
- The axe harvests trees; the pickaxe mines solid deposits and rock formations, never terrain (#19).
- Tools have no durability (#13).
- A tool's tier decides what it can mine (see *Tier ladder*).
- **Draft:** mining by hand is deliberately slower than the first extractor, so automating pays off right away.

## 8. Crafting

- **By hand:** basic tools (#16).
- **Workbench:** everything beyond basic tools, i.e. better tools and intermediate parts (e.g. plates, gears, wire) until machines take over. The player has to be within reach of a placed workbench.
- **Buildings are not crafted (#56).** They are placed directly by paying their cost, the workbench itself included (wood).
- **Machines** take over automated production. The furnace is the first machine: it smelts and burns wood or coal, no power needed.
- **Unlock rule (#18, #64):** a tier's entry recipes (the pickaxe and extractor that mine its ore, and the machines that tap its other new sources) unlock when the team completes the engine phase before it (see *Tier ladder*). Within an unlocked tier, a recipe or building becomes available to a team once the team has obtained each of its inputs (or cost items) at least once. Hand recipes are available from the start.

## 9. Tier ladder — **Draft** for the contents

**Structure (#17, #62).** A tier is not one new ore. It brings:

- one tiered ore, mined with a pickaxe or extractor of the previous tier or higher (#17);
- one or two other new sources: wells, vents or deposits. The pickaxe does not gate them; the machine that taps them does (pump, oil pump, gas extractor), and the tier unlocks that machine;
- products that combine the new sources with earlier tiers' materials, so earlier production lines stay in use (copper wire is still needed in tier 5);
- one new problem.

No single resource carries a tier; the engine phase checks that all of a tier's sources are used (see *The ancient engine*). The next pickaxe and extractor cost many processed parts of the current tier, so the factory sets the pace of progress, not hand-mining.

**Progression (#64).** Completing engine phase N unlocks tier N+1's entry recipes for the team: the pickaxe and extractor that mine its ore and the machines that tap its other new sources. Within an unlocked tier, recipes unlock as the team obtains their inputs (#18, section 8). Tiers 0 and 1 need no phase.

| Tier | Tiered ore (where) | Mined with | Other new sources | New problem | Main unlocks | Fits stage |
|---|---|---|---|---|---|---|
| 0 | none; wood and loose stone (spawn) | hands | trees, rock formations, stone deposit | scarcity: nothing respawns | hand: stone axe and pickaxe; placeable: workbench (wood), wooden chest, furnace (stone), simple supports (wood) | 3 |
| 1 | copper ore (grassland, forest; surface) | stone pickaxe | coal deposits; stone and wood get processed | first automation; ratios (extractors vs. furnaces) | copper ingot, wire and sheet, stone brick, wooden beam, charcoal; burner extractor (burns wood, charcoal or coal), belts, splitter and merger, supports, vertical belts, scanner, engine link | 3–4 |
| 2 | iron ore (highlands; surface and shallow caves) | copper pickaxe | water wells, limestone deposits, tree farm (renewable wood) | shared power grid, water, recipes with several inputs | iron plate, rod and gear, steel (iron + coal), concrete (limestone + water); coal generator with water pump, poles, electric extractor, constructor, pipes, tank, faster belts, tree farm | 4–5 |
| 3 | **thrumite**, a humming crystal that stores energy (cave walls below about −30 m in forest and highlands) | iron pickaxe | geothermal vents with sulfur deposits around them (highlands) | caves: moving things up and down; storing power; power from fixed places | sulfuric acid (sulfur + water), resonator, storage cell; batteries, geothermal generator, faster belts | 5 |
| 4 | **pyrelith**, a stone that holds heat (deep under the desert, next to oil) | thrumite pickaxe | crude oil wells, sand deposits (desert) | by-products: smelting pyrelith makes slag, which blocks the machine unless it is carried away | pyrelith ingot, glass (sand), plastic and fuel (oil), gravel from slag (goes into concrete); oil pump, refinery, slag processing, fuel generator | 5 |
| 5 | **rimeglass**, a crystal that has to stay cold (deep under the tundra) | pyrelith pickaxe | natural gas wells (tundra, desert), ice deposits (tundra) | gas pressure and cooling: ice is a cheap coolant carried on belts, pressurised natural gas handles more throughput | coolant, rimeglass lens, superconducting wire; gas extractor, compressor, pressure tanks | 5 |
| 6 | **concordite**, an alloy fused from thrumite, pyrelith and rimeglass products (made, not mined) | — | — | long distances: three far-apart biomes at once | concordite ingot and parts, concordite tools | 5 |

Solids come first without a power grid (burner machines use fuel), which matches Stage 4; power, fluids and gases arrive with tiers 2 to 5, which matches Stage 5. Phase 1 gates tier 2, so the engine link and phase deliveries belong to Stage 4.

### The ancient engine (#63–#67)

An ancient engine stands at the centre of the world, one per world. Each team restores it on its own, and every player sees their own team's progress (#64). Teams deliver at an **engine link** they build in their base, as the space elevator stands in the player's base in Satisfactory; the engine at the centre is the landmark and lights up with each completed phase (#65). It is an in-game goal, not the assignment goals and grading left out by #25.

- **One phase per tier (#63).** Phase N asks for 2–3 engine parts built from all of tier N's sources, plus more of phase N−1's part, so earlier lines keep running (as Smart Plating returns in Satisfactory's second elevator phase).
- **Quantities, then a rate (#66).** Phases 1–5 ask for fixed quantities; stockpiled parts count, so a slow factory still progresses. Phase 6 asks for a rate held over a set time: the final throughput test.
- **Relics (#67).** From phase 3 on, each phase also needs one relic from a vault in that tier's biome, so exploration stays required without a separate lock. Loot is taken once per structure per team (see *Ruins*), so every team can take a relic from each vault; the world generator guarantees enough vaults per biome, so progress never depends on luck. Tier 6 has no biome; its relic lies in an ancient seal.
- **Changing teams (#68).** Completed phases are unlocks and follow #47. Parts delivered towards an unfinished phase belong to the team: a joining player's partial deliveries do not carry over, and a leaving player's solo team starts that phase at 0. The join and leave dialogs say what will be lost.

Part names and recipes are placeholders:

| Phase | Asks for | Relic from | Completing it unlocks |
|---|---|---|---|
| 1 | wired frames (wooden beam + copper wire), brick housings (stone brick + copper sheet) | — | tier 2 |
| 2 | motors (rod + gear + copper wire), reinforced casings (steel + concrete), wired frames | — | tier 3 |
| 3 | resonant coils (thrumite + copper wire + steel), storage cells (thrumite + sulfuric acid + reinforced casing), motors | a vault in forest or highland caves | tier 4 |
| 4 | heat exchangers (pyrelith + steel + glass), polymer housings (plastic + glass), resonant coils | a vault in the desert | tier 5 |
| 5 | superconducting coils, cryo lattices, heat exchangers | a vault in the tundra | tier 6 |
| 6 | concordite parts at a rate held over a set time | an ancient seal | the engine wakes up: the final goal |

**Scanner.** From tier 1, points to the nearest deposit of a chosen kind; a later upgrade also finds ruins.

**Names.** Thrumite, pyrelith, rimeglass, concordite and the engine part names are invented placeholders; check that none is already in use before settling on them.

**Pacing targets (to tune):**

| Milestone | Target time from first login |
|---|---|
| Stone axe and pickaxe | about 2 min |
| Workbench placed | about 5 min |
| First copper ingot | about 10 min |
| First automated line (burner extractor → belt → furnace → chest) | 20–30 min |
| First power grid | about 1 h |

**For the author to decide:** the sources, products and engine parts per tier; the names; whether hand-crafted stone tools need the workbench (draft: no).

## 10. Building

- **Grid.** 1 m cells, 90° rotations.
- **No foundation requirement (#57).** Everything can be placed where the ground allows it. The ground under a building's footprint may vary by at most 1 m; the building snaps to the grid level of the lowest point and may sink into the higher side; the rest of its volume must be free.
- **Foundations** (4 × 4 × 1 m) create perfectly flat areas, stack into floors and lift a factory off the ground (#57, #59). As in Satisfactory, they need nothing underneath (there is no structural physics); a foundation may be partly inside the terrain but not completely. Ramps let players walk up to higher floors.
- **Extractors** snap to a deposit.
- **Supports and vertical transport (#53, #55).** Supports carry belts and pipes, stand on terrain or on foundations, and stack. Limits (#60):
  - A support is adjustable from 1 to 8 m in 1 m steps.
  - Supports stack without a count limit, up to the build ceiling.
  - At most 16 m between two supports; drag placement adds supports automatically where a run needs them.
  - A belt or pipe between two supports at different heights rises at most 1 m per 2 m (about 27°).
  - Steeper changes use vertical belts and vertical pipes: 1 to 16 m per piece, stackable, e.g. out of caves.
- **Cost and refund (#1, #4, #56).** The cost is paid from the inventory when placing, as in Satisfactory; the build menu shows it. Removing a building puts its full cost back into the inventory. If the refund does not fit, the removal is refused (as building over loose stones with a full inventory is, #39). A drag placement shows its total cost, automatic supports included, and is refused as a whole if the inventory cannot pay it (#61).
- **Placement (#52).** Drag placement for belts, pipes and wires (click the start, click the end). Build reach about 20–30 m.

## 11. Logistics and production

- **Belts** show every item they carry as a small 3D model (#8). Belt tiers have fixed speeds.
- **Splitters and mergers**; splitters can filter by item.
- **Machines** have input buffers, crafting progress and output buffers. A full output stops the machine.
- **Status everywhere:** each machine shows working, starved, blocked or unpowered; belts and pipes show their fill; a statistics panel shows produced and consumed amounts per resource.

### Machine upgrades — **Draft**

Slots as in Mekanism, rare ingredients from exploring as in Satisfactory. Each machine has 3 upgrade slots and 1 core slot.

| Upgrade | Effect | Downside | Source |
|---|---|---|---|
| Mainspring | +50 % speed each, up to 3 | power (or fuel) use grows faster than speed | crafted from tier 2; needs ancient gears from ruins |
| Escapement | −25 % energy per item each | takes a slot a mainspring could use | crafted from tier 3 |
| Harmonic core | doubles output without extra input | about 4× the power; one per machine | found only in vaults; never craftable; limited per world |

Speeding up one machine moves the bottleneck to its inputs, its outputs or the power grid, and the status displays show it moving. A harmonic core turns a single machine into a ratio problem.

## 12. Power, fluids and gases

- **Power.** A grid is everything connected by poles and wires. When demand exceeds supply, every consumer in the grid runs at the same reduced rate; batteries buffer.
- **Fluids.** A pipe network carries one fluid. Its capacity is set by its weakest pipe tier; producers and consumers share it proportionally.
- **Gases.** Like fluids, plus pressure: producers stop at their maximum pressure, consumers need a minimum, and compressors raise pressure between two networks.
- Fluids and gases never mix: connecting networks with different contents is refused.

## 13. Controls and camera

First person only (#7): WASD, mouse look, pointer lock, jump, build mode with a snapped preview, R rotates, X removes, fullscreen toggle. Key for gathering and picking up: to be decided.

## 14. Art and audio

- Low-poly, flat colours from one shared palette texture, so all buildings fit one rendering path.
- Every item has a small 3D model for belts plus an icon for the UI.
- Asset layout and conventions: #51.
- Audio: to be decided.

## 15. Performance and accessibility

- 60 fps at the default view distance on an integrated GPU.
- Status is never shown by colour alone: always an icon plus colour, so it works for colour-blind players.

## 16. Open points

- Review of every **Draft** marker: biome deposits and spawn distances (section 6), ruins and puzzles (6), hand mining speed (7), tier and phase contents, scanner and pacing (9), machine upgrades (11).- Recipes and balance numbers.
- Inventory size and stack sizes.
- Key for gathering and picking up.
- Audio.
