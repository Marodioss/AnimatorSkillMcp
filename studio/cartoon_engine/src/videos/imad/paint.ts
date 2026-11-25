// Hand-painted cel-shaded café textures for The Golden Bean Bakery & Café.
// Uses cartoon_engine's ctex / rng texture cache with warm Pixar-meets-Ghibli tones.
import * as THREE from "three";
import { ctex, rng, jit } from "../../templates/bridge/paint";

const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];

export const cafeBrickHD = () =>
  ctex("cafeBrickHD", 1024, 1024, (g, r) => {
    // Warm cream-ochre mortar
    g.fillStyle = "#e6d2b5";
    g.fillRect(0, 0, 1024, 1024);

    const cols = ["#c46243", "#b8583c", "#cf704d", "#ae5036", "#d47a52", "#bf6044"];
    const bh = 64;
    const bw = 128;
    for (let row = 0; row < 16; row++) {
      const y = row * bh;
      const off = (row % 2) * (bw / 2);
      for (let i = -1; i < 9; i++) {
        const x = i * bw + off;
        const c = jit(r, pick(r, cols), 0.16, 6, 0.14);
        g.fillStyle = c;
        g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
        // Top highlight lip & bottom warm shade
        g.fillStyle = "rgba(255, 236, 208, 0.20)";
        g.fillRect(x + 4, y + 3, bw - 8, 5);
        g.fillStyle = "rgba(75, 32, 18, 0.16)";
        g.fillRect(x + 4, y + bh - 8, bw - 8, 5);
      }
    }
    // Soft warm plaster aging blotches
    for (let i = 0; i < 14; i++) {
      const bx = r() * 1024;
      const by = r() * 1024;
      const rad = 60 + r() * 110;
      const gr = g.createRadialGradient(bx, by, 0, bx, by, rad);
      gr.addColorStop(0, r() > 0.5 ? "rgba(255,235,205,0.10)" : "rgba(85,42,24,0.10)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
    }
  });

export const oakTableHD = () =>
  ctex("oakTableHD", 1024, 1024, (g, r) => {
    // Rich warm varnished oak (#C48B58) per Character Design Bible
    const planks = ["#c88e5a", "#bf8552", "#cf9662", "#c38956"];
    const ph = 128;
    for (let i = 0; i < 8; i++) {
      const y = i * ph;
      g.fillStyle = jit(r, planks[i % planks.length], 0.06, 3, 0.08);
      g.fillRect(0, y, 1024, ph);
      // Wood grain curves
      for (let k = 0; k < 14; k++) {
        const gy = y + 10 + r() * (ph - 20);
        const isLight = r() < 0.3;
        g.strokeStyle = isLight ? "rgba(255, 230, 195, 0.24)" : "rgba(110, 62, 28, 0.22)";
        g.lineWidth = 2 + r() * 2;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(320, gy + (r() - 0.5) * 14, 680, gy + (r() - 0.5) * 14, 1024, gy);
        g.stroke();
      }
      // Subtle board seam
      g.fillStyle = "rgba(85, 44, 18, 0.42)";
      g.fillRect(0, y, 1024, 3);
    }
    // Warm sunlit tabletop specular gloss sheen
    const sheen = g.createLinearGradient(0, 0, 1024, 1024);
    sheen.addColorStop(0, "rgba(255, 240, 210, 0.16)");
    sheen.addColorStop(0.5, "rgba(255, 240, 210, 0.0)");
    sheen.addColorStop(1, "rgba(120, 65, 25, 0.10)");
    g.fillStyle = sheen;
    g.fillRect(0, 0, 1024, 1024);
  });

export const cafeFloorHD = () =>
  ctex("cafeFloorHD", 1024, 1024, (g, r) => {
    const fills = ["#8e5a36", "#835230", "#96613c", "#875533"];
    const bh = 128;
    for (let i = 0; i < 8; i++) {
      const y = i * bh;
      g.fillStyle = jit(r, fills[i % fills.length], 0.08, 4, 0.08);
      g.fillRect(0, y, 1024, bh);
      for (let k = 0; k < 8; k++) {
        const gy = y + 14 + r() * (bh - 28);
        g.strokeStyle = "rgba(55, 28, 12, 0.22)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, gy);
        g.bezierCurveTo(340, gy + 5, 680, gy - 5, 1024, gy);
        g.stroke();
      }
      g.fillStyle = "#482916";
      g.fillRect(0, y, 1024, 4);
      const cut = 180 + (i * 290) % 700;
      g.fillRect(cut, y, 4, bh);
    }
  });

export const wainscotHD = () =>
  ctex("wainscotHD", 512, 512, (g) => {
    g.fillStyle = "#5c3924";
    g.fillRect(0, 0, 512, 512);
    // Vertical tongue-and-groove panels
    for (let x = 0; x < 512; x += 64) {
      g.fillStyle = "#69422b";
      g.fillRect(x + 4, 24, 56, 464);
      g.strokeStyle = "#3e2415";
      g.lineWidth = 3;
      g.strokeRect(x + 8, 32, 48, 448);
      g.fillStyle = "rgba(255, 224, 185, 0.12)";
      g.fillRect(x + 10, 34, 44, 6);
    }
    // Top chair rail
    g.fillStyle = "#7a4e33";
    g.fillRect(0, 0, 512, 22);
  });

export const chalkboardTex = () =>
  ctex("chalkboardMenu", 768, 512, (g) => {
    // Timber border
    g.fillStyle = "#6e4226";
    g.fillRect(0, 0, 768, 512);
    // Slate interior
    g.fillStyle = "#26332e";
    g.fillRect(26, 26, 716, 460);
    g.strokeStyle = "#3d2415";
    g.lineWidth = 6;
    g.strokeRect(26, 26, 716, 460);

    // Chalk typography & doodles
    g.fillStyle = "#f9edd2";
    g.textAlign = "center";
    g.font = "bold 46px Georgia, serif";
    g.fillText("THE GOLDEN BEAN", 384, 98);

    g.strokeStyle = "#f3c76b";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(140, 122);
    g.lineTo(628, 122);
    g.stroke();

    // Stylized chalk coffee cup doodle on left
    g.strokeStyle = "#f9edd2";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(95, 190, 110, 95, [8, 8, 32, 32]);
    g.stroke();
    g.beginPath();
    g.arc(208, 232, 22, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    // Steam swirls
    for (const sx of [128, 154, 178]) {
      g.beginPath();
      g.moveTo(sx, 175);
      g.quadraticCurveTo(sx - 12, 152, sx + 4, 138);
      g.stroke();
    }

    // Menu items on right
    g.textAlign = "left";
    g.font = "bold 30px sans-serif";
    g.fillStyle = "#ffe29a";
    g.fillText("• GOLDEN LATTE       $4.50", 265, 200);
    g.fillStyle = "#f9edd2";
    g.fillText("• HONEY CROISSANT    $3.75", 265, 255);
    g.fillText("• WARM COCOA         $4.00", 265, 310);
    g.fillStyle = "#a8e0c8";
    g.fillText("• ESPRESSO SHOT      $3.00", 265, 365);

    g.textAlign = "center";
    g.font = "italic 26px Georgia, serif";
    g.fillStyle = "#ffd78a";
    g.fillText("Baked Fresh Daily • Warm & Cozy", 384, 435);
  });

export const windowViewTex = () =>
  ctex("windowSunlitStreet", 1024, 1024, (g) => {
    // Warm sunlit golden afternoon exterior (#FFE8D6 sky -> warm street)
    const sky = g.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, "#ffe4b8");
    sky.addColorStop(0.5, "#fff2d8");
    sky.addColorStop(1, "#ffdfb5");
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 1024);

    // Glowing afternoon sun orb
    const sun = g.createRadialGradient(740, 260, 20, 740, 260, 320);
    sun.addColorStop(0, "rgba(255, 252, 225, 0.95)");
    sun.addColorStop(0.35, "rgba(255, 220, 145, 0.55)");
    sun.addColorStop(1, "rgba(255, 220, 145, 0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, 1024, 1024);

    // Distant warm buildings & storybook tree silhouettes
    g.fillStyle = "#e0b692";
    g.fillRect(40, 420, 260, 450);
    g.fillRect(360, 380, 290, 490);
    g.fillRect(720, 440, 280, 430);

    // Lush green storybook trees outside window
    for (const [tx, ty, tr] of [
      [190, 520, 130],
      [510, 490, 150],
      [850, 540, 125],
    ]) {
      g.fillStyle = "#79aa57";
      g.beginPath();
      g.arc(tx, ty, tr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#95c46b";
      g.beginPath();
      g.arc(tx - 24, ty - 28, tr * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // Sidewalk
    g.fillStyle = "#d9c2a3";
    g.fillRect(0, 820, 1024, 204);
  });

export const cafeDoorTex = () =>
  ctex("cafeDoorTex", 512, 1024, (g) => {
    // Warm timber door
    g.fillStyle = "#6e4228";
    g.fillRect(0, 0, 512, 1024);
    g.strokeStyle = "#3b2214";
    g.lineWidth = 10;
    g.strokeRect(12, 12, 488, 1000);

    // Upper sunlit glass pane
    const glass = g.createLinearGradient(60, 60, 452, 540);
    glass.addColorStop(0, "#fff0cc");
    glass.addColorStop(1, "#f7c78a");
    g.fillStyle = glass;
    g.fillRect(64, 68, 384, 460);
    g.strokeStyle = "#3b2214";
    g.lineWidth = 8;
    g.strokeRect(64, 68, 384, 460);

    // Diagonal glass glare
    g.fillStyle = "rgba(255, 255, 255, 0.42)";
    g.beginPath();
    g.moveTo(90, 320);
    g.lineTo(290, 90);
    g.lineTo(350, 90);
    g.lineTo(90, 390);
    g.closePath();
    g.fill();

    // Hanging "OPEN" sign
    g.fillStyle = "#f9edd2";
    g.fillRect(160, 290, 192, 82);
    g.strokeStyle = "#3b2214";
    g.lineWidth = 5;
    g.strokeRect(160, 290, 192, 82);
    g.fillStyle = "#2b6e4e";
    g.textAlign = "center";
    g.font = "bold 44px sans-serif";
    g.fillText("OPEN", 256, 346);

    // Lower wood panel & brass handle
    g.fillStyle = "#5c3620";
    g.fillRect(64, 590, 384, 340);
    g.strokeStyle = "#3b2214";
    g.strokeRect(64, 590, 384, 340);
    g.fillStyle = "#e6bf5a";
    g.fillRect(408, 520, 26, 110);
  });

export const sunbeamTex = () =>
  ctex("sunbeamTex", 256, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "rgba(255, 240, 200, 0.30)");
    gr.addColorStop(0.55, "rgba(255, 224, 165, 0.14)");
    gr.addColorStop(1, "rgba(255, 224, 165, 0.0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 512);

    // Smooth horizontal alpha feathering so sunbeams never create hard edges across faces
    g.globalCompositeOperation = "destination-in";
    const hMask = g.createLinearGradient(0, 0, 256, 0);
    hMask.addColorStop(0, "rgba(0,0,0,0)");
    hMask.addColorStop(0.28, "rgba(0,0,0,0.92)");
    hMask.addColorStop(0.5, "rgba(0,0,0,1)");
    hMask.addColorStop(0.72, "rgba(0,0,0,0.92)");
    hMask.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = hMask;
    g.fillRect(0, 0, 256, 512);
    g.globalCompositeOperation = "source-over";
  });
