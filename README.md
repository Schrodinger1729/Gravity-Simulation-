# Gravity Lab

A lightweight browser-based gravity simulator built with Vite and HTML5 Canvas. The project focuses on real Newtonian N-body motion, orbit presets, body creation, and a dark scientific dashboard.

## Features

- N-body Newtonian gravity with a configurable softening parameter
- Stable orbit, binary star, escape-velocity, and black-hole-inspired presets
- Pause, step, reset, and time-scale controls
- Canvas-based rendering with trails and vectors
- Scientific inspector for selected bodies
- Real-time energy and momentum diagnostics
- Built for local browser execution without a backend

## Run locally

1. Open a terminal in the project folder.
2. Install dependencies:
   
   npm install

3. Start the app:
   
   npm run dev -- --host 0.0.0.0 --port 4173

4. Open the browser at:
   
   http://localhost:4173/

## Build for production

npm run build

Then preview the built app:

npm run preview -- --host 0.0.0.0 --port 4173

## Deployment

This project is static and can be published to GitHub Pages or any static host. The included GitHub Actions workflow builds the site and deploys the production `dist` directory when code is pushed to `main` or `master`, or when the workflow is started manually.

To enable GitHub Pages:

1. Push the project to GitHub.
2. In the repository settings, open **Pages** and set the publishing source to **GitHub Actions**.
3. Push to `main` or `master`, or run **Deploy Gravity Lab to GitHub Pages** from the Actions tab.

Vite is configured with relative asset paths, so the production build works both at a domain root and under a GitHub Pages repository path. `index.html` is the production entry point; `verify.html` is not required.

## Physics notes

- The simulation uses a Newtonian inverse-square gravitational model.
- Gravity is intentionally simplified and approximated with a softening term to improve numerical stability during close encounters.
- This is not a general-relativity simulation and does not include event horizons or relativistic lensing.

## Controls

- Play/Pause: start or freeze the simulation
- Step: advance by one timestep while paused
- Reset: restore the current preset
- Time scale: adjust how quickly simulation time advances
- Gravity toggle: disable or enable gravitational acceleration
- Trails: show body trajectories
- Vectors: show velocity direction vectors
- Grid: show a coordinate grid
- Presets: switch between orbit, binary star, escape, and black-hole-inspired setups

## Known limitations

- Straight inverse-square gravity is computationally expensive for large N-body systems.
- Near-collision behavior is stabilized with softening rather than exact collision physics.
- This is a visualization and teaching tool, not a high-precision astrophysics integrator.
