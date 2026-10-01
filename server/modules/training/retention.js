// Data retention for training records. Attempts (with their answers and certificates) and
// lesson progress are kept for TRAINING_RETENTION_YEARS after they happen and then deleted
// automatically at start-up. Three years covers a typical annual refresher cycle plus audit
// look-back; change it here and in docs/TRAINING_MODULE.md if Biztat's records policy differs.
export const TRAINING_RETENTION_YEARS = 3;

export function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - TRAINING_RETENTION_YEARS);
  return cutoff.toISOString();
}

export function purgeExpiredTrainingRecords(db, audit, now = new Date()) {
  const cutoff = retentionCutoff(now);
  const attempts = db.prepare("DELETE FROM quiz_attempts WHERE COALESCE(submitted_at, expires_at, started_at) < ?").run(cutoff).changes;
  const progress = db.prepare("DELETE FROM lesson_progress WHERE completed_at < ?").run(cutoff).changes;
  if (attempts || progress) audit(null, "TRAINING_RETENTION_PURGE", `${attempts} attempts and ${progress} lesson records older than ${TRAINING_RETENTION_YEARS} years deleted`);
  return { attempts, progress, cutoff };
}
