// Try to re-export DB functions from the db package. If unavailable, provide a safe stub
// so that the server can still boot (useful in Cloud Run without DB during startup).
let mod;
try {
	mod = require('os2514-db');
} catch (e) {
	console.warn('[WARN] os2514-db not available. DB features are disabled. Reason:', e && e.message);
	const stub = async () => { throw new Error('DB is disabled in this environment'); };
	mod = {
		pool: { query: stub },
		getOrCreatePlayer: stub,
		saveMatchResult: stub,
		getPlayerStats: async () => null,
		getPlayerRankings: async () => []
	};
}

module.exports = mod;