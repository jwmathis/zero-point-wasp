# ZERO-POINT: THE WASP PROTOCOL
**"Terminal Initialization Required...Neural Link Established."**

![Three.js](https://img.shields.io/badge/Three.js-black?logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?logo=visual-studio-code&logoColor=white)
![Course](https://img.shields.io/badge/Mercer_University-SSE_643_Capstone-F56600.svg)
![Lines of Code](https://img.shields.io/badge/LOC-<1000-blue.svg)
![Status](https://img.shields.io/badge/Status-Completed-success.svg)

*Zero-Point: The Wasp Protocol* is a high-speed, 3D arcade rail-shooter inspired by the kinetic, dodge-and-weave mechanics of *Star Fox* and the relentless enemy formations of *Galaga*. Built entirely from scratch in Three.js, you must pilot the Star Sparrow starfighter through an infinite, collapsing wormhole while defending against waves of rogue automated defense drones.

## BRIEFING: THE LORE
The Zero-Point wormhole was supposed to be humanity's ultimate transit corridor. Instead, the automated defense grid&mdash;the Wasp Protocol&mdash;has gone rogue, trapping civilian vessels inside the collapsing tunnel.

As a Neural-Link Pilot, your consciousness has been directyl uploaded to a Star Sparrow Interceptor. Your objective is simple: Dive into the wormhole, survive the twisting spatial anomalies, and vaporize the rogue drone formations to increase your Sync Rating before the tunnel collapses.

## FLIGHT CONTROLS
The Star Sparrow uses a dual-input control scheme. Your keyboard handles the ship's physical position in the tunnel, while your mouse controls the targeting computer.

* **[W,A,S,D]** - Thrust/Strafe (Move Ship up, down, left, right)
* **[MOUSE]** - Aim Targeting Crosshair
* **[LEFT CLICK]** - Fire Primary Lasers (Rapid Fire)
* **[SHIFT]** - Engine Boost (Speed up to push through gaps)
* **[SPACEBAR]** - Air Brake (Slow down to track enemiess)
* **[Q]/[E]** - Barrel Roll (Execute a 360&deg; spin to deflect lasers)
* **[P]** - Pause System

## COMBAT MECHANICS & HUD
1. **Sync Rating (Scoring)**

    Your primary goal is to achieve the highest Sync Rating (Score) possible

2. **Weapon Systems**

    You have unlimited ammunition, but your blasters have a slight cooldown to prevent overheating.
    
    * **Twin-Shot Upgrade**: Prove your skill by reaching a Sync Rating of **3,000**, and the ship's targeting computer will automatically unlock the Twin-Shot, doublling your firepower.

3. **Tactical Maneuvers**

    * **The Barrel Roll**: Pressing Q or E causes the ship to spin rapidly. During this animation, your ship's electromagnetic shielding overloads, making you completely invulnerable to enemy fire and collision damage. Use it to survive unavoidable walls of laser fire!

## ENEMY DATABASE

The Wasp Protocol utilizes three distinct drone archetypes. Learn their behviors to survive:

* **The Striker**: These heavily armored drones warp in and lock into rigid grid formations. They will suppress you with laser fire from a distance before breaking formation to execute sweeping, spiral dive-bombs.

* **The Seeker**: Kamikaze units. They do not fire lasers; instead, they use geometric acceleration to ominously spin and lunge directly at your hull. Prioritize them immediately.

* **Scrap Mines**: Dormant, rotating psace junk trapped in the tunnel. They deal massive damage if you fail to dodge them.

## FIELD RESOURCES (POWER-UPS)

Occasionally, the destroyed drones will leave behind residual energy cores. Fly through them to upgrade your ship:

* **Integrity Core (Cyan Ring)**: Restores 25% of your ship's System Integrity (Health).

* **Sync Surge (Magenta Core)**: Fires a massive, unstoppable Plasma Beam down teh tunnel that vaporizes every enemy caught in its blast radius

## TECHNICAL DETAILS
*Zero-Point: The Wasp Protocol* is a capstone software engineering project built under a strict 1,000 Lines of Code (LOC) limit.

* **Engine**: Three.js (WebGL)
* **Language**: JavaScript (ES6 Modules), HTML5, CSS3
* **Key Features**: Custom 3D collision math, kinematic object pooling, dynamic FOV warping, additive-blending plasma rendering, and mathematical procedural terrain generation.

**Initial Game Architecture**
```mermaid
flowchart TD
    Input[User Input: Keyboard &amp; Mouse]
    Main[Game Director: main.js]
    Entities[Game Entities: Player, Enemies, World]
    ThreeJS[Three.js WebGL Renderer]
    HUD[HTML/CSS HUD Overlay]

    Input -->|Triggers Events| Main
    Main -->|Updates State| Entities
    Main -->|Updates DOM| HUD
    Entities -->|Passes 3D Data| ThreeJS
    ThreeJS -->|Renders Frame| Display([Browser Canvas])
```
**Expanded Game Architecture**
```mermaid
graph TD
    %% Node Styling
    classDef user fill:#222,stroke:#00F2FF,stroke-width:2px,color:#fff;
    classDef logic fill:#001a33,stroke:#00F2FF,stroke-width:1px,color:#fff;
    classDef render fill:#111,stroke:#FF0055,stroke-width:1px,color:#fff;
    classDef data fill:#222,stroke:#FFD700,stroke-width:1px,color:#fff;

    %% Actors and Inputs
    Player((Player))
    Input[Keyboard / Mouse]
    
    Player --> Input
    
    %% Main Architecture Blocks
    subgraph "Zero-Point Application"
        UI[HTML / CSS UI Overlay]
        
        subgraph "Game Engine (Vanilla ES6)"
            State[(Global Game State)]
            Loop[Main Animation Loop]
            Systems[Game Modules: Player, Enemies, etc.]
        end
        
        subgraph "Rendering Pipeline (Three.js)"
            Assets[Asset Loader: GLTF, Audio]
            WebGL[WebGL Canvas Renderer]
        end
    end

    %% Connections
    Input -->|Triggers events| UI
    Input -->|Updates state| State
    
    Loop -->|Reads/Writes| State
    Loop -->|Updates| Systems
    
    Assets -->|Supplies meshes| Systems
    Systems -->|Sends 3D data| WebGL
    UI -.->|Overlays| WebGL
    
    WebGL -->|Displays frame| Player

    %% Apply styles safely at the end
    class Player,Input user;
    class UI,Loop,Systems logic;
    class State,Assets data;
    class WebGL render;
```

**Expanded Game Architecture 2**
```mermaid
flowchart TD
    %% Define styles
    classDef core fill:#000,stroke:#00F2FF,stroke-width:2px,color:#00F2FF;
    classDef system fill:#001a33,stroke:#00F2FF,stroke-width:1px,color:#fff;
    classDef logic fill:#111,stroke:#FF0055,stroke-width:1px,color:#fff;

    %% Define flow
    Start([requestAnimationFrame]) --> Time[Calculate Time & Difficulty]
    Time --> Input[Process W/A/S/D/Shift Input]
    Input --> Wormhole[Wormhole.update: Shift Tunnel Curves]
    Wormhole --> Player[Player.update: Clamp Boundaries & Move]
    Player --> PowerUps[PowerUps.update: Move & Check Collect]
    PowerUps --> Projectiles[Projectiles.update: Move Lasers/Surge]
    Projectiles --> Spawner{Spawn Timer Ready?}
    Spawner -- Yes --> Spawn[EnemySystem: Spawn Formation or Random]
    Spawner -- No --> EnemyAI[EnemySystem.update: Dive Bombs & Movement]
    Spawn --> EnemyAI
    EnemyAI --> Collisions[Check Laser/Surge vs Enemy Hitboxes]
    Collisions --> Render[(renderer.render)]
    Render --> Start

    %% Apply styles safely at the end
    class Start,Render core;
    class Time,Input,Spawner,Collisions logic;
    class Wormhole,Player,PowerUps,Projectiles,Spawn,EnemyAI system;
```



