/**
 * SVG → extruded 3D preview (vanilla Three.js).
 * Geometry pipeline adapted from 3dsvg by Renato Costa (MIT). See NOTICE in repo root.
 */
import { $ } from "./dom.js";
import { initUploader } from "./files.js";
import { showResult, setProgress, runButton } from "./ui.js";

const MATERIAL_PRESETS = {
  default: { label: "Default", metalness: 0.15, roughness: 0.35, opacity: 1, transparent: false },
  plastic: { label: "Plastic", metalness: 0, roughness: 0.3, opacity: 1, transparent: false },
  metal: { label: "Metal", metalness: 0.9, roughness: 0.2, opacity: 1, transparent: false },
  glass: { label: "Glass", metalness: 0.1, roughness: 0.05, opacity: 0.35, transparent: true },
  rubber: { label: "Rubber", metalness: 0, roughness: 0.9, opacity: 1, transparent: false },
  chrome: { label: "Chrome", metalness: 1, roughness: 0.05, opacity: 1, transparent: false },
  gold: { label: "Gold", metalness: 1, roughness: 0.25, opacity: 1, transparent: false },
  clay: { label: "Clay", metalness: 0, roughness: 1, opacity: 1, transparent: false },
  emissive: {
    label: "Emissive",
    metalness: 0,
    roughness: 0.5,
    opacity: 1,
    transparent: false,
    emissiveIntensity: 0.8
  },
  holographic: { label: "Holo", metalness: 0.8, roughness: 0.1, opacity: 0.7, transparent: true, clearcoat: 1 }
};

const BATCH_SIZE = 20;

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function recomputeTriplanarUVs(geo, bb, THREE) {
  const bbSize = new THREE.Vector3();
  bb.getSize(bbSize);
  const uvAttr = geo.attributes.uv;
  const posAttr = geo.attributes.position;
  const normalAttr = geo.attributes.normal;
  const maxDimUv = Math.max(bbSize.x, bbSize.y, bbSize.z) || 1;

  for (let j = 0; j < uvAttr.count; j++) {
    const px = posAttr.getX(j);
    const py = posAttr.getY(j);
    const pz = posAttr.getZ(j);
    const nx = Math.abs(normalAttr.getX(j));
    const ny = Math.abs(normalAttr.getY(j));
    const nz = Math.abs(normalAttr.getZ(j));

    let u;
    let v;
    if (nz >= nx && nz >= ny) {
      u = (px - bb.min.x) / maxDimUv;
      v = 1 - (py - bb.min.y) / maxDimUv;
    } else if (nx >= ny) {
      u = (pz - bb.min.z) / maxDimUv;
      v = 1 - (py - bb.min.y) / maxDimUv;
    } else {
      u = (px - bb.min.x) / maxDimUv;
      v = (pz - bb.min.z) / maxDimUv;
    }
    uvAttr.setXY(j, u, v);
  }
  uvAttr.needsUpdate = true;
}

function isViewBoxRect(shape, vbW, vbH, THREE) {
  const pts = shape.getPoints(4);
  if (pts.length !== 4 && pts.length !== 5) return false;
  const bb = new THREE.Box2();
  for (const p of pts) bb.expandByPoint(p);
  const size = new THREE.Vector2();
  bb.getSize(size);
  const tolerance = 0.01;
  return Math.abs(size.x - vbW) / vbW < tolerance && Math.abs(size.y - vbH) / vbH < tolerance;
}

function parseShapesFromSVG(svgString, SVGLoader, THREE) {
  const loader = new SVGLoader();
  const svgData = loader.parse(svgString);
  const allShapes = [];

  const vbMatch = svgString.match(
    /viewBox\s*=\s*["']\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/
  );
  const vbW = vbMatch ? parseFloat(vbMatch[3]) : null;
  const vbH = vbMatch ? parseFloat(vbMatch[4]) : null;

  svgData.paths.forEach((path) => {
    const style = path.userData?.style;
    const hasFill = style?.fill && style.fill !== "none" && style.fill !== "transparent";
    const hasStroke = style?.stroke && style.stroke !== "none" && style.stroke !== "transparent";

    if (hasFill) {
      const shapes = SVGLoader.createShapes(path);
      for (const shape of shapes) {
        if (vbW && vbH && isViewBoxRect(shape, vbW, vbH, THREE)) continue;
        allShapes.push(shape);
      }
    }

    if (hasStroke) {
      const strokeWidth = parseFloat(style?.strokeWidth ?? "2");
      const divisions = 12;
      path.subPaths.forEach((subPath) => {
        const points = subPath.getPoints(divisions);
        if (points.length < 2) return;

        const shape = new THREE.Shape();
        const halfWidth = strokeWidth / 2;
        const leftSide = [];
        const rightSide = [];

        for (let i = 0; i < points.length; i++) {
          const curr = points[i];
          const prev = points[Math.max(0, i - 1)];
          const next = points[Math.min(points.length - 1, i + 1)];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          leftSide.push(new THREE.Vector2(curr.x + nx * halfWidth, curr.y + ny * halfWidth));
          rightSide.push(new THREE.Vector2(curr.x - nx * halfWidth, curr.y - ny * halfWidth));
        }

        shape.moveTo(leftSide[0].x, leftSide[0].y);
        for (let i = 1; i < leftSide.length; i++) shape.lineTo(leftSide[i].x, leftSide[i].y);
        for (let i = rightSide.length - 1; i >= 0; i--) shape.lineTo(rightSide[i].x, rightSide[i].y);
        shape.closePath();
        allShapes.push(shape);
      });
    }

    if (!hasFill && !hasStroke) {
      allShapes.push(...SVGLoader.createShapes(path));
    }
  });

  return allShapes;
}

async function buildMergedExtrudeGeometry(svgString, depth, smoothness, THREE, SVGLoader, mergeGeometries, onProgress, signal) {
  let allShapes;
  try {
    allShapes = parseShapesFromSVG(svgString, SVGLoader, THREE);
  } catch {
    return null;
  }

  if (!allShapes.length) {
    return null;
  }

  const tempGeo = new THREE.ShapeGeometry(allShapes);
  tempGeo.computeBoundingBox();
  const flatSize = new THREE.Vector3();
  tempGeo.boundingBox.getSize(flatSize);
  const maxFlatDim = Math.max(flatSize.x, flatSize.y, 1);
  tempGeo.dispose();

  const complexity = allShapes.length;
  const qualityScale = complexity > 200 ? 0.3 : complexity > 50 ? 0.6 : 1;

  const scaledDepth = (depth / 10) * maxFlatDim;
  const bevelScale = Math.min(maxFlatDim * 0.02, 1);
  const bevelSegments = Math.round((3 + smoothness * 20) * qualityScale);
  const curveSegments = Math.round((24 + smoothness * 176) * qualityScale);
  const bevelThickness = bevelScale * (0.15 + smoothness * 0.2);
  const bevelSize = bevelScale * (0.15 + smoothness * 0.2);

  const extrudeSettings = {
    depth: scaledDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments
  };

  const individualGeos = [];

  for (let i = 0; i < allShapes.length; i++) {
    if (signal.aborted) {
      individualGeos.forEach((g) => g.dispose());
      return null;
    }
    individualGeos.push(new THREE.ExtrudeGeometry(allShapes[i], extrudeSettings));
    if ((i + 1) % BATCH_SIZE === 0) {
      onProgress?.(Math.round(((i + 1) / allShapes.length) * 90));
      await yieldToMain();
    }
  }

  if (signal.aborted) {
    individualGeos.forEach((g) => g.dispose());
    return null;
  }

  onProgress?.(92);
  await yieldToMain();

  const merged = mergeGeometries(individualGeos, false);
  individualGeos.forEach((g) => g.dispose());

  if (!merged || signal.aborted) {
    return null;
  }

  onProgress?.(96);
  await yieldToMain();

  merged.computeBoundingBox();
  merged.computeVertexNormals();
  recomputeTriplanarUVs(merged, merged.boundingBox, THREE);

  const bb = merged.boundingBox;
  const ctr = new THREE.Vector3();
  bb.getCenter(ctr);
  const size = new THREE.Vector3();
  bb.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const baseScale = maxDim > 0 ? 4 / maxDim : 1;

  onProgress?.(100);
  return { geometry: merged, center: ctr, baseScale };
}

let threeModulesPromise;

function loadThreeModules() {
  if (!threeModulesPromise) {
    threeModulesPromise = (async () => {
      // Bare "three" + "three/addons/*" require a document import map (see svg-to-3d/index.html).
      // Full CDN URLs to jsm files fail: those modules import from "three", which browsers cannot resolve alone.
      const THREE = await import("three");
      const [SVGLoaderMod, BufferGeometryUtilsMod, OrbitControlsMod, RoomMod] = await Promise.all([
        import("three/addons/loaders/SVGLoader.js"),
        import("three/addons/utils/BufferGeometryUtils.js"),
        import("three/addons/controls/OrbitControls.js"),
        import("three/addons/environments/RoomEnvironment.js")
      ]);
      return {
        THREE,
        SVGLoader: SVGLoaderMod.SVGLoader,
        mergeGeometries: BufferGeometryUtilsMod.mergeGeometries,
        OrbitControls: OrbitControlsMod.OrbitControls ?? OrbitControlsMod.default,
        RoomEnvironment: RoomMod.RoomEnvironment ?? RoomMod.default
      };
    })();
  }
  return threeModulesPromise;
}

function resolveMaterialSettings(presetKey, wireframe) {
  const base = MATERIAL_PRESETS[presetKey] || MATERIAL_PRESETS.default;
  const opacity = base.opacity;
  return {
    presetKey,
    metalness: base.metalness,
    roughness: base.roughness,
    opacity,
    transparent: base.transparent || opacity < 1,
    wireframe,
    emissiveIntensity: base.emissiveIntensity ?? 0,
    clearcoat: base.clearcoat ?? 0
  };
}

function applyPhysicalMaterial(mesh, colorHex, matSettings, THREE) {
  const preset = MATERIAL_PRESETS[matSettings.presetKey] || MATERIAL_PRESETS.default;
  const isGold = matSettings.presetKey === "gold";
  const isEmissive = matSettings.presetKey === "emissive";
  const wantsTransparency = matSettings.transparent || matSettings.opacity < 1;
  const baseColor = isGold ? "#d4a017" : colorHex;
  const emissiveColor = isEmissive ? colorHex : "#000000";
  const transmissionAmount = wantsTransparency ? 1 - matSettings.opacity : 0;

  mesh.material.color.set(baseColor);
  mesh.material.metalness = matSettings.metalness;
  mesh.material.roughness = wantsTransparency ? Math.max(0.02, matSettings.roughness * 0.3) : matSettings.roughness;
  mesh.material.transmission = transmissionAmount;
  mesh.material.thickness = wantsTransparency ? 2.5 : 0;
  mesh.material.ior = wantsTransparency ? 1.5 : 1.45;
  mesh.material.transparent = wantsTransparency;
  mesh.material.wireframe = matSettings.wireframe;
  mesh.material.emissive.set(emissiveColor);
  mesh.material.emissiveIntensity = isEmissive ? (preset.emissiveIntensity ?? 0.8) : 0;
  mesh.material.clearcoat = wantsTransparency ? 1 : matSettings.clearcoat;
  mesh.material.clearcoatRoughness = 0.05;
  mesh.material.needsUpdate = true;
}

export function mountSvgTo3dTool() {
  const f = $("toolForm");
  f.innerHTML = `
    <div class="svg3d-layout">
      <div class="svg3d-controls">
        <div id="svgUp"></div>
        <div class="svg3d-row">
          <label class="svg3d-label" for="svg3dDepth">Depth</label>
          <input type="range" id="svg3dDepth" min="0.2" max="3" step="0.05" value="1" />
          <span id="svg3dDepthVal" class="muted">1</span>
        </div>
        <div class="svg3d-row">
          <label class="svg3d-label" for="svg3dSmooth">Smoothness</label>
          <input type="range" id="svg3dSmooth" min="0" max="1" step="0.05" value="0.2" />
          <span id="svg3dSmoothVal" class="muted">0.2</span>
        </div>
        <div class="svg3d-row">
          <label class="svg3d-label" for="svg3dMat">Material</label>
          <select id="svg3dMat" class="svg3d-select">
            ${Object.keys(MATERIAL_PRESETS)
              .map((k) => `<option value="${k}">${MATERIAL_PRESETS[k].label}</option>`)
              .join("")}
          </select>
        </div>
        <div class="svg3d-row svg3d-row--color">
          <label class="svg3d-label" for="svg3dColor">Color</label>
          <input type="color" id="svg3dColor" class="svg3d-color-input" value="#6c9cff" />
        </div>
        <label class="svg3d-check"><input type="checkbox" id="svg3dSpin" /> <span>Slow spin</span></label>
        <label class="svg3d-check"><input type="checkbox" id="svg3dWire" /> <span>Wireframe</span></label>
        <button type="button" class="btn" id="svg3dResetCam">Reset view</button>
      </div>
      <div class="svg3d-viewport">
        <div id="svg3dCanvasHost" class="svg3d-canvas-host" aria-label="3D SVG preview"></div>
        <p class="muted svg3d-hint">Drag to orbit · scroll to zoom · processing stays in your browser</p>
      </div>
    </div>`;

  const input = initUploader("svgUp", ".svg", false);
  const depthEl = $("svg3dDepth");
  const smoothEl = $("svg3dSmooth");
  const matEl = $("svg3dMat");
  const colorEl = $("svg3dColor");
  const spinEl = $("svg3dSpin");
  const wireEl = $("svg3dWire");
  const host = $("svg3dCanvasHost");
  const depthVal = $("svg3dDepthVal");
  const smoothVal = $("svg3dSmoothVal");

  let svgText = "";
  let buildController = new AbortController();
  let viewer = null;
  let depth = 1;
  let smoothness = 0.2;
  let spin = false;
  let rafId = 0;

  const syncLabels = () => {
    depthVal.textContent = depthEl.value;
    smoothVal.textContent = smoothEl.value;
  };
  syncLabels();

  depthEl.addEventListener("input", () => {
    depthVal.textContent = depthEl.value;
    depth = parseFloat(depthEl.value);
    scheduleRebuild();
  });
  smoothEl.addEventListener("input", () => {
    smoothVal.textContent = smoothEl.value;
    smoothness = parseFloat(smoothEl.value);
    scheduleRebuild();
  });

  let rebuildTimer;
  const scheduleRebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuildGeometry(), 280);
  };

  spinEl.addEventListener("change", () => {
    spin = spinEl.checked;
  });

  const onMatColorWireChange = () => {
    if (viewer?.shapeMesh) {
      const ms = resolveMaterialSettings(matEl.value, wireEl.checked);
      applyPhysicalMaterial(viewer.shapeMesh, colorEl.value, ms, viewer.THREE);
    }
  };
  matEl.addEventListener("change", onMatColorWireChange);
  colorEl.addEventListener("input", onMatColorWireChange);
  wireEl.addEventListener("change", onMatColorWireChange);

  $("svg3dResetCam").addEventListener("click", () => {
    if (viewer?.controls) {
      viewer.controls.target.set(0, 0, 0);
      viewer.camera.position.set(0, 0, 8);
      viewer.controls.update();
    }
  });

  const disposeViewer = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (!viewer) return;
    window.removeEventListener("resize", viewer.onResize);
    if (viewer.ro) viewer.ro.disconnect();
    viewer.controls.dispose();
    if (viewer.spinRoot) {
      viewer.scene.remove(viewer.spinRoot);
    }
    if (viewer.shapeMesh) {
      viewer.shapeMesh.geometry?.dispose();
      viewer.shapeMesh.material?.dispose();
    }
    if (viewer.envTexture) {
      viewer.scene.environment = null;
      viewer.envTexture.dispose();
    }
    viewer.pmrem?.dispose();
    viewer.renderer.dispose();
    host.innerHTML = "";
    viewer = null;
  };

  const animate = () => {
    rafId = requestAnimationFrame(animate);
    if (spin && viewer?.spinRoot) {
      viewer.spinRoot.rotation.y += 0.003;
    }
    viewer?.controls.update();
    viewer?.renderer.render(viewer.scene, viewer.camera);
  };

  async function rebuildGeometry() {
    if (!svgText.trim()) return;

    buildController.abort();
    buildController = new AbortController();
    const signal = buildController.signal;

    runButton(true);
    setProgress(5);
    disposeViewer();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;

    try {
      const { THREE, SVGLoader, mergeGeometries, OrbitControls, RoomEnvironment } = await loadThreeModules();
      if (signal.aborted) return;

      const geoResult = await buildMergedExtrudeGeometry(
        svgText,
        depth,
        smoothness,
        THREE,
        SVGLoader,
        mergeGeometries,
        (p) => setProgress(Math.max(5, p)),
        signal
      );

      if (signal.aborted) return;

      if (!geoResult) {
        showResult("Could not build 3D geometry from this SVG. Try a simpler path or icon-style SVG.", "error");
        setProgress(0);
        return;
      }

      const { geometry, center, baseScale } = geoResult;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      camera.position.set(0, 0, 8);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const canvas = renderer.domElement;
      canvas.className = "svg3d-canvas";
      host.appendChild(canvas);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      const envTexture = envRT.texture;
      scene.environment = envTexture;
      roomEnv.dispose();

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(5, 8, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.35);
      fill.position.set(-5, 3, -3);
      scene.add(fill);
      scene.add(new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.45));

      const matSettings = resolveMaterialSettings(matEl.value, wireEl.checked);
      const shapeMesh = new THREE.Mesh(
        geometry,
        new THREE.MeshPhysicalMaterial({
          color: matSettings.presetKey === "gold" ? "#d4a017" : colorEl.value,
          metalness: matSettings.metalness,
          roughness: matSettings.roughness,
          side: THREE.FrontSide,
          envMapIntensity: 1
        })
      );
      applyPhysicalMaterial(shapeMesh, colorEl.value, matSettings, THREE);

      const flip = new THREE.Group();
      flip.scale.set(baseScale, -baseScale, baseScale);
      shapeMesh.position.set(-center.x, -center.y, -center.z);
      flip.add(shapeMesh);

      const spinRoot = new THREE.Group();
      spinRoot.add(flip);
      scene.add(spinRoot);

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.target.set(0, 0, 0);

      const setSize = () => {
        const w = host.clientWidth || 480;
        const h = Math.max(320, Math.min(560, Math.round(w * 0.62)));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      setSize();
      const onResize = () => setSize();
      window.addEventListener("resize", onResize);
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setSize) : null;
      ro?.observe(host);

      viewer = {
        THREE,
        scene,
        camera,
        renderer,
        controls,
        spinRoot,
        shapeMesh,
        envTexture,
        pmrem: pmremGenerator,
        onResize,
        ro
      };

      animate();
      setProgress(100);
      showResult("3D preview ready. Adjust depth and material, or upload another SVG.");
    } catch (e) {
      console.error("svg-to-3d:", e);
      const hint =
        e instanceof TypeError && String(e.message).includes("Failed to resolve module specifier")
          ? " Your browser needs an import map for Three.js on this page—try a hard refresh or update the browser."
          : "";
      showResult(
        `3D engine failed to load or render.${hint} If this persists, open the browser console (F12) for details.`,
        "error"
      );
      setProgress(0);
    } finally {
      runButton(false);
    }
  }

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    runButton(true);
    setProgress(2);
    try {
      svgText = await file.text();
      if (!svgText.includes("<svg")) {
        showResult("Please upload a valid .svg file.", "error");
        setProgress(0);
        runButton(false);
        return;
      }
      await rebuildGeometry();
    } catch (e) {
      showResult("Could not read the SVG file.", "error");
      setProgress(0);
      runButton(false);
    }
  });

  void loadThreeModules().catch((err) => {
    console.error("svg-to-3d preload:", err);
    showResult(
      "Could not load Three.js modules. This page needs the import map in the document head (for bare 'three' imports). Try a hard refresh, or update your browser.",
      "error"
    );
  });
}
