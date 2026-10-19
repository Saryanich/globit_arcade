# Audio assets / attribution

The game currently has a Web Audio procedural engine loop and synthesized UI / impact cues in `audio.js`, so it works without third-party hosts and without an API key.

Optional realistic CC0 source candidates (downloaded assets are not bundled yet; the sites require direct download or provide external file URLs):
- Breviceps, “Propeller plane” (CC0, WAV, 29.656 s): https://freesound.org/people/Breviceps/sounds/515293/
- DylanTheFish, “Propeller.wav” (CC0, WAV, 22.732 s): https://freesound.org/people/DylanTheFish/sounds/457013/
- Dj Lio, “Airplane, pass #4” (CC0, 11 s): https://bigsoundbank.com/airplane-pass-4-s3007.html

Before bundling, verify the download endpoint and keep a copy of each source's license/attribution information. Freesound page links are not direct audio file URLs, and should not be used as `<audio src>`.
