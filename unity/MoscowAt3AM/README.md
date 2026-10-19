# Москва в 3 часа ночи — Unity source prototype

This directory contains native Unity C# gameplay components, not a built game.
Open a Unity 2022.3 LTS (or newer compatible) project and copy `Assets/Scripts`
into it. Create and assign missile/target/building prefabs, input UI, audio clips,
materials, a city scene and a WebGL build profile.

## Included
- Explicit missile launch followed by manual 3D flight controls.
- Rigidbody continuous collision detection; direct collision callbacks, not auto-aim.
- Air targets with bounded randomized waypoints and timed attacks.
- Damageable buildings with staged window damage and collapse hooks.

## Important
This is source code only. It does not yet include finished 3D art, likeness assets,
sound recordings, a Unity scene, or a compiled WebGL build. GloBIT Arcade cannot run
C# source directly: to replace the web version in its browser catalog, the Unity
project must be built for WebGL and deployed with its generated loader, framework,
wasm and data files.