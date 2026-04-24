const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const config = await p.systemConfig.findUnique({ where: { key: 'line_backfill_last_run' } });
  if (!config) { console.log('No backfill status found'); return; }
  const parsed = JSON.parse(config.value);
  console.log('Parsed status:', JSON.stringify(parsed, null, 2));
  console.log('receiptsCreated:', parsed.receiptsCreated, typeof parsed.receiptsCreated);
  console.log('durationMs:', parsed.durationMs, typeof parsed.durationMs);
  console.log('ranAt:', parsed.ranAt);
}
main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
