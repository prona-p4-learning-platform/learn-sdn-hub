# Automata — Game Design Document

Living document: what the game is and why. Numbers here are design targets; the full content (items, machines, buildings, recipes at starting numbers) goes into `catalogue.md` (#131); once implemented, the authoritative values live in code (`automata/core/src/catalog/`) and this document links to them. Decisions are referenced as #N from [`decisions.md`](decisions.md). Sections marked **Draft** are proposals for the author to review.

## 1. Pitch

Automata is a first-person multiplayer factory game in a shared, persistent 3D world, played in the browser. Players start with nothing, pick up stones and branches, craft their first tools by hand, and grow a camp into an automated factory with belts, machines, power, fluids and gases.

## 2. Learning focus

Resource management and bottlenecks (#5). The interesting problems are:

- **Ratios.** Machines run at different speeds, so producers and consumers have to be balanced.
- **Capacity limits.** Belt and pipe tiers cap throughput; one undersized segment throttles a whole line.
- **Scarcity.** Surface resources never respawn (#20). Infinite deposits are spread unevenly across biomes (#38), so transport over distance matters.
- **Shared infrastructure.** Power grids and pipe networks are shared by everything connected to them.

The game shows these problems instead of hiding them: every machine shows its status (working, starved, blocked, unpowered), belts and pipes show how full they are, and a statistics panel compares produced and consumed amounts per resource, for the own team and for the whole world (#80).

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
| World size | small / medium / large (radius 4096 / 8192 / 16 384 m, #91, #95) | medium |
| Terrain relief | gentle / normal / rugged | normal |
| Biome size | small / normal / large | normal |
| Deposits | sparse / normal / rich | normal |
| Surface resources (trees, stones, branches, rock formations) | sparse / normal / rich | normal |

Presets: **Standard**, **Scarce** (sparse deposits and surface resources; puts resource management first) and **Plentiful** (rich; for worlds with many players, since nothing respawns). An *Advanced* section exposes the single settings.

The world owner can change later: name, visibility, maximum players (default 32), the building limits per player, per team and per world (#87; defaults 2 000 / 6 000 / 20 000, #139), and **items on death**: death crate (default) or keep everything (#146). Caves, recipes, tiers, rates and the tick rate are not settings. Server operators cap everything (worlds per user, world size, players per world).

### Visibility (#42)

- **Public:** listed for everyone who can open the game, showing world name, player count and preset. No usernames.
- **Private:** never listed for non-members; reached only with an invite code.

### Invite codes (#22, #26)

Created by the world owner and world admins. Reusable until they expire or are revoked. Whoever joins with a code stays a player of that world and rejoins from *My worlds* without a code, until removed or banned.

### World roles (#46)

| Role | Can |
|---|---|
| World owner | everything; full rights on every building except private containers (#24, #28, #72); change settings that are changeable; transfer ownership to a world admin; delete the world |
| World admin | create and revoke invite codes, kick, ban |
| Player | play |

Platform admins can join any world for moderation.

**Kick and ban (#82).** A kick removes a player from the world until they use a valid code again; their team, inventory and buildings stay. A ban also blocks codes: the player leaves their team, and the world owner or a world admin can remove everything they built for their solo team in one action. World admins act against players, the world owner against world admins, platform admins against the world owner. The world owner cannot leave without transferring ownership (#44).

### Limits and deletion (#44)

A user owns at most 3 worlds. Worlds are never deleted automatically. Deleting a world requires typing its name; it is kept for 7 days and the owner can restore it; members get a notice.

## 5. Teams and ownership

- **Teams (#27, #29).** Every player is always in exactly one team per world. Alone, a player has a solo team named after their username until they rename it. Roles: one owner, admins, members. There is no team size limit below the world's maximum players (#139). Team invites happen inside the world: a team owner or admin invites a player who is there; the player accepts (#46). The team owner removes admins and members, team admins remove members; a removed member returns to their solo team, as on leaving (#97).
- **Protection instead of claims (#72).** There are no claims. What a team builds is protected: only that team opens, configures or removes it; public containers are the one exception for opening (#133). Saplings a team plants, and the trees grown from them, count as built by that team. Everything generated with the world (trees, stones, branches, rock and wall formations, deposits, wells, ruins) is open to everyone; a deposit is held by the first extractor placed on it. Belts, pipes and wires connect only to the own team's buildings (#98); teams that want to share a factory join one team.
- **Changing teams (#33, #37).** A leaving team owner picks an admin as successor, otherwise a random admin takes over; without admins the team is disbanded and everyone returns to their solo team. Buildings stay with the team they were built for; nothing moves when a player joins or leaves (#86). Only when a team is disbanded does each building go to its builder's solo team.
- **Containers (#28, #31, #32, #133).** A container is private (only its owner opens it), open to the owner's team, or public (every player in the world can put items in and take them out). Only the owning team configures or removes it, and belts and pipes connect only to the own team's buildings (#98), so public containers are filled and emptied by hand. Platform admins can view private containers but not take anything. The world owner and team admins can remove a private container; its contents are destroyed (with a confirmation naming the owner). After its owner leaves the team, a private container stays theirs to open and empty until the team removes it (#93).
- **Unlocks (#47, #74).** Shared per team. An item counts as obtained once any team member holds it; these item records merge freely when players join or leave. Completed phases stay with the team: joining brings none in, and leaving gives the solo team every phase the team completed while the player was a member (#81). Parts delivered towards an unfinished phase stay with the team (#68).
- **Inventory (#3, #112).** Per player: 40 slots, 8 of them a hotbar for tools and healing items (#144), plus a suit slot (#145). Stack sizes: 100 for resources and simple parts, 50 for larger parts, 10 for engine parts, relics and upgrades, 1 for tools (revisited with balancing). Team members share through containers. Players of different teams share by dropping items on the ground, where anyone can pick them up, or through public containers (#133, #142); picking up counts as obtained (#74).
- **Dropped items (#140).** Dropping a stack (drag it out of the inventory window, or G for the selected hotbar item) puts it into a ground pile at the player's feet. A pile is open to everyone: it holds whatever is dropped at that spot, shows the items' belt models (#8), and disappears when empty, never on its own, since nothing respawns (#20). Any player takes from it with E. While it exists, a pile counts towards the building limit (#87) of the player who started it, and the world owner can remove any pile (#24). A pile occupies its 1 m cell, so nothing can be placed there until it is empty or removed (#148).
- **Items above a team's tier (#141).** An item can always be held, stored and passed on, but it works at most at the highest tier its holder's team has unlocked: a pickaxe from a later tier mines like the team's best pickaxe, and an upgrade from a locked tier cannot be installed. Engine parts and relics cannot be dropped or put into public containers, so each team builds its own phases; inside a team they move freely.

## 6. The world

Terrain is smooth, static (not editable) and generated from the seed, with caves below the surface. Caves are generally accessible: every cave system connects to the surface through at least one entrance that players can walk through and belts and pipes can follow (#69). Cave floors hold deposits, mined by extractors or by hand with a pickaxe (#84), and wells; cave walls hold formations that are mined by hand with a pickaxe and do not renew (#70, #83).

**Water (#132).** One sea level for every world: terrain below it is water, so a sea surrounds the world beyond its radius and inland basins become lakes. The spawn, every biome and every cave entrance lie on land. Players wade and swim slowly; the server stops swimmers a set distance beyond the radius. Buildings may stand on the ground under shallow water as on land.

### Biomes (#38) — **Draft** for the deposit column

| Biome | Trees | Leaf colour | Ground | Relief | More common deposits |
|---|---|---|---|---|---|
| Grassland | sparse to medium | fresh green | green | gentle | water wells, copper ore, limestone |
| Forest | dense | dark green | dark green and brown | gentle to medium | coal, copper ore; thrumite in caves |
| Highlands | sparse | yellow-green | grey rock | rugged | iron ore, stone, geothermal vents with sulfur around them; thrumite in caves |
| Desert | almost none | olive | sand | gentle dunes | crude oil, sand, natural gas, limestone; pyrelith deep down |
| Tundra | sparse | pale blue-green | snow | medium | natural gas, ice; rimeglass deep down |

Every world contains each biome at least once, whatever its size and biome size (#71). Every biome also lies within a set distance of the spawn, scaled by biome size (target: about 2 km for normal biomes), whatever the world size (#96). One wood type and one tree model; only the leaf colour changes (#14).

### Spawn (#38, #40)

Always in grassland or forest, with loose stones, branches, trees and a stone deposit nearby. **Draft:** copper ore and coal within about 200 m, so the first smelting does not need a long walk. There is no guarantee per team: once those deposits are taken, later teams venture further out (#88).

### World objects

| Object | Gathered with | Yields | Renews |
|---|---|---|---|
| Loose stone | hand | stone | no |
| Branch | hand | wood | no |
| Tree | axe (felled, #103) | logs (wood), at least 1 sapling, resin (#144) | by planting saplings (#41) |
| Rock formation | pickaxe | stone | no |
| Wall formation (caves) | pickaxe | its ore, e.g. thrumite | no |
| Solid deposit (ores, stone, limestone, coal, sulfur, sand, ice), on the surface and on cave floors | pickaxe or extractor | its resource | infinite |
| Well or vent (fluids, gases), on the surface and in caves | pump or gas extractor only | its resource | infinite |
| Lake or sea | water pump | water | infinite |

Trees and rock formations block building; loose stones and branches under a new building go into the builder's inventory; what does not fit is lost, and the build preview says how many (#39, #99).

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

**Loot** works per player, as in the Lootr mod (#73): every player opens their own copy of a loot container, so late joiners get full loot, which softens #20. A door opened by a puzzle, or a wreck broken open, is open for the whole team that did it (#90).

**Alternative recipes** from vaults change a recipe's ratios or ingredients, so players get optimisation choices.

## 7. Gathering and tools

- Hands pick up loose stones and branches.
- The axe fells trees: a player chops a tree until it falls and disappears, dropping its logs, at least one sapling and resin (#103, #144). There is one axe, without tiers.
- The pickaxe mines solid deposits, rock formations and wall formations, never terrain (#19, #70).
- Tools have no durability (#13).
- A tool's tier decides what it can mine (see *Tier ladder*). With the tier the target requires, mining one item takes 2 s (#85); each tier above that cuts the time by 25 %, down to 1 s (#103).
- Mining by hand is deliberately slower than the first extractor, so automating pays off right away: the burner extractor yields more than 30 items/min (#85, #93).

## 8. Crafting

- **By hand:** basic tools (#16).
- **Workbench:** everything beyond basic tools, i.e. better tools and intermediate parts (e.g. plates, gears, wire) until machines take over. The player has to be within reach of a placed workbench.
- Crafting by hand and at the workbench is instant (#77) and works from a recipe list, as in Satisfactory and Terraria: there is no crafting grid. The list shows the hand recipes, plus the workbench recipes while a workbench is in reach (#110).
- **Buildings are not crafted (#56).** They are placed directly by paying their cost, the workbench itself included (wood).
- **Machines** take over automated production. The furnace is the first machine: it smelts and burns wood or coal, no power needed.
- **Unlock rule (#18, #64):** a tier's entry recipes (the pickaxe and extractor that mine its ore, and the machines that tap its other new sources) unlock when the team completes the engine phase before it (see *Tier ladder*). Within an unlocked tier, a recipe or building becomes available to a team once the team has obtained each of its inputs (or cost items) at least once; an item counts as obtained once any team member holds it (#74). Hand recipes are available from the start.

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
| 0 | none; wood and loose stone (spawn) | hands | trees, rock formations, stone deposit | scarcity: nothing respawns | hand: stone axe and pickaxe; placeable: workbench (wood), wooden chest, furnace (stone), simple supports (wood); workbench: salve (resin, #144) | 3 |
| 1 | copper ore (grassland, forest; surface) | stone pickaxe | coal deposits; stone and wood get processed | first automation; ratios (extractors vs. furnaces) | copper ingot, wire and sheet, stone brick, wooden beam, charcoal; burner extractor (burns wood, charcoal or coal), belts (30/min, #130), item sink (#134), splitter and merger, supports, vertical belts, scanner, engine link | 3–4 |
| 2 | iron ore (highlands; surface and shallow caves) | copper pickaxe | water (wells, lakes and the sea, #132), limestone deposits, tree farm (renewable wood and resin) | shared power grid, water, recipes with several inputs | iron plate, rod and gear, steel (iron + coal), concrete (limestone + water); coal generator (burns wood, charcoal or coal; needs water) with water pump, wooden and steel poles, electric extractor, constructor, pipes (300 m³/min), tank, fluid vent (#134), faster belts (60/min), tree farm | 4–5 |
| 3 | **thrumite**, a humming crystal that stores energy (cave floor deposits and wall formations below about −30 m in forest and highlands, #70) | iron pickaxe | geothermal vents with sulfur deposits around them (highlands) | caves: moving things up and down; storing power; power from fixed places | sulfuric acid (sulfur + water), resonator, storage cell; batteries, geothermal generator, power towers, faster belts (120/min), teleport beacons (#105) | 5 |
| 4 | **pyrelith**, a stone that holds heat (deep under the desert, next to oil) | thrumite pickaxe | crude oil wells, sand deposits (desert) | **Draft** (#76 removed slag): refining: every refinery recipe makes fuel next to plastic or rubber, so the fuel needs a consumer | pyrelith ingot, glass (sand), plastic, rubber and fuel (oil, #92), insulated cable (copper wire + rubber, #126), heat suit and medkit (#144, #145); oil pump, refinery, fuel generator, faster belts (240/min), faster pipes (600 m³/min) | 5 |
| 5 | **rimeglass**, a clear crystal (deep under the tundra) | pyrelith pickaxe | natural gas wells (tundra, desert), ice deposits (tundra) | gas pressure: pressurised natural gas handles more throughput, compressors raise pressure between networks | coolant (from ice, an ordinary ingredient, #76), rimeglass lens, superconducting wire (copper wire + rimeglass + coolant, #127), cold suit (#145); gas extractor, compressor, pressure tanks, gas turbine, superconducting towers, fastest belts (480/min) | 5 |
| 6 | **concordite**, an alloy fused from thrumite, pyrelith and rimeglass products (made, not mined) | — | — | long distances: three far-apart biomes at once | concordite ingot and parts, concordite tools; resonance cell, resonance reactor (#101) | 5 |

Solids come first without a power grid (burner machines use fuel), which matches Stage 4; power, fluids and gases arrive with tiers 2 to 5, which matches Stage 5. Phase 1 gates tier 2, so the engine link and phase deliveries belong to Stage 4.

### The ancient engine (#63–#67)

An ancient engine stands at the centre of the world, one per world. Each team restores it on its own, and every player sees their own team's progress (#64). Each team delivers at one **engine link** (#79) it builds in its base, as the space elevator stands in the player's base in Satisfactory; the engine at the centre is the landmark and lights up with each completed phase (#65). It is an in-game goal, not the assignment goals and grading left out by #25.

- **One phase per tier (#63).** Phase N asks for 2–3 engine parts built from all of tier N's sources, plus more of phase N−1's part, so earlier lines keep running (as Smart Plating returns in Satisfactory's second elevator phase).
- **Quantities, then a rate (#66).** Phases 1–5 ask for fixed quantities; stockpiled parts count, so a slow factory still progresses. Phase 6 asks for a rate held over a set time: the final throughput test.
- **Relics (#67).** From phase 3 on, each phase also needs one relic from a vault in that tier's biome, so exploration stays required without a separate lock. Loot is per player (see *Ruins*, #73), so every player can take a relic from each vault; the world generator guarantees enough vaults per biome, so progress never depends on luck. Tier 6 has no biome; its relic lies in an ancient seal.
- **Changing teams (#68, #81).** Completed phases stay with the team; a leaving player's solo team gets every phase completed while they were a member. Parts delivered towards an unfinished phase belong to the team: a joining player's partial deliveries do not carry over, and a leaving player's solo team starts that phase at 0. The join and leave dialogs say what will be lost.

Part names and recipes are placeholders:

| Phase | Asks for | Relic from | Completing it unlocks |
|---|---|---|---|
| 1 | wired frames (wooden beam + copper wire), brick housings (stone brick + copper sheet) | — | tier 2 |
| 2 | motors (rod + gear + copper wire), reinforced casings (steel + concrete), wired frames | — | tier 3 |
| 3 | resonant coils (thrumite + copper wire + steel), storage cells (thrumite + sulfuric acid + reinforced casing), motors | a vault in forest or highland caves | tier 4 |
| 4 | heat exchangers (pyrelith + steel + glass), polymer housings (plastic + glass), resonant coils | a vault in the desert | tier 5 |
| 5 | superconducting coils, cryo lattices, heat exchangers | a vault in the tundra | tier 6 |
| 6 | concordite parts at a rate held over a set time, sized so the required production needs about 1–2 GW (#121) | an ancient seal | the engine wakes up: the final goal |

**Scanner.** From tier 1, points to the nearest deposit of a chosen kind; a later upgrade also finds ruins.

**Names.** Thrumite, pyrelith, rimeglass, concordite and the resonance reactor are settled (#116); the engine part names are still placeholders.

**Pacing targets (to tune).** About 40 hours of play for a team of three from first login to waking the engine, roughly a semester at a few hours a week; each phase takes longer than the one before (#128).

| Milestone | Target time from first login |
|---|---|
| Stone axe and pickaxe | about 2 min |
| Workbench placed | about 5 min |
| First copper ingot | about 10 min |
| First automated line (burner extractor → belt → furnace → chest) | 20–30 min |
| Phase 1 completed | about 2–3 h (#128) |
| First power grid | about 3 h: power needs tier 2, after phase 1 (#128) |
| Engine wakes up | about 40 h (#128) |

**For the author to decide:** the sources, products and engine parts per tier; the engine part names; whether hand-crafted stone tools need the workbench (draft: no).

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
- **Cost and refund (#1, #4, #56).** The cost is paid from the inventory when placing, as in Satisfactory; the build menu shows it. Removing a building puts its full cost back into the inventory. A drag placement shows its total cost, automatic supports included, and is refused as a whole if the inventory cannot pay it (#61). Removing a building that holds items, belts included, moves those items into the inventory; fluids and gases in it are lost (#75). Whatever does not fit, refund or contents, goes into a dismantle crate at the spot, which disappears when empty (#89, #94).
- **Cosmetic pieces (#136).** Walls, windows, roofs, stairs, railings and lamps, without gameplay effects. Like every building they cost materials and count towards the building limits (#87); stairs are walkable (#104). Lamps need no power and light caves and nights.
- **Placement (#52).** Drag placement for belts, pipes and wires (click the start, click the end). Build reach about 20–30 m.

## 11. Logistics and production

- **Belts** show every item they carry as a small 3D model (#8). Belt tiers have fixed speeds that double each time: 30, 60, 120, 240 and 480 items/min, one in each of tiers 1 to 5 (#130).
- **Splitters and mergers**; splitters can filter by item.
- **Machine roster (#129).** One machine per job shape, as in Satisfactory: one input, two inputs, four inputs, smelting, alloy smelting, refining, fluid mixing. Production machines have no tiers; extractors get one tier per tiered ore (#17). Names, footprints, power and recipes come with the catalogue.
- **Item sink and fluid vent (#134)** destroy what they receive, without any reward, for by-products and overflow; the vent also takes gases.
- **Machines** have input buffers, crafting progress and output buffers. A full output stops the machine. Every machine's speed can be set in its menu, which also holds its upgrade slots (#118): 1–100 % from the start, up to 250 % with speed upgrades (#123).
- **Status everywhere:** each machine shows working, starved, blocked or unpowered; belts and pipes show their fill; a statistics panel shows produced and consumed amounts per resource, for the own team and for the whole world (#80).

### Machine upgrades — **Draft**

Slots as in Mekanism, rare ingredients from exploring as in Satisfactory. Each machine has 3 upgrade slots and 1 core slot.

| Upgrade | Effect | Downside | Source |
|---|---|---|---|
| Speed upgrade | raises the speed limit by 50 % each, up to 3 | power (or fuel) use grows faster than speed | crafted from tier 2; needs ancient gears from ruins |
| Efficiency upgrade | −25 % energy per item each | takes a slot a speed upgrade could use | crafted from tier 3 |
| Harmonic core | doubles output without extra input | about 4× the power; one per machine | found only in some vaults; never craftable |

Power factors (#123): power follows speed^1.6 over the whole speed range (50 % → 0.33×, 150 % → 1.9×, 200 % → 3.0×, 250 % → 4.3×); each efficiency upgrade multiplies the energy per item by 0.75; a harmonic core multiplies power by 4. Burner machines burn fuel at the same factors. Speed upgrades fit every machine (on a generator, output and fuel scale linearly with speed); efficiency upgrades fit machines that draw power or burn fuel; harmonic cores fit production machines and extractors, not generators.

Speeding up one machine moves the bottleneck to its inputs, its outputs or the power grid, and the status displays show it moving. A harmonic core turns a single machine into a ratio problem.

## 12. Power, fluids and gases

### Energy — **Draft** for generators, numbers and grid details

Each tier's energy step matches the tier's new problem: tier 2 brings ratios and fuel logistics, tier 3 power from fixed places that needs storage, tier 4 a by-product that pays for itself, tier 5 generation that depends on pressure, tier 6 a reactor fed from three far-apart biomes. Power is shown in MW and energy in MJ; the simulation counts integer kW and kJ (one tick at 1 MW = 50 kJ). All numbers are starting values to tune.

**Grid.** A grid is everything connected by poles and wires (drag placement, #52); machines are wired to a pole by hand, as in Satisfactory (#120). A wire costs copper wire by its length and may not pass through terrain, so power reaches caves through their entrances, as belts do (#69). Wires connect only to the own team's poles and machines, so every grid belongs to one team (#98).

| Pole | Tier | Wire range | Wires per pole |
|---|---|---|---|
| Wooden pole | 2 | 20 m | 4 |
| Steel pole | 2, once the team has steel | 40 m | 6 |
| Power tower (about 20 m tall) | 3 | 150 m | 2 |
| Superconducting tower | 5 | 400 m | 2 |

Power towers arrive with geothermal in tier 3, because the vents sit in the highlands, up to about 2 km from a base (#125): a 2 km line takes 14 towers. Superconducting towers carry tier 6's three-biome network (5 for 2 km). Dragging a tower line places the towers at their range and wires them, showing the total cost first (#61); machines are still wired to poles by hand (#120). Wires cost copper wire by length, which keeps the tier 1 copper wire line busy. They are bare, as real overhead lines are; every pole and tower carries insulators as part of its recipe, and the models show them (#126).

**Every tick:**

1. Working machines draw their full power; idle machines (starved or blocked) draw nothing.
2. Supply comes in order: fixed generators (geothermal) produce their current output; fuel generators cover the rest, all at the same load; batteries discharge only when the generators at full load fall short.
3. If supply still falls short, the grid's fuse trips: the whole grid stops until a player of the team resets it (#122).
4. Leftover capacity charges batteries, up to each battery's charge rate: first surplus from fixed generators, then spare capacity of fuel generators.
5. Fuel generators burn fuel in proportion to their load, so an oversized power plant only costs buildings, not fuel.

**Fuse and switches (#122, #123):** the fuse trips when demand exceeds generation plus what the batteries can discharge. Everything in the grid stops, generators included. A player of the owning team resets it at a generator, battery or power switch of that grid; if demand is still too high, it trips again at once. A fuse that trips while nobody is near, or during catch-up, stays tripped until someone resets it. A power switch (tier 2) joins or separates two grids by hand; a priority switch (tier 3) cuts off the grid behind it before the fuse would trip, so a team can protect its important lines. Machine speeds (#118) fit demand to supply.

**Fuels.**

| Fuel | Energy | Burned in |
|---|---|---|
| Wood | 15 MJ | furnace, burner extractor, coal generator |
| Charcoal | 40 MJ | furnace, burner extractor, coal generator |
| Coal | 60 MJ | furnace, burner extractor, coal generator |
| Fuel (from the refinery) | 500 MJ/m³ | fuel generator |
| Natural gas | 100 MJ/m³ at 1 bar | gas turbine |

Burner machines burn fuel while they work: the furnace at 1 MW (one coal per minute), the burner extractor at 2 MW.

**Generators.**

| Generator | Tier | Output at full load | Needs | Behaviour |
|---|---|---|---|---|
| Coal generator | 2 | 30 MW | solid fuel (30 coal/min, more items of wood or charcoal), water 30 m³/min | stops without water or fuel |
| Geothermal generator | 3 | 80 MW average on a normal vent; ×0.5 impure, ×2 pure | a geothermal vent | no fuel; output swings between 50 % and 150 % of its average over a 60 s cycle; cannot throttle, so surplus without batteries is lost |
| Fuel generator | 4 | 100 MW | fuel 12 m³/min | burns the fuel every refinery recipe makes (#92) |
| Gas turbine | 5 | 250 MW | natural gas 150 m³/min (at 1 bar), a minimum pressure (e.g. 2 bar) | stops below the minimum pressure, which ties power to tier 5's pressure problem |
| Resonance reactor | 6 | 1.5 GW | one resonance cell per minute (made from thrumite, pyrelith and rimeglass products), water 300 m³/min | no waste, no radiation (#101); its cells need all three far-apart biomes, and it powers the final rate test (#66) |

**Battery** (tier 3, thrumite): stores 600 MJ, charges and discharges at up to 50 MW. One battery per normal geothermal vent smooths its swing into a steady 80 MW. Batteries also cover demand spikes and bridge fuel running out (#119).

**Ratio targets** for the recipes: in tier 2, one electric extractor on a normal coal deposit (target 60 coal/min) and one water pump (target 60 m³/min) feed two coal generators, 60 MW in total. In tier 4, the fuel a refinery makes next to plastic or rubber runs slightly more than that refinery and its oil pump need.

**Power draw** (starting values; machines not listed get theirs with the machine roster):

| Machine | Power |
|---|---|
| Water pump | 3 MW |
| Tree farm | 3 MW |
| Constructor | 4 MW |
| Electric extractor | 5 MW |
| Gas extractor | 10 MW |
| Oil pump | 15 MW |
| Compressor | 15 MW |
| Refinery | 25 MW |

Upgrades change these (section 11).

**Status.** Generators show working, idle (no demand), no fuel, no water or low pressure, always with an icon (section 15). A power panel per grid shows capacity, demand, battery charge, each generator's load and a tripped fuse with its cause; the statistics panel (#80) counts energy produced and consumed.

**Not planned:** solar power (day and night are purely visual, #100, so no output may depend on them), capacity limits on wires (belts and pipes already teach capacity limits). Nuclear power with waste and radiation: the resonance reactor takes its place (#101).

### Fluids and gases

- **Fluids.** A pipe network carries one fluid. Its capacity is set by its weakest pipe tier (300 m³/min from tier 2, 600 m³/min from tier 4, #130); producers and consumers share it proportionally.
- **Gases.** Like fluids, plus pressure: producers stop at their maximum pressure, consumers need a minimum, and compressors raise pressure between two networks.
- Fluids and gases never mix: connecting networks with different contents is refused.

## 13. Controls, camera and interface

First person only (#7): WASD, mouse look, pointer lock, jump, sprint, wading and slow swimming (#132), build mode with a snapped preview, fullscreen toggle.

- **Keys (#113).** Hold the left mouse button to mine, chop or harvest; E picks up and interacts (containers, machines, workbench); Q opens the build menu; R rotates; X removes; G drops the selected hotbar item (#140); the right mouse button uses it, e.g. a healing item (#144); Tab opens the inventory; M the map; T the chat.
- **Collision (#104).** Players collide with every building except wires; foundations, ramps and machine tops are walkable. Nothing can be placed where a player stands.
- **Travel (#105).** Walking 5 m/s, sprinting 8 m/s from the start. From tier 3, teleport beacons let a player jump between their own team's beacons and the spawn; a beacon needs power. No vehicles or trains in v1.
- **Map (#106).** M opens a map of the explored area, shaded by biome, with the own team's buildings and members, the engine, discovered ruins, scanner hits, beacons and the player's own markers. It is drawn from the terrain functions, so it needs no stored data. A minimap in the top right corner shows the same around the player (north up, can be hidden).
- **Chat (#107).** Team chat and world chat; the world owner can turn world chat off, and world admins mute players. Messages live only in the running world's memory (the last 100 per world, for moderators), never in the database. Team members can ping a spot on the map or in the world.
- **Display names (#108).** One display name per user for the game, chosen at the first start (the username is suggested and may be kept). Other players only see display names. Usernames are visible to the world owner and world admins of private worlds (the join dialog says so) and to platform admins. Bans are stored by user id.
- **Onboarding (#110).** A recipe browser (what makes and what uses an item; locked recipes show what unlocks them), an unlock tree per tier, and short first-steps hints for tiers 0 and 1 that players can hide. No quest system.
- **Settings (#138).** Key rebinding, mouse sensitivity, field of view, view distance and graphics quality, volumes per category (#115), always day (#102), minimap on or off (#106), hints on or off (#110). Stored per user; view distance and graphics quality per device.
- **Language (#135).** English first. Every text, item, machine and recipe names included, comes from one string table, so German can follow without code changes.
- **World overview (#109).** The world owner and world admins see the teams and their members, each team's current phase and its progress, last activity and the team statistics (#80). Teachers run class worlds as their owner (#43).

## 14. Art and audio

- Low-poly, flat colours from one shared palette texture, so all buildings fit one rendering path.
- **Day and night (#100)** are purely visual: the sun, sky colour and ambient light follow a cycle shared by everyone in the world (30 minutes, 20 of them day, #102). Nights stay bright enough to build and read every status display; caves stay dark, lit by the player's light. A display setting can keep it at day.
- **Weather (#137):** visual-only rain and snow, later and only if time remains; not part of the v1 scope.
- Every item has a small 3D model for belts plus an icon for the UI.
- Asset layout and conventions: #51.
- **Made by the team (#111):** 3D models, textures, shaders, VFX, music and sound. Until a model exists, a placeholder built in code (simple shapes in palette colours, a distinct silhouette per kind) and an icon rendered from it stand in, so the asset test of #51 passes from the start; CC0 packs can fill gaps (credits per #51).
- **Audio (#114)** is in scope and produced by the author on request. Scope for v1 (#115): UI sounds, footsteps per ground, tool hits and falling trees, a positional loop per machine class, a quiet belt loop, ambience per biome and for caves, a few calm music tracks, a hurt and a heal sound (#147); volume per category.

## 15. Performance and accessibility

- 60 fps at the default view distance on an integrated GPU.
- Status is never shown by colour alone: always an icon plus colour, so it works for colour-blind players.

## 16. Player health (#143–#147)

Players have 100 HP. There is no combat and there are no creatures (spec non-goals); damage comes only from the world, and it cannot be turned off.

- **Falls (#143).** Harmless up to 5 m, then 10 HP per metre, so a 15 m fall from full health is fatal. Landing in water does no damage.
- **Hazard zones (#143).** Heat in the deep desert caves where pyrelith lies (tier 4), cold in the deep tundra caves where rimeglass lies (tier 5). Without the matching suit a player loses 5 HP/s there, about 20 s from full health. Zones are computed from biome and depth, like the deposits; a warning with an icon shows on entering one.
- **Nothing else hurts:** no hunger, no drowning (players swim at the surface, #132), no damage from machines, belts or the reactor.
- **Regeneration (#144).** 0.5 HP/s once a player has taken no damage for 10 s; full in about 3.5 min.
- **Healing items (#144).** Selected in the hotbar and used with the right mouse button; using one takes 1 s. Names are placeholders; recipes and amounts come with the catalogue.

  | Item | Tier | Made from | Heals |
  |---|---|---|---|
  | Salve | 0 (workbench) | resin, which felled trees and the tree farm yield | 40 HP |
  | Medkit | 4 | with the catalogue | to full |

- **Suits (#145).** One suit slot next to the inventory; a suit protects while worn. The heat suit is one of tier 4's entry recipes, the cold suit one of tier 5's (it may be lined with pyrelith, which holds heat). Suits have no durability (#13) and use up nothing. Healing items and suits from a locked tier neither heal nor protect (#141).
- **Death and respawn (#146).** At 0 HP the player comes back after 5 s at their team's engine link, or at the world spawn if the team has none; from tier 3 they may pick a powered teleport beacon of the team instead (#105). The world setting *items on death* decides what is kept:
  - **Death crate** (default): the hotbar and the worn suit stay with the player; the other 32 slots go into a crate at the spot. It belongs to the player's team like the dismantle crate (#89), disappears when empty (never on its own) and is marked on the player's map (#106).
  - **Keep everything:** nothing is left behind.
- **Server and display (#147).** Health is stored per player and world, next to the inventory. The movement check (#104) measures falls; nothing happens to players who are offline. The HUD shows a health bar with its number (section 15).

## 17. Open points

- Review of every **Draft** marker: biome deposits and spawn distances (section 6), ruins and puzzles (6), tier and phase contents including the tier 4 problem, scanner and pacing (9), machine upgrades and their power factors (11), energy (12).
- The full catalogue (items, machines, buildings, recipes with starting numbers): first draft in [`catalogue.md`](catalogue.md), framed by #128–#131 and under review as open questions 81–89. It proposes values for the **Draft** markers above; they stay until the author confirms the draft.
- Recipes and balance numbers; inventory and stack sizes revisited with balancing (#112).
