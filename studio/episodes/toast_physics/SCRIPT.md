# The Buttered Toast Law: Why Toast Always Lands Butter-Side Down

**Production Target:** 10.00 seconds (300 frames @ 30 fps)  
**Format:** Vertical 9:16 (1080x1920)  
**Styles:** 3 distinct visual styles (`comic_noir`, `rubber_hose`, `kurzgesagt`)  
**Pipeline:** 9 Gated Production Stops (SKILL.md)

---

## 1. Script & Narrative Cadence (Stop 1)
- **Word count:** 38 words
- **Duration:** 10.00 seconds (300 frames)
- **Speech rate:** 3.8 words/second (Zero-slacking cadence)

### Voiceover Lines
1. **Hook (f 0 - 84 / 0.0s - 2.8s):**  
   *"Your breakfast toast isn't cursed: it's a victim of table physics."*
2. **Escalation & Mechanism (f 85 - 174 / 2.8s - 5.8s):**  
   *"Falling from counter height, gravity and torque give it time for exactly one half-rotation."*
3. **The Break / Impact (f 175 - 228 / 5.8s - 7.6s):**  
   *"Result? Butter meets floor every time."*
4. **Deadpan Payoff (f 229 - 300 / 7.6s - 10.0s):**  
   *"To fix it, just build a ten-foot table."*

---

## 2. Newtonian & Rotational Physics Blueprint (Stop 4)
- **Table counter height:** $h = 0.82\text{ m}$
- **Toast dimensions:** $L = 0.10\text{ m}$, mass $m = 0.035\text{ kg}$
- **Overhang launch torque:** $\tau = mg \frac{L}{2} \cos\theta$
- **Rotational inertia (pivot at edge):** $I = \frac{1}{3} m L^2$
- **Angular acceleration at tipping edge:** $\alpha = \frac{\tau}{I} = \frac{3g}{2L} \cos\theta$
- **Angular launch velocity:** $\omega_0 \approx 7.85\text{ rad/s} \approx 450^\circ/\text{s}$
- **Ballistic fall time to floor:**
  $$t_f = \sqrt{\frac{2h}{g}} = \sqrt{\frac{2 \times 0.82}{9.80665}} \approx 0.408\text{ s} \quad (12.2\text{ frames})$$
- **Total rotation during fall:**
  $$\Delta\theta = \omega_0 \cdot t_f \approx 7.85 \times 0.408 \approx 3.20\text{ radians} \approx 183^\circ$$
- **Orientation at impact:** Exactly inverted ($\sim 180^\circ$) $\implies$ Butter side strikes the ground!
- **Impact mechanics:** Ground contact at $t = 5.83\text{ s}$ (f 175). Coefficient of restitution $e = 0.20$. Volume-preserving squash deformation: $S_y = 0.55$, $S_x = 1/\sqrt{0.55} = 1.348$.
- **Ten-foot table payoff:** At $h_2 = 3.28\text{ m}$ (10.7 ft), $t_{f2} = \sqrt{\frac{2 \times 3.28}{9.81}} \approx 0.818\text{ s}$, total rotation $\Delta\theta_2 \approx 365^\circ \implies$ Full $360^\circ$ revolution, landing butter-side up!

---

## 3. Shot & Camera Blocking Plan (Stop 3)
| Shot | Frame Span | Duration | Camera Grammar & Sightline | Key Action / Staging |
|---|---|---|---|---|
| **Shot 1: The Bump** | `0 - 84` (f0-f84) | 2.80 s | 35mm equivalent, smooth push-in at $0.25\%$/frame, tracking character | Clumsy elbow knocks buttered toast off kitchen table; character eyes widen |
| **Shot 2: The Tumble** | `85 - 200` (f85-f200) | 3.83 s | Low-angle tracking shot, tracking ballistic trajectory; DoF focused on toast | Toast tumbles through $180^\circ$ parabolic arc; impacts floor butter-down at f175 with 7-frame camera shake and $4.5^\circ$ roll |
| **Shot 3: The Tower Table**| `201 - 300` (f201-f300)| 3.33 s | Extreme vertical tilt-up from floor to ceiling, smootherstep glide | Comical towering 10-foot table with giant stepladder; toast lands upright |

---

## 4. Multi-Style Architectural Execution
1. **Style 1: `comic_noir` (Spider-Verse Living Comic)**
   - Cadence: 15 fps (on twos, `stepFrame(f, 2)`)
   - Shading: Ben-Day halftone screen dots + CMYK misregistration offset
   - Rig: `ComicRig` with cross-hatched shadow shading & "SLAP!" starburst graphic at f175
   - Audio: Vinyl crackle + boom-bap beat (92 bpm) + heavy 808 sub bass drop on floor impact
2. **Style 2: `rubber_hose` (1930s Cuphead Vintage)**
   - Cadence: 30 fps with continuous 2-beat body bob bounce (`HoseRig`)
   - Shading: `FilmGatePass` with rhythmic gate weave, vertical celluloid dust scratches, sepia emulsion tone, vignette
   - Rig: Curving noodle limbs, pie-cut eyes, 3-dart cartoon gloves
   - Audio: Saloon ragtime stride piano (132 bpm) + pitch slide whistle down + cowbell hit
3. **Style 3: `kurzgesagt` (Flat Vector Infographic)**
   - Cadence: 30 fps snappy spring overshoot (`VectorRig`)
   - Shading: `VectorGradientPass` with saturated cosmic background ramp + bloom; zero ink outlines
   - Rig: Geometric capsule pills, crisp circular eye with micro-look, angular rotation vector overlay ($\theta = 180^\circ$)
   - Audio: Ambient electronic synth pad (110 bpm) + crisp UI click/whoosh + sub pop
