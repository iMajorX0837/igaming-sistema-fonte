/** Monitora versão da config e regenera fila de velas quando muda. */

export function startAviatorRecoveryWatcher({
  aviatorConfig,
  invalidateQueue,
  intervalMs = 5000,
}) {
  let lastVersion = null;

  const tick = async () => {
    try {
      const engine = await aviatorConfig.getEngineConfig({ force: true });
      const version = String(engine.engine_version || engine.config_version || '');
      if (!version) return;

      if (lastVersion !== null && version !== lastVersion) {
        await invalidateQueue();
        console.log(
          `[AVIATOR CONFIG] Config alterada — fila regenerada · RTP geral ${(
            Number(engine.rtp_geral || 0) * 100
          ).toFixed(2)}%`
        );
      }
      lastVersion = version;
    } catch (err) {
      console.warn('[AVIATOR CONFIG]', err?.message || err);
    }
  };

  void tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return timer;
}
