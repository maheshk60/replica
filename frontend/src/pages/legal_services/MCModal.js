
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

/* ─── LOCAL API DEFINITIONS ─── */

const getUsers = () =>
  api.get('employee/employees/users/') // Trying your dropdown helper first
    .catch(() => api.get('accounts/users/')) // Fallback to accounts if exists
    .then((res) => {
      const raw = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const mapped = raw.map((u) => ({
        id: u.id,
        // Fallback name logic: name -> full_name -> first+last -> email -> Unknown
        name: u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown',
        email: u.email || u.username,
        role: u.role || 'User', 
      }));
      return { data: mapped };
    });

// ✅ FLEXIBLE ASSIGN MC: Defaults to 'tds-litigations' for backward compatibility.
const assignMC = (caseId, payload, caseType = 'tds-litigations') =>
  api.post(`legal-services/${caseType}/${caseId}/assign-mc/`, payload);

/* ─── Design tokens (exact match to reference) ─── */
const C = {
  audit:        { primary: '#1A2F5A', light: '#EEF3FC', border: '#C5D5EF', text: '#1A2F5A' },
  confirmation: { primary: '#0D6B52', light: '#E8F7F3', border: '#8ECEBF', text: '#0D6B52' },
  sampling:     { primary: '#4A3FA8', light: '#EDEAFB', border: '#A9A3E2', text: '#4A3FA8' },
  neutral: {
    bg: '#F8F9FB', border: '#E8EAF0', text: '#1C1E2E',
    muted: '#7A7F99', faint: '#F2F4F8',
  },
};

const modalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export function MCModal({ job, onClose, onAssigned }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [makers, setMakers] = useState([]);
  const [checkers, setCheckers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load initial makers/checkers from job
  useEffect(() => {
    // Convert IDs to string for easier array comparison in React
    setMakers((job?.makers || []).map(m => String(typeof m === 'object' ? m.id : m)));
    setCheckers((job?.checkers || []).map(c => String(typeof c === 'object' ? c.id : c)));
    setInitialLoaded(true);
  }, [job]);

  // Load users
  useEffect(() => {
    getUsers()
      .then(r => {
        setUsers(r.data);
      })
      .catch(e => {
        console.error(e);
        setError("Failed to load user list. Check API permissions.");
        setUsers([]); 
      });
  }, []);

  const filteredUsers = users.filter(u =>
    !search || (u.name || u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = (list, setList, id, max, other) => {
    const sid = String(id);
    if (list.includes(sid)) setList(list.filter(x => x !== sid));
    else if (list.length < max && !other.includes(sid)) setList([...list, sid]);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        maker_ids: makers.map(id => parseInt(id, 10)),
        checker_ids: checkers.map(id => parseInt(id, 10)),
      };
      // Determine case endpoint from props, default to 'tds-litigations'
      const endpoint = job.caseType || 'tds-litigations';
      const res = await assignMC(job.id, payload, endpoint);
      onAssigned(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to assign.');
      setSaving(false);
    }
  };

  const clientName = job?.client_name || job?.client?.client_name || job?.company_name;
  const periodLabel = job?.period_label || job?.period_1_label || job?.task_period || job?.assessment_year;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <style>{modalStyles}</style>

      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
        fontFamily: '"Inter",system-ui,sans-serif',
      }}
        onClick={e => e.stopPropagation()}>

        {/* Header + actions */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: `1px solid ${C.neutral.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>👥</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: C.audit.primary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  Assign Team
                </div>
                <div style={{
                  fontSize: 11, color: '#888',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  Assign Makers & Checkers
                  {clientName && <> · <b>{clientName}</b></>}
                  {periodLabel && <> · {periodLabel}</>}
                </div>
              </div>
            </div>

            {/* Save / Cancel at top */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={onClose} style={{
                padding: '6px 14px', borderRadius: 7,
                border: `1px solid ${C.neutral.border}`, background: '#fff',
                fontSize: 12, cursor: 'pointer', color: '#666',
                fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '6px 16px', borderRadius: 7,
                background: C.audit.primary, color: '#fff',
                border: 'none', fontSize: 12, cursor: saving ? 'wait' : 'pointer',
                fontWeight: 600, opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {saving && (
                  <div style={{
                    width: 11, height: 11,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                )}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 8,
              border: `1px solid ${C.neutral.border}`,
              fontSize: 12, boxSizing: 'border-box', outline: 'none',
              fontFamily: 'inherit',
            }} />
        </div>

        {/* User list — 2 columns */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {error && (
            <div style={{
              fontSize: 12, color: '#C62828', background: '#FEF0F0',
              padding: '7px 10px', borderRadius: 6, marginBottom: 10,
            }}>
              {error}
            </div>
          )}

          {!initialLoaded || users.length === 0 && !error ? (
            <LoadingState />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                {
                  label: 'Makers', max: 2,
                  list: makers, setList: setMakers, other: checkers,
                  color: C.confirmation.primary, bg: C.confirmation.light,
                },
                {
                  label: 'Checkers', max: 2,
                  list: checkers, setList: setCheckers, other: makers,
                  color: C.sampling.primary, bg: C.sampling.light,
                },
              ].map(({ label, max, list, setList, other, color, bg }) => (
                <div key={label}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    marginBottom: 8,
                  }}>
                    {label} ({list.length}/{max})
                  </div>

                  {filteredUsers.length === 0 && !error && (
                    <div style={{
                      textAlign: 'center', padding: '2rem 0.5rem',
                      color: C.neutral.muted, fontSize: 11,
                    }}>
                      No users found
                    </div>
                  )}

                  {filteredUsers.map(u => {
                    const sid = String(u.id);
                    const sel = list.includes(sid);
                    const inOther = other.includes(sid);
                    const atMax = list.length >= max && !sel;
                    return (
                      <div key={u.id}
                        onClick={() => !inOther && !atMax && toggleRole(list, setList, u.id, max, other)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px', borderRadius: 7, marginBottom: 4,
                          border: `1px solid ${sel ? color : C.neutral.border}`,
                          background: sel ? bg : inOther ? '#F5F5F5' : '#fff',
                          cursor: inOther || atMax ? 'not-allowed' : 'pointer',
                          opacity: inOther || atMax ? 0.4 : 1,
                          transition: 'all 0.12s',
                        }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: sel ? color : '#E8EAF0',
                          color: sel ? '#fff' : '#888',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(u.name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, color: C.neutral.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {u.name}
                          </div>
                          <div style={{
                            fontSize: 10, color: '#888',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {u.role}
                          </div>
                        </div>
                        {sel && <span style={{ fontSize: 11, color, flexShrink: 0, fontWeight: 700 }}>✓</span>}
                        {inOther && <span style={{ fontSize: 9, color: '#888', flexShrink: 0 }}>other</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─── */
function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[0, 1].map(col => (
        <div key={col}>
          <div style={{
            width: 60, height: 11, background: C.neutral.faint,
            borderRadius: 3, marginBottom: 8,
          }} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 7, marginBottom: 4,
              border: `1px solid ${C.neutral.border}`, background: '#fff',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: C.neutral.faint, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '70%', height: 10, background: C.neutral.faint, borderRadius: 3, marginBottom: 4 }} />
                <div style={{ width: '50%', height: 8, background: C.neutral.bg, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}