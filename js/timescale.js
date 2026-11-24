/* Logarithmic time scale: near the present each year takes up a lot of space,
   in the remote past a millennium takes up little. depth = K · log10(present + 1 − year) */
window.Atlas = window.Atlas || {};

Atlas.TimeScale = function (cfg) {
  const P = cfg.present_year;
  const K = cfg.depth_per_log_decade;
  return {
    depth(year) { return K * Math.log10(Math.max(1, P + 1 - year)); },
    year(depth) { return P + 1 - Math.pow(10, Math.max(0, depth) / K); },
    format(year) {
      const y = Math.round(year);
      const n = Math.abs(y).toLocaleString("en-US");
      return y < 1 ? `${y === 0 ? 1 : n} BC` : String(y);
    },
  };
};
