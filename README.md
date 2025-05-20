# Pingpong Simulate

## Project Overview

**Pingpong Simulate** is a web-based virtual reality (VR) table tennis game, supporting single-player mode and VR controller operation. Built with three.js and cannon.js, it runs in desktop browsers and on VR devices (such as Oculus Quest). The project supports left/right hand selection, realistic paddle pose synchronization, and paddle rotation compensation for an authentic ping pong experience.

---

## Features

- WebXR support, compatible with mainstream VR devices
- Single-player mode (multiplayer code removed)
- Realistic physics and paddle rotation
- Left/right hand selection
- Paddle pose follows controller, supporting various real-life hitting gestures
- Responsive UI for desktop and mobile
- Customizable ball speed, table size, target area, and more

---

## Getting Started

### 1. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.

```bash
npm install
```

### 2. Start the Local Server

```bash
npm start
```
Or run directly:
```bash
node server.js
```
The server will start at [http://localhost:3000](http://localhost:3000).

### 3. Play the Game

Open [http://localhost:3000](http://localhost:3000) in your browser.
- Chrome or any WebXR-enabled browser is recommended.
- For VR, make sure your device is connected and browser permissions are granted.

---

## How to Play

- On the home page, select **Left Hand** or **Right Hand** to enter the game and set your dominant hand.
- In VR mode, the paddle will follow your controller's position and rotation, supporting a variety of real-life hitting gestures.
- Use the "Reset Pose" button to recalibrate your view if needed.

---

## Tech Stack

- [three.js](https://threejs.org/) — 3D rendering
- [cannon.js](https://github.com/schteppe/cannon.js) — Physics engine
- [express](https://expressjs.com/) — Local server
- [gsap](https://greensock.com/gsap/) — Animation
- [zepto](https://zeptojs.com/) — Lightweight DOM manipulation

---

## Directory Structure

```
├── public/                # Static assets and entry HTML
│   ├── index.html
│   └── ...
├── src/
│   └── javascripts/       # Main JS source code
│       ├── app.js
│       ├── scene.js
│       ├── physics.js
│       └── ...
├── server.js              # Local Express server
├── package.json
└── README.md
```

---

## FAQ

- **Paddle orientation is wrong in VR?**  
  The project includes automatic compensation so the paddle's wide face is vertical to the ground, with the edge facing the user. If you need further adjustment, modify the compensation angle in `scene.js`.

- **Where is multiplayer mode?**  
  The project is now single-player only; all multiplayer code has been removed.

- **How to customize parameters?**  
  You can adjust ball speed, table size, and more in `src/javascripts/physics.js` and `scene.js`.

---

## Credits

- Thanks to open source projects like three.js, cannon.js, and all contributors who provided ideas and code for this project.

---

For further customization or questions, feel free to contact the developer.