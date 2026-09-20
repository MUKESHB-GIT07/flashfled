import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import styles from './EmergencyContacts.module.css';

const EmergencyContacts = () => {
  const { session } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', relationship: 'Other', country: '', country_code: '+1',
    phone: '', email: '', priority: 'PRIMARY',
    sms_enabled: true, push_enabled: true, emergency_notify: true
  });

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/account/emergency-contacts`, {
        headers: { 'Authorization': `Bearer ${session?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleTest = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/account/emergency-contacts/${id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.token}` }
      });
      const data = await res.json();
      alert(`TEST: ${data.message || 'Alert sent. Mode: DEMO'}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this emergency contact?')) return;
    try {
      await fetch(`${API_BASE_URL}/account/emergency-contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.token}` }
      });
      setContacts(contacts.filter(c => c.contact_id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/account/emergency-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setShowModal(false);
        setFormData({ name: '', relationship: 'Other', country: '', country_code: '+91', phone: '', email: '', priority: 'PRIMARY', sms_enabled: true, push_enabled: true, emergency_notify: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const priorityOrder = { 'PRIMARY': 1, 'SECONDARY': 2, 'TERTIARY': 3 };
  const sortedContacts = [...contacts].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  if (loading) return <div className={styles.loading}>Loading contacts...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Emergency Contacts</h3>
        <button 
          className={styles.addBtn} 
          onClick={() => setShowModal(true)}
          disabled={contacts.length >= 10}
        >
          {contacts.length >= 10 ? 'MAX REACHED' : '+ ADD CONTACT'}
        </button>
      </div>

      {sortedContacts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📇</div>
          <p>No emergency contacts found.</p>
          <span>Add your first emergency contact</span>
        </div>
      ) : (
        <div className={styles.contactList}>
          {sortedContacts.map(contact => (
            <div key={contact.contact_id || contact.phone} className={`${styles.card} ${styles[contact.priority?.toLowerCase()]}`}>
              <div className={styles.cardHeader}>
                <span className={styles.priorityBadge}>{contact.priority}</span>
                <span className={contact.verified ? styles.verified : styles.unverified}>
                  {contact.verified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
                </span>
              </div>
              
              <div className={styles.cardBody}>
                <h4>{contact.name}</h4>
                <div className={styles.relationship}>{contact.relationship}</div>
                <div className={styles.details}>
                  <span>📞 {contact.country_code} {contact.phone}</span>
                  {contact.email && <span>✉️ {contact.email}</span>}
                </div>
                
                <div className={styles.channels}>
                  <span className={contact.sms_enabled ? styles.channelOn : styles.channelOff}>SMS {contact.sms_enabled ? '✓' : '✗'}</span>
                  <span className={contact.push_enabled ? styles.channelOn : styles.channelOff}>PUSH {contact.push_enabled ? '✓' : '✗'}</span>
                  <span className={contact.emergency_notify ? styles.channelOn : styles.channelOff}>EMERGENCY {contact.emergency_notify ? '✓' : '✗'}</span>
                </div>
              </div>
              
              <div className={styles.cardActions}>
                <button onClick={() => handleTest(contact.contact_id)}>TEST</button>
                <button className={styles.dangerText} onClick={() => handleDelete(contact.contact_id)}>DELETE</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Add Emergency Contact</h3>
            <form onSubmit={handleAddContact}>
              <input placeholder="Contact Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={styles.modalInput} required />
              <select value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})} className={styles.modalInput}>
                {['Mother','Father','Brother','Sister','Spouse','Friend','Colleague','Local Contact','Other'].map(r => <option key={r}>{r}</option>)}
              </select>
              <div style={{display:'flex', gap:'8px'}}>
                <select value={formData.country_code} onChange={e => setFormData({...formData, country_code: e.target.value})} className={styles.modalInput} style={{width:'90px'}}>
                  {['+91','+1','+44','+81','+61','+49','+33','+55','+82','+86'].map(c => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={styles.modalInput} style={{flex:1}} />
              </div>
              <input placeholder="Email (optional)" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={styles.modalInput} />
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className={styles.modalInput}>
                <option>PRIMARY</option><option>SECONDARY</option><option>TERTIARY</option>
              </select>
              <div className={styles.toggleRow}>
                <label><input type="checkbox" checked={formData.sms_enabled} onChange={e => setFormData({...formData, sms_enabled: e.target.checked})} /> SMS Alerts</label>
                <label><input type="checkbox" checked={formData.push_enabled} onChange={e => setFormData({...formData, push_enabled: e.target.checked})} /> Push Notifications</label>
                <label><input type="checkbox" checked={formData.emergency_notify} onChange={e => setFormData({...formData, emergency_notify: e.target.checked})} /> Emergency Notify</label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelBtn}>CANCEL</button>
                <button type="submit" className={styles.saveBtn}>ADD CONTACT</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;
