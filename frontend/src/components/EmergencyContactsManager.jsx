import React, { useState, useEffect } from 'react';
import styles from './EmergencyContactsManager.module.css';
import { 
  Users, UserPlus, Phone, Mail, CheckCircle, ShieldCheck, 
  Trash2, Bell, AlertTriangle, Send, Share2 
} from 'lucide-react';
import { fetchEmergencyContacts, addEmergencyContact } from '../services/api';

const EmergencyContactsManager = ({ userPhone = '+91-98765-43210' }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse / Family');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notifyOnRescue, setNotifyOnRescue] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadContacts = async () => {
    setIsLoading(true);
    const data = await fetchEmergencyContacts(userPhone);
    if (data && data.contacts) {
      setContacts(data.contacts);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, [userPhone]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const res = await addEmergencyContact(userPhone, {
      name: name.trim(),
      relationship,
      phone: phone.trim(),
      email: email.trim(),
      notify_on_rescue: notifyOnRescue
    });

    if (res && res.contact) {
      setName('');
      setPhone('');
      setEmail('');
      setShowAddForm(false);
      setStatusMsg('Emergency contact added successfully.');
      loadContacts();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className={styles.managerContainer}>
      <div className={styles.header}>
        <div className={styles.headerTitleBox}>
          <Users size={20} className={styles.headerIcon} />
          <div>
            <span className={styles.headerTag}>PRIVACY PROTECTED · LOCAL ENCRYPTION</span>
            <h3 className={styles.title}>EMERGENCY CONTACTS DIRECTORY</h3>
          </div>
        </div>

        <button 
          className={styles.addBtn}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <UserPlus size={14} /> {showAddForm ? 'CANCEL' : '+ ADD CONTACT'}
        </button>
      </div>

      {statusMsg && <div className={styles.statusBanner}>✅ {statusMsg}</div>}

      {/* ADD CONTACT FORM */}
      {showAddForm && (
        <form onSubmit={handleAddContact} className={styles.addForm}>
          <h4 className={styles.formTitle}>ADD NEW EMERGENCY CONTACT</h4>
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>FULL NAME *</label>
              <input 
                type="text" 
                placeholder="e.g. Aarav Sharma" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>RELATIONSHIP</label>
              <select 
                value={relationship} 
                onChange={(e) => setRelationship(e.target.value)}
                className={styles.select}
              >
                <option value="Spouse / Family">Spouse / Family</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Neighbor / Warden">Neighbor / Local Warden</option>
                <option value="Doctor / Medical">Doctor / Medical</option>
              </select>
            </div>

            <div>
              <label className={styles.label}>PHONE NUMBER *</label>
              <input 
                type="tel" 
                placeholder="+91-98765-43210" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            <div>
              <label className={styles.label}>EMAIL ADDRESS (OPTIONAL)</label>
              <input 
                type="email" 
                placeholder="contact@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.checkboxRow}>
            <input 
              type="checkbox" 
              id="notifyRescue" 
              checked={notifyOnRescue} 
              onChange={(e) => setNotifyOnRescue(e.target.checked)}
            />
            <label htmlFor="notifyRescue" className={styles.checkLabel}>
              Auto-transmit emergency SMS alert to this contact when I submit a rescue request.
            </label>
          </div>

          <button type="submit" className={styles.submitBtn}>
            SAVE EMERGENCY CONTACT
          </button>
        </form>
      )}

      {/* CONTACTS LIST */}
      <div className={styles.contactsGrid}>
        {contacts.map((c) => (
          <div key={c.contact_id} className={styles.contactCard}>
            <div className={styles.cardHeader}>
              <div>
                <h4 className={styles.contactName}>{c.name}</h4>
                <span className={styles.contactRel}>{c.relationship}</span>
              </div>
              <span className={styles.verifiedTag}>
                <ShieldCheck size={12} /> VERIFIED
              </span>
            </div>

            <div className={styles.cardMeta}>
              <div>
                <Phone size={12} /> <span>{c.phone}</span>
              </div>
              {c.email && (
                <div>
                  <Mail size={12} /> <span>{c.email}</span>
                </div>
              )}
            </div>

            <div className={styles.cardFooter}>
              <span className={c.notify_on_rescue ? styles.notifyOn : styles.notifyOff}>
                <Bell size={12} /> {c.notify_on_rescue ? 'Auto-SMS Enabled' : 'Auto-SMS Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default EmergencyContactsManager;
