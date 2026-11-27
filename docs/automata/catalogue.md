# Automata — Catalogue

**Draft for review (#131).** The full content of the game at starting numbers: resources, items, tools, machines, buildings, recipes, engine phases and ruins. The rules live in [`game-design.md`](game-design.md) (GDD); decisions are referenced as #N from [`decisions.md`](decisions.md). The choices that need the author are open questions 81–89 in the decision log. Once Stage 4 brings `automata/core/src/catalog/`, the code is authoritative and this document points to it.

Every number here is a starting value to tune in playtests. Names are placeholders, except thrumite, pyrelith, rimeglass, concordite and the resonance reactor (#116).

## 1. Conventions

- **Rates** are per minute at 100 % machine speed (#118), on a normal deposit. Purity multiplies extraction: impure ×0.5, normal ×1, pure ×2 (spec).
- **Recipe times** are in seconds and multiples of one tick (0.05 s at 20 Hz). The simulation counts amounts in milli-units (spec), so fractional rates such as 7.5 per minute are exact.
- **Fluids** are measured in m³, **gases** in m³ at 1 bar. **Power** is in MW.
- **Tier** is the tier whose unlock makes a recipe available (#64). **Entry** marks a tier's entry recipes, which unlock when the team completes the phase before; every other recipe unlocks once the team has obtained its inputs (#18). Entry recipes cost only items of earlier tiers.
- **Stacks** (#112): S100 for resources and simple parts, S50 for larger parts, S10 for engine parts, relics, upgrades and medkits, S1 for tools and suits.
- **Workbench** recipes are instant (#77). The workbench makes tools, suits, healing items, upgrades and the parts of tiers 0 and 1; from tier 2 on, parts come only from machines, so that automating them pays off (open question 83).

## 2. Resources and deposits

### Raw resources

| Resource | Kind | Where (#38, #70, #132) | Tier | Mined or tapped with | Stack |
|---|---|---|---|---|---|
| Wood | tree, branch | trees in every biome but the desert; branches on the ground | 0 | axe; hand | S100 |
| Resin | tree | felled trees, tree farm (#144) | 0 | axe | S100 |
| Sapling | tree | felled trees | 0 | axe | S50 |
| Stone | loose stone, rock formation, deposit | every biome, surface | 0 | hand; stone pickaxe or any extractor | S100 |
| Copper ore | deposit, tiered | grassland, forest; surface | 1 | stone pickaxe or burner extractor and up | S100 |
| Coal | deposit | forest (surface), highlands (surface and shallow caves) | 1 | any pickaxe or extractor | S100 |
| Iron ore | deposit, tiered | highlands; surface and shallow caves | 2 | copper pickaxe or extractor Mk2 and up | S100 |
| Limestone | deposit | grassland, desert; surface | 2 | any pickaxe or extractor | S100 |
| Water | lake, sea, well | lakes and the sea everywhere; wells in grassland | 2 | water pump | fluid |
| Thrumite | deposit and wall formation, tiered | forest and highland caves below −30 m | 3 | iron pickaxe or extractor Mk3 and up | S100 |
| Sulfur | deposit | highlands, around geothermal vents | 3 | any pickaxe or extractor | S100 |
| Geothermal vent | energy vent | highlands | 3 | geothermal generator | — |
| Pyrelith ore | deposit, tiered | desert caves below −60 m (heat zone, #143) | 4 | thrumite pickaxe or extractor Mk4 and up | S100 |
| Crude oil | well | desert; surface | 4 | oil pump | fluid |
| Sand | deposit | desert; surface | 4 | any pickaxe or extractor | S100 |
| Rimeglass | deposit and wall formation, tiered | tundra caves below −60 m (cold zone, #143) | 5 | pyrelith pickaxe or extractor Mk5 | S100 |
| Natural gas | well | tundra, desert; surface | 5 | gas extractor | gas |
| Ice | deposit | tundra; surface | 5 | any pickaxe or extractor | S100 |

Non-tiered deposits (stone, coal, limestone, sulfur, sand, ice) take any pickaxe or extractor; picking them up early records them as obtained (#74), but their recipes still wait for their tier (#64).

### World objects

| Object | Gathered with | Time | Yields |
|---|---|---|---|
| Branch | hand | instant | 1 wood |
| Loose stone | hand | instant | 1 stone |
| Tree | axe | 6 s of chopping | 6 wood, 1 sapling (a second one at 50 %), 1 resin |
| Rock formation | pickaxe | 2 s per item (#85) | 15 stone in total, then gone |
| Wall formation (caves) | pickaxe of the ore's tier | 2 s per item, less with better tools (#103) | 10 of its ore in total, then gone |

### Deposits

- **Purity:** 30 % impure, 50 % normal, 20 % pure.
- **Density** (world setting *normal*): on average one deposit of each common kind (stone, coal, copper, iron, limestone, sand, ice) per 200 × 200 m of its biome, and one of each rarer kind (thrumite, sulfur, pyrelith, rimeglass, wells and vents) per 400 × 400 m of its biome or zone. *Sparse* and *rich* scale density by 0.5 and 1.5 (#45).
- **Spawn guarantees** (proposal for the GDD's draft, open question 88): a stone deposit within 100 m, copper ore and coal within 200 m, limestone and open water within 500 m, iron ore within 1 km. No guarantee per team (#88).
- **Hazard zones** (#143): the desert and tundra caves below −60 m, where pyrelith and rimeglass lie.

### Extractors and pumps

| Building | Tier | Taps | Rate (normal) | Power | Footprint | Cost |
|---|---|---|---|---|---|---|
| Burner extractor | 1 | stone, coal, copper ore and the other non-tiered deposits | 40 items/min | 2 MW of fuel | 2 × 2 × 3 | 8 stone brick, 4 copper sheet, 4 copper wire |
| Extractor Mk2 (the GDD's *electric extractor*) | 2, entry | as above, plus iron ore | 60 items/min | 5 MW | 3 × 3 × 4 | 15 copper sheet, 15 stone brick, 10 copper wire |
| Extractor Mk3 | 3, entry | plus thrumite | 60 items/min | 5 MW | 3 × 3 × 4 | 20 steel, 10 concrete, 5 motor |
| Extractor Mk4 | 4, entry | plus pyrelith ore | 60 items/min | 5 MW | 3 × 3 × 4 | 20 steel, 10 resonator, 5 motor |
| Extractor Mk5 | 5, entry | plus rimeglass | 60 items/min | 5 MW | 3 × 3 × 4 | 20 steel, 10 pyrelith ingot, 5 motor |
| Water pump | 2, entry | lake or sea; water well | 60 m³/min (open water is always normal) | 3 MW | 2 × 2 × 2 | 6 copper sheet, 4 stone brick, 4 copper wire |
| Oil pump | 4, entry | crude oil well | 60 m³/min | 15 MW | 3 × 3 × 4 | 30 steel, 20 concrete, 10 motor |
| Gas extractor | 5, entry | natural gas well | 150 m³/min, up to 1 bar | 10 MW | 3 × 3 × 4 | 20 steel, 10 motor, 10 rubber |
| Tree farm | 2 | water 10 m³/min | 12 wood + 1 resin per minute, on one output | 3 MW | 4 × 4 × 4 | 10 iron plate, 10 wooden beam, 5 sapling |

- Electric extractors all yield 60/min; a higher tier only widens what they mine (#129, open question 85). Speed upgrades and pure deposits take one extractor up to 300/min, so every belt tier finds a use.
- **The burner extractor outruns the tier 1 belt** (40 vs. 30/min, #93 and #130, open question 82): on a normal deposit the belt is the bottleneck from the first line on. The status shows the extractor blocked a quarter of the time; set to 75 % it fits the belt and burns about 37 % less fuel per minute, 16 % less per item (power follows speed^1.6, #123).
- Each tool tier above the minimum cuts hand mining time by 25 %, down to 1 s (#103): 30, 40, 53 and 60 items/min.

## 3. Tools, gear and upgrades

| Item | Tier | Made at | Recipe | Use |
|---|---|---|---|---|
| Stone axe | 0 | hand | 4 wood, 2 stone | fells trees (#103); the only axe |
| Stone pickaxe | 0 | hand | 4 wood, 3 stone | stone, rock formations, copper ore, non-tiered deposits |
| Copper pickaxe | 2, entry | workbench | 20 copper sheet, 4 wooden beam | adds iron ore |
| Iron pickaxe | 3, entry | workbench | 10 steel, 10 iron rod | adds thrumite |
| Thrumite pickaxe | 4, entry | workbench | 10 resonator, 10 steel | adds pyrelith ore |
| Pyrelith pickaxe | 5, entry | workbench | 10 pyrelith ingot, 10 steel, 4 rubber | adds rimeglass |
| Concordite pickaxe | 6 | workbench | 10 concordite ingot, 4 superconducting wire | everything at 1 s; breaks ancient seals |
| Scanner | 1 | workbench | 4 copper wire, 2 copper sheet, 1 wooden beam | points to the nearest deposit of a chosen kind within 500 m |
| Advanced scanner | 3 | workbench | 1 scanner, 4 resonator, 1 storage cell | as the scanner within 1.5 km, and to the nearest ruin the player has not looted |
| Salve | 0 | workbench; constructor (6 s) | 2 resin → 1 | heals 40 HP (#144); S50 |
| Medkit | 4 | workbench; assembler (10 s) | 2 salve, 1 plastic → 1 | heals to full (#144); S10 |
| Heat suit | 4, entry | workbench | 10 copper sheet, 6 resonator, 2 storage cell | protects in the heat zone (#145) |
| Cold suit | 5, entry | workbench | 8 pyrelith ingot, 6 rubber, 4 insulated cable | protects in the cold zone (#145) |
| Speed upgrade | 2 | workbench | 1 ancient gear, 4 gear, 6 copper wire | +50 % speed limit, up to 3 per machine (#123) |
| Efficiency upgrade | 3 | workbench | 2 resonator, 1 storage cell, 4 gear | −25 % energy per item (#123) |
| Harmonic core | — | vault loot only | — | doubles output at 4× power, one per machine (#90) |

Stone tools are made by hand, without the workbench (the GDD's draft, kept). Ancient gears come only from ruins (section 9), so speed upgrades stay tied to exploring.

## 4. Items and recipes by tier

Each table lists the main recipe of every item. Alternative recipes from vaults are in section 9.

### Tier 0 — primitive

Items: wood, stone, resin, sapling, salve. Recipes: see sections 2 and 3.

### Tier 1 — copper

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Copper ingot | S100 | furnace | 1 copper ore → 1 | 2 s | 30 ore → 30 |
| Stone brick | S100 | furnace | 2 stone → 1 | 4 s | 30 stone → 15 |
| Charcoal | S100 | furnace | 3 wood → 1 | 6 s | 30 wood → 10 |
| Copper wire | S100 | workbench; constructor | 1 copper ingot → 2 | 2 s | 30 ingot → 60 |
| Copper sheet | S100 | workbench; constructor | 2 copper ingot → 1 | 4 s | 30 ingot → 15 |
| Wooden beam | S100 | workbench; constructor | 2 wood → 1 | 4 s | 30 wood → 15 |
| Wired frame (engine part) | S10 | workbench; assembler | 1 wooden beam + 4 copper wire → 1 | 6 s | 10 beam + 40 wire → 10 |
| Brick housing (engine part) | S10 | workbench; assembler | 3 stone brick + 2 copper sheet → 1 | 8 s | 22.5 brick + 15 sheet → 7.5 |

In tier 1 the factory smelts (extractor → belt → furnace) and the workbench turns ingots and bricks into parts. A copper wire constructor matches one furnace exactly.

### Tier 2 — iron

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Iron ingot | S100 | furnace | 1 iron ore → 1 | 2 s | 30 ore → 30 |
| Iron plate | S100 | constructor | 3 iron ingot → 2 | 4 s | 45 ingot → 30 |
| Iron rod | S100 | constructor | 1 iron ingot → 1 | 3 s | 20 ingot → 20 |
| Gear | S100 | constructor | 2 iron plate → 1 | 4 s | 30 plate → 15 |
| Steel | S100 | foundry | 2 iron ingot + 1 coal → 1 | 4 s | 30 ingot + 15 coal → 15 |
| Concrete | S100 | mixer | 2 limestone + 1 m³ water → 1 | 3 s | 40 limestone + 20 m³ water → 20 |
| Rotor | S50 | assembler | 2 iron rod + 6 copper wire → 1 | 8 s | 15 rod + 45 wire → 7.5 |
| Motor (engine part) | S10 | assembler | 1 rotor + 2 gear → 1 | 10 s | 6 rotor + 12 gear → 6 |
| Reinforced casing (engine part) | S10 | assembler | 2 steel + 3 concrete → 1 | 8 s | 15 steel + 22.5 concrete → 7.5 |

Ratios to find: three furnaces feed two plate constructors; one plate constructor feeds one gear constructor; one furnace feeds one steel foundry; one extractor on limestone feeds one and a half concrete mixers. The motor keeps the GDD's ingredients (rod, gear, copper wire) through the rotor, since the four-input manufacturer only arrives in tier 3.

### Tier 3 — thrumite

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Sulfuric acid | fluid | mixer | 1 sulfur + 1 m³ water → 1 m³ | 3 s | 20 sulfur + 20 m³ water → 20 m³ |
| Resonator | S50 | assembler | 1 thrumite + 4 copper wire → 1 | 6 s | 10 thrumite + 40 wire → 10 |
| Storage cell (engine part) | S10 | mixer | 2 thrumite + 1 reinforced casing + 4 m³ sulfuric acid → 1 | 12 s | 10 thrumite + 5 casing + 20 m³ acid → 5 |
| Resonant coil (engine part) | S10 | manufacturer | 2 resonator + 2 steel + 8 copper wire → 1 | 15 s | 8 resonator + 8 steel + 32 wire → 4 |

### Tier 4 — pyrelith

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Pyrelith ingot | S100 | furnace | 1 pyrelith ore → 1 | 3 s | 20 ore → 20 |
| Glass | S100 | furnace | 2 sand → 1 | 4 s | 30 sand → 15 |
| Plastic (+ fuel) | S100 | refinery | 10 m³ crude oil → 5 plastic + 1 m³ fuel | 10 s | 60 m³ oil → 30 plastic + 6 m³ fuel |
| Rubber (+ fuel) | S100 | refinery | 10 m³ crude oil → 4 rubber + 1 m³ fuel | 10 s | 60 m³ oil → 24 rubber + 6 m³ fuel |
| Insulated cable | S100 | assembler | 4 copper wire + 1 rubber → 2 | 4 s | 60 wire + 15 rubber → 30 |
| Polymer housing (engine part) | S10 | assembler | 3 plastic + 2 glass → 1 | 10 s | 18 plastic + 12 glass → 6 |
| Heat exchanger (engine part) | S10 | manufacturer | 3 pyrelith ingot + 2 steel + 2 glass → 1 | 15 s | 12 ingot + 8 steel + 8 glass → 4 |
| Medkit | S10 | workbench; assembler | 2 salve + 1 plastic → 1 | 10 s | 12 salve + 6 plastic → 6 |

The refinery check from GDD section 12: one oil pump (60 m³/min, 15 MW) feeds one refinery (25 MW), which makes 6 m³ of fuel per minute, worth 50 MW in a fuel generator: slightly more than the two use. Two refineries fill one fuel generator (12 m³/min, 100 MW).

### Tier 5 — rimeglass

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Coolant | fluid | mixer | 2 ice + 2 m³ water → 4 m³ | 4 s | 30 ice + 30 m³ water → 60 m³ |
| Rimeglass lens | S50 | constructor | 2 rimeglass → 1 | 6 s | 20 rimeglass → 10 |
| Superconducting wire | S100 | mixer | 2 copper wire + 1 rimeglass + 2 m³ coolant → 2 | 6 s | 20 wire + 10 rimeglass + 20 m³ coolant → 20 |
| Cryo lattice (engine part) | S10 | mixer | 2 rimeglass lens + 4 m³ coolant + 10 m³ natural gas → 1 | 12 s | 10 lens + 20 m³ coolant + 50 m³ gas → 5 |
| Superconducting coil (engine part) | S10 | manufacturer | 6 superconducting wire + 2 resonator + 2 insulated cable → 1 | 15 s | 24 wire + 8 resonator + 8 cable → 4 |

Superconducting wire follows #127 (copper wire + rimeglass + coolant, coolant used up). The cryo lattice makes natural gas an ingredient as well as a fuel, so every tier 5 source feeds the phase.

### Tier 6 — concordite

| Item | Stack | Made in | Recipe | Time | Per minute |
|---|---|---|---|---|---|
| Concordite blend | S50 | assembler | 1 resonator + 1 rimeglass lens → 1 | 6 s | 10 resonator + 10 lens → 10 |
| Concordite ingot | S100 | foundry | 1 concordite blend + 2 pyrelith ingot → 1 | 6 s | 10 blend + 20 ingot → 10 |
| Resonance cell | S10 | manufacturer | 1 storage cell + 2 pyrelith ingot + 2 rimeglass lens + 4 superconducting wire → 1 | 20 s | 3 cell + 6 ingot + 6 lens + 12 wire → 3 |
| Concordite assembly (engine part) | S10 | manufacturer | 4 concordite ingot + 1 superconducting coil + 1 heat exchanger + 1 cryo lattice → 1 | 30 s | 8 ingot + 2 coil + 2 exchanger + 2 lattice → 2 |

Concordite is fused in two steps from a thrumite product (resonator), a rimeglass product (lens) and pyrelith ingots. One manufacturer on resonance cells feeds three resonance reactors (one cell per minute each).

### Loot items

| Item | Stack | Source | Used for |
|---|---|---|---|
| Ancient gear | S50 | wrecks, vaults | speed upgrades |
| Harmonic core | S10 | vaults, ancient seal | machine core slot |
| Humming relic | S10 | vaults in forest and highland caves | phase 3 |
| Ember relic | S10 | vaults in the desert's deep caves | phase 4 |
| Frost relic | S10 | vaults in the tundra's deep caves | phase 5 |
| Concord relic | S10 | ancient seal | phase 6 |

Relics and engine parts cannot be dropped or put into public containers (#141).

## 5. Production machines

The roster of #129: one machine per job shape, no tiers.

| Machine | Job shape | Tier | Ports | Power | Footprint | Cost |
|---|---|---|---|---|---|---|
| Furnace | smelting | 0 | 1 item in, 1 fuel in, 1 item out | 1 MW of fuel (one coal per minute) | 2 × 2 × 2 | 20 stone |
| Constructor | one input | 2 | 1 in, 1 out | 4 MW | 2 × 2 × 2 | 10 iron ingot, 6 copper sheet, 8 copper wire |
| Assembler | two inputs | 2 | 2 in, 1 out | 8 MW | 3 × 2 × 2 | 10 iron plate, 10 copper wire, 4 gear |
| Foundry | alloy smelting | 2 | 2 in, 1 out | 12 MW | 3 × 3 × 3 | 20 stone brick, 10 iron plate, 6 copper sheet |
| Mixer | fluid mixing | 2 | 2 item in, 2 fluid or gas in, 1 item out, 1 fluid out | 10 MW | 3 × 3 × 3 | 10 iron plate, 6 copper sheet, 4 gear |
| Manufacturer | four inputs | 3 | 4 in, 1 out | 30 MW | 4 × 3 × 3 | 20 steel, 20 iron plate, 10 motor |
| Refinery | refining | 4 | 1 item in, 1 fluid in, 1 item out, 1 fluid out | 25 MW | 4 × 4 × 5 | 30 steel, 20 concrete, 10 motor, 10 glass |

- **Buffers:** each input holds what two cycles need; each output holds one stack (fluids: two cycles). A full output stops the machine (GDD section 11).
- **The furnace stays the only smelter** and burns wood, charcoal or coal in every tier (#129, open question 84); the foundry draws power. At the phase 6 reference factory, 29 furnaces burn about 28 coal per minute.
- **Bootstrapping tier 2:** the water pump, coal generator, wooden poles, copper pipes and extractor Mk2 cost only tier 1 parts, and the constructor costs iron ingots, which a furnace smelts from iron ore mined with the copper pickaxe. Every later machine is paid with parts the constructor makes.

## 6. Logistics and storage

| Building | Tier | Cost | Notes |
|---|---|---|---|
| Wooden support | 0 | 2 wood | 1–8 m, stackable (#60) |
| Belt T1 | 1 | 1 copper sheet per metre | 30 items/min (#130) |
| Belt T2 | 2 | 1 iron plate per metre | 60 items/min |
| Belt T3 | 3 | 1 steel per metre | 120 items/min |
| Belt T4 | 4 | 1 steel + 1 rubber per metre | 240 items/min |
| Belt T5 | 5 | 1 superconducting wire + 1 rubber per metre | 480 items/min |
| Vertical belt | as its belt | twice the belt's cost per metre | 1–16 m per piece (#60) |
| Splitter | 1 | 2 copper sheet, 2 copper wire | 1 in, 3 out; filters by item; no speed limit |
| Merger | 1 | 2 copper sheet, 2 copper wire | 3 in, 1 out; no speed limit |
| Item sink | 1 | 4 stone brick, 2 copper sheet | destroys what it receives (#134); no power |
| Pipe T1 (copper pipe) | 2 | 1 copper sheet per metre | 300 m³/min (#130) |
| Pipe T2 | 4 | 1 steel + 1 plastic per metre | 600 m³/min |
| Vertical pipe | as its pipe | twice the pipe's cost per metre | 1–16 m per piece |
| Fluid vent | 2 | 4 iron plate | destroys fluids, and gases from tier 5 (#134); no power |
| Tank | 2 | 10 iron plate, 4 copper sheet | 400 m³ of one fluid; 3 × 3 × 3 |
| Compressor | 5 | 10 steel, 4 motor, 4 heat exchanger | moves up to 600 m³/min (at 1 bar) from one gas network into another, up to 5 bar; 15 MW; 2 × 2 × 2 |
| Pressure tank | 5 | 20 steel, 10 rubber | 400 m³ volume, up to 10 bar; 3 × 3 × 4 |
| Wooden chest | 0 | 8 wood | 16 slots; 1 × 1 × 1 |
| Storage container | 2 | 8 iron plate | 32 slots; 2 × 2 × 2 |
| Steel container | 3 | 10 steel, 4 concrete | 48 slots; 3 × 2 × 2 |

- Containers can be private, team or public (#142). Ground piles hold up to 40 stacks; a drop onto a full pile starts a new pile in the next free cell (#140). Dismantle crates (#89) and death crates (#146) hold whatever they receive.
- **Gas pressure numbers:** gas extractors push up to 1 bar, gas turbines need at least 2 bar (GDD section 12), and the mixer takes gas from 0.5 bar. A gas network's throughput is its weakest pipe's capacity times its pressure in bar, so a T2 pipe at 4 bar carries 2 400 m³ of gas (at 1 bar) per minute. Without a compressor no turbine runs: that is tier 5's problem.

## 7. Power

Generators, fuels, dispatch and the fuse are in GDD section 12; this section adds costs and the machines' power draw.

| Building | Tier | Cost | Notes |
|---|---|---|---|
| Wooden pole | 2 | 1 wooden beam, 1 stone brick (insulators) | 20 m, 4 wires (#125) |
| Steel pole | 2 | 2 steel, 1 stone brick | 40 m, 6 wires |
| Power tower | 3 | 10 steel, 10 concrete, 20 copper wire, 2 stone brick | 150 m, 2 wires; 2 × 2 × 20 |
| Superconducting tower | 5 | 10 steel, 10 concrete, 10 superconducting wire, 4 insulated cable, 2 glass | 400 m, 2 wires; 2 × 2 × 30 |
| Wire | 2 | 1 copper wire per 2 m | bare (#126) |
| Power switch | 2 | 4 iron plate, 4 copper wire | (#122) |
| Priority switch | 3 | 4 steel, 2 resonator, 4 copper wire | (#122) |
| Coal generator | 2 | 20 stone brick, 10 copper sheet, 10 copper wire, 5 wooden beam | 30 MW; 30 coal and 30 m³ water per minute; 3 × 3 × 3 |
| Geothermal generator | 3, entry | 20 steel, 30 concrete, 6 motor | 80 MW average on a normal vent; 4 × 4 × 4 |
| Battery | 3 | 6 storage cell, 10 steel, 10 concrete | 600 MJ, 50 MW; 2 × 2 × 2 |
| Fuel generator | 4 | 20 steel, 10 motor, 10 insulated cable | 100 MW; 12 m³ fuel per minute; 3 × 4 × 3 |
| Gas turbine | 5 | 30 steel, 10 heat exchanger, 10 motor, 10 insulated cable | 250 MW; 150 m³ gas per minute at 2 bar or more; 5 × 3 × 3 |
| Resonance reactor | 6 | 50 concordite ingot, 20 superconducting coil, 20 heat exchanger, 100 concrete, 50 steel | 1.5 GW; 1 resonance cell and 300 m³ water per minute; 8 × 8 × 8 |
| Teleport beacon | 3 | 10 resonator, 4 storage cell, 20 steel, 20 concrete | draws 5 MW while powered (#105); 2 × 2 × 3 |

**Power draw** (adds to the GDD table): assembler 8 MW, foundry 12 MW, mixer 10 MW, manufacturer 30 MW; every electric extractor 5 MW; item sink and fluid vent none.

## 8. Building pieces

| Building | Tier | Cost | Size |
|---|---|---|---|
| Workbench | 0 | 10 wood | 2 × 1 × 1 |
| Engine link | 1 | 30 stone brick, 20 copper sheet, 20 copper wire, 10 wooden beam | 4 × 4 × 5, four inputs |
| Foundation | 1 | 4 stone brick | 4 × 4 × 1 |
| Ramp | 1 | 4 stone brick | 4 × 4, rises 1 m |
| Wall | 1 | 4 stone brick | 4 × 1 × 4 |
| Roof | 1 | 2 wooden beam, 2 copper sheet | 4 × 4 |
| Stairs | 1 | 6 stone brick | 4 × 4, rises 4 m |
| Railing | 1 | 1 wooden beam | 4 m |
| Lantern | 1 | 1 wooden beam, 1 copper wire | 1 × 1 × 1; light, no power (#136) |
| Window | 4 | 2 glass, 1 steel | 4 × 1 × 4 |

## 9. The ancient engine

### Phases

| Phase | Asks for | Relic | Unlocks | Target time from first login (#128) |
|---|---|---|---|---|
| 1 | 150 wired frames, 150 brick housings | — | tier 2 | about 2.5 h |
| 2 | 350 motors, 350 reinforced casings, 350 wired frames | — | tier 3 | about 6.5 h |
| 3 | 600 resonant coils, 750 storage cells, 900 motors | humming relic | tier 4 | about 12.5 h |
| 4 | 1 400 heat exchangers, 1 800 polymer housings, 1 400 resonant coils | ember relic | tier 5 | about 20 h |
| 5 | 2 000 superconducting coils, 2 000 cryo lattices, 2 000 heat exchangers | frost relic | tier 6 | about 30 h |
| 6 | 20 concordite assemblies per minute, held for 10 minutes | concord relic | the engine wakes | about 40 h |

**How the quantities are sized** (open question 86). Each phase's quantities equal 60–105 minutes of output from a reference factory for that phase; the rest of the phase's time goes into building that factory, exploring and, from phase 3 on, fetching the relic. A team that builds bigger finishes sooner. Phase 6's rate is sized so that its production draws about 1.3 GW (#121), which one resonance reactor covers.

| Phase | Reference factory (machines, rounded up) | Raw input per minute | Grid power |
|---|---|---|---|
| 1 | 2 burner extractors, 2 furnaces, workbench crafting | 15 copper ore, 15 stone, 5 wood | none (1 coal/min) |
| 2 | 5 extractors, 4 furnaces, 5 constructors, 4 assemblers, 1 foundry, 1 mixer, 1 tree farm, 1 water pump | 72 iron ore, 36 limestone, 30 copper ore, 12 coal, 12 wood, 28 m³ water (10 for the tree farm) | 75 MW |
| 3 | 9 extractors, 10 furnaces, 10 constructors, 8 assemblers, 3 foundries, 6 mixers, 2 manufacturers, 2 water pumps | 168 iron ore, 100 copper ore, 60 limestone, 40 sulfur, 36 coal, 36 thrumite, 70 m³ water | 267 MW |
| 4 | 13 extractors, 18 furnaces, 5 constructors, 8 assemblers, 5 foundries, 8 manufacturers, 2 refineries, 2 oil pumps | 144 sand, 128 copper ore, 128 iron ore, 64 coal, 48 pyrelith ore, 32 thrumite, 120 m³ crude oil | 486 MW |
| 5 | 15 extractors, 15 furnaces, 10 constructors, 6 assemblers, 3 foundries, 14 mixers, 10 manufacturers, 1 refinery, 1 oil pump, 2 gas extractors, 2 water pumps | 180 copper ore, 140 rimeglass, 100 ice, 80 sand, 80 iron ore, 60 pyrelith ore, 40 coal, 40 thrumite, 200 m³ natural gas, 100 m³ water, 50 m³ crude oil | 660 MW |
| 6 | 24 extractors, 29 furnaces, 24 constructors, 22 assemblers, 11 foundries, 14 mixers, 20 manufacturers, 1 refinery, 1 oil pump, 2 gas extractors, 2 water pumps | 340 copper ore, 300 rimeglass, 220 pyrelith ore, 120 thrumite, 100 ice, 80 sand, 80 iron ore, 40 coal, 200 m³ natural gas, 100 m³ water, 50 m³ crude oil | 1 284 MW |

The power plants grow with the phases: three coal generators cover phase 2, geothermal and coal phase 3, one fuel generator on the refineries' by-product joins in phase 4 (two refineries make exactly its 12 m³/min), gas turbines carry phase 5, and the resonance reactor phase 6. Power for the plants' own fuel lines (coal extractors, water pumps, the resonance cell line at about 20 MW) comes on top.

### Engine link

Accepts the current phase's parts and its relic on any of its four inputs, by belt or by hand. Phase 6 measures the rate over a sliding 60 s window and needs it at 20/min or more for 10 minutes in a row; the link shows the current rate and the time held.

## 10. Ruins

### Placement

| Structure | Where | How many |
|---|---|---|
| Wreck | surface, every biome | about one per 300 × 300 m |
| Vault | caves, every biome | at least 3 per biome within the biome bound of #96, plus about one per km² of caves elsewhere. Desert and tundra vaults lie in their deep caves, inside the hazard zones (open question 87) |
| Ancient seal | below −100 m, any biome | at least one within 3 km of the spawn, plus about one per 16 km² elsewhere |

Every vault in forest and highland caves holds a humming relic, every desert vault an ember relic, every tundra vault a frost relic; loot is per player (#73), so no team waits for another. Grassland vaults hold no relic.

### Doors and puzzles

| Structure | Opens by | Puzzle (starting numbers) |
|---|---|---|
| Wreck | walking in; sealed wrecks (one in three) need a copper or iron pickaxe to break open (#19) | — |
| Grassland and forest vault | delivery | 20 copper wire/min and 10 iron plates/min for 2 minutes |
| Highland vault | routing | rotate pipe pieces until the flow connects |
| Desert vault | power | keep between 40 and 45 MW flowing into the door for one minute |
| Tundra vault | pressure | fill a 1 000 m³ chamber with natural gas to 3–3.5 bar and hold it for one minute |
| Ancient seal | concordite pickaxe, then a large puzzle | deliver 4 superconducting coils/min while 200–210 MW flow into the seal, for 3 minutes |

Each puzzle asks for what a team can already make when it needs the relic: tier 2 parts for the phase 3 relic, steady power for the desert, gas pressure (tier 5) for the tundra. The heat suit (tier 4) and the cold suit (tier 5) unlock with the phase before the relic is needed (#145).

### Loot tables (per player, #73)

| Structure | Loot |
|---|---|
| Wreck | 2–4 ancient gears; one of 10–20 copper sheet, 10–20 iron plate or 5–10 gear; 1–2 salve at 30 % |
| Sealed wreck | 4–6 ancient gears; one stack as above; a speed upgrade at 10 % |
| Vault | its biome's relic; one alternative recipe from its biome's list that the team does not have yet; 4–8 ancient gears; a harmonic core at 25 %; a medkit (desert, tundra) or 2 salves (elsewhere) |
| Ancient seal | concord relic; two rare alternative recipes; two harmonic cores |

### Alternative recipes

An alternative recipe unlocks for the looting player's team, as any unlock does (#47), and is chosen in the machine menu next to the main recipe.

| Alternative | Replaces | Made in | Recipe | Time | Found in |
|---|---|---|---|---|---|
| Drawn wire | copper wire | constructor | 2 copper ingot → 5 copper wire | 5 s | grassland, forest |
| Rolled plate | iron plate | constructor | 1 iron ingot → 1 iron plate | 3 s | grassland, forest |
| Steel gear | gear | constructor | 1 steel → 2 gear | 4 s | forest |
| Lime brick | stone brick | furnace | 2 limestone → 1 stone brick | 3 s | grassland |
| Direct steel | steel | foundry | 2 iron ore + 1 coal → 1 steel | 6 s | highlands |
| Compact motor | motor | assembler | 1 rotor + 1 steel → 1 motor | 8 s | highlands |
| Grown resonator | resonator | mixer | 1 thrumite + 2 m³ sulfuric acid → 1 resonator | 6 s | highlands |
| Cracked plastic | plastic | refinery | 4 m³ fuel → 2 plastic | 4 s | desert |
| Recycled rubber | rubber | refinery | 2 plastic + 2 m³ fuel → 2 rubber | 6 s | desert |
| Fused glass | glass | foundry | 2 sand + 1 pyrelith ore → 3 glass | 6 s | desert |
| Gas-chilled coolant | coolant | mixer | 2 m³ water + 4 m³ natural gas → 4 m³ coolant | 4 s | tundra |
| Lens-drawn wire | superconducting wire | assembler | 2 copper wire + 1 rimeglass lens → 3 superconducting wire | 6 s | tundra |
| Direct concordite (rare) | concordite ingot | manufacturer | 1 resonator + 1 rimeglass lens + 2 pyrelith ingot → 2 concordite ingot | 12 s | ancient seal |
| Lean resonance cell (rare) | resonance cell | manufacturer | 1 storage cell + 1 pyrelith ingot + 2 rimeglass lens + 2 superconducting wire → 1 | 20 s | ancient seal |

Cracked plastic and recycled rubber give the tier 4 fuel by-product a second consumer next to the fuel generator.

## 11. Checks for implementation

- **Ratio identities** to pin in core tests once the catalogue moves into code: one copper wire constructor per furnace; three furnaces per two plate constructors; one extractor Mk2 on normal coal and one water pump feed two coal generators (60 MW, GDD section 12); one oil pump per refinery, two refineries per fuel generator; one gas extractor per gas turbine; one battery per normal geothermal vent; one resonance cell manufacturer per three reactors.
- **Entity budget:** the phase 6 reference factory has about 150 production buildings plus its power plant and logistics, well below the default team limit of 6 000 buildings (#139). The Stage 4 benchmark checks the tick budget at that size.
- **Pacing** is a hypothesis: the first playtests measure time to each phase and tune quantities before recipes.
