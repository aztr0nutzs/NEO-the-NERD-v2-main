# Prankster Lab: Audio Asset Sourcing & Matching Plan (120-Sound Starter Library)

## 1. Sourcing Checklist (Safe & Royalty-Free)
To ensure the app remains legally safe and compliant with app store policies, use the following strict sourcing checklist:

- [ ] **Freesound.org (CC0 Only):** Filter searches strictly by the "Creative Commons 0" (Public Domain) license. Never use "CC-BY-NC" (Non-Commercial).
- [ ] **Pixabay Audio / Incompetech:** Use high-quality royalty-free clips. Check specific attribution requirements.
- [ ] **Custom Foley (DIY):** Record household items (doors, squeaky chairs, mouth noises, tapping) using your phone's voice memo app. This guarantees 100% ownership.
- [ ] **Safety Check - No Copyrights:** No movie quotes, TV show rips, meme audio, or recognizable music.
- [ ] **Safety Check - No Panic Inducers:** NO police sirens, fire alarms, medical flatlines, gunshots, EAS (Emergency Alert System) tones, or Amber Alert sounds.

## 2. Recommended Sound Types per Category (15 sounds × 8 categories = 120 total)
1. **FUNNY:** Squeaks, wet squishes, bad trumpet notes, harmless bodily functions, burps, goofy whistles.
2. **CREEPY LITE:** Soft knocks, floorboard creaks, distant whispers, wind, clock ticks (Nothing genuinely traumatizing).
3. **OFFICE:** Mouse clicks, aggressive typing, printer jams, water cooler bubbles, pen clicking, chair squeaks.
4. **ROBOT:** Servo hums, metallic voices saying "hello", processing beeps, shutdown tones.
5. **CARTOON:** Boings, splats, zip-away running sounds, bonks, slide whistles.
6. **ANIMAL:** Confused dog grunts, tiny snorts, weird bird calls, goat bleats, duck quacks.
7. **GLITCH:** Short-circuit zaps, static pops, dial-up modem stutters, CD skipping sounds.
8. **SCI-FI:** Laser toy zaps, forcefield hums, spaceship doors, alien console pings.

## 3. Formatting Recommendations
- **Format:** `.ogg` (Ogg Vorbis) - Perfect for Android and Web, offers excellent compression with minimal quality loss.
- **Bitrate:** 96kbps to 128kbps (keeps the app size small).
- **Channels:** Mono is preferred for short sound effects (halves file size). Stereo only for rich ambience.
- **Loudness (Normalization):** Peak normalize all sounds to **-3dB** or **-6dB** so they have consistent volume. No quiet whispers that force the user to turn up their volume right before a loud pop.
- **Trimming:** Absolute ZERO milliseconds of dead air at the start of the file. Trim the exact start of the transient wave.

## 4. Suggested Editing Workflow (Using Audacity or Reaper)
1. **Import:** Drag sourced `.wav` or `.mp3` files into your DAW.
2. **Trim:** Zoom in on the waveform. Cut all empty space at the beginning. Add a tiny 10ms fade-out at the end to prevent audio "clicks" when the file stops.
3. **Normalize:** Apply a Limiter or Normalization effect to hit exactly -3dB.
4. **Convert & Export:** Export as Ogg Vorbis (.ogg).
5. **Rename:** Use strict `snake_case` (e.g., `squeaky_fart_01.ogg`). No spaces, no capital letters.
6. **Place:** Move the file into the exact corresponding folder: `app/src/main/assets/sounds/<category_name>/`.
7. **Validate:** Play the file on your device to ensure it isn't distorted. Update `sound_catalog.json` with the exact duration.

---

## 5. Acquisition & Matching Table
*Below is the blueprint for mapping the asset IDs to their physical files. Expand this pattern to reach the full 120 sounds.*

| Sound ID | Expected Filename | Category Folder | Detailed Audio Description | Acceptable Substitutes |
| :--- | :--- | :--- | :--- | :--- |
| **FUNNY (15 Sounds)** | | | | |
| `funny_squeaky_fart_01` | `squeaky_fart_01.ogg` | `sounds/funny/` | High-pitched, short, classic balloon-like squeal. | Wet sponge rub, gym shoe squeak on floor. |
| `funny_awkward_cough` | `awkward_cough.ogg` | `sounds/funny/` | A single, nervous, throat-clearing "*ahem*". | A tiny suppressed sneeze. |
| `funny_rubber_chicken` | `rubber_chicken.ogg` | `sounds/funny/` | High-pitched plastic wheeze. | Dog squeaky toy. |
| `funny_belly_rumble` | `belly_rumble.ogg` | `sounds/funny/` | Deep, gurgly stomach digestion sound. | Water bubbling in a plastic pipe. |
| **CREEPY (15 Sounds)** | | | | |
| `creepy_soft_knock_01` | `soft_knock_01.ogg` | `sounds/creepy/` | 3 subtle, muffled taps on hollow wood. | Finger tapping on a desk or hollow box. |
| `creepy_floor_creak` | `floor_creak_01.ogg` | `sounds/creepy/` | Weight slowly shifting on old wooden planks. | Twisting an old wooden chair or opening an old door. |
| `creepy_distant_whisper`| `distant_whisper.ogg` | `sounds/creepy/` | Indecipherable, breathy speech, heavily reverbed. | Rubbing hands together slowly near the mic with wind. |
| `creepy_music_box` | `music_box_plink.ogg` | `sounds/creepy/` | 3 slow notes from a wind-up metallic music box. | Plucking a comb or kalimba slowly. |
| **OFFICE (15 Sounds)** | | | | |
| `office_mouse_click_01` | `aggressive_click.ogg`| `sounds/office/` | Sharp, loud snapping of a plastic computer mouse. | Clicking a retractable pen loudly. |
| `office_printer_jam` | `printer_jam.ogg` | `sounds/office/` | Plastic gears grinding, paper crinkling. | Crushing a paper cup. |
| `office_calendar_ping` | `calendar_ping.ogg` | `sounds/office/` | A generic, non-copyrighted ding (like a triangle hit). | Tapping a glass half-filled with water. |
| `office_chair_squeak` | `chair_squeak.ogg` | `sounds/office/` | High-tension metal spring whining. | Rusted hinge opening. |
| **ROBOT (15 Sounds)** | | | | |
| `robot_hello_01` | `hello.ogg` | `sounds/robot/` | Monotone TTS voice synthesized with ring modulation. | Speak through a fan or use a free vocoder plugin. |
| `robot_servo_whine` | `servo_whine.ogg` | `sounds/robot/` | High-pitched electric motor winding up. | Electric drill or RC car motor reversed and pitched down. |
| `robot_error_buzz` | `error_buzz.ogg` | `sounds/robot/` | Harsh, square-wave synth buzz. | A distorted electric guitar palm mute. |
| **CARTOON (15 Sounds)** | | | | |
| `cartoon_boing_01` | `boing.ogg` | `sounds/cartoon/` | Classic Jew's harp twang. | Plucking a taut rubber band. |
| `cartoon_slip_zip` | `slip_zip.ogg` | `sounds/cartoon/` | Fast pitch-bending slide whistle going up. | Mouth whistling upward quickly. |
| `cartoon_bonk` | `bonk.ogg` | `sounds/cartoon/` | Hollow, resonant wood block hit. | Hitting an empty plastic bucket with a wooden spoon. |
| **ANIMAL (15 Sounds)** | | | | |
| `animal_confused_dog` | `confused_dog.ogg` | `sounds/animal/` | High-pitched, low-volume whine/grunt. | Human doing a gentle throat hum. |
| `animal_tiny_snort` | `tiny_snort.ogg` | `sounds/animal/` | Pig-style inhalation snort. | Short human snore. |
| `animal_crickets` | `crickets.ogg` | `sounds/animal/` | Loopable field recording of night crickets. | Shaking a small maraca very lightly rhythmically. |
| **GLITCH (15 Sounds)** | | | | |
| `glitch_system_error` | `error.ogg` | `sounds/glitch/` | Aggressive digital static burst. | Unplugging a live aux cable (recorded safely). |
| `glitch_cd_skip` | `cd_skip.ogg` | `sounds/glitch/` | Short repeating audio buffer stutter. | Repeating a 50ms clip of a drum beat 4 times fast. |
| `glitch_dialup_tone` | `dialup_tone.ogg` | `sounds/glitch/` | Harsh connection handshake squeal. | Very fast synthesizer arpeggiator. |
| **SCI_FI (15 Sounds)** | | | | |
| `scifi_warp_stall` | `warp_stall.ogg` | `sounds/scifi/` | Deep synth bass dropping in pitch. | Vacuum cleaner turning off. |
| `scifi_laser_pew` | `laser_pew.ogg` | `sounds/scifi/` | Classic 80s pitch-dropping sine wave. | Hitting a slinky with a stick. |
| `scifi_airlock_hiss` | `airlock_hiss.ogg` | `sounds/scifi/` | Burst of white noise fading out. | Aerosol can spraying. |

*(To reach 120 sounds, append 11 more variations to each of the 8 category blocks matching the style outlined above).*
