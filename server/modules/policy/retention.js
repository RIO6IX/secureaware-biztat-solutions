// Retention of acknowledgement evidence. Evidence must outlive the policy version it proves,
// so it is kept for POLICY_EVIDENCE_RETENTION_YEARS after that version was superseded or
// archived, then deleted at start-up. Six years covers ISO/IEC 27001 surveillance and
// recertification audits with room to spare; change it here and in docs/POLICY_MODULE.md if
// Biztat's records schedule says otherwise. Evidence for the current version is never purged.
export const POLICY_EVIDENCE_RETENTION_YEARS = 6;

export function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - POLICY_EVIDENCE_RETENTION_YEARS);
  return cutoff.toISOString();
}

export function purgeExpiredPolicyEvidence(db, audit, now = new Date()) {
  const cutoff = retentionCutoff(now);
  const retired = "SELECT id FROM policy_versions WHERE status IN ('superseded','archived') AND COALESCE(superseded_at, updated_at) < ?";
  const acknowledgements = db.prepare(`DELETE FROM policy_acknowledgements WHERE version_id IN (${retired})`).run(cutoff).changes;
  const readEvents = db.prepare(`DELETE FROM policy_read_events WHERE version_id IN (${retired})`).run(cutoff).changes;
  if (acknowledgements || readEvents) {
    audit(null, "POLICY_RETENTION_PURGE", `${acknowledgements} acknowledgements and ${readEvents} read records older than ${POLICY_EVIDENCE_RETENTION_YEARS} years deleted`);
  }
  return { acknowledgements, readEvents, cutoff };
}
