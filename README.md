# Pingpong Simulate

## Project Overview

**Pingpong Simulate** is a web-based virtual reality (VR) table tennis game, supporting single-player mode and VR controller operation. Built with three.js and cannon.js, it runs in desktop browsers and on VR devices (such as Oculus Quest). The project supports left/right hand selection, realistic paddle pose synchronization, and paddle rotation compensation for an authentic ping pong experience.

---

## Unique Gameplay & Features

- **Immersive VR Table Tennis**: Experience table tennis in a fully immersive 3D environment. The game leverages WebXR and advanced 3D graphics to make you feel like you are truly standing at the table.
- **Realistic Physics**: Every bounce, spin, and collision is calculated using a physics engine, making the ball's movement and paddle response feel natural and challenging.
- **Free Paddle Movement**: The paddle's position and orientation follow your VR controller in real time, allowing for forehand, backhand, spin, smash, and all kinds of real-life ping pong techniques.
- **Left/Right Handed Mode**: Choose your dominant hand before entering the game for a personalized experience.
- **Precision Target Challenge**: Hit the ball to a highlighted target area on the table to earn extra points and lives, encouraging skillful and strategic play.
- **Progressive Difficulty**: The ball's speed increases as rallies get longer, testing your reflexes and control.
- **Score & Life System**: Try to achieve the highest score before running out of lives. Hitting the target area can earn you extra lives!
- **Minimalist UI**: The interface is clean and distraction-free, keeping you focused on the game.
- **Quick Start**: No account or login required—just open the game, pick your hand, and play instantly.
- **Device Friendly**: Works on desktop browsers and VR headsets with WebXR support.

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
- Aim for the target area on the table for bonus points and extra lives.
- The game gets faster as you return more balls—how long can you survive?

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