# Astroline
3D web game on moons

## Objectives

Get a game where you can fly around moons with gravity pull
Moon generator
LOD if too heavy
AI for bots
Multiplayer support

## Experiment

A game where LLM has an interface to modify certain rules and do a LLM + bots vs Humans

## Debug Visualization

Press these keys to toggle debug visualizations:

- `S` - Surface raycasting rays (green)
- `N` - Surface normals (red)
- `G` - Gravity debug visualization
- `H` - Direction debug visualization

## Architecture

### Managers for Core Systems:
- **Performance** - Direct references, no lookup overhead
- **Clear ownership** - Each manager owns its domain
- **Tight coupling** - Core systems need to work together closely
- **Game loop integration** - Managers participate in update cycles

### Services for Utilities:
- **Reusability** - Used across multiple managers
- **Optional features** - Can be disabled (debugging, logging)
- **Testability** - Easy to mock for testing
- **Flexibility** - Can be swapped out easily