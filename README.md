# Retro Desk

I like Windows 95 on a webpage, so I made my own 90s-style desktop: **https://2three1y.github.io/retrodesk/**

It's not real Windows. There are no Microsoft files, icons, fonts or sounds in here. Everything is homemade HTML, CSS and JavaScript that just looks very 1995: grey bevels, a teal desktop, a taskbar and a Start button.

## What's on my desk

- **Turn on computer**: press it and you get a startup chime I made with Web Audio (no sound files). Nothing plays until you press it.
- **Sound: on/off**: a plain button at the top if you want it quiet.
- **My Computer**: my drives (mostly nostalgia) and a link to my website.
- **Projects**: links to the stuff I've shipped.
- **Notepad**: type whatever. It saves on your device by itself.
- **Recycle Bin**: empty. I took the trash out myself.
- **Start menu**: opens all of the above, plus About and Turn off computer.
- **Clock** in the taskbar.

## Made to work with VoiceOver

I use VoiceOver, so every icon is a real button, every window is a real dialog with a heading and a Close button, and Escape closes the Start menu and windows. Focus goes back to where you were when you close something. No live regions shouting at you, no flashing, and it respects Reduce Motion.

## Run it yourself

It's three files (`index.html`, `style.css`, `app.js`). Open `index.html` in a browser. No build step, no libraries.

## License

MIT. Co-written with Tab.
