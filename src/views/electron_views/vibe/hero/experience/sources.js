export default [
    // 3-slot sequence: A (plane) -> B (rocket) -> C (logo). D/E (oni/tree)
    // and the horse effect were removed for the AsyncTest Vibe landing page
    // — see HANDOFF.md "3-slot landing page rebuild".
    {
        // Slot A — propeller plane。预烘焙的 65,536 粒子位置（原 slotA.glb 83MB）。
        // 源 GLB 留在仓库 raw-models/；改形状/粒子数后跑 `node scripts/bake-particles.mjs` 重烘。
        name: 'smModel',
        type: 'positionBin',
        path: 'particles/slotA.bin'
    },
    {
        // Slot B — rocket。预烘焙位置（原 slotB.glb 28MB）。
        name: 'scModel',
        type: 'positionBin',
        path: 'particles/slotB.bin'
    },
    {
        // Slot C — green/white A logo。预烘焙位置（原 logo2.glb 67MB）。
        name: 'logoModel',
        type: 'positionBin',
        path: 'particles/logo2.bin'
    },
    // horseModel (background running-horse layer) was added, then removed
    // again per request ("把马去掉吧") — see HANDOFF.md for the full history
    // if it ever needs to come back a third time.
]
