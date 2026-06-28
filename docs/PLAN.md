# Road-First City Builder Plan

## Summary

Build this as a solo, prototype-first Bevy/Rust city builder targeting Windows/Linux desktop with Vulkan as the main performance target. The first playable should prove **road editing + zoning + basic terrain/building placement**, because roads become the shared backbone for parcels, services, traffic, transit, utilities, and agent routing.

Use Bevy 0.19+ as the baseline. Current Bevy is suitable for editor-heavy prototyping: it has built-in transform gizmo and infinite grid tooling, and recent large-scene rendering improvements. Mesh shaders should be treated as a later renderer experiment, not an early foundation, because wgpu marks mesh shaders experimental/native-only and requires adapter feature checks.

Research basis: Bevy 0.19 release notes, wgpu docs, Vulkan mesh shader docs, ASAM OpenDRIVE, RAPTOR public-transit routing, customizable contraction hierarchies, MATSim, NVIDIA geometry clipmaps, ArcGIS CityEngine.

## Key Architecture

- Use Bevy ECS for gameplay objects, UI/editor state, visible vehicles/pedestrians, selected entities, and rendering hooks.
- Use custom data-oriented simulation stores for large-scale systems instead of one Bevy entity per citizen. Citizens should be represented as compact arrays/SoA records, with ECS entities only for visible sampled agents.
- Represent the city world as chunked layers:
  - `TerrainChunk`: heightfield, surface tags, water mask, buildability, slope.
  - `RoadGraph`: nodes, directed lane edges, lane type, speed, grade/elevation, restrictions.
  - `ParcelGraph`: lots/zones derived from road loops and manually placed plots.
  - `BuildingStore`: footprint, transform, procedural seed, occupancy, utility links.
  - `PopulationStore`: households, workplaces, schedules, satisfaction, trip demand.
  - `TransitNetwork`: stops, routes, schedules, capacities, fares/comfort metadata.
- Roads should be spline/reference-line based, inspired by OpenDRIVE’s reference-line/lane-section model, but simplified for gameplay.
- Terrain should start as chunked CPU heightfields with collision/raycast sampling, then evolve toward GPU-friendly clipmap/LOD rendering once map scale becomes a bottleneck.
- Pathfinding should be layered:
  - Local A*/Dijkstra for editor validation and short queries.
  - Hierarchical road routing with customizable contraction hierarchies for private vehicles.
  - RAPTOR-style timetable routing for buses, metro, trains, trams, ferries.
  - A multimodal planner that compares generalized cost: time, money, walking, transfers, congestion, parking, comfort, weather/day-night modifiers.
- Procedural buildings should begin as editable cubes/blobs with footprints and heights, then grow into deterministic grammar/parameter-based generation from lot size, zone, density, style, and seed.

## Development Phases

### Phase 0: Foundation And Learning

Build a clean Bevy prototype shell:
- Free top-down 3D camera with pitch/zoom/yaw limits.
- Terrain plane with ray picking.
- Editor mode state machine: select, road draw, building place, zone paint.
- Debug overlays for graph nodes, lane edges, terrain slope, parcel boundaries.
- Save/load city state with `serde`/RON or a compact binary format later.

Learning focus:
- Bevy ECS schedules, resources, events/observers, plugins, assets, cameras, picking, gizmos.
- Rust data-oriented design, profiling, `tracing`, `criterion`, `perf`/Tracy.
- Basic wgpu/Vulkan concepts: adapters, features, buffers, draw calls, GPU profiling.

Acceptance:
- Can place/select/move/scale cube buildings.
- Can draw simple roads.
- Can save/load a tiny city.

### Phase 1: Roads + Zoning First Playable

Implement the road editor as the core feature:
- Draw curved gridless roads using splines.
- Generate lane geometry from a road template: car lanes, median, footpath, cycle lane, bus lane, pedestrian-only.
- Support road elevation metadata from day one: ground, bridge/flyover, tunnel/underground.
- Build a directed lane graph with lane-change connectors and junction connectors.
- Add zoning along roads and derive simple rectangular/irregular parcels.

Keep visuals simple:
- Roads as generated meshes.
- Buildings as colored boxes.
- Zones as translucent overlays.

Acceptance:
- User can make a small road network, add zoning, and see parcels/buildings appear.
- Lane graph validates connectivity and one-way/two-way rules.
- Road templates can be swapped without rewriting the graph model.

### Phase 2: Terrain, Water, And Building Adaptation

Add terrain variety:
- Chunked heightmap terrain with hills, beaches, rivers, cliffs, and water level.
- Terrain brushes: raise/lower, smooth, flatten, river carve, beach soften.
- Road/building placement adapts to terrain using sampled height, slope checks, cut/fill metadata, and optional retaining walls.
- Buildings support foundations/stilts/basements for uneven terrain.

Procedural building generation:
- Start with massing rules: footprint, setbacks, height, roof type, facade color.
- Add deterministic seeds so regeneration is stable.
- Keep Blender limited to optional authored props/material tests until the in-game building grammar is useful.

Acceptance:
- Roads conform to terrain or create bridge/tunnel segments.
- Buildings reject impossible slopes unless foundation mode is enabled.
- Regenerating a city produces identical buildings from the same seeds.

### Phase 3: Traffic And Scalable Routing

Implement private transport first:
- Vehicles spawn from aggregate trip demand.
- Use lane-following and simple intersection rules.
- Route with A*/Dijkstra initially, then add hierarchical routing when networks grow.
- Track congestion, travel time, parking pressure, noise, and emissions per road segment.

Scale strategy:
- Simulate nearby/important vehicles microscopically.
- Simulate distant traffic as edge flows and queues.
- Keep per-frame traffic work budgeted and chunked.

Acceptance:
- 10k visible/active vehicle trips work in a test city.
- 100k+ aggregate daily trips update without frame spikes.
- Congestion changes route choices and satisfaction.

### Phase 4: Public Transport And Multimodal Trips

Add transport systems in this order:
1. Buses on road lanes.
2. Metro/train/tram on rail-like graphs.
3. Ferry routes on water graph.
4. Taxis/ride-hail as demand-responsive vehicles.

Implement multimodal routing:
- Walking/cycling access to stops.
- RAPTOR-style public transport queries for schedules/transfers.
- Compare car, walk, bike, transit, taxi, and combinations by generalized cost.
- Add capacity and waiting-time feedback.

Acceptance:
- Citizens can choose between car, walking, cycling, bus/metro, and mixed routes.
- Route choice changes when congestion, service frequency, parking, or transit capacity changes.

### Phase 5: Population, Economy, Services, Time

Implement lifecycle simulation as aggregate-first:
- Households, workplaces, schools, shops, restaurants, parks, monuments, stadiums.
- Daily/weekly schedules: commute, shopping, leisure, tourism, special events.
- Businesses generate jobs, goods/service demand, garbage, noise, deliveries, and tax.
- Satisfaction model from commute time, rent, pollution, noise, services, utilities, leisure access.

City systems:
- Electricity, water, sewage, garbage, internet, pollution, loudness.
- Service coverage as network/distance fields, not individual service checks per citizen.
- Day-night/week simulation affects traffic peaks, business demand, transit frequency, energy use, leisure, tourism.

Acceptance:
- City demand evolves over multiple simulated weeks.
- Population can reach millions as records/aggregates, while only selected/visible agents become ECS entities.
- Performance tests cover 100k, 1M, and multi-million population scenarios.

### Phase 6: Rendering, Scale, And Polish

Optimize only after measuring:
- Instancing and batching for repeated buildings/props.
- Chunk visibility, LOD, impostors, and terrain clipmaps.
- GPU-driven rendering experiments only after standard Bevy rendering hits measured limits.
- Mesh shader branch later for terrain/building/road batches, gated by adapter support and fallback path.

Camera and UX:
- Top-down city camera with free rotation, pitch limits, collision/terrain-aware zoom.
- Toolbars for roads, zoning, terrain, transit, utilities.
- Debug/profiler UI always available in dev builds.

Acceptance:
- Large city remains interactive at target hardware budget.
- Every advanced renderer path has a non-mesh-shader fallback.

## Test Plan

- Unit tests for road graph connectivity, lane template expansion, path costs, transit schedules, terrain sampling, building slope validation, and deterministic generation.
- Golden scenario tests: tiny town, hilly river town, coastal city, bridge/tunnel network, transit-heavy city, traffic-stressed city.
- Performance benchmarks:
  - Road graph build time.
  - Route query time.
  - Transit query time.
  - Agent schedule update throughput.
  - Render frame time for increasing building/vehicle counts.
- Visual/debug validation:
  - Overlay lane graph, parcel graph, terrain buildability, utility coverage, congestion, noise, pollution.
- Save/load tests:
  - Same city file reloads with identical terrain, roads, buildings, seeds, population aggregates, and simulation state.

## Assumptions

- Primary platform: Windows/Linux desktop with Vulkan.
- Development mode: solo long-term, initially prototype-heavy.
- First playable priority: roads + zoning.
- Bevy stays as the game engine; Blender is for optional assets, not core simulation authoring.
- Mesh shaders are deferred until profiling proves the need.
- The first serious “fun” milestone is a small town where roads, zoning, terrain, buildings, traffic, and basic demand all influence each other.
